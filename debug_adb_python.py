#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import subprocess


# 测试Python ADB调用
def test_python_adb():
    adb_path = r"D:\leidian\LDPlayer9\adb.exe"

    print("=== Python ADB测试 ===")

    # 测试devices命令
    try:
        full_command = f'"{adb_path}" devices'
        print(f"执行命令: {full_command}")
        result = subprocess.run(
            full_command, shell=True, capture_output=True, text=True, encoding="utf-8"
        )
        print(f"返回码: {result.returncode}")
        print(f"输出: {repr(result.stdout)}")
        print(f"错误: {repr(result.stderr)}")
    except Exception as e:
        print(f"异常: {e}")

    print("\n" + "=" * 50 + "\n")

    # 测试connect命令
    try:
        full_command = f'"{adb_path}" connect 127.0.0.1:5555'
        print(f"执行命令: {full_command}")
        result = subprocess.run(
            full_command, shell=True, capture_output=True, text=True, encoding="utf-8"
        )
        print(f"返回码: {result.returncode}")
        print(f"输出: {repr(result.stdout)}")
        print(f"错误: {repr(result.stderr)}")
    except Exception as e:
        print(f"异常: {e}")


if __name__ == "__main__":
    test_python_adb()
