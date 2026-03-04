#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AWAvenue广告规则生成black.txt脚本（移除指定行，版本号跟随上游）
"""
import os
import hashlib
import sys
from datetime import datetime, timedelta

# 重定向输出到日志文件
sys.stdout = open("black_script_output.log", "w", encoding="utf-8")
sys.stderr = sys.stdout

def get_beijing_date():
    """获取北京时间（仅日期，格式：YYYY-MM-DD）"""
    return (datetime.utcnow() + timedelta(hours=8)).strftime("%Y-%m-%d")

def get_upstream_info(temp_file):
    """从上游文件提取版本号和更新时间"""
    upstream_ver = "1.0.0.0"
    upstream_update_time = get_beijing_date()
    
    try:
        with open(temp_file, "r", encoding="utf-8") as f:
            lines = f.readlines()
            for line in lines:
                line_strip = line.strip()
                # 提取版本号
                if line_strip.startswith("!Version:") or line_strip.startswith("! Version:"):
                    upstream_ver = line_strip.split(":", 1)[1].strip()
                # 提取更新时间
                elif line_strip.startswith("!Update time:"):
                    time_str = line_strip.split(":", 1)[1].strip()
                    upstream_update_time = time_str.split(" ")[0] if " " in time_str else get_beijing_date()
        return upstream_ver, upstream_update_time
    except Exception as e:
        print(f"⚠️ 读取上游信息失败：{e}，使用默认值")
        return upstream_ver, upstream_update_time

def extract_core_rules(temp_file):
    """提取上游核心规则（移除指定行+跳过原始头部）"""
    core_rules = []
    # 定义需要移除的行的开头关键词（无论后面有什么内容都移除）
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
                # 1. 移除所有以指定前缀开头的行（核心修改）
                if any(line_strip.startswith(prefix) for prefix in remove_prefixes):
                    continue
                # 2. 跳过原始头部的其他注释行（保留规则行）
                if line_strip.startswith("!") and any(key in line_strip for key in ["Title", "Version", "Update time", "--------------------------------------"]):
                    continue
                # 3. 保留核心规则行（去重空行，避免多余换行）
                if line_strip or (core_rules and core_rules[-1].strip()):
                    core_rules.append(line.rstrip("\n"))
        # 合并并去除首尾空行
        core_content = "\n".join(core_rules).strip()
        return core_content
    except Exception as e:
        print(f"⚠️ 提取核心规则失败：{e}")
        return ""

def main():
    """核心逻辑：生成black.txt，移除指定行，替换自定义头部"""
    # 1. 路径定义
    temp_file = os.path.join(os.getcwd(), "temp_black_filter.txt")
    black_file = os.path.join(os.getcwd(), "black.txt")
    
    # 2. 验证上游文件
    if not os.path.exists(temp_file) or os.path.getsize(temp_file) < 100:
        raise Exception(f"上游AWAvenue规则文件无效：{temp_file}")
    
    # 3. 提取上游版本和更新时间
    upstream_ver, upstream_update_time = get_upstream_info(temp_file)
    
    # 4. 提取核心规则（已移除指定行）
    upstream_core_rules = extract_core_rules(temp_file)
    if not upstream_core_rules:
        raise Exception("提取上游核心规则失败，规则为空")
    
    # 5. 判断内容是否变更
    upstream_core_md5 = hashlib.md5(upstream_core_rules.encode("utf-8")).hexdigest()
    local_core_md5 = ""
    local_ver = upstream_ver
    
    if os.path.exists(black_file):
        # 提取本地核心规则MD5
        with open(black_file, "r", encoding="utf-8") as f:
            lines = f.readlines()
            core_lines = []
            skip_header = True
            for line in lines:
                if skip_header:
                    if "------------------------------------" in line:
                        skip_header = False
                    continue
                core_lines.append(line.rstrip("\n"))
            local_core_content = "\n".join(core_lines).strip()
            local_core_md5 = hashlib.md5(local_core_content.encode("utf-8")).hexdigest()
        
        # 提取本地版本号
        with open(black_file, "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("! Version:"):
                    local_ver = line.strip().split(":", 1)[1].strip()
                    break
    
    # 6. 无变更则复用本地文件
    if local_core_md5 == upstream_core_md5 and os.path.exists(black_file):
        print(f"ℹ️ 上游规则无变更，复用本地版本：{local_ver}")
        print(f"NEW_VERSION={local_ver}")
        print(f"CURRENT_DATE={upstream_update_time}")
        sys.exit(0)
    
    # 7. 构建自定义头部
    custom_header = f"""! Title: AdRules 秋風がく山道 Black List
! Homepage: https://i叚娤.倖鍢.net.cn
! Powerd by 長髯主簿 & Upstream Authors
! Signature: 云栖翠篁, 心绝尘氛
! Expires: irregularly (update frequency)
! Description: 极致的体积控制，超高的命中率，极低的硬件要求！
! ------------------------------------
! Version: {upstream_ver}
! Update Date: {upstream_update_time}
"""
    
    # 8. 合并头部+核心规则
    final_content = custom_header + "\n" + upstream_core_rules
    
    # 9. 写入最终文件
    with open(black_file, "w", encoding="utf-8") as f:
        f.write(final_content)
    
    # 10. 输出关键信息
    rule_count = len([l for l in final_content.split("\n") if l.strip() and not l.startswith("!")])
    print(f"NEW_VERSION={upstream_ver}")
    print(f"CURRENT_DATE={upstream_update_time}")
    print(f"✅ black.txt生成完成：版本 {upstream_ver}，有效规则 {rule_count} 条")
    print(f"✅ 已移除所有以以下前缀开头的行：Total lines:/Update content:/Homepage:/License:")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"❌ 脚本执行失败：{str(e)}")
        sys.exit(1)
