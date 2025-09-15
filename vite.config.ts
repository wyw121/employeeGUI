import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],
  
  // 设置基础路径为相对路径，确保在Tauri中正常工作
  base: "./",

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1421,
    strictPort: true,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },

  // 构建配置
  build: {
    rollupOptions: {
      external: [
        '@tauri-apps/api/tauri',
        '@tauri-apps/api/window',
        '@tauri-apps/api/event',
        '@tauri-apps/api/path',
        '@tauri-apps/api/fs',
        '@tauri-apps/api/shell',
        '@tauri-apps/api/os',
        '@tauri-apps/api/dialog',
        '@tauri-apps/api/http',
        '@tauri-apps/api/notification',
        '@tauri-apps/api/clipboard'
      ]
    }
  }
}));
