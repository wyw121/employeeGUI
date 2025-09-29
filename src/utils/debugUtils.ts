/**
 * 调试工具集 - 统一管理调试日志输出
 */

// 调试模式控制
const DEBUG_MODE = process.env.NODE_ENV === 'development';
const VERBOSE_LOGS = process.env.REACT_APP_VERBOSE_LOGS === 'true';

/**
 * 图片加载相关调试日志
 */
export const imageDebug = {
  log: DEBUG_MODE ? console.log.bind(console) : () => {},
  warn: console.warn.bind(console), // 警告始终显示
  error: console.error.bind(console), // 错误始终显示
  verbose: VERBOSE_LOGS ? console.log.bind(console) : () => {},
};

/**
 * 缓存相关调试日志
 */
export const cacheDebug = {
  log: DEBUG_MODE ? console.log.bind(console) : () => {},
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  verbose: VERBOSE_LOGS ? console.log.bind(console) : () => {},
};

/**
 * 性能监控工具
 */
export const performance = {
  mark: (name: string) => {
    if (DEBUG_MODE && window.performance) {
      window.performance.mark(name);
    }
  },
  measure: (name: string, startMark: string, endMark?: string) => {
    if (DEBUG_MODE && window.performance) {
      try {
        const measure = window.performance.measure(name, startMark, endMark);
        console.log(`⚡ 性能指标 [${name}]: ${measure.duration.toFixed(2)}ms`);
      } catch (e) {
        // 忽略性能测量错误
      }
    }
  },
  time: (label: string) => {
    if (DEBUG_MODE) {
      console.time(label);
    }
  },
  timeEnd: (label: string) => {
    if (DEBUG_MODE) {
      console.timeEnd(label);
    }
  },
};

export default {
  imageDebug,
  cacheDebug,
  performance,
};