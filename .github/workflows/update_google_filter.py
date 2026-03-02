#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
独立脚本：处理Google.txt生成逻辑
存放路径：.github/workflows/update_google_filter.py
"""
import os
from datetime import datetime, timedelta

def get_beijing_time():
    """获取北京时间（UTC+8），返回YYYY-MM-DD格式"""
    return (datetime.utcnow() + timedelta(hours=8)).strftime("%Y-%m-%d")

def increment_version():
    """从现有Google.txt读取版本号并自增最后一位，无文件则返回初始版本"""
    default_version = "1.0.0.0"
    if not os.path.exists("Google.txt"):
        return default_version
    
    try:
        with open("Google.txt", "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("! Version:"):
                    # 提取版本号并自增最后一位
                    version = line.strip().split(":")[1].strip()
                    parts = version.split(".")
                    parts[-1] = str(int(parts[-1]) + 1)
                    return ".".join(parts)
        return default_version
    except Exception:
        return default_version

def process_filter_file():
    """核心逻辑：读取temp_filter.txt，生成Google.txt"""
    # 1. 基础信息
    beijing_date = get_beijing_time()
    new_version = increment_version()
    
    # 2. 读取远程临时文件（必须存在，工作流已验证）
    with open("temp_filter.txt", "r", encoding="utf-8") as f:
        raw_content = f.read()
    
    # 3. 提取核心规则（跳过原头部）
    rule_content = ""
    lines = raw_content.split("\n")
    start_extract = False
    for line in lines:
        if start_extract:
            rule_content += line + "\n"
        # 找到原Update Date后开始提取规则
        if line.startswith("! Update Date:"):
            start_extract = True
    
    # 4. 拼接自定义头部
    custom_header = f"""! Title: AdRules i叚娤.倖鍢 Google List
! Homepage: https://i叚娤.倖鍢.net.cn
! Powerd by i叚娤.倖鍢
! Expires: irregularly (update frequency)
! Description: Completely blocks all Google-related domains (including YouTube)
! ------------------------------------
! Version: {new_version}
! Update Date (Beijing Time):  {beijing_date}

{rule_content.strip()}"""
    
    # 5. 写入最终文件
    with open("Google.txt", "w", encoding="utf-8") as f:
        f.write(custom_header)
    
    # 6. 输出环境变量格式的内容（供工作流读取）
    print(f"NEW_VERSION={new_version}")
    print(f"CURRENT_DATE={beijing_date}")
    print("✅ 脚本执行成功，Google.txt生成完成")

if __name__ == "__main__":
    try:
        process_filter_file()
    except Exception as e:
        print(f"❌ 脚本执行失败：{str(e)}")
        exit(1)  # 失败则返回非0，工作流会终止
