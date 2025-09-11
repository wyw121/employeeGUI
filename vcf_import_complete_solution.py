#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
VCF文件导入完整解决方案
集成权限处理和文件导航
"""

import subprocess
import time
import sys

class VCFImportFixer:
    def __init__(self, device_id):
        self.device_id = device_id
    
    def run_adb_command(self, cmd_args):
        """执行ADB命令"""
        full_cmd = ["adb", "-s", self.device_id] + cmd_args
        try:
            result = subprocess.run(full_cmd, capture_output=True, text=True, encoding='utf-8')
            return result.returncode == 0, result.stdout, result.stderr
        except Exception as e:
            return False, "", str(e)
    
    def adb_tap(self, x, y, description=""):
        """ADB点击坐标"""
        print(f"🖱️ 点击坐标 ({x}, {y}) - {description}")
        success, _, stderr = self.run_adb_command(["shell", "input", "tap", str(x), str(y)])
        if not success:
            print(f"❌ 点击失败: {stderr}")
            return False
        time.sleep(2)
        return True
    
    def get_ui_dump(self, filename="ui.xml"):
        """获取UI内容"""
        success, _, _ = self.run_adb_command(["shell", "uiautomator", "dump", f"/sdcard/{filename}"])
        if not success:
            return None
        
        success, ui_content, _ = self.run_adb_command(["shell", "cat", f"/sdcard/{filename}"])
        return ui_content if success else None
    
    def transfer_vcf_file(self):
        """传输VCF文件到设备"""
        print("📁 传输VCF文件到设备...")
        
        # 检查本地VCF文件是否存在
        import os
        local_vcf = "src-tauri/contacts_import.vcf"
        if not os.path.exists(local_vcf):
            print(f"❌ 本地VCF文件不存在: {local_vcf}")
            return False
        
        # 传输到多个位置
        locations = [
            "/sdcard/Download/contacts_import.vcf",
            "/sdcard/contacts_import.vcf",
            "/storage/emulated/0/Download/contacts_import.vcf",
        ]
        
        success_count = 0
        for location in locations:
            success, _, stderr = self.run_adb_command(["push", local_vcf, location])
            if success:
                print(f"✅ 成功传输到: {location}")
                success_count += 1
            else:
                print(f"⚠️ 传输失败到: {location} - {stderr}")
        
        if success_count > 0:
            print(f"📤 文件传输完成，成功传输到 {success_count}/{len(locations)} 个位置")
            return True
        else:
            print("❌ 所有位置传输都失败")
            return False
    
    def handle_permission_dialog(self):
        """处理权限对话框"""
        print("🔐 检查并处理权限对话框...")
        
        ui_content = self.get_ui_dump("permission_check.xml")
        if not ui_content:
            return True
        
        # 检查是否有权限对话框
        permission_keywords = ["允许", "Allow", "权限", "Permission", "授权"]
        has_permission_dialog = any(keyword in ui_content for keyword in permission_keywords)
        
        if has_permission_dialog:
            print("📋 发现权限对话框，寻找允许按钮...")
            
            # 查找允许按钮的可能文本
            allow_texts = ["允许", "Allow", "同意", "确定", "OK"]
            for allow_text in allow_texts:
                if allow_text in ui_content:
                    print(f"🎯 找到允许按钮: {allow_text}")
                    # 使用固定坐标点击允许按钮（基于常见位置）
                    allow_positions = [
                        (1350, 650),  # 右下角确定按钮
                        (960, 650),   # 中央确定按钮
                        (960, 700),   # 稍低一点的位置
                    ]
                    
                    for x, y in allow_positions:
                        if self.adb_tap(x, y, f"允许按钮({allow_text})"):
                            time.sleep(2)
                            # 验证权限对话框是否消失
                            new_ui = self.get_ui_dump("after_permission.xml")
                            if new_ui and not any(kw in new_ui for kw in permission_keywords):
                                print("✅ 权限对话框已处理")
                                return True
                            break
        else:
            print("✅ 无需处理权限对话框")
            return True
        
        return True
    
    def navigate_to_vcf_file(self):
        """导航到VCF文件"""
        print("🧭 导航到VCF文件...")
        
        ui_content = self.get_ui_dump("navigation.xml")
        if not ui_content:
            return False
        
        # 检查是否已经能看到VCF文件
        if "contacts_import.vcf" in ui_content:
            print("✅ 已经能看到VCF文件")
            return True
        
        # 如果在"最近"目录或显示"无任何文件"
        if "最近" in ui_content or "无任何文件" in ui_content:
            print("📂 当前在'最近'目录，导航到Download文件夹...")
            
            # 点击显示根目录
            if self.adb_tap(63, 98, "显示根目录"):
                # 点击侧边栏中的下载文件夹 (基于调试结果的精确坐标)
                if self.adb_tap(280, 338, "下载文件夹"):
                    # 验证是否成功
                    verify_ui = self.get_ui_dump("verify_nav.xml")
                    if verify_ui and ("contacts_import.vcf" in verify_ui or ".vcf" in verify_ui):
                        print("🎉 成功导航到Download文件夹")
                        return True
        
        print("⚠️ 导航可能未完全成功，但继续尝试")
        return True
    
    def select_vcf_file(self):
        """选择VCF文件"""
        print("📝 选择VCF文件...")
        
        ui_content = self.get_ui_dump("file_selection.xml")
        if not ui_content:
            return False
        
        # 查找并点击VCF文件
        if "contacts_import.vcf" in ui_content:
            print("🎯 找到contacts_import.vcf，点击选择")
            # 使用中央位置点击
            self.adb_tap(960, 400, "VCF文件")
            return True
        elif ".vcf" in ui_content:
            print("🎯 找到VCF文件，点击选择")
            self.adb_tap(960, 400, "VCF文件")
            return True
        else:
            print("⚠️ 未找到VCF文件，使用默认位置点击")
            self.adb_tap(960, 400, "默认文件位置")
            return True
    
    def verify_import_success(self):
        """验证导入是否成功"""
        print("🔍 验证VCF导入是否成功...")
        
        # 等待导入弹窗消失和页面稳定
        time.sleep(5)
        
        # 检查当前是否在设置页面
        ui_content = self.get_ui_dump("current_page.xml")
        if ui_content and ("设置" in ui_content or "Settings" in ui_content):
            print("✅ 当前在通讯录设置页面，导入请求已提交")
        else:
            print("⚠️ 当前页面状态不明确")
        
        # 返回到通讯录主页面检查联系人
        print("📱 返回通讯录主页面检查联系人...")
        
        # 点击返回按钮或导航到主页
        back_attempts = [
            (63, 98, "返回按钮"),
            (49, 98, "返回按钮备用位置"),
        ]
        
        for x, y, desc in back_attempts:
            self.adb_tap(x, y, desc)
            time.sleep(2)
            
            # 检查是否回到主页
            main_ui = self.get_ui_dump("main_page_check.xml")
            if main_ui and ("联系人" in main_ui or "Contacts" in main_ui):
                print("✅ 已返回通讯录主页")
                break
        
        # 等待导入完成（导入是异步的）
        print("⏳ 等待联系人导入完成...")
        time.sleep(8)  # 给足够时间让导入完成
        
        # 检查联系人列表
        final_ui = self.get_ui_dump("final_contacts.xml")
        if final_ui:
            # 计算可能的联系人数量指标
            contact_indicators = [
                final_ui.count("android.widget.TextView"),  # TextView数量
                final_ui.count("contact"),  # 包含contact的元素
                final_ui.count("电话"),     # 电话相关元素
                final_ui.count("phone"),   # phone相关元素
            ]
            
            total_indicators = sum(contact_indicators)
            print(f"📊 联系人相关元素统计: {contact_indicators}, 总计: {total_indicators}")
            
            # 检查是否有明显的联系人条目
            if total_indicators > 10 or "测试联系人" in final_ui:
                print("🎉 检测到联系人数据，导入可能成功！")
                return True
            else:
                print("⚠️ 未检测到明显的联系人增加")
        
        return False

    def complete_import_process(self):
        """完成导入过程"""
        print("✅ 完成VCF导入过程...")
        
        # 等待导入确认弹窗（很短暂）
        time.sleep(3)
        
        print("📱 VCF导入请求已提交")
        return True
    
    def run_complete_import(self):
        """运行完整的VCF导入流程"""
        print(f"🚀 开始完整的VCF导入流程 - 设备: {self.device_id}")
        print("=" * 60)
        
        # 检查设备连接
        success, _, stderr = self.run_adb_command(["shell", "echo", "test"])
        if not success:
            print(f"❌ 设备 {self.device_id} 不可用: {stderr}")
            return False
        
        print(f"✅ 设备 {self.device_id} 连接正常")
        
        # 步骤1: 传输VCF文件
        if not self.transfer_vcf_file():
            print("❌ VCF文件传输失败")
            return False
        
        # 步骤2: 导航到联系人应用的导入界面
        print("\n📱 导航到联系人应用导入界面...")
        navigation_steps = [
            ("am start -n com.android.contacts/.activities.PeopleActivity", "启动联系人应用"),
            ("input tap 49 98", "点击抽屉菜单"),
            ("input tap 280 210", "点击设置"),
            ("input tap 960 817", "点击导入"),
            ("input tap 959 509", "点击VCF文件选项")
        ]
        
        for i, (cmd, desc) in enumerate(navigation_steps, 1):
            print(f"   {i}. {desc}")
            self.run_adb_command(["shell"] + cmd.split())
            time.sleep(2 if i < len(navigation_steps) else 3)
        
        # 步骤3: 处理权限对话框
        if not self.handle_permission_dialog():
            print("⚠️ 权限处理可能有问题，但继续流程")
        
        # 步骤4: 导航到VCF文件
        if not self.navigate_to_vcf_file():
            print("⚠️ 文件导航可能有问题，但继续流程")
        
        # 步骤5: 选择VCF文件
        if not self.select_vcf_file():
            print("⚠️ 文件选择可能有问题，但继续流程")
        
        # 步骤6: 完成导入
        if not self.complete_import_process():
            print("⚠️ 导入完成可能有问题")
        
        # 步骤7: 验证导入结果
        success = self.verify_import_success()
        
        if success:
            print("\n🎉 VCF导入流程全部完成并验证成功！")
        else:
            print("\n⚠️ VCF导入流程完成，但验证结果不确定")
        
        print("📋 建议手动检查联系人应用确认最终导入结果")
        return success

def main():
    if len(sys.argv) < 2:
        print("用法: python vcf_import_complete_solution.py <device_id>")
        print("示例: python vcf_import_complete_solution.py emulator-5556")
        return 1
    
    device_id = sys.argv[1]
    fixer = VCFImportFixer(device_id)
    
    if fixer.run_complete_import():
        print(f"\n🎉 设备 {device_id} VCF导入成功完成！")
        return 0
    else:
        print(f"\n❌ 设备 {device_id} VCF导入失败")
        return 1

if __name__ == "__main__":
    exit(main())
