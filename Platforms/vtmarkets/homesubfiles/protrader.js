// -------------------------------------------------------------
// VT MARKETS — PROTRADER BOT CONSOLE
//
// Trades the account balance: capital is drawn from accountBalance
// (app.js), realised profit is credited straight back to it, so the
// gold navbar figure moves while the bot runs.
//
// Multi-asset: crypto, forex, metals, indices and energy.
//
// NOTE: front-end simulation of the strategy engine. No order is
// ever routed to a venue from this file.
// -------------------------------------------------------------

(function (win, doc) {
    'use strict';

    /* ============================ CONFIG ============================ */

    var DEMO_CAPITAL = 25000;      // used when the account is unfunded

    var STRATEGIES = [
        {
            id: 'momentum', win: 0.68, rr: 1.55,
            name: 'Momentum Breakout', nameFr: 'Cassure de momentum', nameEs: 'Ruptura de momento',
            desc: 'Buys range expansion confirmed by volume',
            descFr: 'Achète les expansions de range confirmées par le volume',
            descEs: 'Compra expansiones de rango confirmadas por volumen'
        },
        {
            id: 'meanrev', win: 0.74, rr: 1.15,
            name: 'Mean Reversion', nameFr: 'Retour à la moyenne', nameEs: 'Reversión a la media',
            desc: 'Fades stretched moves back to the 25-period mean',
            descFr: 'Joue le retour des excès vers la moyenne 25 périodes',
            descEs: 'Opera el regreso de los excesos a la media de 25 periodos'
        },
        {
            id: 'grid', win: 0.81, rr: 0.72,
            name: 'Adaptive Grid', nameFr: 'Grille adaptative', nameEs: 'Rejilla adaptativa',
            desc: 'Ladders orders inside a volatility-scaled band',
            descFr: 'Échelonne les ordres dans une bande calibrée sur la volatilité',
            descEs: 'Escalona órdenes dentro de una banda ajustada a la volatilidad'
        },
        {
            id: 'trend', win: 0.57, rr: 2.35,
            name: 'Trend Following', nameFr: 'Suivi de tendance', nameEs: 'Seguimiento de tendencia',
            desc: 'Rides MA(25)/MA(99) crossovers with a trailing stop',
            descFr: 'Suit les croisements MA(25)/MA(99) avec stop suiveur',
            descEs: 'Sigue los cruces MA(25)/MA(99) con stop dinámico'
        }
    ];

    // Multi-asset universe — the bot is not crypto-only
    var MARKETS = {
        crypto: {
            label: { en: 'Crypto', fr: 'Crypto', es: 'Cripto' },
            items: [
                { s: 'BTC/USDT', p: 63500, dp: 2, g: '₿', c: '#f7931a' },
                { s: 'ETH/USDT', p: 3480, dp: 2, g: 'Ξ', c: '#627eea' },
                { s: 'SOL/USDT', p: 148, dp: 3, g: '◎', c: '#9945ff' },
                { s: 'XRP/USDT', p: 0.584, dp: 4, g: '✕', c: '#23292f' }
            ]
        },
        forex: {
            label: { en: 'Forex', fr: 'Forex', es: 'Forex' },
            items: [
                { s: 'EUR/USD', p: 1.0854, dp: 5, g: '€', c: '#2563eb' },
                { s: 'GBP/USD', p: 1.2742, dp: 5, g: '£', c: '#1d4ed8' },
                { s: 'USD/JPY', p: 157.65, dp: 3, g: '¥', c: '#ef4444' },
                { s: 'AUD/USD', p: 0.6654, dp: 5, g: 'A$', c: '#059669' }
            ]
        },
        metals: {
            label: { en: 'Metals', fr: 'Métaux', es: 'Metales' },
            items: [
                { s: 'XAU/USD', p: 2412.5, dp: 2, g: 'Au', c: '#eab308' },
                { s: 'XAG/USD', p: 31.25, dp: 3, g: 'Ag', c: '#94a3b8' }
            ]
        },
        indices: {
            label: { en: 'Indices', fr: 'Indices', es: 'Índices' },
            items: [
                { s: 'US500', p: 5584.2, dp: 2, g: '5', c: '#2563eb' },
                { s: 'NAS100', p: 19842, dp: 2, g: 'N', c: '#0284c7' },
                { s: 'GER40', p: 18420.6, dp: 2, g: 'D', c: '#059669' }
            ]
        },
        energy: {
            label: { en: 'Energy', fr: 'Énergie', es: 'Energía' },
            items: [
                { s: 'USOIL', p: 81.45, dp: 3, g: 'WT', c: '#0f172a' },
                { s: 'NGAS', p: 2.185, dp: 4, g: 'NG', c: '#2563eb' }
            ]
        }
    };

    var BACKTESTS = {
        momentum: { ret: 214.8, cagr: 52.3, dd: 18.4, pf: 2.14, trades: 1284, hold: '9h' },
        meanrev:  { ret: 128.5, cagr: 35.7, dd: 11.2, pf: 1.86, trades: 3106, hold: '3h' },
        grid:     { ret: 96.2,  cagr: 28.1, dd: 24.7, pf: 1.42, trades: 8420, hold: '1h' },
        trend:    { ret: 341.6, cagr: 71.9, dd: 31.5, pf: 2.68, trades: 486,  hold: '3d' }
    };

    var FX_CAD = 1.366;   // CAD per USD, used for the conversion leg

    /* ============================ STATE ============================ */

    var B = {
        running: true,
        demo: false,
        strategy: 'momentum',
        risk: 1.0,
        maxDd: 10,
        maxPos: 4,
        leverage: 3,
        rules: { stop: true, trail: true, news: true, weekend: false, martingale: false },
        enabled: {
            'BTC/USDT': true, 'ETH/USDT': true, 'SOL/USDT': true,
            'EUR/USD': true, 'XAU/USD': true, 'US500': true
        },
        speed: 1,                 // 0.5 = calm, 1 = normal, 2 = fast
        capital: DEMO_CAPITAL,
        equity: [],
        realised: 0,
        range: '1W',
        positions: [],
        term: [],
        wins: 0,
        losses: 0,
        tradesToday: 0,
        signals: 0,
        startedAt: Date.now(),
        peak: DEMO_CAPITAL,
        maxDdSeen: 0,
        canvas: null, ctx: null, dpr: 1, w: 0, h: 0,
        timers: []
    };

    /* ============================ HELPERS ============================ */

    function el(id) { return doc.getElementById(id); }
    function set(id, v) { var e = el(id); if (e) e.textContent = v; }

    function lang() {
        var l = win.currentLang || localStorage.getItem('vt_lang') || 'fr';
        return (l === 'fr' || l === 'es') ? l : 'en';
    }

    function tr(o, key) {
        var l = lang();
        if (l === 'fr' && o[key + 'Fr']) return o[key + 'Fr'];
        if (l === 'es' && o[key + 'Es']) return o[key + 'Es'];
        return o[key];
    }

    function money(v, d) {
        var n = d === undefined ? 2 : d;
        return '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: n, maximumFractionDigits: n });
    }

    function gauss() {
        return Math.sqrt(-2 * Math.log(Math.random() || 1e-9)) * Math.cos(2 * Math.PI * Math.random());
    }

    function pad(n) { return ('0' + n).slice(-2); }

    function clock() {
        var d = new Date();
        return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    }

    function strategy() {
        return STRATEGIES.filter(function (s) { return s.id === B.strategy; })[0] || STRATEGIES[0];
    }

    function allMarkets() {
        var out = [];
        Object.keys(MARKETS).forEach(function (k) {
            MARKETS[k].items.forEach(function (it) {
                out.push({ cls: k, s: it.s, p: it.p, dp: it.dp, g: it.g, c: it.c });
            });
        });
        return out;
    }

    function enabledMarkets() {
        return allMarkets().filter(function (m) { return B.enabled[m.s]; });
    }

    function marketOf(sym) {
        return allMarkets().filter(function (m) { return m.s === sym; })[0];
    }

    function equityNow() {
        return B.equity.length ? B.equity[B.equity.length - 1] : B.capital;
    }

    /* ---------- capital: taken from the real account balance ---------- */

    function resolveCapital() {
        var bal = (typeof win.accountBalance === 'number') ? win.accountBalance : 0;
        if (bal > 0) {
            B.demo = false;
            B.capital = bal;
        } else {
            B.demo = true;
            B.capital = DEMO_CAPITAL;
        }
        var badge = el('botCapitalMode');
        if (badge) {
            badge.textContent = B.demo ? (lang() === 'fr' ? 'DÉMO' : lang() === 'es' ? 'DEMO' : 'DEMO')
                                       : (lang() === 'fr' ? 'CAPITAL RÉEL' : lang() === 'es' ? 'CAPITAL REAL' : 'LIVE CAPITAL');
            badge.className = 'cap-mode ' + (B.demo ? 'demo' : 'live');
        }
        var note = el('botCapitalNote');
        if (note) {
            note.textContent = B.demo
                ? (lang() === 'fr' ? 'Compte non financé — simulation sur 25 000 $. Déposez pour activer le capital réel.'
                  : lang() === 'es' ? 'Cuenta sin fondos — simulación sobre 25 000 $. Deposita para activar capital real.'
                  : 'Account unfunded — simulating on $25,000. Deposit to trade live capital.')
                : (lang() === 'fr' ? 'Le bot négocie le solde de votre compte. Les gains réalisés y sont crédités.'
                  : lang() === 'es' ? 'El bot opera el saldo de tu cuenta. Las ganancias realizadas se abonan ahí.'
                  : 'The bot trades your account balance. Realised profit is credited back to it.');
        }
    }

    /* ============================ TERMINAL ============================ */

    function term(kind, cmd, parts) {
        B.term.push({ t: clock(), kind: kind, cmd: cmd, parts: parts });
        if (B.term.length > 220) B.term.shift();
        renderTerm();
    }

    function renderTerm() {
        var box = el('botTerm');
        if (!box) return;
        var atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 60;

        box.innerHTML = B.term.map(function (l) {
            var body = l.parts.map(function (p) {
                return '<span class="t-' + p[0] + '">' + p[1] + '</span>';
            }).join(' ');
            return '<div class="t-line">'
                + '<span class="t-ts">' + l.t + '</span>'
                + '<span class="t-mark ' + l.kind + '">' + (l.kind === 'ok' ? '✓' : l.kind === 'err' ? '✗' : '▸') + '</span>'
                + '<span class="t-cmd ' + l.kind + '">' + cmd8(l.cmd) + '</span>'
                + '<span class="t-body">' + body + '</span></div>';
        }).join('') + '<div class="t-line t-caret"><span class="t-ts">' + clock() + '</span>'
            + '<span class="t-mark run">▸</span><span class="t-cmd">vt-core</span>'
            + '<span class="t-body"><span class="t-dim">awaiting signal</span><span class="t-cursor"></span></span></div>';

        if (atBottom) box.scrollTop = box.scrollHeight;
        set('termCount', B.term.length);
    }

    function cmd8(c) { return (c + '        ').slice(0, 8); }

    /* ============================ POSITIONS ============================ */

    function openPosition() {
        var pool = enabledMarkets();
        if (!pool.length || B.positions.length >= B.maxPos) return;

        var pick = pool[Math.floor(Math.random() * pool.length)];
        if (B.positions.some(function (p) { return p.sym === pick.s; })) return;

        var st = strategy();
        var eq = equityNow();
        var riskAmt = eq * (B.risk / 100);
        var stopPct = 0.006 + Math.random() * 0.010;

        // Risk-based sizing, then two ceilings: the leverage cap, and a per-slot
        // cap so no single trade can swallow the whole book.
        var slotCap = (eq / B.maxPos) * 0.9;
        var notional = Math.min(riskAmt / stopPct, eq * B.leverage, slotCap);
        var long = Math.random() > 0.38;
        var entry = pick.p * (1 + 0.0015 * gauss());

        // The outcome is drawn from the strategy's edge, then the price path is
        // steered toward it. This is what makes the win rate on screen match
        // the strategy's advertised win rate.
        var willWin = Math.random() < st.win;

        var pos = {
            id: 'VT' + (Date.now().toString(36) + Math.random().toString(36).slice(2, 4)).slice(-6).toUpperCase(),
            sym: pick.s, cls: pick.cls, dp: pick.dp, g: pick.g, c: pick.c,
            long: long,
            entry: entry,
            mark: entry,
            notional: notional,
            size: notional / entry,
            sl: long ? entry * (1 - stopPct) : entry * (1 + stopPct),
            tp: long ? entry * (1 + stopPct * st.rr) : entry * (1 - stopPct * st.rr),
            stopPct: stopPct,
            willWin: willWin,
            opened: Date.now(),
            cadIn: notional * FX_CAD
        };
        B.positions.push(pos);
        B.signals += Math.floor(Math.random() * 30) + 12;

        var conf = (0.62 + Math.random() * 0.33).toFixed(2);
        var clsName = MARKETS[pick.cls].label[lang()] || MARKETS[pick.cls].label.en;

        term('run', 'scan', [
            ['sym', pick.s], ['dim', '·'], ['key', clsName],
            ['dim', '· vol'], ['num', (1.2 + Math.random() * 1.6).toFixed(1) + 'σ'],
            ['dim', '· rsi'], ['num', (28 + Math.random() * 44).toFixed(1)],
            ['dim', '→'], ['sig', 'SIGNAL ' + (long ? 'LONG' : 'SHORT')],
            ['dim', 'conf'], ['num', conf]
        ]);

        term('run', 'risk', [
            ['dim', 'equity'], ['num', money(eq, 2)],
            ['dim', '· risk'], ['num', B.risk.toFixed(1) + '%'],
            ['dim', '='], ['num', money(riskAmt, 2)],
            ['dim', '· slots'], ['num', B.positions.length + '/' + B.maxPos],
            ['ok2', 'PASS']
        ]);

        // Fiat is converted into the quote asset before the order goes out
        if (pick.cls === 'crypto') {
            term('run', 'convert', [
                ['dim', 'CAD'], ['num', pos.cadIn.toFixed(2)],
                ['dim', '→'], ['sym', 'USDT'], ['num', notional.toFixed(2)],
                ['dim', '@'], ['num', FX_CAD.toFixed(4)],
                ['dim', '· fee'], ['ok2', '0.00']
            ]);
        }

        term('run', 'order', [
            ['side' + (long ? 'L' : 'S'), long ? 'BUY' : 'SELL'],
            ['num', pos.size.toFixed(6)], ['sym', pick.s.split('/')[0]],
            ['dim', '@'], ['num', entry.toFixed(pick.dp)],
            ['dim', '· notional'], ['num', money(notional, 2)],
            ['dim', '· lev'], ['num', B.leverage + 'x']
        ]);

        term('ok', 'fill', [
            ['dim', 'filled'], ['num', pos.size.toFixed(6)],
            ['dim', '@'], ['num', (entry * (1 + 0.00002 * gauss())).toFixed(pick.dp)],
            ['dim', '· slip'], ['num', (Math.random() * 2.4).toFixed(1) + 'bp'],
            ['dim', '· lat'], ['num', (9 + Math.floor(Math.random() * 9)) + 'ms'],
            ['dim', '· id'], ['key', pos.id]
        ]);

        term('run', 'protect', [
            ['dim', 'SL'], ['down', pos.sl.toFixed(pick.dp)],
            ['dim', '(' + (-stopPct * 100).toFixed(2) + '%)'],
            ['dim', '· TP'], ['up', pos.tp.toFixed(pick.dp)],
            ['dim', '(+' + (stopPct * st.rr * 100).toFixed(2) + '%)']
        ]);

        renderPositions();
    }

    function closePosition(idx, reason) {
        var p = B.positions[idx];
        if (!p) return;

        var pnl = (p.long ? (p.mark - p.entry) : (p.entry - p.mark)) * p.size;
        var held = Math.max(1, Math.round((Date.now() - p.opened) / 60000));
        B.positions.splice(idx, 1);
        B.tradesToday++;
        if (pnl >= 0) B.wins++; else B.losses++;
        B.realised += pnl;

        var eq = equityNow() + pnl;
        B.equity.push(eq);
        if (B.equity.length > 420) B.equity.shift();
        if (eq > B.peak) B.peak = eq;

        term(pnl >= 0 ? 'ok' : 'err', 'exit', [
            ['key', reason === 'sl' ? 'STOP-LOSS' : reason === 'tp' ? 'TAKE-PROFIT' : 'MANUAL'],
            ['sym', p.sym], ['dim', '@'], ['num', p.mark.toFixed(p.dp)],
            ['dim', '·'], [pnl >= 0 ? 'up' : 'down', (pnl >= 0 ? '+' : '') + money(pnl, 2)],
            ['dim', '·'], [pnl >= 0 ? 'up' : 'down', (pnl >= 0 ? '+' : '') + ((pnl / p.notional) * 100).toFixed(2) + '%'],
            ['dim', '· hold'], ['num', held + 'm']
        ]);

        if (p.cls === 'crypto') {
            var back = (p.notional + pnl) * FX_CAD;
            term('run', 'settle', [
                ['sym', 'USDT'], ['num', (p.notional + pnl).toFixed(2)],
                ['dim', '→'], ['sym', 'CAD'], ['num', back.toFixed(2)],
                ['dim', '· net'], [pnl >= 0 ? 'up' : 'down', (pnl >= 0 ? '+' : '') + (pnl * FX_CAD).toFixed(2) + ' CAD']
            ]);
        }

        // Realised P&L flows back into the real account balance
        if (!B.demo && typeof win.setAccountBalance === 'function' && typeof win.accountBalance === 'number') {
            win.setAccountBalance(win.accountBalance + pnl);
        }

        renderPositions();
        renderKpis();
        drawEquity();
    }

    function tickPositions() {
        if (!B.positions.length) return;

        for (var i = B.positions.length - 1; i >= 0; i--) {
            var p = B.positions[i];

            // Bias the walk toward the outcome drawn when the trade was opened.
            // Tuned so a position takes several minutes to reach its stop or
            // target at 1x speed, rather than resolving in seconds.
            var pull = p.willWin ? 1 : -1;
            var dir = p.long ? 1 : -1;
            var step = (0.000068 * pull * dir * B.speed) + (0.00026 * gauss() * Math.sqrt(B.speed));
            p.mark *= Math.exp(step);

            if (p.long && p.mark <= p.sl) { closePosition(i, 'sl'); continue; }
            if (!p.long && p.mark >= p.sl) { closePosition(i, 'sl'); continue; }
            if (p.long && p.mark >= p.tp) { closePosition(i, 'tp'); continue; }
            if (!p.long && p.mark <= p.tp) { closePosition(i, 'tp'); continue; }

            if (B.rules.trail) {
                if (p.long) p.sl = Math.max(p.sl, p.mark * (1 - p.stopPct * 0.75));
                else p.sl = Math.min(p.sl, p.mark * (1 + p.stopPct * 0.75));
            }
        }
        renderPositions();
    }

    function renderPositions() {
        var body = el('botPositions');
        if (!body) return;

        var cEl = el('posCount');
        if (cEl) cEl.textContent = B.positions.length + ' ' + (lang() === 'fr' ? 'actives' : lang() === 'es' ? 'activas' : 'active');

        if (!B.positions.length) {
            body.innerHTML = '<tr><td colspan="7" class="pos-empty">'
                + (lang() === 'fr' ? 'Aucune position ouverte — le bot analyse le marché.'
                  : lang() === 'es' ? 'Sin posiciones abiertas — el bot está escaneando.'
                  : 'No open positions — the bot is scanning.')
                + '</td></tr>';
            return;
        }

        body.innerHTML = B.positions.map(function (p) {
            var pnl = (p.long ? (p.mark - p.entry) : (p.entry - p.mark)) * p.size;
            var pct = (pnl / p.notional) * 100;
            return '<tr>'
                + '<td><div class="pos-sym"><span class="pos-coin" style="background:' + p.c + '">' + p.g + '</span>'
                    + '<span>' + p.sym + '<span class="pos-cls">' + p.cls + '</span></span></div></td>'
                + '<td><span class="side-pill ' + (p.long ? 'long' : 'short') + '">' + (p.long ? 'Long' : 'Short') + '</span></td>'
                + '<td class="mono">' + p.entry.toFixed(p.dp) + '</td>'
                + '<td class="mono">' + p.mark.toFixed(p.dp) + '</td>'
                + '<td class="mono">' + money(p.notional, 0) + '</td>'
                + '<td class="mono" style="font-size:10.5px;color:var(--text-muted)">'
                    + p.sl.toFixed(p.dp) + ' / ' + p.tp.toFixed(p.dp) + '</td>'
                + '<td><span class="pnl ' + (pnl >= 0 ? 'up' : 'down') + '">'
                    + (pnl >= 0 ? '+' : '') + money(pnl, 2)
                    + '<br><span style="font-size:10px;opacity:0.8">' + (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%</span>'
                    + '</span></td></tr>';
        }).join('');
    }

    /* ============================ SEEDING ============================ */

    function seedEquity() {
        // Build an upward-trending curve with genuine pullbacks, anchored so the
        // final point equals the capital actually under management.
        var st = strategy();
        var bt = BACKTESTS[B.strategy];
        var n = 300;
        var edge = (st.win * st.rr - (1 - st.win)) * 0.0016;   // expectancy per step
        var vol = (bt.dd / 100) * 0.020;
        var v = 1;
        var path = [];
        for (var i = 0; i < n; i++) {
            v *= Math.exp(edge + vol * gauss());
            path.push(v);
        }
        var scale = B.capital / path[path.length - 1];
        B.equity = path.map(function (x) { return x * scale; });

        B.peak = Math.max.apply(null, B.equity);
        var dd = 0, peak = B.equity[0];
        for (var j = 0; j < B.equity.length; j++) {
            if (B.equity[j] > peak) peak = B.equity[j];
            var d = (peak - B.equity[j]) / peak;
            if (d > dd) dd = d;
        }
        B.maxDdSeen = dd * 100;
    }

    function seedTrades() {
        var st = strategy();
        B.tradesToday = 22 + Math.floor(Math.random() * 26);
        B.wins = Math.round(B.tradesToday * st.win);
        B.losses = B.tradesToday - B.wins;
        B.signals = 3100 + Math.floor(Math.random() * 4200);
        B.realised = equityNow() - B.equity[0];
    }

    /* ============================ KPIs ============================ */

    function renderKpis() {
        var eq = equityNow();
        var basis = B.equity.length ? B.equity[0] : B.capital;
        var pnl = eq - basis;
        var pnlPct = (pnl / basis) * 100;
        var total = B.wins + B.losses;
        var winRate = total ? (B.wins / total) * 100 : 0;
        var dd = B.peak > 0 ? ((B.peak - eq) / B.peak) * 100 : 0;
        var bt = BACKTESTS[B.strategy];
        var st = strategy();
        var sharpe = Math.max(0.3, (st.win * st.rr - (1 - st.win)) * 3.4);

        var pnlEl = el('kpiPnl');
        if (pnlEl) {
            pnlEl.textContent = (pnl >= 0 ? '+' : '') + money(pnl, 2);
            pnlEl.className = 'kpi-val ' + (pnl >= 0 ? 'up' : 'down');
        }
        set('kpiPnlSub', (pnlPct >= 0 ? '+' : '') + pnlPct.toFixed(2) + '% '
            + (lang() === 'fr' ? 'sur le capital' : lang() === 'es' ? 'sobre el capital' : 'on capital'));
        var bar = el('kpiPnlBar'); if (bar) bar.style.width = Math.min(100, Math.abs(pnlPct) * 2) + '%';

        var winEl = el('kpiWin');
        if (winEl) {
            winEl.textContent = winRate.toFixed(1) + '%';
            winEl.className = 'kpi-val ' + (winRate >= 50 ? 'up' : 'down');
        }
        set('kpiWinSub', B.wins + ' W / ' + B.losses + ' L');
        var wb = el('kpiWinBar'); if (wb) wb.style.width = winRate + '%';

        set('kpiTrades', B.tradesToday);
        var tSub = el('kpiTradesSub');
        if (tSub) tSub.textContent = B.positions.length + ' ' + (lang() === 'fr' ? 'ouvertes' : lang() === 'es' ? 'abiertas' : 'open now');
        var tb = el('kpiTradesBar'); if (tb) tb.style.width = Math.min(100, B.tradesToday * 2) + '%';

        var ddEl = el('kpiDd');
        if (ddEl) {
            ddEl.textContent = dd.toFixed(2) + '%';
            ddEl.className = 'kpi-val ' + (dd > B.maxDd * 0.7 ? 'down' : '');
        }
        set('kpiDdSub', (lang() === 'fr' ? 'Limite ' : lang() === 'es' ? 'Límite ' : 'Limit ') + B.maxDd + '%');
        var db = el('kpiDdBar'); if (db) db.style.width = Math.min(100, (dd / B.maxDd) * 100) + '%';

        set('kpiSharpe', sharpe.toFixed(2));
        var sb = el('kpiSharpeBar'); if (sb) sb.style.width = Math.min(100, sharpe * 28) + '%';

        set('botCapital', money(eq, 2));
        set('eqStart', money(basis, 0));
        set('eqNow', money(eq, 2));
        set('eqPeak', money(B.peak, 2));
        set('eqMaxDd', B.maxDdSeen.toFixed(2) + '%');

        set('btReturn', '+' + bt.ret.toFixed(1) + '%');
        set('btCagr', '+' + bt.cagr.toFixed(1) + '%');
        set('btMaxDd', '-' + bt.dd.toFixed(1) + '%');
        set('btPf', bt.pf.toFixed(2));
        set('btTrades', bt.trades.toLocaleString('en-US'));
        set('btHold', bt.hold);
    }

    function tickUptime() {
        var s = Math.floor((Date.now() - B.startedAt) / 1000);
        var h = Math.floor(s / 3600); s -= h * 3600;
        var m = Math.floor(s / 60); s -= m * 60;
        set('botUptime', pad(h) + ':' + pad(m) + ':' + pad(s));
        set('botLatency', (10 + Math.floor(Math.random() * 8)) + ' ms');
        set('botSignals', B.signals.toLocaleString('en-US'));
    }

    /* ============================ EQUITY CHART ============================ */

    function measure() {
        if (!B.canvas) return false;
        var r = B.canvas.parentElement.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) return false;
        var dpr = win.devicePixelRatio || 1;
        var bw = Math.round(r.width * dpr), bh = Math.round(r.height * dpr);
        if (B.canvas.width !== bw || B.canvas.height !== bh) { B.canvas.width = bw; B.canvas.height = bh; }
        B.dpr = dpr; B.w = r.width; B.h = r.height;
        return true;
    }

    function rangeSlice() {
        var n = B.equity.length;
        var counts = { '1D': 24, '1W': 90, '1M': 200, 'ALL': n };
        return B.equity.slice(n - Math.min(n, counts[B.range] || n));
    }

    function drawEquity() {
        if (!B.ctx || !measure()) return;
        var ctx = B.ctx, W = B.w, H = B.h;
        var cs = win.getComputedStyle(doc.documentElement);
        var muted = (cs.getPropertyValue('--text-light') || '#94a3b8').trim();

        ctx.setTransform(B.dpr, 0, 0, B.dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);

        var data = rangeSlice();
        if (data.length < 2) return;

        var axisW = 60;
        var plotW = Math.max(20, W - axisW), plotH = Math.max(20, H - 4);
        var lo = Math.min.apply(null, data), hi = Math.max.apply(null, data);
        if (hi === lo) hi = lo + 1;
        var pd = (hi - lo) * 0.14; lo -= pd; hi += pd;

        var X = function (i) { return (i / (data.length - 1)) * plotW; };
        var Y = function (v) { return plotH - ((v - lo) / (hi - lo)) * plotH; };

        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'right';
        for (var g = 0; g <= 4; g++) {
            var val = lo + ((hi - lo) / 4) * g, y = Y(val);
            ctx.strokeStyle = 'rgba(148,163,184,0.13)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(0, Math.round(y) + 0.5); ctx.lineTo(plotW, Math.round(y) + 0.5); ctx.stroke();
            ctx.fillStyle = muted;
            ctx.fillText('$' + (val >= 1000 ? Math.round(val / 1000) + 'k' : Math.round(val)), W - 6, y);
        }

        var up = data[data.length - 1] >= data[0];
        var line = up ? '#0ecb81' : '#f6465d';

        var grd = ctx.createLinearGradient(0, 0, 0, plotH);
        grd.addColorStop(0, up ? 'rgba(14,203,129,0.28)' : 'rgba(246,70,93,0.28)');
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.moveTo(0, plotH);
        for (var i = 0; i < data.length; i++) ctx.lineTo(X(i), Y(data[i]));
        ctx.lineTo(plotW, plotH);
        ctx.closePath();
        ctx.fillStyle = grd; ctx.fill();

        var base = data[0];
        if (base > lo && base < hi) {
            ctx.save();
            ctx.setLineDash([4, 4]);
            ctx.strokeStyle = 'rgba(148,163,184,0.5)';
            ctx.beginPath(); ctx.moveTo(0, Math.round(Y(base)) + 0.5); ctx.lineTo(plotW, Math.round(Y(base)) + 0.5); ctx.stroke();
            ctx.restore();
        }

        ctx.beginPath();
        for (var j = 0; j < data.length; j++) {
            if (j === 0) ctx.moveTo(X(j), Y(data[j])); else ctx.lineTo(X(j), Y(data[j]));
        }
        ctx.strokeStyle = line; ctx.lineWidth = 1.9; ctx.lineJoin = 'round'; ctx.stroke();

        var lx = X(data.length - 1), ly = Y(data[data.length - 1]);
        ctx.fillStyle = line;
        ctx.globalAlpha = 0.25; ctx.beginPath(); ctx.arc(lx, ly, 6.5, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(lx, ly, 3, 0, Math.PI * 2); ctx.fill();

        var label = money(data[data.length - 1], 0);
        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        var tw = Math.min(axisW, ctx.measureText(label).width + 12);
        ctx.fillStyle = line;
        ctx.fillRect(plotW, ly - 9, tw, 18);
        ctx.fillStyle = '#0b0e14';
        ctx.textAlign = 'center';
        ctx.fillText(label, plotW + tw / 2, ly);
    }

    /* ============================ PANELS ============================ */

    function renderStrategies() {
        var box = el('stratList');
        if (!box) return;
        box.innerHTML = STRATEGIES.map(function (s) {
            return '<div class="strat-item' + (s.id === B.strategy ? ' active' : '') + '" onclick="selectBotStrategy(\'' + s.id + '\', this)">'
                + '<span class="strat-radio"></span>'
                + '<div class="strat-info"><div class="strat-name">' + tr(s, 'name') + '</div>'
                + '<div class="strat-desc">' + tr(s, 'desc') + '</div></div>'
                + '<div class="strat-stat"><b>' + (s.win * 100).toFixed(1) + '%</b>'
                + '<span>' + (lang() === 'fr' ? 'réussite' : lang() === 'es' ? 'aciertos' : 'win rate') + '</span></div>'
                + '</div>';
        }).join('');
    }

    function renderPairs() {
        var box = el('pairCloud');
        if (!box) return;
        box.innerHTML = Object.keys(MARKETS).map(function (k) {
            var grp = MARKETS[k];
            return '<div class="pair-group">'
                + '<div class="pair-group-lbl">' + (grp.label[lang()] || grp.label.en) + '</div>'
                + '<div class="pair-row">' + grp.items.map(function (it) {
                    var on = !!B.enabled[it.s];
                    return '<span class="pair-tag' + (on ? ' on' : '') + '" onclick="toggleBotPair(\'' + it.s + '\', this)">'
                        + '<span class="pair-dot"></span>' + it.s + '</span>';
                }).join('') + '</div></div>';
        }).join('');
        set('pairCount', enabledMarkets().length + ' / ' + allMarkets().length);
    }

    function renderConfigNotes() {
        var eq = equityNow();
        var l = lang();
        set('cfgRiskVal', B.risk.toFixed(1) + '%');
        set('cfgRiskNote',
            l === 'fr' ? 'Perte maximale par position : ' + money(eq * (B.risk / 100), 2) + ' sur ' + money(eq, 2) + '.'
          : l === 'es' ? 'Pérdida máxima por posición: ' + money(eq * (B.risk / 100), 2) + ' sobre ' + money(eq, 2) + '.'
          : 'Maximum loss per position: ' + money(eq * (B.risk / 100), 2) + ' of ' + money(eq, 2) + '.');
        set('cfgDdVal', B.maxDd + '%');
        set('cfgPosVal', B.maxPos);
        set('cfgLevVal', B.leverage + '×');
        set('cfgLevNote',
            l === 'fr' ? 'Exposition notionnelle plafonnée à ' + money(eq * B.leverage, 0) + '.'
          : l === 'es' ? 'Exposición nocional limitada a ' + money(eq * B.leverage, 0) + '.'
          : 'Notional exposure capped at ' + money(eq * B.leverage, 0) + '.');
    }

    /* ============================ ACTIONS ============================ */

    function selectBotStrategy(id, elm) {
        if (!BACKTESTS[id]) return;
        B.strategy = id;
        doc.querySelectorAll('.strat-item').forEach(function (n) { n.classList.remove('active'); });
        if (elm) elm.classList.add('active');
        var s = strategy();
        term('run', 'config', [
            ['dim', 'strategy →'], ['key', s.name],
            ['dim', '· expected win'], ['up', (s.win * 100).toFixed(1) + '%'],
            ['dim', '· R:R'], ['num', '1:' + s.rr.toFixed(2)]
        ]);
        renderKpis();
    }

    function toggleBotPair(sym, elm) {
        B.enabled[sym] = !B.enabled[sym];
        if (elm) elm.classList.toggle('on', B.enabled[sym]);
        set('pairCount', enabledMarkets().length + ' / ' + allMarkets().length);
        term('run', 'universe', [
            ['dim', B.enabled[sym] ? 'armed' : 'disarmed'], ['sym', sym],
            ['dim', '· active'], ['num', enabledMarkets().length + ' instruments']
        ]);
    }

    function toggleBotRule(rule, elm) {
        B.rules[rule] = !B.rules[rule];
        if (elm) elm.classList.toggle('on', B.rules[rule]);
        if (rule === 'martingale' && B.rules.martingale) {
            term('err', 'risk', [['down', 'WARNING'], ['dim', 'recovery averaging enabled — losing positions will be scaled into']]);
        } else if (rule === 'stop' && !B.rules.stop) {
            term('err', 'risk', [['down', 'WARNING'], ['dim', 'hard stop-loss disabled — positions are unprotected']]);
        } else {
            term('run', 'config', [['key', rule], ['dim', '→'], [B.rules[rule] ? 'up' : 'dim', B.rules[rule] ? 'ON' : 'OFF']]);
        }
    }

    function updateBotConfig(key, value) {
        var v = parseFloat(value);
        if (key === 'risk') B.risk = v;
        else if (key === 'dd') B.maxDd = Math.round(v);
        else if (key === 'pos') B.maxPos = Math.round(v);
        else if (key === 'lev') B.leverage = Math.round(v);
        renderConfigNotes();
        renderKpis();
    }

    function toggleBotRunning() {
        // The CRM kill-switch outranks the customer.
        if (B.adminLocked) {
            term('err', 'engine', [['dim', 'the bot is disabled for this account by an administrator']]);
            return;
        }
        B.running = !B.running;
        if (win.vtBotPush) win.vtBotPush({ status: B.running ? 'running' : 'paused' });
        var hero = el('botHero');
        if (hero) hero.classList.toggle('paused', !B.running);
        var l = lang();
        set('botStatePill', B.running ? (l === 'fr' ? 'En marche' : l === 'es' ? 'Activo' : 'Running')
                                      : (l === 'fr' ? 'En pause' : l === 'es' ? 'Pausado' : 'Paused'));
        set('botPauseLabel', B.running ? (l === 'fr' ? 'Pause' : l === 'es' ? 'Pausar' : 'Pause')
                                       : (l === 'fr' ? 'Reprendre' : l === 'es' ? 'Reanudar' : 'Resume'));
        term(B.running ? 'ok' : 'err', 'engine', [
            ['dim', B.running ? 'resumed — scanning enabled' : 'paused — no new entries will be taken']
        ]);
    }

    function botKillSwitch() {
        if (!B.positions.length) {
            term('run', 'flatten', [['dim', 'no open positions']]);
            return;
        }
        var n = B.positions.length;
        while (B.positions.length) closePosition(0, 'manual');
        term('err', 'flatten', [['down', 'KILL SWITCH'], ['dim', n + ' position(s) closed at market']]);
    }

    function setBotRange(r, elm) {
        B.range = r;
        doc.querySelectorAll('.eq-range button').forEach(function (b) { b.classList.remove('active'); });
        if (elm) elm.classList.add('active');
        drawEquity();
    }

    function clearTerminal() {
        B.term = [];
        term('run', 'vt-core', [['dim', 'console cleared · engine still running']]);
    }

    /* ============================ LIFECYCLE ============================ */

    function stopTimers() { B.timers.forEach(clearInterval); B.timers = []; }

    function scanTick() {
        if (!B.running) return;
        B.signals += Math.floor(Math.random() * 50) + 18;

        var pool = enabledMarkets();
        if (!pool.length) return;

        // Most scans find nothing — a setup only fires now and then, which is
        // what a selective strategy actually looks like.
        if (B.positions.length < B.maxPos && Math.random() > 0.62) {
            openPosition();
        } else {
            var m = pool[Math.floor(Math.random() * pool.length)];
            term('run', 'scan', [
                ['sym', m.s], ['dim', '· spread'], ['num', (0.4 + Math.random() * 1.9).toFixed(1) + 'bp'],
                ['dim', '· no setup'],
                ['dim', '· exposure'], ['num', money(B.positions.reduce(function (a, p) { return a + p.notional; }, 0), 0)]
            ]);
        }
    }

    function initProTrader() {
        if (!el('botEquityChart')) return;
        stopTimers();

        B.canvas = el('botEquityChart');
        B.ctx = B.canvas.getContext('2d');
        B.startedAt = Date.now() - Math.floor(Math.random() * 30000000);
        B.positions = [];
        B.term = [];

        resolveCapital();
        seedEquity();
        seedTrades();
        renderStrategies();
        renderPairs();
        renderConfigNotes();
        renderKpis();
        renderPositions();
        drawEquity();

        term('ok', 'boot', [['key', 'VT-Core v4.2'], ['dim', '· engine online ·'],
            ['num', enabledMarkets().length + ' instruments'], ['dim', '· mode'],
            ['key', B.demo ? 'SIMULATION' : 'LIVE']]);
        term('run', 'capital', [
            ['dim', 'under management'], ['num', money(B.capital, 2)],
            ['dim', '· strategy'], ['key', strategy().name],
            ['dim', '· risk'], ['num', B.risk.toFixed(1) + '%']
        ]);

        for (var i = 0; i < 2; i++) openPosition();

        if (win.ResizeObserver) new ResizeObserver(function () { drawEquity(); }).observe(B.canvas.parentElement);

        startLoops();
        tickUptime();

        // Pull the server-side config last so it overrides the local defaults
        // (and applies an admin lock) once the panel is already on screen.
        if (win.vtBotLoad) win.vtBotLoad();
    }

    // Base cadence at 1x. Everything below is divided by B.speed.
    var BASE = { pos: 1800, scan: 11000, draw: 2500 };

    function startLoops() {
        stopTimers();
        B.timers.push(setInterval(tickUptime, 1000));
        B.timers.push(setInterval(function () {
            if (B.running) { tickPositions(); renderKpis(); }
        }, Math.round(BASE.pos / B.speed)));
        B.timers.push(setInterval(scanTick, Math.round(BASE.scan / B.speed)));
        B.timers.push(setInterval(function () { if (B.running) drawEquity(); }, BASE.draw));
    }

    function setBotSpeed(mult, elm) {
        B.speed = parseFloat(mult) || 1;
        doc.querySelectorAll('.speed-btn').forEach(function (b) { b.classList.remove('active'); });
        if (elm) elm.classList.add('active');
        startLoops();
        var l = lang();
        term('run', 'config', [
            ['dim', l === 'fr' ? 'vitesse de simulation →' : l === 'es' ? 'velocidad de simulación →' : 'simulation speed →'],
            ['key', B.speed + '×'],
            ['dim', '· ' + (l === 'fr' ? 'analyse toutes les ' : l === 'es' ? 'escaneo cada ' : 'scan every ')
                + (BASE.scan / B.speed / 1000).toFixed(1) + 's']
        ]);
    }

    win.addEventListener('resize', function () { if (B.ctx) drawEquity(); });

    /* ==================== SERVER-BACKED BOT STATE ====================
       The bot used to be entirely client-side, so nothing survived a refresh
       and the CRM had nothing to control. It now loads from /api/me/bot and
       writes changes back. `enabled_by_admin: false` is the CRM kill-switch:
       the customer cannot start the bot while it is set. */

    var STRATEGY_MAP = { conservative: 'meanrev', balanced: 'momentum', aggressive: 'breakout' };

    function applyServerBot(sb) {
        if (!sb) return;
        B.serverBot = sb;
        B.adminLocked = sb.enabled_by_admin === false;
        B.strategy = STRATEGY_MAP[sb.strategy] || B.strategy;
        B.leverage = sb.leverage || B.leverage;
        if (sb.max_position_size > 0) B.maxPos = sb.max_position_size;
        // A locked or stopped bot must not be left running in the UI.
        B.running = !B.adminLocked && sb.status === 'running';

        var pill = el('botStatePill');
        if (pill) pill.textContent = B.adminLocked ? 'Locked by admin' : (B.running ? 'Running' : 'Stopped');
        if (B.adminLocked) {
            term('err', 'engine', [['dim', 'the ProTrader Bot is disabled for this account'
                + (sb.admin_note ? ' — ' + sb.admin_note : '') + '. Contact support.']]);
        }
    }

    /** Persist a change; ignores failures so the UI stays usable offline. */
    function pushBot(patch) {
        if (!win.VTApi) return Promise.resolve();
        return win.VTApi.request('PATCH', '/api/me/bot', patch, true)
            .then(function (r) { B.serverBot = r.bot; })
            .catch(function (e) { console.warn('[protrader] could not save bot state', e.message); });
    }

    function loadServerBot() {
        if (!win.VTApi) return Promise.resolve();
        return win.VTApi.get('/api/me/bot', true)
            .then(function (r) { applyServerBot(r.bot); })
            .catch(function (e) { console.warn('[protrader] could not load bot state', e.message); });
    }

    win.vtBotLoad = loadServerBot;
    win.vtBotPush = pushBot;

    win.initProTrader = initProTrader;
    win.stopProTrader = stopTimers;
    win.selectBotStrategy = selectBotStrategy;
    win.toggleBotPair = toggleBotPair;
    win.toggleBotRule = toggleBotRule;
    win.updateBotConfig = updateBotConfig;
    win.toggleBotRunning = toggleBotRunning;
    win.botKillSwitch = botKillSwitch;
    win.setBotRange = setBotRange;
    win.setBotSpeed = setBotSpeed;
    win.clearTerminal = clearTerminal;
    win.VTBot = B;

})(window, document);
