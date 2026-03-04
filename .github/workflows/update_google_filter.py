#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Google广告拦截规则生成脚本（版本号跟随上游文件）
"""
import os
import hashlib
import sys
from datetime import datetime, timedelta

# 重定向输出到日志文件
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
                line_lower = line.strip().lower()
                if line_lower.startswith("! version:"):
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

def extract_core_rules(temp_file):
    """提取上游核心规则（跳过原始头部）"""
    core_rules = []
    try:
        with open(temp_file, "r", encoding="utf-8") as f:
            skip_header = True
            in_rules_section = False
            
            for line in f:
                stripped_line = line.rstrip("\n")
                
                # 检测规则部分开始（空行或特定分隔符后）
                if skip_header and (not stripped_line.strip() or stripped_line.startswith("#")):
                    if not stripped_line.strip():  # 空行标记头部结束
                        skip_header = False
                    continue
                
                # 跳过原始头部注释
                if skip_header and stripped_line.startswith("!"):
                    continue
                
                # 头部结束，开始收集规则
                if skip_header and stripped_line:
                    skip_header = False
                
                # 收集规则（非空行或有效的规则行）
                if not skip_header:
                    # 跳过无效的注释行
                    if stripped_line.strip().startswith(("!#", "!@")):
                        continue
                    core_rules.append(stripped_line)
        
        # 去除首尾空行
        while core_rules and not core_rules[0].strip():
            core_rules.pop(0)
        while core_rules and not core_rules[-1].strip():
            core_rules.pop(-1)
            
        return "\n".join(core_rules)
    except Exception as e:
        print(f"⚠️ 提取核心规则失败：{e}")
        return ""

def main():
    """核心逻辑：版本号跟随上游，无变更则不更新"""
    # 1. 路径定义（根目录）
    temp_file = os.path.join(os.getcwd(), "temp_filter.txt")  # 上游规则
    google_file = os.path.join(os.getcwd(), "Google.txt")     # 本地规则
    
    # 2. 验证上游规则文件
    if not os.path.exists(temp_file):
        raise Exception(f"上游广告规则文件不存在：{temp_file}")
    
    file_size = os.path.getsize(temp_file)
    if file_size < 10:
        raise Exception(f"上游广告规则文件过小：{file_size}字节")
    
    print(f"✅ 上游文件验证通过：{file_size}字节")
    
    # 3. 获取版本号
    upstream_ver = get_upstream_version(temp_file)
    local_ver = get_local_version(google_file)
    new_version = upstream_ver if upstream_ver != "1.0.0.0" else local_ver
    
    print(f"版本信息 - 上游: {upstream_ver}, 本地: {local_ver}, 最终: {new_version}")
    
    # 4. 提取上游核心规则
    upstream_core_content = extract_core_rules(temp_file)
    if not upstream_core_content.strip():
        raise Exception("提取的上游核心规则为空")
    
    upstream_core_md5 = hashlib.md5(upstream_core_content.encode("utf-8")).hexdigest()
    
    # 5. 检查本地文件是否存在
    local_core_md5 = ""
    if os.path.exists(google_file):
        print("检测到本地Google.txt，进行比对...")
        try:
            with open(google_file, "r", encoding="utf-8") as f:
                content = f.read()
                # 跳过自定义头部（到分隔符为止）
                lines = content.split("\n")
                core_start = 0
                for i, line in enumerate(lines):
                    if line.strip().startswith("! ------------------------------------"):
                        core_start = i + 1
                        break
                
                local_core_content = "\n".join(lines[core_start:]).strip()
                local_core_md5 = hashlib.md5(local_core_content.encode("utf-8")).hexdigest()
                
                print(f"本地核心规则MD5: {local_core_md5}")
                print(f"上游核心规则MD5: {upstream_core_md5}")
        except Exception as e:
            print(f"读取本地文件失败：{e}")
            local_core_md5 = ""  # 设为空，强制更新
    
    # 6. 内容无变更则复用本地文件
    if local_core_md5 and local_core_md5 == upstream_core_md5:
        print(f"ℹ️ 上游规则内容无变更，复用本地版本：{local_ver}")
        print(f"NEW_VERSION={local_ver}")
        print(f"CURRENT_DATE={get_beijing_time().split(' ')[0]}")
        sys.exit(0)  # 无变更，正常退出
    
    # 7. 内容有变更，生成新文件
    beijing_time = get_beijing_time()
    custom_header = f"""! Title: AdRules 隱耀がく山道 Google List
! Homepage: https://i叚娤.倖鍢.net.cn
! Powerd by i叚娤.倖鍢 & Upstream Authors
! Expires: irregularly (update frequency)
! Description: Completely blocks all Google-related domains (including YouTube).
! ------------------------------------
! Version: {new_version}
! Update Time: {beijing_time}

"""
    
    final_content = custom_header + upstream_core_content.strip()
    
    # 8. 写入最终规则文件
    with open(google_file, "w", encoding="utf-8") as f:
        f.write(final_content)
    
    # 9. 验证写入
    if not os.path.exists(google_file) or os.path.getsize(google_file) < 100:
        raise Exception("生成的Google.txt文件无效")
    
    # 10. 输出关键信息
    rule_lines = [l for l in final_content.split("\n") if l.strip() and not l.startswith("!")]
    rule_count = len(rule_lines)
    
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
