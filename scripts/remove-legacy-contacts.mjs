#!/usr/bin/env node
// ESM script to hard-delete legacy "Contact Management" files and prune empty dirs safely.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspace = path.resolve(__dirname, '..');

// Legacy targets (files) — delete if exists
const legacyFiles = [
  // Old pages (root variants)
  'src/pages/ContactManagementPage.tsx',
  'src/pages/ContactManagementPage_Enhanced.tsx',
  'src/pages/ContactImportPage.tsx',
  // Old pages (scoped folder)
  'src/pages/contact-management/ContactManagementPage.tsx',
  'src/pages/contact-management/index.ts',
  // Old components
  'src/components/contact/ContactImportManager.tsx',
  'src/components/contact/ContactImportManagerTabbed.tsx',
  'src/components/contact/ContactDocumentUploader.tsx',
  'src/components/contact/ContactList.tsx',
  'src/components/contact/ContactStatistics.tsx',
  'src/components/contact/ContactFollowTask.tsx',
  'src/components/contact/ContactTaskForm.tsx',
  // Examples
  'src/examples/ContactManagementExample.tsx',
];

// Legacy directories to prune if empty (attempt recursive remove forcefully as last resort)
const legacyDirs = [
  'src/pages/contact-management',
];

function rel(p) { return path.relative(workspace, p); }

async function pathExists(p) {
  try { await fs.promises.access(p, fs.constants.F_OK); return true; } catch { return false; }
}

async function safeUnlink(filePath) {
  try {
    // Try remove read-only attribute on Windows
    try { await fs.promises.chmod(filePath, 0o666); } catch {}
    await fs.promises.unlink(filePath);
    console.log('✓ Deleted file:', rel(filePath));
  } catch (err) {
    if (err && (err.code === 'ENOENT' || err.code === 'EPERM' || err.code === 'EACCES')) {
      console.warn('• Skip file (not found or no access):', rel(filePath));
      return;
    }
    console.warn('• Failed to delete file:', rel(filePath), err.message);
  }
}

async function safeRmdir(dirPath) {
  try {
    // Try remove if empty first
    const items = await fs.promises.readdir(dirPath).catch(() => []);
    if (items.length === 0) {
      await fs.promises.rmdir(dirPath);
      console.log('✓ Removed empty dir:', rel(dirPath));
      return;
    }
  } catch {}
  // Fallback: force recursive remove (if truly legacy)
  try {
    await fs.promises.rm(dirPath, { recursive: true, force: true });
    console.log('✓ Removed dir (force):', rel(dirPath));
  } catch (err) {
    if (err && (err.code === 'ENOENT' || err.code === 'EPERM' || err.code === 'EACCES')) {
      console.warn('• Skip dir (not found or no access):', rel(dirPath));
      return;
    }
    console.warn('• Failed to remove dir:', rel(dirPath), err.message);
  }
}

async function main() {
  console.log('— Legacy contacts hard cleanup —');
  let deleted = 0;

  for (const relPath of legacyFiles) {
    const abs = path.join(workspace, relPath);
    if (await pathExists(abs)) {
      await safeUnlink(abs);
      deleted++;
    } else {
      // Silent for non-existing
    }
  }

  for (const relDir of legacyDirs) {
    const abs = path.join(workspace, relDir);
    if (await pathExists(abs)) {
      await safeRmdir(abs);
    }
  }

  console.log(`Done. Files attempted: ${legacyFiles.length}, removed (existing): ${deleted}.`);
}

main().catch(err => {
  console.error('Cleanup failed:', err);
  process.exit(2);
});
