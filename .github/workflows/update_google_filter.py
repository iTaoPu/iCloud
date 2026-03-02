#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
独立脚本：生成Google.txt（版本号自增+北京时间）
存放路径：.github/workflows/update_google_filter.py
"""
import os
from datetime import datetime, timedelta

def get_beijing_time() -> str:
    """获取北京时间，格式：YYYY-MM-DD"""
    beijing_tz = timedelta(hours=8)
    return (datetime.utcnow() + beijing_tz).strftime("%Y-%m-%d")

def get_new_version() -> str:
    """读取现有版本号并自增最后一位，无文件则返回1.0.0.0"""
    default_ver = "1.0.0.0"
    if not os.path.exists("Google.txt"):
        return default_ver
    
    try:
        with open("Google.txt", "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("! Version:"):
                    # 提取并自增版本号
                    ver = line.strip().split(":")[1].strip()
                    parts = ver.split(".")
                    parts[-1] = str(int(parts[-1]) + 1)
                    return ".".join(parts)
        return default_ver
    except Exception:
        return default_ver

def generate_google_txt():
    """核心逻辑：生成最终的Google.txt"""
    # 1. 基础信息
    beijing_date = get_beijing_time()
    new_version = get_new_version()
    
    # 2. 读取远程临时文件
    with open("temp_filter.txt", "r", encoding="utf-8") as f:
        raw_content = f.read()
    
    # 3. 提取核心规则（跳过原头部）
    rule_lines = []
    extract = False
    for line in raw_content.split("\n"):
        if extract:
            rule_lines.append(line)
        if line.startswith("! Update Date:"):
            extract = True
    rule_content = "\n".join(rule_lines).strip()
    
    # 4. 拼接自定义头部
    final_content = f"""! Title: AdRules i叚娤.倖鍢 Google List
! Homepage: https://i叚娤.倖鍢.net.cn
! Powerd by i叚娤.倖鍢
! Expires: irregularly (update frequency)
! Description: Completely blocks all Google-related domains (including YouTube)
! ------------------------------------
! Version: {new_version}
! Update Date (Beijing Time):  {beijing_date}

{rule_content}"""
    
    # 5. 写入文件
    with open("Google.txt", "w", encoding="utf-8") as f:
        f.write(final_content)
    
    # 6. 输出供工作流读取的变量
    print(f"NEW_VERSION={new_version}")
    print(f"CURRENT_DATE={beijing_date}")

if __name__ == "__main__":
    try:
        generate_google_txt()
    except Exception as e:
        print(f"❌ 执行失败：{str(e)}")
        exit(1)
