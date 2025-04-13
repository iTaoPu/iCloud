enable: true
listen: ':53'
enhanced-mode: 'fake-ip'
fake-ip-range: '198.18.0.1/16'
fake-ip-filter-mode: 'blacklist'
prefer-h3: true
respect-rules: true
use-hosts: false
use-system-hosts: false
fake-ip-filter:
  - '+.lan'
  - '+.local'
  - '+.msftconnecttest.com'
  - '+.msftncsi.com'
  - 'localhost.ptlogin2.qq.com'
  - 'localhost.sec.qq.com'
  - 'localhost.work.weixin.qq.com'
default-nameserver:
  - '119.29.29.29'
  - '223.5.5.5'
  - '180.76.76.76'
  - '1.1.1.1'
  - '208.67.222.222'
  - '8.8.8.8'
nameserver:
  - 'https://dns.alidns.com/dns-query'
  - 'https://doh.pub/dns-query'
  - 'https://doh.360.cn/dns-query'
direct-nameserver-follow-policy: false
fallback-filter:
  geoip: true
  geoip-code: 'CN'
  ipcidr:
    - '240.0.0.0/4'
    - '0.0.0.0/32'
  domain:
    - '+.google.com'
    - '+.youtube.com'
fallback:
  - 'https://dns.alidns.com/dns-query'
  - 'https://dns.google/dns-query'
  - 'https://doh.opendns.com/dns-query'
nameserver-policy:
  geosite:geolocation-!cn:
    - 'https://dns.cloudflare.com/dns-query'
    - 'https://dns.google/dns-query'
    - 'https://doh.opendns.com/dns-query'
  private:
    - 'https://dns.alidns.com/dns-query'
    - 'https://doh.pub/dns-query'
    - 'https://doh.360.cn/dns-query'
proxy-server-nameserver:
  - 'https://dns.alidns.com/dns-query'
  - 'https://doh.pub/dns-query'
  - 'https://doh.360.cn/dns-query'
