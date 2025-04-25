default-nameserver:
- 119.29.29.29
- 223.5.5.5
- 1.1.1.1
- 8.8.8.8
direct-nameserver-follow-policy: false
enable: true
enhanced-mode: fake-ip
fake-ip-filter:
- +.lan
- +.local
- +.msftconnecttest.com
- +.msftncsi.com
- localhost.ptlogin2.qq.com
- localhost.sec.qq.com
- localhost.work.weixin.qq.com
fake-ip-filter-mode: blacklist
fake-ip-range: 198.18.0.1/16
fallback:
- https://dns.alidns.com/dns-query
- https://dns.google/dns-query
fallback-filter:
  domain:
  - +.google.com
  - +.youtube.com
  geoip: true
  geoip-code: CN
  ipcidr:
  - 240.0.0.0/4
  - 0.0.0.0/32
listen: :53
nameserver:
- https://dns.alidns.com/dns-query
- https://doh.pub/dns-query
nameserver-policy:
  geosite:geolocation-!cn:
  - https://cloudflare-dns.com/dns-query
  - https://dns.google/dns-query
  private:
  - https://dns.alidns.com/dns-query
  - https://doh.pub/dns-query
prefer-h3: true
proxy-server-nameserver:
- https://dns.alidns.com/dns-query
- https://doh.pub/dns-query
respect-rules: true
use-hosts: false
use-system-hosts: false
