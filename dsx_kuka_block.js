/**
 * 大师兄影视 · 酷卡(kalert)弹窗拦截脚本
 *
 * 背景：App 内嵌了「酷卡」弹窗 SDK，启动时会请求 ioskuka.com/kalert/ 下的
 *       configN.json（弹窗文案/按钮）、statusN.json（开关）、eventN.php（埋点），
 *       然后弹出一个带「加入 TG 频道」按钮的推广弹窗。
 *
 * 做法：不走 REJECT（会被 App 当成超时，反而卡启动），而是在请求阶段
 *       直接返回 200 + 合法 JSON，把开关置为 false，让 SDK 自己认为"不启用"。
 *
 * 兼容：Loon (http-request)
 */

function reply(obj) {
    return {
        response: {
            status: 200,
            headers: { "Content-Type": "application/json; charset=UTF-8" },
            body: JSON.stringify(obj)
        }
    };
}

try {
    var url = (typeof $request !== "undefined" && $request && $request.url) ? String($request.url) : "";

    if (/config[0-9]*\.json/.test(url)) {
        // 弹窗配置：enable=false 即不弹
        $done(reply({
            enable: false,
            configVersion: 0,
            delay: 0,
            openTG: false,
            openTGURL: "",
            title: "",
            notice: "",
            dismissTitle: "",
            dismissMode: "normal",
            requiredActionTitle: "",
            displayPolicy: "once",
            configRevision: "",
            startAt: 0,
            endAt: 0,
            blacklist: [],
            links: {},
            buttons: {}
        }));
    } else if (/status[0-9]*\.json/.test(url)) {
        // SDK 开关：同样置 false
        $done(reply({
            enable: false,
            statusVersion: 1,
            updatedAt: 0,
            issuedAt: 0,
            expiresAt: 0,
            signature: ""
        }));
    } else {
        // eventN.php 等埋点，直接回 ok，避免重试
        $done(reply({ ok: true }));
    }
} catch (e) {
    $done({});
}
