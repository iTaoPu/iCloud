// 国内DNS服务器
const domesticNameservers = [
  "https://dns.alidns.com/dns-query", // 阿里公共DNS
  "https://doh.pub/dns-query", // 腾讯DNSPod
];
// 国外DNS服务器
const foreignNameservers = [
  "https://cloudflare-dns.com/dns-query", // Cloudflare DNS
  "https://dns.google/dns-query", // Google DNS
];
// DNS配置
const dnsConfig = {
  "enable": true,
  "listen": "0.0.0.0:1053",
  "ipv6": true,
  "use-system-hosts": false,
  "cache-algorithm": "arc",
  "enhanced-mode": "fake-ip",
  "fake-ip-range": "198.18.0.1/16",
  "fake-ip-filter": [
    // 本地主机/设备
    "+.lan",
    "+.local",
    // Windows网络出现小地球图标
    "+.msftconnecttest.com",
    "+.msftncsi.com",
    // QQ快速登录检测失败
    "localhost.ptlogin2.qq.com",
    "localhost.sec.qq.com",
    // 微信快速登录检测失败
    "localhost.work.weixin.qq.com"
  ],
  "default-nameserver": ["119.29.29.29", "223.5.5.5", "1.1.1.1", "8.8.8.8"],
  "nameserver": [...domesticNameservers, ...foreignNameservers],
  "proxy-server-nameserver": [...domesticNameservers, ...foreignNameservers],
  "nameserver-policy": {
    "geosite:private,cn,geolocation-cn": domesticNameservers,
    "geosite:google,youtube,telegram,gfw,geolocation-!cn": foreignNameservers
  }
};
// 规则集通用配置
const ruleProviderCommon = {
  "type": "http",
  "format": "yaml",
  "interval": 86400
};
// 规则集配置
const ruleProviders = {
  "reject": {
    ...ruleProviderCommon,
    "behavior": "domain",
    "url": "https://fastly.jsdelivr.net/gh/iTaoPu/Clash.Rules@release/reject.txt",
    "path": "./ruleset/loyalsoldier/reject.yaml"
  },
  "icloud": {
    ...ruleProviderCommon,
    "behavior": "domain",
    "url": "https://fastly.jsdelivr.net/gh/iTaoPu/Clash.Rules@release/icloud.txt",
    "path": "./ruleset/loyalsoldier/icloud.yaml"
  },
  "apple": {
    ...ruleProviderCommon,
    "behavior": "domain",
    "url": "https://fastly.jsdelivr.net/gh/iTaoPu/Clash.Rules@release/apple.txt",
    "path": "./ruleset/loyalsoldier/apple.yaml"
  },
  "google": {
    ...ruleProviderCommon,
    "behavior": "domain",
    "url": "https://fastly.jsdelivr.net/gh/iTaoPu/Clash.Rules@release/google.txt",
    "path": "./ruleset/loyalsoldier/google.yaml"
  },
  "proxy": {
    ...ruleProviderCommon,
    "behavior": "domain",
    "url": "https://fastly.jsdelivr.net/gh/iTaoPu/Clash.Rules@release/proxy.txt",
    "path": "./ruleset/loyalsoldier/proxy.yaml"
  },
  "direct": {
    ...ruleProviderCommon,
    "behavior": "domain",
    "url": "https://fastly.jsdelivr.net/gh/iTaoPu/Clash.Rules@release/direct.txt",
    "path": "./ruleset/loyalsoldier/direct.yaml"
  },
  "private": {
    ...ruleProviderCommon,
    "behavior": "domain",
    "url": "https://fastly.jsdelivr.net/gh/iTaoPu/Clash.Rules@release/private.txt",
    "path": "./ruleset/loyalsoldier/private.yaml"
  },
  "gfw": {
    ...ruleProviderCommon,
    "behavior": "domain",
    "url": "https://fastly.jsdelivr.net/gh/iTaoPu/Clash.Rules@release/gfw.txt",
    "path": "./ruleset/loyalsoldier/gfw.yaml"
  },
  "tld-not-cn": {
    ...ruleProviderCommon,
    "behavior": "domain",
    "url": "https://fastly.jsdelivr.net/gh/iTaoPu/Clash.Rules@release/tld-not-cn.txt",
    "path": "./ruleset/loyalsoldier/tld-not-cn.yaml"
  },
  "telegramcidr": {
    ...ruleProviderCommon,
    "behavior": "ipcidr",
    "url": "https://fastly.jsdelivr.net/gh/iTaoPu/Clash.Rules@release/telegramcidr.txt",
    "path": "./ruleset/loyalsoldier/telegramcidr.yaml"
  },
  "cncidr": {
    ...ruleProviderCommon,
    "behavior": "ipcidr",
    "url": "https://fastly.jsdelivr.net/gh/iTaoPu/Clash.Rules@release/cncidr.txt",
    "path": "./ruleset/loyalsoldier/cncidr.yaml"
  },
  "lancidr": {
    ...ruleProviderCommon,
    "behavior": "ipcidr",
    "url": "https://fastly.jsdelivr.net/gh/iTaoPu/Clash.Rules@release/lancidr.txt",
    "path": "./ruleset/loyalsoldier/lancidr.yaml"
  },
  "applications": {
    ...ruleProviderCommon,
    "behavior": "classical",
    "url": "https://fastly.jsdelivr.net/gh/iTaoPu/Clash.Rules@release/applications.txt",
    "path": "./ruleset/loyalsoldier/applications.yaml"
  }
};
// 规则
const rules = [
  // 自定义规则
  "DOMAIN-SUFFIX,googleapis.cn,🌐 节点选择", // Google服务
  "DOMAIN-SUFFIX,gstatic.com,🌐 节点选择", // Google静态资源
  "DOMAIN-SUFFIX,xn--ngstr-lra8j.com,🌐 节点选择", // Google Play下载服务
  "DOMAIN-SUFFIX,github.io,🌐 节点选择", // Github Pages
  "DOMAIN-SUFFIX,coodesker.com,🛑 全球拦截", // 酷呆桌面
  "DOMAIN-SUFFIX,adobe.io,🛑 全球拦截", // Adobe.io
  "DOMAIN-SUFFIX,adobe.com,🛑 全球拦截", // Adobe.com
  // Loyalsoldier 规则集
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
  "RULE-SET,lancidr,🎯 全球直连",
  "RULE-SET,cncidr,🎯 全球直连",
  "RULE-SET,telegramcidr,📲 电报消息",
  // 其他规则
  "GEOIP,LAN,🎯 全球直连",
  "GEOIP,CN,🎯 全球直连",
  "MATCH,🐟 漏网之鱼"
];
// 代理组通用配置
const groupBaseOption = {
  "interval": 300,
  "timeout": 3000,
  "url": "https://www.google.com/generate_204",
  "lazy": true,
  "max-failed-times": 3,
  "hidden": false
};

// 程序入口
function main(config) {
  const proxyCount = config?.proxies?.length ?? 0;
  const proxyProviderCount =
    typeof config?.["proxy-providers"] === "object" ? Object.keys(config["proxy-providers"]).length : 0;
  if (proxyCount === 0 && proxyProviderCount === 0) {
    throw new Error("配置文件中未找到任何代理");
  }

  // 覆盖原配置中DNS配置
  config["dns"] = dnsConfig;

  // 覆盖原配置中的代理组
  config["proxy-groups"] = [
    {
      ...groupBaseOption,
      "name": "🌐 节点选择",
      "type": "select",
      "proxies": ["♻️ 延迟选优", "🔯 故障转移", "🔮 负载均衡·散列", "🔮 负载均衡·轮询", "☑️ 手动切换", "DIRECT"],
      "include-all": false,
      "icon": "https://fastly.jsdelivr.net/gh/iTaoPu/iCloud@Grey/IconSet/Area.png"
    },
    {
      ...groupBaseOption,
      "name": "☑️ 手动切换",
      "type": "select",
      "proxies": ["REJECT", "DIRECT"],
      "include-all": true,
      "icon": "https://fastly.jsdelivr.net/gh/iTaoPu/iCloud@Grey/IconSet/Catnet.png"
    },
    {
      ...groupBaseOption,
      "name": "♻️ 延迟选优",
      "type": "url-test",
      "tolerance": 100,
      "include-all": true,
      "icon": "https://fastly.jsdelivr.net/gh/iTaoPu/iCloud@Grey/IconSet/Auto.png"
    },
    {
      ...groupBaseOption,
      "name": "🔯 故障转移",
      "type": "fallback",
      "include-all": true,
      "icon": "https://fastly.jsdelivr.net/gh/iTaoPu/iCloud@Grey/IconSet/ambulance.png"
    },
    {
      ...groupBaseOption,
      "name": "🔮 负载均衡·散列",
      "type": "load-balance",
      "strategy": "consistent-hashing",
      "include-all": true,
      "icon": "https://fastly.jsdelivr.net/gh/iTaoPu/iCloud@Grey/IconSet/merry_go.png"
    },
    {
      ...groupBaseOption,
      "name": "🔮 负载均衡·轮询",
      "type": "load-balance",
      "strategy": "round-robin",
      "include-all": true,
      "icon": "https://fastly.jsdelivr.net/gh/iTaoPu/iCloud@Grey/IconSet/balance.png"
    },
    {
      ...groupBaseOption,
      "name": "🌍 国外媒体",
      "type": "select",
      "proxies": ["🌐 节点选择", "♻️ 延迟选优", "🔯 故障转移", "🔮 负载均衡·散列", "🔮 负载均衡·轮询", "☑️ 手动切换", "🎯 全球直连"],
      "include-all": true,
      "icon": "https://fastly.jsdelivr.net/gh/iTaoPu/iCloud@Grey/IconSet/World_Map.png"
    },
    {
      ...groupBaseOption,
      "name": "📢 谷歌服务",
      "type": "select",
      "proxies": ["🌐 节点选择", "♻️ 延迟选优", "🔯 故障转移", "🔮 负载均衡·散列", "🔮 负载均衡·轮询", "☑️ 手动切换", "🎯 全球直连"],
      "include-all": true,
      "icon": "https://fastly.jsdelivr.net/gh/iTaoPu/iCloud@Grey/IconSet/google.png"
    },
    {
      ...groupBaseOption,
      "name": "Ⓜ️ 微软服务",
      "type": "select",
      "proxies": ["🎯 全球直连", "🌐 节点选择", "♻️ 延迟选优", "🔯 故障转移", "🔮 负载均衡·散列", "🔮 负载均衡·轮询", "☑️ 手动切换", ],
      "include-all": true,
      "icon": "https://fastly.jsdelivr.net/gh/iTaoPu/iCloud@Grey/IconSet/microsoft.png"
    },
    {
      ...groupBaseOption,
      "name": "🍎 苹果服务",
      "type": "select",
      "proxies": ["🌐 节点选择", "♻️ 延迟选优", "🔯 故障转移", "🔮 负载均衡·散列", "🔮 负载均衡·轮询", "☑️ 手动切换", "🎯 全球直连"],
      "include-all": true,
      "icon": "https://fastly.jsdelivr.net/gh/iTaoPu/iCloud@Grey/IconSet/apple_blue.png"
    },
    {
      ...groupBaseOption,
      "name": "📲 电报消息",
      "type": "select",
      "proxies": ["🌐 节点选择", "♻️ 延迟选优", "🔯 故障转移", "🔮 负载均衡·散列", "🔮 负载均衡·轮询", "☑️ 手动切换", "🎯 全球直连"],
      "include-all": true,
      "icon": "https://fastly.jsdelivr.net/gh/iTaoPu/iCloud@Grey/IconSet/Telegram.png"
    },
    {
      ...groupBaseOption,
      "name": "🎯 全球直连",
      "type": "select",
      "proxies": ["DIRECT", "🌐 节点选择", "♻️ 延迟选优", "🔯 故障转移", "🔮 负载均衡·散列", "🔮 负载均衡·轮询", "☑️ 手动切换", ],
      "include-all": true,
      "icon": "https://fastly.jsdelivr.net/gh/iTaoPu/iCloud@Grey/IconSet/link.png"
    },
    {
      ...groupBaseOption,
      "name": "🛑 全球拦截",
      "type": "select",
      "proxies": ["REJECT", "DIRECT"],
      "icon": "https://fastly.jsdelivr.net/gh/iTaoPu/iCloud@Grey/IconSet/Reject.png"
    },
    {
      ...groupBaseOption,
      "name": "🍃 应用净化",
      "type": "select",
      "proxies": ["REJECT", "DIRECT"],
      "icon": "https://fastly.jsdelivr.net/gh/iTaoPu/iCloud@Grey/IconSet/Hijacking.png"
    },
    {
      ...groupBaseOption,
      "name": "🐟 漏网之鱼",
      "type": "select",
      "proxies": ["🌐 节点选择", "♻️ 延迟选优", "🔯 故障转移", "🔮 负载均衡·散列", "🔮 负载均衡·轮询", "☑️ 手动切换", "🎯 全球直连"],
      "include-all": true,
      "icon": "https://fastly.jsdelivr.net/gh/iTaoPu/iCloud@Grey/IconSet/fish.png"
    }
  ];

  // 覆盖原配置中的规则
  config["rule-providers"] = ruleProviders;
  config["rules"] = rules;

  // 返回修改后的配置
  return config;

}
