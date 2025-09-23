// 校验工具：保持纯函数，易于单元测试

export const isValidHostPort = (value?: string): boolean => {
  if (!value) return false;
  const m = value.trim().match(/^([\w.-]+):(\d{2,5})$/);
  if (!m) return false;
  const port = Number(m[2]);
  return port > 0 && port <= 65535;
};

export const isValidIp = (value?: string): boolean => {
  if (!value) return false;
  const parts = value.trim().split('.');
  if (parts.length !== 4) return false;
  return parts.every(p => {
    const n = Number(p);
    return Number.isInteger(n) && n >= 0 && n <= 255;
  });
};

export const isValidPort = (value?: string | number): boolean => {
  const n = typeof value === 'string' ? Number(value) : value;
  return Number.isInteger(n) && n! > 0 && n! <= 65535;
};

export const isValidPairCode = (value?: string): boolean => {
  if (!value) return false;
  return /^[0-9A-Za-z]{4,12}$/.test(value.trim());
};
