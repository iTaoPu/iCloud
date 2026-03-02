#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Google广告拦截规则生成脚本（版本号跟随上游文件）
"""
import os
import hashlib
from datetime import datetime, timedelta

# 重定向输出到日志文件
import sys
sys.stdout = open("script_output.log", "w", encoding="utf-8")
sys.stderr = sys.stdout

def get_beijing_time():
    """获取北京时间（用于规则更新时间）"""
    return (datetime.utcnow() + timedelta(hours=8)).strftime("%Y-%m-%d %H:%M:%S")

def get_upstream_version(temp_file):
    """从上游filter_37.txt中提取原生版本号"""
    default_ver = "1.0.0.0"
    try:
        with open(temp_file, "r", encoding="utf-8") as f:
            for line in f:
                # 匹配上游版本号格式（! Version: x.x.x.x 或 ! Version:x.x.x.x）
                if line.strip().lower().startswith("! version:"):
                    ver = line.strip().split(":", 1)[1].strip()
                    if ver and len(ver.split(".")) >= 2:  # 至少是x.x格式
                        return ver
        return default_ver
    except Exception as e:
        print(f"⚠️ 读取上游版本号失败：{e}，使用默认版本")
        return default_ver

def get_file_md5(file_path):
    """计算文件MD5值（判断内容是否变更）"""
    if not os.path.exists(file_path):
        return ""
    try:
        with open(file_path, "rb") as f:
            md5_obj = hashlib.md5()
            md5_obj.update(f.read())
            return md5_obj.hexdigest()
    except Exception:
        return ""

def get_local_version(google_file):
    """读取本地Google.txt的版本号"""
    if not os.path.exists(google_file):
        return "1.0.0.0"
    try:
        with open(google_file, "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("! Version:"):
                    return line.strip().split(":", 1)[1].strip()
        return "1.0.0.0"
    except Exception:
        return "1.0.0.0"

def main():
    """核心逻辑：版本号跟随上游，无变更则不更新"""
    # 1. 路径定义（根目录）
    temp_file = os.path.join(os.getcwd(), "temp_filter.txt")  # 上游规则
    google_file = os.path.join(os.getcwd(), "Google.txt")     # 本地规则
    
    # 2. 验证上游规则文件
    if not os.path.exists(temp_file) or os.path.getsize(temp_file) < 100:
        raise Exception(f"上游广告规则文件无效：{temp_file}")
    
    # 3. 核心：获取版本号（优先上游，无则本地，均无则默认）
    upstream_ver = get_upstream_version(temp_file)
    local_ver = get_local_version(google_file)
    # 最终版本号：上游有则用上游，无则用本地
    new_version = upstream_ver if upstream_ver != "1.0.0.0" else local_ver
    
    # 4. 判断内容是否变更（避免无意义更新）
    upstream_md5 = get_file_md5(temp_file)
    # 提取本地规则的核心内容（排除自定义头部）
    local_core_md5 = ""
    if os.path.exists(google_file):
        with open(google_file, "r", encoding="utf-8") as f:
            lines = f.read().split("\n")
            # 跳过自定义头部，只取核心规则
            core_lines = []
            skip_header = True
            for line in lines:
                if skip_header and line.startswith("! ------------------------------------"):
                    skip_header = False
                    continue
                if not skip_header:
                    core_lines.append(line)
            local_core_content = "\n".join(core_lines).strip()
            local_core_md5 = hashlib.md5(local_core_content.encode("utf-8")).hexdigest()
    
    # 5. 读取上游核心规则（跳过原始头部）
    with open(temp_file, "r", encoding="utf-8") as f:
        raw_rules = f.read()
    core_rules = []
    skip_original_header = True
    for line in raw_rules.split("\n"):
        # 跳过原始规则的注释头部，保留核心拦截规则
        if skip_original_header and line.startswith("!") and not line.startswith(("!#", "!@")):
            continue
        if line.strip() == "":
            skip_original_header = False
            core_rules.append(line)
            continue
        core_rules.append(line)
    upstream_core_content = "\n".join(core_rules).strip()
    upstream_core_md5 = hashlib.md5(upstream_core_content.encode("utf-8")).hexdigest()
    
    # 6. 内容无变更则直接复用本地文件，终止脚本
    if local_core_md5 == upstream_core_md5 and os.path.exists(google_file):
        print(f"ℹ️  上游规则内容无变更，复用本地版本：{local_ver}")
        print(f"NEW_VERSION={local_ver}")
        print(f"CURRENT_DATE={get_beijing_time().split(' ')[0]}")
        sys.exit(0)  # 无变更，正常退出
    
    # 7. 内容有变更，生成新文件（版本号跟随上游）
    beijing_time = get_beijing_time()
    custom_header = f"""! Title: AdRules i叚娤.倖鍢 Google 广告拦截规则
! Homepage: https://i叚娤.倖鍢.net.cn
! Powerd by i叚娤.倖鍢
! Expires: 3 day
! Description: 完整拦截Google/YouTube相关广告、跟踪域名
! Version: {new_version}
! Update Time:  {beijing_time}
! Upstream Version: {upstream_ver}
! ------------------------------------

"""
    final_content = custom_header + upstream_core_content
    
    # 8. 写入最终规则文件
    with open(google_file, "w", encoding="utf-8") as f:
        f.write(final_content)
    
    # 9. 输出关键信息
    rule_count = len([l for l in final_content.split("\n") if l.strip() and not l.startswith("!")])
    print(f"NEW_VERSION={new_version}")
    print(f"CURRENT_DATE={beijing_time.split(' ')[0]}")
    print(f"✅ 广告规则更新完成：版本 {new_version}，有效规则 {rule_count} 条")
    print(f"✅ 上游版本：{upstream_ver}，本地版本同步更新")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"❌ 脚本执行失败：{str(e)}")
        sys.exit(1)
