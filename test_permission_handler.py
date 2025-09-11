#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试权限对话框处理逻辑
"""

import subprocess
import time

def test_permission_dialog_click():
    """测试点击权限对话框的允许按钮"""
    device_id = "emulator-5556"
    adb_path = "adb"
    
    print("🔍 当前权限对话框状态测试")
    
    # 1. 获取当前UI状态
    print("1. 获取当前UI状态...")
    result = subprocess.run([
        adb_path, "-s", device_id, "shell", "uiautomator", "dump", "/sdcard/permission_test.xml"
    ], capture_output=True, text=True)
    
    if result.returncode == 0:
        print("   ✅ UI dump成功")
    else:
        print(f"   ❌ UI dump失败: {result.stderr}")
        return
    
    # 2. 读取UI内容
    result = subprocess.run([
        adb_path, "-s", device_id, "shell", "cat", "/sdcard/permission_test.xml"
    ], capture_output=True, text=True)
    
    if result.returncode == 0:
        ui_content = result.stdout
        print(f"   ✅ 读取UI内容成功 ({len(ui_content)} 字符)")
    else:
        print(f"   ❌ 读取UI内容失败: {result.stderr}")
        return
    
    # 3. 检查权限对话框特征
    permission_indicators = [
        "com.android.packageinstaller",
        "permission_allow_button", 
        "permission_deny_button",
        "允许\"通讯录\"访问您设备上的照片、媒体内容和文件吗？",
        "允许",
        "拒绝"
    ]
    
    found_indicators = [indicator for indicator in permission_indicators if indicator in ui_content]
    print(f"   🔍 找到权限对话框指标: {len(found_indicators)}/6")
    for indicator in found_indicators:
        print(f"      ✓ {indicator}")
    
    if len(found_indicators) >= 3:
        print("   ✅ 确认检测到权限对话框")
        
        # 4. 点击允许按钮
        print("2. 点击允许按钮...")
        # 允许按钮坐标: bounds="[1299,584][1411,668]" -> 中心点 (1355, 626)
        result = subprocess.run([
            adb_path, "-s", device_id, "shell", "input", "tap", "1355", "626"
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print("   ✅ 点击允许按钮成功")
            time.sleep(2)
            
            # 5. 验证权限对话框是否消失
            print("3. 验证权限对话框状态...")
            subprocess.run([
                adb_path, "-s", device_id, "shell", "uiautomator", "dump", "/sdcard/permission_after.xml"
            ], capture_output=True, text=True)
            
            result = subprocess.run([
                adb_path, "-s", device_id, "shell", "cat", "/sdcard/permission_after.xml"
            ], capture_output=True, text=True)
            
            if result.returncode == 0:
                new_ui_content = result.stdout
                # 检查权限对话框是否还存在
                still_has_permission = "com.android.packageinstaller" in new_ui_content and "permission_allow_button" in new_ui_content
                
                if not still_has_permission:
                    print("   ✅ 权限对话框已成功消失")
                    print("   🎯 权限处理成功!")
                else:
                    print("   ⚠️ 权限对话框可能仍然存在")
            
        else:
            print(f"   ❌ 点击允许按钮失败: {result.stderr}")
    else:
        print("   ❌ 未检测到权限对话框")

if __name__ == "__main__":
    test_permission_dialog_click()
