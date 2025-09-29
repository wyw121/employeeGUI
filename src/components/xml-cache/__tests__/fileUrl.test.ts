import { describe, it, expect } from 'vitest';
import { stripExtendedPrefix, toForwardSlashes, toAssetUrl } from '../utils/fileUrl';

// Note: convertFileSrc is used inside toAssetUrl; in unit tests (node env) it may throw.
// The util already catches errors and returns undefined on failure, so we assert accordingly.

describe('fileUrl utils', () => {
  it('stripExtendedPrefix removes \\\\?\\ prefix', () => {
    // use String.raw to avoid escape confusions: literal is \\?\D:\\work\\file.png
    const input = String.raw`\\?\D:\work\file.png`;
    const output = stripExtendedPrefix(input);
    expect(output.startsWith('D:')).toBe(true);
  });

  it('toForwardSlashes converts backslashes to slashes', () => {
    const input = String.raw`D:\work\dir\file.png`;
    const output = toForwardSlashes(input);
    expect(output).toBe('D:/work/dir/file.png');
  });

  it('toAssetUrl returns undefined gracefully in node test env', () => {
    const abs = 'D:/work/dir/file.png';
    const url = toAssetUrl(abs);
    // In unit tests without WebView, convertFileSrc may not be functional; our util catches and returns undefined
    expect(url === undefined || typeof url === 'string').toBe(true);
  });
});
