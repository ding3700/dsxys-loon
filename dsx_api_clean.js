/**
 * 大师兄影视 · 接口层弹窗清理 v2
 *
 * 目标：
 *   1) 「置顶公告 / 通告」弹窗 —— msg 为公告类，清空 data
 *   2) 「新版本更新」弹窗 —— 深度递归扫描，把版本号 / 下载地址 / 强制更新等字段全部置空
 *
 * 原则：
 *   - 只清字段、不整条丢弃，尽量保留 App 需要的其它配置
 *   - 加密响应体（非 JSON）一律不碰
 *
 * 兼容：Loon (http-response, requires-body=true)
 */

var NOTICE_RE = /公告|通告|notice/i;
var UPDATE_MSG_RE = /更新|升级|新版本|版本更新|update|upgrade/i;

// 强特征字段：无条件清零（英文更新/下载/安装类 + 中文含义）
var STRONG_RE = /(update|upgrade|down[_\-]?url|downurl|download|apk|ipa|install|forced|force_update|版本|下载|更新|升级|安装|强制)/i;
// 弱特征字段：只有值是版本号形态时才清零，避免误伤「高清版/剧场版」这类筛选标签
var VER_RE = /version|ver[_\-]?code/i;

function isVerVal(v) {
    if (typeof v === "number") return true;
    if (typeof v === "string") return /^[0-9][0-9a-z.\-_]{0,14}$/i.test(v);
    return false;
}

function isObj(v) { return v && typeof v === "object" && !Array.isArray(v); }

function zero(v) {
    if (typeof v === "string") return /^\d+$/.test(v) ? "0" : "";
    if (typeof v === "number") return 0;
    if (typeof v === "boolean") return false;
    if (Array.isArray(v)) return [];
    if (isObj(v)) return {};
    return v;
}

var hits = 0;
function walk(node, depth) {
    if (depth > 8 || node === null || node === undefined) return;
    if (Array.isArray(node)) {
        for (var i = 0; i < node.length; i++) walk(node[i], depth + 1);
        return;
    }
    if (!isObj(node)) return;
    for (var k in node) {
        if (STRONG_RE.test(k) || (VER_RE.test(k) && isVerVal(node[k]))) {
            node[k] = zero(node[k]);
            hits++;
        } else {
            walk(node[k], depth + 1);
        }
    }
}

try {
    var raw = $response.body;
    if (!raw) { $done({}); }

    var json;
    try { json = JSON.parse(raw); } catch (e) { $done({}); }
    if (!isObj(json)) { $done({}); }

    var msg = String(json.msg || json.message || "");
    var changed = false;

    // ① 公告 / 通告
    if (NOTICE_RE.test(msg)) {
        if (isObj(json.data)) { json.data = {}; changed = true; }
        else if (Array.isArray(json.data) && json.data.length) { json.data = []; changed = true; }
    }

    // ② 更新：明确是更新类接口 → 整段 data 清空
    if (UPDATE_MSG_RE.test(msg)) {
        if (isObj(json.data)) { json.data = {}; changed = true; }
        else if (Array.isArray(json.data) && json.data.length) { json.data = []; changed = true; }
        else if (typeof json.data === "string") { json.data = ""; changed = true; }
    } else {
        // ③ 更新：字段级深度清洗（兜底，不管字段藏在第几层）
        hits = 0;
        walk(json.data, 0);
        // 顶层同名字段也处理
        for (var k in json) {
            if (k === "data") continue;
            if (STRONG_RE.test(k) || (VER_RE.test(k) && isVerVal(json[k]))) { json[k] = zero(json[k]); hits++; }
        }
        if (hits > 0) changed = true;
    }

    if (changed) { $done({ body: JSON.stringify(json) }); }
    else { $done({}); }
} catch (e) {
    $done({});
}
