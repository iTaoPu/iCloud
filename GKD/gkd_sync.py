#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GKD 订阅同步脚本（存放于GKD目录）
功能：自动检查上游版本并更新本地订阅文件
- 主文件(Guīzé.stor)：完全无空格的JSON5紧凑格式
- 版本文件(Guīzé.version.stor)：{id: 2015, version: 版本号} 无引号格式
"""

import json5
import requests
import json
import os
import sys

# ===================== 配置区域 =====================
UPSTREAM_VERSION_URL = "https://raw.githubusercontent.com/Lin-arm/GKD_subscription/main/dist/gkd.version.json5"
UPSTREAM_SUB_URL = "https://raw.githubusercontent.com/Lin-arm/GKD_subscription/main/dist/gkd.json5"

# 本地文件路径（当前目录，即GKD目录）
LOCAL_VERSION_FILE = "Guīzé.version.stor"
LOCAL_SUB_FILE = "Guīzé.stor"

# 自定义配置（仅覆盖指定字段，不改变其他格式）
CUSTOM_CONFIG = {
    "id": 2015,
    "name": "少数π⁺ 🌀Guīzé訂閱−禁止傳播",
    "author": "長髯主簿",
    "checkUpdateUrl": "./Guīzé.version.stor",
    "supportUri": "https://icloud.sspai.pp.ua/GKD"
}

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
    """读取自定义无引号格式的版本文件，提取version值"""
    try:
        if os.path.exists(LOCAL_VERSION_FILE):
            print(f"📂 正在读取本地版本文件: {LOCAL_VERSION_FILE}")
            # 读取文件内容并清理空白字符
            with open(LOCAL_VERSION_FILE, "r", encoding="utf-8") as f:
                content = f.read().replace(" ", "").replace("\n", "")
            
            local_version = 0
            # 解析version值（匹配 "version:数字" 格式）
            if "version:" in content:
                version_part = content.split("version:")[1].split(",")[0].split("}")[0]
                local_version = int(version_part.strip())
            
            print(f"✅ 本地当前版本: {local_version}")
            return local_version
        else:
            print(f"ℹ️  本地版本文件不存在，默认版本号：0")
            return 0
    except Exception as e:
        print(f"⚠️  读取本地版本失败（{e}），默认版本号：0")
        return 0

def json_to_json5_with_single_quotes(data):
    """
    将JSON/dict转换为使用单引号的JSON5格式字符串
    其他所有逻辑保持不变
    """
    if isinstance(data, dict):
        items = []
        for key, value in data.items():
            # 键不需要引号
            key_str = str(key)
            # 递归处理值
            value_str = json_to_json5_with_single_quotes(value)
            items.append(f"{key_str}:{value_str}")
        return "{" + ",".join(items) + "}"
    
    elif isinstance(data, list):
        items = [json_to_json5_with_single_quotes(item) for item in data]
        return "[" + ",".join(items) + "]"
    
    elif isinstance(data, str):
        # 字符串使用单引号，并处理转义
        escaped = data.replace("\\", "\\\\").replace("'", "\\'")
        return f"'{escaped}'"
    
    elif isinstance(data, bool):
        return "true" if data else "false"
    
    elif data is None:
        return "null"
    
    else:
        # 数字等直接转为字符串
        return str(data)

def update_subscription(upstream_version):
    """下载并更新订阅文件，主文件生成完全无空格的JSON5格式，且使用单引号"""
    try:
        print(f"📥 正在下载上游订阅文件: {UPSTREAM_SUB_URL}")
        resp = requests.get(UPSTREAM_SUB_URL, timeout=TIMEOUT_SUBSCRIPTION)
        resp.raise_for_status()
        
        # 用JSON5解析上游内容
        data = json5.loads(resp.text)
        print(f"✅ 成功下载订阅文件，大小：{len(resp.text)} 字节")
        
        # 应用自定义配置（仅覆盖指定字段，不修改其他内容）
        data.update(CUSTOM_CONFIG)
        data["version"] = upstream_version
        
        # 🔄 修改：使用自定义函数生成单引号JSON5格式
        json5_str_no_space = json_to_json5_with_single_quotes(data)
        
        # 保存完全无空格的内容
        with open(LOCAL_SUB_FILE, "w", encoding="utf-8") as f:
            f.write(json5_str_no_space)
        print(f"✅ 已保存主订阅文件: {LOCAL_SUB_FILE}（完全无空格紧凑格式，使用单引号）")
        
        # 生成指定格式的版本文件（{id: 2015, version: 版本号}）
        version_content = """{
id:2015,
version:%s
}""" % upstream_version
        
        with open(LOCAL_VERSION_FILE, "w", encoding="utf-8") as f:
            f.write(version_content)
        print(f"✅ 已保存版本文件: {LOCAL_VERSION_FILE}（指定无引号格式）")
        
        # 创建更新标记文件（GKD目录内）
        with open(UPDATE_FLAG_FILE, "w") as f:
            f.write(str(upstream_version))
        
        # 验证文件是否生成
        if os.path.exists(LOCAL_SUB_FILE) and os.path.exists(LOCAL_VERSION_FILE):
            print(f"🎉 订阅更新完成！版本号：{upstream_version}")
            # 预览生成的前几行内容
            with open(LOCAL_SUB_FILE, "r", encoding="utf-8") as f:
                preview = f.read()[:100]
                print(f"📝 预览前100字符: {preview}...")
            return True
        else:
            print("❌ 文件生成失败")
            return False
            
    except requests.exceptions.Timeout:
        print(f"❌ 超时：下载订阅文件超时（{TIMEOUT_SUBSCRIPTION}秒）")
        return False
    except requests.exceptions.RequestException as e:
        print(f"❌ 网络错误：下载订阅失败 - {e}")
        return False
    except Exception as e:
        print(f"❌ 更新失败：{e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """主函数：执行完整的版本检查和更新流程"""
    print("=" * 50)
    print("🎯 开始GKD订阅同步检查（脚本位于GKD目录）")
    print("=" * 50)
    
    # 1. 获取版本号
    local_ver = get_local_version()
    upstream_ver = get_upstream_version()
    
    # 2. 版本对比
    print("\n🔍 版本对比结果：")
    print(f"   本地版本: {local_ver}")
    print(f"   上游版本: {upstream_ver}")
    
    # 3. 判断是否需要更新
    if upstream_ver > local_ver:
        print(f"\n📢 发现新版本！开始更新...")
        update_success = update_subscription(upstream_ver)
        if update_success:
            print("\n✅ 同步完成！主文件完全无空格，版本文件格式符合要求")
            print("📌 特性：使用单引号包裹字符串，完全无空格的紧凑格式")
            sys.exit(0)
        else:
            print("\n❌ 同步失败！请检查错误信息")
            sys.exit(1)
    elif upstream_ver == local_ver:
        print("\n✅ 本地已是最新版本，无需更新")
        sys.exit(0)
    else:
        print(f"\n⚠️  警告：本地版本({local_ver})高于上游版本({upstream_ver})")
        sys.exit(0)

# 程序入口
if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n🛑 用户中断操作")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ 程序异常退出：{e}")
        sys.exit(1)
