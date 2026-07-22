#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
从上游规则生成 Seiga.txt（移除指定行，版本号跟随上游）
"""
import os
import hashlib
import sys
from datetime import datetime, timedelta

# 重定向输出到日志文件
sys.stdout = open("black_script_output.log", "w", encoding="utf-8")
sys.stderr = sys.stdout

def get_beijing_date():
    return (datetime.utcnow() + timedelta(hours=8)).strftime("%Y-%m-%d")

def get_upstream_info(temp_file):
    upstream_ver = "1.0.0.0"
    upstream_update_time = get_beijing_date()
    try:
        with open(temp_file, "r", encoding="utf-8") as f:
            for line in f:
                line_strip = line.strip()
                if line_strip.startswith("!Version:") or line_strip.startswith("! Version:"):
                    upstream_ver = line_strip.split(":", 1)[1].strip()
                elif line_strip.startswith("!Update time:"):
                    time_str = line_strip.split(":", 1)[1].strip()
                    upstream_update_time = time_str.split(" ")[0] if " " in time_str else get_beijing_date()
        return upstream_ver, upstream_update_time
    except Exception as e:
        print(f"⚠️ 读取上游信息失败：{e}，使用默认值")
        return upstream_ver, upstream_update_time

def extract_core_rules(temp_file):
    core_rules = []
    remove_prefixes = [
        "!Total lines:",
        "!Update content:",
        "!Homepage:",
        "!License:"
    ]
    try:
        with open(temp_file, "r", encoding="utf-8") as f:
            for line in f:
                line_strip = line.strip()
                if any(line_strip.startswith(prefix) for prefix in remove_prefixes):
                    continue
                if line_strip.startswith("!") and any(key in line_strip for key in ["Title", "Version", "Update time", "--------------------------------------"]):
                    continue
                if line_strip or (core_rules and core_rules[-1].strip()):
                    core_rules.append(line.rstrip("\n"))
        return "\n".join(core_rules).strip()
    except Exception as e:
        print(f"⚠️ 提取核心规则失败：{e}")
        return ""

def main():
    temp_file = os.path.join(os.getcwd(), "temp_black_filter.txt")
    output_file = os.path.join(os.getcwd(), "Seiga.txt")

    if not os.path.exists(temp_file) or os.path.getsize(temp_file) < 100:
        raise Exception(f"上游规则文件无效：{temp_file}")

    upstream_ver, upstream_update_time = get_upstream_info(temp_file)
    upstream_core = extract_core_rules(temp_file)
    if not upstream_core:
        raise Exception("提取上游核心规则失败，规则为空")

    upstream_md5 = hashlib.md5(upstream_core.encode("utf-8")).hexdigest()
    local_md5 = ""
    local_ver = upstream_ver

    if os.path.exists(output_file):
        with open(output_file, "r", encoding="utf-8") as f:
            lines = f.readlines()
            core_lines = []
            skip_header = True
            for line in lines:
                if skip_header:
                    if "------------------------------------" in line:
                        skip_header = False
                    continue
                core_lines.append(line.rstrip("\n"))
            local_core = "\n".join(core_lines).strip()
            local_md5 = hashlib.md5(local_core.encode("utf-8")).hexdigest()

        with open(output_file, "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("! Version:"):
                    local_ver = line.strip().split(":", 1)[1].strip()
                    break

    if local_md5 == upstream_md5 and os.path.exists(output_file):
        print(f"ℹ️ 上游规则无变更，复用本地版本：{local_ver}")
        print(f"NEW_VERSION={local_ver}")
        print(f"CURRENT_DATE={upstream_update_time}")
        sys.exit(0)

    custom_header = f"""! Title: AdRules  晴雅がく山道 Black List
! Homepage: https://i叚娤.倖鍢.net.cn
! Powerd by 長髯主簿 & Upstream Authors
! Signature: 素心若雪，淡意如云
! Expires: irregularly (update frequency)
! Description: 自抓规则，精准过滤！
! ------------------------------------
! Version: {upstream_ver}
! Update Date: {upstream_update_time}
"""

    final_content = custom_header + "\n" + upstream_core

    with open(output_file, "w", encoding="utf-8") as f:
        f.write(final_content)

    rule_count = len([l for l in final_content.split("\n") if l.strip() and not l.startswith("!")])
    print(f"NEW_VERSION={upstream_ver}")
    print(f"CURRENT_DATE={upstream_update_time}")
    print(f"✅ Seiga.txt 生成完成：版本 {upstream_ver}，有效规则 {rule_count} 条")
    print(f"✅ 已移除指定前缀行")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"❌ 脚本执行失败：{str(e)}")
        sys.exit(1)