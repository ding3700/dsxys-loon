# 大师兄影视（dsxys）· Loon 去弹窗插件

针对 **大师兄影视**（`com.dsxys.app`，官网 dsxys.app / tv.ci）的启动弹窗做的 Loon 插件。

## 订阅地址

```
https://raw.githubusercontent.com/ding3700/dsxys-loon/main/dsxys-nopopup.plugin
```

## 去掉的三类弹窗

### ① 酷卡（kalert）推广弹窗

第三方 SDK，配置里写着「酷卡分享，禁止倒卖」「加入 TG 频道」，请求头带着 `bundle_id: com.dsxys.app`：

| 请求 | 作用 |
| --- | --- |
| `ioskuka.com/kalert/config5.json` | 弹窗标题、正文、按钮、显示策略 |
| `ioskuka.com/kalert/status5.json` | SDK 总开关（抓包为 `"enable": true`） |
| `ioskuka.com/kalert/event5.php` | `app_start` 埋点 |

处理：请求阶段直接回 200 + `enable:false`，SDK 拿到"未启用"即不弹。

### ② 置顶公告 / 通告弹窗

走 App 自己的业务接口 `app2.dsx.ac/ndsx.php/v7/logs`，响应是明文 JSON：

```json
{"code":1,"msg":"置顶公告","data":{"id":2,"title":"10.12|必读通告","intro":"记住官网 dsxys.app 或者 tv.ci ...","is_top":1}}
```

处理：`msg` 命中「公告 / 通告 / notice」时，把 `data` 清空为 `{}`，弹窗没有内容自然不显示。

### ③ 新版本更新弹窗（接口字段级）

处理：两种命中方式

- `msg` 命中「更新 / 升级 / 新版本 / update」→ 整段 `data` 清空；
- `msg` 无关但 `data` 里夹带版本/下载字段（`version`、`version_code`、`down_url`、`apk_url`、`is_update`、`force_update` 等）→ **只把这些字段置空/置 0**，其余配置原样保留，避免影响 App 的其他功能。

## 为什么不影响 App

脚本只改命中特征的那一条响应，其余全部原样放行。实测用真实抓包体跑过：

| 响应 | 结果 |
| --- | --- |
| 置顶公告 | `data` → `{}` |
| 首页推荐（banners / vlist） | 未修改 |
| 排行榜 | 未修改 |
| 导航列表 | 未修改 |
| 排行榜视频列表（34KB） | 未修改 |
| 加密响应体（`MHg5NjB4...` 开头） | 未修改（不解析，避免改坏播放数据） |

## 特意没封的链路

`log-alibaba-taobao-douyin.cdn.bcebos.com` → `eliteres.fanruan.com` 名字很像广告，但下载下来是 **688×1536 的火焰猴子＋胶片开屏图**，是 App 自己的素材 CDN，封了会白屏。

同样没动：`dsxys.app/.pro/.com`（官网探活）、`tv.ci`（地址发布页 / 发布配置）、`app2.dsx.ac` 的业务数据本身、`img.meituan.net`（首页 banner 图）、`110.43.121.3/trace`（腾讯云 P2P 加速）。

## 安装

1. Loon → 配置 → 插件 → `+` → 粘贴订阅地址；
2. 确认 MITM 已开启、证书已信任（`ioskuka.com`、`app2.dsx.ac` 会自动追加进 MITM）；
3. 杀掉 App 后台，重开。

## 验证

网络日志里看两条：

- `ioskuka.com/kalert/config5.json` → 返回体应是 `"enable":false`；
- `app2.dsx.ac/ndsx.php/v7/logs` 中 `msg` 为「置顶公告」的那条 → 返回体 `data` 应为 `{}`。

## 排障

| 现象 | 处理 |
| --- | --- |
| 弹窗还在 | 先看日志里上面对应请求有没有被脚本接管；没有则是插件未启用或 MITM 证书未信任 |
| 公告弹窗变成空白框 | 把插件停用再启用，让 App 重新拉一次接口（可能缓存了旧响应） |
| 启动变慢 / 白屏 | 检查是否另外加了 `ioskuka.com` / `app2.dsx.ac` 的 REJECT 规则，和本插件冲突，只留本插件 |
| 更新弹窗仍在 | 说明更新信息来自加密响应体或本次抓包未覆盖的接口，需在弹窗出现时重新抓一次包定位 |

## 更新弹窗还在？加装「实验插件」

抓包里那几条加密响应（`MHg5NjB4...` + 密文 + 尾部 `xddappsecretkey<编号>`）无法在代理层解密，
所以如果更新弹窗仍在，说明它的数据藏在加密体里。此时可以加装第二个插件：

```
https://raw.githubusercontent.com/ding3700/dsxys-loon/main/dsxys-noupdate.plugin
```

原理：App 每个请求都会带 `version: 1.0.7`、`version-number: 17` 两个头，服务端据此判断要不要提示更新。
该插件把这两个头改写成 `1.0.99` / `99`，服务端就会认为已是最新版。

**注意**：这是实验方案。启用后如果出现播放失败、首页空白等异常，说明服务端会按版本号返回不同结构，直接停用本插件即可。
