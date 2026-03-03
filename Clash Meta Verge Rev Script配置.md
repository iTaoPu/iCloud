/**
 * Clash Verge 全局扩展脚本 - 完整版（防DNS泄露+GEO资源自动更新）
 * 核心功能：
 * 1. 彻底防DNS泄露（redir-host模式，兼容所有Clash核心）
 * 2. 精细化规则路由（远程规则集+自定义规则）
 * 3. 多类型代理组（延迟选优/故障转移/负载均衡等）
 * 4. GEO资源自动更新（24小时更新，规则库最新）
 * 适配环境：Clash Verge（所有版本）
 */

// ===================== 基础配置 - DNS服务器列表（中文注释） =====================
// 国内DNS服务器(DoH加密协议，防污染，解析国内域名)
var domesticDnsList = [
  "https://dns.alidns.com/dns-query", // 阿里公共DNS（稳定）
  "https://doh.pub/dns-query",        // 腾讯DNSPod DNS（国内速度快）
  "https://doh.360.cn/dns-query"      // 360安全DNS（备用，防劫持）
];

// 国外DNS服务器(DoH加密协议，解析境外域名，防DNS污染)
var foreignDnsList = [
  "https://mozilla.cloudflare-dns.com/dns-query", // Cloudflare DNS(1.1.1.1)
  "https://dns.google/dns-query",         // Google DNS(8.8.8.8)
  "https://dns.quad9.net/dns-query"       // Quad9 DNS(9.9.9.9，防恶意域名)
];

// ===================== 核心配置1 - DNS防泄露（重中之重，中文注释） =====================
var dnsProtectConfig = {
  "enable": true,                      // 启用自定义DNS（必须开启，接管所有DNS请求）
  "listen": "0.0.0.0:1053",            // 监听本地DNS端口，拦截所有系统DNS请求
  "ipv6": true,                        // 支持IPv6（防止IPv6通道导致DNS泄露）
  "use-system-hosts": false,           // 不使用系统hosts（避免系统DNS介入解析）
  "cache": true,                       // 启用DNS缓存（减少重复解析，提升速度）
  "cache-size": 4096,                  // 缓存容量（4096条，兼顾性能和内存占用）
  "cache-algorithm": "arc",            // 缓存算法（ARC：高效回收，适合DNS场景）
  "cache-ttl": {                       // 缓存有效期（控制解析结果刷新频率）
    "min": 3600,                       // 最短缓存1小时（避免频繁解析）
    "max": 86400                       // 最长缓存24小时（保证解析结果新鲜）
  },
  "enhanced-mode": "redir-host",       // 防泄露核心模式（redir-host，兼容所有核心，解决invalid mode报错）
  "default-nameserver": ["119.29.29.29", "223.5.5.5", "180.76.76.76"], // 基础DNS（仅解析DNS服务器自身域名）
  "disable-system-dns": true,          // 禁止回退到系统DNS（核心防泄露，杜绝系统层面解析）
  "nameserver": domesticDnsList,       // 主DNS：国内域名优先用国内DNS解析
  "fallback": foreignDnsList,          // 备用DNS：境外域名用国外DNS解析
  "fallback-filter": {                 // Fallback触发条件（精准控制境外解析逻辑）
    "geoip": true,                     // 按IP归属地判断（非中国IP走fallback）
    "geoip-code": "CN",                // 明确指定“中国”为判断基准
    "geosite": [                       // 这些境外域名直接走fallback解析
      "geolocation-!cn", "gfw", "google", "youtube", "github", "telegram"
    ],
    "ipcidr": [                        // 私有IP段不走fallback（内网解析）
      "0.0.0.0/8", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "127.0.0.0/8", "fc00::/7", "fe80::/10"
    ],
    "domain": [                        // 敏感境外域名单独指定fallback
      "+.google.com", "+.youtube.com", "+.github.com", "+.telegram.org"
    ],
    "skip-fake-ip": false,             // Fake-IP域名也应用fallback过滤（当前模式为redir-host，此配置不生效）
    "skip-cache": false                // 缓存结果也应用过滤（防止缓存污染）
  },
  "proxy-server-nameserver": foreignDnsList, // 代理节点域名专用DNS（避免节点域名被污染）
  "nameserver-policy": {               // 精细化DNS路由（不同域名走不同DNS）
    "geosite:geolocation-!cn": foreignDnsList, // 境外域名用国外DNS
    "geosite:gfw": ["https://cloudflare-dns.com/dns-query"], // GFW域名用Cloudflare DNS
    "geosite:telegram": ["https://dns.google/dns-query"],    // 电报域名用Google DNS
    "geosite:cn": domesticDnsList,     // 国内域名用国内DNS
    "geosite:private": ["localhost"],  // 内网域名本地解析
    "geosite:category-ads-all": ["reject"] // 广告域名直接拒绝解析
  },
  "independent-cache": true,           // 不同DNS服务器独立缓存（防止缓存污染）
  "ipv6-lookup": true,                // IPv6主动解析（根据网络环境可调整）
  "use-hosts": false                   // 禁用hosts（双重保证不使用系统解析）
};

// ===================== 核心配置2 - 远程规则集（中文注释） =====================
var ruleProviders = {
  "reject": {          // 拦截规则（广告/恶意/跟踪域名）
    "type": "http",    // 远程规则集类型（HTTP拉取）
    "format": "yaml",  // 规则格式（YAML）
    "interval": 86400, // 更新间隔（24小时，单位：秒）
    "behavior": "domain", // 匹配方式：域名匹配
    "url": "https://cdn.jsdmirror.com/gh/Loyalsoldier/clash-rules@release/reject.txt", // 规则地址（国内镜像）
    "path": "./ruleset/loyalsoldier/reject.yaml" // 本地缓存路径
  },
  "icloud": {          // iCloud专属规则（苹果云服务）
    "type": "http",
    "format": "yaml",
    "interval": 86400,
    "behavior": "domain",
    "url": "https://cdn.jsdmirror.com/gh/Loyalsoldier/clash-rules@release/icloud.txt",
    "path": "./ruleset/loyalsoldier/icloud.yaml"
  },
  "apple": {           // 苹果服务专属规则（App Store/Apple Music等）
    "type": "http",
    "format": "yaml",
    "interval": 86400,
    "behavior": "domain",
    "url": "https://cdn.jsdmirror.com/gh/Loyalsoldier/clash-rules@release/apple.txt",
    "path": "./ruleset/loyalsoldier/apple.yaml"
  },
  "google": {          // 谷歌服务专属规则（Google/YouTube/Gmail等）
    "type": "http",
    "format": "yaml",
    "interval": 86400,
    "behavior": "domain",
    "url": "https://cdn.jsdmirror.com/gh/Loyalsoldier/clash-rules@release/google.txt",
    "path": "./ruleset/loyalsoldier/google.yaml"
  },
  "proxy": {           // 需代理的通用域名规则（境外常用服务）
    "type": "http",
    "format": "yaml",
    "interval": 86400,
    "behavior": "domain",
    "url": "https://cdn.jsdmirror.com/gh/Loyalsoldier/clash-rules@release/proxy.txt",
    "path": "./ruleset/loyalsoldier/proxy.yaml"
  },
  "direct": {          // 直连的通用域名规则（国内常用服务）
    "type": "http",
    "format": "yaml",
    "interval": 86400,
    "behavior": "domain",
    "url": "https://cdn.jsdmirror.com/gh/Loyalsoldier/clash-rules@release/direct.txt",
    "path": "./ruleset/loyalsoldier/direct.yaml"
  },
  "private": {         // 内网域名规则（局域网设备/私有域名）
    "type": "http",
    "format": "yaml",
    "interval": 86400,
    "behavior": "domain",
    "url": "https://cdn.jsdmirror.com/gh/Loyalsoldier/clash-rules@release/private.txt",
    "path": "./ruleset/loyalsoldier/private.yaml"
  },
  "gfw": {             // GFW名单域名规则（需代理的敏感域名）
    "type": "http",
    "format": "yaml",
    "interval": 86400,
    "behavior": "domain",
    "url": "https://cdn.jsdmirror.com/gh/Loyalsoldier/clash-rules@release/gfw.txt",
    "path": "./ruleset/loyalsoldier/gfw.yaml"
  },
  "tld-not-cn": {      // 非中国顶级域名规则（如.com/.org/.io等境外顶级域）
    "type": "http",
    "format": "yaml",
    "interval": 86400,
    "behavior": "domain",
    "url": "https://cdn.jsdmirror.com/gh/Loyalsoldier/clash-rules@release/tld-not-cn.txt",
    "path": "./ruleset/loyalsoldier/tld-not-cn.yaml"
  },
  "telegramcidr": {    // 电报IP段规则（Telegram服务器IP）
    "type": "http",
    "format": "yaml",
    "interval": 86400,
    "behavior": "ipcidr", // 匹配方式：IP段匹配
    "url": "https://cdn.jsdmirror.com/gh/Loyalsoldier/clash-rules@release/telegramcidr.txt",
    "path": "./ruleset/loyalsoldier/telegramcidr.yaml"
  },
  "cncidr": {          // 中国IP段规则（国内服务器IP）
    "type": "http",
    "format": "yaml",
    "interval": 86400,
    "behavior": "ipcidr",
    "url": "https://cdn.jsdmirror.com/gh/Loyalsoldier/clash-rules@release/cncidr.txt",
    "path": "./ruleset/loyalsoldier/cncidr.yaml"
  },
  "lancidr": {         // 局域网IP段规则（192.168/10/172等内网IP）
    "type": "http",
    "format": "yaml",
    "interval": 86400,
    "behavior": "ipcidr",
    "url": "https://cdn.jsdmirror.com/gh/Loyalsoldier/clash-rules@release/lancidr.txt",
    "path": "./ruleset/loyalsoldier/lancidr.yaml"
  },
  "applications": {    // 应用专属规则（按应用类型匹配）
    "type": "http",
    "format": "yaml",
    "interval": 86400,
    "behavior": "classical", // 匹配方式：经典规则（域名/IP/端口）
    "url": "https://cdn.jsdmirror.com/gh/Loyalsoldier/clash-rules@release/applications.txt",
    "path": "./ruleset/loyalsoldier/applications.yaml"
  }
};

// ===================== 核心配置3 - 自定义规则（中文注释） =====================
var customRules = [
  // DNS防泄露专用规则（确保DNS相关域名直连，避免代理解析DNS）
  "DOMAIN,clash.razord.top,🎯 全球直连",    // Clash官方域名
  "DOMAIN,yacd.haishan.me,🎯 全球直连",    // YACD面板域名
  "DOMAIN-SUFFIX,dns-query,🎯 全球直连",   // DNS查询域名
  
  // 自定义域名规则（精准匹配常用域名，优先级高于规则集）
  "DOMAIN-SUFFIX,googleapis.cn,🌐 节点选择",    // Google国内服务（需代理）
  "DOMAIN-SUFFIX,gstatic.com,🌐 节点选择",      // Google静态资源（需代理）
  "DOMAIN-SUFFIX,xn--ngstr-lra8j.com,🌐 节点选择", // Google Play（需代理）
  "DOMAIN-SUFFIX,github.io,🌐 节点选择",        // Github Pages（需代理）
  "DOMAIN-SUFFIX,coodesker.com,🛑 全球拦截",    // 酷呆桌面（拦截）
  "DOMAIN-SUFFIX,adobe.io,🛑 全球拦截",         // Adobe.io（拦截）
  "DOMAIN-SUFFIX,adobe.com,🛑 全球拦截",        // Adobe官网（拦截）
  "DOMAIN-SUFFIX,jsdmirror.com,🎯 全球直连",    // JSDMirror.COM（国内镜像，直连）
  "DOMAIN-SUFFIX,jsdmirror.cn,🎯 全球直连",     // JSDMirror.CN（国内镜像，直连）
  
  // 规则集引用（按优先级加载，从上到下优先级递减）
  "RULE-SET,applications,🎯 全球直连",    // 应用规则→直连
  "RULE-SET,private,🎯 全球直连",         // 内网规则→直连
  "RULE-SET,reject,🍃 应用净化",          // 拦截规则→净化（拒绝访问）
  "RULE-SET,icloud,🍎 苹果服务",          // iCloud规则→苹果服务组
  "RULE-SET,apple,🍎 苹果服务",           // 苹果规则→苹果服务组
  "RULE-SET,google,📢 谷歌服务",          // 谷歌规则→谷歌服务组
  "RULE-SET,proxy,🌐 节点选择",           // 代理规则→节点选择组
  "RULE-SET,gfw,🌐 节点选择",             // GFW规则→节点选择组
  "RULE-SET,tld-not-cn,🌐 节点选择",      // 非中国顶级域→节点选择组
  "RULE-SET,direct,🎯 全球直连",          // 直连规则→直连组
  "RULE-SET,lancidr,🎯 全球直连",         // 局域网IP→直连组
  "RULE-SET,cncidr,🎯 全球直连",          // 中国IP→直连组
  "RULE-SET,telegramcidr,📲 电报消息",    // 电报IP→电报组
  
  // 兜底规则（最后匹配，确保所有流量都有路由策略）
  "GEOIP,LAN,🎯 全球直连",    // 局域网IP→直连
  "GEOIP,CN,🎯 全球直连",     // 中国IP→直连
  "MATCH,🐟 漏网之鱼"         // 所有未匹配流量→漏网之鱼组
];

// ===================== 工具函数 - 创建代理组（中文注释） =====================
/**
 * 创建代理组的工具函数（简化重复配置）
 * @param {string} name - 代理组名称（显示名称）
 * @param {string} type - 代理组类型（select/url-test/fallback/load-balance等）
 * @param {array} proxies - 包含的子节点/子组列表
 * @param {string} icon - 代理组图标URL（Clash Verge显示）
 * @param {boolean} includeAll - 是否包含所有代理节点
 * @returns {object} 代理组配置对象
 */
function createProxyGroup(name, type, proxies, icon, includeAll) {
  // 代理组通用配置（所有组共享）
  var baseConfig = {
    "name": name,                // 组名称（显示在界面）
    "type": type,                // 组类型（select：手动选择；url-test：延迟选优；fallback：故障转移等）
    "proxies": proxies || [],    // 包含的子节点/子组
    "include-all": includeAll || false, // 是否包含所有代理节点（true则自动加入所有节点）
    "interval": 300,             // 节点检测间隔（5分钟，单位：秒）
    "timeout": 3000,             // 检测超时时间（3秒，单位：毫秒）
    "url": "https://www.google.com/generate_204", // 检测URL（204空响应，快速检测）
    "lazy": true,                // 懒加载（仅使用时检测，节省资源）
    "max-failed-times": 3,       // 最大失败次数（超过则禁用节点）
    "hidden": false,             // 是否隐藏该组（false：显示）
    "icon": icon || ""           // 组图标（Clash Verge界面显示）
  };
  // 负载均衡组默认策略（避免后置赋值失效）
  if (type === "load-balance") {
    baseConfig.strategy = "round-robin"; // 默认轮询策略
  }
  return baseConfig;
}

// ===================== 核心配置4 - 代理组（中文注释） =====================
var proxyGroups = [
  // 核心选择组（总入口，手动选择不同策略）
  createProxyGroup("🌐 节点选择", "select", ["♻️ 延迟选优", "🔯 故障转移", "🔮 负载均衡·散列", "🔮 负载均衡·轮询", "☑️ 手动切换", "DIRECT"], "https://cdn.jsdmirror.com/gh/iTaoPu/iCloud@Grey/IconSet/Area.png", false),
  // 手动切换组（自由选择单个节点）
  createProxyGroup("☑️ 手动切换", "select", ["REJECT", "DIRECT"], "https://cdn.jsdmirror.com/gh/iTaoPu/iCloud@Grey/IconSet/Catnet.png", true),
  // 延迟选优组（自动选择最低延迟节点）
  createProxyGroup("♻️ 延迟选优", "url-test", [], "https://cdn.jsdmirror.com/gh/iTaoPu/iCloud@Grey/IconSet/Auto.png", true),
  // 故障转移组（节点不可用时自动切换下一个）
  createProxyGroup("🔯 故障转移", "fallback", [], "https://cdn.jsdmirror.com/gh/iTaoPu/iCloud@Grey/IconSet/ambulance.png", true),
  // 负载均衡·散列（按请求哈希分配，同一客户端固定节点）
  createProxyGroup("🔮 负载均衡·散列", "load-balance", [], "https://cdn.jsdmirror.com/gh/iTaoPu/iCloud@Grey/IconSet/merry_go.png", true),
  // 负载均衡·轮询（按顺序分配，均匀使用所有节点）
  createProxyGroup("🔮 负载均衡·轮询", "load-balance", [], "https://cdn.jsdmirror.com/gh/iTaoPu/iCloud@Grey/IconSet/balance.png", true),
  // 国外媒体组（专属境外媒体服务）
  createProxyGroup("🌍 国外媒体", "select", ["🌐 节点选择", "♻️ 延迟选优", "🔯 故障转移", "🔮 负载均衡·散列", "🔮 负载均衡·轮询", "☑️ 手动切换", "🎯 全球直连"], "https://cdn.jsdmirror.com/gh/iTaoPu/iCloud@Grey/IconSet/World_Map.png", true),
  // 谷歌服务组（专属谷歌系服务）
  createProxyGroup("📢 谷歌服务", "select", ["🌐 节点选择", "♻️ 延迟选优", "🔯 故障转移", "🔮 负载均衡·散列", "🔮 负载均衡·轮询", "☑️ 手动切换", "🎯 全球直连"], "https://cdn.jsdmirror.com/gh/iTaoPu/iCloud@Grey/IconSet/google.png", true),
  // 微软服务组（专属微软系服务）
  createProxyGroup("Ⓜ️ 微软服务", "select", ["🎯 全球直连", "🌐 节点选择", "♻️ 延迟选优", "🔯 故障转移", "🔮 负载均衡·散列", "🔮 负载均衡·轮询", "☑️ 手动切换"], "https://cdn.jsdmirror.com/gh/iTaoPu/iCloud@Grey/IconSet/microsoft.png", true),
  // 苹果服务组（专属苹果系服务）
  createProxyGroup("🍎 苹果服务", "select", ["🌐 节点选择", "♻️ 延迟选优", "🔯 故障转移", "🔮 负载均衡·散列", "🔮 负载均衡·轮询", "☑️ 手动切换", "🎯 全球直连"], "https://cdn.jsdmirror.com/gh/iTaoPu/iCloud@Grey/IconSet/apple_blue.png", true),
  // 电报组（专属Telegram服务）
  createProxyGroup("📲 电报消息", "select", ["🌐 节点选择", "♻️ 延迟选优", "🔯 故障转移", "🔮 负载均衡·散列", "🔮 负载均衡·轮询", "☑️ 手动切换", "🎯 全球直连"], "https://cdn.jsdmirror.com/gh/iTaoPu/iCloud@Grey/IconSet/Telegram.png", true),
  // 直连组（优先直连，备用代理）
  createProxyGroup("🎯 全球直连", "select", ["DIRECT", "🌐 节点选择", "♻️ 延迟选优", "🔯 故障转移", "🔮 负载均衡·散列", "🔮 负载均衡·轮询", "☑️ 手动切换"], "https://cdn.jsdmirror.com/gh/iTaoPu/iCloud@Grey/IconSet/link.png", true),
  // 拦截组（拒绝访问指定域名/IP）
  createProxyGroup("🛑 全球拦截", "select", ["REJECT", "DIRECT"], "https://cdn.jsdmirror.com/gh/iTaoPu/iCloud@Grey/IconSet/Reject.png"),
  // 净化组（拦截广告/恶意请求）
  createProxyGroup("🍃 应用净化", "select", ["REJECT", "DIRECT"], "https://cdn.jsdmirror.com/gh/iTaoPu/iCloud@Grey/IconSet/Hijacking.png"),
  // 兜底组（所有未匹配流量）
  createProxyGroup("🐟 漏网之鱼", "select", ["🌐 节点选择", "♻️ 延迟选优", "🔯 故障转移", "🔮 负载均衡·散列", "🔮 负载均衡·轮询", "☑️ 手动切换", "🎯 全球直连"], "https://cdn.jsdmirror.com/gh/iTaoPu/iCloud@Grey/IconSet/fish.png", true)
];

// 补充特殊代理组的专属配置（精细化调整）
proxyGroups[2].tolerance = 100;                // 延迟选优：容差100ms（延迟相差≤100ms视为同等）
proxyGroups[4].strategy = "consistent-hashing"; // 散列负载均衡：一致性哈希策略（固定客户端→节点）
proxyGroups[5].strategy = "round-robin";        // 轮询负载均衡：轮询策略（依次使用节点）

// ===================== 主函数 - 脚本入口（中文注释） =====================
function main(config) {
  // 1. 基础校验：确保配置中有代理节点/提供商（避免脚本无效）
  var proxyCount = config.proxies ? config.proxies.length : 0; // 本地节点数量
  var proxyProviderCount = 0;
  if (config["proxy-providers"] && typeof config["proxy-providers"] === "object") {
    proxyProviderCount = Object.keys(config["proxy-providers"]).length; // 远程节点提供商数量
  }
  // 无代理节点则抛出错误（提示用户先配置节点）
  if (proxyCount === 0 && proxyProviderCount === 0) {
    throw new Error("配置文件中未找到任何代理节点/提供商，请先配置代理！");
  }

  // 2. 覆盖核心配置（按优先级替换默认配置）
  config["dns"] = dnsProtectConfig;                // DNS防泄露配置
  config["proxy-groups"] = proxyGroups;            // 代理组配置
  config["rule-providers"] = ruleProviders;        // 规则集配置
  config["rules"] = customRules;                   // 自定义规则

  // 3. 安全增强配置（提升隐私和稳定性）
  config["allow-lan"] = false;                     // 关闭局域网访问（防止DNS被监听）
  config["log-level"] = "warning";                 // 降低日志级别（减少信息泄露，仅显示警告/错误）
  config["external-controller"] = "127.0.0.1:9090";// 仅本地访问控制端（防止远程控制）

  // 4. 启用GEO资源：启用geodata模式并指定数据库下载地址（用户要求新增）
  config["geodata-mode"] = true;
  config["geox-url"] = {
    geoip: "https://cdn.jsdmirror.com/gh/Loyalsoldier/v2ray-rules-dat@release/geoip.dat",       // IP归属地数据库
    geosite: "https://cdn.jsdmirror.com/gh/Loyalsoldier/v2ray-rules-dat@release/geosite.dat",   // 域名分类数据库
    mmdb: "https://cdn.jsdmirror.com/gh/MetaCubeX/meta-rules-dat@release/country-lite.mmdb",    // 轻量IP数据库
    asn: "https://cdn.jsdmirror.com/gh/MetaCubeX/meta-rules-dat@release/GeoLite2-ASN.mmdb"      // ASN运营商数据库
  };
  // 设置GEO资源自动更新间隔（单位：小时），24小时更新一次（仅Clash Meta核心支持）
  config["geodata-update-interval"] = 24;

  // 5. 返回增强后的配置（Clash Verge必须返回最终配置）
  return config;
}
