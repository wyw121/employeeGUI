import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// 动态检测是否为网络共享 / 映射盘环境：
// 1. 环境变量优先：FORCE_POLLING=1 / DISABLE_POLLING=1 / WATCH_MODE=poll|native
// 2. 路径启发式：UNC (以 \\ 开头) / 包含 network|共享|share|nas
// 3. 映射盘识别（Windows）：优先 PowerShell CIM (DriveType=4)，回退 wmic（如果存在），再尝试 net use 输出，失败 / 空输出 fallback
// 4. 调试：设置 DEBUG_WATCH_MODE=1 输出详细检测过程 (ps / wmic / 错误信息)
// 5. Fallback：
//    - 异常 -> reason=fallback-mapped-unknown
//    - 空输出 -> reason=fallback-mapped-empty-output
// 7. net use 探测：
//    - 仅当 CIM 与 wmic 都未确认时调用 `net use X:`
//    - 命中网络特征 ( \\SERVER\Share / Remote name / 远程名称 ) -> net-use-detected
//    - 与 DriveType=4 双信号同时成立 -> multi-signal-network（最高置信网络盘）
// 6. 手动强制：
//    - ASSUME_NETWORK_DRIVE=1 直接视作网络磁盘
//    - ALWAYS_POLL_DRIVES=Z,X 逗号分隔盘符命中即启用轮询 reason=always-poll-list
const CACHE_VERSION = 1; // 升级判断逻辑时递增以失效老缓存
interface WatchCacheEntry {
  version: number;
  cwd: string;
  driveLetter: string | null;
  reason: string;
  usePolling: boolean;
  timestamp: string;
}

function loadCachedDecision(): WatchCacheEntry | null {
  try {
    if (process.env.WATCH_MODE_NO_CACHE === "1") return null;
    const cacheDir = join(process.cwd(), ".cache");
    const file = join(cacheDir, "watch-mode.json");
    if (!existsSync(file)) return null;
    const raw = readFileSync(file, "utf-8");
    const parsed = JSON.parse(raw) as WatchCacheEntry;
    if (parsed.version !== CACHE_VERSION) return null;
    if (parsed.cwd !== process.cwd()) return null;
    // 如果存在强制环境变量则忽略缓存
    if (process.env.FORCE_POLLING === "1" || process.env.DISABLE_POLLING === "1" || process.env.WATCH_MODE || process.env.ASSUME_NETWORK_DRIVE === "1" || process.env.ALWAYS_POLL_DRIVES) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveCachedDecision(entry: WatchCacheEntry) {
  try {
    const cacheDir = join(process.cwd(), ".cache");
    if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });
    writeFileSync(join(cacheDir, "watch-mode.json"), JSON.stringify(entry, null, 2), "utf-8");
  } catch {
    // ignore
  }
}

function resolveWatchMode() {
  const cached = loadCachedDecision();
  if (cached) {
    // eslint-disable-next-line no-console
    console.log(`[watch-mode] cache-hit usePolling=${cached.usePolling} reason=${cached.reason}`);
    return { usePolling: cached.usePolling, reason: cached.reason + "-cached", cached: true };
  }
  const forcePolling = process.env.FORCE_POLLING === "1" || process.env.CHOKIDAR_USEPOLLING === "1";
  const disablePolling = process.env.DISABLE_POLLING === "1";
  const assumeNetwork = process.env.ASSUME_NETWORK_DRIVE === "1";
  const alwaysPollList = (process.env.ALWAYS_POLL_DRIVES || "")
    .split(/[,;\s]+/)
    .map(s => s.trim().toUpperCase())
    .filter(Boolean);
  if (forcePolling && disablePolling) {
    // 冲突时以禁用优先，避免误用
    // eslint-disable-next-line no-console
    console.warn("[watch-mode] FORCE_POLLING 与 DISABLE_POLLING 同时设置，已优先禁用轮询");
    return { usePolling: false, reason: "conflict-disable" };
  }
  if (forcePolling) return { usePolling: true, reason: "force-env" };
  if (disablePolling) return { usePolling: false, reason: "force-disable" };
  if (assumeNetwork) return { usePolling: true, reason: "assume-network-env" };

  const watchModeEnv = (process.env.WATCH_MODE || "").toLowerCase();
  if (watchModeEnv === "poll") return { usePolling: true, reason: "watch-mode-env" };
  if (watchModeEnv === "native") return { usePolling: false, reason: "watch-mode-env" };

  // 基于路径启发式 + 驱动器类型 (Windows) 识别网络共享 + net use 探测
  const cwd = process.cwd();
  const isUnc = /^\\\\/.test(cwd);
  const hasNetworkKeyword = /\\network|\\共享|\\share|\\nas/i.test(cwd);

  // 额外：检测盘符是否为映射网络驱动器 (DriveType=4)
  // 仅在 Windows 尝试执行，失败安全忽略
  let isMappedNetwork = false;
  let netUseDetected = false;
  let debugDetails: Record<string, unknown> = {};
  const wantDebug = process.env.DEBUG_WATCH_MODE === "1";
  let mappingDetectionError: unknown = null;
  let emptyOutputFallback = false;
  try {
    const driveLetter = /^[A-Za-z]:/.test(cwd) ? cwd[0].toUpperCase() : null;
    debugDetails.driveLetter = driveLetter;
    if (driveLetter) {
      if (alwaysPollList.includes(driveLetter)) {
        debugDetails.alwaysPollMatched = true;
        return { usePolling: true, reason: "always-poll-list" };
      }
  // 方案一：PowerShell CIM (优先，较新)
      try {
        // 更稳健：避免复杂转义，统一用双引号包裹，内部单引号
        const psCmd = `powershell -NoProfile -Command "(Get-CimInstance Win32_LogicalDisk -Filter 'DeviceID=\'${driveLetter}:\'').DriveType"`;
        const psOut = execSync(psCmd, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
        debugDetails.psDriveTypeRaw = psOut;
        if (psOut.length === 0) {
          emptyOutputFallback = true;
        } else if (/^4$/.test(psOut)) {
            isMappedNetwork = true;
            debugDetails.psMatched = true;
        }
      } catch (e) {
        debugDetails.psError = String(e);
      }
      // 方案二：wmic 回退
      if (!isMappedNetwork) {
        try {
          const wmicCmd = `wmic logicaldisk where \"DeviceID='${driveLetter}:\"' get DriveType /value`;
          const wmicOut = execSync(wmicCmd, { stdio: ["ignore", "pipe", "ignore"] }).toString();
          debugDetails.wmicRaw = wmicOut;
            if (/DriveType=4/.test(wmicOut)) {
            isMappedNetwork = true;
            debugDetails.wmicMatched = true;
          }
          if (!isMappedNetwork && /DriveType=/.test(wmicOut) && !/DriveType=4/.test(wmicOut) && wmicOut.trim().length === 0) {
            emptyOutputFallback = true;
          }
        } catch (e) {
          debugDetails.wmicError = String(e);
        }
      }
      // 方案三：net use 探测（某些环境 PowerShell 限制 / wmic 缺失时仍可用）
      if (!isMappedNetwork) {
        try {
          const netCmd = `cmd /c net use ${driveLetter}:`;
            const netOut = execSync(netCmd, { stdio: ["ignore", "pipe", "ignore"] }).toString();
          debugDetails.netUseRaw = netOut;
          // 典型输出包含 远程名称 / Remote name 或 OK 状态行，简单匹配 \\\ 作为网络标志
          if (/\\\\[A-Za-z0-9_.-]+\\/i.test(netOut) || /远程名称|Remote/i.test(netOut)) {
            netUseDetected = true;
          }
        } catch (e) {
          debugDetails.netUseError = String(e);
        }
      }
    }
  } catch (err) {
    mappingDetectionError = err;
    debugDetails.globalError = String(err);
  }

  if (wantDebug) {
    // eslint-disable-next-line no-console
    console.log("[watch-mode][debug] mapping-details=", debugDetails);
  }

  let decision = { usePolling: false, reason: "default-native" };
  if (isUnc || hasNetworkKeyword) decision = { usePolling: true, reason: "heuristic-network" };
  else if (isMappedNetwork && netUseDetected) decision = { usePolling: true, reason: "multi-signal-network" };
  else if (isMappedNetwork) decision = { usePolling: true, reason: "mapped-network-drive" };
  else if (netUseDetected) decision = { usePolling: true, reason: "net-use-detected" };
  else if (mappingDetectionError) decision = { usePolling: true, reason: "fallback-mapped-unknown" };
  else if (emptyOutputFallback) decision = { usePolling: true, reason: "fallback-mapped-empty-output" };

  // 保存缓存（调试模式不缓存，避免频繁切换时干扰）
  if (process.env.DEBUG_WATCH_MODE !== "1" && process.env.WATCH_MODE_NO_CACHE !== "1") {
    try {
      const driveLetter = /^[A-Za-z]:/.test(process.cwd()) ? process.cwd()[0].toUpperCase() : null;
      saveCachedDecision({
        version: CACHE_VERSION,
        cwd: process.cwd(),
        driveLetter,
        reason: decision.reason,
        usePolling: decision.usePolling,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // ignore
    }
  }
  return decision;
}

const watchDecision = resolveWatchMode();
// 在控制台输出一次选择结果，方便诊断
// eslint-disable-next-line no-console
console.log(`[watch-mode] usePolling=${watchDecision.usePolling} reason=${watchDecision.reason} cwd=${process.cwd()}`);

// https://vitejs.dev/config/
export default defineConfig(() => ({
  plugins: [react()],

  // 设置基础路径为相对路径，确保在Tauri中正常工作
  base: "./",

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    // 允许通过环境变量覆盖端口，避免本机端口被占用时无法启动
    // 优先级：VITE_PORT > PORT > 默认 5187
    port: Number(process.env.VITE_PORT ?? process.env.PORT ?? 5187),
    strictPort: true,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
      // 根据动态决策是否启用轮询
      usePolling: watchDecision.usePolling,
    },
    // 网络共享 / 映射盘路径 (UNC -> 映射) 上原生 fs.watch 可能抛出 UNKNOWN 错误，
    // 这里强制使用轮询以提升稳定性（代价：CPU 更高）。如本地路径再改回 disablePolling。
    fs: {
      strict: false,
    },
    // 传递给 chokidar 的高级选项 (Vite 4/5 支持 server.watch.usePolling; Vite 5 内部合并到 chokidar)
    // 兼容写法：设置环境变量 CHOKIDAR_USEPOLLING=1 也可，这里直接在配置中声明。
    hmr: {
      overlay: true,
    },
  },

  // 构建配置
  build: {
    // 确保 Tauri API 能够正确打包
    rollupOptions: {
      output: {
        manualChunks: {
          "tauri-api": [
            "@tauri-apps/api/core",
            "@tauri-apps/api/event",
            "@tauri-apps/api/window",
          ],
        },
      },
    },
    // 目标为 ES2020 以支持现代浏览器特性
    target: "es2020",
    sourcemap: false,
  },
}));
