// -------------------------------------------------------------
// VT MARKETS - PRO CHART ENGINE v2
// Institutional-grade candlestick / line / Heikin-Ashi / depth renderer.
//
//  * DPR-correct canvas sizing driven by ResizeObserver (no stretching)
//  * Real time axis, "nice" price ticks, separate volume pane
//  * Crosshair with OHLC tooltip + axis labels (mouse AND touch)
//  * Wheel zoom, drag pan, double-click reset
//  * MA(7/25/99), Bollinger(20,2), volume MA, live candle countdown
//  * WebSocket kline/ticker/depth stream, REST fallback, offline simulation
// -------------------------------------------------------------

(function (win, doc) {
    'use strict';

    /* ============================ CONFIG ============================ */

    var REST = 'https://api.binance.com/api/v3';
    var WSS = 'wss://stream.binance.com:9443/ws';
    var SYMBOL = 'BTCUSDT';
    var FETCH_LIMIT = 500;

    var TF = {
        '15m': { api: '15m', ms: 900000 },
        '1H': { api: '1h', ms: 3600000 },
        '4H': { api: '4h', ms: 14400000 },
        '1D': { api: '1d', ms: 86400000 },
        '1W': { api: '1w', ms: 604800000 }
    };

    var MONTHS = {
        en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        fr: ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'],
        es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
    };

    var STRINGS = {
        en: { connecting: 'Connecting to live feed…', nodata: 'No data available', live: 'LIVE', polling: 'POLLING', sim: 'SIMULATED', offline: 'OFFLINE', vol: 'Vol', chg: 'Change', closes: 'Closes in' },
        fr: { connecting: 'Connexion au flux en direct…', nodata: 'Aucune donnée disponible', live: 'EN DIRECT', polling: 'SONDAGE', sim: 'SIMULÉ', offline: 'HORS LIGNE', vol: 'Vol', chg: 'Variation', closes: 'Clôture dans' },
        es: { connecting: 'Conectando al flujo en vivo…', nodata: 'Sin datos disponibles', live: 'EN VIVO', polling: 'SONDEO', sim: 'SIMULADO', offline: 'SIN CONEXIÓN', vol: 'Vol', chg: 'Variación', closes: 'Cierra en' }
    };

    function lang() {
        var l = win.currentLang || localStorage.getItem('vt_lang') || 'fr';
        return STRINGS[l] ? l : 'en';
    }
    function t(key) { return STRINGS[lang()][key] || STRINGS.en[key]; }

    /* ============================ STATE ============================ */

    var S = {
        tf: '1D',
        type: 'candles',              // candles | line | heikin | depth
        ind: { ma: true, boll: false, vol: true },
        candles: [],                  // { t, o, h, l, c, v }
        stats: null,                  // 24h ticker stats
        book: { asks: [], bids: [], mid: 0 },
        offset: 0,
        count: 90,
        pinnedRight: true,
        hover: null,                  // { x, y, i }
        drag: null,
        pinch: null,
        status: 'loading',            // loading | live | polling | simulated | offline
        canvas: null,
        ctx: null,
        wrap: null,
        dpr: 1,
        w: 0,
        h: 0,
        raf: 0
    };

    var ws = null;
    var wsRetry = 0;
    var pollTimer = null;
    var simTimer = null;
    var clockTimer = null;

    /* ============================ PALETTE ============================ */

    function palette() {
        var cs = win.getComputedStyle(doc.documentElement);
        var bg = (cs.getPropertyValue('--pro-container-bg') || '#0b0e14').trim() || '#0b0e14';
        return {
            bg: bg,
            grid: 'rgba(148,163,184,0.09)',
            gridStrong: 'rgba(148,163,184,0.16)',
            axis: '#64748b',
            text: '#cbd5e1',
            up: '#0ecb81',
            down: '#f6465d',
            volUp: 'rgba(14,203,129,0.30)',
            volDown: 'rgba(246,70,93,0.30)',
            ma7: '#f0b90b',
            ma25: '#e5439b',
            ma99: '#a855f7',
            boll: 'rgba(56,189,248,0.85)',
            bollFill: 'rgba(56,189,248,0.06)',
            lineStroke: '#38bdf8',
            lineFillTop: 'rgba(56,189,248,0.22)',
            lineFillBottom: 'rgba(56,189,248,0.00)',
            cross: 'rgba(148,163,184,0.55)',
            tipBg: 'rgba(11,14,20,0.94)',
            tipBorder: 'rgba(148,163,184,0.25)',
            watermark: 'rgba(148,163,184,0.055)'
        };
    }

    /* ============================ HELPERS ============================ */

    function el(id) { return doc.getElementById(id); }
    function setText(id, v) { var e = el(id); if (e) e.textContent = v; }

    function num(v, d) {
        if (v === null || v === undefined || isNaN(v)) return '--';
        return Number(v).toLocaleString('en-US', { minimumFractionDigits: d === undefined ? 2 : d, maximumFractionDigits: d === undefined ? 2 : d });
    }

    function compact(v) {
        if (!isFinite(v)) return '--';
        var a = Math.abs(v);
        if (a >= 1e12) return (v / 1e12).toFixed(2) + 'T';
        if (a >= 1e9) return (v / 1e9).toFixed(2) + 'B';
        if (a >= 1e6) return (v / 1e6).toFixed(2) + 'M';
        if (a >= 1e3) return (v / 1e3).toFixed(2) + 'K';
        return v.toFixed(2);
    }

    // Round to a crisp half-pixel so 1px strokes stay sharp
    function px(v) { return Math.round(v) + 0.5; }

    // "Nice" axis steps: 1 / 2 / 5 / 10 x 10^n
    function niceTicks(min, max, target) {
        var span = max - min;
        if (!(span > 0)) return [min];
        var raw = span / target;
        var mag = Math.pow(10, Math.floor(Math.log10(raw)));
        var norm = raw / mag;
        var step = (norm >= 7.5 ? 10 : norm >= 3.5 ? 5 : norm >= 1.5 ? 2 : 1) * mag;
        var out = [];
        for (var v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) out.push(v);
        return out;
    }

    function fmtTime(ms, withDate) {
        var d = new Date(ms);
        var hh = ('0' + d.getHours()).slice(-2);
        var mm = ('0' + d.getMinutes()).slice(-2);
        var mon = MONTHS[lang()] ? MONTHS[lang()][d.getMonth()] : MONTHS.en[d.getMonth()];
        if (withDate === 'full') return d.getDate() + ' ' + mon + ' ' + d.getFullYear() + '  ' + hh + ':' + mm;
        if (S.tf === '1W') return mon + ' ' + String(d.getFullYear()).slice(-2);
        if (S.tf === '1D') return d.getDate() + ' ' + mon;
        if (S.tf === '4H') return d.getDate() + '/' + (d.getMonth() + 1) + ' ' + hh + ':' + mm;
        return hh + ':' + mm;
    }

    /* ============================ INDICATORS ============================ */

    function sma(src, period) {
        var out = new Array(src.length), sum = 0;
        for (var i = 0; i < src.length; i++) {
            sum += src[i];
            if (i >= period) sum -= src[i - period];
            out[i] = i >= period - 1 ? sum / period : null;
        }
        return out;
    }

    function bollinger(src, period, mult) {
        var mid = sma(src, period), up = [], low = [];
        for (var i = 0; i < src.length; i++) {
            if (mid[i] === null) { up.push(null); low.push(null); continue; }
            var s = 0;
            for (var j = 0; j < period; j++) { var d = src[i - j] - mid[i]; s += d * d; }
            var sd = Math.sqrt(s / period);
            up.push(mid[i] + mult * sd);
            low.push(mid[i] - mult * sd);
        }
        return { mid: mid, up: up, low: low };
    }

    function heikin(candles) {
        var out = [], prev = null;
        for (var i = 0; i < candles.length; i++) {
            var k = candles[i];
            var c = (k.o + k.h + k.l + k.c) / 4;
            var o = prev ? (prev.o + prev.c) / 2 : (k.o + k.c) / 2;
            var h = Math.max(k.h, o, c);
            var l = Math.min(k.l, o, c);
            prev = { o: o, h: h, l: l, c: c };
            out.push({ t: k.t, o: o, h: h, l: l, c: c, v: k.v });
        }
        return out;
    }

    /* ============================ VIEWPORT ============================ */

    function series() {
        return S.type === 'heikin' ? heikin(S.candles) : S.candles;
    }

    function clampView() {
        var n = S.candles.length;
        if (!n) return;
        var minCount = 20;
        var maxCount = Math.min(n, 400);
        S.count = Math.max(minCount, Math.min(maxCount, Math.round(S.count)));
        if (S.pinnedRight) S.offset = n - S.count;
        S.offset = Math.max(0, Math.min(n - S.count, Math.round(S.offset)));
        if (S.offset >= n - S.count) S.pinnedRight = true;
    }

    function defaultCount() {
        if (!S.w) measure();
        var w = S.w || 900;
        if (w < 420) return 45;
        if (w < 700) return 70;
        if (w < 1000) return 95;
        return 120;
    }

    /* ============================ SIZING ============================ */

    function measure() {
        if (!S.canvas || !S.wrap) return false;
        var r = S.wrap.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) return false;
        var dpr = win.devicePixelRatio || 1;
        var bw = Math.round(r.width * dpr);
        var bh = Math.round(r.height * dpr);
        if (S.canvas.width !== bw || S.canvas.height !== bh) {
            S.canvas.width = bw;
            S.canvas.height = bh;
        }
        S.dpr = dpr;
        S.w = r.width;
        S.h = r.height;
        return true;
    }

    function schedule() {
        if (S.raf) return;
        S.raf = win.requestAnimationFrame(function () { S.raf = 0; render(); });
    }

    /* ============================ RENDER ============================ */

    function render() {
        if (!S.ctx || !measure()) return;
        var ctx = S.ctx, P = palette();
        ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
        ctx.clearRect(0, 0, S.w, S.h);
        ctx.fillStyle = P.bg;
        ctx.fillRect(0, 0, S.w, S.h);

        if (S.type === 'depth') { drawDepth(ctx, P); return; }
        if (!S.candles.length) { drawPlaceholder(ctx, P); return; }

        clampView();
        var data = series();
        var vis = data.slice(S.offset, S.offset + S.count);
        if (!vis.length) { drawPlaceholder(ctx, P); return; }

        /* ---- layout ---- */
        var axisW = 66;
        var timeH = 22;
        var plotW = Math.max(40, S.w - axisW);
        var bodyH = Math.max(60, S.h - timeH);
        var volH = S.ind.vol ? Math.round(bodyH * 0.20) : 0;
        var gap = S.ind.vol ? 10 : 0;
        var priceH = bodyH - volH - gap;
        var slot = plotW / S.count;

        /* ---- price scale (includes indicator envelopes) ---- */
        var closes = data.map(function (k) { return k.c; });
        var ma = { a: sma(closes, 7), b: sma(closes, 25), c: sma(closes, 99) };
        var bb = S.ind.boll ? bollinger(closes, 20, 2) : null;

        var lo = Infinity, hi = -Infinity;
        for (var i = 0; i < vis.length; i++) {
            if (vis[i].l < lo) lo = vis[i].l;
            if (vis[i].h > hi) hi = vis[i].h;
        }
        if (!isFinite(lo) || !isFinite(hi) || hi === lo) { lo = lo || 0; hi = lo + 1; }

        // Indicators may widen the scale, but never by more than 30% of the
        // candle range — otherwise a far-away MA(99) squashes the price action.
        var candleLo = lo, candleHi = hi, room = (hi - lo) * 0.30;
        function stretch(arr) {
            for (var k = S.offset; k < S.offset + S.count; k++) {
                var v = arr[k];
                if (v === null || v === undefined) continue;
                if (v < lo) lo = Math.max(candleLo - room, v);
                if (v > hi) hi = Math.min(candleHi + room, v);
            }
        }
        if (S.ind.ma) { stretch(ma.a); stretch(ma.b); stretch(ma.c); }
        if (bb) { stretch(bb.up); stretch(bb.low); }

        var pad = (hi - lo) * 0.08;
        lo -= pad; hi += pad;

        function Y(v) { return priceH - ((v - lo) / (hi - lo)) * priceH; }
        function X(idx) { return (idx - S.offset + 0.5) * slot; }

        /* ---- watermark ---- */
        ctx.save();
        ctx.fillStyle = P.watermark;
        ctx.textAlign = 'center';
        ctx.font = '800 ' + Math.max(18, Math.min(46, plotW / 14)) + 'px Inter, sans-serif';
        ctx.fillText('VT MARKETS', plotW / 2, priceH / 2);
        ctx.font = '600 ' + Math.max(9, Math.min(15, plotW / 44)) + 'px Inter, sans-serif';
        ctx.fillText('BTC/USDT · ' + S.tf, plotW / 2, priceH / 2 + 20);
        ctx.restore();

        /* ---- horizontal grid + price axis ---- */
        var ticks = niceTicks(lo, hi, Math.max(3, Math.round(priceH / 46)));
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textBaseline = 'middle';
        for (var g = 0; g < ticks.length; g++) {
            var yy = Y(ticks[g]);
            if (yy < 0 || yy > priceH) continue;
            ctx.strokeStyle = P.grid;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(0, px(yy)); ctx.lineTo(plotW, px(yy)); ctx.stroke();
            ctx.fillStyle = P.axis;
            ctx.textAlign = 'right';
            ctx.fillText(num(ticks[g], ticks[g] > 1000 ? 0 : 2), S.w - 6, yy);
        }

        /* ---- vertical grid + time axis ---- */
        var minGap = 78;
        var stepIdx = Math.max(1, Math.ceil(minGap / slot));
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        for (var vi = S.offset; vi < S.offset + S.count; vi++) {
            if ((vi - S.offset) % stepIdx !== 0) continue;
            var xx = X(vi);
            if (xx < 14 || xx > plotW - 14) continue;
            ctx.strokeStyle = P.grid;
            ctx.beginPath(); ctx.moveTo(px(xx), 0); ctx.lineTo(px(xx), bodyH); ctx.stroke();
            ctx.fillStyle = P.axis;
            ctx.fillText(fmtTime(data[vi].t), xx, bodyH + 6);
        }

        /* ---- pane separator + axis rail ---- */
        ctx.strokeStyle = P.gridStrong;
        ctx.beginPath(); ctx.moveTo(px(plotW), 0); ctx.lineTo(px(plotW), S.h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, px(bodyH)); ctx.lineTo(S.w, px(bodyH)); ctx.stroke();

        /* ---- volume pane ---- */
        if (S.ind.vol) {
            var vMax = 0;
            for (var q = 0; q < vis.length; q++) if (vis[q].v > vMax) vMax = vis[q].v;
            if (vMax <= 0) vMax = 1;
            var vTop = priceH + gap;
            var bw = Math.max(1, Math.floor(slot * 0.62));
            for (var m = 0; m < vis.length; m++) {
                var kv = vis[m];
                var bh = Math.max(1, (kv.v / vMax) * volH);
                var cx = X(S.offset + m);
                ctx.fillStyle = kv.c >= kv.o ? P.volUp : P.volDown;
                ctx.fillRect(Math.round(cx - bw / 2), Math.round(vTop + volH - bh), bw, Math.round(bh));
            }
            // volume MA(20)
            var vols = data.map(function (k) { return k.v; });
            var vma = sma(vols, 20);
            ctx.strokeStyle = 'rgba(240,185,11,0.75)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            var vStarted = false;
            for (var vm = S.offset; vm < S.offset + S.count; vm++) {
                if (vma[vm] === null) continue;
                var vy = vTop + volH - Math.min(volH, (vma[vm] / vMax) * volH);
                if (!vStarted) { ctx.moveTo(X(vm), vy); vStarted = true; } else ctx.lineTo(X(vm), vy);
            }
            ctx.stroke();

            ctx.fillStyle = P.axis;
            ctx.font = '9px "JetBrains Mono", monospace';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText('Vol(BTC)  ' + compact(vMax), 4, vTop + 2);
        }

        /* ---- Bollinger bands ---- */
        if (bb) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, 0, plotW, priceH);
            ctx.clip();
            ctx.beginPath();
            var opened = false;
            for (var b1 = S.offset; b1 < S.offset + S.count; b1++) {
                if (bb.up[b1] === null) continue;
                if (!opened) { ctx.moveTo(X(b1), Y(bb.up[b1])); opened = true; } else ctx.lineTo(X(b1), Y(bb.up[b1]));
            }
            for (var b2 = S.offset + S.count - 1; b2 >= S.offset; b2--) {
                if (bb.low[b2] === null) continue;
                ctx.lineTo(X(b2), Y(bb.low[b2]));
            }
            ctx.closePath();
            ctx.fillStyle = P.bollFill;
            ctx.fill();
            polyline(ctx, bb.up, X, Y, P.boll, 1);
            polyline(ctx, bb.low, X, Y, P.boll, 1);
            polyline(ctx, bb.mid, X, Y, 'rgba(56,189,248,0.5)', 1);
            ctx.restore();
        }

        /* ---- price series ---- */
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, plotW, priceH);
        ctx.clip();

        if (S.type === 'line') {
            var grd = ctx.createLinearGradient(0, 0, 0, priceH);
            grd.addColorStop(0, P.lineFillTop);
            grd.addColorStop(1, P.lineFillBottom);
            ctx.beginPath();
            ctx.moveTo(X(S.offset), priceH);
            for (var li = S.offset; li < S.offset + S.count; li++) ctx.lineTo(X(li), Y(data[li].c));
            ctx.lineTo(X(S.offset + S.count - 1), priceH);
            ctx.closePath();
            ctx.fillStyle = grd;
            ctx.fill();

            ctx.beginPath();
            for (var lj = S.offset; lj < S.offset + S.count; lj++) {
                if (lj === S.offset) ctx.moveTo(X(lj), Y(data[lj].c)); else ctx.lineTo(X(lj), Y(data[lj].c));
            }
            ctx.strokeStyle = P.lineStroke;
            ctx.lineWidth = 1.6;
            ctx.lineJoin = 'round';
            ctx.stroke();
        } else {
            var cw = Math.max(1, Math.floor(slot * 0.68));
            if (cw > 1 && cw % 2 === 1) cw -= 1;
            for (var ci = 0; ci < vis.length; ci++) {
                var k = vis[ci];
                var bull = k.c >= k.o;
                var col = bull ? P.up : P.down;
                var xc = X(S.offset + ci);
                var yO = Y(k.o), yC = Y(k.c), yH = Y(k.h), yL = Y(k.l);
                var top = Math.min(yO, yC);
                var hgt = Math.max(1, Math.abs(yC - yO));

                ctx.strokeStyle = col;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(px(xc), Math.round(yH));
                ctx.lineTo(px(xc), Math.round(yL));
                ctx.stroke();

                if (cw <= 2) {
                    ctx.fillStyle = col;
                    ctx.fillRect(px(xc) - 0.5, Math.round(top), Math.max(1, cw), Math.round(hgt));
                } else {
                    var x0 = Math.round(xc - cw / 2);
                    ctx.fillStyle = col;
                    ctx.fillRect(x0, Math.round(top), cw, Math.round(hgt));
                }
            }
        }

        /* ---- moving averages ---- */
        if (S.ind.ma) {
            polyline(ctx, ma.a, X, Y, P.ma7, 1.3);
            polyline(ctx, ma.b, X, Y, P.ma25, 1.3);
            polyline(ctx, ma.c, X, Y, P.ma99, 1.3);
        }
        ctx.restore();

        /* ---- last price marker ---- */
        var last = data[data.length - 1];
        var lastVisible = S.offset + S.count >= data.length;
        var lastY = Y(last.c);
        var lastCol = last.c >= last.o ? P.up : P.down;
        if (lastVisible && lastY >= 0 && lastY <= priceH) {
            ctx.save();
            ctx.setLineDash([4, 4]);
            ctx.strokeStyle = lastCol;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(0, px(lastY)); ctx.lineTo(plotW, px(lastY)); ctx.stroke();
            ctx.restore();
            axisBadge(ctx, plotW, lastY, axisW, num(last.c, 2), lastCol, '#ffffff');

            // pulsing live dot on the latest close
            var pulse = 2.5 + Math.sin(Date.now() / 320) * 1.4;
            ctx.fillStyle = lastCol;
            ctx.globalAlpha = 0.28;
            ctx.beginPath(); ctx.arc(X(data.length - 1), lastY, pulse + 3.5, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
            ctx.beginPath(); ctx.arc(X(data.length - 1), lastY, 2.6, 0, Math.PI * 2); ctx.fill();
        }

        /* ---- crosshair + tooltip ---- */
        if (S.hover) drawCrosshair(ctx, P, data, X, Y, plotW, priceH, bodyH, axisW, lo, hi, slot);

        syncLegend(data, ma, S.hover ? S.hover.i : data.length - 1);
    }

    function polyline(ctx, arr, X, Y, color, width) {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        var started = false;
        for (var i = S.offset; i < S.offset + S.count; i++) {
            var v = arr[i];
            if (v === null || v === undefined) { started = false; continue; }
            if (!started) { ctx.moveTo(X(i), Y(v)); started = true; } else ctx.lineTo(X(i), Y(v));
        }
        ctx.stroke();
    }

    function axisBadge(ctx, x, y, w, label, bg, fg) {
        var h = 17;
        ctx.fillStyle = bg;
        ctx.fillRect(x, Math.round(y - h / 2), w, h);
        ctx.fillStyle = fg;
        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x + w / 2, y);
    }

    function drawCrosshair(ctx, P, data, X, Y, plotW, priceH, bodyH, axisW, lo, hi, slot) {
        var i = Math.max(S.offset, Math.min(S.offset + S.count - 1, S.hover.i));
        var cx = X(i);
        var cy = Math.max(0, Math.min(bodyH, S.hover.y));

        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = P.cross;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(px(cx), 0); ctx.lineTo(px(cx), bodyH); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, px(cy)); ctx.lineTo(plotW, px(cy)); ctx.stroke();
        ctx.restore();

        // price label on Y axis
        if (cy <= priceH) {
            var pv = lo + (1 - cy / priceH) * (hi - lo);
            axisBadge(ctx, plotW, cy, axisW, num(pv, 2), '#334155', '#ffffff');
        }

        // time label on X axis
        var lbl = fmtTime(data[i].t);
        ctx.font = '10px "JetBrains Mono", monospace';
        var tw = ctx.measureText(lbl).width + 12;
        var tx = Math.max(0, Math.min(plotW - tw, cx - tw / 2));
        ctx.fillStyle = '#334155';
        ctx.fillRect(tx, bodyH + 2, tw, 16);
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(lbl, tx + tw / 2, bodyH + 10);

        // floating OHLC tooltip
        var k = data[i];
        var chg = ((k.c - k.o) / k.o) * 100;
        var rows = [
            [fmtTime(k.t, 'full'), '', P.text],
            ['O', num(k.o, 2), k.c >= k.o ? P.up : P.down],
            ['H', num(k.h, 2), P.up],
            ['L', num(k.l, 2), P.down],
            ['C', num(k.c, 2), k.c >= k.o ? P.up : P.down],
            [t('vol'), compact(k.v), P.text],
            [t('chg'), (chg >= 0 ? '+' : '') + chg.toFixed(2) + '%', chg >= 0 ? P.up : P.down]
        ];
        var boxW = 152, boxH = rows.length * 15 + 12;
        var bx = cx + 14;
        if (bx + boxW > plotW) bx = cx - boxW - 14;
        if (bx < 2) bx = 2;
        var by = Math.max(2, Math.min(bodyH - boxH - 2, cy - boxH / 2));

        ctx.fillStyle = P.tipBg;
        ctx.strokeStyle = P.tipBorder;
        ctx.lineWidth = 1;
        roundRect(ctx, bx, by, boxW, boxH, 6);
        ctx.fill();
        ctx.stroke();

        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textBaseline = 'middle';
        for (var r = 0; r < rows.length; r++) {
            var yy = by + 12 + r * 15;
            ctx.textAlign = 'left';
            ctx.fillStyle = P.axis;
            ctx.fillText(rows[r][0], bx + 9, yy);
            ctx.textAlign = 'right';
            ctx.fillStyle = rows[r][2];
            ctx.fillText(rows[r][1], bx + boxW - 9, yy);
        }
    }

    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    function drawPlaceholder(ctx, P) {
        ctx.fillStyle = P.axis;
        ctx.font = '600 12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(S.status === 'loading' ? t('connecting') : t('nodata'), S.w / 2, S.h / 2);
        if (S.status === 'loading') {
            var a = (Date.now() % 1200) / 1200;
            ctx.strokeStyle = 'rgba(56,189,248,0.7)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(S.w / 2, S.h / 2 - 26, 9, a * Math.PI * 2, a * Math.PI * 2 + 1.6);
            ctx.stroke();
            schedule();
        }
    }

    /* ---------- depth chart ---------- */
    function drawDepth(ctx, P) {
        var bids = S.book.bids, asks = S.book.asks;
        if (!bids.length || !asks.length) { drawPlaceholder(ctx, P); return; }

        var axisW = 66, timeH = 22;
        var plotW = Math.max(40, S.w - axisW);
        var plotH = Math.max(40, S.h - timeH);

        var cb = [], ca = [], sum = 0, i;
        for (i = 0; i < bids.length; i++) { sum += bids[i][1]; cb.push([bids[i][0], sum]); }
        sum = 0;
        for (i = 0; i < asks.length; i++) { sum += asks[i][1]; ca.push([asks[i][0], sum]); }

        var maxQty = Math.max(cb[cb.length - 1][1], ca[ca.length - 1][1]) * 1.08;
        var pMin = cb[cb.length - 1][0], pMax = ca[ca.length - 1][0];
        if (pMax <= pMin) { drawPlaceholder(ctx, P); return; }

        function X(p) { return ((p - pMin) / (pMax - pMin)) * plotW; }
        function Y(q) { return plotH - (q / maxQty) * plotH; }

        var ticks = niceTicks(0, maxQty, 4);
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textBaseline = 'middle';
        for (i = 0; i < ticks.length; i++) {
            var y = Y(ticks[i]);
            ctx.strokeStyle = P.grid;
            ctx.beginPath(); ctx.moveTo(0, px(y)); ctx.lineTo(plotW, px(y)); ctx.stroke();
            ctx.fillStyle = P.axis;
            ctx.textAlign = 'right';
            ctx.fillText(ticks[i].toFixed(2), S.w - 6, y);
        }

        function area(pts, color, fill) {
            ctx.beginPath();
            ctx.moveTo(X(pts[0][0]), plotH);
            for (var j = 0; j < pts.length; j++) {
                ctx.lineTo(X(pts[j][0]), Y(pts[j][1]));
                if (j + 1 < pts.length) ctx.lineTo(X(pts[j + 1][0]), Y(pts[j][1]));
            }
            ctx.lineTo(X(pts[pts.length - 1][0]), plotH);
            ctx.closePath();
            ctx.fillStyle = fill;
            ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.4;
            ctx.stroke();
        }
        area(cb.slice().reverse(), P.up, 'rgba(14,203,129,0.18)');
        area(ca, P.down, 'rgba(246,70,93,0.18)');

        // mid marker
        var midX = X(S.book.mid);
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = P.cross;
        ctx.beginPath(); ctx.moveTo(px(midX), 0); ctx.lineTo(px(midX), plotH); ctx.stroke();
        ctx.restore();

        ctx.fillStyle = P.axis;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(num(pMin, 0), 24, plotH + 6);
        ctx.fillText(num(S.book.mid, 2), midX, plotH + 6);
        ctx.fillText(num(pMax, 0), plotW - 24, plotH + 6);
    }

    /* ============================ DOM SYNC ============================ */

    function syncLegend(data, ma, idx) {
        var k = data[Math.max(0, Math.min(data.length - 1, idx))];
        if (!k) return;
        var chg = ((k.c - k.o) / k.o) * 100;
        var col = chg >= 0 ? '#0ecb81' : '#f6465d';

        setText('ohlcDate', fmtTime(k.t, 'full'));
        setText('ohlcOpen', num(k.o, 2));
        setText('ohlcHigh', num(k.h, 2));
        setText('ohlcLow', num(k.l, 2));
        setText('ohlcClose', num(k.c, 2));
        setText('ohlcChange', (chg >= 0 ? '+' : '') + chg.toFixed(2) + '%');
        setText('ohlcVol', compact(k.v));

        ['ohlcOpen', 'ohlcClose', 'ohlcChange'].forEach(function (id) {
            var e = el(id); if (e) e.style.color = col;
        });
        var hEl = el('ohlcHigh'); if (hEl) hEl.style.color = '#0ecb81';
        var lEl = el('ohlcLow'); if (lEl) lEl.style.color = '#f6465d';

        setText('ma7Val', ma.a[idx] != null ? num(ma.a[idx], 2) : '--');
        setText('ma25Val', ma.b[idx] != null ? num(ma.b[idx], 2) : '--');
        setText('ma99Val', ma.c[idx] != null ? num(ma.c[idx], 2) : '--');
    }

    function syncHeader() {
        var last = S.candles[S.candles.length - 1];
        var price = last ? last.c : 0;
        if (!price) return;

        var pEl = el('livePrice');
        if (pEl) {
            var prev = parseFloat(pEl.getAttribute('data-v')) || price;
            pEl.textContent = '$' + num(price, 2);
            pEl.setAttribute('data-v', price);
            pEl.classList.remove('tick-up', 'tick-down');
            if (price !== prev) {
                void pEl.offsetWidth;
                pEl.classList.add(price > prev ? 'tick-up' : 'tick-down');
            }
        }
        setText('livePriceSub', '≈ $' + num(price, 2));

        var st = S.stats;
        if (st) {
            var up = st.pct >= 0;
            var chgEl = el('metricChg');
            if (chgEl) {
                chgEl.textContent = (up ? '+' : '') + num(st.chg, 2) + '  ' + (up ? '+' : '') + st.pct.toFixed(2) + '%';
                chgEl.style.color = up ? '#0ecb81' : '#f6465d';
            }
            setText('metricHigh', num(st.high, 2));
            setText('metricLow', num(st.low, 2));
            setText('metricVolBtc', compact(st.vol));
            setText('metricVolUsdt', compact(st.quoteVol));
        }

        if (activePane === 'info') syncInfoPane();
    }

    function syncStatus() {
        var e = el('chartStatus');
        if (!e) return;
        var map = {
            loading: ['loading', t('connecting')],
            live: ['live', t('live')],
            polling: ['polling', t('polling')],
            simulated: ['sim', t('sim')],
            offline: ['off', t('offline')]
        };
        var cfg = map[S.status] || map.offline;
        e.className = 'chart-status ' + cfg[0];
        e.textContent = cfg[1];
    }

    function syncCountdown() {
        var e = el('candleCountdown');
        if (!e) return;
        var last = S.candles[S.candles.length - 1];
        if (!last || S.status === 'simulated' || S.status === 'offline') { e.textContent = ''; return; }
        var left = last.t + TF[S.tf].ms - Date.now();
        if (left < 0) { e.textContent = ''; return; }
        var s = Math.floor(left / 1000);
        var d = Math.floor(s / 86400); s -= d * 86400;
        var h = Math.floor(s / 3600); s -= h * 3600;
        var m = Math.floor(s / 60); s -= m * 60;
        var pad = function (n) { return ('0' + n).slice(-2); };
        e.textContent = (d ? d + 'd ' : '') + pad(h) + ':' + pad(m) + ':' + pad(s);
    }

    /* ============================ ORDER BOOK ============================ */

    function renderBook() {
        var box = el('orderBookList');
        if (!box) return;
        var b = S.book;
        if (!b.asks.length || !b.bids.length) return;

        var rows = 13;
        var asks = b.asks.slice(0, rows);
        var bids = b.bids.slice(0, rows);
        var maxTot = 0, i, run;

        var askCum = [], bidCum = [];
        run = 0; for (i = 0; i < asks.length; i++) { run += asks[i][1]; askCum.push(run); }
        run = 0; for (i = 0; i < bids.length; i++) { run += bids[i][1]; bidCum.push(run); }
        maxTot = Math.max(askCum[askCum.length - 1] || 1, bidCum[bidCum.length - 1] || 1);

        var html = '';
        for (i = asks.length - 1; i >= 0; i--) {
            html += bookRow('ask', asks[i][0], asks[i][1], askCum[i], maxTot);
        }
        var up = b.mid >= (b.prevMid || b.mid);
        html += '<div class="ob-mid-price">'
            + '<span class="price-mid-val ' + (up ? 'up' : 'down') + '">' + num(b.mid, 2) + '</span>'
            + '<span class="price-mid-sub">≈ $' + num(b.mid, 2) + '</span></div>';
        for (i = 0; i < bids.length; i++) {
            html += bookRow('bid', bids[i][0], bids[i][1], bidCum[i], maxTot);
        }
        box.innerHTML = html;
    }

    function bookRow(side, price, amt, cum, maxTot) {
        var depth = Math.max(2, Math.min(100, (cum / maxTot) * 100));
        return '<div class="ob-row ' + side + '">'
            + '<div class="ob-depth-bg" style="width:' + depth.toFixed(1) + '%"></div>'
            + '<span class="ob-price">' + num(price, 2) + '</span>'
            + '<span class="ob-amt">' + amt.toFixed(5) + '</span>'
            + '<span class="ob-tot">' + cum.toFixed(3) + '</span></div>';
    }

    function simulateBook(base) {
        if (!base) return;
        var asks = [], bids = [];
        var seed = Math.floor(Date.now() / 1200);
        function rnd(n) { var x = Math.sin(seed * 9301 + n * 49297) * 233280; return x - Math.floor(x); }
        for (var i = 0; i < 16; i++) {
            asks.push([base + (i + 1) * (0.35 + rnd(i) * 0.5), 0.002 + rnd(i + 40) * 0.09]);
            bids.push([base - (i + 1) * (0.35 + rnd(i + 80) * 0.5), 0.002 + rnd(i + 120) * 0.09]);
        }
        S.book.prevMid = S.book.mid;
        S.book = { asks: asks, bids: bids, mid: base, prevMid: S.book.mid };
        renderBook();
    }

    /* ============================ DATA ============================ */

    function mapKlines(raw) {
        return raw.map(function (k) {
            return {
                t: k[0],
                o: parseFloat(k[1]),
                h: parseFloat(k[2]),
                l: parseFloat(k[3]),
                c: parseFloat(k[4]),
                v: parseFloat(k[5])
            };
        });
    }

    function jget(url) {
        return fetch(url, { cache: 'no-store' }).then(function (r) {
            if (!r.ok) throw new Error('http ' + r.status);
            return r.json();
        });
    }

    function loadHistory() {
        S.status = 'loading';
        syncStatus();
        schedule();
        return jget(REST + '/klines?symbol=' + SYMBOL + '&interval=' + TF[S.tf].api + '&limit=' + FETCH_LIMIT)
            .then(function (raw) {
                if (!Array.isArray(raw) || !raw.length) throw new Error('empty');
                S.candles = mapKlines(raw);
                S.count = defaultCount();
                S.pinnedRight = true;
                clampView();
                schedule();
                return true;
            });
    }

    function loadStats() {
        return jget(REST + '/ticker/24hr?symbol=' + SYMBOL).then(function (d) {
            S.stats = {
                chg: parseFloat(d.priceChange),
                pct: parseFloat(d.priceChangePercent),
                high: parseFloat(d.highPrice),
                low: parseFloat(d.lowPrice),
                vol: parseFloat(d.volume),
                quoteVol: parseFloat(d.quoteVolume)
            };
            syncHeader();
        });
    }

    function loadBook() {
        return jget(REST + '/depth?symbol=' + SYMBOL + '&limit=20').then(function (d) {
            applyBook(d);
        });
    }

    function applyBook(d) {
        if (!d || !d.bids || !d.asks) return;
        var bids = d.bids.map(function (r) { return [parseFloat(r[0]), parseFloat(r[1])]; });
        var asks = d.asks.map(function (r) { return [parseFloat(r[0]), parseFloat(r[1])]; });
        if (!bids.length || !asks.length) return;
        S.book = {
            bids: bids,
            asks: asks,
            mid: (bids[0][0] + asks[0][0]) / 2,
            prevMid: S.book.mid
        };
        renderBook();
        if (S.type === 'depth') schedule();
    }

    function applyKline(k) {
        var candle = {
            t: k.t,
            o: parseFloat(k.o),
            h: parseFloat(k.h),
            l: parseFloat(k.l),
            c: parseFloat(k.c),
            v: parseFloat(k.v)
        };
        var n = S.candles.length;
        if (n && S.candles[n - 1].t === candle.t) {
            S.candles[n - 1] = candle;
        } else if (!n || candle.t > S.candles[n - 1].t) {
            S.candles.push(candle);
            if (S.candles.length > FETCH_LIMIT + 60) S.candles.shift();
        }
        syncHeader();
        schedule();
    }

    /* ---------- websocket ---------- */

    function closeStream() {
        if (ws) {
            try { ws.onclose = null; ws.close(); } catch (e) { }
            ws = null;
        }
    }

    function connectStream() {
        closeStream();
        var lower = SYMBOL.toLowerCase();
        var streams = [
            lower + '@kline_' + TF[S.tf].api,
            lower + '@ticker',
            lower + '@depth20@100ms'
        ];
        var opened = false;

        try {
            ws = new WebSocket(WSS + '/' + streams.join('/'));
        } catch (e) {
            startPolling();
            return;
        }

        var guard = setTimeout(function () { if (!opened) { closeStream(); startPolling(); } }, 5000);

        ws.onopen = function () {
            opened = true;
            clearTimeout(guard);
            wsRetry = 0;
            stopPolling();
            S.status = 'live';
            syncStatus();
        };

        ws.onmessage = function (ev) {
            var d;
            try { d = JSON.parse(ev.data); } catch (e) { return; }
            if (!d) return;

            if (d.e === 'kline' && d.k) {
                applyKline(d.k);
            } else if (d.e === '24hrTicker') {
                S.stats = {
                    chg: parseFloat(d.p),
                    pct: parseFloat(d.P),
                    high: parseFloat(d.h),
                    low: parseFloat(d.l),
                    vol: parseFloat(d.v),
                    quoteVol: parseFloat(d.q)
                };
                syncHeader();
            } else if (d.bids && d.asks) {
                applyBook(d);
            }
        };

        ws.onerror = function () { /* onclose handles recovery */ };

        ws.onclose = function () {
            clearTimeout(guard);
            ws = null;
            if (S.status === 'simulated') return;
            wsRetry++;
            if (wsRetry <= 4) {
                setTimeout(connectStream, Math.min(15000, 1200 * wsRetry));
                S.status = 'polling';
                syncStatus();
            } else {
                startPolling();
            }
        };
    }

    /* ---------- REST polling fallback ---------- */

    function startPolling() {
        if (pollTimer) return;
        S.status = 'polling';
        syncStatus();
        var tick = function () {
            Promise.all([
                jget(REST + '/klines?symbol=' + SYMBOL + '&interval=' + TF[S.tf].api + '&limit=2')
                    .then(function (raw) { mapKlines(raw).forEach(function (c) { applyKline({ t: c.t, o: c.o, h: c.h, l: c.l, c: c.c, v: c.v }); }); }),
                loadStats(),
                loadBook()
            ]).catch(function () { startSimulation(); });
        };
        tick();
        pollTimer = setInterval(tick, 5000);
    }

    function stopPolling() {
        if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    }

    /* ---------- offline simulation ---------- */

    function gauss() {
        return Math.sqrt(-2 * Math.log(Math.random() || 1e-9)) * Math.cos(2 * Math.PI * Math.random());
    }

    function simulateHistory(count, endPrice) {
        var out = [], price = endPrice * 0.86, now = Date.now(), step = TF[S.tf].ms;
        var t0 = Math.floor(now / step) * step - (count - 1) * step;
        for (var i = 0; i < count; i++) {
            var ret = 0.0004 + 0.014 * gauss();
            var o = price, c = o * Math.exp(ret);
            var body = Math.abs(c - o);
            out.push({
                t: t0 + i * step,
                o: o,
                h: Math.max(o, c) + body * (0.3 + Math.random() * 1.1),
                l: Math.min(o, c) - body * (0.3 + Math.random() * 1.1),
                c: c,
                v: (700 + Math.random() * 1400) * (Math.random() > 0.88 ? 2.6 : 1)
            });
            price = c;
        }
        var scale = endPrice / out[out.length - 1].c;
        out.forEach(function (k) { k.o *= scale; k.h *= scale; k.l *= scale; k.c *= scale; });
        return out;
    }

    function startSimulation() {
        if (S.status === 'simulated') return;
        stopPolling();
        closeStream();
        S.status = 'simulated';
        syncStatus();
        if (!S.candles.length) {
            S.candles = simulateHistory(260, 63498);
            S.count = defaultCount();
            S.pinnedRight = true;
        }
        var last = S.candles[S.candles.length - 1];
        S.stats = {
            chg: last.c - S.candles[Math.max(0, S.candles.length - 2)].o,
            pct: ((last.c - S.candles[Math.max(0, S.candles.length - 2)].o) / S.candles[Math.max(0, S.candles.length - 2)].o) * 100,
            high: Math.max.apply(null, S.candles.slice(-24).map(function (k) { return k.h; })),
            low: Math.min.apply(null, S.candles.slice(-24).map(function (k) { return k.l; })),
            vol: S.candles.slice(-24).reduce(function (a, k) { return a + k.v; }, 0),
            quoteVol: S.candles.slice(-24).reduce(function (a, k) { return a + k.v * k.c; }, 0)
        };

        if (simTimer) clearInterval(simTimer);
        simTimer = setInterval(function () {
            var k = S.candles[S.candles.length - 1];
            if (!k) return;
            k.c = k.c * Math.exp(0.00035 * gauss());
            if (k.c > k.h) k.h = k.c;
            if (k.c < k.l) k.l = k.c;
            k.v += Math.random() * 6;
            S.stats.pct = ((k.c - k.o) / k.o) * 100;
            S.stats.chg = k.c - k.o;
            simulateBook(k.c);
            syncHeader();
            schedule();
        }, 1000);
        simulateBook(last.c);
        syncHeader();
        schedule();
    }

    /* ============================ INTERACTION ============================ */

    function localPos(evt) {
        var r = S.canvas.getBoundingClientRect();
        var src = evt.touches && evt.touches.length ? evt.touches[0] : evt;
        return { x: src.clientX - r.left, y: src.clientY - r.top };
    }

    function indexAt(x) {
        var plotW = Math.max(40, S.w - 66);
        var slot = plotW / S.count;
        return S.offset + Math.floor(x / slot);
    }

    function onMove(evt) {
        if (!S.candles.length || S.type === 'depth') return;
        var p = localPos(evt);
        var plotW = Math.max(40, S.w - 66);

        if (S.drag) {
            var slot = plotW / S.count;
            var moved = (p.x - S.drag.x) / slot;
            if (Math.abs(moved) >= 1) {
                S.pinnedRight = false;
                S.offset = Math.round(S.drag.offset - moved);
                clampView();
                schedule();
            }
            return;
        }
        if (p.x > plotW) { if (S.hover) { S.hover = null; schedule(); } return; }
        S.hover = { x: p.x, y: p.y, i: indexAt(p.x) };
        schedule();
    }

    function onLeave() { if (S.hover) { S.hover = null; schedule(); } }

    function onDown(evt) {
        if (S.type === 'depth') return;
        var p = localPos(evt);
        S.drag = { x: p.x, offset: S.offset };
        S.canvas.classList.add('grabbing');
    }

    function onUp() {
        S.drag = null;
        if (S.canvas) S.canvas.classList.remove('grabbing');
    }

    function onWheel(evt) {
        if (!S.candles.length || S.type === 'depth') return;
        evt.preventDefault();
        var p = localPos(evt);
        var plotW = Math.max(40, S.w - 66);
        var anchor = Math.max(0, Math.min(1, p.x / plotW));
        var before = S.offset + anchor * S.count;
        var factor = evt.deltaY > 0 ? 1.15 : 1 / 1.15;
        S.count = Math.round(S.count * factor);
        S.pinnedRight = false;
        clampView();
        S.offset = Math.round(before - anchor * S.count);
        clampView();
        if (S.hover) S.hover.i = indexAt(p.x);
        schedule();
    }

    function touchDist(e) {
        var a = e.touches[0], b = e.touches[1];
        return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    }

    function onTouchStart(e) {
        if (S.type === 'depth') return;
        if (e.touches.length === 2) {
            S.pinch = { d: touchDist(e), count: S.count, offset: S.offset };
            S.drag = null;
        } else {
            onDown(e);
            var p = localPos(e);
            S.hover = { x: p.x, y: p.y, i: indexAt(p.x) };
            schedule();
        }
    }

    function onTouchMove(e) {
        if (S.type === 'depth') return;
        if (e.touches.length === 2 && S.pinch) {
            e.preventDefault();
            var ratio = S.pinch.d / touchDist(e);
            S.count = Math.round(S.pinch.count * ratio);
            S.pinnedRight = false;
            clampView();
            schedule();
            return;
        }
        if (S.drag) {
            e.preventDefault();
            onMove(e);
            var p = localPos(e);
            S.hover = { x: p.x, y: p.y, i: indexAt(p.x) };
            schedule();
        }
    }

    function onTouchEnd(e) {
        S.pinch = null;
        onUp();
        if (!e.touches.length) setTimeout(function () { S.hover = null; schedule(); }, 2200);
    }

    function resetView() {
        S.count = defaultCount();
        S.pinnedRight = true;
        clampView();
        schedule();
    }

    /* ============================ PUBLIC API ============================ */

    function setTimeframe(tf, btn) {
        if (!TF[tf]) return;
        S.tf = tf;
        doc.querySelectorAll('.tf-group .tf-btn').forEach(function (b) { b.classList.remove('active'); });
        if (btn) btn.classList.add('active');

        S.candles = [];
        S.hover = null;
        schedule();

        loadHistory()
            .then(function () { connectStream(); })
            .catch(function () { startSimulation(); });
    }

    function setChartType(type, btn) {
        S.type = type;
        doc.querySelectorAll('.chart-type-tabs .c-type').forEach(function (b) { b.classList.remove('active'); });
        if (btn) btn.classList.add('active');
        var ind = doc.querySelector('.ind-group');
        if (ind) ind.style.visibility = type === 'depth' ? 'hidden' : 'visible';
        schedule();
    }

    function toggleIndicator(key, btn) {
        if (!(key in S.ind)) return;
        S.ind[key] = !S.ind[key];
        if (btn) btn.classList.toggle('active', S.ind[key]);
        var legend = doc.querySelector('.ma-legend');
        if (legend && key === 'ma') legend.style.opacity = S.ind.ma ? '1' : '0.35';
        schedule();
    }

    function toggleChartFullscreen() {
        var box = doc.querySelector('.pro-crypto-container');
        if (!box) return;
        if (doc.fullscreenElement) {
            doc.exitFullscreen();
        } else if (box.requestFullscreen) {
            box.requestFullscreen().catch(function () { box.classList.toggle('pseudo-fullscreen'); });
        } else {
            box.classList.toggle('pseudo-fullscreen');
        }
        setTimeout(function () { measure(); schedule(); }, 120);
    }

    /* ---------- Chart / Info / Data / Square panes ---------- */

    var tradeWs = null;
    var activePane = 'chart';

    function setChartTab(name, btn) {
        activePane = name;
        doc.querySelectorAll('.chart-mode-tabs .c-tab').forEach(function (b) { b.classList.remove('active'); });
        if (btn) btn.classList.add('active');
        doc.querySelectorAll('.chart-pane').forEach(function (p) {
            p.classList.toggle('active', p.id === 'pane-' + name);
        });

        if (name === 'chart') {
            setTimeout(function () { measure(); schedule(); }, 30);
        } else if (name === 'info') {
            syncInfoPane();
        } else if (name === 'data') {
            startTrades();
        } else if (name === 'square') {
            renderSquare();
        }
        if (name !== 'data') stopTrades();
    }

    function syncInfoPane() {
        var st = S.stats;
        var last = S.candles[S.candles.length - 1];
        var price = last ? last.c : 0;
        var supply = 19880000;
        setText('infoMcap', '$' + compact(price * supply));
        if (st) {
            setText('infoVol', compact(st.vol) + ' BTC  ($' + compact(st.quoteVol) + ')');
            setText('infoHigh', '$' + num(st.high, 2));
            setText('infoLow', '$' + num(st.low, 2));
        }
    }

    /* ---- live trade tape ---- */
    var trades = [];

    function renderTrades() {
        var box = el('tradesList');
        if (!box) return;
        if (!trades.length) {
            box.innerHTML = '<div class="trades-empty">' + t('connecting') + '</div>';
            return;
        }
        var html = '';
        for (var i = 0; i < trades.length && i < 40; i++) {
            var tr = trades[i];
            var d = new Date(tr.time);
            var hhmmss = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ':' + ('0' + d.getSeconds()).slice(-2);
            html += '<div class="trade-row ' + (tr.buyer ? 'sell' : 'buy') + '">'
                + '<span class="tr-price">' + num(tr.price, 2) + '</span>'
                + '<span class="tr-amt">' + tr.qty.toFixed(5) + '</span>'
                + '<span class="tr-time">' + hhmmss + '</span></div>';
        }
        box.innerHTML = html;
    }

    function pushTrade(tr) {
        trades.unshift(tr);
        if (trades.length > 60) trades.length = 60;
        if (activePane === 'data') renderTrades();
    }

    function startTrades() {
        renderTrades();
        jget(REST + '/trades?symbol=' + SYMBOL + '&limit=40')
            .then(function (list) {
                trades = list.reverse().map(function (x) {
                    return { price: parseFloat(x.price), qty: parseFloat(x.qty), time: x.time, buyer: x.isBuyerMaker };
                });
                renderTrades();
            })
            .catch(function () {
                // offline: synthesise a plausible tape from the last price
                var base = S.candles.length ? S.candles[S.candles.length - 1].c : 63498;
                trades = [];
                for (var i = 0; i < 40; i++) {
                    trades.push({
                        price: base + (Math.random() - 0.5) * 8,
                        qty: 0.0005 + Math.random() * 0.4,
                        time: Date.now() - i * 1700,
                        buyer: Math.random() > 0.5
                    });
                }
                renderTrades();
            });

        if (tradeWs) return;
        try {
            tradeWs = new WebSocket(WSS + '/' + SYMBOL.toLowerCase() + '@aggTrade');
            tradeWs.onmessage = function (ev) {
                var d;
                try { d = JSON.parse(ev.data); } catch (e) { return; }
                if (!d || !d.p) return;
                pushTrade({ price: parseFloat(d.p), qty: parseFloat(d.q), time: d.T, buyer: d.m });
            };
            tradeWs.onclose = function () { tradeWs = null; };
        } catch (e) { tradeWs = null; }
    }

    function stopTrades() {
        if (tradeWs) { try { tradeWs.onclose = null; tradeWs.close(); } catch (e) { } tradeWs = null; }
    }

    /* ---- Square community feed ---- */
    var squarePosts = [
        { u: 'CryptoLina', i: 'CL', c: '#f7931a', txt: 'BTC holding the 4H demand zone. MA(25) crossing back above MA(99) — watching for continuation.', tag: 'Long', t: '2m' },
        { u: 'MacroDesk', i: 'MD', c: '#2563eb', txt: 'Funding rates cooled off overnight. Spot volume is leading this move, not leverage. Healthy.', tag: 'Analysis', t: '18m' },
        { u: 'IrukitoGold', i: 'IG', c: '#10b981', txt: 'Took partials at range high. Leaving a runner with stop at breakeven.', tag: 'Update', t: '1h' },
        { u: 'DeskNotes', i: 'DN', c: '#a855f7', txt: 'Reminder: 100x leverage liquidates on a 1% adverse move. Size accordingly.', tag: 'Risk', t: '3h' }
    ];

    function renderSquare() {
        var box = el('squareFeed');
        if (!box) return;
        box.innerHTML = squarePosts.map(function (p) {
            return '<div class="sq-post">'
                + '<div class="sq-avatar" style="background:' + p.c + '">' + p.i + '</div>'
                + '<div class="sq-body">'
                + '<div class="sq-meta"><strong>' + p.u + '</strong><span class="sq-tag">' + p.tag + '</span><span class="sq-time">' + p.t + '</span></div>'
                + '<div class="sq-text">' + p.txt + '</div>'
                + '<div class="sq-actions"><span>♡ ' + Math.floor(Math.random() * 90 + 5) + '</span><span>↻ ' + Math.floor(Math.random() * 20) + '</span><span>💬 ' + Math.floor(Math.random() * 12) + '</span></div>'
                + '</div></div>';
        }).join('');
    }

    function postSquare() {
        var input = doc.querySelector('.sq-input');
        if (!input || !input.value.trim()) return;
        // Post as the signed-in user, not a placeholder identity.
        var me = (window.VTData && window.VTData.user) || null;
        var myName = me ? (me.full_name || me.email) : 'You';
        var myInitials = me
            ? ((me.first_name || '').charAt(0) + (me.last_name || '').charAt(0)).toUpperCase()
              || (me.email || '?').charAt(0).toUpperCase()
            : '–';
        squarePosts.unshift({
            u: myName, i: myInitials, c: '#3b82f6',
            txt: input.value.trim().replace(/[<>]/g, ''),
            tag: 'You', t: 'now'
        });
        input.value = '';
        renderSquare();
    }

    function toggleOrderBook(btn) {
        var panel = doc.querySelector('.order-book-panel');
        if (!panel) return;
        panel.classList.toggle('collapsed');
        if (btn) btn.classList.toggle('open', !panel.classList.contains('collapsed'));
    }

    /* ============================ BOOT ============================ */

    function boot() {
        S.canvas = el('cryptoChart');
        if (!S.canvas) return;
        S.wrap = S.canvas.parentElement;
        S.ctx = S.canvas.getContext('2d');
        measure();
        S.count = defaultCount();
        syncStatus();
        schedule();

        if (win.ResizeObserver) {
            new ResizeObserver(function () { measure(); schedule(); }).observe(S.wrap);
        }
        win.addEventListener('resize', function () { measure(); schedule(); });
        win.addEventListener('orientationchange', function () { setTimeout(function () { measure(); schedule(); }, 250); });
        doc.addEventListener('fullscreenchange', function () { setTimeout(function () { measure(); schedule(); }, 120); });

        var c = S.canvas;
        c.addEventListener('mousemove', onMove);
        c.addEventListener('mouseleave', onLeave);
        c.addEventListener('mousedown', onDown);
        win.addEventListener('mouseup', onUp);
        c.addEventListener('wheel', onWheel, { passive: false });
        c.addEventListener('dblclick', resetView);
        c.addEventListener('touchstart', onTouchStart, { passive: true });
        c.addEventListener('touchmove', onTouchMove, { passive: false });
        c.addEventListener('touchend', onTouchEnd);

        clockTimer = setInterval(function () {
            syncCountdown();
            if (S.status === 'live' || S.status === 'polling') schedule();
        }, 1000);

        Promise.all([loadHistory(), loadStats(), loadBook()])
            .then(function () { connectStream(); })
            .catch(function () { startSimulation(); });
    }

    if (doc.readyState === 'loading') {
        doc.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

    /* Globals used by inline handlers in home.html */
    win.setTimeframe = setTimeframe;
    win.setChartType = setChartType;
    win.setChartTab = setChartTab;
    win.postSquare = postSquare;
    win.toggleIndicator = toggleIndicator;
    win.toggleChartFullscreen = toggleChartFullscreen;
    win.toggleOrderBook = toggleOrderBook;
    win.resetChartView = resetView;
    win.drawChart = schedule;                 // theme switcher calls this
    win.resizeCanvas = function () { measure(); schedule(); };
    win.renderOrderBook = renderBook;
    win.VTChart = S;

})(window, document);
