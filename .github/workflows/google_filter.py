#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
独立处理 Google.txt 的核心脚本：
1. 读取远程下载的 temp_filter.txt 文件
2. 替换自定义头部信息
3. 自增版本号
4. 更新北京时间/上海时间
5. 生成最终的 Google.txt
"""
import os
import re
from datetime import datetime, timedelta

# -------------------------- 配置项（可自行修改） --------------------------
# 自定义头部信息
CUSTOM_HEADER = {
    "title": "! Title: AdRules i叚娤.倖鍢 Google List",
    "homepage": "! Homepage: https://i叚娤.倖鍢.net.cn",
    "powerd": "! Powerd by i叚娤.倖鍢",
    "expires": "! Expires: irregularly (update frequency)",
    "description": "! Description: Completely blocks all Google-related domains (including YouTube)",
    "split_line": "! ------------------------------------"
}
# 时间格式（可改为 '%Y-%m-%d %H:%M:%S' 带时分秒）
DATE_FORMAT = "%Y-%m-%d"
# -------------------------------------------------------------------------

def get_beijing_time():
    """获取当前北京时间（UTC+8）"""
    # 计算北京时间（UTC时间 + 8小时）
    beijing_tz = timedelta(hours=8)
    beijing_time = datetime.utcnow() + beijing_tz
    return beijing_time.strftime(DATE_FORMAT)

def increment_version(current_version: str) -> str:
    """版本号自增（最后一位数字+1）"""
    try:
        # 拆分版本号（如 1.0.14.62 → [1,0,14,62]）
        version_parts = list(map(int, current_version.split(".")))
        # 最后一位自增
        version_parts[-1] += 1
        # 重新拼接
        return ".".join(map(str, version_parts))
    except (ValueError, IndexError):
        # 解析失败时返回初始版本
        return "1.0.0.0"

def get_existing_version():
    """从已存在的 Google.txt 中读取版本号"""
    if not os.path.exists("Google.txt"):
        return "1.0.0.0"  # 无文件时返回初始版本
    
    with open("Google.txt", "r", encoding="utf-8") as f:
        content = f.read()
    # 匹配 ! Version: x.x.x.x 格式
    version_match = re.search(r"! Version: (\d+\.\d+\.\d+\.\d+)", content)
    if version_match:
        return version_match.group(1)
    else:
        return "1.0.0.0"

def process_filter_file():
    """处理过滤文件，生成最终的 Google.txt"""
    # 1. 获取基础信息
    beijing_date = get_beijing_time()
    old_version = get_existing_version()
    new_version = increment_version(old_version)
    
    # 2. 读取远程下载的临时文件
    if not os.path.exists("temp_filter.txt"):
        raise FileNotFoundError("临时文件 temp_filter.txt 不存在，请先下载远程文件")
    
    with open("temp_filter.txt", "r", encoding="utf-8") as f:
        raw_content = f.read()
    
    # 3. 提取原始文件的规则内容（去掉原有头部，保留核心规则）
    # 匹配从 ! Version: 开始到 ! Update Date: 结束的头部，只保留之后的内容
    rule_content = re.sub(
        r"^.*?(! Version: .*?\n! Update Date: .*?\n)", "", 
        raw_content, 
        flags=re.DOTALL | re.MULTILINE
    ).strip()
    
    # 4. 拼接新的头部 + 核心规则
    new_content = f"""
{CUSTOM_HEADER["title"]}
{CUSTOM_HEADER["homepage"]}
{CUSTOM_HEADER["powerd"]}
{CUSTOM_HEADER["expires"]}
{CUSTOM_HEADER["description"]}
{CUSTOM_HEADER["split_line"]}
! Version: {new_version}
! Update Date (Beijing Time):  {beijing_date}

{rule_content}
""".strip() + "\n"  # 保证文件末尾有换行
    
    # 5. 写入最终的 Google.txt
    with open("Google.txt", "w", encoding="utf-8") as f:
        f.write(new_content)
    
    print(f"✅ Google.txt 生成完成")
    print(f"   版本号：{new_version}（原版本：{old_version}）")
    print(f"   更新时间：{beijing_date}（北京时间）")
    return new_version, beijing_date

if __name__ == "__main__":
    try:
        process_filter_file()
    except Exception as e:
        print(f"❌ 处理文件失败：{str(e)}")
        exit(1)
