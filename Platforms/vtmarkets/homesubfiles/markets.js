// -------------------------------------------------------------
// DYNAMIC MULTI-CATEGORY MARKETS DATA & WEBSOCKET ENGINE
// -------------------------------------------------------------
var marketsData = {
    forex: [
        { symbol: 'EUR / USD', pairKey: 'eurusd', icon: '🇪🇺', bg: '#2563eb', bid: 1.0854, base: 1.0850, change: 0.0012, pct: 0.11, vol: '$14.2B', spark: [10,12,8,14,10], quote: '🇺🇸' },
        { symbol: 'GBP / USD', pairKey: 'gbpusd', icon: '🇬🇧', bg: '#1d4ed8', bid: 1.2742, base: 1.2710, change: 0.0028, pct: 0.22, vol: '$9.8B', spark: [8,10,14,12,18], quote: '🇺🇸' },
        { symbol: 'USD / JPY', pairKey: 'usdjpy', icon: '🇺🇸', bg: '#ef4444', bid: 157.65, base: 158.10, change: -0.450, pct: -0.28, vol: '$12.5B', spark: [16,14,12,8,5], quote: '🇯🇵' },
        { symbol: 'AUD / USD', pairKey: 'audusd', icon: '🇦🇺', bg: '#059669', bid: 0.6654, base: 0.6630, change: 0.0018, pct: 0.27, vol: '$4.1B', spark: [5,9,11,15,14], quote: '🇺🇸' },
        { symbol: 'USD / CAD', pairKey: 'usdcad', icon: '🇺🇸', bg: '#dc2626', bid: 1.3685, base: 1.3700, change: -0.0015, pct: -0.11, vol: '$3.7B', spark: [14,12,10,8,6], quote: '🇨🇦' },
        { symbol: 'EUR / GBP', pairKey: 'eurgbp', icon: '🇪🇺', bg: '#4f46e5', bid: 0.8518, base: 0.8525, change: -0.0008, pct: -0.09, vol: '$2.9B', spark: [12,11,9,8,7], quote: '🇬🇧' },
        { symbol: 'NZD / USD', pairKey: 'nzdusd', icon: '🇳🇿', bg: '#0e7490', bid: 0.6128, base: 0.6110, change: 0.0018, pct: 0.29, vol: '$2.2B', spark: [7,9,11,14,13], quote: '🇺🇸' },
        { symbol: 'USD / CHF', pairKey: 'usdchf', icon: '🇺🇸', bg: '#dc2626', bid: 0.8762, base: 0.8780, change: -0.0018, pct: -0.21, vol: '$3.5B', spark: [13,11,9,8,7], quote: '🇨🇭' },
        { symbol: 'EUR / JPY', pairKey: 'eurjpy', icon: '🇪🇺', bg: '#2563eb', bid: 171.15, base: 171.50, change: -0.350, pct: -0.20, vol: '$5.4B', spark: [14,12,10,9,7], quote: '🇯🇵' },
        { symbol: 'GBP / JPY', pairKey: 'gbpjpy', icon: '🇬🇧', bg: '#1d4ed8', bid: 200.85, base: 200.20, change: 0.650, pct: 0.32, vol: '$4.8B', spark: [8,10,12,15,16], quote: '🇯🇵' },
        { symbol: 'AUD / CAD', pairKey: 'audcad', icon: '🇦🇺', bg: '#059669', bid: 0.9105, base: 0.9090, change: 0.0015, pct: 0.17, vol: '$1.1B', spark: [9,10,12,11,13], quote: '🇨🇦' },
        { symbol: 'EUR / AUD', pairKey: 'euraud', icon: '🇪🇺', bg: '#4f46e5', bid: 1.6312, base: 1.6340, change: -0.0028, pct: -0.17, vol: '$1.8B', spark: [15,13,11,9,8], quote: '🇦🇺' },
        { symbol: 'EUR / CAD', pairKey: 'eurcad', icon: '🇪🇺', bg: '#2563eb', bid: 1.4852, base: 1.4830, change: 0.0022, pct: 0.15, vol: '$1.5B', spark: [9,10,11,13,14], quote: '🇨🇦' },
        { symbol: 'GBP / AUD', pairKey: 'gbpaud', icon: '🇬🇧', bg: '#1d4ed8', bid: 1.9142, base: 1.9180, change: -0.0038, pct: -0.20, vol: '$1.3B', spark: [14,12,11,9,7], quote: '🇦🇺' },
        { symbol: 'CHF / JPY', pairKey: 'chfjpy', icon: '🇨🇭', bg: '#dc2626', bid: 179.90, base: 180.10, change: -0.200, pct: -0.11, vol: '$1.6B', spark: [12,11,10,9,8], quote: '🇯🇵' },
        { symbol: 'CAD / JPY', pairKey: 'cadjpy', icon: '🇨🇦', bg: '#dc2626', bid: 115.20, base: 114.80, change: 0.400, pct: 0.35, vol: '$1.2B', spark: [8,10,12,14,15], quote: '🇯🇵' }
    ],
    crypto: [
        { symbol: 'BTC / USD', pairKey: 'btcusdt', icon: '₿', bg: '#f7931a', bid: 67842.50, base: 64722.50, change: 3120.00, pct: 4.82, vol: '$42.8B', spark: [15,12,16,8,3] },
        { symbol: 'ETH / USD', pairKey: 'ethusdt', icon: 'Ξ', bg: '#627eea', bid: 3540.80, base: 3398.30, change: 142.50, pct: 4.18, vol: '$21.4B', spark: [18,10,14,5,2] },
        { symbol: 'SOL / USD', pairKey: 'solusdt', icon: '◎', bg: '#9945ff', bid: 148.60, base: 140.20, change: 8.40, pct: 5.99, vol: '$6.8B', spark: [10,14,12,6,2] },
        { symbol: 'XRP / USD', pairKey: 'xrpusdt', icon: '✕', bg: '#23292f', bid: 0.5842, base: 0.5522, change: 0.0320, pct: 5.80, vol: '$2.1B', spark: [12,10,8,5,1] },
        { symbol: 'BNB / USD', pairKey: 'bnbusdt', icon: '❖', bg: '#f3ba2f', bid: 582.10, base: 563.70, change: 18.40, pct: 3.26, vol: '$1.8B', spark: [14,11,13,8,4] },
        { symbol: 'ADA / USD', pairKey: 'adausdt', icon: '₳', bg: '#0033ad', bid: 0.4125, base: 0.3940, change: 0.0185, pct: 4.69, vol: '$850M', spark: [16,13,10,6,3] },
        { symbol: 'DOGE / USD', pairKey: 'dogeusdt', icon: 'Ð', bg: '#c2a633', bid: 0.1248, base: 0.1195, change: 0.0053, pct: 4.44, vol: '$1.4B', spark: [10,13,11,7,3] },
        { symbol: 'AVAX / USD', pairKey: 'avaxusdt', icon: 'A', bg: '#e84142', bid: 34.60, base: 33.15, change: 1.45, pct: 4.37, vol: '$620M', spark: [12,14,10,8,4] },
        { symbol: 'DOT / USD', pairKey: 'dotusdt', icon: '●', bg: '#e6007a', bid: 7.42, base: 7.18, change: 0.24, pct: 3.34, vol: '$380M', spark: [9,11,13,10,5] },
        { symbol: 'LINK / USD', pairKey: 'linkusdt', icon: '⬡', bg: '#2a5ada', bid: 14.85, base: 14.20, change: 0.65, pct: 4.58, vol: '$540M', spark: [11,13,10,8,4] },
        { symbol: 'MATIC / USD', pairKey: 'maticusdt', icon: 'M', bg: '#8247e5', bid: 0.5840, base: 0.5620, change: 0.0220, pct: 3.91, vol: '$310M', spark: [10,12,14,9,6] },
        { symbol: 'LTC / USD', pairKey: 'ltcusdt', icon: 'Ł', bg: '#bfbbbb', bid: 84.20, base: 81.50, change: 2.70, pct: 3.31, vol: '$420M', spark: [8,10,12,11,7] },
        { symbol: 'SHIB / USD', pairKey: 'shibusdt', icon: 'S', bg: '#fda32b', bid: 0.00001842, base: 0.00001760, change: 0.00000082, pct: 4.66, vol: '$280M', spark: [14,11,9,6,3] },
        { symbol: 'ATOM / USD', pairKey: 'atomusdt', icon: '⚛', bg: '#2e3148', bid: 9.15, base: 8.82, change: 0.33, pct: 3.74, vol: '$210M', spark: [10,12,11,9,5] },
        { symbol: 'UNI / USD', pairKey: 'uniusdt', icon: '🦄', bg: '#ff007a', bid: 7.80, base: 7.52, change: 0.28, pct: 3.72, vol: '$190M', spark: [9,11,13,10,6] },
        { symbol: 'NEAR / USD', pairKey: 'nearusdt', icon: 'N', bg: '#000000', bid: 5.45, base: 5.22, change: 0.23, pct: 4.41, vol: '$240M', spark: [11,14,12,8,4] }
    ],
    shares: [
        { symbol: 'NVDA', icon: 'N', bg: '#76b900', bid: 128.45, base: 124.33, change: 4.12, pct: 3.31, vol: '$28.4B', spark: [8,10,12,16,18] },
        { symbol: 'AAPL', icon: '🍎', bg: '#64748b', bid: 224.30, base: 222.45, change: 1.85, pct: 0.83, vol: '$12.1B', spark: [10,12,11,14,15] },
        { symbol: 'TSLA', icon: 'T', bg: '#e82127', bid: 210.60, base: 214.00, change: -3.40, pct: -1.59, vol: '$18.9B', spark: [16,14,10,8,4] },
        { symbol: 'AMZN', icon: 'a', bg: '#ff9900', bid: 186.20, base: 184.05, change: 2.15, pct: 1.17, vol: '$8.3B', spark: [9,11,10,14,16] },
        { symbol: 'MSFT', icon: '❖', bg: '#00a4ef', bid: 448.90, base: 445.30, change: 3.60, pct: 0.81, vol: '$9.7B', spark: [10,12,13,15,17] },
        { symbol: 'META', icon: 'M', bg: '#0081fb', bid: 512.40, base: 508.70, change: 3.70, pct: 0.73, vol: '$7.8B', spark: [9,11,13,14,16] },
        { symbol: 'GOOG', icon: 'G', bg: '#4285f4', bid: 178.90, base: 176.55, change: 2.35, pct: 1.33, vol: '$6.2B', spark: [8,10,12,14,15] },
        { symbol: 'AMD', icon: 'A', bg: '#ed1c24', bid: 164.80, base: 167.20, change: -2.40, pct: -1.44, vol: '$8.5B', spark: [15,13,11,9,7] },
        { symbol: 'NFLX', icon: 'N', bg: '#e50914', bid: 685.20, base: 678.40, change: 6.80, pct: 1.00, vol: '$3.9B', spark: [8,10,13,15,16] },
        { symbol: 'COIN', icon: 'C', bg: '#0052ff', bid: 225.60, base: 218.30, change: 7.30, pct: 3.34, vol: '$4.1B', spark: [7,10,12,15,17] },
        { symbol: 'JPM', icon: 'J', bg: '#003087', bid: 208.40, base: 206.90, change: 1.50, pct: 0.73, vol: '$3.2B', spark: [10,11,12,13,14] },
        { symbol: 'V', icon: 'V', bg: '#1a1f71', bid: 282.50, base: 280.80, change: 1.70, pct: 0.61, vol: '$2.8B', spark: [10,11,12,13,14] }
    ],
    indices: [
        { symbol: 'US500', icon: '🇺🇸', bg: '#2563eb', bid: 5584.20, base: 5555.80, change: 28.40, pct: 0.51, vol: '$45.0B', spark: [10,12,14,15,17] },
        { symbol: 'US30', icon: '🇺🇸', bg: '#1d4ed8', bid: 40128.50, base: 39983.50, change: 145.00, pct: 0.36, vol: '$32.1B', spark: [8,10,12,14,16] },
        { symbol: 'NAS100', icon: '📈', bg: '#0284c7', bid: 19842.00, base: 19661.80, change: 180.20, pct: 0.92, vol: '$38.4B', spark: [6,9,12,15,18] },
        { symbol: 'GER40', icon: '🇩🇪', bg: '#059669', bid: 18420.60, base: 18462.70, change: -42.10, pct: -0.23, vol: '$8.2B', spark: [14,12,11,9,6] },
        { symbol: 'UK100', icon: '🇬🇧', bg: '#4f46e5', bid: 8245.10, base: 8226.80, change: 18.30, pct: 0.22, vol: '$4.9B', spark: [9,11,12,13,14] },
        { symbol: 'JPN225', icon: '🇯🇵', bg: '#dc2626', bid: 38425.00, base: 38280.00, change: 145.00, pct: 0.38, vol: '$6.1B', spark: [9,10,12,13,15] },
        { symbol: 'AUS200', icon: '🇦🇺', bg: '#059669', bid: 7945.30, base: 7918.50, change: 26.80, pct: 0.34, vol: '$2.4B', spark: [10,11,12,13,14] },
        { symbol: 'FRA40', icon: '🇫🇷', bg: '#2563eb', bid: 7628.40, base: 7650.20, change: -21.80, pct: -0.28, vol: '$3.1B', spark: [14,12,11,10,8] },
        { symbol: 'HK50', icon: '🇭🇰', bg: '#dc2626', bid: 17850.00, base: 17720.00, change: 130.00, pct: 0.73, vol: '$4.5B', spark: [8,10,12,14,16] },
        { symbol: 'CHINA50', icon: '🇨🇳', bg: '#de2910', bid: 12180.50, base: 12095.00, change: 85.50, pct: 0.71, vol: '$3.8B', spark: [7,9,11,14,15] }
    ],
    metals: [
        { symbol: 'XAU / USD', icon: '🥇', bg: '#eab308', bid: 2412.50, base: 2394.10, change: 18.40, pct: 0.77, vol: '$18.5B', spark: [10,12,11,14,16], quote: '🇺🇸' },
        { symbol: 'XAG / USD', icon: '🥈', bg: '#94a3b8', bid: 31.25, base: 30.83, change: 0.42, pct: 1.36, vol: '$3.4B', spark: [8,10,12,15,17], quote: '🇺🇸' },
        { symbol: 'XPT / USD', icon: '⚪', bg: '#475569', bid: 985.40, base: 989.60, change: -4.20, pct: -0.42, vol: '$820M', spark: [14,12,10,8,6], quote: '🇺🇸' },
        { symbol: 'XPD / USD', icon: '🔘', bg: '#334155', bid: 962.10, base: 953.50, change: 8.60, pct: 0.90, vol: '$410M', spark: [9,11,10,13,15], quote: '🇺🇸' },
        { symbol: 'XCU / USD', icon: '🟤', bg: '#b45309', bid: 4.425, base: 4.390, change: 0.035, pct: 0.80, vol: '$1.2B', spark: [9,10,12,13,14], quote: '🇺🇸' }
    ],
    energy: [
        { symbol: 'USOIL', icon: '🛢️', bg: '#0f172a', bid: 81.45, base: 80.33, change: 1.12, pct: 1.39, vol: '$14.8B', spark: [8,10,12,14,16] },
        { symbol: 'UKOIL', icon: '🛢️', bg: '#334155', bid: 84.80, base: 83.85, change: 0.95, pct: 1.13, vol: '$9.2B', spark: [9,11,12,13,15] },
        { symbol: 'NGAS', icon: '⛽', bg: '#2563eb', bid: 2.185, base: 2.230, change: -0.045, pct: -2.02, vol: '$3.4B', spark: [16,14,12,8,4] },
        { symbol: 'HEAT OIL', icon: '🔥', bg: '#ea580c', bid: 2.584, base: 2.562, change: 0.022, pct: 0.86, vol: '$1.1B', spark: [9,10,12,13,14] },
        { symbol: 'GASOLINE', icon: '⛽', bg: '#16a34a', bid: 2.348, base: 2.372, change: -0.024, pct: -1.01, vol: '$980M', spark: [14,12,11,9,7] }
    ],
    etfs: [
        { symbol: 'SPY', icon: '📈', bg: '#2563eb', bid: 556.40, base: 553.60, change: 2.80, pct: 0.51, vol: '$22.0B', spark: [10,12,13,14,16] },
        { symbol: 'QQQ', icon: '💻', bg: '#0284c7', bid: 482.15, base: 477.85, change: 4.30, pct: 0.90, vol: '$16.5B', spark: [8,10,12,15,17] },
        { symbol: 'GLD', icon: '🪙', bg: '#eab308', bid: 222.80, base: 221.10, change: 1.70, pct: 0.77, vol: '$2.1B', spark: [9,11,12,14,15] },
        { symbol: 'IWM', icon: '📊', bg: '#7c3aed', bid: 210.85, base: 209.20, change: 1.65, pct: 0.79, vol: '$5.8B', spark: [9,10,12,14,15] },
        { symbol: 'EEM', icon: '🌍', bg: '#059669', bid: 42.15, base: 41.80, change: 0.35, pct: 0.84, vol: '$2.4B', spark: [8,10,11,13,14] },
        { symbol: 'ARKK', icon: '🚀', bg: '#3b82f6', bid: 48.90, base: 47.60, change: 1.30, pct: 2.73, vol: '$1.2B', spark: [7,9,12,15,17] },
        { symbol: 'DIA', icon: '💎', bg: '#1e40af', bid: 401.25, base: 399.80, change: 1.45, pct: 0.36, vol: '$3.5B', spark: [10,11,12,13,14] },
        { symbol: 'SLV', icon: '🥈', bg: '#94a3b8', bid: 28.90, base: 28.50, change: 0.40, pct: 1.40, vol: '$1.8B', spark: [8,10,12,15,16] }
    ]
};

var activeTab = 'crypto';
var searchQuery = '';

function searchMarkets(query) {
    searchQuery = (query || '').toLowerCase().trim();
    renderMarketsTable();
}

function switchMarketTab(category, btnElement) {
    activeTab = category;
    document.querySelectorAll('.markets-tabs .tab-btn').forEach(b => b.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');
    renderMarketsTable();
    syncFeedStatus();
}

// Three possible sources, and the badge names whichever is actually in use:
//   crypto            -> Binance websocket, genuinely live
//   real quotes cached -> upstream provider, minutes-to-hours old (its plan
//                         allows one credit per symbol, so a live board is not
//                         affordable) — shown with the time it was taken
//   nothing            -> simulated tick, said plainly
var marketQuotesAsOf = null;
var marketQuotesHave = {};

function syncFeedStatus() {
    var el = document.getElementById('liveFeedStatus');
    if (!el) return;
    var t = (typeof i18nDict !== 'undefined' && i18nDict[typeof currentLang !== 'undefined' ? currentLang : 'en']) || {};

    var isLive = activeTab === 'crypto'
        && wsCryptoStream && wsCryptoStream.readyState === WebSocket.OPEN;
    if (isLive) {
        el.textContent = t.feedLive || 'LIVE';
        el.className = 'feed-status live';
        el.title = 'Streaming from the exchange';
        return;
    }

    // Do any instruments on this tab have a real quote behind them?
    var items = marketsData[activeTab] || [];
    var realCount = items.filter(function (i) { return marketQuotesHave[i.symbol]; }).length;

    if (realCount && marketQuotesAsOf) {
        var d = new Date(marketQuotesAsOf);
        var hh = String(d.getHours()).padStart(2, '0');
        var mm = String(d.getMinutes()).padStart(2, '0');
        el.textContent = (t.feedAsOf || 'AS OF') + ' ' + hh + ':' + mm;
        el.className = 'feed-status delayed';
        el.title = 'Market prices, delayed. Last updated ' + d.toLocaleString();
        return;
    }

    // No feed for this category. Rather than labelling it, show nothing — the
    // badge is reserved for saying something true about a real source.
    el.textContent = '';
    el.className = 'feed-status empty';
    el.removeAttribute('title');
}

// Pulls the cached quotes and writes real prices over the seeded ones. The
// server holds a single copy for every visitor: the upstream plan bills per
// symbol, so a per-browser fetch would exhaust the daily budget immediately.
function loadRealQuotes() {
    if (!window.VTApi) return;
    VTApi.get('/api/markets/quotes', false)
        .then(function (r) {
            if (!r || !r.quotes) return;
            marketQuotesAsOf = r.as_of || null;
            marketQuotesHave = {};

            Object.keys(marketsData).forEach(function (cat) {
                if (cat === 'crypto') return;             // already live
                marketsData[cat].forEach(function (item) {
                    var q = r.quotes[item.symbol];
                    if (!q || q.price == null) return;
                    marketQuotesHave[item.symbol] = true;
                    item.bid = q.price;
                    if (q.change != null) item.change = q.change;
                    if (q.percent_change != null) item.pct = q.percent_change;
                    // Anchor the simulated drift to the real price so the two
                    // never diverge into nonsense between refreshes.
                    item.base = q.price - (q.change || 0);
                    item.real = true;
                });
            });

            renderMarketsTable();
            syncFeedStatus();
        })
        .catch(function () { /* keep the seeded values; the badge still says simulated */ });
}

function formatPrice(val, symbol) {
    if (val > 1000) return Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (val > 10) return val.toFixed(2);
    return val.toFixed(4);
}

// Symbol badge: dual overlapping coins for pairs, single coin otherwise
function buildSymbolIcon(item) {
    if (item.quote) {
        return `<div class="sym-pair">
            <span class="sym-coin base" style="background:${item.bg}">${item.icon}</span>
            <span class="sym-coin quote">${item.quote}</span>
        </div>`;
    }
    return `<div class="sym-pair">
        <span class="sym-coin base" style="background:${item.bg}">${item.icon}</span>
        <span class="sym-coin quote usd">$</span>
    </div>`;
}

function buildSparklineSVG(points, isPos) {
    var strokeColor = isPos ? '#10b981' : '#ef4444';
    var dPath = `M0,${points[0]} L20,${points[1]} L40,${points[2]} L60,${points[3]} L80,${points[4]}`;
    return `<svg class="sparkline-svg" viewBox="0 0 80 20">
        <path d="${dPath}" fill="none" stroke="${strokeColor}" stroke-width="2"/>
    </svg>`;
}

function renderMarketsTable() {
    var tbody = document.getElementById('marketsTableBody');
    if (!tbody) return;
    
    var items = marketsData[activeTab] || marketsData.crypto;
    
    if (searchQuery) {
        items = items.filter(item => item.symbol.toLowerCase().includes(searchQuery));
    }

    var html = '';
    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:24px; color:var(--text-muted);">No matching markets found</td></tr>';
        return;
    }

    items.forEach(function(item, idx) {
        var isPos = item.change >= 0;
        var changeSign = isPos ? '+' : '';
        var pillClass = isPos ? 'pos' : 'neg';
        var formattedPrice = formatPrice(item.bid, item.symbol);
        var formattedChange = changeSign + (item.bid > 1000 ? item.change.toFixed(2) : item.change.toFixed(4));
        var formattedPct = changeSign + item.pct.toFixed(2) + '%';
        var sparkSVG = buildSparklineSVG(item.spark, isPos);

        html += `<tr id="row-${activeTab}-${idx}">
            <td>
                <div class="market-symbol">
                    ${buildSymbolIcon(item)}
                    <span>${item.symbol}</span>
                </div>
            </td>
            <td><span class="bid-price" id="bid-${activeTab}-${idx}">${formattedPrice}</span></td>
            <td><span class="change-pill ${pillClass}" id="change-${activeTab}-${idx}">${formattedChange}</span></td>
            <td><span style="font-family:'JetBrains Mono',monospace; font-size:11px; color:var(--text-muted);">${item.vol || '$1.2B'}</span></td>
            <td id="spark-${activeTab}-${idx}">${sparkSVG}</td>
            <td><span class="change-pill ${pillClass}" id="pct-${activeTab}-${idx}">${formattedPct}</span></td>
            <td><button class="btn-trade-row" onclick="switchPageView('home')">Trade</button></td>
        </tr>`;
    });

    tbody.innerHTML = html;
}

// LIVE REAL-TIME MARKET DATA FEED
var wsCryptoStream = null;

function initLiveMarketFeed() {
    try {
        var streams = marketsData.crypto.map(function(c) { return c.pairKey + '@ticker'; });
        wsCryptoStream = new WebSocket('wss://stream.binance.com:9443/ws/' + streams.join('/'));

        wsCryptoStream.onopen = function() {
            console.log('[VT Markets] Live market feed connected');
            syncFeedStatus();
        };

        wsCryptoStream.onclose = function() { syncFeedStatus(); };
        wsCryptoStream.onerror = function() { syncFeedStatus(); };

        wsCryptoStream.onmessage = function(event) {
            var data = JSON.parse(event.data);
            if (!data || !data.s) return;

            var symbolKey = data.s.toLowerCase();
            var price = parseFloat(data.c);
            var priceChange = parseFloat(data.p);
            var pricePct = parseFloat(data.P);

            // NOTE: the hero price / 24h metrics are owned by chart.js (its own
            // ticker stream). Only the order form is synced from here.
            if (symbolKey === 'btcusdt') {
                var orderPriceInput = document.getElementById('orderPriceInput');
                if (orderPriceInput && document.activeElement !== orderPriceInput) {
                    orderPriceInput.value = price.toFixed(2);
                    if (typeof updateOrderTotal === 'function') updateOrderTotal();
                }
            }

            var cryptoItems = marketsData.crypto;
            for (var idx = 0; idx < cryptoItems.length; idx++) {
                if (cryptoItems[idx].pairKey === symbolKey) {
                    var item = cryptoItems[idx];
                    var direction = price >= item.bid ? 1 : -1;
                    item.bid = price;
                    item.change = priceChange;
                    item.pct = pricePct;

                    item.spark.shift();
                    item.spark.push(Math.max(2, Math.min(18, item.spark[item.spark.length - 1] + (direction > 0 ? -2 : 2))));

                    if (activeTab === 'crypto' && !searchQuery) {
                        var bidEl = document.getElementById(`bid-crypto-${idx}`);
                        var changeEl = document.getElementById(`change-crypto-${idx}`);
                        var pctEl = document.getElementById(`pct-crypto-${idx}`);
                        var sparkEl = document.getElementById(`spark-crypto-${idx}`);

                        var isPos = item.change >= 0;
                        var formattedPrice = formatPrice(item.bid, item.symbol);
                        var formattedChange = (isPos ? '+' : '') + (item.bid > 1000 ? item.change.toFixed(2) : item.change.toFixed(4));
                        var formattedPct = (isPos ? '+' : '') + item.pct.toFixed(2) + '%';

                        if (bidEl) {
                            bidEl.textContent = formattedPrice;
                            var flashClass = direction >= 0 ? 'flash-up' : 'flash-down';
                            bidEl.classList.add(flashClass);
                            (function(el, cls) {
                                setTimeout(function() { el.classList.remove(cls); }, 300);
                            })(bidEl, flashClass);
                        }
                        if (changeEl) {
                            changeEl.textContent = formattedChange;
                            changeEl.className = `change-pill ${isPos ? 'pos' : 'neg'}`;
                        }
                        if (pctEl) {
                            pctEl.textContent = formattedPct;
                            pctEl.className = `change-pill ${isPos ? 'pos' : 'neg'}`;
                        }
                        if (sparkEl) {
                            sparkEl.innerHTML = buildSparklineSVG(item.spark, isPos);
                        }
                    }
                    break;
                }
            }
        };

        wsCryptoStream.onerror = function() {
            console.log('[WebSocket Fallback] Using real-time simulated order stream');
        };
    } catch(e) {
        console.log('[WebSocket Fallback] Active');
    }
}

// Live Simulated Stream for Forex, Shares, Indices, Metals, Energy, ETFs
setInterval(function() {
    if (activeTab === 'crypto' && wsCryptoStream && wsCryptoStream.readyState === WebSocket.OPEN) {
        return;
    }

    var items = marketsData[activeTab];
    if (!items || items.length === 0 || searchQuery) return;

    var numTicks = Math.floor(Math.random() * 3) + 2; 
    
    for (var k = 0; k < numTicks; k++) {
        var randomIdx = Math.floor(Math.random() * items.length);
        var item = items[randomIdx];
        // Never walk an instrument that carries a real quote — drifting a true
        // price randomly would turn it back into an invented one.
        if (item.real) continue;

        var direction = (Math.random() - 0.47);
        var step = item.bid * (direction * 0.0005);
        item.bid += step;
        item.change = item.bid - item.base;
        item.pct = (item.change / item.base) * 100;

        item.spark.shift();
        var newSparkY = Math.max(2, Math.min(18, item.spark[item.spark.length - 1] + (direction > 0 ? -2.5 : 2.5)));
        item.spark.push(newSparkY);

        var isPos = item.change >= 0;
        var changeSign = isPos ? '+' : '';
        var formattedPrice = formatPrice(item.bid, item.symbol);
        var formattedChange = changeSign + (item.bid > 1000 ? item.change.toFixed(2) : item.change.toFixed(4));
        var formattedPct = changeSign + item.pct.toFixed(2) + '%';

        var bidEl = document.getElementById(`bid-${activeTab}-${randomIdx}`);
        var changeEl = document.getElementById(`change-${activeTab}-${randomIdx}`);
        var pctEl = document.getElementById(`pct-${activeTab}-${randomIdx}`);
        var sparkEl = document.getElementById(`spark-${activeTab}-${randomIdx}`);

        if (bidEl) {
            bidEl.textContent = formattedPrice;
            var flashClass = direction >= 0 ? 'flash-up' : 'flash-down';
            bidEl.classList.add(flashClass);
            (function(el, cls) {
                setTimeout(function() { el.classList.remove(cls); }, 350);
            })(bidEl, flashClass);
        }

        if (changeEl) {
            changeEl.textContent = formattedChange;
            changeEl.className = `change-pill ${isPos ? 'pos' : 'neg'}`;
        }

        if (pctEl) {
            pctEl.textContent = formattedPct;
            pctEl.className = `change-pill ${isPos ? 'pos' : 'neg'}`;
        }

        if (sparkEl) {
            sparkEl.innerHTML = buildSparklineSVG(item.spark, isPos);
        }
    }
}, 450);

document.addEventListener('DOMContentLoaded', function() {
    renderMarketsTable();
    initLiveMarketFeed();
    syncFeedStatus();
    loadRealQuotes();
    // The server refreshes on a slow rotation, so re-read every few minutes:
    // a long-open tab picks up new values without hammering anything.
    setInterval(loadRealQuotes, 5 * 60 * 1000);
});
