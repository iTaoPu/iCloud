#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os
from datetime import datetime, timedelta

def get_beijing_time() -> str:
    """获取北京时间"""
    return (datetime.utcnow() + timedelta(hours=8)).strftime("%Y-%m-%d")

def get_new_version() -> str:
    """自增版本号"""
    default_ver = "1.0.0.0"
    google_path = os.path.join(os.getenv("ROOT_DIR", "."), "Google.txt")
    if not os.path.exists(google_path):
        return default_ver
    
    try:
        with open(google_path, "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("! Version:"):
                    ver = line.strip().split(":")[1].strip()
                    parts = ver.split(".")
                    parts[-1] = str(int(parts[-1]) + 1)
                    return ".".join(parts)
        return default_ver
    except Exception:
        return default_ver

def generate_google_txt():
    """核心逻辑：读取temp_filter.txt，生成Google.txt"""
    # 修复：从环境变量获取绝对路径（关键！）
    temp_path = os.getenv("TEMP_FILTER_PATH", "temp_filter.txt")
    root_dir = os.getenv("ROOT_DIR", ".")
    google_path = os.path.join(root_dir, "Google.txt")
    
    # 1. 验证临时文件（打印路径，便于调试）
    print(f"📝 Python脚本调试：")
    print(f"   临时文件路径：{temp_path}")
    print(f"   文件是否存在：{os.path.exists(temp_path)}")
    print(f"   文件大小：{os.path.getsize(temp_path) if os.path.exists(temp_path) else 0} bytes")
    
    if not os.path.exists(temp_path) or os.path.getsize(temp_path) == 0:
        raise Exception(f"临时文件不存在或为空：{temp_path}")
    
    # 2. 读取临时文件（绝对路径）
    with open(temp_path, "r", encoding="utf-8") as f:
        raw_content = f.read()
    
    # 3. 提取规则（逻辑不变）
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
    
    # 5. 写入Google.txt（绝对路径）
    with open(google_path, "w", encoding="utf-8") as f:
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
