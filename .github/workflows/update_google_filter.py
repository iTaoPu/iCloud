#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Google广告拦截规则生成脚本（保留完整广告规则，仅替换头部）
"""
import os
from datetime import datetime, timedelta

# 重定向输出到日志文件
import sys
sys.stdout = open("script_output.log", "w", encoding="utf-8")
sys.stderr = sys.stdout

def get_beijing_time():
    """获取北京时间（用于规则更新时间）"""
    return (datetime.utcnow() + timedelta(hours=8)).strftime("%Y-%m-%d %H:%M:%S")

def get_new_version():
    """自增版本号（基于现有Google.txt）"""
    default_ver = "1.0.0.0"
    google_file = os.path.join(os.getcwd(), "Google.txt")
    
    if not os.path.exists(google_file):
        return default_ver
    
    try:
        with open(google_file, "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("! Version:"):
                    ver = line.strip().split(":")[1].strip()
                    parts = ver.split(".")
                    # 广告规则版本：第四位自增（1.0.0.0 → 1.0.0.1）
                    parts[-1] = str(int(parts[-1]) + 1)
                    return ".".join(parts)
        return default_ver
    except Exception as e:
        print(f"⚠️ 读取版本号失败，使用默认版本：{e}")
        return default_ver

def main():
    """核心逻辑：保留完整广告规则，仅替换自定义头部"""
    # 1. 路径定义（根目录）
    temp_file = os.path.join(os.getcwd(), "temp_filter.txt")  # 原始广告规则
    google_file = os.path.join(os.getcwd(), "Google.txt")     # 最终生成的规则
    
    # 2. 验证原始规则文件
    if not os.path.exists(temp_file):
        raise Exception(f"原始广告规则文件不存在：{temp_file}")
    if os.path.getsize(temp_file) < 100:  # 规则文件至少100字节
        raise Exception(f"原始广告规则文件过小，可能损坏：{temp_file}")
    
    # 3. 读取原始广告规则（完整保留）
    with open(temp_file, "r", encoding="utf-8") as f:
        raw_rules = f.read()
    
    # 4. 构建自定义头部（适配广告规则格式）
    beijing_time = get_beijing_time()
    new_version = get_new_version()
    custom_header = f"""! Title: AdRules i叚娤.倖鍢 Google 广告拦截规则
! Homepage: https://i叚娤.倖鍢.net.cn
! Powerd by i叚娤.倖鍢
! Expires: 1 day
! Description: 完整拦截Google/YouTube相关广告、跟踪域名
! Version: {new_version}
! Update Time (Beijing Time):  {beijing_time}
! Source: https://github.com/AdguardTeam/HostlistsRegistry
! ------------------------------------

"""
    
    # 5. 合并头部+原始规则（关键：保留所有广告规则）
    # 过滤原始规则中的重复头部，只保留核心规则
    core_rules = []
    skip_original_header = True
    for line in raw_rules.split("\n"):
        # 跳过原始规则的头部注释（保留所有以!#@开头的规则行）
        if skip_original_header and line.startswith("!") and not line.startswith(("!#", "!@")):
            continue
        if line.strip() == "":  # 遇到空行，结束头部跳过
            skip_original_header = False
            core_rules.append(line)
            continue
        core_rules.append(line)
    
    final_content = custom_header + "\n".join(core_rules).strip()
    
    # 6. 写入最终规则文件（确保编码正确）
    with open(google_file, "w", encoding="utf-8") as f:
        f.write(final_content)
    
    # 7. 输出关键信息（供YAML读取）
    rule_count = len([l for l in final_content.split("\n") if l.strip() and not l.startswith("!")])
    print(f"NEW_VERSION={new_version}")
    print(f"CURRENT_DATE={beijing_time.split(' ')[0]}")
    print(f"✅ 广告规则处理完成：共 {rule_count} 条有效拦截规则")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"❌ 脚本执行失败：{str(e)}")
        sys.exit(1)
