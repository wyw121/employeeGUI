#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
设备ID验证脚本
验证新版本useAdb()返回的设备ID是否正确
"""

import subprocess
import json

def get_adb_devices():
    """获取ADB设备列表"""
    try:
        result = subprocess.run(
            [r".\platform-tools\adb.exe", "devices", "-l"], 
            capture_output=True, text=True, encoding='utf-8'
        )
        
        if result.returncode == 0:
            lines = result.stdout.strip().split('\n')[1:]  # 跳过标题行
            devices = []
            
            for line in lines:
                if line.strip():
                    parts = line.strip().split()
                    if len(parts) >= 2:
                        device_id = parts[0]
                        status = parts[1]
                        
                        # 解析额外信息
                        model = ""
                        product = ""
                        transport_id = ""
                        
                        for part in parts[2:]:
                            if part.startswith('model:'):
                                model = part.split(':', 1)[1]
                            elif part.startswith('product:'):
                                product = part.split(':', 1)[1]
                            elif part.startswith('transport_id:'):
                                transport_id = part.split(':', 1)[1]
                        
                        devices.append({
                            'id': device_id,
                            'status': status,
                            'model': model,
                            'product': product,
                            'transport_id': transport_id
                        })
            
            return devices
        else:
            print(f"ADB命令失败: {result.stderr}")
            return []
            
    except Exception as e:
        print(f"执行ADB命令时出错: {e}")
        return []

def main():
    print("🔍 设备ID验证脚本")
    print("=" * 50)
    
    # 获取ADB设备列表
    adb_devices = get_adb_devices()
    
    if not adb_devices:
        print("❌ 未找到ADB设备")
        return
    
    print("📱 当前ADB设备列表:")
    for i, device in enumerate(adb_devices, 1):
        print(f"  {i}. 设备ID: {device['id']}")
        print(f"     状态: {device['status']}")
        print(f"     型号: {device['model']}")
        print(f"     产品: {device['product']}")
        print(f"     传输ID: {device['transport_id']}")
        print()
    
    print("🎯 问题分析:")
    print("新版本ContactImportManager应该使用以下设备ID:")
    
    for device in adb_devices:
        if device['status'] == 'device':
            print(f"  ✅ 正确的ADB设备ID: {device['id']}")
            print(f"     这个ID应该传递给后端的import_vcf_contacts_async_safe方法")
    
    print("\n💡 验证方法:")
    print("1. 在ContactImportManager中添加console.log打印设备ID")
    print("2. 确认打印的ID与上述ADB设备ID一致") 
    print("3. 如果不一致，检查Device实体的id字段映射")
    
    print("\n🛠️ 修复建议:")
    print("如果Device.id不是ADB设备ID，可能需要:")
    print("- 检查Device.fromRaw()方法的实现")
    print("- 确保id字段正确映射到ADB设备ID")
    print("- 或者在ContactImportManager中使用正确的字段")

if __name__ == "__main__":
    main()