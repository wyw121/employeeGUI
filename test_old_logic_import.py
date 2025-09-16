#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
按照旧版本逻辑的ADB导入测试脚本
模拟 ContactImportManager 旧版本的完整流程
"""

import os
import subprocess
import time
import json
from datetime import datetime

class OldLogicVcfImporter:
    def __init__(self, device_id="A2TB6R3308000938"):
        self.device_id = device_id
        self.adb_path = r".\platform-tools\adb.exe"
        
    def log(self, message):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {message}")
        
    def run_adb_command(self, cmd_args):
        """执行ADB命令"""
        cmd = [self.adb_path, "-s", self.device_id] + cmd_args
        self.log(f"执行命令: {' '.join(cmd)}")
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
            if result.returncode == 0:
                self.log(f"✅ 命令成功: {result.stdout.strip()}")
                return result.stdout.strip()
            else:
                self.log(f"❌ 命令失败: {result.stderr.strip()}")
                return None
        except Exception as e:
            self.log(f"❌ 命令执行异常: {e}")
            return None
    
    def step1_check_device(self):
        """步骤1: 检查设备连接 (模拟 loadDevices 方法)"""
        self.log("🔍 步骤1: 检查设备连接状态...")
        
        # 检查设备列表
        output = self.run_adb_command(["devices", "-l"])
        if output and self.device_id in output and "device" in output:
            self.log("✅ 设备连接正常")
            return True
        else:
            self.log("❌ 设备未连接或未授权")
            return False
    
    def step2_create_vcf_content(self, contacts):
        """步骤2: 生成VCF内容 (模拟后端 generate_vcf_file)"""
        self.log("📝 步骤2: 生成VCF文件内容...")
        
        vcf_content = ""
        
        for i, contact in enumerate(contacts, 1):
            parts = contact.strip().split(',')
            if len(parts) >= 2:
                name = parts[0]
                phone = parts[1]
                address = parts[2] if len(parts) > 2 else ""
                occupation = parts[3] if len(parts) > 3 else ""
                email = parts[4] if len(parts) > 4 else ""
                
                # 按照VCF 2.1标准格式
                vcf_content += "BEGIN:VCARD\n"
                vcf_content += "VERSION:2.1\n"
                vcf_content += f"FN:{name}\n"
                vcf_content += f"N:{name};\n"
                
                if phone:
                    # 格式化中国手机号
                    formatted_phone = phone
                    if len(phone) == 11 and phone.startswith('1'):
                        formatted_phone = f"+86 {phone[0:3]} {phone[3:7]} {phone[7:11]}"
                    vcf_content += f"TEL;CELL:{formatted_phone}\n"
                
                if email:
                    vcf_content += f"EMAIL:{email}\n"
                
                if address:
                    vcf_content += f"ADR:;;{address};;;;\n"
                
                if occupation:
                    vcf_content += f"NOTE:{occupation}\n"
                
                vcf_content += "END:VCARD\n"
        
        self.log(f"✅ 生成了 {len([c for c in contacts if c.strip()])} 个联系人的VCF内容")
        return vcf_content
    
    def step3_push_vcf_file(self, vcf_content):
        """步骤3: 推送VCF文件到设备 (模拟文件传输)"""
        self.log("📤 步骤3: 推送VCF文件到设备...")
        
        # 本地保存VCF文件
        local_vcf_path = f"temp_contacts_{int(time.time())}.vcf"
        with open(local_vcf_path, 'w', encoding='utf-8') as f:
            f.write(vcf_content)
        
        self.log(f"💾 本地保存VCF文件: {local_vcf_path}")
        
        # 推送到设备
        device_path = "/sdcard/Download/test_contacts_import.vcf"
        result = self.run_adb_command(["push", local_vcf_path, device_path])
        
        if result is not None:
            self.log(f"✅ 文件成功推送到设备: {device_path}")
            
            # 验证文件存在
            verify_result = self.run_adb_command(["shell", "ls", "-la", device_path])
            if verify_result:
                self.log(f"✅ 文件验证成功: {verify_result}")
                return device_path
        
        self.log("❌ 文件推送失败")
        return None
    
    def step4_launch_intent(self, vcf_path):
        """步骤4: 启动Intent打开VCF文件 (模拟旧版本的Intent启动)"""
        self.log("🚀 步骤4: 启动Intent打开VCF文件...")
        
        # 使用旧版本相同的Intent参数
        file_uri = f"file://{vcf_path}"
        cmd_args = [
            "shell", "am", "start",
            "-a", "android.intent.action.VIEW",
            "-d", file_uri,
            "-t", "text/x-vcard"
        ]
        
        result = self.run_adb_command(cmd_args)
        if result is not None:
            self.log("✅ Intent启动成功")
            time.sleep(3)  # 等待界面加载
            return True
        else:
            self.log("❌ Intent启动失败")
            return False
    
    def step5_ui_automation(self):
        """步骤5: UI自动化处理 (这里是关键！)"""
        self.log("🤖 步骤5: 开始UI自动化处理...")
        
        # 5.1 获取当前界面状态
        self.log("📱 获取当前UI状态...")
        self.run_adb_command(["shell", "uiautomator", "dump", "/sdcard/ui_dump.xml"])
        time.sleep(1)
        
        ui_content = self.run_adb_command(["shell", "cat", "/sdcard/ui_dump.xml"])
        if not ui_content:
            self.log("❌ 无法获取UI状态")
            return False
        
        # 保存UI dump用于分析
        with open("ui_dump_old_logic.xml", "w", encoding="utf-8") as f:
            f.write(ui_content)
        self.log("💾 UI状态已保存到 ui_dump_old_logic.xml")
        
        # 5.2 处理权限对话框
        if "允许" in ui_content or "Allow" in ui_content:
            self.log("🔓 发现权限对话框，点击允许...")
            # 尝试点击允许按钮
            if "允许" in ui_content:
                self.run_adb_command(["shell", "input", "tap", "700", "1200"])  # 经验坐标
            time.sleep(1)
        
        # 5.3 选择联系人应用
        self.log("📱 尝试选择联系人应用...")
        time.sleep(2)
        self.run_adb_command(["shell", "uiautomator", "dump", "/sdcard/ui_dump2.xml"])
        ui_content2 = self.run_adb_command(["shell", "cat", "/sdcard/ui_dump2.xml"])
        
        if ui_content2 and ("联系人" in ui_content2 or "通讯录" in ui_content2):
            self.log("📋 发现联系人应用选择，点击联系人...")
            self.run_adb_command(["shell", "input", "tap", "500", "800"])  # 中央位置点击
            time.sleep(2)
        
        # 5.4 确认导入
        self.log("✅ 尝试确认导入...")
        self.run_adb_command(["shell", "uiautomator", "dump", "/sdcard/ui_dump3.xml"])
        ui_content3 = self.run_adb_command(["shell", "cat", "/sdcard/ui_dump3.xml"])
        
        if ui_content3 and ("导入" in ui_content3 or "确定" in ui_content3 or "Import" in ui_content3):
            self.log("📥 发现导入确认界面，点击确认...")
            self.run_adb_command(["shell", "input", "tap", "700", "1000"])  # 确认按钮位置
            time.sleep(3)
        
        return True
    
    def step6_verify_import(self):
        """步骤6: 验证导入结果"""
        self.log("🔍 步骤6: 验证导入结果...")
        
        # 查询联系人数量
        result = self.run_adb_command([
            "shell", "content", "query",
            "--uri", "content://com.android.contacts/contacts",
            "--projection", "display_name"
        ])
        
        if result:
            lines = [line for line in result.split('\n') if line.strip() and not line.startswith('Row')]
            contact_count = len(lines)
            self.log(f"📊 当前联系人总数: {contact_count}")
            
            # 检查是否包含我们导入的测试联系人
            test_contacts_found = 0
            test_names = ["测试张三", "测试李四", "测试王五"]
            
            for name in test_names:
                if name in result:
                    test_contacts_found += 1
                    self.log(f"✅ 找到测试联系人: {name}")
            
            if test_contacts_found > 0:
                self.log(f"🎉 导入验证成功！找到 {test_contacts_found}/3 个测试联系人")
                return True
            else:
                self.log("⚠️ 未找到测试联系人，可能导入失败或需要更多时间")
                return False
        
        self.log("❌ 无法查询联系人，验证失败")
        return False
    
    def run_full_test(self):
        """运行完整的导入测试"""
        self.log("🚀 开始按照旧版本逻辑进行完整的VCF导入测试")
        self.log("="*60)
        
        # 准备测试数据
        test_contacts = [
            "测试张三,13800138001,北京市朝阳区,,zhangsan@test.com",
            "测试李四,13800138002,上海市浦东新区,,lisi@test.com",
            "测试王五,13800138003,广州市天河区,,wangwu@test.com"
        ]
        
        try:
            # 执行各个步骤
            if not self.step1_check_device():
                return False
            
            vcf_content = self.step2_create_vcf_content(test_contacts)
            if not vcf_content:
                return False
                
            vcf_path = self.step3_push_vcf_file(vcf_content)
            if not vcf_path:
                return False
                
            if not self.step4_launch_intent(vcf_path):
                return False
                
            if not self.step5_ui_automation():
                return False
                
            # 等待导入完成
            self.log("⏳ 等待导入完成...")
            time.sleep(5)
            
            success = self.step6_verify_import()
            
            if success:
                self.log("🎉 完整导入测试成功！")
            else:
                self.log("❌ 导入测试失败，请检查UI自动化步骤")
                
            return success
            
        except Exception as e:
            self.log(f"💥 测试过程中发生异常: {e}")
            return False
        finally:
            self.log("="*60)
            self.log("🧹 清理临时文件...")
            # 清理临时文件
            for file in ["temp_contacts_*.vcf"]:
                try:
                    if os.path.exists(file):
                        os.remove(file)
                except:
                    pass

if __name__ == "__main__":
    print("📱 旧版本逻辑ADB导入测试工具")
    print("模拟 ContactImportManager fb9786f 版本的导入流程")
    print()
    
    importer = OldLogicVcfImporter()
    success = importer.run_full_test()
    
    if success:
        print("\n✅ 测试完成：按照旧版本逻辑的导入流程正常工作")
        print("这意味着问题出现在新版本的代码逻辑中")
    else:
        print("\n❌ 测试失败：可能是设备、权限或UI自动化问题")
        print("请检查设备连接状态和权限设置")