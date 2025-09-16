import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

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
    port: 3000,
    strictPort: true,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
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
