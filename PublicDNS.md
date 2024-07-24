## **Public anycast resolvers**

These are globally distributed, large-scale DNS resolvers that use anycast routing to direct your DNS queries to the nearest data center.

### AdGuard DNS

[AdGuard DNS](https://adguard-dns.io/welcome.html) is an alternative solution for ad blocking, privacy protection, and parental control. It provides the necessary number of protection features against online ads, trackers, and phishing, no matter what platform and device you use.

#### Default

These servers block ads, tracking, and phishing.

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS, IPv4      | `94.140.14.14` and `94.140.15.15`                  |
| DNS, IPv6      | `2a10:50c0::ad1:ff` and `2a10:50c0::ad2:ff`        |
| DNS-over-HTTPS | `https://dns.adguard-dns.com/dns-query` |
| DNS-over-TLS | `tls://dns.adguard-dns.com` |
| DNS-over-QUIC | `quic://dns.adguard-dns.com` | 
| DNSCrypt, IPv4 | Provider: `2.dnscrypt.default.ns1.adguard.com` IP: `94.140.14.14:5443`  | 
| DNSCrypt, IPv6 | Provider: `2.dnscrypt.default.ns1.adguard.com` IP: `[2a10:50c0::ad1:ff]:5443` |

#### Family Protection

These servers provide the Default features + Blocking adult websites + Safe search.

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS, IPv4      | `94.140.14.15` and `94.140.15.16`                  |
| DNS, IPv6      | `2a10:50c0::bad1:ff` and `2a10:50c0::bad2:ff`      |
| DNS-over-HTTPS | `https://family.adguard-dns.com/dns-query` |
| DNS-over-TLS | `tls://family.adguard-dns.com` |
| DNS-over-QUIC | `quic://family.adguard-dns.com` |
| DNSCrypt, IPv4 | Provider: `2.dnscrypt.family.ns1.adguard.com` IP: `94.140.14.15:5443`| 
| DNSCrypt, IPv6 | Provider: `2.dnscrypt.family.ns1.adguard.com` IP: `[2a10:50c0::bad1:ff]:5443`| 

#### Non-filtering

Each of these servers provides a secure and reliable connection, but unlike the "Standard" and "Family Protection" servers, they don't filter anything.

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS, IPv4      | `94.140.14.140` and `94.140.14.141`                | 
| DNS, IPv6      | `2a10:50c0::1:ff` and `2a10:50c0::2:ff`            | 
| DNS-over-HTTPS | `https://unfiltered.adguard-dns.com/dns-query` | 
| DNS-over-TLS | `tls://unfiltered.adguard-dns.com` | 
| DNS-over-QUIC | `quic://unfiltered.adguard-dns.com` | 
| DNSCrypt, IPv4 | Provider: `2.dnscrypt.unfiltered.ns1.adguard.com` IP: `94.140.14.140:5443`|
| DNSCrypt, IPv6 |  Provider: `2.dnscrypt.unfiltered.ns1.adguard.com` IP: `[2a10:50c0::1:ff]:5443`| 

### Ali DNS

[Ali DNS](https://alidns.com/) is a free recursive DNS service that committed to providing fast, stable and secure DNS resolution for the majority of Internet users. It includes AliGuard facility to protect users from various attacks and threats.

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS, IPv4      | `223.5.5.5` and `223.6.6.6`                        | 
| DNS, IPv6      | `2400:3200::1` and `2400:3200:baba::1`             |
| DNS-over-HTTPS | `https://dns.alidns.com/dns-query` |
| DNS-over-TLS | `tls://dns.alidns.com` | 
| DNS-over-QUIC | `quic://dns.alidns.com:853` | 

### BebasDNS by BebasID

[BebasDNS](https://github.com/bebasid/bebasdns) is a free and neutral public resolver based in Indonesia which supports OpenNIC domain. Created by Komunitas Internet Netral Indonesia (KINI) to serve Indonesian user with free and neutral internet connection.

#### Default

This is the default variant of BebasDNS. This variant blocks ads, malware, and phishing domains.

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS-over-HTTPS | `https://dns.bebasid.com/dns-query` |
| DNS-over-TLS   | `tls://dns.bebasid.com:853` | 
| DNSCrypt, IPv4 | Provider: `2.dnscrypt-cert.dns.bebasid.com` IP: `103.87.68.194:8443` |

#### Unfiltered

This variant doesn't filter anything.

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS-over-HTTPS | `https://dns.bebasid.com/unfiltered` | 
| DNS-over-TLS   | `tls://unfiltered.dns.bebasid.com:853` | 

#### Security

This is the security/antivirus variant of BebasDNS. This variant only blocks malware, and phishing domains.

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS-over-HTTPS | `https://antivirus.bebasid.com/dns-query` | 
| DNS-over-TLS   | `tls://antivirus.bebasid.com:853` | 

#### Family

This is the family variant of BebasDNS. This variant blocks pornography, gambling, hate site, blocks malware, and phishing domains.

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS-over-HTTPS | `https://internetsehat.bebasid.com/dns-query` |
| DNS-over-TLS   | `tls://internetsehat.bebasid.com:853` |
| DNSCrypt, IPv4 | Provider: `2.dnscrypt-cert.internetsehat.bebasid.com` IP: `103.87.68.196:8443` | 

#### Family With Ad Filtering

This is the family variant of BebasDNS but with adblocker

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS-over-HTTPS | `https://internetsehat.bebasid.com/adblock`  | 
| DNS-over-TLS   | `tls://family-adblock.bebasid.com:853`  |

#### OISD Filter

This is a custom BebasDNS variant with only OISD Big filter

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS-over-HTTPS | `https://dns.bebasid.com/dns-oisd`  | 
| DNS-over-TLS   | `tls://oisd.dns.bebasid.com:853`  | 

#### Hagezi Multi Normal Filter

This is a custom BebasDNS variant with only Hagezi Multi Normal filter

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS-over-HTTPS | `https://dns.bebasid.com/dns-hagezi` | 
| DNS-over-TLS   | `tls://hagezi.dns.bebasid.com:853` |

### 0ms DNS

[DNS](https://0ms.dev/) is a global DNS resolution service provided by 0ms Group as an alternative to your current DNS provider.

It uses [OISD Big](https://oisd.nl/) as the basic filter to give everyone a more secure environment.
It is designed with various optimizations, such as HTTP/3, caching, and more.
It leverages machine learning to protect users from potential security threats while also optimizing itself over time.

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS-over-HTTPS | `https://0ms.dev/dns-query` | 

### CFIEC Public DNS

IPv6-based anycast DNS service with strong security capabilities and protection from spyware, malicious websites. It supports DNS64 to provide domain name resolution only for IPv6 users.

| Protocol       | Address                                            | 
|----------------|----------------------------------------------------|
| DNS, IPv6      | `240C::6666` and `240C::6644`                      | 
| DNS-over-HTTPS | `https://dns.cfiec.net/dns-query` |
| DNS-over-TLS | `tls://dns.cfiec.net` | 

### Cisco OpenDNS

[Cisco OpenDNS](https://www.opendns.com/) is a service which extends the DNS by incorporating features such as content filtering and phishing protection with a zero downtime.

#### Standard

DNS servers with custom filtering that protects your device from malware.

| Protocol       | Address                                            | 
|----------------|----------------------------------------------------|
| DNS, IPv4      | `208.67.222.222` and `208.67.220.220`              | 
| DNS, IPv6      | `2620:119:35::35` and `2620:119:53::53`            | 
| DNSCrypt, IPv4 |  Provider: `2.dnscrypt-cert.opendns.com` IP: `208.67.220.220`|
| DNSCrypt, IPv6 |  Provider: `2.dnscrypt-cert.opendns.com` IP: `[2620:0:ccc::2]`|
| DNS-over-HTTPS | `https://doh.opendns.com/dns-query` |
| DNS-over-TLS | `tls://dns.opendns.com` | 

#### FamilyShield

OpenDNS servers that provide adult content blocking.

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS, IPv4      | `208.67.222.123` and `208.67.220.123`              | 
| DNSCrypt, IPv4 | Provider: `2.dnscrypt-cert.opendns.com` IP: `208.67.220.123`| 
| DNS-over-HTTPS | `https://doh.familyshield.opendns.com/dns-query` |
| DNS-over-TLS | `tls://familyshield.opendns.com` |

#### Sandbox

Non-filtering OpenDNS servers.

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS, IPv4      | `208.67.222.2` and `208.67.220.2`                  | 
| DNS, IPv6      | `2620:0:ccc::2` IP: `2620:0:ccd::2`|
| DNS-over-HTTPS | `https://doh.sandbox.opendns.com/dns-query` | 
| DNS-over-TLS | `tls://sandbox.opendns.com` | 


OpenDNS's servers remove the AUTHORITY sections from certain responses, including those with NODATA, which makes caching such responses impossible.


### CleanBrowsing

[CleanBrowsing](https://cleanbrowsing.org/) is a DNS service which provides customizable filtering. This service offers a safe way to browse the web without inappropriate content.

#### Family Filter

Blocks access to all adult, pornographic and explicit sites, including proxy & VPN domains and mixed content sites.

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS, IPv4      | `185.228.168.168` and `185.228.169.168`            | 
| DNS, IPv6      | `2a0d:2a00:1::` and `2a0d:2a00:2::`                |
| DNSCrypt, IPv4 | Provider: `cleanbrowsing.org` IP: `185.228.168.168:8443`|
| DNSCrypt, IPv6 | Provider: `cleanbrowsing.org` IP: `[2a0d:2a00:1::]:8443`|
| DNS-over-HTTPS | `https://doh.cleanbrowsing.org/doh/family-filter/` |
| DNS-over-TLS | `tls://family-filter-dns.cleanbrowsing.org` |

#### Adult Filter

Less restrictive than the Family filter, it only blocks access to adult content and malicious and phishing domains.

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS, IPv4      | `185.228.168.10` and `185.228.169.11`              |
| DNS, IPv6      | `2a0d:2a00:1::1` and `2a0d:2a00:2::1`              | 
| DNSCrypt, IPv4 | Provider: `cleanbrowsing.org` IP: `185.228.168.10:8443`| 
| DNSCrypt, IPv6 | Provider: `cleanbrowsing.org` IP: `[2a0d:2a00:1::1]:8443`| 
| DNS-over-HTTPS | `https://doh.cleanbrowsing.org/doh/adult-filter/`  |
| DNS-over-TLS | `tls://adult-filter-dns.cleanbrowsing.org` |

#### Security Filter

Blocks phishing, spam and malicious domains.

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS, IPv4      | `185.228.168.9` and `185.228.169.9`                | 
| DNS, IPv6      | `2a0d:2a00:1::2` and `2a0d:2a00:2::2`              |
| DNS-over-HTTPS | `https://doh.cleanbrowsing.org/doh/security-filter/` |
| DNS-over-TLS | `tls://security-filter-dns.cleanbrowsing.org` | 

### Cloudflare DNS

[Cloudflare DNS](https://1.1.1.1/) is a free and fast DNS service which functions as a recursive name server providing domain name resolution for any host on the Internet.

#### Standard

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS, IPv4      | `1.1.1.1` and `1.0.0.1`                            | 
| DNS, IPv6      | `2606:4700:4700::1111` and `2606:4700:4700::1001`  |
| DNS-over-HTTPS, IPv4 | `https://dns.cloudflare.com/dns-query` |
| DNS-over-HTTPS, IPv6 | `https://dns.cloudflare.com/dns-query` |
| DNS-over-TLS | `tls://one.one.one.one` |

#### Malware blocking only

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS, IPv4      | `1.1.1.2` and `1.0.0.2`                            | 
| DNS, IPv6      | `2606:4700:4700::1112` and `2606:4700:4700::1002`  |
| DNS-over-HTTPS| `https://security.cloudflare-dns.com/dns-query` | 
| DNS-over-TLS | `tls://security.cloudflare-dns.com` | 

#### Malware and adult content blocking

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS, IPv4      | `1.1.1.3` and `1.0.0.3`                            | 
| DNS, IPv6      | `2606:4700:4700::1113` and `2606:4700:4700::1003`  |
| DNS-over-HTTPS, IPv4 | `https://family.cloudflare-dns.com/dns-query` | 
| DNS-over-TLS | `tls://family.cloudflare-dns.com` |

### Comodo Secure DNS

[Comodo Secure DNS](https://comodo.com/secure-dns/) is a domain name resolution service that resolves your DNS requests through worldwide network of DNS servers. Removes excessive ads and protects from phishing and spyware.

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS, IPv4      | `8.26.56.26` and `8.20.247.20`                     | 
| DNSCrypt, IPv4 | Provider: `2.dnscrypt-cert.shield-2.dnsbycomodo.com` IP: `8.20.247.2`   |

### ControlD

[ControlD](https://controld.com/free-dns) is a customizable DNS service with proxy capabilities. This means it not only blocks things (ads, porn, etc.), but can also unblock websites and services.

#### Non-filtering

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS, IPv4      | `76.76.2.0` and `76.76.10.0`            | 
| IPv6      | `2606:1a40::` and `2606:1a40:1::`            |
| DNS-over-HTTPS | `https://freedns.controld.com/p0`          |
| DNS-over-TLS   | `p0.freedns.controld.com`           | 

#### Block malware

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS, IPv4      | `76.76.2.1`             |
| DNS-over-HTTPS | `https://freedns.controld.com/p1`          |
| DNS-over-TLS   | `tls://p1.freedns.controld.com`           |

#### Block malware + ads

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS, IPv4      | `76.76.2.2`             | 
| DNS-over-HTTPS | `https://freedns.controld.com/p2`          |
| DNS-over-TLS   | `tls://p2.freedns.controld.com`           |

#### Block malware + ads + social

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS, IPv4      | `76.76.2.3`             | 
| DNS-over-HTTPS | `https://freedns.controld.com/p3`          | 
| DNS-over-TLS   | `tls://p3.freedns.controld.com`           | 

### DeCloudUs DNS

[DeCloudUs DNS](https://decloudus.com/) is a DNS service that lets you block anything you wish while by default protecting you and your family from ads, trackers, malware, phishing, malicious sites, and much more.

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNSCrypt, IPv4 | Provider: `2.dnscrypt-cert.DeCloudUs-test` IP: `78.47.212.211:9443`|
| DNSCrypt, IPv6 |  Provider: `2.dnscrypt-cert.DeCloudUs-test` IP: `[2a01:4f8:13a:250b::30]:9443`|
| DNS-over-HTTPS | `https://dns.decloudus.com/dns-query` |
| DNS-over-TLS | `tls://dns.decloudus.com` |

### DNS Privacy

A collaborative open project to promote, implement, and deploy [DNS Privacy](https://dnsprivacy.org/).

#### DNS servers run by the [Stubby developers](https://getdnsapi.net/)

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS-over-TLS | Hostname: `tls://getdnsapi.net` IP: `185.49.141.37` and IPv6: `2a04:b900:0:100::37`  |
| DNS-over-TLS | Provider: `Surfnet` Hostname: `tls://dnsovertls.sinodun.com` IP: `145.100.185.15` and IPv6: `2001:610:1:40ba:145:100:185:15`  | 
| DNS-over-TLS | Provider: `Surfnet` Hostname: `tls://dnsovertls1.sinodun.com` IP: `145.100.185.16` and IPv6: `2001:610:1:40ba:145:100:185:16`  |

#### Other DNS servers with no-logging policy

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS-over-TLS | Provider: `UncensoredDNS` Hostname: `tls://unicast.censurfridns.dk` IP: `89.233.43.71` and IPv6: `2a01:3a0:53:53::0`  | 
| DNS-over-TLS | Provider: `UncensoredDNS` Hostname: `tls://anycast.censurfridns.dk` IP: `91.239.100.100` and IPv6: `2001:67c:28a4::`   |
| DNS-over-TLS | Provider: `dkg` Hostname: `tls://dns.cmrg.net`  IP: `199.58.81.218` and IPv6: `2001:470:1c:76d::53` |
| DNS-over-TLS, IPv4 | Hostname: `tls://dns.larsdebruin.net` IP: `51.15.70.167`  |
| DNS-over-TLS | Hostname: `tls://dns-tls.bitwiseshift.net` IP: `81.187.221.24` and IPv6: `2001:8b0:24:24::24` | 
| DNS-over-TLS | Hostname: `tls://ns1.dnsprivacy.at` IP: `94.130.110.185` and IPv6: `2a01:4f8:c0c:3c03::2`  | 
| DNS-over-TLS | Hostname: `tls://ns2.dnsprivacy.at` IP: `94.130.110.178` and IPv6: `2a01:4f8:c0c:3bfc::2`  | 
| DNS-over-TLS, IPv4 | Hostname: `tls://dns.bitgeek.in` IP: `139.59.51.46`    | 
| DNS-over-TLS | Hostname: `tls://dns.neutopia.org` IP: `89.234.186.112` and IPv6: `2a00:5884:8209::2`    | 
| DNS-over-TLS | Provider: `Go6Lab` Hostname: `tls://privacydns.go6lab.si` and IPv6: `2001:67c:27e4::35`                              |
| DNS-over-TLS | Hostname: `tls://dot.securedns.eu` IP: `146.185.167.43` and IPv6: `2a03:b0c0:0:1010::e9a:3001` |

#### DNS servers with minimal logging/restrictions

These servers use some logging, self-signed certs or no support for strict mode.

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS-over-TLS   | Provider: `NIC Chile` Hostname: `dnsotls.lab.nic.cl` IP: `200.1.123.46` and IPv6: `2001:1398:1:0:200:1:123:46` |
| DNS-over-TLS  | Provider: `OARC` Hostname: `tls-dns-u.odvr.dns-oarc.net` IP: `184.105.193.78` and IPv6: `2620:ff:c000:0:1::64:25`   |

### DNS.SB

[DNS.SB](https://dns.sb/) provides free DNS service without logging and with DNSSEC enabled.

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS, IPv4      | `185.222.222.222` and `45.11.45.11`                | 
| DNS, IPv6      | `2a09::` and `2a11::`                              | 
| DNS-over-HTTPS | `https://doh.dns.sb/dns-query` |
| DNS-over-TLS | `tls://dot.sb` |

### DNSPod Public DNS+

[DNSPod Public DNS+](https://www.dnspod.com/) is a privacy-friendly DNS provider with years of experience in domain name resolution services development, it aims to provide users more rapid, accurate and stable recursive resolution service.

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS, IPv4      | `119.29.29.29` and `119.28.28.28`                  | 
| DNS-over-HTTPS | `https://doh.pub/dns-query` |
| DNS-over-HTTPS | `https://dns.pub/dns-query` | 
| DNS-over-TLS | `tls://dot.pub` | 

### DNSWatchGO

[DNSWatchGO](https://www.watchguard.com/wgrd-products/dnswatchgo) is a DNS service by WatchGuard that prevents people from interacting with malicious content.

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS, IPv4      | `54.174.40.213` and `52.3.100.184`                 | 

### Dyn DNS

[Dyn DNS](https://help.dyn.com/internet-guide-setup/) is a free alternative DNS service by Dyn.

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS, IPv4      | `216.146.35.35` and `216.146.36.36`                | 

### Freenom World

[Freenom World](https://freenom.world/en/index.html) is a free anonymous DNS resolver by Freenom World.

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS, IPv4      | `80.80.80.80` and `80.80.81.81`                    | 

### Google DNS

[Google DNS](https://developers.google.com/speed/public-dns/) is a free, global DNS resolution service that you can use as an alternative to your current DNS provider.

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS, IPv4      | `8.8.8.8` and `8.8.4.4`                            |
| DNS, IPv6      | `2001:4860:4860::8888` and `2001:4860:4860::8844`  |
| DNS-over-HTTPS | `https://dns.google/dns-query` |
| DNS-over-TLS | `tls://dns.google` |

### Hurricane Electric Public Recursor

Hurricane Electric Public Recursor is a free alternative DNS service by Hurricane Electric with anycast.

| Protocol | Address |
|----------------|----------------------------------------------------|
| DNS, IPv4 | `74.82.42.42` |
| DNS, IPv6 | `2001:470:20::2` |
| DNS-over-HTTPS | `https://ordns.he.net/dns-query` | 
| DNS-over-TLS | `tls://ordns.he.net` |

### Mullvad

[Mullvad](https://mullvad.net/en/help/dns-over-https-and-dns-over-tls/) provides publicly accessible DNS with QNAME minimization, endpoints located in Germany, Singapore, Sweden, United Kingdom and United States (Dallas & New York).

#### Non-filtering

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS-over-HTTPS | `https://dns.mullvad.net/dns-query`          | 
| DNS-over-TLS   | `tls://dns.mullvad.net`           | 

#### Ad blocking

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS-over-HTTPS | `https://adblock.dns.mullvad.net/dns-query`          | 
| DNS-over-TLS   | `tls://adblock.dns.mullvad.net`           |

#### Ad + malware blocking

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS-over-HTTPS | `https://base.dns.mullvad.net/dns-query`          | 
| DNS-over-TLS   | `tls://base.dns.mullvad.net`           |

#### Ad + malware + social media blocking

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS-over-HTTPS | `https://extended.dns.mullvad.net/dns-query`          | 
| DNS-over-TLS   | `tls://extended.dns.mullvad.net`           |

#### Ad + malware + adult + gambling blocking

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS-over-HTTPS | `https://family.dns.mullvad.net/dns-query`          | 
| DNS-over-TLS   | `tls://family.dns.mullvad.net`           |

#### Ad + malware + adult + gambling + social media blocking

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS-over-HTTPS | `https://all.dns.mullvad.net/dns-query`          | 
| DNS-over-TLS   | `tls://all.dns.mullvad.net`           | 

### Nawala Childprotection DNS

[Nawala Childprotection DNS](http://nawala.id/) is an anycast Internet filtering system that protects children from inappropriate websites and abusive contents.

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS, IPv4      | `180.131.144.144` and `180.131.145.145`            | 
| DNSCrypt, IPv4 | Provider: `2.dnscrypt-cert.nawala.id` IP: `180.131.144.144`  |

### Neustar Recursive DNS

[Neustar Recursive DNS](https://www.security.neustar/digital-performance/dns-services/recursive-dns) is a free cloud-based recursive DNS service that delivers fast and reliable access to sites and online applications with built-in security and threat intelligence.

#### Reliability & Performance 1

These servers provide reliable and fast DNS lookups without blocking any specific categories.

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS, IPv4      | `156.154.70.1` and `156.154.71.1`                  | 
| DNS, IPv6      | `2610:a1:1018::1` and `2610:a1:1019::1`            | 

#### Reliability & Performance 2

These servers provide reliable and fast DNS lookups without blocking any specific categories and also prevent redirecting NXDomain (non-existent domain) responses to landing pages.

| Protocol       | Address                                            |
| DNS, IPv4      | `156.154.70.5` and `156.154.71.5`                  |
| DNS, IPv6      | `2610:a1:1018::5` and `2610:a1:1019::5`            | 

#### Threat Protection

These servers provide protection against malicious domains and also include "Reliability & Performance" features.

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS, IPv4      | `156.154.70.2` and `156.154.71.2`                  |
| DNS, IPv6      | `2610:a1:1018::2` and `2610:a1:1019::2`            | 

#### Family Secure

These servers provide adult content blocking and also include "Reliability & Performance" + "Threat Protection" features.

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS, IPv4      | `156.154.70.3` and `156.154.71.3`                  |
| DNS, IPv6      | `2610:a1:1018::3` and `2610:a1:1019::3`            |

#### Business Secure

These servers provide blocking unwanted and time-wasting content and also include "Reliability & Performance" + "Threat Protection" + "Family Secure" features.

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS, IPv4      | `156.154.70.4` and `156.154.71.4`                  |
| DNS, IPv6      | `2610:a1:1018::4` and `2610:a1:1019::4`            |

### NextDNS

[NextDNS](https://nextdns.io/) provides publicly accessible non-filtering resolvers without logging in addition to its freemium configurable filtering resolvers with optional logging.

#### Ultra-low latency

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
|DNS-over-HTTPS|`https://dns.nextdns.io` | 
|DNS-over-TLS|`tls://dns.nextdns.io` |

#### Anycast

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
|DNS-over-HTTPS|`https://anycast.dns.nextdns.io` | 
|DNS-over-TLS|`tls://anycast.dns.nextdns.io` |

### OpenBLD.net DNS

[OpenBLD.net DNS](https://openbld.net/) — Anycast/GeoDNS DNS-over-HTTPS, DNS-over-TLS resolvers with blocking: advertising, tracking, adware, malware, malicious activities and phishing companies, blocks ~1M domains. Has 24h/48h logs for DDoS/Flood attack mitigation.

#### Adaptive Filtering (ADA)

Recommended for most users, very flexible filtering with blocking most ads networks, ad-tracking, malware and phishing domains.

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
|DNS-over-HTTPS|`https://ada.openbld.net/dns-query`|

#### Strict Filtering (RIC)

More strictly filtering policies with blocking — ads, marketing, tracking, malware, clickbait, coinhive and phishing domains.

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
|DNS-over-HTTPS|`https://ric.openbld.net/dns-query`|
|DNS-over-TLS|`tls://ric.openbld.net`|

#### dns0.eu

[dns0.eu](https://www.dns0.eu) is a free, sovereign and GDPR-compliant recursive DNS resolver with a strong focus on security to protect the citizens and organizations of the European Union.

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS, IPv4      | `193.110.81.0` and `185.253.5.0`                  |
|DNS-over-HTTPS|`https://zero.dns0.eu/`|
| DNS-over-TLS |`tls://zero.dns0.eu` |
| DNS-over-QUIC | `quic://zero.dns0.eu` |

### Quad9 DNS

[Quad9 DNS](https://quad9.net/) is a free, recursive, anycast DNS platform that provides high-performance, privacy, and security protection from phishing and spyware. Quad9 servers don't provide a censoring component.

#### Standard

Regular DNS servers which provide protection from phishing and spyware. They include blocklists, DNSSEC validation, and other security features.

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS, IPv4      | `9.9.9.9` and `149.112.112.112`                    |
| DNS, IPv6      | `2620:fe::fe` IP: `2620:fe::fe:9`                  |
| DNSCrypt, IPv4 | Provider: `2.dnscrypt-cert.quad9.net` IP: `9.9.9.9:8443`|
| DNSCrypt, IPv6 |  Provider: `2.dnscrypt-cert.quad9.net` IP: `[2620:fe::fe]:8443`  |
| DNS-over-HTTPS | `https://dns.quad9.net/dns-query`  |
| DNS-over-TLS   | `tls://dns.quad9.net`              |

#### Unsecured

Unsecured DNS servers don't provide security blocklists, DNSSEC, or EDNS Client Subnet.

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS, IPv4      | `9.9.9.10` and `149.112.112.10`                    |
| DNS, IPv6      | `2620:fe::10` IP: `2620:fe::fe:10`                               |
| DNSCrypt, IPv4 | Provider: `2.dnscrypt-cert.quad9.net` IP: `9.9.9.10:8443`  |
| DNSCrypt, IPv6 |  Provider: `2.dnscrypt-cert.quad9.net` IP: `[2620:fe::fe:10]:8443`  |
| DNS-over-HTTPS | `https://dns10.quad9.net/dns-query`  |
| DNS-over-TLS   | `tls://dns10.quad9.net`      |

#### [ECS](https://en.wikipedia.org/wiki/EDNS_Client_Subnet) support

EDNS Client Subnet is a method that includes components of end-user IP address data in requests that are sent to authoritative DNS servers. It provides security blocklist, DNSSEC, EDNS Client Subnet.

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS, IPv4      | `9.9.9.11` and `149.112.112.11`                    | 
| DNS, IPv6      | `2620:fe::11` IP: `2620:fe::fe:11`                 | 
| DNSCrypt, IPv4 | Provider: `2.dnscrypt-cert.quad9.net` IP: `9.9.9.11:8443`  |
| DNSCrypt, IPv6 |  Provider: `2.dnscrypt-cert.quad9.net` IP: `[2620:fe::11]:8443`  |
| DNS-over-HTTPS | `https://dns11.quad9.net/dns-query`   |
| DNS-over-TLS   | `tls://dns11.quad9.net`       |

### RethinkDNS

[RethinkDNS](https://www.rethinkdns.com/configure) provides DNS-over-HTTPS service running as Cloudflare Worker and DNS-over-TLS service running as Fly.io Worker with configurable blocklists.

#### Non-filtering

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
|DNS-over-HTTPS|`https://basic.rethinkdns.com/` |
|DNS-over-TLS|`tls://max.rethinkdns.com` |

### Safe DNS

[Safe DNS](https://www.safedns.com/) is a global anycast network which consists of servers located throughout the world — both Americas, Europe, Africa, Australia, and the Far East to ensure a fast and reliable DNS resolving from any point worldwide.

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS, IPv4      | `195.46.39.39` and `195.46.39.40`                  | 

### Safe Surfer

[Safe Surfer](https://www.safesurfer.co.nz/) is a DNS service that blocks 50+ categories like porn, ads, malware, and popular social media sites making web surfing safer.

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS, IPv4      | `104.155.237.225` and `104.197.28.121`             |
| DNSCrypt, IPv4 | Provider: `2.dnscrypt-cert.safesurfer.co.nz` IP: `104.197.28.121`|

### 360 Secure DNS

**360 Secure DNS** is a industry-leading recursive DNS service with advanced network security threat protection.

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS, IPv4      | `101.226.4.6` and `218.30.118.6`                   |
| DNS, IPv4      | `123.125.81.6` and `140.207.198.6`                 |
| DNS-over-HTTPS | `https://doh.360.cn/dns-query` |
| DNS-over-TLS | `tls://dot.360.cn` |

### Verisign Public DNS

[Verisign Public DNS](https://www.verisign.com/security-services/public-dns/) is a free DNS service that offers improved DNS stability and security over other alternatives. Verisign respects users' privacy: they neither sell public DNS data to third parties nor redirect users' queries to serve them ads.

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS, IPv4      | `64.6.64.6` and `64.6.65.6`                        |
| DNS, IPv6      | `2620:74:1b::1:1` and `2620:74:1c::2:2`            |

### Wikimedia DNS

[Wikimedia DNS](https://meta.wikimedia.org/wiki/Wikimedia_DNS) is a caching, recursive, public DoH and DoT resolver service that is run and managed by the Site Reliability Engineering (Traffic) team at the Wikimedia Foundation on all six Wikimedia data centers with anycast.

| Protocol | Address |
|----------------|----------------------------------------------------|
| DNS-over-HTTPS | `https://wikimedia-dns.org/dns-query` |
| DNS-over-TLS | Hostname: `wikimedia-dns.org` IP: `185.71.138.138` and IPv6: `2001:67c:930::1` |

## **Regional resolvers**

Regional DNS resolvers are typically focused on specific geographic regions, offering optimized performance for users in those areas. These resolvers are often operated by non-profit organizations, local ISPs, or other entities.

### Applied Privacy DNS

[Applied Privacy DNS](https://applied-privacy.net/) operates DNS privacy services to help protect DNS traffic and to help diversify the DNS resolver landscape offering modern protocols.

| Protocol | Address |
|----------------|----------------------------------------------------|
| DNS-over-HTTPS | `https://doh.applied-privacy.net/query` |
| DNS-over-TLS | `tls://dot1.applied-privacy.net` |

### ByteDance Public DNS

ByteDance Public DNS is a free alternative DNS service by ByteDance at China. The only DNS currently provided by ByteDance supports IPV4. DOH, DOT, DOQ, and other encrypted DNS services will be launched soon.

| Protocol       | Address                                            |
|----------------|----------------------------------------------------|
| DNS, IPv4      | `180.184.1.1` and `180.184.2.2`                  |

### CIRA Canadian Shield DNS

[CIRA Shield DNS](https://www.cira.ca/cybersecurity-services/canadianshield/how-works) protects against theft of personal and financial data. Keep viruses, ransomware, and other malware out of your home.

#### Private

In "Private" mode, DNS resolution only.

| Protocol | Address |
|----------------|----------------------------------------------------|
| DNS, IPv4 | `149.112.121.10` and `149.112.122.10` |
| DNS, IPv6 | `2620:10A:80BB::10` and `2620:10A:80BC::10` |
| DNS-over-HTTPS | `https://private.canadianshield.cira.ca/dns-query` |
| DNS-over-TLS — Private | Hostname: `tls://private.canadianshield.cira.ca` IP: `149.112.121.10` and IPv6: `2620:10A:80BB::10` |

#### Protected

In "Protected" mode, malware and phishing protection.

| Protocol | Address |
|----------------|----------------------------------------------------|
| DNS, IPv4 | `149.112.121.20` and `149.112.122.20` |
| DNS, IPv6 | `2620:10A:80BB::20` and `2620:10A:80BC::20` |
| DNS-over-HTTPS | `https://protected.canadianshield.cira.ca/dns-query` |
| DNS-over-TLS — Protected | Hostname: `tls://protected.canadianshield.cira.ca` IP: `149.112.121.20` and IPv6: `2620:10A:80BB::20` |

#### Family

In "Family" mode, Protected + blocking adult content.

| Protocol | Address |
|----------------|----------------------------------------------------|
| DNS, IPv4 | `149.112.121.30` and `149.112.122.30` | 
| DNS, IPv6 | `2620:10A:80BB::30` and `2620:10A:80BC::30` |
| DNS-over-HTTPS | `https://family.canadianshield.cira.ca/dns-query` |
| DNS-over-TLS — Family | Hostname: `tls://family.canadianshield.cira.ca` IP: `149.112.121.30` and IPv6: `2620:10A:80BB::30` |

### Comss.one DNS

[Comss.one DNS](https://www.comss.ru/page.php?id=7315) is a fast and secure DNS service with protection against ads, tracking, and phishing.

| Protocol | Address |
|----------------|-------------------------------------|
| DNS-over-HTTPS | `https://dns.controld.com/comss` |
| DNS-over-TLS | `tls://comss.dns.controld.com` |
| DNS-over-QUIC | `quic://comss.dns.controld.com` |

### CZ.NIC ODVR

[CZ.NIC ODVR](https://www.nic.cz/odvr/) CZ.NIC ODVR are Open DNSSEC Validating Resolvers. CZ.NIC neither collect any personal data nor gather information on pages where devices sends personal data.

| Protocol | Address |
|----------------|----------------------------------------------------|
| DNS, IPv4 | `193.17.47.1` and `185.43.135.1` |
| DNS, IPv6 | `2001:148f:ffff::1` and `2001:148f:fffe::1` |
| DNS-over-HTTPS | `https://odvr.nic.cz/doh` |
| DNS-over-TLS | `tls://odvr.nic.cz` |

### Digitale Gesellschaft DNS

[Digitale Gesellschaft](https://www.digitale-gesellschaft.ch/dns/) is a public resolver operated by the Digital Society. Hosted in Zurich, Switzerland.

| Protocol | Address |
|----------------|----------------------------------------------------|
| DNS-over-HTTPS | `https://dns.digitale-gesellschaft.ch/dns-query` IP: `185.95.218.42` and IPv6: `2a05:fc84::42` | 
| DNS-over-TLS | `tls://dns.digitale-gesellschaft.ch` IP: `185.95.218.43` and IPv6: `2a05:fc84::43` |

### DNS for Family

[DNS for Family](https://dnsforfamily.com/) aims to block adult websites. It enables children and adults to surf the Internet safely without worrying about being tracked by malicious websites.

| Protocol | Address |
|----------------|----------------------------------------------------|
| DNS-over-HTTPS | `https://dns-doh.dnsforfamily.com/dns-query` |
| DNS-over-TLS | `tls://dns-dot.dnsforfamily.com` | 
| DNS, IPv4 | `94.130.180.225` and `78.47.64.161` |
| DNS, IPv6 | `2a01:4f8:1c0c:40db::1` and `2a01:4f8:1c17:4df8::1` |
| DNSCrypt, IPv4 | Provider: `dnsforfamily.com` IP: `94.130.180.225`|
| DNSCrypt, IPv6 | Provider: `dnsforfamily.com` IP: `[2a01:4f8:1c0c:40db::1]`|

### Fondation Restena DNS

[Restena DNS](https://www.restena.lu/en/service/public-dns-resolver) servers provided by [Restena Foundation](https://www.restena.lu/).

| Protocol | Address |
|----------------|----------------------------------------------------|
| DNS-over-HTTPS | `https://kaitain.restena.lu/dns-query` IP: `158.64.1.29` and IPv6: `2001:a18:1::29` |
| DNS-over-TLS| `tls://kaitain.restena.lu` IP: `158.64.1.29` and IPv6: `2001:a18:1::29` |

### 114DNS

[114DNS](https://www.114dns.com) is a professional and high-reliability DNS service.

#### Normal

Block ads and annoying websites.

| Protocol | Address |
|----------------|----------------------------------------------------|
| DNS, IPv4 | `114.114.114.114` and `114.114.115.115` | 

#### Safe

Blocks phishing, malicious and other unsafe websites.

| Protocol | Address |
|----------------|----------------------------------------------------|
| DNS, IPv4 | `114.114.114.119` and `114.114.115.119` | 

#### Family

These servers block adult websites and inappropriate contents.

| Protocol | Address |
|----------------|----------------------------------------------------|
| DNS, IPv4 | `114.114.114.110` and `114.114.115.110` |

### IIJ.JP DNS

[IIJ.JP](https://public.dns.iij.jp/) is a public DNS service operated by Internet Initiative Japan. It also blocks child abuse content.

| Protocol | Address |
|----------------|----------------------------------------------------|
| DNS-over-HTTPS | `https://public.dns.iij.jp/dns-query` |
| DNS-over-TLS | `tls://public.dns.iij.jp` |

### JupitrDNS

[JupitrDNS](https://jupitrdns.com/) is a a free recursive DNS service that blocks ads, trackers, and malware. It has DNSSEC support and does not store logs.

| Protocol | Address |
|----------------|----------------------------------------------------|
| DNS, IPv4 | `35.215.30.118` and `35.215.48.207` |
| DNS-over-HTTPS | `https://dns.jupitrdns.com/dns-query` |
| DNS-over-TLS | `tls://dns.jupitrdns.com` |
| DNS-over-QUIC  | `quic://dns.jupitrdns.com` |

### LibreDNS

[LibreDNS](https://libredns.gr/) is a public encrypted DNS service run by [LibreOps](https://libreops.cc/).

| Protocol | Address |
|----------------|----------------------------------------------------|
| DNS, IPv4 | `88.198.92.222` | 
| DNS-over-HTTPS | `https://doh.libredns.gr/dns-query` | 
| DNS-over-HTTPS | `https://doh.libredns.gr/ads` |
| DNS-over-TLS | `tls://dot.libredns.gr` IP: `116.202.176.26` |

### OneDNS

[**OneDNS**](https://www.onedns.net/) is a secure, fast, free niche DNS service with malicious domains blocking facility.

#### Pure Edition

| Protocol | Address |
|----------------|----------------------------------------------------|
| DNS, IPv4 | `117.50.10.10` and `52.80.52.52` | 

#### Block Edition

| Protocol | Address |
|----------------|----------------------------------------------------|
| DNS, IPv4 | `117.50.11.11` and `52.80.66.66` |

### OpenNIC DNS

[OpenNIC DNS](https://www.opennic.org/) is a free alternative DNS service by OpenNIC Project.

| Protocol | Address |
|----------------|----------------------------------------------------|
| DNS, IPv4 | `217.160.70.42` |
| DNS, IPv6 | `2001:8d8:1801:86e7::1` |

This is just one of the available servers, the full list can be found [here](https://servers.opennic.org/).

### Quad101

[Quad101](https://101.101.101.101) is a free alternative DNS service without logging by TWNIC (Taiwan Network Information Center).

| Protocol | Address |
|----------------|----------------------------------------------------|
| DNS, IPv4 | `101.101.101.101` and `101.102.103.104` |
| DNS, IPv6 | `2001:de4::101` and `2001:de4::102` |
| DNS-over-HTTPS | `https://dns.twnic.tw/dns-query` |
| DNS-over-TLS | `tls://101.101.101.101` |

### SkyDNS RU

[SkyDNS](https://www.skydns.ru/en/) solutions for content filtering and internet security.

| Protocol | Address |
|----------------|----------------------------------------------------|
| DNS, IPv4 | `193.58.251.251` |

### SWITCH DNS

[SWITCH DNS](https://www.switch.ch/security/info/public-dns/) is a Swiss public DNS service provided by [switch.ch](https://www.switch.ch/).

| Protocol | Address |
|----------------|----------------------------------------------------|
| DNS, IPv4 | Provider: `dns.switch.ch` IP: `130.59.31.248` |
| DNS, IPv6 | Provider: `dns.switch.ch` IPv6: `2001:620:0:ff::2` |
| DNS-over-HTTPS | `https://dns.switch.ch/dns-query` |
| DNS-over-TLS | Hostname: `tls://dns.switch.ch` IP: `130.59.31.248` and IPv6: `2001:620:0:ff::2` | 

### Yandex DNS

[Yandex.DNS](https://dns.yandex.com/) is a free recursive DNS service. Yandex.DNS' servers are located in Russia, CIS countries, and Western Europe. Users' requests are processed by the nearest data center which provides high connection speeds.

#### Basic

In "Basic" mode, there is no traffic filtering.

| Protocol | Address |
|----------------|----------------------------------------------------|
| DNS, IPv4 | `77.88.8.8` and `77.88.8.1` |
| DNS, IPv6 | `2a02:6b8::feed:0ff` and `2a02:6b8:0:1::feed:0ff` |
| DNS-over-HTTPS | `https://common.dot.dns.yandex.net/dns-query` |
| DNS-over-TLS | `tls://common.dot.dns.yandex.net` |

#### Safe

In "Safe" mode, protection from infected and fraudulent sites is provided.

| Protocol | Address |
|----------------|----------------------------------------------------|
| DNS, IPv4 | `77.88.8.88` and `77.88.8.2` |
| DNS, IPv6 | `2a02:6b8::feed:bad` and `2a02:6b8:0:1::feed:bad` |
| DNS-over-HTTPS | `https://safe.dot.dns.yandex.net/dns-query` |
| DNS-over-TLS | `tls://safe.dot.dns.yandex.net` |

#### Family

In "Family" mode, protection from infected, fraudulent and adult sites is provided.

| Protocol | Address |
|----------------|----------------------------------------------------|
| DNS, IPv4 | `77.88.8.3` and `77.88.8.7` | 
| DNS, IPv6 | `2a02:6b8::feed:a11` and `2a02:6b8:0:1::feed:a11` |
| DNS-over-HTTPS | `https://family.dot.dns.yandex.net/dns-query` | 
| DNS-over-TLS | `tls://family.dot.dns.yandex.net` |

## **Small personal resolvers**

These are DNS resolvers usually run by enthusiasts or small groups. While they may lack the scale and redundancy of larger providers, they often prioritize privacy, transparency, or offer specialized features.

We won't be able to proper monitor their availability. **Use them at your own risk.**

### AhaDNS

[AhaDNS](https://ahadns.com/) A zero-logging and ad-blocking DNS service provided by Fredrik Pettersson.

#### Netherlands

| Protocol | Address |
|----------------|-------------------------------------|
| DNS, IPv4 | `5.2.75.75` |
| DNS, IPv6 | `2a04:52c0:101:75::75` |
| DNS-over-HTTPS | `https://doh.nl.ahadns.net/dns-query` |
| DNS-over-TLS | `tls://dot.nl.ahadns.net` |

#### Los Angeles

| Protocol | Address |
|----------------|-------------------------------------|
| DNS, IPv4 | `45.67.219.208` |
| DNS, IPv6 | `2a04:bdc7:100:70::70` |
| DNS-over-HTTPS | `https://doh.la.ahadns.net/dns-query` |
| DNS-over-TLS | `tls://dot.la.ahadns.net` |

### Arapurayil

[Arapurayil](https://dns.arapurayil.com) is a personal DNS service hosted in Mumbai, India.

Non-logging | Filters ads, trackers, phishing, etc. | DNSSEC | QNAME Minimization | No EDNS Client Subnet.

| Protocol       | Address                    |
|----------------|------------------------------------------------------------------|
| DNSCrypt, IPv4 | Host: `2.dnscrypt-cert.dns.arapurayil.com` IP: `3.7.156.128` |
| DNS-over-HTTPS | Host: `https://dns.arapurayil.com/dns-query`                 |

### Captnemo DNS

[Captnemo DNS](https://captnemo.in/dnscrypt/) is a server running off of a Digital Ocean droplet in BLR1 region. Maintained by Abhay Rana aka Nemo.

| Protocol | Address |
|----------------|----------------------------------------------------|
| DNSCrypt, IPv4 | Provider: `2.dnscrypt-cert.captnemo.in` IP: `139.59.48.222:4434` |

### Dandelion Sprout's Official DNS Server

[Dandelion Sprout's Official DNS Server](https://github.com/DandelionSprout/adfilt/tree/master/Dandelion%20Sprout's%20Official%20DNS%20Server) is a personal DNS service hosted in Trondheim, Norway, using an AdGuard Home infrastructure.

Blocks more ads and malware than AdGuard DNS thanks to more advanced syntax, but goes easier on trackers, and blocks alt-right tabloids and most imageboards. Logging is used to improve its used filterlists (e.g. by unblocking sites that shouldn't have been blocked), and to determine the least bad times for server system updates.

| Protocol       | Address                    |
|----------------|------------------------------------------------------------------|
| DNS-over-HTTPS | `https://dandelionsprout.asuscomm.com:2501/dns-query` |
| DNS-over-TLS   | `tls://dandelionsprout.asuscomm.com:853` |
| DNS-over-QUIC  | `quic://dandelionsprout.asuscomm.com:48582` |
| DNS, IPv4      | Varies; see link above. |
| DNS, IPv6      | Varies; see link above. |
| DNSCrypt, IPv4 | Varies; see link above. |

### DNS Forge

[DNS Forge](https://dnsforge.de/) is a redundant DNS resolver with an ad blocker and no logging provided by [adminforge](https://adminforge.de/).

| Protocol | Address |
|----------------|----------------------------------------------------|
| DNS, IPv4 | `176.9.93.198` and `176.9.1.117` |
| DNS, IPv6 | `2a01:4f8:151:34aa::198` and `2a01:4f8:141:316d::117` |
| DNS-over-HTTPS | `https://dnsforge.de/dns-query` |
| DNS-over-TLS | `tls://dnsforge.de` |

### dnswarden

| Protocol | Address |
|----------------|----------------------------------------------------|
| DNS-over-TLS | `uncensored.dns.dnswarden.com` |
| DNS-over-HTTPS | `https://dns.dnswarden.com/uncensored` |

You can also [configure custom DNS server](https://dnswarden.com/customfilter.html) to block ads or filter adult content.

### FFMUC DNS

[FFMUC](https://ffmuc.net/) free DNS servers provided by Freifunk München.

| Protocol | Address |
|----------------|----------------------------------------------------|
| DNS-over-TLS, IPv4 | Hostname: `tls://dot.ffmuc.net` |
| DNS-over-HTTPS, IPv4 | Hostname: `https://doh.ffmuc.net/dns-query` |
| DNSCrypt, IPv4 | Provider: `2.dnscrypt-cert.ffmuc.net` IP: `5.1.66.255:8443` 
| DNSCrypt, IPv6 | Provider: `2.dnscrypt-cert.ffmuc.net` IP: `[2001:678:e68:f000::]:8443` |

### fvz DNS

[fvz DNS](http://meo.ws/) is a Fusl's public primary OpenNIC Tier2 Anycast DNS Resolver.

| Protocol | Address |
|----------------|----------------------------------------------------|
| DNSCrypt, IPv4 | Provider: `2.dnscrypt-cert.dnsrec.meo.ws` IP: `185.121.177.177:5353` |
| DNSCrypt, IPv4 | Provider: `2.dnscrypt-cert.dnsrec.meo.ws` IP: `169.239.202.202:5353`|

### ibksturm DNS

[ibksturm DNS](https://ibksturm.synology.me/) testing servers provided by ibksturm. OPENNIC, DNSSEC, no filtering, no logging.

| Protocol | Address |
|----------------|----------------------------------------------------|
| DNS-over-TLS, IPv4 | Hostname: `tls://ibksturm.synology.me` IP: `213.196.191.96` |
| DNS-over-QUIC, IPv4 | Hostname: `quic://ibksturm.synology.me` IP: `213.196.191.96` |
| DNS-over-HTTPS, IPv4 | Hostname: `https://ibksturm.synology.me/dns-query` IP: `213.196.191.96` |
| DNSCrypt, IPv4 | Provider: `2.dnscrypt-cert.ibksturm` IP: `213.196.191.96:8443` |

### Lelux DNS

[Lelux.fi](https://lelux.fi/resolver/) is run by Elias Ojala, Finland.

| Protocol | Address |
|----------------|----------------------------------------------------|
| DNS-over-HTTPS | `https://resolver-eu.lelux.fi/dns-query` |
| DNS-over-TLS | `tls://resolver-eu.lelux.fi` |

### OSZX DNS

[OSZX DNS](https://dns.oszx.co/) is a small Ad-Blocking DNS hobby project.

#### OSZX DNS

This service ia a small ad blocking DNS hobby project with D-o-H, D-o-T & DNSCrypt v2 support.

| Protocol | Address |
|----------------|----------------------------------------------------|
| DNS, IPv4 | `51.38.83.141` | 
| DNS, IPv6 | `2001:41d0:801:2000::d64` | 
| DNSCrypt, IPv4 | Provider: `2.dnscrypt-cert.oszx.co` IP: `51.38.83.141:5353`| 
| DNSCrypt, IPv6 | Provider: `2.dnscrypt-cert.oszx.co` IP: `[2001:41d0:801:2000::d64]:5353`|
| DNS-over-HTTPS | `https://dns.oszx.co/dns-query` |
| DNS-over-TLS | `tls://dns.oszx.co` | 

#### PumpleX

These servers provide no ad blocking, keep no logs, and have DNSSEC enabled.

| Protocol | Address |
|----------------|----------------------------------------------------|
| DNS, IPv4 | `51.38.82.198` |
| DNS, IPv6 | `2001:41d0:801:2000::1b28` |
| DNSCrypt, IPv4 | Provider: `2.dnscrypt-cert.pumplex.com` IP: `51.38.82.198:5353`|
| DNSCrypt, IPv6 | Provider: `2.dnscrypt-cert.pumplex.com` IP: `[2001:41d0:801:2000::1b28]:5353`|
| DNS-over-HTTPS | `https://dns.pumplex.com/dns-query` |
| DNS-over-TLS | `tls://dns.pumplex.com` |

### Privacy-First DNS

[Privacy-First DNS](https://tiarap.org/) blocks over 140K ads, ad-tracking, malware and phishing domains. No logging, no ECS, DNSSEC validation, free!

#### Singapore DNS Server

| Protocol | Address |
|----------------|-------------------------------------|
| DNS, IPv4 | `174.138.21.128` |
| DNS, IPv6 | `2400:6180:0:d0::5f6e:4001` |
| DNSCrypt, IPv4 | Provider: `2.dnscrypt-cert.dns.tiar.app` IP: `174.138.21.128`|
| DNSCrypt, IPv6 | Provider: `2.dnscrypt-cert.dns.tiar.app` IP: `[2400:6180:0:d0::5f6e:4001]`|
| DNS-over-HTTPS | `https://doh.tiarap.org/dns-query` (cached via third-party) |
| DNS-over-HTTPS | `https://doh.tiar.app/dns-query` | 
| DNS-over-QUIC | `quic://doh.tiar.app` |
| DNS-over-TLS | `tls://dot.tiar.app` |

#### Japan DNS Server

| Protocol | Address |
|----------------|-------------------------------------|
| DNS, IPv4 | `172.104.93.80` |
| DNS, IPv6 | `2400:8902::f03c:91ff:feda:c514` | 
| DNSCrypt, IPv4 | Provider: `2.dnscrypt-cert.jp.tiar.app` IP: `172.104.93.80`|
| DNSCrypt, IPv6 | Provider: `2.dnscrypt-cert.jp.tiar.app` IP: `[2400:8902::f03c:91ff:feda:c514]`| 
| DNS-over-HTTPS | `https://jp.tiarap.org/dns-query` |
| DNS-over-HTTPS | `https://jp.tiar.app/dns-query` |
| DNS-over-TLS | `tls://jp.tiar.app` |

### Seby DNS

[Seby DNS](https://dns.seby.io/) is a privacy focused DNS service provided by Sebastian Schmidt. No Logging, DNSSEC validation.

#### DNS Server 1

| Protocol | Address |
|----------------|----------------------------------------------------|
| DNS, IPv4 | `45.76.113.31` |
| DNSCrypt, IPv4 | Provider: `2.dnscrypt-cert.dns.seby.io` IP: `45.76.113.31`|
| DNS-over-TLS | `tls://dot.seby.io` |
