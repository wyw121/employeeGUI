#!/usr/bin/env node
// Simple dev guard: ensure Vite dev server is up (or start it) and the port is free; otherwise print clear errors.
import { spawn } from 'node:child_process';
import http from 'node:http';

const PORT = Number(process.argv[2] || process.env.VITE_PORT || 1421);
const TIMEOUT_MS = 20000; // 20s

function checkPortOpen(port) {
  return new Promise((resolve) => {
    const req = http.request({ host: '127.0.0.1', port, path: '/', method: 'GET', timeout: 2000 }, (res) => {
      res.resume();
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

function waitForServer(port, timeoutMs) {
  const start = Date.now();
  return new Promise(async (resolve, reject) => {
    while (Date.now() - start < timeoutMs) {
      if (await checkPortOpen(port)) return resolve(true);
      await new Promise((r) => setTimeout(r, 400));
    }
    reject(new Error(`Dev server not reachable on http://localhost:${port} within ${timeoutMs}ms`));
  });
}

async function main() {
  const isUp = await checkPortOpen(PORT);
  if (isUp) {
    console.log(`✅ Dev server already running at http://localhost:${PORT}`);
    process.exit(0);
  }

  console.log(`ℹ️  Starting Vite dev server on port ${PORT}...`);
  const child = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', `dev:${PORT}`], {
    stdio: 'inherit',
    env: { ...process.env, VITE_PORT: String(PORT) },
  });

  try {
    await waitForServer(PORT, TIMEOUT_MS);
    console.log(`✅ Dev server is ready: http://localhost:${PORT}`);
    process.exit(0);
  } catch (err) {
    console.error(`\n❌ 无法连接到开发服务器 (http://localhost:${PORT})。`);
    console.error(`原因可能是：`);
    console.error(`- 端口被占用（请释放该端口或修改端口）`);
    console.error(`- 本机防火墙/代理阻断了本地端口访问`);
    console.error(`- Vite 启动失败（请查看上方日志）`);
    console.error(`建议：`);
    console.error(`1) 如需更换端口：设置环境变量 VITE_PORT 或修改 package.json 中 dev:<port> 脚本`);
    console.error(`2) 手动启动前端：npm run dev:${PORT}，待 Local 地址可访问后再启动 tauri dev`);
    try { child.kill(); } catch {}
    process.exit(1);
  }
}

main();
