// -------------------------------------------------------------
// VT MARKETS INTERACTIVE APP UI, THEME ENGINE & SPA SWITCHER
// -------------------------------------------------------------

// LIGHT / DARK THEME ENGINE
function initTheme() {
    var savedTheme = localStorage.getItem('vt_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    var currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    var newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('vt_theme', newTheme);
    updateThemeIcon(newTheme);
    console.log('[Theme Engine] Switched theme to:', newTheme);
    if (typeof drawChart === 'function') drawChart();
}

function updateThemeIcon(theme) {
    var icon = theme === 'dark' ? '☀️' : '🌙';
    var btn = document.getElementById('themeToggleBtn');
    if (btn) {
        btn.innerHTML = icon;
        btn.title = theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    }
    // Mirror into the mobile profile menu entry
    var menuIcon = document.getElementById('themeMenuIcon');
    if (menuIcon) menuIcon.textContent = icon;
}

// Mobile: notifications live inside the profile dropdown
function openNotificationsFromMenu(evt) {
    if (evt && evt.stopPropagation) evt.stopPropagation();
    var profile = document.getElementById('profileDropdown');
    if (profile) profile.classList.remove('active');
    var notif = document.getElementById('notifDropdown');
    if (notif) notif.classList.add('active');
}

// SIDEBAR TOGGLES
function toggleSidebar() {
    var sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('collapsed');
}

function toggleMobileSidebar() {
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('sidebarOverlay');
    if (sidebar) sidebar.classList.toggle('mobile-open');
    if (overlay) overlay.classList.toggle('active');
}

function closeMobileSidebar() {
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('sidebarOverlay');
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (overlay) overlay.classList.remove('active');
}

function toggleSubMenu(element) {
    if (!element) return;
    var sidebar = document.getElementById('sidebar');

    // A collapsed sidebar hides the labels, so opening a group there would
    // reveal nothing. Expand the rail first, then open the group.
    if (sidebar && sidebar.classList.contains('collapsed')) {
        sidebar.classList.remove('collapsed');
        element.classList.add('expanded');
        return;
    }

    element.classList.toggle('expanded');
}

// ACCOUNT BALANCE (single source of truth for the card + navbar pill)
var accountBalance = 0.00;
var accountCurrency = 'CAD';
var balanceRevealed = true;

function formatBalance() {
    return '$' + accountBalance.toLocaleString('en-US', {
        minimumFractionDigits: 2, maximumFractionDigits: 2
    }) + ' ' + accountCurrency;
}

function setAccountBalance(value) {
    accountBalance = Number(value) || 0;
    renderBalance();
}

function renderBalance() {
    var shown = balanceRevealed ? formatBalance() : '••••• ' + accountCurrency;
    var card = document.getElementById('balanceText');
    if (card) card.textContent = shown;
    var nav = document.getElementById('navBalanceVal');
    if (nav) nav.textContent = shown;
}

function toggleBalance(icon) {
    balanceRevealed = !balanceRevealed;
    if (icon) icon.textContent = balanceRevealed ? '👁️' : '🙈';
    renderBalance();
}

// HEADER DROPDOWNS
function toggleHeaderDropdown(dropdownId, evt) {
    if (evt && evt.stopPropagation) evt.stopPropagation();
    var dropdowns = document.querySelectorAll('.header-dropdown');
    dropdowns.forEach(function(d) {
        if (d.id !== dropdownId) d.classList.remove('active');
    });
    var target = document.getElementById(dropdownId);
    if (target) target.classList.toggle('active');
}

function clearNotifications() {
    var items = document.querySelectorAll('.notif-item.unread');
    items.forEach(item => item.classList.remove('unread'));
    var dot = document.getElementById('notifDot');
    if (dot) dot.style.display = 'none';
}

// CLOSE DROPDOWNS ON OUTSIDE CLICK
document.addEventListener('click', function(e) {
    if (!e.target.closest('.dropdown-relative')) {
        document.querySelectorAll('.header-dropdown').forEach(d => d.classList.remove('active'));
    }
});

// SPA PAGE VIEW SWITCHER ENGINE WITH MODULAR SUBFILE TEMPLATES
function switchPageView(viewId, clickedEl) {
    var views = document.querySelectorAll('.page-view');
    views.forEach(v => v.classList.remove('active'));

    var targetView = document.getElementById('view-' + viewId);
    if (targetView) {
        // If modular subfile view exists in viewsContainer, inject it dynamically
        if (window.viewsContainer && window.viewsContainer[viewId]) {
            targetView.innerHTML = window.viewsContainer[viewId];
            if (typeof applyLanguage === 'function') {
                applyLanguage(window.currentLang || localStorage.getItem('vt_lang') || 'fr');
            }
        }
        targetView.classList.add('active');

        // Views injected as HTML strings need their dynamic parts built
        if (viewId === 'deposit') {
            currentDepositAsset = 'USDT';
            renderDepositNetworks();
            updateFiatSummary();
        } else if (viewId === 'withdraw') {
            // Always land on the payout-method chooser
            currentWithdrawMethod = null;
            currentWithdrawAsset = 'USDT';
            backToWithdrawMethods();
        } else if (viewId === 'protrader') {
            if (typeof initProTrader === 'function') setTimeout(initProTrader, 30);
        }

        // The bot console runs timers — shut them down when leaving the page
        if (viewId !== 'protrader' && typeof stopProTrader === 'function') stopProTrader();
    }

    document.querySelectorAll('.sidebar-menu .menu-item, .sidebar-menu .sub-item').forEach(function (el) {
        el.classList.remove('active', 'parent-active');
    });

    var navEl = clickedEl || document.getElementById('nav-' + viewId);
    if (navEl) {
        navEl.classList.add('active');

        // If it's a sub-section, keep its group open and mark the parent too,
        // otherwise the highlight disappears with the collapsed sub-menu.
        var subMenu = navEl.closest('.sub-menu');
        if (subMenu) {
            var parent = subMenu.previousElementSibling;
            if (parent && parent.classList.contains('menu-item')) {
                parent.classList.add('expanded', 'parent-active');
            }
        }
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    closeMobileSidebar();
    console.log('[SPA Navigation] Switched to view:', viewId);
}

// QUICK ORDER EXECUTION PANEL LOGIC
var currentOrderSide = 'buy';
var currentLeverage = '20x';

function setOrderSide(side) {
    currentOrderSide = side;
    var buyBtn = document.getElementById('btnOrderBuy');
    var sellBtn = document.getElementById('btnOrderSell');
    var submitBtn = document.getElementById('btnSubmitOrder');

    if (side === 'buy') {
        if (buyBtn) buyBtn.className = 'order-tab-btn active buy';
        if (sellBtn) sellBtn.className = 'order-tab-btn';
        if (submitBtn) {
            submitBtn.textContent = 'INSTANT BUY BTC';
            submitBtn.style.background = '#10b981';
        }
    } else {
        if (buyBtn) buyBtn.className = 'order-tab-btn';
        if (sellBtn) sellBtn.className = 'order-tab-btn active sell';
        if (submitBtn) {
            submitBtn.textContent = 'INSTANT SELL BTC';
            submitBtn.style.background = '#ef4444';
        }
    }
}

function setLeverage(lev, btn) {
    currentLeverage = lev;
    document.querySelectorAll('.leverage-pills .lev-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
}

function updateOrderTotal() {
    var priceEl = document.getElementById('orderPriceInput');
    var amountEl = document.getElementById('orderAmountInput');
    var totalEl = document.getElementById('orderTotalVal');

    if (!priceEl || !amountEl || !totalEl) return;
    var price = parseFloat(priceEl.value.replace(/,/g, '')) || 67842.50;
    var amount = parseFloat(amountEl.value) || 0;
    var total = price * amount;
    totalEl.textContent = '$' + total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' USDT';
}

function executeQuickOrder() {
    var amountEl = document.getElementById('orderAmountInput');
    var amount = parseFloat(amountEl ? amountEl.value : 0) || 0;
    if (amount <= 0) {
        alert('Please enter a valid order amount greater than 0.');
        return;
    }
    var sideUpper = currentOrderSide.toUpperCase();
    alert('⚡ Order executed\n\nType: ' + sideUpper + ' BTC/USDT\nAmount: ' + amount + ' BTC\nLeverage: ' + currentLeverage + '\nStatus: Filled on the VT Markets matching engine');
}

// =============================================================
// FUNDS SUITE — deposit / withdraw / payment details / history
// =============================================================

// Asset → available networks, addresses, minimums and confirmations
var DEPOSIT_ASSETS = {
    USDT: {
        networks: [
            { id: 'TRC20', name: 'TRON (TRC20)', meta: 'Fastest and cheapest for USDT', fee: '1.00 USDT', eta: '~2 min', conf: 1, min: '10 USDT', addr: 'TYv9K2mP8NqW5xL7zR4bV1cX0yA3eM6k9D' },
            { id: 'ERC20', name: 'Ethereum (ERC20)', meta: 'Widest exchange support', fee: '6.50 USDT', eta: '~5 min', conf: 12, min: '20 USDT', addr: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' },
            { id: 'BEP20', name: 'BNB Smart Chain (BEP20)', meta: 'Low fee alternative', fee: '0.30 USDT', eta: '~1 min', conf: 15, min: '10 USDT', addr: '0x9f2A4b81C3De5077aB1e4F6D2c8B90aE3f77cD21' }
        ]
    },
    BTC: {
        networks: [
            { id: 'BTC', name: 'Bitcoin', meta: 'Native SegWit (bech32)', fee: '0.00010 BTC', eta: '~30 min', conf: 2, min: '0.0005 BTC', addr: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq' },
            { id: 'BEP20', name: 'BNB Smart Chain (BEP20)', meta: 'Wrapped BTCB token', fee: '0.0000060 BTC', eta: '~1 min', conf: 15, min: '0.0001 BTC', addr: '0x3Ae1c5F0b7D82a94Ec6B41d9F0aA2c7E58b3D904' }
        ]
    },
    ETH: {
        networks: [
            { id: 'ERC20', name: 'Ethereum', meta: 'Mainnet', fee: '0.00120 ETH', eta: '~5 min', conf: 12, min: '0.005 ETH', addr: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' },
            { id: 'ARBITRUM', name: 'Arbitrum One', meta: 'Layer 2 rollup, lower fees', fee: '0.00004 ETH', eta: '~1 min', conf: 30, min: '0.002 ETH', addr: '0xB48d7C1a5E9F02c3D8a716Bb4590fE21c73aD855' }
        ]
    },
    SOL: {
        networks: [
            { id: 'SOL', name: 'Solana', meta: 'Native SPL network', fee: '0.00001 SOL', eta: '< 1 min', conf: 1, min: '0.05 SOL', addr: '7xKXtg2CW87d97TXJSDpbD5jBk45M5z9L32pQ2' }
        ]
    }
};

var currentDepositAsset = 'USDT';
var currentDepositNetwork = 'TRC20';

function selectDepositAsset(asset, chipEl) {
    if (!DEPOSIT_ASSETS[asset]) return;
    currentDepositAsset = asset;
    document.querySelectorAll('#depositAssetPicker .asset-chip').forEach(function (c) { c.classList.remove('active'); });
    if (chipEl) chipEl.classList.add('active');
    renderDepositNetworks();
}

function renderDepositNetworks() {
    var list = document.getElementById('depositNetworkList');
    if (!list) return;
    var nets = DEPOSIT_ASSETS[currentDepositAsset].networks;
    currentDepositNetwork = nets[0].id;

    list.innerHTML = nets.map(function (n, i) {
        return '<div class="network-item' + (i === 0 ? ' active' : '') + '" onclick="selectDepositNetwork(\'' + n.id + '\', this)">'
            + '<span class="network-radio"></span>'
            + '<div class="network-info">'
            + '<div class="network-name">' + n.name + '</div>'
            + '<div class="network-meta">' + n.meta + '</div>'
            + '</div>'
            + '<div class="network-fee">' + n.fee + '<small>' + n.eta + '</small></div>'
            + '</div>';
    }).join('');

    applyDepositNetwork(nets[0]);
}

function selectDepositNetwork(netId, itemEl) {
    var net = DEPOSIT_ASSETS[currentDepositAsset].networks.filter(function (n) { return n.id === netId; })[0];
    if (!net) return;
    currentDepositNetwork = netId;
    document.querySelectorAll('#depositNetworkList .network-item').forEach(function (n) { n.classList.remove('active'); });
    if (itemEl) itemEl.classList.add('active');
    applyDepositNetwork(net);
}

function applyDepositNetwork(net) {
    var addr = document.getElementById('depositAddrInput');
    if (addr) addr.value = net.addr;
    var setTxt = function (id, v) { var e = document.getElementById(id); if (e) e.textContent = v; };
    setTxt('depositAssetLabel', currentDepositAsset);
    setTxt('depositNetworkLabel', '· ' + net.id);
    setTxt('depositMinVal', net.min);
    setTxt('depositConfVal', String(net.conf));
    setTxt('depositEtaVal', net.eta);
}

function copyDepositAddress() {
    var input = document.getElementById('depositAddrInput');
    var btn = document.getElementById('btnCopyAddr');
    if (!input) return;

    var done = function () {
        if (!btn) return;
        var original = btn.textContent;
        btn.textContent = '✓ Copied';
        btn.classList.add('done');
        setTimeout(function () { btn.textContent = original; btn.classList.remove('done'); }, 1800);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(input.value).then(done).catch(function () {
            input.select(); document.execCommand('copy'); done();
        });
    } else {
        input.select();
        document.execCommand('copy');
        done();
    }
}

// ---------- FIAT ----------

// Flag emoji do not render on Windows, so currencies carry a real inline SVG.
var UJ = '<path d="M0 0l24 24M24 0L0 24" stroke="#fff" stroke-width="5"/>'
    + '<path d="M0 0l24 24M24 0L0 24" stroke="#C8102E" stroke-width="2.5"/>'
    + '<path d="M12 0v24M0 12h24" stroke="#fff" stroke-width="8"/>'
    + '<path d="M12 0v24M0 12h24" stroke="#C8102E" stroke-width="4.5"/>';

function euStars() {
    var s = '';
    for (var k = 0; k < 12; k++) {
        var a = (k * 30 - 90) * Math.PI / 180;
        s += '<circle cx="' + (12 + 7 * Math.cos(a)).toFixed(2) + '" cy="' + (12 + 7 * Math.sin(a)).toFixed(2) + '" r="1.15" fill="#ffcc00"/>';
    }
    return s;
}

var FLAGS = {
    CA: '<rect width="24" height="24" fill="#fff"/><rect width="6" height="24" fill="#d52b1e"/><rect x="18" width="6" height="24" fill="#d52b1e"/>'
        + '<path d="M12 6.5l1.15 2.5 2.5-.65-.95 2.3 1.55 1.25-2.2.55.4 2.5-2.45-1.35-2.45 1.35.4-2.5-2.2-.55L9.3 10.65l-.95-2.3 2.5.65z" fill="#d52b1e"/>',
    US: '<rect width="24" height="24" fill="#fff"/><g fill="#b22234"><rect width="24" height="2.4"/><rect y="4.8" width="24" height="2.4"/><rect y="9.6" width="24" height="2.4"/><rect y="14.4" width="24" height="2.4"/><rect y="19.2" width="24" height="2.4"/></g><rect width="11" height="12" fill="#3c3b6e"/>',
    EU: '<rect width="24" height="24" fill="#003399"/>' + euStars(),
    GB: '<rect width="24" height="24" fill="#012169"/>' + UJ,
    AU: '<rect width="24" height="24" fill="#012169"/><g transform="scale(0.5)">' + UJ + '</g>'
        + '<circle cx="17.5" cy="16" r="1.4" fill="#fff"/><circle cx="20" cy="9.5" r="0.9" fill="#fff"/><circle cx="21" cy="19" r="0.9" fill="#fff"/><circle cx="15" cy="20.5" r="0.9" fill="#fff"/>',
    JP: '<rect width="24" height="24" fill="#fff"/><circle cx="12" cy="12" r="6.2" fill="#bc002d"/>',
    CH: '<rect width="24" height="24" fill="#da291c"/><rect x="10" y="5" width="4" height="14" fill="#fff"/><rect x="5" y="10" width="14" height="4" fill="#fff"/>',
    NZ: '<rect width="24" height="24" fill="#012169"/><g transform="scale(0.5)">' + UJ + '</g>'
        + '<circle cx="18" cy="9.5" r="1.1" fill="#C8102E" stroke="#fff" stroke-width="0.5"/><circle cx="20" cy="15" r="1.1" fill="#C8102E" stroke="#fff" stroke-width="0.5"/>'
        + '<circle cx="15.5" cy="17.5" r="1.1" fill="#C8102E" stroke="#fff" stroke-width="0.5"/><circle cx="17.5" cy="21" r="0.9" fill="#C8102E" stroke="#fff" stroke-width="0.5"/>'
};

var CURRENCIES = [
    { code: 'CAD', name: 'Canadian Dollar', sym: '$', flag: 'CA' },
    { code: 'USD', name: 'US Dollar', sym: '$', flag: 'US' },
    { code: 'EUR', name: 'Euro', sym: '€', flag: 'EU' },
    { code: 'GBP', name: 'British Pound', sym: '£', flag: 'GB' },
    { code: 'AUD', name: 'Australian Dollar', sym: '$', flag: 'AU' },
    { code: 'JPY', name: 'Japanese Yen', sym: '¥', flag: 'JP' },
    { code: 'CHF', name: 'Swiss Franc', sym: 'Fr', flag: 'CH' },
    { code: 'NZD', name: 'New Zealand Dollar', sym: '$', flag: 'NZ' }
];

function flagSvg(code) {
    return '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' + (FLAGS[code] || '') + '</svg>';
}

function buildCurrencyMenu() {
    var menu = document.getElementById('curMenu');
    if (!menu) return;
    var current = getFiatCurrency();
    menu.innerHTML = CURRENCIES.map(function (c) {
        return '<div class="cur-option' + (c.code === current ? ' selected' : '') + '" onclick="selectCurrency(\'' + c.code + '\', event)">'
            + '<span class="cur-flag">' + flagSvg(c.flag) + '</span>'
            + '<span class="cur-code">' + c.code + '</span>'
            + '<span class="cur-name">' + c.name + '</span>'
            + '<span class="cur-symbol">' + c.sym + '</span>'
            + '</div>';
    }).join('');
    renderCurrencyTrigger(current);
}

function renderCurrencyTrigger(code) {
    var c = CURRENCIES.filter(function (x) { return x.code === code; })[0] || CURRENCIES[0];
    var set = function (id, html) { var e = document.getElementById(id); if (e) e.innerHTML = html; };
    set('curFlag', flagSvg(c.flag));
    set('curCode', c.code);
    set('curName', c.name);
}

function getFiatCurrency() {
    var hidden = document.getElementById('fiatCurrencySelect');
    return hidden ? hidden.value : 'CAD';
}

function toggleCurrencyMenu(evt) {
    if (evt && evt.stopPropagation) evt.stopPropagation();
    var wrap = document.getElementById('curSelect');
    if (wrap) wrap.classList.toggle('open');
}

function selectCurrency(code, evt) {
    if (evt && evt.stopPropagation) evt.stopPropagation();
    var hidden = document.getElementById('fiatCurrencySelect');
    if (hidden) hidden.value = code;
    var wrap = document.getElementById('curSelect');
    if (wrap) wrap.classList.remove('open');
    buildCurrencyMenu();
    updateFiatSummary();
}

document.addEventListener('click', function (e) {
    if (!e.target.closest || !e.target.closest('#curSelect')) {
        var wrap = document.getElementById('curSelect');
        if (wrap) wrap.classList.remove('open');
    }
});

var FIAT_PRESETS = [250, 500, 750, 1000];
var fiatAmount = FIAT_PRESETS[0];

function setFiatPreset(value, btn) {
    fiatAmount = value;
    document.querySelectorAll('.fiat-preset').forEach(function (b) { b.classList.remove('active'); });
    if (btn) btn.classList.add('active');
    var input = document.getElementById('fiatDepositAmountInput');
    if (input) input.value = value.toFixed(2);
    updateFiatSummary();
}

function updateFiatSummary() {
    var input = document.getElementById('fiatDepositAmountInput');
    var code = getFiatCurrency();
    var amount = input ? (parseFloat(String(input.value).replace(/[^0-9.]/g, '')) || 0) : fiatAmount;
    var fmt = function (v) { return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + code; };
    var set = function (id, v) { var e = document.getElementById(id); if (e) e.textContent = v; };
    set('fiatSumAmount', fmt(amount));
    set('fiatSumFee', fmt(0));
    set('fiatSumTotal', fmt(amount));
    set('fiatUnitLabel', code);
}

// ---------- WITHDRAW ----------

// Crypto balances
var WITHDRAW_ASSETS = {
    USDT: { avail: 85420.00, fee: 1.00, dp: 2, limit: 2500000 },
    BTC: { avail: 2.1004, fee: 0.00010, dp: 5, limit: 40 },
    ETH: { avail: 14.5000, fee: 0.00120, dp: 4, limit: 700 },
    SOL: { avail: 320.00, fee: 0.00001, dp: 2, limit: 18000 }
};

// Cash balance used by every fiat payout route
var FIAT_AVAILABLE = 128460.75;

// Payout routes. flat = fixed fee, pct = percentage fee.
var WITHDRAW_METHODS = {
    crypto: {
        panel: 'wdPanelCrypto', kind: 'crypto', ico: 'gold',
        name: 'Crypto wallet', nameFr: 'Portefeuille crypto', nameEs: 'Monedero cripto',
        desc: 'Send BTC, ETH, USDT or SOL on-chain',
        descFr: 'Envoyer BTC, ETH, USDT ou SOL on-chain',
        descEs: 'Enviar BTC, ETH, USDT o SOL on-chain',
        eta: '2–30 min', feeLabel: 'networkFee',
        svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5h4a2 2 0 0 1 0 4h-4h4a2 2 0 0 1 0 4h-4M11 7v10M13.5 7v10"/></svg>'
    },
    bank: {
        panel: 'wdPanelBank', kind: 'fiat', ico: '', cur: 'CAD', flat: 0, pct: 0, limit: 100000,
        name: 'Canadian bank account', nameFr: 'Compte bancaire canadien', nameEs: 'Cuenta bancaria canadiense',
        desc: 'Direct EFT deposit to any Canadian bank',
        descFr: 'Virement EFT direct vers toute banque canadienne',
        descEs: 'Depósito EFT directo a cualquier banco canadiense',
        eta: '1–3 business days', etaFr: '1–3 jours ouvrés', etaEs: '1–3 días hábiles',
        svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 10l9-6 9 6"/><path d="M5 10v9M9.5 10v9M14.5 10v9M19 10v9"/><path d="M3 21h18"/></svg>'
    },
    interac: {
        panel: 'wdPanelInterac', kind: 'fiat', ico: 'green', cur: 'CAD', flat: 1.50, pct: 0, limit: 10000,
        name: 'Interac e-Transfer', nameFr: 'Virement Interac', nameEs: 'Interac e-Transfer',
        desc: 'Sent to your email, deposited in minutes',
        descFr: 'Envoyé à votre e-mail, déposé en quelques minutes',
        descEs: 'Enviado a tu correo, depositado en minutos',
        eta: '5–30 min',
        svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 6 10-6"/></svg>'
    },
    wire: {
        panel: 'wdPanelWire', kind: 'fiat', ico: 'purple', cur: 'CAD', flat: 25.00, pct: 0, limit: 1000000,
        name: 'International wire', nameFr: 'Virement international', nameEs: 'Transferencia internacional',
        desc: 'SWIFT transfer in USD, EUR, GBP and more',
        descFr: 'Virement SWIFT en USD, EUR, GBP et plus',
        descEs: 'Transferencia SWIFT en USD, EUR, GBP y más',
        eta: '1–5 business days', etaFr: '1–5 jours ouvrés', etaEs: '1–5 días hábiles',
        svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18z"/></svg>'
    },
    card: {
        panel: 'wdPanelCard', kind: 'fiat', ico: 'slate', cur: 'CAD', flat: 0, pct: 1.5, limit: 25000,
        name: 'Back to card', nameFr: 'Retour sur la carte', nameEs: 'Devolución a la tarjeta',
        desc: 'Refund to the card used for your deposit',
        descFr: 'Remboursement sur la carte utilisée pour le dépôt',
        descEs: 'Reembolso a la tarjeta usada en el depósito',
        eta: '1–3 business days', etaFr: '1–3 jours ouvrés', etaEs: '1–3 días hábiles',
        svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>'
    },
    internal: {
        panel: 'wdPanelInternal', kind: 'fiat', ico: '', cur: 'CAD', flat: 0, pct: 0, limit: 500000,
        name: 'VT Markets transfer', nameFr: 'Transfert VT Markets', nameEs: 'Transferencia VT Markets',
        desc: 'Instant transfer to another VT Markets account',
        descFr: 'Transfert instantané vers un autre compte VT Markets',
        descEs: 'Transferencia instantánea a otra cuenta VT Markets',
        eta: 'Instant', etaFr: 'Instantané', etaEs: 'Instantáneo',
        svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 2l4 4-4 4"/><path d="M3 6h18"/><path d="M7 22l-4-4 4-4"/><path d="M21 18H3"/></svg>'
    }
};

// Canadian financial institutions with their published institution numbers
var CANADIAN_BANKS = [
    { code: '001', name: 'BMO Bank of Montreal', short: 'BMO', bg: '#0079c1' },
    { code: '002', name: 'Scotiabank', short: 'SB', bg: '#ec111a' },
    { code: '003', name: 'RBC Royal Bank', short: 'RBC', bg: '#0051a5' },
    { code: '004', name: 'TD Canada Trust', short: 'TD', bg: '#008a4b' },
    { code: '006', name: 'National Bank of Canada', short: 'NBC', bg: '#e2231a' },
    { code: '010', name: 'CIBC', short: 'CIBC', bg: '#b5121b' },
    { code: '016', name: 'HSBC Bank Canada', short: 'HSBC', bg: '#db0011' },
    { code: '030', name: 'Canadian Western Bank', short: 'CWB', bg: '#00447c' },
    { code: '039', name: 'Laurentian Bank', short: 'LBC', bg: '#7a2e8c' },
    { code: '117', name: 'Government of Canada', short: 'GOC', bg: '#26374a' },
    { code: '177', name: 'Bank of Canada', short: 'BOC', bg: '#8b1a1a' },
    { code: '219', name: 'ATB Financial', short: 'ATB', bg: '#0057b8' },
    { code: '245', name: 'Manulife Bank', short: 'MLB', bg: '#00a758' },
    { code: '260', name: 'Citibank Canada', short: 'CITI', bg: '#003b70' },
    { code: '270', name: 'JPMorgan Chase Canada', short: 'JPM', bg: '#5a2d0c' },
    { code: '308', name: 'Bank of China (Canada)', short: 'BOC', bg: '#c8102e' },
    { code: '310', name: 'First Nations Bank of Canada', short: 'FNBC', bg: '#1b5e3b' },
    { code: '340', name: 'ICICI Bank Canada', short: 'ICICI', bg: '#f37d21' },
    { code: '509', name: 'Canada Post', short: 'CP', bg: '#d52b1e' },
    { code: '540', name: 'Manulife Trust', short: 'MT', bg: '#00a758' },
    { code: '608', name: 'Peoples Trust Company', short: 'PTC', bg: '#2f6f4e' },
    { code: '614', name: 'Tangerine Bank', short: 'TNG', bg: '#ff6c00' },
    { code: '621', name: 'motusbank', short: 'MB', bg: '#004b8d' },
    { code: '623', name: 'EQ Bank', short: 'EQ', bg: '#5f2d8c' },
    { code: '627', name: 'Wealthsimple', short: 'WS', bg: '#000000' },
    { code: '809', name: 'Vancity Savings', short: 'VAN', bg: '#00778b' },
    { code: '815', name: 'Desjardins (Québec)', short: 'DSJ', bg: '#00874e' },
    { code: '828', name: 'Central 1 (Ontario CU)', short: 'C1', bg: '#0a5c8c' },
    { code: '829', name: 'Coast Capital Savings', short: 'CCS', bg: '#0072ce' },
    { code: '837', name: 'Meridian Credit Union', short: 'MCU', bg: '#e35205' },
    { code: '839', name: 'Servus Credit Union', short: 'SCU', bg: '#00a3ad' },
    { code: '849', name: 'Alterna Savings', short: 'ALT', bg: '#6a2c8f' },
    { code: '899', name: 'Simplii Financial', short: 'SIM', bg: '#c8102e' }
];

var currentWithdrawAsset = 'USDT';
var currentWithdrawMethod = null;
var selectedBank = CANADIAN_BANKS[2]; // RBC by default

function wdLang() {
    var l = window.currentLang || localStorage.getItem('vt_lang') || 'fr';
    return (l === 'fr' || l === 'es') ? l : 'en';
}

function wdText(cfg, key) {
    var l = wdLang();
    if (l === 'fr' && cfg[key + 'Fr']) return cfg[key + 'Fr'];
    if (l === 'es' && cfg[key + 'Es']) return cfg[key + 'Es'];
    return cfg[key];
}

// ---- step 1 → step 2 ----
function selectWithdrawMethod(id) {
    var cfg = WITHDRAW_METHODS[id];
    if (!cfg) return;
    currentWithdrawMethod = id;

    var step1 = document.getElementById('wdMethodStep');
    var step2 = document.getElementById('wdFlowStep');
    if (step1) step1.style.display = 'none';
    if (step2) step2.style.display = 'block';

    document.querySelectorAll('.wd-panel').forEach(function (p) { p.style.display = 'none'; });
    var panel = document.getElementById(cfg.panel);
    if (panel) panel.style.display = 'block';

    var ico = document.getElementById('wdChosenIco');
    if (ico) { ico.className = 'payout-ico ' + (cfg.ico || ''); ico.innerHTML = cfg.svg; }
    var nm = document.getElementById('wdChosenName');
    if (nm) nm.textContent = wdText(cfg, 'name');
    var ds = document.getElementById('wdChosenDesc');
    if (ds) ds.textContent = wdText(cfg, 'desc');

    if (id === 'bank') renderBankGrid();

    // Reset amount for the new route
    var input = document.getElementById('withdrawAmountInput');
    if (input) input.value = '';
    document.querySelectorAll('.pct-btn').forEach(function (b) { b.classList.remove('active'); });

    if (cfg.kind === 'crypto') {
        currentWithdrawAsset = 'USDT';
        applyWithdrawUnits('USDT');
    } else {
        applyWithdrawUnits(cfg.cur);
    }
    calculateWithdrawFee(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function backToWithdrawMethods() {
    currentWithdrawMethod = null;
    var step1 = document.getElementById('wdMethodStep');
    var step2 = document.getElementById('wdFlowStep');
    if (step1) step1.style.display = 'block';
    if (step2) step2.style.display = 'none';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function currentWithdrawConfig() {
    var cfg = WITHDRAW_METHODS[currentWithdrawMethod] || WITHDRAW_METHODS.crypto;
    if (cfg.kind === 'crypto') {
        var a = WITHDRAW_ASSETS[currentWithdrawAsset];
        return { unit: currentWithdrawAsset, avail: a.avail, flat: a.fee, pct: 0, dp: a.dp, limit: a.limit, eta: cfg.eta, cfg: cfg };
    }
    return { unit: cfg.cur, avail: FIAT_AVAILABLE, flat: cfg.flat, pct: cfg.pct, dp: 2, limit: cfg.limit, eta: wdText(cfg, 'eta'), cfg: cfg };
}

function applyWithdrawUnits(unit) {
    var s = currentWithdrawConfig();
    var set = function (id, v) { var e = document.getElementById(id); if (e) e.textContent = v; };
    set('withdrawUnitLabel', unit);
    set('withdrawAvailVal', s.avail.toFixed(s.dp) + ' ' + unit);
    set('wdEta', s.eta);
}

function selectWithdrawAsset(asset, chipEl) {
    if (!WITHDRAW_ASSETS[asset]) return;
    currentWithdrawAsset = asset;
    document.querySelectorAll('#wdAssetPicker .asset-chip').forEach(function (c) { c.classList.remove('active'); });
    if (chipEl) chipEl.classList.add('active');
    applyWithdrawUnits(asset);
    var input = document.getElementById('withdrawAmountInput');
    if (input) input.value = '';
    calculateWithdrawFee(0);
}

function selectWithdrawDestination(value) {
    var addr = document.getElementById('withdrawAddrInput');
    if (!addr) return;
    if (value === 'COLD') addr.value = 'TYv9K2mP8NqW5xL7zR4bV1cX0yA3eM6k9D';
    else if (value === 'LEDGER') addr.value = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';
    else { addr.value = ''; addr.focus(); }
}

function selectPayoutCard(el) {
    document.querySelectorAll('#wdPanelCard .network-item').forEach(function (n) { n.classList.remove('active'); });
    if (el) el.classList.add('active');
}

// ---- Canadian bank picker ----
function renderBankGrid(filter) {
    var grid = document.getElementById('bankGrid');
    if (!grid) return;
    var q = (filter || '').toLowerCase().trim();
    var list = CANADIAN_BANKS.filter(function (b) {
        return !q || b.name.toLowerCase().indexOf(q) !== -1 || b.code.indexOf(q) !== -1;
    });

    if (!list.length) {
        grid.innerHTML = '<div class="bank-empty">No matching institution</div>';
        return;
    }

    grid.innerHTML = list.map(function (b) {
        var active = selectedBank && b.code === selectedBank.code && b.name === selectedBank.name;
        return '<button type="button" class="bank-chip' + (active ? ' active' : '') + '" onclick="selectBank(\'' + b.code + '\', \'' + b.name.replace(/'/g, "\\'") + '\', this)">'
            + '<span class="bank-mark" style="background:' + b.bg + '">' + b.short + '</span>'
            + '<span class="bank-text"><span class="bank-name">' + b.name + '</span>'
            + '<span class="bank-inst">Inst. ' + b.code + '</span></span>'
            + '</button>';
    }).join('');
}

function filterBanks(q) { renderBankGrid(q); }

function selectBank(code, name, el) {
    selectedBank = { code: code, name: name };
    document.querySelectorAll('#bankGrid .bank-chip').forEach(function (c) { c.classList.remove('active'); });
    if (el) el.classList.add('active');
    var inst = document.getElementById('bankInstitution');
    if (inst) inst.value = code;
}

// ---- amount & fees ----
function setWithdrawPct(pct, btn) {
    var s = currentWithdrawConfig();
    document.querySelectorAll('.pct-btn').forEach(function (b) { b.classList.remove('active'); });
    if (btn) btn.classList.add('active');
    var amount = s.avail * (pct / 100);
    var input = document.getElementById('withdrawAmountInput');
    if (input) input.value = amount.toFixed(s.dp);
    calculateWithdrawFee(amount);
}

function setMaxWithdraw() { setWithdrawPct(100, null); }

function calculateWithdrawFee(amountVal) {
    var s = currentWithdrawConfig();
    var amount = parseFloat(amountVal) || 0;
    var pctFee = amount * (s.pct / 100);
    var net = Math.max(0, amount - s.flat - pctFee);
    var set = function (id, v) { var e = document.getElementById(id); if (e) e.textContent = v; };

    set('wdSumAmount', amount.toFixed(s.dp) + ' ' + s.unit);
    set('wdSumNetFee', s.flat.toFixed(s.dp) + ' ' + s.unit);
    set('wdSumPlatFee', pctFee.toFixed(s.dp) + ' ' + s.unit + (s.pct ? '  (' + s.pct + '%)' : ''));
    set('netReceiveVal', net.toFixed(s.dp) + ' ' + s.unit);
    set('wdEta', s.eta);

    var used = Math.min(s.limit, amount);
    var fill = document.getElementById('limitFill');
    if (fill) fill.style.width = Math.max(1, (used / s.limit) * 100).toFixed(1) + '%';
    set('limitText', used.toLocaleString('en-US', { maximumFractionDigits: s.dp }) + ' / ' + s.limit.toLocaleString('en-US') + ' ' + s.unit);
}

// ---- submit ----
function submitWithdrawal() {
    var s = currentWithdrawConfig();
    var method = currentWithdrawMethod || 'crypto';
    var amountEl = document.getElementById('withdrawAmountInput');
    var amount = parseFloat(amountEl ? amountEl.value : 0) || 0;
    var val = function (id) { var e = document.getElementById(id); return e ? String(e.value || '').trim() : ''; };

    var destination = '';
    var problem = null;

    if (method === 'crypto') {
        destination = val('withdrawAddrInput');
        if (!destination) problem = 'Enter a destination address.';
    } else if (method === 'bank') {
        var transit = val('bankTransit'), account = val('bankAccount');
        if (!selectedBank) problem = 'Select your bank.';
        else if (!/^\d{5}$/.test(transit)) problem = 'The transit number must be exactly 5 digits.';
        else if (!/^\d{7,12}$/.test(account)) problem = 'The account number must be 7 to 12 digits.';
        else if (!val('bankHolder')) problem = 'Enter the account holder name.';
        destination = selectedBank.name + ' · ' + selectedBank.code + '-' + transit + '-' + account;
    } else if (method === 'interac') {
        var email = val('interacEmail');
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) problem = 'Enter a valid recipient email address.';
        destination = email;
    } else if (method === 'wire') {
        if (!/^[A-Za-z0-9]{8,11}$/.test(val('wireSwift'))) problem = 'Enter a valid SWIFT/BIC code (8 or 11 characters).';
        else if (!val('wireIban')) problem = 'Enter the IBAN or account number.';
        else if (!val('wireBank')) problem = 'Enter the beneficiary bank name and address.';
        destination = val('wireBank') + ' · ' + val('wireIban');
    } else if (method === 'card') {
        destination = 'Visa •••• 4892';
    } else if (method === 'internal') {
        if (!val('internalUid')) problem = 'Enter the recipient UID or email.';
        destination = val('internalUid');
    }

    if (!problem) {
        if (amount <= 0) problem = 'Enter a withdrawal amount greater than zero.';
        else if (amount > s.avail) problem = 'Amount exceeds your available balance of ' + s.avail.toFixed(s.dp) + ' ' + s.unit + '.';
        else if (amount > s.limit) problem = 'Amount exceeds the daily limit of ' + s.limit.toLocaleString('en-US') + ' ' + s.unit + ' for this method.';
        else if (amount <= s.flat + amount * (s.pct / 100)) problem = 'Amount must be greater than the total fees.';
    }

    if (problem) { alert(problem); return; }

    var fees = s.flat + amount * (s.pct / 100);
    alert('Withdrawal queued for security review\n\n'
        + 'Method: ' + wdText(s.cfg, 'name') + '\n'
        + 'Amount: ' + amount.toFixed(s.dp) + ' ' + s.unit + '\n'
        + 'Fees: ' + fees.toFixed(s.dp) + ' ' + s.unit + '\n'
        + 'You receive: ' + (amount - fees).toFixed(s.dp) + ' ' + s.unit + '\n'
        + 'Destination: ' + destination + '\n'
        + 'Estimated arrival: ' + s.eta + '\n\n'
        + 'Confirm the 2FA code sent to your device to release the transaction.');
}

// ---------- PAYMENT DETAILS ----------
function addWhitelistAddress() {
    alert('Add a whitelisted address\n\nNew destinations require email confirmation and are held for 24 hours before their first withdrawal.');
}

function removeWhitelistAddress(btn) {
    var card = btn && btn.closest ? btn.closest('.method-card') : null;
    if (!card) return;
    card.style.opacity = '0';
    card.style.transform = 'scale(0.97)';
    setTimeout(function () { card.remove(); }, 200);
}

// ---------- TRANSACTION HISTORY ----------
function exportStatement(format) {
    alert('Statement export queued\n\nFormat: ' + String(format).toUpperCase() + '\nA download link will be emailed to you once the file is ready.');
}

// UPGRADED FUNDS INTERACTIVE HANDLERS
function switchDepositType(type) {
    var cryptoTab = document.getElementById('tabDepositCrypto');
    var fiatTab = document.getElementById('tabDepositFiat');
    var cryptoSec = document.getElementById('cryptoDepositSection');
    var fiatSec = document.getElementById('fiatDepositSection');
    var isCrypto = type === 'crypto';

    if (cryptoTab) cryptoTab.classList.toggle('active', isCrypto);
    if (fiatTab) fiatTab.classList.toggle('active', !isCrypto);
    if (cryptoSec) cryptoSec.style.display = isCrypto ? 'block' : 'none';
    if (fiatSec) fiatSec.style.display = isCrypto ? 'none' : 'block';

    if (!isCrypto) {
        buildCurrencyMenu();
        updateFiatSummary();
    }
}


function filterTxHistory(type) {
    console.log('[Tx History] Filtered by type:', type);
}

function searchTxHash(query) {
    console.log('[Tx History] Searching hash:', query);
}

// A completed hosted checkout leaves a credit note behind — apply it once.
function applyPendingCredit() {
    var raw;
    try { raw = localStorage.getItem('vt_pending_credit'); } catch (e) { return; }
    if (!raw) return;
    localStorage.removeItem('vt_pending_credit');

    var credit;
    try { credit = JSON.parse(raw); } catch (e) { return; }
    if (!credit || !(credit.amount > 0)) return;

    setAccountBalance(accountBalance + credit.amount);
    console.log('[Checkout] Credited', credit.amount, credit.currency, 'ref', credit.ref);
}

document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    renderBalance();
    applyPendingCredit();
});

