/*
 * Clash 配置增强脚本 - 防DNS泄露 + 规则优化 (完全还原格式版)
 * * 功能：自动覆盖Clash配置中的DNS、规则、代理组等核心配置
 * * 注意：本脚本需要 Clash Meta(Mihomo) 内核支持
 */

// ===================== 基础配置 =====================
const domesticNameservers = [
  "https://dns.alidns.com/dns-query", // 阿里公共DNS
  "https://doh.pub/dns-query",        // 腾讯DNSPod
];

const foreignNameservers = [
  "https://dns.cloudflar.com/dns-query", // Cloudflare DNS
  "https://dns.google/dns-query",        // Google DNS
];

// ===================== DNS配置（防泄露核心） =====================
const dnsConfig = {
  "enable": true,
  "listen": "127.0.0.1:1053",
  "ipv6": false,
  "use-system-hosts": false,
  "cache-algorithm": "arc",
  "enhanced-mode": "fake-ip",         // Fake-IP模式
  "fake-ip-range": "198.18.0.1/16",
  "fake-ip-filter": [
    "+.lan",
    "+.local",
    "+.msftconnecttest.com",
    "+.msftncsi.com",
    "localhost.ptlogin2.qq.com",
    "localhost.sec.qq.com",
    "localhost.work.weixin.qq.com",
  ],
  "default-nameserver": ["119.29.29.29", "223.5.5.5"],
  "nameserver": domesticNameservers,
  "fallback": foreignNameservers,
  // 强制指定 DNS 解析路径，杜绝查询外溢
  "nameserver-policy": {
    "geosite:cn": domesticNameservers,
    "geosite:geolocation-!cn": foreignNameservers
  },
  "fallback-filter": {
    "geosite": [
      "geolocation-!cn",
      "gfw",
      "google",
      "youtube",
      "github",
      "telegram",
      "cloudflare"
    ],
    "geoip": true,
    "geoip-code": "CN",
    "ipcidr": [],
    "domain": []
  },
  "proxy-server-nameserver": domesticNameservers // 修复：确保代理节点连接使用国内DNS解析
};

// ===================== 规则集通用配置 =====================
const ruleProviderCommon = {
  "type": "http",
  "format": "yaml",
  "interval": 43200
};

// ===================== 规则集配置 =====================
const ruleProviders = {
  "reject": {
    ...ruleProviderCommon,
    "behavior": "domain",
    "url": "https://cdn.jsdmirror.com/gh/Loyalsoldier/clash-rules@release/reject.txt",
    "path": "./ruleset/reject.yaml"
  },
  "icloud": {
    ...ruleProviderCommon,
    "behavior": "domain",
    "url": "https://cdn.jsdmirror.com/gh/Loyalsoldier/clash-rules@release/icloud.txt",
    "path": "./ruleset/icloud.yaml"
  },
  "apple": {
    ...ruleProviderCommon,
    "behavior": "domain",
    "url": "https://cdn.jsdmirror.com/gh/Loyalsoldier/clash-rules@release/apple.txt",
    "path": "./ruleset/apple.yaml"
  },
  "google": {
    ...ruleProviderCommon,
    "behavior": "domain",
    "url": "https://cdn.jsdmirror.com/gh/Loyalsoldier/clash-rules@release/google.txt",
    "path": "./ruleset/google.yaml"
  },
  "proxy": {
    ...ruleProviderCommon,
    "behavior": "domain",
    "url": "https://cdn.jsdmirror.com/gh/Loyalsoldier/clash-rules@release/proxy.txt",
    "path": "./ruleset/proxy.yaml"
  },
  "direct": {
    ...ruleProviderCommon,
    "behavior": "domain",
    "url": "https://cdn.jsdmirror.com/gh/Loyalsoldier/clash-rules@release/direct.txt",
    "path": "./ruleset/direct.yaml"
  },
  "private": {
    ...ruleProviderCommon,
    "behavior": "domain",
    "url": "https://cdn.jsdmirror.com/gh/Loyalsoldier/clash-rules@release/private.txt",
    "path": "./ruleset/private.yaml"
  },
  "gfw": {
    ...ruleProviderCommon,
    "behavior": "domain",
    "url": "https://cdn.jsdmirror.com/gh/Loyalsoldier/clash-rules@release/gfw.txt",
    "path": "./ruleset/gfw.yaml"
  },
  "tld-not-cn": {
    ...ruleProviderCommon,
    "behavior": "domain",
    "url": "https://cdn.jsdmirror.com/gh/Loyalsoldier/clash-rules@release/tld-not-cn.txt",
    "path": "./ruleset/tld-not-cn.yaml"
  },
  "telegramcidr": {
    ...ruleProviderCommon,
    "behavior": "ipcidr",
    "url": "https://cdn.jsdmirror.com/gh/Loyalsoldier/clash-rules@release/telegramcidr.txt",
    "path": "./ruleset/telegramcidr.yaml"
  },
  "cncidr": {
    ...ruleProviderCommon,
    "behavior": "ipcidr",
    "url": "https://cdn.jsdmirror.com/gh/Loyalsoldier/clash-rules@release/cncidr.txt",
    "path": "./ruleset/cncidr.yaml"
  },
  "lancidr": {
    ...ruleProviderCommon,
    "behavior": "ipcidr",
    "url": "https://cdn.jsdmirror.com/gh/Loyalsoldier/clash-rules@release/lancidr.txt",
    "path": "./ruleset/lancidr.yaml"
  },
  "applications": {
    ...ruleProviderCommon,
    "behavior": "classical",
    "url": "https://cdn.jsdmirror.com/gh/Loyalsoldier/clash-rules@release/applications.txt",
    "path": "./ruleset/applications.yaml"
  }
};

// ===================== 核心规则 =====================
const rules = [
  "DOMAIN-SUFFIX,coodesker.com,🛑全球拦截",  //酷呆桌面
  "DOMAIN-SUFFIX,Adobe.com,🛑全球拦截",  //Adobe.com Adobe云服务
  "DOMAIN-SUFFIX,Adobe.io,🛑全球拦截",  //Adobe.io Adobe云服务
  "DOMAIN-SUFFIX,aem.live,🛑全球拦截",  //aem.live Adobe云服务级
  "DOMAIN-SUFFIX,aem.page,🛑全球拦截",  //aem.page Adobe云服务
  "DOMAIN-SUFFIX,adobelogin.com^,🛑全球拦截",  //adobelogin.com Adobe云服务
  "DOMAIN-SUFFIX,adobeccstatic.com^,🛑全球拦截",  //adobeccstatic.com Adobe云服务
  "DOMAIN-SUFFIX,adobeoobe.com^,🛑全球拦截",  //adobeoobe.com Adobe云服务
  "DOMAIN-SUFFIX,adobecc.com^,🛑全球拦截",  //adobecc.com Adobe云服务
// Loyalsoldier 规则集
  "RULE-SET,applications,🎯全球直连",
  "RULE-SET,private,🎯全球直连",
  "RULE-SET,reject,🛑全球拦截",
  "RULE-SET,icloud,🎯全球直连",
  "RULE-SET,apple,🎯全球直连",
  "RULE-SET,tld-not-cn,🌐节点选择",
  "RULE-SET,gfw,🌐节点选择",
  "RULE-SET,google,🌐节点选择",
  "RULE-SET,proxy,🌐节点选择",
  "RULE-SET,direct,🎯全球直连",
  "RULE-SET,lancidr,🎯全球直连,no-resolve",
  "RULE-SET,cncidr,🎯全球直连,no-resolve",
  "RULE-SET,telegramcidr,🌐节点选择,no-resolve",
  "GEOIP,LAN,🎯全球直连,no-resolve",
  "GEOIP,CN,🎯全球直连,no-resolve",
  "MATCH,🐟漏网之鱼"
];

// ===================== 代理组通用配置 =====================
const groupBaseOption = {
  "interval": 300,
  "timeout": 5000,
  "url": "https://www.google.com/generate_204",
  "lazy": true,
  "max-failed-times": 3,
  "hidden": false
};

// ===================== 主函数（配置入口） =====================
function main(config) {
  const proxyCount = config?.proxies?.length ?? 0;
  const proxyProviderCount = typeof config?.["proxy-providers"] === "object" 
    ? Object.keys(config["proxy-providers"]).length 
    : 0;
  
  if (proxyCount === 0 && proxyProviderCount === 0) {
    throw new Error("配置文件中未找到任何代理节点/提供商，请先配置代理！");
  }

// 1. 覆盖代理组配置
  config["proxy-groups"] = [
    {
      "name": "🌐节点选择",
      "type": "select",
      "proxies": ["♻️延迟选优", "☑️手动切换", "🔯故障转移", "🔮负载均衡", "DIRECT", "🛑全球拦截"],
      "icon": "https://cdn.jsdmirror.com/gh/iTaoPu/iCloud@Grey/IconSet/Area.png"
    },
    { 
      "name": "☑️手动切换", 
      "type": "select", 
      "include-all": true, 
      ...groupBaseOption, 
      "icon": "https://cdn.jsdmirror.com/gh/iTaoPu/iCloud@Grey/IconSet/Catnet.png" 
    },
    { 
      "name": "♻️延迟选优", 
    "type": "url-test", 
    "include-all": true, 
    ...groupBaseOption, 
    "icon": "https://cdn.jsdmirror.com/gh/iTaoPu/iCloud@Grey/IconSet/Auto.png" 
    },
    { 
      "name": "🔯故障转移", 
      "type": "fallback", 
      "include-all": true, 
      ...groupBaseOption, 
      "icon": "https://cdn.jsdmirror.com/gh/iTaoPu/iCloud@Grey/IconSet/ambulance.png" 
    },
    { 
      "name": "🔮负载均衡", 
    "type": "load-balance", 
    "strategy": "consistent-hashing", 
    "include-all": true, 
    ...groupBaseOption, 
    "icon": "https://cdn.jsdmirror.com/gh/iTaoPu/iCloud@Grey/IconSet/balance.png" 
    },
    { 
      "name": "🎯全球直连", 
      "type": "select", 
      "proxies": ["DIRECT", "🔯故障转移", "🔮负载均衡"], 
      ...groupBaseOption,
      "icon": "https://cdn.jsdmirror.com/gh/iTaoPu/iCloud@Grey/IconSet/link.png" 
    },
    { 
      "name": "🛑全球拦截", 
      "type": "select", 
      "proxies": ["REJECT", "DIRECT"], 
      ...groupBaseOption, 
      "icon": "https://cdn.jsdmirror.com/gh/iTaoPu/iCloud@Grey/IconSet/Reject.png" 
    },
    { 
      "name": "🐟漏网之鱼", 
      "type": "select", 
      "proxies": ["🌐节点选择", "🎯全球直连", "DIRECT", "🔯故障转移", "🔮负载均衡"], 
      "include-all": true, 
      ...groupBaseOption, 
      "icon": "https://cdn.jsdmirror.com/gh/iTaoPu/iCloud@Grey/IconSet/fish.png" 
    }
  ];

  // 2. 覆盖规则集和规则
  config["rule-providers"] = ruleProviders;
  config["rules"] = rules;

  // 3. 注入 DNS 配置
  config["dns"] = dnsConfig;

  // 4. 注入域名嗅探 (Sniffer)
  config["sniffer"] = {
    "enable": true,
    "sniff": {
      "TLS": { "ports": [443, 8443], "override-destination": true },
      "HTTP": { "ports": [80, "8080-8880"], "override-destination": true },
      "QUIC": { "ports": [443, 8443], "override-destination": true }
    }
  };

  // 5. 设置日志级别
  config["log-level"] = "error";

  return config;
}
