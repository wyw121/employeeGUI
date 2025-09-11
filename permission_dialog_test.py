#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
权限对话框处理测试脚本
这个脚本专门测试Android权限对话框的自动处理功能
"""

import subprocess
import time
import sys

def run_adb_command(device_id, cmd_args):
    """执行ADB命令"""
    full_cmd = ["adb", "-s", device_id] + cmd_args
    try:
        result = subprocess.run(full_cmd, capture_output=True, text=True, encoding='utf-8')
        return result.returncode == 0, result.stdout, result.stderr
    except Exception as e:
        return False, "", str(e)

def dump_ui_to_file(device_id, remote_path="/sdcard/ui_test.xml"):
    """获取UI层次结构"""
    success, stdout, stderr = run_adb_command(device_id, ["shell", "uiautomator", "dump", remote_path])
    if not success:
        print(f"❌ UI dump失败: {stderr}")
        return None
    
    # 读取dump文件
    success, ui_content, stderr = run_adb_command(device_id, ["shell", "cat", remote_path])
    if not success:
        print(f"❌ 读取UI文件失败: {stderr}")
        return None
    
    return ui_content

def check_permission_dialog(ui_content):
    """检查是否存在权限对话框"""
    if not ui_content:
        return False
    
    permission_indicators = [
        "com.android.packageinstaller",
        "permission_allow_button", 
        "permission_deny_button",
        "允许",
        "拒绝"
    ]
    
    found_count = sum(1 for indicator in permission_indicators if indicator in ui_content)
    return found_count >= 3

def click_allow_button(device_id):
    """点击允许按钮"""
    # 允许按钮坐标: bounds="[1299,584][1411,668]" -> 中心点 (1355, 626)
    success, stdout, stderr = run_adb_command(device_id, ["shell", "input", "tap", "1355", "626"])
    if not success:
        print(f"❌ 点击允许按钮失败: {stderr}")
        return False
    
    print("✅ 已点击允许按钮")
    return True

def main():
    device_id = "emulator-5556"
    
    print("🔍 权限对话框处理测试")
    print(f"📱 目标设备: {device_id}")
    print("=" * 50)
    
    # 1. 检查设备连接
    success, stdout, stderr = run_adb_command(device_id, ["shell", "echo", "connected"])
    if not success:
        print(f"❌ 设备未连接或ADB不可用: {stderr}")
        return 1
    print("✅ 设备连接正常")
    
    # 2. 获取当前UI状态
    print("\n📋 获取当前UI状态...")
    ui_content = dump_ui_to_file(device_id)
    if not ui_content:
        return 1
    
    print(f"   📄 UI内容长度: {len(ui_content)} 字符")
    
    # 3. 检查权限对话框
    print("\n🔍 检查权限对话框...")
    has_permission = check_permission_dialog(ui_content)
    
    if has_permission:
        print("✅ 检测到权限对话框")
        
        # 4. 点击允许按钮
        print("\n👆 点击允许按钮...")
        if click_allow_button(device_id):
            time.sleep(2)
            
            # 5. 验证处理结果
            print("\n🔎 验证处理结果...")
            new_ui_content = dump_ui_to_file(device_id, "/sdcard/ui_after_permission.xml")
            if new_ui_content:
                still_has_permission = check_permission_dialog(new_ui_content)
                
                if not still_has_permission:
                    print("🎉 权限对话框已成功处理!")
                    print("✅ 测试成功完成")
                    return 0
                else:
                    print("⚠️ 权限对话框可能仍然存在")
                    return 1
        else:
            return 1
    else:
        print("ℹ️ 当前没有权限对话框")
        print("💡 提示: 可以手动触发权限对话框后再运行此脚本")
        return 0

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
