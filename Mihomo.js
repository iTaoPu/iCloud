/**
 * Clash 配置增强脚本 - 规则优化版 (无DNS/GEO/自定义域名)
 * 功能：自动覆盖Clash配置中的代理组、规则集，保留规则集引用和兜底规则
 * 注意：本脚本需要 Clash Meta 内核支持
 */

// ===================== 规则集通用配置 =====================
const ruleProviderCommon = {
  "type": "http",          // 远程规则集类型
  "format": "yaml",        // 规则集格式
  "interval": 43200        // 规则集更新间隔（12小时，平衡及时性与流量）
};

// ===================== 规则集配置 =====================
// 注意：如果镜像站 cdn.jsdmirror.com 失效，可手动替换为原始 GitHub 地址
const ruleProviders = {
  "reject": {
    ...ruleProviderCommon,
    "behavior": "domain",
    "url": "https://www.jsdmirror.com/gh/Loyalsoldier/clash-rules@release/reject.txt",
    "path": "./ruleset/loyalsoldier/reject.yaml"
  },
  "icloud": {
    ...ruleProviderCommon,
    "behavior": "domain",
    "url": "https://www.jsdmirror.com/gh/Loyalsoldier/Clash-Rules@release/icloud.txt",
    "path": "./ruleset/loyalsoldier/icloud.yaml"
  },
  "apple": {
    ...ruleProviderCommon,
    "behavior": "domain",
    "url": "https://www.jsdmirror.com/gh/Loyalsoldier/clash-rules@release/apple.txt",
    "path": "./ruleset/loyalsoldier/apple.yaml"
  },
  "google": {
    ...ruleProviderCommon,
    "behavior": "domain",
    "url": "https://www.jsdmirror.com/gh/Loyalsoldier/clash-rules@release/google.txt",
    "path": "./ruleset/loyalsoldier/google.yaml"
  },
  "proxy": {
    ...ruleProviderCommon,
    "behavior": "domain",
    "url": "https://www.jsdmirror.com/gh/Loyalsoldier/clash-rules@release/proxy.txt",
    "path": "./ruleset/loyalsoldier/proxy.yaml"
  },
  "direct": {
    ...ruleProviderCommon,
    "behavior": "domain",
    "url": "https://www.jsdmirror.com/gh/Loyalsoldier/clash-rules@release/direct.txt",
    "path": "./ruleset/loyalsoldier/direct.yaml"
  },
  "private": {
    ...ruleProviderCommon,
    "behavior": "domain",
    "url": "https://www.jsdmirror.com/gh/Loyalsoldier/clash-rules@release/private.txt",
    "path": "./ruleset/loyalsoldier/private.yaml"
  },
  "gfw": {
    ...ruleProviderCommon,
    "behavior": "domain",
    "url": "https://www.jsdmirror.com/gh/Loyalsoldier/clash-rules@release/gfw.txt",
    "path": "./ruleset/loyalsoldier/gfw.yaml"
  },
  "tld-not-cn": {
    ...ruleProviderCommon,
    "behavior": "domain",
    "url": "https://www.jsdmirror.com/gh/Loyalsoldier/clash-rules@release/tld-not-cn.txt",
    "path": "./ruleset/loyalsoldier/tld-not-cn.yaml"
  },
  "telegramcidr": {
    ...ruleProviderCommon,
    "behavior": "ipcidr",
    "url": "https://www.jsdmirror.com/gh/Loyalsoldier/clash-rules@release/telegramcidr.txt",
    "path": "./ruleset/loyalsoldier/telegramcidr.yaml"
  },
  "cncidr": {
    ...ruleProviderCommon,
    "behavior": "ipcidr",
    "url": "https://www.jsdmirror.com/gh/Loyalsoldier/clash-rules@release/cncidr.txt",
    "path": "./ruleset/loyalsoldier/cncidr.yaml"
  },
  "lancidr": {
    ...ruleProviderCommon,
    "behavior": "ipcidr",
    "url": "https://www.jsdmirror.com/gh/Loyalsoldier/clash-rules@release/lancidr.txt",
    "path": "./ruleset/loyalsoldier/lancidr.yaml"
  },
  "applications": {
    ...ruleProviderCommon,
    "behavior": "classical",
    "url": "https://www.jsdmirror.com/gh/Loyalsoldier/clash-rules@release/applications.txt",
    "path": "./ruleset/loyalsoldier/applications.yaml"
  }
};

// ===================== 核心规则（仅规则集引用 + 兜底） =====================
const rules = [
  // 规则集引用
  "RULE-SET,applications,🎯全球直连",
  "RULE-SET,private,🎯全球直连",
  "RULE-SET,reject,🛑全球拦截",
  "RULE-SET,icloud,Ⓜ️微软服务",
  "RULE-SET,apple,🍎苹果服务",
  "RULE-SET,google,📢谷歌服务",
  "RULE-SET,proxy,🌐节点选择",
  "RULE-SET,gfw,🌐节点选择",
  "RULE-SET,tld-not-cn,🌐节点选择",
  "RULE-SET,direct,🎯全球直连",
  "RULE-SET,lancidr,🎯全球直连,no-resolve",
  "RULE-SET,cncidr,🎯全球直连,no-resolve",
  "RULE-SET,telegramcidr,📲电报消息,no-resolve",
  
  // 兜底规则
  "GEOIP,LAN,🎯全球直连,no-resolve",
  "GEOIP,CN,🎯全球直连,no-resolve",
  "MATCH,🐟漏网之鱼"
];

// ===================== 代理组通用配置 =====================
const groupBaseOption = {
  "interval": 300,            // 节点检测间隔（5分钟）
  "timeout": 5000,            // 检测超时时间（5秒）
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

  // 1. 覆盖代理组配置（所有图片图标均已保留）
  config["proxy-groups"] = [
    {
      ...groupBaseOption,
      "name": "🌐节点选择",
      "type": "select",
      "proxies": ["♻️延迟选优", "🔯故障转移", "🔮负载均衡·散列", "🔮负载均衡·轮询", "☑️手动切换", "DIRECT"],
      "include-all": false,
      "icon": "https://www.jsdmirror.com/gh/iTaoPu/iCloud@Grey/IconSet/Area.png"
    },
    {
      ...groupBaseOption,
      "name": "☑️手动切换",
      "type": "select",
      "proxies": ["REJECT", "DIRECT"],
      "include-all": true,
      "icon": "https://www.jsdmirror.com/gh/iTaoPu/iCloud@Grey/IconSet/Catnet.png"
    },
    {
      ...groupBaseOption,
      "name": "♻️延迟选优",
      "type": "url-test",
      "tolerance": 100,
      "include-all": true,
      "icon": "https://www.jsdmirror.com/gh/iTaoPu/iCloud@Grey/IconSet/Auto.png"
    },
    {
      ...groupBaseOption,
      "name": "🔯故障转移",
      "type": "fallback",
      "include-all": true,
      "icon": "https://www.jsdmirror.com/gh/iTaoPu/iCloud@Grey/IconSet/ambulance.png"
    },
    {
      ...groupBaseOption,
      "name": "🔮负载均衡·散列",
      "type": "load-balance",
      "strategy": "consistent-hashing",
      "include-all": true,
      "icon": "https://www.jsdmirror.com/gh/iTaoPu/iCloud@Grey/IconSet/merry_go.png"
    },
    {
      ...groupBaseOption,
      "name": "🔮负载均衡·轮询",
      "type": "load-balance",
      "strategy": "round-robin",
      "include-all": true,
      "icon": "https://www.jsdmirror.com/gh/iTaoPu/iCloud@Grey/IconSet/balance.png"
    },
    {
      ...groupBaseOption,
      "name": "🌍国外媒体",
      "type": "select",
      "proxies": ["🌐节点选择", "♻️延迟选优", "🔯故障转移", "🔮负载均衡·散列", "🔮负载均衡·轮询", "☑️手动切换", "🎯全球直连"],
      "include-all": true,
      "icon": "https://www.jsdmirror.com/gh/iTaoPu/iCloud@Grey/IconSet/World_Map.png"
    },
    {
      ...groupBaseOption,
      "name": "📢谷歌服务",
      "type": "select",
      "proxies": ["🌐节点选择", "♻️延迟选优", "🔯故障转移", "🔮负载均衡·散列", "🔮负载均衡·轮询", "☑️手动切换", "🎯全球直连"],
      "include-all": true,
      "icon": "https://www.jsdmirror.com/gh/iTaoPu/iCloud@Grey/IconSet/google.png"
    },
    {
      ...groupBaseOption,
      "name": "Ⓜ️微软服务",
      "type": "select",
      "proxies": ["🎯全球直连", "🌐节点选择", "♻️延迟选优", "🔯故障转移", "🔮负载均衡·散列", "🔮负载均衡·轮询", "☑️手动切换"],
      "include-all": true,
      "icon": "https://www.jsdmirror.com/gh/iTaoPu/iCloud@Grey/IconSet/microsoft.png"
    },
    {
      ...groupBaseOption,
      "name": "🍎苹果服务",
      "type": "select",
      "proxies": ["🌐节点选择", "♻️延迟选优", "🔯故障转移", "🔮负载均衡·散列", "🔮负载均衡·轮询", "☑️手动切换", "🎯全球直连"],
      "include-all": true,
      "icon": "https://www.jsdmirror.com/gh/iTaoPu/iCloud@Grey/IconSet/apple_blue.png"
    },
    {
      ...groupBaseOption,
      "name": "📲电报消息",
      "type": "select",
      "proxies": ["🌐节点选择", "♻️延迟选优", "🔯故障转移", "🔮负载均衡·散列", "🔮负载均衡·轮询", "☑️手动切换", "🎯全球直连"],
      "include-all": true,
      "icon": "https://www.jsdmirror.com/gh/iTaoPu/iCloud@Grey/IconSet/Telegram.png"
    },
    {
      ...groupBaseOption,
      "name": "🎯全球直连",
      "type": "select",
      "proxies": ["DIRECT", "🌐节点选择", "♻️延迟选优", "🔯故障转移", "🔮负载均衡·散列", "🔮负载均衡·轮询", "☑️手动切换"],
      "include-all": true,
      "icon": "https://www.jsdmirror.com/gh/iTaoPu/iCloud@Grey/IconSet/link.png"
    },
    {
      ...groupBaseOption,
      "name": "🛑全球拦截",
      "type": "select",
      "proxies": ["REJECT", "DIRECT"],
      "icon": "https://www.jsdmirror.com/gh/iTaoPu/iCloud@Grey/IconSet/Reject.png"
    },
    {
      ...groupBaseOption,
      "name": "🐟漏网之鱼",
      "type": "select",
      "proxies": ["🌐节点选择", "♻️延迟选优", "🔯故障转移", "🔮负载均衡·散列", "🔮负载均衡·轮询", "☑️手动切换", "🎯全球直连"],
      "include-all": true,
      "icon": "https://www.jsdmirror.com/gh/iTaoPu/iCloud@Grey/IconSet/fish.png"
    }
  ];

  // 2. 覆盖规则集和规则（仅规则集引用 + 兜底）
  config["rule-providers"] = ruleProviders;
  config["rules"] = rules;

  // 3. 设置日志级别（便于排错）
  config["log-level"] = "info";

  // 注意：不修改任何DNS和GEO数据相关配置，保留用户原有设置

  // 返回增强后的配置
  return config;
}
