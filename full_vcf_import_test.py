#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
完整VCF导入测试，包含权限处理
"""

import subprocess
import time
import os

def run_adb_command(device_id, cmd_args):
    """执行ADB命令"""
    full_cmd = ["adb", "-s", device_id] + cmd_args
    try:
        result = subprocess.run(full_cmd, capture_output=True, text=True, encoding='utf-8')
        return result.returncode == 0, result.stdout, result.stderr
    except Exception as e:
        return False, "", str(e)

def create_test_vcf():
    """创建测试VCF文件"""
    vcf_content = """BEGIN:VCARD
VERSION:2.1
FN:张三
N:张三;;
TEL;CELL:+86 138 0013 8000
TEL;TYPE=CELL:+86 138 0013 8000
EMAIL:zhangsan@example.com
ADR:;;北京市朝阳区;;;;
NOTE:程序员
END:VCARD
BEGIN:VCARD
VERSION:2.1
FN:李四
N:李四;;
TEL;CELL:+86 139 0013 9000
TEL;TYPE=CELL:+86 139 0013 9000
EMAIL:lisi@example.com
ADR:;;上海市浦东区;;;;
NOTE:设计师
END:VCARD
BEGIN:VCARD
VERSION:2.1
FN:王五
N:王五;;
TEL;CELL:+86 137 0013 7000
TEL;TYPE=CELL:+86 137 0013 7000
EMAIL:wangwu@example.com
ADR:;;广州市天河区;;;;
NOTE:产品经理
END:VCARD"""
    
    with open("contacts_test.vcf", "w", encoding='utf-8') as f:
        f.write(vcf_content)
    
    print("✅ 已创建测试VCF文件: contacts_test.vcf")
    return "contacts_test.vcf"

def transfer_vcf_to_device(device_id, local_file):
    """传输VCF文件到设备"""
    device_path = "/sdcard/Download/contacts_import.vcf"
    
    success, stdout, stderr = run_adb_command(device_id, ["push", local_file, device_path])
    if not success:
        print(f"❌ 文件传输失败: {stderr}")
        return None
    
    print(f"✅ VCF文件已传输到设备: {device_path}")
    return device_path

def open_contacts_app(device_id):
    """启动联系人应用"""
    success, stdout, stderr = run_adb_command(device_id, [
        "shell", "am", "start", "-n", "com.android.contacts/.activities.PeopleActivity"
    ])
    
    if not success:
        print(f"❌ 启动联系人应用失败: {stderr}")
        return False
    
    print("✅ 联系人应用已启动")
    return True

def adb_tap(device_id, x, y):
    """ADB点击坐标"""
    success, stdout, stderr = run_adb_command(device_id, ["shell", "input", "tap", str(x), str(y)])
    if not success:
        print(f"❌ 点击 ({x}, {y}) 失败: {stderr}")
        return False
    return True

def dump_ui_and_check_permission(device_id):
    """检查UI并处理权限对话框"""
    # Dump UI
    success, stdout, stderr = run_adb_command(device_id, ["shell", "uiautomator", "dump", "/sdcard/ui_check.xml"])
    if not success:
        return False, False
    
    # 读取UI内容
    success, ui_content, stderr = run_adb_command(device_id, ["shell", "cat", "/sdcard/ui_check.xml"])
    if not success:
        return False, False
    
    # 检查权限对话框
    permission_indicators = [
        "com.android.packageinstaller",
        "permission_allow_button", 
        "允许"
    ]
    
    has_permission = sum(1 for indicator in permission_indicators if indicator in ui_content) >= 2
    
    if has_permission:
        print("🔍 检测到权限对话框，正在处理...")
        # 点击允许按钮
        if adb_tap(device_id, 1355, 626):
            print("✅ 已点击允许按钮")
            time.sleep(2)
            return True, True
    
    return True, False

def simulate_vcf_import_flow(device_id):
    """模拟VCF导入流程"""
    print("\n📱 开始VCF导入流程...")
    
    # 步骤1: 启动联系人应用
    if not open_contacts_app(device_id):
        return False
    
    time.sleep(3)
    
    # 检查权限对话框
    success, handled = dump_ui_and_check_permission(device_id)
    if not success:
        return False
    
    # 步骤2: 点击抽屉菜单
    print("👆 点击抽屉菜单...")
    if not adb_tap(device_id, 49, 98):
        return False
    time.sleep(2)
    
    # 步骤3: 点击设置
    print("👆 点击设置...")
    if not adb_tap(device_id, 280, 210):
        return False
    time.sleep(3)
    
    # 步骤4: 点击导入
    print("👆 点击导入...")
    if not adb_tap(device_id, 960, 817):
        return False
    time.sleep(3)
    
    # 再次检查权限对话框
    success, handled = dump_ui_and_check_permission(device_id)
    if not success:
        return False
    
    # 步骤5: 点击VCF文件选项
    print("👆 点击VCF文件选项...")
    if not adb_tap(device_id, 959, 509):
        return False
    time.sleep(3)
    
    # 最后检查权限对话框
    success, handled = dump_ui_and_check_permission(device_id)
    
    # 步骤6: 选择VCF文件
    print("👆 选择VCF文件...")
    if not adb_tap(device_id, 208, 613):
        return False
    time.sleep(2)
    
    print("✅ VCF导入流程执行完成")
    return True

def main():
    device_id = "emulator-5556"
    
    print("🔧 完整VCF导入测试（包含权限处理）")
    print(f"📱 目标设备: {device_id}")
    print("=" * 60)
    
    # 1. 创建测试VCF文件
    print("\n📝 创建测试VCF文件...")
    vcf_file = create_test_vcf()
    
    # 2. 传输到设备
    print("\n📤 传输VCF文件到设备...")
    device_vcf_path = transfer_vcf_to_device(device_id, vcf_file)
    if not device_vcf_path:
        return 1
    
    # 3. 执行导入流程
    if simulate_vcf_import_flow(device_id):
        print("\n🎉 VCF导入测试成功完成!")
        print("💡 检查联系人应用确认联系人是否已导入")
        return 0
    else:
        print("\n❌ VCF导入测试失败")
        return 1

if __name__ == "__main__":
    exit(main())
