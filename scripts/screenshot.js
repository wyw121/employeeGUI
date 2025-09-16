#!/usr/bin/env node
/**
 * 简单的 ADB 截图脚本
 * 直接使用 platform-tools 中的 adb.exe 进行截图
 */

import { spawn, exec } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AdbScreenshot {
  constructor() {
    // ADB 路径
    this.adbPath = path.join(__dirname, "..", "platform-tools", "adb.exe");
    this.screenshotDir = path.join(__dirname, "..", "screenshots");

    // 确保截图目录存在
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }
  }

  /**
   * 执行 ADB 命令
   */
  async executeAdbCommand(args) {
    return new Promise((resolve, reject) => {
      console.log(`执行命令: ${this.adbPath} ${args.join(" ")}`);

      const process = spawn(this.adbPath, args, { stdio: "pipe" });

      let stdout = "";
      let stderr = "";

      process.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      process.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      process.on("close", (code) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(new Error(`命令执行失败 (退出码: ${code}): ${stderr}`));
        }
      });

      process.on("error", (error) => {
        reject(new Error(`执行命令出错: ${error.message}`));
      });
    });
  }

  /**
   * 获取连接的设备列表
   */
  async getDevices() {
    try {
      const output = await this.executeAdbCommand(["devices"]);
      const lines = output.split("\n").slice(1); // 跳过标题行
      const devices = [];

      for (const line of lines) {
        const match = line.trim().match(/^(\S+)\s+device$/);
        if (match) {
          devices.push(match[1]);
        }
      }

      return devices;
    } catch (error) {
      throw new Error(`获取设备列表失败: ${error.message}`);
    }
  }

  /**
   * 给指定设备截图
   */
  async takeScreenshot(deviceId) {
    try {
      console.log(`🖥️ 开始为设备 ${deviceId} 截图...`);

      // 生成时间戳文件名
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .replace("T", "_")
        .split(".")[0];
      const filename = `screenshot_${deviceId}_${timestamp}.png`;
      const localPath = path.join(this.screenshotDir, filename);
      const devicePath = "/sdcard/temp_screenshot.png";

      // 步骤1：在设备上截图
      console.log("📸 在设备上执行截图命令...");
      await this.executeAdbCommand([
        "-s",
        deviceId,
        "shell",
        "screencap",
        "-p",
        devicePath,
      ]);

      // 步骤2：将截图拉取到本地
      console.log("📥 将截图文件拉取到本地...");
      await this.executeAdbCommand([
        "-s",
        deviceId,
        "pull",
        devicePath,
        localPath,
      ]);

      // 步骤3：清理设备上的临时文件
      console.log("🧹 清理设备上的临时文件...");
      try {
        await this.executeAdbCommand([
          "-s",
          deviceId,
          "shell",
          "rm",
          devicePath,
        ]);
      } catch (cleanupError) {
        console.warn("⚠️ 清理临时文件失败（可忽略）:", cleanupError.message);
      }

      // 验证文件是否存在
      if (fs.existsSync(localPath)) {
        console.log(`✅ 截图成功！文件保存在: ${localPath}`);
        return localPath;
      } else {
        throw new Error("截图文件未找到");
      }
    } catch (error) {
      throw new Error(`截图失败: ${error.message}`);
    }
  }

  /**
   * 打开截图文件夹
   */
  openScreenshotFolder() {
    const command =
      process.platform === "win32"
        ? "explorer"
        : process.platform === "darwin"
        ? "open"
        : "xdg-open";

    exec(`${command} "${this.screenshotDir}"`, (error) => {
      if (error) {
        console.warn("⚠️ 无法打开文件夹:", error.message);
        console.log(`📁 截图保存在: ${this.screenshotDir}`);
      }
    });
  }
}

// 主函数
async function main() {
  const screenshotTool = new AdbScreenshot();

  try {
    console.log("🔍 正在检测连接的设备...");
    const devices = await screenshotTool.getDevices();

    if (devices.length === 0) {
      console.error("❌ 没有检测到连接的设备");
      console.log("\n请确保：");
      console.log("1. 手机已通过USB连接到电脑");
      console.log('2. 手机已开启"开发者选项"中的"USB调试"');
      console.log("3. 已允许电脑的调试授权");
      return;
    }

    console.log(`✅ 发现 ${devices.length} 个设备:`);
    devices.forEach((device, index) => {
      console.log(`   ${index + 1}. ${device}`);
    });

    // 如果有多个设备，使用第一个；如果只有一个，直接使用
    const targetDevice = devices[0];
    console.log(`\n🎯 选择设备: ${targetDevice}`);

    // 执行截图
    const screenshotPath = await screenshotTool.takeScreenshot(targetDevice);

    // 打开截图文件夹
    screenshotTool.openScreenshotFolder();

    console.log("\n🎉 截图完成！");
  } catch (error) {
    console.error("❌ 操作失败:", error.message);
    console.log("\n🔧 故障排除建议:");
    console.log("1. 检查设备是否正确连接");
    console.log("2. 确认设备已授权USB调试");
    console.log("3. 尝试重新连接设备");
    console.log("4. 在手机上检查是否有调试授权提示");
  }
}

// 直接运行主函数
main();

export default AdbScreenshot;
