#!/usr/bin/env python3
import subprocess
import re
import time

try:
    # 首先dump到文件
    print("Step 1: Dumping UI to file...")
    result1 = subprocess.run(['adb', '-s', 'emulator-5554', 'shell', 'uiautomator', 'dump', '/sdcard/ui_test.xml'], 
                            capture_output=True, text=True, timeout=10)
    print(f"Dump result: {result1.returncode}, stderr: {result1.stderr}")
    
    # 等待文件写入
    time.sleep(1)
    
    # 读取文件内容
    print("Step 2: Reading UI file...")
    result2 = subprocess.run(['adb', '-s', 'emulator-5554', 'shell', 'cat', '/sdcard/ui_test.xml'], 
                            capture_output=True, text=True, timeout=10)
    
    print(f"Read result: {result2.returncode}")
    print(f"Content length: {len(result2.stdout)}")
    
    if result2.returncode == 0 and len(result2.stdout) > 100:
        ui_content = result2.stdout
        
        # 显示前500字符
        print("\n=== First 500 characters ===")
        print(ui_content[:500])
        
        # 查找bounds格式
        bounds_patterns = re.findall(r'bounds="[^"]*"', ui_content)
        
        print(f"\n=== Found {len(bounds_patterns)} bounds patterns (first 10) ===")
        for i, bounds in enumerate(bounds_patterns[:10]):
            print(f"{i+1}. {bounds}")
            
        # 特别查找全屏bounds - 检查两种可能的格式
        print("\n=== Full screen bounds analysis ===")
        full_screen_1080_1920 = [b for b in bounds_patterns if '1080' in b and '1920' in b]
        for bounds in full_screen_1080_1920[:3]:
            print(f"  1080x1920 format: {bounds}")
            
        # 查找可能的关注按钮
        print("\n=== Potential follow button bounds ===")
        follow_bounds = [b for b in bounds_patterns if 'bounds=' in b]
        for i, bounds in enumerate(follow_bounds[:5]):
            print(f"  {i+1}. {bounds}")
            
    else:
        print("Failed to read UI file")
        print(f"Raw output: '{result2.stdout[:200]}'")
        
except Exception as e:
    print(f"Exception: {e}")