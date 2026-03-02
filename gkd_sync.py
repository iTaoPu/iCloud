#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GKD 订阅同步脚本
功能：自动检查上游版本并更新本地订阅文件
使用方式：python gkd_sync.py
"""

import json5
import requests
import json
import os
import sys

# ===================== 配置区域（可根据需要修改）=====================
# 上游数据源地址
UPSTREAM_VERSION_URL = "https://raw.githubusercontent.com/Lin-arm/GKD_subscription/main/dist/gkd.version.json5"
UPSTREAM_SUB_URL = "https://raw.githubusercontent.com/Lin-arm/GKD_subscription/main/dist/gkd.json5"

# 本地文件名称
LOCAL_VERSION_FILE = "Guīzé.version.stor"
LOCAL_SUB_FILE = "Guīzé.stor"

# 自定义配置（替换上游的字段）
CUSTOM_CONFIG = {
    "id": 2015,
    "name": "少数π⁺ 🌀Guīzé訂閱−禁止傳播",
    "author": "少数π⁺",
    "checkUpdateUrl": "./Guīzé.version.stor",
    "supportUri": "https://iCloud.ifanr.us.ci"
}

# 超时配置
TIMEOUT_VERSION = 10  # 获取版本超时时间（秒）
TIMEOUT_SUBSCRIPTION = 30  # 下载订阅超时时间（秒）

# 更新标记文件（供GitHub Actions判断是否更新）
UPDATE_FLAG_FILE = ".update_success"
# ====================================================================

def get_upstream_version():
    """获取上游最新版本号"""
    try:
        print(f"📡 正在获取上游版本信息: {UPSTREAM_VERSION_URL}")
        resp = requests.get(UPSTREAM_VERSION_URL, timeout=TIMEOUT_VERSION)
        resp.raise_for_status()  # 抛出HTTP错误（4xx/5xx）
        
        # 解析JSON5格式
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
    """获取本地版本号"""
    try:
        if os.path.exists(LOCAL_VERSION_FILE):
            print(f"📂 正在读取本地版本文件: {LOCAL_VERSION_FILE}")
            with open(LOCAL_VERSION_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            local_version = int(data.get("version", 0))
            print(f"✅ 本地当前版本: {local_version}")
            return local_version
        else:
            print(f"ℹ️  本地版本文件不存在，默认版本号：0")
            return 0
    except Exception as e:
        print(f"⚠️  读取本地版本失败（{e}），默认版本号：0")
        return 0

def update_subscription(upstream_version):
    """下载并更新订阅文件"""
    try:
        print(f"📥 正在下载上游订阅文件: {UPSTREAM_SUB_URL}")
        # 下载上游订阅文件
        resp = requests.get(UPSTREAM_SUB_URL, timeout=TIMEOUT_SUBSCRIPTION)
        resp.raise_for_status()
        
        # 解析JSON5格式
        data = json5.loads(resp.text)
        print(f"✅ 成功下载订阅文件，大小：{len(resp.text)} 字节")
        
        # 应用自定义配置（覆盖上游字段）
        data.update(CUSTOM_CONFIG)
        data["version"] = upstream_version
        
        # 保存主订阅文件
        with open(LOCAL_SUB_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"✅ 已保存主订阅文件: {LOCAL_SUB_FILE}")
        
        # 构建版本文件数据（只保留关键字段）
        version_data = {
            "id": data["id"],
            "name": data["name"],
            "version": data["version"],
            "author": data["author"],
            "checkUpdateUrl": data["checkUpdateUrl"],
            "supportUri": data["supportUri"]
        }
        
        # 保存版本文件
        with open(LOCAL_VERSION_FILE, "w", encoding="utf-8") as f:
            json.dump(version_data, f, ensure_ascii=False, indent=2)
        print(f"✅ 已保存版本文件: {LOCAL_VERSION_FILE}")
        
        # 创建更新标记文件（供Actions判断）
        with open(UPDATE_FLAG_FILE, "w") as f:
            f.write(str(upstream_version))
        
        # 验证文件是否生成
        if os.path.exists(LOCAL_SUB_FILE) and os.path.exists(LOCAL_VERSION_FILE):
            print(f"🎉 订阅更新完成！版本号：{upstream_version}")
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
        traceback.print_exc()  # 打印详细错误栈
        return False

def main():
    """主函数：执行完整的版本检查和更新流程"""
    print("=" * 50)
    print("🎯 开始GKD订阅同步检查")
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
            print("\n✅ 同步完成！所有文件已更新")
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
