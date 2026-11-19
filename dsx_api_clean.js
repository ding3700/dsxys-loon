/**
 * 大师兄影视 · 接口层弹窗清理
 *
 * 目标：
 *   1) 「置顶公告 / 通告」弹窗  —— msg 为 "置顶公告" 的接口，把 data 清空
 *   2) 「发现新版本 / 更新」弹窗 —— 带下载地址、版本号的数据，把 data 清空
 *
 * 原则：
 *   - 只动命中特征的那一条响应，其余（排行榜 / 首页推荐 / 导航 / 播放地址）原样放行
 *   - 加密响应体（不是 JSON）一律不碰，避免把播放数据改坏
 *
 * 兼容：Loon (http-response, requires-body=true)
 */

function isObj(v) {
    return v && typeof v === "object" && !Array.isArray(v);
}

var NOTICE_RE = /公告|通告|notice/i;
var UPDATE_MSG_RE = /更新|升级|新版本|版本更新|update|upgrade/i;
var UPDATE_KEY_RE = /^(version|new_version|version_name|version_code|latest_version|down_url|download_url|downurl|update_url|apk_url|pkg_url|is_update|force_update|forceupdate|upgrade|update_desc|update_content|update_info|new_apk|newApk)$/i;

try {
    var raw = $response.body;
    if (!raw) { $done({}); }

    // 加密体 / 非 JSON：直接放行
    var json;
    try {
        json = JSON.parse(raw);
    } catch (e) {
        $done({});
    }

    if (!isObj(json)) { $done({}); }

    var msg = String(json.msg || json.message || json.msgtext || "");
    var data = json.data;
    var changed = false;

    // ① 公告 / 通告
    if (NOTICE_RE.test(msg)) {
        if (isObj(data)) {
            json.data = {};
            changed = true;
        } else if (Array.isArray(data) && data.length) {
            json.data = [];
            changed = true;
        }
    }

    // ② 版本更新
    // 明确是「更新」类接口：整段 data 清空
    if (UPDATE_MSG_RE.test(msg)) {
        if (isObj(data)) { json.data = {}; changed = true; }
        else if (Array.isArray(data) && data.length) { json.data = []; changed = true; }
        else if (typeof data === "string") { json.data = ""; changed = true; }
    } else if (isObj(data)) {
        // 普通配置里夹带版本/下载字段：只把这些字段置空，保留其余配置，避免影响 App 功能
        for (var k in data) {
            if (!UPDATE_KEY_RE.test(k)) continue;
            var v = data[k];
            if (typeof v === "string") {
                data[k] = /^\d+$/.test(v) ? "0" : "";
            }
            else if (typeof v === "number") { data[k] = 0; }
            else if (typeof v === "boolean") { data[k] = false; }
            changed = true;
        }
    }

    if (changed) {
        $done({ body: JSON.stringify(json) });
    } else {
        $done({});
    }
} catch (e) {
    $done({});
}
