/**
 * Clash 配置增强脚本 - 防DNS泄露 + 规则优化 (改进版)
 * 功能：自动覆盖Clash配置中的DNS、规则、代理组等核心配置
 * 注意：本脚本需要 Clash Meta 内核支持
 */

// ===================== 基础配置 =====================
// 国内DNS服务器 (DoH协议 + UDP备用)
const domesticNameservers = [
  "https://dns.alidns.com/dns-query", // 阿里公共DNS
  "https://doh.pub/dns-query",        // 腾讯DNSPod
];

// 国外DNS服务器 (DoH协议)
const foreignNameservers = [
  "https://mozilla.cloudflare-dns.com/dns-query", // Cloudflare DNS (1.1.1.1)
  "https://dns.google/dns-query",         // Google DNS (8.8.8.8)
];

// ===================== DNS配置（防泄露核心） =====================
const dnsConfig = {
  "enable": true,                      // 启用自定义DNS
  "listen": "127.0.0.1:1053",          // 监听本地DNS端口（仅本地，防止外部嗅探）
  "ipv6": true,                        // 支持IPv6（防止IPv6 DNS泄露）
  "use-system-hosts": false,           // 不使用系统hosts（避免系统DNS介入）
  "cache-algorithm": "arc",            // 启用DNS缓存（ARC算法，高效缓存）
  "enhanced-mode": "fake-ip",          // 核心：Fake-IP模式（防DNS泄露）
  "fake-ip-range": "198.18.0.1/16",    // Fake-IP地址段（避免和真实IP冲突）
  "fake-ip-filter": [                  // 例外域名（不使用Fake-IP，避免功能异常）
    // 本地网络相关
    "+.lan",
    "+.local",
    // Windows网络检测（避免小地球图标）
    "+.msftconnecttest.com",
    "+.msftncsi.com",
    // 腾讯系登录检测
    "localhost.ptlogin2.qq.com",
    "localhost.sec.qq.com",
    // 微信登录检测
    "localhost.work.weixin.qq.com"
  ],
  // 基础DNS：仅用于解析DNS服务器自身域名（国内DNS，避免递归泄露）
  "default-nameserver": ["119.29.29.29", "223.5.5.5"],
  // 主DNS：国内域名优先使用（包含DoH和UDP备用）
  "nameserver": domesticNameservers,
  // 备用DNS：仅特定场景触发
  "fallback": foreignNameservers,
  "fallback-filter": {                 // Fallback触发条件（优先使用geosite匹配，再根据IP归属判断）
    "geosite": [                       // 指定境外域名直接用fallback
      "geolocation-!cn",
      "gfw",
      "google",
      "youtube",
      "github",
      "telegram"
    ],
    "geoip": true,                     // 根据IP归属地判断（非中国IP则用fallback）
    "ipcidr": [],                      // 可补充特定IP段（留空）
    "domain": []                       // 可补充特定域名（留空）
  },
  // 代理服务器域名专用DNS（避免被污染）
  "proxy-server-nameserver": foreignNameservers
};

// ===================== 规则集通用配置 =====================
const ruleProviderCommon = {
  "type": "http",          // 远程规则集类型
  "format": "yaml",        // 规则集格式
  "interval": 43200        // 规则集更新间隔（12小时，平衡及时性与流量）
};

// ===================== 规则集配置 =====================
// 注意：如果镜像站 cdn.jsdmirror.com 失效，可手动替换为原始 GitHub 地址：
// https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/
const ruleProviders = {
  "reject": {
    ...ruleProviderCommon,
    "behavior": "domain",
    "url": "https://cdn.jsdmirror.com/gh/Loyalsoldier/clash-rules@release/reject.txt",
    "path": "./ruleset/loyalsoldier/reject.yaml"
  },
  "icloud": {
    ...ruleProviderCommon,
    "behavior": "domain",
    "url": "https://cdn.jsdmirror.com/gh/Loyalsoldier/Clash-Rules@release/icloud.txt",
    "path": "./ruleset/loyalsoldier/icloud.yaml"
  },
  "apple": {
    ...ruleProviderCommon,
    "behavior": "domain",
    "url": "https://cdn.jsdmirror.com/gh/Loyalsoldier/clash-rules@release/apple.txt",
    "path": "./ruleset/loyalsoldier/apple.yaml"
  },
  "google": {
    ...ruleProviderCommon,
    "behavior": "domain",
    "url": "https://cdn.jsdmirror.com/gh/Loyalsoldier/clash-rules@release/google.txt",
    "path": "./ruleset/loyalsoldier/google.yaml"
  },
  "proxy": {
    ...ruleProviderCommon,
    "behavior": "domain",
    "url": "https://cdn.jsdmirror.com/gh/Loyalsoldier/clash-rules@release/proxy.txt",
    "path": "./ruleset/loyalsoldier/proxy.yaml"
  },
  "direct": {
    ...ruleProviderCommon,
    "behavior": "domain",
    "url": "https://cdn.jsdmirror.com/gh/Loyalsoldier/clash-rules@release/direct.txt",
    "path": "./ruleset/loyalsoldier/direct.yaml"
  },
  "private": {
    ...ruleProviderCommon,
    "behavior": "domain",
    "url": "https://cdn.jsdmirror.com/gh/Loyalsoldier/clash-rules@release/private.txt",
    "path": "./ruleset/loyalsoldier/private.yaml"
  },
  "gfw": {
    ...ruleProviderCommon,
    "behavior": "domain",
    "url": "https://cdn.jsdmirror.com/gh/Loyalsoldier/clash-rules@release/gfw.txt",
    "path": "./ruleset/loyalsoldier/gfw.yaml"
  },
  "tld-not-cn": {
    ...ruleProviderCommon,
    "behavior": "domain",
    "url": "https://cdn.jsdmirror.com/gh/Loyalsoldier/clash-rules@release/tld-not-cn.txt",
    "path": "./ruleset/loyalsoldier/tld-not-cn.yaml"
  },
  "telegramcidr": {
    ...ruleProviderCommon,
    "behavior": "ipcidr",
    "url": "https://cdn.jsdmirror.com/gh/Loyalsoldier/clash-rules@release/telegramcidr.txt",
    "path": "./ruleset/loyalsoldier/telegramcidr.yaml"
  },
  "cncidr": {
    ...ruleProviderCommon,
    "behavior": "ipcidr",
    "url": "https://cdn.jsdmirror.com/gh/Loyalsoldier/clash-rules@release/cncidr.txt",
    "path": "./ruleset/loyalsoldier/cncidr.yaml"
  },
  "lancidr": {
    ...ruleProviderCommon,
    "behavior": "ipcidr",
    "url": "https://cdn.jsdmirror.com/gh/Loyalsoldier/clash-rules@release/lancidr.txt",
    "path": "./ruleset/loyalsoldier/lancidr.yaml"
  },
  "applications": {
    ...ruleProviderCommon,
    "behavior": "classical",
    "url": "https://cdn.jsdmirror.com/gh/Loyalsoldier/clash-rules@release/applications.txt",
    "path": "./ruleset/loyalsoldier/applications.yaml"
  }
};

// ===================== 自定义规则 =====================
const rules = [
  // 自定义域名规则（可根据实际需求调整目标代理组）
  "DOMAIN-SUFFIX,coodesker.com,🛑 全球拦截",    // 酷呆桌面
  "DOMAIN-SUFFIX,adobe.io,🛑 全球拦截",         // Adobe.io
  "DOMAIN-SUFFIX,adobe.com,🛑 全球拦截",        // Adobe官网

  // 规则集引用
  "RULE-SET,applications,🎯 全球直连",
  "RULE-SET,private,🎯 全球直连",
  "RULE-SET,reject,🍃 应用净化",
  "RULE-SET,icloud,Ⓜ️ 微软服务",
  "RULE-SET,apple,🍎 苹果服务",
  "RULE-SET,google,📢 谷歌服务",
  "RULE-SET,proxy,🌐 节点选择",
  "RULE-SET,gfw,🌐 节点选择",
  "RULE-SET,tld-not-cn,🌐 节点选择",
  "RULE-SET,direct,🎯 全球直连",
  "RULE-SET,lancidr,🎯 全球直连,no-resolve",
  "RULE-SET,cncidr,🎯 全球直连,no-resolve",
  "RULE-SET,telegramcidr,📲 电报消息,no-resolve",
  
  // 兜底规则
  "GEOIP,LAN,🎯 全球直连,no-resolve",
  "GEOIP,CN,🎯 全球直连,no-resolve",
  "MATCH,🐟 漏网之鱼"
];

// ===================== 代理组通用配置 =====================
const groupBaseOption = {
  "interval": 300,            // 节点检测间隔（5分钟）
  "timeout": 5000,            // 检测超时时间（5秒，原3000可能过短）
  "url": "https://www.google.com/generate_204", // 检测URL
  "lazy": true,               // 懒加载（仅使用时检测）
  "max-failed-times": 3,      // 最大失败次数（超过则禁用节点）
  "hidden": false             // 不隐藏代理组
};

// ===================== 主函数（配置入口） =====================
function main(config) {
  // 校验：确保配置中有代理节点/代理提供商
  const proxyCount = config?.proxies?.length ?? 0;
  const proxyProviderCount = typeof config?.["proxy-providers"] === "object" 
    ? Object.keys(config["proxy-providers"]).length 
    : 0;
  
  if (proxyCount === 0 && proxyProviderCount === 0) {
    throw new Error("配置文件中未找到任何代理节点/提供商，请先配置代理！");
  }

  // 1. 覆盖DNS配置（防泄露核心）
  config["dns"] = dnsConfig;

  // 2. 覆盖代理组配置（所有图片图标均已保留）
  config["proxy-groups"] = [
    {
      ...groupBaseOption,
      "name": "🌐 节点选择",
      "type": "select",
      "proxies": ["♻️ 延迟选优", "🔯 故障转移", "🔮 负载均衡·散列", "🔮 负载均衡·轮询", "☑️ 手动切换", "DIRECT"],
      "include-all": false,
      "icon": "https://cdn.jsdmirror.com/gh/iTaoPu/iCloud@Grey/IconSet/Area.png"
    },
    {
      ...groupBaseOption,
      "name": "☑️ 手动切换",
      "type": "select",
      "proxies": ["REJECT", "DIRECT"],
      "include-all": true,
      "icon": "https://cdn.jsdmirror.com/gh/iTaoPu/iCloud@Grey/IconSet/Catnet.png"
    },
    {
      ...groupBaseOption,
      "name": "♻️ 延迟选优",
      "type": "url-test",
      "tolerance": 100,
      "include-all": true,
      "icon": "https://cdn.jsdmirror.com/gh/iTaoPu/iCloud@Grey/IconSet/Auto.png"
    },
    {
      ...groupBaseOption,
      "name": "🔯 故障转移",
      "type": "fallback",
      "include-all": true,
      "icon": "https://cdn.jsdmirror.com/gh/iTaoPu/iCloud@Grey/IconSet/ambulance.png"
    },
    {
      ...groupBaseOption,
      "name": "🔮 负载均衡·散列",
      "type": "load-balance",
      "strategy": "consistent-hashing",
      "include-all": true,
      "icon": "https://cdn.jsdmirror.com/gh/iTaoPu/iCloud@Grey/IconSet/merry_go.png"
    },
    {
      ...groupBaseOption,
      "name": "🔮 负载均衡·轮询",
      "type": "load-balance",
      "strategy": "round-robin",
      "include-all": true,
      "icon": "https://cdn.jsdmirror.com/gh/iTaoPu/iCloud@Grey/IconSet/balance.png"
    },
    {
      ...groupBaseOption,
      "name": "🌍 国外媒体",
      "type": "select",
      "proxies": ["🌐 节点选择", "♻️ 延迟选优", "🔯 故障转移", "🔮 负载均衡·散列", "🔮 负载均衡·轮询", "☑️ 手动切换", "🎯 全球直连"],
      "include-all": true,
      "icon": "https://cdn.jsdmirror.com/gh/iTaoPu/iCloud@Grey/IconSet/World_Map.png"
    },
    {
      ...groupBaseOption,
      "name": "📢 谷歌服务",
      "type": "select",
      "proxies": ["🌐 节点选择", "♻️ 延迟选优", "🔯 故障转移", "🔮 负载均衡·散列", "🔮 负载均衡·轮询", "☑️ 手动切换", "🎯 全球直连"],
      "include-all": true,
      "icon": "https://cdn.jsdmirror.com/gh/iTaoPu/iCloud@Grey/IconSet/google.png"
    },
    {
      ...groupBaseOption,
      "name": "Ⓜ️ 微软服务",
      "type": "select",
      "proxies": ["🎯 全球直连", "🌐 节点选择", "♻️ 延迟选优", "🔯 故障转移", "🔮 负载均衡·散列", "🔮 负载均衡·轮询", "☑️ 手动切换"],
      "include-all": true,
      "icon": "https://cdn.jsdmirror.com/gh/iTaoPu/iCloud@Grey/IconSet/microsoft.png"
    },
    {
      ...groupBaseOption,
      "name": "🍎 苹果服务",
      "type": "select",
      "proxies": ["🌐 节点选择", "♻️ 延迟选优", "🔯 故障转移", "🔮 负载均衡·散列", "🔮 负载均衡·轮询", "☑️ 手动切换", "🎯 全球直连"],
      "include-all": true,
      "icon": "https://cdn.jsdmirror.com/gh/iTaoPu/iCloud@Grey/IconSet/apple_blue.png"
    },
    {
      ...groupBaseOption,
      "name": "📲 电报消息",
      "type": "select",
      "proxies": ["🌐 节点选择", "♻️ 延迟选优", "🔯 故障转移", "🔮 负载均衡·散列", "🔮 负载均衡·轮询", "☑️ 手动切换", "🎯 全球直连"],
      "include-all": true,
      "icon": "https://cdn.jsdmirror.com/gh/iTaoPu/iCloud@Grey/IconSet/Telegram.png"
    },
    {
      ...groupBaseOption,
      "name": "🎯 全球直连",
      "type": "select",
      "proxies": ["DIRECT", "🌐 节点选择", "♻️ 延迟选优", "🔯 故障转移", "🔮 负载均衡·散列", "🔮 负载均衡·轮询", "☑️ 手动切换"],
      "include-all": true,
      "icon": "https://cdn.jsdmirror.com/gh/iTaoPu/iCloud@Grey/IconSet/link.png"
    },
    {
      ...groupBaseOption,
      "name": "🛑 全球拦截",
      "type": "select",
      "proxies": ["REJECT", "DIRECT"],
      "icon": "https://cdn.jsdmirror.com/gh/iTaoPu/iCloud@Grey/IconSet/Reject.png"
    },
    {
      ...groupBaseOption,
      "name": "🍃 应用净化",
      "type": "select",
      "proxies": ["REJECT", "DIRECT"],
      "icon": "https://cdn.jsdmirror.com/gh/iTaoPu/iCloud@Grey/IconSet/Hijacking.png"
    },
    {
      ...groupBaseOption,
      "name": "🐟 漏网之鱼",
      "type": "select",
      "proxies": ["🌐 节点选择", "♻️ 延迟选优", "🔯 故障转移", "🔮 负载均衡·散列", "🔮 负载均衡·轮询", "☑️ 手动切换", "🎯 全球直连"],
      "include-all": true,
      "icon": "https://cdn.jsdmirror.com/gh/iTaoPu/iCloud@Grey/IconSet/fish.png"
    }
  ];

  // 3. 覆盖规则集和规则
  config["rule-providers"] = ruleProviders;
  config["rules"] = rules;

  // 4. 启用GEO数据（精准判断IP/域名归属地）
  config["geodata-mode"] = true;
  config["geox-url"] = {
    geoip: "https://cdn.jsdmirror.com/gh/Loyalsoldier/v2ray-rules-dat@release/geoip.dat",
    geosite: "https://cdn.jsdmirror.com/gh/Loyalsoldier/v2ray-rules-dat@release/geosite.dat",
    mmdb:  "https://cdn.jsdmirror.com/gh/MetaCubeX/meta-rules-dat@release/country-lite.mmdb",
    asn:  "https://cdn.jsdmirror.com/gh/MetaCubeX/meta-rules-dat@release/GeoLite2-ASN.mmdb"
  };
  // GEO数据自动更新间隔（24小时）
  config["geodata-update-interval"] = 24;

  // 5. 设置日志级别（便于排错）
  config["log-level"] = "info";

  // 返回增强后的配置
  return config;
}


