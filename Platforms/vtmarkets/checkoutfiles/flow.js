// -------------------------------------------------------------
// VT MARKETS — HOSTED CHECKOUT FLOW · SHARED STATE
//
// The flow spans several pages:
//   checkout.html → verify-3ds.html → verify-otp.html → payment-success.html
//                                                     ↘ payment-failed.html
//
// State travels in sessionStorage so a refresh keeps the order, and the
// amount is seeded from the query string on first entry.
//
// NOTE: prototype only. Nothing here contacts a real acquirer, and no
// card data leaves the page.
// -------------------------------------------------------------

var VTFlow = (function () {
    'use strict';

    var KEY = 'vt_checkout_order';

    var SYMBOLS = { CAD: '$', USD: '$', EUR: '€', GBP: '£', JPY: '¥', CHF: 'Fr', AUD: '$', NZD: '$' };

    var STRINGS = {
        en: {
            step1: 'Payment', step2: 'Verification', step3: 'Confirmation',
            secure: 'Secure', back: 'Back to VT Markets',
            deposit: 'Deposit to trading account', fee: 'Processing fee', free: 'Free',
            total: 'Total due today', amount: 'Amount to pay',
            trust1: 'Funds held in segregated custody',
            trust2: '256-bit TLS encryption end to end',
            trust3: 'PCI-DSS Level 1 certified processor',
            footer: 'VT Markets never stores your full card number.',
            expired: 'Your checkout session expired. Start the deposit again.'
        },
        fr: {
            step1: 'Paiement', step2: 'Vérification', step3: 'Confirmation',
            secure: 'Sécurisé', back: 'Retour à VT Markets',
            deposit: 'Dépôt sur le compte de trading', fee: 'Frais de traitement', free: 'Gratuit',
            total: "Total dû aujourd'hui", amount: 'Montant à payer',
            trust1: 'Fonds en conservation ségréguée',
            trust2: 'Chiffrement TLS 256 bits de bout en bout',
            trust3: 'Prestataire certifié PCI-DSS niveau 1',
            footer: "VT Markets ne conserve jamais votre numéro de carte complet.",
            expired: 'Votre session de paiement a expiré. Recommencez le dépôt.'
        },
        es: {
            step1: 'Pago', step2: 'Verificación', step3: 'Confirmación',
            secure: 'Seguro', back: 'Volver a VT Markets',
            deposit: 'Depósito en la cuenta de trading', fee: 'Comisión de procesamiento', free: 'Gratis',
            total: 'Total a pagar hoy', amount: 'Importe a pagar',
            trust1: 'Fondos en custodia segregada',
            trust2: 'Cifrado TLS de 256 bits de extremo a extremo',
            trust3: 'Procesador certificado PCI-DSS nivel 1',
            footer: 'VT Markets nunca almacena su número de tarjeta completo.',
            expired: 'Su sesión de pago ha caducado. Inicie el depósito de nuevo.'
        }
    };

    function lang() {
        var l = localStorage.getItem('vt_lang') || 'fr';
        return STRINGS[l] ? l : 'en';
    }

    function t(k) { return STRINGS[lang()][k] || STRINGS.en[k]; }

    /* ---------- state ---------- */

    function read() {
        try { return JSON.parse(sessionStorage.getItem(KEY)) || null; } catch (e) { return null; }
    }

    function write(o) {
        sessionStorage.setItem(KEY, JSON.stringify(o));
        return o;
    }

    function clear() { sessionStorage.removeItem(KEY); }

    // Seed from ?amount=&currency= on the entry page, otherwise reuse the
    // session. Returns null when there is neither — the caller sends the user
    // back to Deposit funds. There is deliberately no sample/preview order:
    // showing a placeholder amount reads as a real order and is worse than
    // bouncing to the form.
    function init() {
        var q = new URLSearchParams(location.search);
        var amount = parseFloat(q.get('amount'));
        var currency = (q.get('currency') || '').toUpperCase();

        if (!isNaN(amount) && amount > 0) {
            return write({
                amount: amount,
                currency: SYMBOLS[currency] ? currency : 'CAD',
                ref: 'VTM-' + Date.now().toString(36).toUpperCase().slice(-8),
                created: Date.now()
            });
        }
        return read();
    }

    // May be null — the page was opened without an active checkout session.
    function requireOrder() {
        return read();
    }

    // No order means the flow was entered out of band; start over at the form.
    function bounceToDeposit() {
        location.replace('home.html');
    }

    /* ---------- formatting ---------- */

    function symbol(cur) { return SYMBOLS[cur] || '$'; }

    function money(v, cur) {
        return symbol(cur) + ' ' + Number(v).toLocaleString('en-US', {
            minimumFractionDigits: 2, maximumFractionDigits: 2
        }) + ' ' + cur;
    }

    /* ---------- shared chrome ---------- */

    function paintChrome(activeStep) {
        var l = lang();
        document.documentElement.lang = l;

        var sec = document.getElementById('flowSecureLbl');
        if (sec) sec.textContent = t('secure');

        var foot = document.getElementById('flowFoot');
        if (foot) foot.textContent = t('footer');

        var steps = [
            { id: 'fstep1', label: t('step1') },
            { id: 'fstep2', label: t('step2') },
            { id: 'fstep3', label: t('step3') }
        ];
        steps.forEach(function (s, i) {
            var node = document.getElementById(s.id);
            if (!node) return;
            var lbl = node.querySelector('.fstep-label');
            if (lbl) lbl.textContent = s.label;
            node.classList.remove('on', 'done');
            if (i + 1 < activeStep) node.classList.add('done');
            else if (i + 1 === activeStep) node.classList.add('on');
            var dot = node.querySelector('.fstep-dot');
            if (dot) dot.textContent = (i + 1 < activeStep) ? '✓' : String(i + 1);
        });
    }

    function paintSummary(order) {
        if (!order) return;
        var set = function (id, v) { var e = document.getElementById(id); if (e) e.textContent = v; };
        set('sumLabel', t('amount'));
        set('sumAmount', money(order.amount, order.currency));
        set('sumRef', 'Ref ' + order.ref);
        set('sumDepositLbl', t('deposit'));
        set('sumDepositVal', money(order.amount, order.currency));
        set('sumFeeLbl', t('fee'));
        set('sumFeeVal', t('free'));
        set('sumTotalLbl', t('total'));
        set('sumTotalVal', money(order.amount, order.currency));
        set('sumBackLbl', t('back'));
        set('sumTrust1', t('trust1'));
        set('sumTrust2', t('trust2'));
        set('sumTrust3', t('trust3'));
    }

    function go(page) { location.href = page; }

    return {
        init: init, read: read, write: write, clear: clear,
        requireOrder: requireOrder, bounceToDeposit: bounceToDeposit,
        money: money, symbol: symbol,
        lang: lang, t: t, paintChrome: paintChrome, paintSummary: paintSummary, go: go
    };
})();

/* ---------- card helpers shared by checkout.html ---------- */

var VTCard = (function () {
    'use strict';

    var BRANDS = {
        visa: '<svg viewBox="0 0 48 32"><rect width="48" height="32" rx="4" fill="#1434CB"/><text x="24" y="21" text-anchor="middle" fill="#fff" font-family="Inter,sans-serif" font-size="12" font-weight="800" letter-spacing="1">VISA</text></svg>',
        mastercard: '<svg viewBox="0 0 48 32"><rect width="48" height="32" rx="4" fill="#16181c"/><circle cx="20" cy="16" r="8" fill="#EB001B"/><circle cx="28" cy="16" r="8" fill="#F79E1B" fill-opacity="0.9"/></svg>',
        amex: '<svg viewBox="0 0 48 32"><rect width="48" height="32" rx="4" fill="#006FCF"/><text x="24" y="20" text-anchor="middle" fill="#fff" font-family="Inter,sans-serif" font-size="9" font-weight="800">AMEX</text></svg>',
        generic: '<svg viewBox="0 0 48 32"><rect x="0.5" y="0.5" width="47" height="31" rx="3.5" fill="none" stroke="currentColor" stroke-opacity="0.3"/><rect x="5" y="12" width="38" height="3" fill="currentColor" fill-opacity="0.25"/><rect x="5" y="20" width="14" height="3" rx="1.5" fill="currentColor" fill-opacity="0.25"/></svg>'
    };

    function detect(num) {
        var n = String(num || '').replace(/\D/g, '');
        if (/^4/.test(n)) return 'visa';
        if (/^(5[1-5]|2[2-7])/.test(n)) return 'mastercard';
        if (/^3[47]/.test(n)) return 'amex';
        return 'generic';
    }

    function formatNumber(elm) {
        var digits = elm.value.replace(/\D/g, '').slice(0, 19);
        var brand = detect(digits);
        var groups = brand === 'amex'
            ? [digits.slice(0, 4), digits.slice(4, 10), digits.slice(10, 15)]
            : digits.match(/.{1,4}/g) || [];
        elm.value = groups.filter(Boolean).join(' ');
        var mark = document.getElementById('cardBrand');
        if (mark) mark.innerHTML = BRANDS[brand];
        return digits;
    }

    function formatExpiry(elm) {
        var d = elm.value.replace(/\D/g, '').slice(0, 4);
        elm.value = d.length >= 3 ? d.slice(0, 2) + ' / ' + d.slice(2) : d;
    }

    // Luhn check — catches typos before anything is submitted
    function luhn(num) {
        var n = String(num).replace(/\D/g, '');
        if (n.length < 13) return false;
        var sum = 0, alt = false;
        for (var i = n.length - 1; i >= 0; i--) {
            var d = parseInt(n.charAt(i), 10);
            if (alt) { d *= 2; if (d > 9) d -= 9; }
            sum += d;
            alt = !alt;
        }
        return sum % 10 === 0;
    }

    return { BRANDS: BRANDS, detect: detect, formatNumber: formatNumber, formatExpiry: formatExpiry, luhn: luhn };
})();
