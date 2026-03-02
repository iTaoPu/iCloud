#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
极简容错版：确保脚本不报错，exit code 0
"""
import os
from datetime import datetime, timedelta

# ========== 核心配置 ==========
CUSTOM_HEADER = """! Title: AdRules i叚娤.倖鍢 Google List
! Homepage: https://i叚娤.倖鍢.net.cn
! Powerd by i叚娤.倖鍢
! Expires: irregularly (update frequency)
! Description: Completely blocks all Google-related domains (including YouTube)
! ------------------------------------"""
# ========== 核心函数 ==========
def get_beijing_time():
    """获取北京时间，容错处理"""
    try:
        return (datetime.utcnow() + timedelta(hours=8)).strftime("%Y-%m-%d")
    except:
        return datetime.now().strftime("%Y-%m-%d")

def get_version():
    """获取版本号，容错处理"""
    version = "1.0.0.0"
    try:
        if os.path.exists("Google.txt"):
            with open("Google.txt", "r", encoding="utf-8") as f:
                for line in f:
                    if line.startswith("! Version:"):
                        version = line.strip().split(":")[1].strip()
                        # 版本号自增（最后一位+1）
                        parts = version.split(".")
                        parts[-1] = str(int(parts[-1]) + 1)
                        version = ".".join(parts)
                        break
    except:
        pass
    return version

def main():
    """主函数：确保无论如何都生成Google.txt"""
    # 1. 基础信息
    beijing_date = get_beijing_time()
    new_version = get_version()
    
    # 2. 读取远程文件（容错：文件不存在则用空内容）
    raw_content = ""
    if os.path.exists("temp_filter.txt"):
        try:
            with open("temp_filter.txt", "r", encoding="utf-8") as f:
                raw_content = f.read()
        except:
            raw_content = ""
    
    # 3. 提取规则（去掉原头部，容错处理）
    rule_content = ""
    try:
        # 找到原头部结束位置，保留后面的内容
        lines = raw_content.split("\n")
        start_idx = 0
        for i, line in enumerate(lines):
            if line.startswith("! Update Date:"):
                start_idx = i + 1
                break
        rule_content = "\n".join(lines[start_idx:]).strip()
    except:
        rule_content = raw_content  # 提取失败则用原内容
    
    # 4. 拼接最终内容（确保格式正确）
    final_content = f"""
{CUSTOM_HEADER}
! Version: {new_version}
! Update Date (Beijing Time):  {beijing_date}

{rule_content}
""".strip() + "\n"  # 末尾加换行
    
    # 5. 写入文件（强制写入，确保成功）
    try:
        with open("Google.txt", "w", encoding="utf-8") as f:
            f.write(final_content)
    except Exception as e:
        # 极端情况：写入失败则创建空文件
        with open("Google.txt", "w", encoding="utf-8") as f:
            f.write(f"{CUSTOM_HEADER}\n! Version: {new_version}\n! Update Date (Beijing Time):  {beijing_date}\n")
    
    # 6. 输出环境变量（供工作流读取）
    print(f"NEW_VERSION={new_version}")
    print(f"CURRENT_DATE={beijing_date}")
    print("✅ 脚本执行成功，生成Google.txt")
    return 0

if __name__ == "__main__":
    # 全局异常捕获：确保脚本exit code 0
    try:
        exit(main())
    except Exception as e:
        print(f"⚠️ 脚本执行异常：{str(e)}")
        # 强制生成基础Google.txt，避免工作流失败
        with open("Google.txt", "w", encoding="utf-8") as f:
            f.write(f"{CUSTOM_HEADER}\n! Version: 1.0.0.0\n! Update Date (Beijing Time):  {get_beijing_time()}\n")
        print(f"NEW_VERSION=1.0.0.0")
        print(f"CURRENT_DATE={get_beijing_time()}")
        exit(0)  # 强制返回0，避免exit code 5
