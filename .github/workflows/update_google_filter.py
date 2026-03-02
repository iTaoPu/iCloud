#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Google过滤规则生成脚本（放置在.github/workflows目录）
"""
import os
from datetime import datetime, timedelta

# 重定向输出到日志文件（便于YAML提取版本号）
import sys
sys.stdout = open("script_output.log", "w", encoding="utf-8")
sys.stderr = sys.stdout

def get_beijing_time():
    """获取北京时间"""
    return (datetime.utcnow() + timedelta(hours=8)).strftime("%Y-%m-%d")

def get_new_version():
    """自增版本号（读取根目录的Google.txt）"""
    default_ver = "1.0.0.0"
    google_file = os.path.join(os.getcwd(), "Google.txt")  # 根目录的Google.txt
    
    if not os.path.exists(google_file):
        return default_ver
    
    try:
        with open(google_file, "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("! Version:"):
                    ver = line.strip().split(":")[1].strip()
                    parts = ver.split(".")
                    parts[-1] = str(int(parts[-1]) + 1)
                    return ".".join(parts)
        return default_ver
    except Exception:
        return default_ver

def main():
    """主函数：读取temp_filter.txt（根目录），生成Google.txt"""
    # 1. 基础路径（根目录的临时文件）
    temp_file = os.path.join(os.getcwd(), "temp_filter.txt")
    google_file = os.path.join(os.getcwd(), "Google.txt")
    
    # 2. 读取临时文件
    if not os.path.exists(temp_file) or os.path.getsize(temp_file) == 0:
        raise Exception(f"临时文件为空：{temp_file}")
    
    with open(temp_file, "r", encoding="utf-8") as f:
        raw_content = f.read()
    
    # 3. 提取核心规则
    rule_lines = []
    extract = False
    for line in raw_content.split("\n"):
        if extract:
            rule_lines.append(line)
        if line.startswith("! Update Date:"):
            extract = True
    rule_content = "\n".join(rule_lines).strip()
    
    # 4. 生成最终内容
    beijing_date = get_beijing_time()
    new_version = get_new_version()
    final_content = f"""! Title: AdRules i叚娤.倖鍢 Google List
! Homepage: https://i叚娤.倖鍢.net.cn
! Powerd by i叚娤.倖鍢
! Expires: irregularly (update frequency)
! Description: Completely blocks all Google-related domains (including YouTube)
! ------------------------------------
! Version: {new_version}
! Update Date (Beijing Time):  {beijing_date}

{rule_content}"""
    
    # 5. 写入根目录的Google.txt
    with open(google_file, "w", encoding="utf-8") as f:
        f.write(final_content)
    
    # 6. 输出版本号（供YAML读取）
    print(f"NEW_VERSION={new_version}")
    print(f"CURRENT_DATE={beijing_date}")
    print("✅ 脚本执行成功")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"❌ 脚本执行失败：{str(e)}")
        sys.exit(1)
