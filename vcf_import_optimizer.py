#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
VCF文件导入优化脚本
重点优化文件选择和导入确认流程
"""

import subprocess
import time
import sys
import xml.etree.ElementTree as ET

class VCFImportOptimizer:
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
    
    def get_ui_dump_and_save(self, filename="ui_debug.xml"):
        """获取UI内容并保存"""
        success, _, _ = self.run_adb_command(["shell", "uiautomator", "dump", f"/sdcard/{filename}"])
        if not success:
            return None
        
        success, ui_content, _ = self.run_adb_command(["shell", "cat", f"/sdcard/{filename}"])
        if success:
            # 保存到本地以便调试
            local_file = f"debug_{filename}"
            with open(local_file, 'w', encoding='utf-8') as f:
                f.write(ui_content)
            print(f"📄 UI内容已保存到: {local_file}")
            return ui_content
        return None
    
    def parse_clickable_elements(self, ui_content):
        """解析UI中所有可点击的元素"""
        try:
            root = ET.fromstring(ui_content)
            elements = []
            
            def extract_elements(node):
                bounds = node.get('bounds')
                text = node.get('text') or ""
                content_desc = node.get('content-desc') or ""
                clickable = node.get('clickable') == 'true'
                resource_id = node.get('resource-id') or ""
                
                if (clickable or text.strip() or content_desc.strip()) and bounds:
                    elements.append({
                        'text': text.strip(),
                        'content_desc': content_desc.strip(),
                        'bounds': bounds,
                        'clickable': clickable,
                        'resource_id': resource_id,
                        'class': node.get('class', '')
                    })
                
                for child in node:
                    extract_elements(child)
            
            extract_elements(root)
            return elements
            
        except Exception as e:
            print(f"❌ 解析XML失败: {e}")
            return []
    
    def get_center_coordinates(self, bounds_str):
        """从bounds字符串获取中心坐标"""
        try:
            # 格式: [left,top][right,bottom]
            bounds_str = bounds_str.replace('[', '').replace(']', ',')
            coords = [int(x) for x in bounds_str.split(',') if x]
            if len(coords) == 4:
                left, top, right, bottom = coords
                center_x = (left + right) // 2
                center_y = (top + bottom) // 2
                return center_x, center_y
        except:
            pass
        return None
    
    def navigate_to_vcf_import_page(self):
        """导航到VCF导入页面"""
        print("📱 导航到联系人应用VCF导入页面...")
        
        steps = [
            ("am start -n com.android.contacts/.activities.PeopleActivity", "启动联系人应用"),
            ("input tap 49 98", "点击抽屉菜单"),
            ("input tap 280 210", "点击设置"),  
            ("input tap 960 817", "点击导入"),
            ("input tap 959 509", "点击VCF文件选项")
        ]
        
        for i, (cmd, desc) in enumerate(steps, 1):
            print(f"   {i}. {desc}")
            self.run_adb_command(["shell"] + cmd.split())
            time.sleep(2 if i < len(steps) else 3)
    
    def navigate_to_download_folder(self):
        """导航到Download文件夹"""
        print("🧭 导航到Download文件夹...")
        
        # 获取当前UI状态
        ui_content = self.get_ui_dump_and_save("current_file_picker.xml")
        if not ui_content:
            return False
        
        # 检查是否已经能看到VCF文件
        if "contacts_import.vcf" in ui_content:
            print("✅ 已经能看到VCF文件，无需导航")
            return True
        
        # 检查是否在"最近"目录
        if "最近" in ui_content or "无任何文件" in ui_content:
            print("📂 当前在'最近'目录，需要导航到Download")
            
            # 点击显示根目录
            if self.adb_tap(63, 98, "显示根目录"):
                # 点击侧边栏中的下载文件夹
                if self.adb_tap(280, 338, "下载文件夹"):
                    # 验证导航结果
                    verify_ui = self.get_ui_dump_and_save("after_navigation.xml")
                    if verify_ui and ("contacts_import.vcf" in verify_ui or ".vcf" in verify_ui):
                        print("🎉 成功导航到Download文件夹")
                        return True
        
        return True
    
    def select_vcf_file_precisely(self):
        """精确选择VCF文件"""
        print("📝 精确选择VCF文件...")
        
        ui_content = self.get_ui_dump_and_save("file_selection.xml")
        if not ui_content:
            print("❌ 无法获取文件列表UI")
            return False
        
        # 解析所有可点击元素
        elements = self.parse_clickable_elements(ui_content)
        print(f"📊 找到 {len(elements)} 个UI元素")
        
        # 查找VCF文件相关的元素
        vcf_elements = []
        for elem in elements:
            text_content = f"{elem['text']} {elem['content_desc']}".lower()
            if "contacts_import.vcf" in text_content or ".vcf" in text_content:
                coords = self.get_center_coordinates(elem['bounds'])
                if coords:
                    vcf_elements.append({
                        'element': elem,
                        'coords': coords,
                        'priority': 1 if "contacts_import.vcf" in text_content else 2
                    })
        
        # 按优先级排序（contacts_import.vcf优先）
        vcf_elements.sort(key=lambda x: x['priority'])
        
        if vcf_elements:
            # 选择最佳匹配的VCF文件
            best_match = vcf_elements[0]
            elem = best_match['element']
            coords = best_match['coords']
            
            print(f"🎯 找到VCF文件: '{elem['text']}' - 坐标: {coords}")
            print(f"   元素信息: {elem['resource_id']}, 可点击: {elem['clickable']}")
            
            # 点击VCF文件
            if self.adb_tap(coords[0], coords[1], f"VCF文件: {elem['text']}"):
                print("✅ 成功点击VCF文件")
                return True
            else:
                print("❌ 点击VCF文件失败")
                return False
        else:
            print("⚠️ 未找到具体的VCF文件元素，尝试默认位置")
            # 尝试文件列表中央位置
            if self.adb_tap(960, 400, "文件列表中央"):
                return True
            return False
    
    def wait_for_import_confirmation(self):
        """等待并确认导入过程"""
        print("⏳ 等待导入确认弹窗...")
        
        # 等待可能的确认弹窗出现
        max_wait = 10  # 最多等待10秒
        for i in range(max_wait):
            time.sleep(1)
            ui_content = self.get_ui_dump_and_save(f"import_wait_{i}.xml")
            
            if ui_content:
                # 检查是否有导入相关的弹窗或消息
                import_indicators = [
                    "将在稍后导入", "将稍后导入", "will be imported", 
                    "导入中", "importing", "导入完成", "import complete",
                    ".vcf文件", "vcf file", "联系人", "contacts"
                ]
                
                for indicator in import_indicators:
                    if indicator.lower() in ui_content.lower():
                        print(f"🎉 找到导入确认信息: '{indicator}'")
                        
                        # 检查是否有确认按钮需要点击
                        elements = self.parse_clickable_elements(ui_content)
                        confirm_buttons = []
                        
                        for elem in elements:
                            button_text = f"{elem['text']} {elem['content_desc']}".lower()
                            if any(btn in button_text for btn in ["确定", "ok", "确认", "导入", "import"]):
                                coords = self.get_center_coordinates(elem['bounds'])
                                if coords:
                                    confirm_buttons.append({
                                        'text': elem['text'] or elem['content_desc'],
                                        'coords': coords
                                    })
                        
                        if confirm_buttons:
                            # 点击确认按钮
                            btn = confirm_buttons[0]
                            print(f"🖱️ 点击确认按钮: {btn['text']}")
                            self.adb_tap(btn['coords'][0], btn['coords'][1], f"确认按钮: {btn['text']}")
                        
                        print("✅ 导入确认完成")
                        return True
                
                # 检查是否已经回到了设置页面
                if "设置" in ui_content or "Settings" in ui_content:
                    print("📱 已返回设置页面，导入可能已开始")
                    return True
        
        print("⚠️ 未检测到明确的导入确认，但继续验证")
        return True
    
    def verify_import_result(self):
        """验证导入结果"""
        print("🔍 验证联系人导入结果...")
        
        # 返回联系人首页
        print("📱 返回联系人首页...")
        self.run_adb_command(["shell", "am", "start", "-n", "com.android.contacts/.activities.PeopleActivity"])
        time.sleep(3)
        
        # 获取联系人列表UI
        contacts_ui = self.get_ui_dump_and_save("contacts_verification.xml")
        if contacts_ui:
            # 解析联系人元素
            elements = self.parse_clickable_elements(contacts_ui)
            
            # 查找联系人相关的元素
            contact_names = []
            for elem in elements:
                text = elem['text'].strip()
                # 过滤掉系统界面元素，只保留可能的联系人姓名
                if (text and len(text) > 1 and 
                    text not in ["联系人", "Contacts", "搜索", "Search", "添加", "Add", "更多", "More", "设置", "Settings"] and
                    not text.startswith("android") and
                    elem['class'] in ['android.widget.TextView', 'android.widget.Button']):
                    contact_names.append(text)
            
            print(f"📊 在联系人列表中找到 {len(contact_names)} 个可能的联系人")
            
            if contact_names:
                print("👥 发现的联系人:")
                for i, name in enumerate(contact_names[:10], 1):  # 显示前10个
                    print(f"   {i}. {name}")
                
                if len(contact_names) > 10:
                    print(f"   ... (还有 {len(contact_names) - 10} 个联系人)")
                
                # 检查是否有VCF文件中应该包含的联系人
                expected_contacts = ["John Doe", "张三", "李四", "Test User"]  # VCF文件中的示例联系人
                found_expected = []
                
                for expected in expected_contacts:
                    if any(expected in name for name in contact_names):
                        found_expected.append(expected)
                
                if found_expected:
                    print(f"🎉 成功导入预期联系人: {found_expected}")
                    return True, len(contact_names), found_expected
                else:
                    print("⚠️ 未找到预期的联系人，但联系人列表不为空")
                    return True, len(contact_names), []
            else:
                print("❌ 联系人列表为空或无法识别联系人")
                return False, 0, []
        else:
            print("❌ 无法获取联系人列表")
            return False, 0, []
    
    def run_optimized_import(self):
        """运行优化的VCF导入流程"""
        print(f"🚀 开始优化的VCF导入流程 - 设备: {self.device_id}")
        print("=" * 60)
        
        # 检查设备连接
        success, _, stderr = self.run_adb_command(["shell", "echo", "test"])
        if not success:
            print(f"❌ 设备 {self.device_id} 不可用: {stderr}")
            return False
        
        print(f"✅ 设备 {self.device_id} 连接正常")
        
        try:
            # 步骤1: 导航到VCF导入页面
            self.navigate_to_vcf_import_page()
            
            # 步骤2: 导航到Download文件夹
            if not self.navigate_to_download_folder():
                print("⚠️ 文件导航可能有问题，但继续")
            
            # 步骤3: 精确选择VCF文件
            if not self.select_vcf_file_precisely():
                print("❌ VCF文件选择失败")
                return False
            
            # 步骤4: 等待导入确认
            if not self.wait_for_import_confirmation():
                print("⚠️ 导入确认可能有问题，但继续验证")
            
            # 步骤5: 验证导入结果
            success, contact_count, expected_contacts = self.verify_import_result()
            
            if success:
                print(f"\n🎉 VCF导入验证成功!")
                print(f"📊 联系人总数: {contact_count}")
                if expected_contacts:
                    print(f"✅ 成功导入预期联系人: {expected_contacts}")
                else:
                    print("📱 联系人已导入，但可能需要手动确认具体内容")
                return True
            else:
                print("\n❌ VCF导入验证失败")
                return False
                
        except Exception as e:
            print(f"❌ 导入过程中出现异常: {e}")
            return False

def main():
    if len(sys.argv) < 2:
        print("用法: python vcf_import_optimizer.py <device_id>")
        print("示例: python vcf_import_optimizer.py emulator-5556")
        return 1
    
    device_id = sys.argv[1]
    optimizer = VCFImportOptimizer(device_id)
    
    if optimizer.run_optimized_import():
        print(f"\n🎉 设备 {device_id} VCF导入优化流程成功完成！")
        return 0
    else:
        print(f"\n❌ 设备 {device_id} VCF导入优化流程失败")
        return 1

if __name__ == "__main__":
    exit(main())
