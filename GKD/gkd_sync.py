#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GKD 订阅同步脚本（存放于GKD目录）
功能：自动检查上游版本并更新本地订阅文件
- 主文件(Guīzé.stor)：自定义格式的无引号JSON5
- 版本文件(Guīzé.version.stor)：{id:2015,version:版本号} 格式
"""

import json5
import requests
import re
import os
import sys

# ===================== 配置区域 =====================
UPSTREAM_VERSION_URL = "https://raw.githubusercontent.com/Lin-arm/GKD_subscription/main/dist/gkd.version.json5"
UPSTREAM_SUB_URL = "https://raw.githubusercontent.com/Lin-arm/GKD_subscription/main/dist/gkd.json5"

# 本地文件路径（当前目录，即GKD目录）
LOCAL_VERSION_FILE = "Guīzé.version.stor"
LOCAL_SUB_FILE = "Guīzé.stor"

# 超时配置
TIMEOUT_VERSION = 10
TIMEOUT_SUBSCRIPTION = 30

# 更新标记文件（GKD目录内）
UPDATE_FLAG_FILE = ".update_success"
# ====================================================

def get_upstream_version():
    """获取上游最新版本号"""
    try:
        print(f"📡 正在获取上游版本信息: {UPSTREAM_VERSION_URL}")
        resp = requests.get(UPSTREAM_VERSION_URL, timeout=TIMEOUT_VERSION)
        resp.raise_for_status()
        data = json5.loads(resp.text)
        upstream_version = int(data.get("version", 0))
        print(f"✅ 上游最新版本: {upstream_version}")
        return upstream_version
        
    except requests.exceptions.Timeout:
        print(f"❌ 超时：获取上游版本信息超时（{TIMEOUT_VERSION}秒）")
        sys.exit(1)
    except requests.exceptions.RequestException as e:
        print(f"❌ 网络错误：获取上游版本失败 - {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ 解析错误：解析版本信息失败 - {e}")
        sys.exit(1)

def get_local_version():
    """读取本地版本号"""
    try:
        if os.path.exists(LOCAL_VERSION_FILE):
            print(f"📂 正在读取本地版本文件: {LOCAL_VERSION_FILE}")
            with open(LOCAL_VERSION_FILE, "r", encoding="utf-8") as f:
                content = f.read()
            
            # 匹配 version: 数字 的格式
            pattern = r"version\s*:\s*(\d+)"
            match = re.search(pattern, content)
            if match:
                local_version = int(match.group(1))
                print(f"✅ 本地当前版本: {local_version}")
                return local_version
            
            # 尝试JSON5解析
            try:
                data = json5.loads(content)
                local_version = int(data.get("version", 0))
                print(f"✅ 本地当前版本: {local_version}")
                return local_version
            except:
                pass
            
            print(f"⚠️  无法解析版本信息，默认版本号：0")
            return 0
        else:
            print(f"ℹ️  本地版本文件不存在，默认版本号：0")
            return 0
    except Exception as e:
        print(f"⚠️  读取本地版本失败（{e}），默认版本号：0")
        return 0

def format_json5_value(value, indent=0):
    """格式化JSON5值，keys无引号，字符串用单引号"""
    
    if isinstance(value, bool):
        return "true" if value else "false"
    
    elif isinstance(value, (int, float)):
        return str(value)
    
    elif isinstance(value, str):
        # 字符串用单引号包裹，处理转义
        escaped = value.replace("\\", "\\\\").replace("'", "\\'")
        return f"'{escaped}'"
    
    elif isinstance(value, list):
        if not value:
            return "[]"
        
        # 格式化数组
        items = []
        is_simple_array = True
        
        # 检查是否包含复杂对象
        for item in value:
            if isinstance(item, (dict, list)):
                is_simple_array = False
                break
        
        if is_simple_array:
            # 简单数组：一行显示
            items = [format_json5_value(item) for item in value]
            return f"[{', '.join(items)}]"
        else:
            # 复杂数组：多行显示
            indent_str = "  " * indent
            inner_items = []
            for item in value:
                inner = format_json5_value(item, indent + 1)
                inner_items.append(f"  {inner}")
            return f"[\n{',\n'.join(inner_items)}\n{indent_str}]"
    
    elif isinstance(value, dict):
        if not value:
            return "{}"
        
        # 格式化对象，keys无引号
        indent_str = "  " * indent
        next_indent = indent + 1
        next_indent_str = "  " * next_indent
        
        items = []
        for key, val in value.items():
            formatted_val = format_json5_value(val, next_indent)
            items.append(f"{next_indent_str}{key}: {formatted_val}")
        
        if indent == 0:
            # 顶层对象：单行显示（紧凑格式）
            if len(items) <= 3:
                return f"{{{', '.join([item.strip() for item in items])}}}"
            else:
                return f"{{\n{',\n'.join(items)}\n{indent_str}}}"
        else:
            # 嵌套对象：多行显示
            return f"{{\n{',\n'.join(items)}\n{indent_str}}}"
    
    elif value is None:
        return "null"
    
    else:
        # 其他类型，直接字符串化
        return str(value)

def generate_no_quotes_json5(data):
    """生成自定义格式的无引号JSON5（主要字段靠前）"""
    
    # 定义重要字段的顺序
    priority_fields = ["id", "name", "version", "author", "appId", "subscribeUrl", 
                      "categories", "globalGroups", "checkUpdateUrl", "supportUri"]
    
    # 分离优先级字段和其他字段
    priority_items = {}
    other_items = {}
    
    for key, value in data.items():
        if key in priority_fields:
            priority_items[key] = value
        else:
            other_items[key] = value
    
    # 按照指定顺序重新排列
    ordered_data = {}
    
    # 1. 优先显示指定字段
    for field in priority_fields:
        if field in priority_items:
            ordered_data[field] = priority_items[field]
    
    # 2. 显示其他字段
    ordered_data.update(other_items)
    
    # 生成格式化字符串
    return format_json5_value(ordered_data)

def build_custom_data(base_data, upstream_version):
    """构建自定义数据，替换特定字段"""
    
    custom_data = base_data.copy()
    
    # ============ 自定义修改区域 ============
    custom_data["id"] = 2015                      # 订阅ID
    custom_data["name"] = "少数π⁺ 🌀Guīzé訂閱−禁止傳播"  # 订阅名称
    custom_data["version"] = upstream_version     # 版本号
    custom_data["author"] = "少数π⁺"             # 作者
    
    # 更新相关URL
    custom_data["checkUpdateUrl"] = "./Guīzé.version.stor"
    custom_data["supportUri"] = "https://icloud.sspai.pp.ua/GKD"
    # ========================================
    
    return custom_data

def download_upstream_subscription():
    """下载上游订阅文件"""
    try:
        print(f"📡 正在下载上游订阅文件: {UPSTREAM_SUB_URL}")
        resp = requests.get(UPSTREAM_SUB_URL, timeout=TIMEOUT_SUBSCRIPTION)
        resp.raise_for_status()
        upstream_data = json5.loads(resp.text)
        print(f"✅ 上游订阅文件下载成功")
        return upstream_data
    except requests.exceptions.Timeout:
        print(f"❌ 超时：下载订阅文件超时（{TIMEOUT_SUBSCRIPTION}秒）")
        return None
    except Exception as e:
        print(f"❌ 下载失败: {e}")
        return None

def update_subscription(upstream_version):
    """主更新逻辑"""
    
    # 1. 下载上游数据
    upstream_data = download_upstream_subscription()
    if upstream_data is None:
        return False
    
    try:
        # 2. 应用自定义修改
        custom_data = build_custom_data(upstream_data, upstream_version)
        
        # 3. 生成无引号JSON5格式
        print("🔄 正在生成无引号JSON5格式...")
        json5_output = generate_no_quotes_json5(custom_data)
        
        # 4. 保存主订阅文件
        print(f"💾 保存主订阅文件: {LOCAL_SUB_FILE}")
        with open(LOCAL_SUB_FILE, "w", encoding="utf-8") as f:
            f.write(json5_output)
        print(f"✅ 主订阅文件已保存 ({os.path.getsize(LOCAL_SUB_FILE)} 字节)")
        
        # 5. 保存版本文件（简单格式）
        print(f"💾 保存版本文件: {LOCAL_VERSION_FILE}")
        version_content = f"{{id: 2015, version: {upstream_version}}}"
        with open(LOCAL_VERSION_FILE, "w", encoding="utf-8") as f:
            f.write(version_content)
        print(f"✅ 版本文件已保存")
        
        # 6. 创建成功标记
        with open(UPDATE_FLAG_FILE, "w") as f:
            f.write(str(upstream_version))
        
        return True
        
    except Exception as e:
        print(f"❌ 处理失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("🚀 GKD 订阅同步开始")
    print("=" * 50)
    
    # 1. 检查文件位置
    current_dir = os.getcwd()
    print(f"📁 当前工作目录: {current_dir}")
    
    # 2. 获取版本信息
    upstream_version = get_upstream_version()
    local_version = get_local_version()
    
    # 3. 版本比较和决策
    print(f"📊 版本比较：本地 v{local_version} ⇄ 上游 v{upstream_version}")
    
    if upstream_version > local_version:
        print(f"🔄 发现新版本（+{upstream_version - local_version}），开始更新...")
        print("-" * 50)
        
        if update_subscription(upstream_version):
            print(f"\n✅ 同步完成！已更新到版本 v{upstream_version}")
            print(f"📝 生成文件:")
            print(f"  • {LOCAL_SUB_FILE}")
            print(f"  • {LOCAL_VERSION_FILE}")
            print(f"  • {UPDATE_FLAG_FILE}")
            sys.exit(0)
        else:
            print(f"\n❌ 同步失败，请检查网络或配置")
            sys.exit(1)
    elif upstream_version == local_version:
        print(f"✅ 已是最新版本，无需更新")
        sys.exit(0)
    else:
        print(f"⚠️  本地版本高于上游版本（本地: {local_version}, 上游: {upstream_version}）")
        user_input = input("❓ 是否强制更新？(y/N): ")
        if user_input.lower() == 'y':
            if update_subscription(upstream_version):
                print(f"\n✅ 强制更新完成")
                sys.exit(0)
            else:
                print(f"\n❌ 强制更新失败")
                sys.exit(1)
        else:
            print(f"✅ 取消强制更新")
            sys.exit(0)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n❌ 用户中断操作")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ 程序异常: {e}")
        sys.exit(1)
