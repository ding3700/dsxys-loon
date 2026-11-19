# 大师兄影视（dsxys）· Loon 去弹窗插件

针对 **大师兄影视**（`com.dsxys.app`，官网 dsxys.app / tv.ci）的启动推广弹窗做的 Loon 插件。

## 订阅地址

```
https://raw.githubusercontent.com/ding3700/dsxys-loon/main/dsxys-nopopup.plugin
```

## 它去了什么

抓包发现，App 里那个「**酷卡分享，禁止倒卖** / 加入 TG 频道」的弹窗，并不是 App 自己的接口下发的，而是内嵌的第三方 SDK **酷卡（kalert）**：

| 请求 | 作用 |
| --- | --- |
| `https://ioskuka.com/kalert/config5.json` | 弹窗配置：标题、正文、按钮（加入TG频道/官网）、显示策略 `once` |
| `https://ioskuka.com/kalert/status5.json` | SDK 总开关，抓包里是 `"enable": true` |
| `https://ioskuka.com/kalert/event5.php` | 埋点上报（`app_start`），UA 就是 `大师兄影视/17` |

请求头里明确带着 `bundle_id: com.dsxys.app`、`plugin_version: 5.1.0`，配置内容为：

```json
{
  "enable": true,
  "title": "酷卡分享，禁止倒卖",
  "notice": "本插件仅供测试交流使用，请于24小时内删除！资源免费分享，禁止倒卖！",
  "buttons": { "channel": { "title": "加入 TG 频道" }, "feedback": { "title": "加入 TG 群聊" } }
}
```

插件做的事很简单：**在这个 SDK 的几个请求上，于请求阶段直接返回 200 + 合法 JSON，把 `enable` 置为 `false`**。SDK 拿到"未启用"，就不会弹，也不会因为连不上而重试、卡启动。

## 为什么不用 REJECT

REJECT 是直接掐断连接，App 侧会当成"网络失败"，可能重试或等待超时，表现就是**启动变慢、白屏**。
本插件走的是请求阶段伪造应答（`$done({response:{...}})`），秒回，没有等待。

## 没有动的东西（重要）

抓包里另外两条链路看着像广告，其实**是 App 自己的素材 CDN，封了会白屏**，所以插件没有碰：

- `log-alibaba-taobao-douyin.cdn.bcebos.com/do` → 302 跳到 `eliteres.fanruan.com`
- `eliteres.fanruan.com/office/...` → 实测下载下来是 **688×1536 的火焰猴子＋胶片开屏图**，即 App 的启动 logo

同样没有碰：`dsxys.app` / `dsxys.pro` / `dsxys.com`（官网探活）、`tv.ci`（版本配置）、`app2.dsx.ac`（全部业务接口，含排行榜/首页推荐/导航）、`img.meituan.net`（首页 banner 图）、`110.43.121.3/trace`（腾讯云 P2P 加速探测）。

## 安装

1. Loon → 配置 → 插件 → 右上角 `+` → 粘贴上面的订阅地址；
2. 确认已开启 MITM 与证书信任（`ioskuka.com` 会自动追加进 MITM 列表）；
3. 杀掉 App 后台，重新打开。

## 验证是否生效

Loon → 工具 → 网络日志，找 `ioskuka.com/kalert/...`：

- 正常：请求被脚本接管，返回体里 `"enable":false`；
- 若仍返回真实配置（`"enable": true` 且带 TG 按钮）：说明脚本没下载成功或 MITM 未生效，检查插件是否启用、证书是否信任。

## 排障

| 现象 | 原因 / 处理 |
| --- | --- |
| 还会弹窗 | 先看日志里 `config5.json` 的返回体是不是 `enable:false`；不是则脚本未生效（换 WiFi/流量重新拉一次脚本） |
| 弹窗变成空白小框 | 把插件停用再启用一次，让 SDK 重新取配置（本地可能缓存了旧 config） |
| 启动变慢 / 白屏 | 检查是否同时加了 `ioskuka.com` 的 REJECT 规则，两条规则会打架，只保留本插件即可 |
| 首页还有 banner 广告 | 那是 App 业务接口里的 `banners` 字段（走 `app2.dsx.ac`，body 加密），不是这个 SDK，需要另做接口层处理 |
