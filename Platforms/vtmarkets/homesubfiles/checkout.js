// -------------------------------------------------------------
// VT MARKETS — SECURE CHECKOUT GATEWAY
// The amount is always inherited from the Deposit funds form; it is
// displayed read-only here so the figure can never drift between the
// two screens.
// -------------------------------------------------------------

var VTPay = {
    amount: 0,
    currency: 'CAD',
    symbol: '$'
};

var CARD_BRANDS = {
    visa: '<svg viewBox="0 0 48 32"><rect width="48" height="32" rx="4" fill="#1434CB"/><text x="24" y="21" text-anchor="middle" fill="#fff" font-family="Inter,sans-serif" font-size="12" font-weight="800" letter-spacing="1">VISA</text></svg>',
    mastercard: '<svg viewBox="0 0 48 32"><rect width="48" height="32" rx="4" fill="#16181c"/><circle cx="20" cy="16" r="8" fill="#EB001B"/><circle cx="28" cy="16" r="8" fill="#F79E1B" fill-opacity="0.9"/></svg>',
    amex: '<svg viewBox="0 0 48 32"><rect width="48" height="32" rx="4" fill="#006FCF"/><text x="24" y="20" text-anchor="middle" fill="#fff" font-family="Inter,sans-serif" font-size="9" font-weight="800">AMEX</text></svg>',
    generic: '<svg viewBox="0 0 48 32"><rect x="0.5" y="0.5" width="47" height="31" rx="3.5" fill="none" stroke="currentColor" stroke-opacity="0.3"/><rect x="5" y="12" width="38" height="3" fill="currentColor" fill-opacity="0.25"/><rect x="5" y="20" width="14" height="3" rx="1.5" fill="currentColor" fill-opacity="0.25"/></svg>'
};

function detectCardBrand(numRaw) {
    var n = String(numRaw || '').replace(/\D/g, '');
    if (/^4/.test(n)) return 'visa';
    if (/^(5[1-5]|2[2-7])/.test(n)) return 'mastercard';
    if (/^3[47]/.test(n)) return 'amex';
    return 'generic';
}

function vtSymbolFor(code) {
    if (code === 'EUR') return '€';
    if (code === 'GBP') return '£';
    if (code === 'JPY') return '¥';
    if (code === 'CHF') return 'Fr';
    return '$';
}

function vtMoney(v) {
    return VTPay.symbol + ' ' + Number(v).toLocaleString('en-US', {
        minimumFractionDigits: 2, maximumFractionDigits: 2
    }) + ' ' + VTPay.currency;
}

// The checkout now lives on its own hosted pages (checkout.html →
// verify-3ds.html → verify-otp.html → payment-success.html). This entry point
// validates the amount and hands off to that flow.
function openStripeCheckout() {
    var isFr = (localStorage.getItem('vt_lang') || 'fr') === 'fr';
    var isEs = (localStorage.getItem('vt_lang') || 'fr') === 'es';
    var T = function (en, fr, es) { return isFr ? fr : (isEs ? es : en); };

    var input = document.getElementById('fiatDepositAmountInput');
    var amount = input ? parseFloat(String(input.value).replace(/[^0-9.]/g, '')) : NaN;

    if (!amount || isNaN(amount) || amount <= 0) {
        alert(T('Enter a deposit amount before continuing to payment.',
                'Saisissez un montant de dépôt avant de continuer vers le paiement.',
                'Introduce un importe de depósito antes de continuar al pago.'));
        if (input) { input.focus(); input.select(); }
        return;
    }

    var currency = (typeof getFiatCurrency === 'function') ? getFiatCurrency() : 'CAD';
    window.location.href = 'checkout.html?amount=' + encodeURIComponent(amount.toFixed(2))
        + '&currency=' + encodeURIComponent(currency);
}

// Kept so the in-page modal can still be opened directly if ever needed
function openCheckoutModal() {
    var isFr = (localStorage.getItem('vt_lang') || 'fr') === 'fr';
    var isEs = (localStorage.getItem('vt_lang') || 'fr') === 'es';
    var T = function (en, fr, es) { return isFr ? fr : (isEs ? es : en); };

    // --- amount comes from the Deposit funds form, and only from there ---
    var input = document.getElementById('fiatDepositAmountInput');
    var amount = input ? parseFloat(String(input.value).replace(/[^0-9.]/g, '')) : NaN;

    if (!amount || isNaN(amount) || amount <= 0) {
        alert(T('Enter a deposit amount before continuing to payment.',
                'Saisissez un montant de dépôt avant de continuer vers le paiement.',
                'Introduce un importe de depósito antes de continuar al pago.'));
        if (input) { input.focus(); input.select(); }
        return;
    }

    VTPay.currency = (typeof getFiatCurrency === 'function') ? getFiatCurrency() : 'CAD';
    VTPay.symbol = vtSymbolFor(VTPay.currency);
    VTPay.amount = amount;

    var modal = document.getElementById('vtCheckoutModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'vtCheckoutModal';
        modal.className = 'vtpay-overlay';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="vtpay-modal" role="dialog" aria-modal="true" aria-label="Secure checkout">

            <!-- ============ LEFT: ORDER SUMMARY ============ -->
            <aside class="vtpay-summary">
                <div>
                    <button class="vtpay-back" onclick="closeStripeCheckout()">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                        ${T('Back to deposit', 'Retour au dépôt', 'Volver al depósito')}
                    </button>

                    <div class="vtpay-brand">
                        <div class="vtpay-logo">vt</div>
                        <div>
                            <div class="vtpay-brand-name">vt <span>markets</span></div>
                            <div class="vtpay-brand-sub">${T('Secure account funding', 'Alimentation sécurisée du compte', 'Financiación segura de la cuenta')}</div>
                        </div>
                    </div>

                    <div class="vtpay-amount-block">
                        <div class="vtpay-amount-label">${T('Amount to pay', 'Montant à payer', 'Importe a pagar')}</div>
                        <div class="vtpay-amount" id="vtpayAmount">${vtMoney(VTPay.amount)}</div>
                        <button class="vtpay-edit" onclick="editCheckoutAmount()">
                            ${T('Change amount', 'Modifier le montant', 'Cambiar importe')}
                        </button>
                    </div>

                    <div class="vtpay-lines">
                        <div class="vtpay-line">
                            <span>${T('Deposit to trading account', 'Dépôt sur le compte de trading', 'Depósito en la cuenta de trading')}</span>
                            <span id="vtpayLineAmount">${vtMoney(VTPay.amount)}</span>
                        </div>
                        <div class="vtpay-line">
                            <span>${T('Processing fee', 'Frais de traitement', 'Comisión de procesamiento')}</span>
                            <span class="vtpay-free">${T('Free', 'Gratuit', 'Gratis')}</span>
                        </div>
                        <div class="vtpay-line">
                            <span>${T('Exchange rate', 'Taux de change', 'Tipo de cambio')}</span>
                            <span>1.0000</span>
                        </div>
                        <div class="vtpay-line-sep"></div>
                        <div class="vtpay-line vtpay-total">
                            <span>${T('Total due today', "Total dû aujourd'hui", 'Total a pagar hoy')}</span>
                            <span id="vtpayTotal">${vtMoney(VTPay.amount)}</span>
                        </div>
                    </div>
                </div>

                <div class="vtpay-assurance">
                    <div class="vtpay-assure-row">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        <span>${T('Funds held in segregated custody', 'Fonds en conservation ségréguée', 'Fondos en custodia segregada')}</span>
                    </div>
                    <div class="vtpay-assure-row">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        <span>${T('256-bit TLS encryption end to end', 'Chiffrement TLS 256 bits de bout en bout', 'Cifrado TLS de 256 bits de extremo a extremo')}</span>
                    </div>
                    <div class="vtpay-assure-row">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
                        <span>${T('PCI-DSS Level 1 certified processor', 'Prestataire certifié PCI-DSS niveau 1', 'Procesador certificado PCI-DSS nivel 1')}</span>
                    </div>
                </div>
            </aside>

            <!-- ============ RIGHT: PAYMENT FORM ============ -->
            <section class="vtpay-form-panel">
                <button class="vtpay-close" onclick="closeStripeCheckout()" aria-label="Close">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>

                <div id="vtpayFormBody">
                    <div class="vtpay-head">
                        <h2 class="vtpay-h2">${T('Payment details', 'Informations de paiement', 'Datos de pago')}</h2>
                        <span class="vtpay-secure-chip">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            ${T('Secure', 'Sécurisé', 'Seguro')}
                        </span>
                    </div>

                    <div class="vtpay-section-lbl">${T('Contact', 'Contact', 'Contacto')}</div>

                    <div class="vtpay-field">
                        <label class="vtpay-label">${T('Email address', 'Adresse e-mail', 'Correo electrónico')}</label>
                        <input type="email" class="vtpay-input" id="vtpayEmail" class="user-card-email-input" value="" placeholder="you@example.com" autocomplete="email">
                    </div>

                    <div class="vtpay-section-lbl">${T('Card', 'Carte', 'Tarjeta')}</div>

                    <div class="vtpay-field">
                        <label class="vtpay-label">${T('Card number', 'Numéro de carte', 'Número de tarjeta')}</label>
                        <div class="vtpay-card-group">
                            <div class="vtpay-card-row">
                                <input type="text" class="vtpay-input vtpay-flat" id="vtpayCardNum" inputmode="numeric"
                                       placeholder="1234 1234 1234 1234" maxlength="23" oninput="onCardNumberInput(this)">
                                <span class="vtpay-brand-mark" id="vtpayBrandMark">${CARD_BRANDS.generic}</span>
                            </div>
                            <div class="vtpay-card-split">
                                <input type="text" class="vtpay-input vtpay-flat" id="vtpayExp" inputmode="numeric"
                                       placeholder="MM / YY" maxlength="7" oninput="onExpiryInput(this)">
                                <input type="text" class="vtpay-input vtpay-flat" id="vtpayCvc" inputmode="numeric"
                                       placeholder="CVC" maxlength="4" oninput="this.value=this.value.replace(/\\D/g,'')">
                            </div>
                        </div>
                    </div>

                    <div class="vtpay-field">
                        <label class="vtpay-label">${T('Cardholder name', 'Nom du titulaire', 'Nombre del titular')}</label>
                        <input type="text" class="vtpay-input" id="vtpayName" placeholder="John Doe" autocomplete="cc-name">
                    </div>

                    <div class="vtpay-section-lbl">${T('Billing address', 'Adresse de facturation', 'Dirección de facturación')}</div>

                    <div class="vtpay-field">
                        <label class="vtpay-label">${T('Address', 'Adresse', 'Dirección')}</label>
                        <input type="text" class="vtpay-input" id="vtpayAddr1" placeholder="${T('Street address', 'Numéro et rue', 'Calle y número')}" autocomplete="billing address-line1">
                    </div>

                    <div class="vtpay-field">
                        <input type="text" class="vtpay-input" id="vtpayAddr2" placeholder="${T('Apartment, suite, unit (optional)', 'Appartement, suite (facultatif)', 'Apartamento, suite (opcional)')}" autocomplete="billing address-line2">
                    </div>

                    <div class="vtpay-row-2">
                        <div class="vtpay-field">
                            <label class="vtpay-label">${T('City', 'Ville', 'Ciudad')}</label>
                            <input type="text" class="vtpay-input" id="vtpayCity" placeholder="Montréal" autocomplete="billing address-level2">
                        </div>
                        <div class="vtpay-field">
                            <label class="vtpay-label" id="vtpayRegionLbl">${T('Province', 'Province', 'Provincia')}</label>
                            <select class="vtpay-input" id="vtpayRegion"></select>
                        </div>
                    </div>

                    <div class="vtpay-row-2">
                        <div class="vtpay-field">
                            <label class="vtpay-label">${T('Country', 'Pays', 'País')}</label>
                            <select class="vtpay-input" id="vtpayCountry" onchange="onCheckoutCountryChange(this.value)">
                                <option value="CA">Canada</option>
                                <option value="US">United States</option>
                                <option value="GB">United Kingdom</option>
                                <option value="FR">France</option>
                                <option value="AU">Australia</option>
                                <option value="CH">Switzerland</option>
                            </select>
                        </div>
                        <div class="vtpay-field">
                            <label class="vtpay-label" id="vtpayPostalLbl">${T('Postal code', 'Code postal', 'Código postal')}</label>
                            <input type="text" class="vtpay-input" id="vtpayPostal" placeholder="H3B 2Y5" autocomplete="billing postal-code">
                        </div>
                    </div>

                    <label class="vtpay-check">
                        <input type="checkbox" id="vtpaySave" checked>
                        <span>${T('Save this card for future deposits', 'Enregistrer cette carte pour mes prochains dépôts', 'Guardar esta tarjeta para futuros depósitos')}</span>
                    </label>

                    <div class="vtpay-error" id="vtpayError"></div>

                    <button class="vtpay-submit" id="vtpayBtn" onclick="processStripePayment()">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        ${T('Pay', 'Payer', 'Pagar')} <strong id="vtpayBtnAmount">${vtMoney(VTPay.amount)}</strong>
                    </button>

                    <p class="vtpay-legal">
                        ${T('You will be redirected to your bank for 3-D Secure verification. VT Markets never stores your full card number.',
                            'Vous serez redirigé vers votre banque pour la vérification 3-D Secure. VT Markets ne conserve jamais votre numéro de carte complet.',
                            'Serás redirigido a tu banco para la verificación 3-D Secure. VT Markets nunca almacena tu número de tarjeta completo.')}
                    </p>
                </div>

                <div id="vtpaySuccess" class="vtpay-success" style="display:none;">
                    <div class="vtpay-success-ring"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg></div>
                    <div class="vtpay-success-title">${T('Payment confirmed', 'Paiement confirmé', 'Pago confirmado')}</div>
                    <div class="vtpay-success-amount" id="vtpaySuccessAmount">${vtMoney(VTPay.amount)}</div>
                    <div class="vtpay-success-sub">${T('Your balance has been updated instantly.', 'Votre solde a été mis à jour instantanément.', 'Tu saldo se ha actualizado al instante.')}</div>
                    <div class="vtpay-receipt" id="vtpayReceipt"></div>
                </div>
            </section>
        </div>
    `;

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', vtpayEscHandler);
    onCheckoutCountryChange('CA');
    setTimeout(function () {
        var c = document.getElementById('vtpayCardNum');
        if (c) c.focus();
    }, 80);
}

// Address formats differ by country — the region label, the options and the
// postal-code example all follow the selected country.
var CHECKOUT_REGIONS = {
    CA: {
        label: { en: 'Province', fr: 'Province', es: 'Provincia' },
        postal: { en: 'Postal code', fr: 'Code postal', es: 'Código postal' },
        example: 'H3B 2Y5',
        list: ['Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador',
               'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island',
               'Quebec', 'Saskatchewan', 'Yukon']
    },
    US: {
        label: { en: 'State', fr: 'État', es: 'Estado' },
        postal: { en: 'ZIP code', fr: 'Code ZIP', es: 'Código ZIP' },
        example: '10001',
        list: ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
               'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
               'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
               'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
               'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
               'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
               'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
               'Wisconsin', 'Wyoming']
    },
    GB: {
        label: { en: 'County', fr: 'Comté', es: 'Condado' },
        postal: { en: 'Postcode', fr: 'Code postal', es: 'Código postal' },
        example: 'SW1A 1AA', list: []
    },
    FR: {
        label: { en: 'Region', fr: 'Région', es: 'Región' },
        postal: { en: 'Postal code', fr: 'Code postal', es: 'Código postal' },
        example: '75001', list: []
    },
    AU: {
        label: { en: 'State', fr: 'État', es: 'Estado' },
        postal: { en: 'Postcode', fr: 'Code postal', es: 'Código postal' },
        example: '2000',
        list: ['Australian Capital Territory', 'New South Wales', 'Northern Territory', 'Queensland',
               'South Australia', 'Tasmania', 'Victoria', 'Western Australia']
    },
    CH: {
        label: { en: 'Canton', fr: 'Canton', es: 'Cantón' },
        postal: { en: 'Postal code', fr: 'Code postal', es: 'Código postal' },
        example: '8001', list: []
    }
};

function onCheckoutCountryChange(code) {
    var cfg = CHECKOUT_REGIONS[code] || CHECKOUT_REGIONS.CA;
    var lang = localStorage.getItem('vt_lang') || 'fr';
    if (!cfg.label[lang]) lang = 'en';

    var lbl = document.getElementById('vtpayRegionLbl');
    if (lbl) lbl.textContent = cfg.label[lang];

    var pLbl = document.getElementById('vtpayPostalLbl');
    if (pLbl) pLbl.textContent = cfg.postal[lang];

    var postal = document.getElementById('vtpayPostal');
    if (postal) { postal.placeholder = cfg.example; postal.value = ''; }

    var sel = document.getElementById('vtpayRegion');
    if (!sel) return;

    if (!cfg.list.length) {
        // Free-text regions: swap the select for a plain input
        var input = document.createElement('input');
        input.type = 'text';
        input.className = 'vtpay-input';
        input.id = 'vtpayRegion';
        input.placeholder = cfg.label[lang];
        sel.parentNode.replaceChild(input, sel);
        return;
    }

    if (sel.tagName !== 'SELECT') {
        var replacement = document.createElement('select');
        replacement.className = 'vtpay-input';
        replacement.id = 'vtpayRegion';
        sel.parentNode.replaceChild(replacement, sel);
        sel = replacement;
    }
    sel.innerHTML = cfg.list.map(function (r) { return '<option>' + r + '</option>'; }).join('');
}

function vtpayEscHandler(e) {
    if (e.key === 'Escape') closeStripeCheckout();
}

function closeStripeCheckout() {
    var modal = document.getElementById('vtCheckoutModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
    document.removeEventListener('keydown', vtpayEscHandler);
}

function editCheckoutAmount() {
    closeStripeCheckout();
    var input = document.getElementById('fiatDepositAmountInput');
    if (input) {
        input.focus();
        input.select();
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// ---------- input formatting ----------
function onCardNumberInput(el) {
    var digits = el.value.replace(/\D/g, '').slice(0, 19);
    var brand = detectCardBrand(digits);
    var groups = brand === 'amex'
        ? [digits.slice(0, 4), digits.slice(4, 10), digits.slice(10, 15)]
        : digits.match(/.{1,4}/g) || [];
    el.value = groups.filter(Boolean).join(' ');
    var mark = document.getElementById('vtpayBrandMark');
    if (mark) mark.innerHTML = CARD_BRANDS[brand];
}

function onExpiryInput(el) {
    var d = el.value.replace(/\D/g, '').slice(0, 4);
    if (d.length >= 3) el.value = d.slice(0, 2) + ' / ' + d.slice(2);
    else el.value = d;
}

// ---------- submit ----------
function processStripePayment() {
    var isFr = (localStorage.getItem('vt_lang') || 'fr') === 'fr';
    var isEs = (localStorage.getItem('vt_lang') || 'fr') === 'es';
    var T = function (en, fr, es) { return isFr ? fr : (isEs ? es : en); };

    var err = document.getElementById('vtpayError');
    var num = (document.getElementById('vtpayCardNum') || {}).value || '';
    var exp = (document.getElementById('vtpayExp') || {}).value || '';
    var cvc = (document.getElementById('vtpayCvc') || {}).value || '';
    var name = (document.getElementById('vtpayName') || {}).value || '';

    var addr = (document.getElementById('vtpayAddr1') || {}).value || '';
    var city = (document.getElementById('vtpayCity') || {}).value || '';
    var postal = (document.getElementById('vtpayPostal') || {}).value || '';

    var digits = num.replace(/\D/g, '');
    var fail = null;
    if (digits.length < 13) fail = T('Enter a valid card number.', 'Saisissez un numéro de carte valide.', 'Introduce un número de tarjeta válido.');
    else if (exp.replace(/\D/g, '').length < 4) fail = T('Enter the card expiry date.', "Saisissez la date d'expiration.", 'Introduce la fecha de caducidad.');
    else if (cvc.length < 3) fail = T('Enter the card security code.', 'Saisissez le code de sécurité.', 'Introduce el código de seguridad.');
    else if (!name.trim()) fail = T('Enter the cardholder name.', 'Saisissez le nom du titulaire.', 'Introduce el nombre del titular.');
    else if (!addr.trim()) fail = T('Enter your billing street address.', 'Saisissez votre adresse de facturation.', 'Introduce tu dirección de facturación.');
    else if (!city.trim()) fail = T('Enter your billing city.', 'Saisissez votre ville.', 'Introduce tu ciudad.');
    else if (!postal.trim()) fail = T('Enter your billing postal code.', 'Saisissez votre code postal.', 'Introduce tu código postal.');

    if (fail) {
        if (err) { err.textContent = fail; err.classList.add('show'); }
        return;
    }
    if (err) { err.textContent = ''; err.classList.remove('show'); }

    var btn = document.getElementById('vtpayBtn');
    if (btn) {
        btn.disabled = true;
        btn.classList.add('loading');
        btn.innerHTML = '<span class="vtpay-spinner"></span> ' + T('Verifying with your bank…', 'Vérification auprès de votre banque…', 'Verificando con tu banco…');
    }

    setTimeout(function () {
        var body = document.getElementById('vtpayFormBody');
        var ok = document.getElementById('vtpaySuccess');
        if (body) body.style.display = 'none';
        if (ok) ok.style.display = 'flex';

        var ref = 'VTM-' + Date.now().toString(36).toUpperCase().slice(-8);
        var receipt = document.getElementById('vtpayReceipt');
        if (receipt) {
            receipt.innerHTML = '<div><span>' + T('Reference', 'Référence', 'Referencia') + '</span><strong>' + ref + '</strong></div>'
                + '<div><span>' + T('Card', 'Carte', 'Tarjeta') + '</span><strong>•••• ' + digits.slice(-4) + '</strong></div>'
                + '<div><span>' + T('Date', 'Date', 'Fecha') + '</span><strong>' + new Date().toLocaleString() + '</strong></div>';
        }

        // Credit the account so the navbar balance and the assets card agree
        if (typeof setAccountBalance === 'function' && typeof accountBalance === 'number') {
            setAccountBalance(accountBalance + VTPay.amount);
        }

        setTimeout(closeStripeCheckout, 3600);
    }, 1500);
}

// Kept for callers that still use the old entry-point name
window.openCheckoutModal = openCheckoutModal;
