// -------------------------------------------------------------
// VT MARKETS MODULAR SPA VIEW COMPONENTS & TEMPLATES
// -------------------------------------------------------------

var viewsContainer = {
    // 1. INSTITUTIONAL ACCOUNT VIEW
    account: `
        <!-- ACCOUNT HERO CARD -->
        <div class="account-hero-card">
            <div class="account-user-info">
                <div class="user-big-avatar user-card-initials">–</div>
                <div>
                    <div style="font-size:20px; font-weight:800; display:flex; align-items:center; gap:10px;">
                        <span>–</span>
                        <span class="kyc-badge">–</span>
                    </div>
                    <div style="color:#94a3b8; font-size:12px; margin-top:6px; display:flex; gap:16px;">
                        <span class="user-card-uid">UID: –</span>
                        <span class="user-card-joined"></span>
                    </div>
                </div>
            </div>
            <div style="display:flex; align-items:center; gap:16px;">
                <button class="btn-deposit-top" onclick="switchPageView('deposit')" data-i18n="depositFundsBtn">Deposit Funds</button>
            </div>
        </div>

        <!-- BALANCE OVERVIEW GRID -->
        <div class="balance-overview-grid">
            <div class="sub-balance-card">
                <span class="sub-balance-title" data-i18n="spotWallet">Spot Wallet</span>
                <span class="sub-balance-val">$0.00</span>
            </div>
            <div class="sub-balance-card">
                <span class="sub-balance-title" data-i18n="futuresMargin">Futures Margin</span>
                <span class="sub-balance-val">$0.00</span>
            </div>
            <div class="sub-balance-card">
                <span class="sub-balance-title" data-i18n="fundingAccount">Funding Account</span>
                <span class="sub-balance-val">$0.00</span>
            </div>
            <div class="sub-balance-card">
                <span class="sub-balance-title" data-i18n="unrealizedPnL">Unrealized PnL</span>
                <span class="sub-balance-val">$0.00</span>
            </div>
        </div>

        <!-- CRYPTO ASSET HOLDINGS & PORTFOLIO BREAKDOWN -->
        <div class="markets-section">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; flex-wrap:wrap; gap:12px;">
                <div>
                    <div style="font-size:18px; font-weight:800; color:var(--text-dark);" data-i18n="holdingsTitle">Crypto Asset Holdings & Portfolio Balances</div>
                    <div style="font-size:11px; color:var(--text-muted); margin-top:2px;" data-i18n="holdingsSub">Real-time breakdown of all digital assets, live market valuation, quantities, and order margins.</div>
                </div>
                <div style="display:flex; gap:8px;">
                    <button class="btn-deposit-top" onclick="switchPageView('deposit')" data-i18n="depositAssetBtn">+ Deposit Asset</button>
                    <button class="btn-webtrader" onclick="switchPageView('withdraw')" data-i18n="withdrawAssetBtn">Withdraw Asset</button>
                </div>
            </div>

            <div class="table-responsive-wrapper vt-scroll">
                <table class="markets-table">
                    <thead>
                        <tr>
                            <th data-i18n="colAssetCoin">Asset / Coin</th>
                            <th data-i18n="colTotalQty">Total Quantity</th>
                            <th data-i18n="colAvailOrders">Available / In Orders</th>
                            <th data-i18n="colLivePriceCad">Live Price (CAD)</th>
                            <th data-i18n="colTotalValCad">Total Value (CAD)</th>
                            <th data-i18n="colPortfolioPct">Portfolio %</th>
                            <th data-i18n="colActions">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="holdingsTableBody">
                        <!-- Rendered from the API by VTHydrate.account(); no placeholder holdings. -->
                    </tbody>
                </table>
            </div>
        </div>

        <!-- RECENT TRANSACTIONS (wallet view) -->
        <div class="markets-section">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
                <div>
                    <div style="font-size:16px; font-weight:800; color:var(--text-dark);" data-i18n="walletTxTitle">Recent transactions</div>
                    <div style="font-size:11px; color:var(--text-muted);" data-i18n="walletTxSub">Your latest deposits, withdrawals and transfers.</div>
                </div>
                <a href="javascript:void(0)" onclick="switchPageView('transaction-history')" class="history-link" data-i18n="viewAllTx">View all &rarr;</a>
            </div>

            <div class="table-responsive-wrapper vt-scroll">
                <table class="markets-table">
                    <thead>
                        <tr>
                            <th data-i18n="colType">Type</th>
                            <th data-i18n="colAsset">Asset</th>
                            <th data-i18n="colAmount">Amount</th>
                            <th data-i18n="colStatus">Status</th>
                            <th data-i18n="colDateTime">Date</th>
                        </tr>
                    </thead>
                    <!-- Filled by VTHydrate.walletTransactions() from the same
                         /api/me/transactions data as the full history view. -->
                    <tbody id="walletTxBody">
                        <tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:20px;">Loading…</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- SECURITY CENTER & MULTI-FACTOR PROTECTION -->
        <div class="security-checklist">
            <div style="font-size:16px; font-weight:800; color:var(--text-dark); margin-bottom:16px; display:flex; justify-content:space-between; align-items:center;">
                <span data-i18n="securityTitle">Security & Authentication Center</span>
                <span style="font-size:11px; color:#10b981; font-weight:700;">🟢 All Systems Protected</span>
            </div>
            <div class="security-item">
                <div class="security-left">
                    <div class="sec-icon">📱</div>
                    <div>
                        <div style="font-weight:700; font-size:13px;" data-i18n="sec2faTitle">Google Two-Factor Authentication (2FA)</div>
                        <div style="font-size:11px; color:var(--text-muted);" data-i18n="sec2faDesc">Used for withdrawals, API creation, and security modifications.</div>
                    </div>
                </div>
                <span class="change-pill pos" data-i18n="enabled">Enabled</span>
            </div>
            <div class="security-item">
                <div class="security-left">
                    <div class="sec-icon">🔑</div>
                    <div>
                        <div style="font-weight:700; font-size:13px;">FIDO2 / YubiKey Hardware Security Key</div>
                        <div style="font-size:11px; color:var(--text-muted);">Hardware biometric key protection (YubiKey 5 Series).</div>
                    </div>
                </div>
                <button class="btn-card btn-card-light" style="padding:4px 12px; flex:none;">Manage Keys</button>
            </div>
            <div class="security-item">
                <div class="security-left">
                    <div class="sec-icon">✉️</div>
                    <div>
                        <div style="font-weight:700; font-size:13px;" data-i18n="secEmailTitle">Email Verification Code</div>
                        <div class="user-card-email" style="font-size:11px; color:var(--text-muted);">–</div>
                    </div>
                </div>
                <span class="change-pill pos" data-i18n="verified">Verified</span>
            </div>
            <div class="security-item">
                <div class="security-left">
                    <div class="sec-icon">🛡️</div>
                    <div>
                        <div style="font-weight:700; font-size:13px;" data-i18n="secPhishTitle">Anti-Phishing Code</div>
                        <div style="font-size:11px; color:var(--text-muted);">Not set. Configure a code so you can recognise genuine VT Markets emails.</div>
                    </div>
                </div>
                <button class="btn-card btn-card-light" style="padding:4px 12px; flex:none;" data-i18n="btnConfigure">Configure</button>
            </div>
        </div>

        <!-- INSTITUTIONAL API KEYS MANAGEMENT -->
        <div class="markets-section">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
                <div>
                    <div style="font-size:16px; font-weight:800; color:var(--text-dark);">Institutional API Keys</div>
                    <div style="font-size:11px; color:var(--text-muted);">Manage high-frequency trading API keys with IP whitelist protection.</div>
                </div>
                <button class="btn-deposit-top" onclick="createApiKey()">+ Create New API Key</button>
            </div>

            <div class="table-responsive-wrapper vt-scroll">
                <table class="markets-table">
                    <thead>
                        <tr>
                            <th>Key Label</th>
                            <th>API Key ID</th>
                            <th>Created</th>
                            <th>Last used</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <!-- Rendered from /api/me/api-keys by VTHydrate.apiKeys().
                         Previously two invented keys with fabricated IPs. -->
                    <tbody id="apiKeysTableBody">
                        <tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:20px;">Loading…</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- ACTIVE SESSIONS & DEVICE MANAGER -->
        <div class="markets-section">
            <div style="font-size:16px; font-weight:800; color:var(--text-dark);">Recent account activity</div>
            <div style="font-size:11px; color:var(--text-muted); margin-bottom:16px;">
                Sign-ins and security changes on your account. Contact support if you see something you do not recognise.
            </div>

            <div class="table-responsive-wrapper vt-scroll">
                <table class="markets-table">
                    <thead>
                        <tr>
                            <th>Event</th>
                            <th>IP Address</th>
                            <th>Device</th>
                            <th>When</th>
                        </tr>
                    </thead>
                    <!-- Rendered from /api/me/activity by VTHydrate.securityActivity().
                         Previously two invented sessions with fabricated IPs and cities. -->
                    <tbody id="securityActivityBody">
                        <tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:20px;">Loading…</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `,

    // 2. UPGRADED INSTITUTIONAL DEPOSIT VIEW
    // 2. DEPOSIT — crypto & fiat funding
    deposit: `
        <div class="funds-page">
            <div class="funds-header">
                <div>
                    <div class="funds-title" data-i18n="depositTitle">Deposit funds</div>
                    <div class="funds-sub" data-i18n="depositSubtitle">Fund your VT Markets account with digital assets or a card. Crypto deposits are credited automatically once the network confirms your transaction.</div>
                </div>
                <div class="funds-badges">
                    <span class="funds-badge green">⚡ <span data-i18n="badgeAutoCredit">Auto-credited</span></span>
                    <span class="funds-badge blue">🛡️ <span data-i18n="badgeSegregated">Segregated custody</span></span>
                </div>
            </div>

            <div class="funds-switch">
                <button class="funds-switch-btn active" id="tabDepositCrypto" onclick="switchDepositType('crypto')">
                    <svg class="switch-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"></circle><path d="M9.5 9.5h4a2 2 0 0 1 0 4h-4h4a2 2 0 0 1 0 4h-4M11 7v10M13.5 7v10"></path></svg>
                    <span data-i18n="cryptoTabBtn">Crypto</span>
                </button>
                <button class="funds-switch-btn" id="tabDepositFiat" onclick="switchDepositType('fiat')">
                    <svg class="switch-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"></rect><path d="M2 10h20"></path></svg>
                    <span data-i18n="fiatTabBtn">Card / Bank</span>
                </button>
            </div>

            <!-- ============ CRYPTO ============ -->
            <div id="cryptoDepositSection">
                <div class="funds-grid">
                    <!-- LEFT: asset + network -->
                    <div class="funds-col">
                        <div class="funds-card">
                            <div class="funds-card-head">
                                <div class="funds-card-title"><span class="funds-step-num">1</span> <span data-i18n="chooseAsset">Choose an asset</span></div>
                            </div>
                            <div class="asset-picker" id="depositAssetPicker">
                                <div class="asset-chip active" onclick="selectDepositAsset('USDT', this)">
                                    <span class="asset-coin" style="background:#26a17b">₮</span>
                                    <span class="asset-ticker">USDT</span>
                                    <span class="asset-name">Tether</span>
                                </div>
                                <div class="asset-chip" onclick="selectDepositAsset('BTC', this)">
                                    <span class="asset-coin" style="background:#f7931a">₿</span>
                                    <span class="asset-ticker">BTC</span>
                                    <span class="asset-name">Bitcoin</span>
                                </div>
                                <div class="asset-chip" onclick="selectDepositAsset('ETH', this)">
                                    <span class="asset-coin" style="background:#627eea">Ξ</span>
                                    <span class="asset-ticker">ETH</span>
                                    <span class="asset-name">Ethereum</span>
                                </div>
                                <div class="asset-chip" onclick="selectDepositAsset('SOL', this)">
                                    <span class="asset-coin" style="background:#9945ff">◎</span>
                                    <span class="asset-ticker">SOL</span>
                                    <span class="asset-name">Solana</span>
                                </div>
                            </div>
                        </div>

                        <div class="funds-card">
                            <div class="funds-card-head">
                                <div class="funds-card-title"><span class="funds-step-num">2</span> <span data-i18n="chooseNetwork">Choose a network</span></div>
                                <span class="funds-card-hint" data-i18n="networkHintShort">Fees are set by the blockchain</span>
                            </div>
                            <div class="network-list" id="depositNetworkList"></div>

                            <div class="callout danger" style="margin-top:14px;">
                                <span class="callout-icon">⚠️</span>
                                <div>
                                    <strong data-i18n="networkWarnTitle">Send on the selected network only</strong>
                                    <span data-i18n="networkWarnBody">Depositing an asset or using a network other than the one shown will result in permanent loss of funds. VT Markets cannot recover mismatched transfers.</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- RIGHT: address -->
                    <div class="funds-col">
                        <div class="funds-card">
                            <div class="funds-card-head">
                                <div class="funds-card-title"><span class="funds-step-num">3</span> <span data-i18n="sendToAddress">Send to this address</span></div>
                            </div>

                            <div class="qr-panel">
                                <div class="qr-frame">
                                    <svg viewBox="0 0 33 33" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">
                                        <rect width="33" height="33" fill="#fff"/>
                                        <g fill="#0f172a">
                                            <path d="M0 0h7v7H0zM26 0h7v7h-7zM0 26h7v7H0z"/>
                                            <path fill="#fff" d="M1 1h5v5H1zM27 1h5v5h-5zM1 27h5v5H1z"/>
                                            <path d="M2 2h3v3H2zM28 2h3v3h-3zM2 28h3v3H2z"/>
                                            <path d="M9 0h2v2H9zM13 1h2v2h-2zM17 0h2v3h-2zM21 1h2v2h-2zM9 4h4v2H9zM15 4h2v2h-2zM19 4h4v2h-4z"/>
                                            <path d="M0 9h2v2H0zM4 9h2v2H4zM0 13h3v2H0zM4 13h2v3H4zM0 17h2v2H0zM3 17h3v2H3zM0 21h2v2H0zM4 21h2v2H4z"/>
                                            <path d="M27 9h2v2h-2zM31 9h2v2h-2zM27 13h3v2h-3zM31 13h2v3h-2zM27 17h2v2h-2zM30 17h3v2h-3zM27 21h2v2h-2zM31 21h2v2h-2z"/>
                                            <path d="M9 27h2v2H9zM13 28h2v2h-2zM17 27h2v3h-2zM21 28h2v2h-2zM9 31h4v2H9zM15 31h2v2h-2zM19 31h4v2h-4z"/>
                                            <path d="M9 9h3v3H9zM14 9h2v2h-2zM18 10h3v2h-3zM22 9h2v3h-2zM9 14h2v2H9zM12 13h3v2h-3zM17 14h2v3h-2zM21 13h3v2h-3zM10 18h3v2h-3zM14 17h2v3h-2zM19 18h2v2h-2zM22 18h2v3h-2zM9 22h3v2H9zM13 21h2v3h-2zM17 22h3v2h-3zM21 22h2v2h-2z"/>
                                        </g>
                                    </svg>
                                </div>

                                <div class="qr-caption">
                                    <span data-i18n="depositAddress">Deposit address</span> ·
                                    <span id="depositAssetLabel">USDT</span> <span id="depositNetworkLabel">TRC20</span>
                                </div>

                                <div class="addr-row">
                                    <input type="text" class="addr-field" id="depositAddrInput" value="TYv9K2mP8NqW5xL7zR4bV1cX0yA3eM6k9D" readonly>
                                    <button class="btn-copy-addr" id="btnCopyAddr" onclick="copyDepositAddress()" data-i18n="btnCopy">Copy</button>
                                </div>

                                <div class="addr-facts">
                                    <span><span data-i18n="minDeposit">Minimum</span> <strong id="depositMinVal">10 USDT</strong></span>
                                    <span><span data-i18n="confirmations">Confirmations</span> <strong id="depositConfVal">1</strong></span>
                                    <span><span data-i18n="creditTime">Credited in</span> <strong id="depositEtaVal">~2 min</strong></span>
                                </div>
                            </div>

                            <div class="callout info" style="margin-top:14px;">
                                <span class="callout-icon">ℹ️</span>
                                <div>
                                    <strong data-i18n="addressReusableTitle">This address is permanent</strong>
                                    <span data-i18n="addressReusableBody">You can reuse it for future deposits of the same asset on the same network. Every incoming transfer is credited to your account automatically.</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                <div class="steps-strip" style="margin-top:20px;">
                    <div class="step-card">
                        <span class="step-badge">1</span>
                        <div>
                            <div class="step-title" data-i18n="howStep1Title">Copy your address</div>
                            <div class="step-desc" data-i18n="howStep1Desc">Pick the asset and network, then copy the address or scan the QR code from your wallet app.</div>
                        </div>
                    </div>
                    <div class="step-card">
                        <span class="step-badge">2</span>
                        <div>
                            <div class="step-title" data-i18n="howStep2Title">Send from your wallet</div>
                            <div class="step-desc" data-i18n="howStep2Desc">Confirm the network matches before broadcasting. Sending below the minimum will not be credited.</div>
                        </div>
                    </div>
                    <div class="step-card">
                        <span class="step-badge">3</span>
                        <div>
                            <div class="step-title" data-i18n="howStep3Title">Funds land automatically</div>
                            <div class="step-desc" data-i18n="howStep3Desc">Your balance updates as soon as the required confirmations are reached. No manual action needed.</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ============ FIAT ============ -->
            <div id="fiatDepositSection" style="display:none;">
                <div class="funds-grid">
                    <div class="funds-col"><div class="funds-card">
                        <div class="funds-card-head">
                            <div class="funds-card-title" data-i18n="depositMethod">Payment method</div>
                            <div class="card-brands">💳 🏦</div>
                        </div>

                        <label class="funds-label" data-i18n="selectFiatCurrency">Currency</label>
                        <input type="hidden" id="fiatCurrencySelect" value="CAD">
                        <div class="cur-select" id="curSelect" style="margin-bottom:18px;">
                            <button type="button" class="cur-trigger" onclick="toggleCurrencyMenu(event)">
                                <span class="cur-flag" id="curFlag"></span>
                                <span class="cur-code" id="curCode">CAD</span>
                                <span class="cur-name" id="curName">Canadian Dollar</span>
                                <svg class="cur-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </button>
                            <div class="cur-menu" id="curMenu"></div>
                        </div>

                        <label class="funds-label" data-i18n="depositAmountLabel">Amount</label>
                        <div class="amount-wrap">
                            <input type="text" inputmode="decimal" class="amount-input" id="fiatDepositAmountInput" placeholder="0.00" value="250.00" oninput="updateFiatSummary()">
                            <span class="amount-unit" id="fiatUnitLabel">CAD</span>
                        </div>
                        <div class="fiat-preset-row" style="margin-top:10px;">
                            <button class="fiat-preset active" onclick="setFiatPreset(250, this)">250</button>
                            <button class="fiat-preset" onclick="setFiatPreset(500, this)">500</button>
                            <button class="fiat-preset" onclick="setFiatPreset(750, this)">750</button>
                            <button class="fiat-preset" onclick="setFiatPreset(1000, this)">1,000</button>
                        </div>

                        <div class="callout info" style="margin-top:16px;">
                            <span class="callout-icon">🔒</span>
                            <div>
                                <strong data-i18n="fiatSecureTitle">Processed on a secure gateway</strong>
                                <span data-i18n="fiatSecureBody">Card details are entered on our PCI-DSS certified payment provider and are never stored by VT Markets.</span>
                            </div>
                        </div>
                    </div></div>

                    <div class="funds-col"><div class="funds-card">
                        <div class="funds-card-head">
                            <div class="funds-card-title" data-i18n="orderSummary">Summary</div>
                        </div>
                        <div class="summary-box">
                            <div class="summary-row"><span data-i18n="depositAmountLabel">Amount</span><strong id="fiatSumAmount">1,000.00 CAD</strong></div>
                            <div class="summary-row"><span data-i18n="processingFee">Processing fee</span><strong id="fiatSumFee">0.00 CAD</strong></div>
                            <div class="summary-row"><span data-i18n="convRate">Conversion rate</span><strong>1.0000</strong></div>
                            <div class="summary-divider"></div>
                            <div class="summary-row total"><span data-i18n="totalCredited">Credited to account</span><strong id="fiatSumTotal">1,000.00 CAD</strong></div>
                        </div>

                        <div class="sec-list" style="margin-top:14px;">
                            <div class="sec-row"><span class="sec-tick">✓</span><span data-i18n="fiatCheck1">3-D Secure verification</span><span class="sec-state" data-i18n="enabled">Enabled</span></div>
                            <div class="sec-row"><span class="sec-tick">✓</span><span data-i18n="fiatCheck2">Instant settlement</span><span class="sec-state">0–5 min</span></div>
                            <div class="sec-row"><span class="sec-tick">✓</span><span data-i18n="fiatCheck3">No deposit commission</span><span class="sec-state">0%</span></div>
                        </div>

                        <button class="btn-funds-primary" style="margin-top:18px;" onclick="openStripeCheckout()" data-i18n="btnProceedPay">Continue to secure payment</button>
                        <div style="font-size:10.5px; color:var(--text-light); text-align:center; margin-top:10px;" data-i18n="fiatTerms">By continuing you agree to the VT Markets funding terms.</div>
                    </div></div>
                </div>
            </div>

            <!-- Sits outside both tab sections so it shows for crypto and for
                 card/bank alike. Replaces the old crypto-only "Recent deposits"
                 list with the same table used in transaction history. -->
            <div class="markets-section" style="margin-top:20px;">
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
                    <div>
                        <div style="font-size:16px; font-weight:800; color:var(--text-dark);" data-i18n="depositHistoryTitle">Deposit history</div>
                        <div style="font-size:11px; color:var(--text-muted);" data-i18n="depositHistorySub">Every deposit on your account, by any method.</div>
                    </div>
                    <a href="javascript:void(0)" onclick="switchPageView('transaction-history')" class="history-link" data-i18n="viewAllTx">View all &rarr;</a>
                </div>

                <div class="table-responsive-wrapper vt-scroll">
                    <table class="markets-table">
                        <thead>
                            <tr>
                                <th data-i18n="colType">Type</th>
                                <th data-i18n="colMethod">Method</th>
                                <th data-i18n="colAmount">Amount</th>
                                <th data-i18n="colStatus">Status</th>
                                <th data-i18n="colDateTime">Date</th>
                            </tr>
                        </thead>
                        <tbody id="depositHistoryBody">
                            <tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:20px;">Loading…</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `,

    // 3. WITHDRAW — payout method chooser, then the matching flow
    withdraw: `
        <div class="funds-page">
            <div class="funds-header">
                <div>
                    <div class="funds-title" data-i18n="withdrawTitle">Withdraw funds</div>
                    <div class="funds-sub" data-i18n="withdrawSubtitle">Choose how you want to be paid out. Every request is checked against your security policy before it is released.</div>
                </div>
                <div class="funds-badges">
                    <span class="funds-badge blue">🛡️ <span data-i18n="badge2fa">2FA required</span></span>
                    <span class="funds-badge gold">📋 <span data-i18n="badgeWhitelist">Whitelist enforced</span></span>
                </div>
            </div>

            <!-- ============ STEP 1: PICK A PAYOUT METHOD ============ -->
            <div id="wdMethodStep">
                <div class="funds-card-title" style="margin-bottom:14px;" data-i18n="choosePayout">How would you like to withdraw?</div>
                <div class="method-picker">

                    <button class="payout-card" onclick="selectWithdrawMethod('crypto')">
                        <div class="payout-top">
                            <span class="payout-ico gold">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5h4a2 2 0 0 1 0 4h-4h4a2 2 0 0 1 0 4h-4M11 7v10M13.5 7v10"/></svg>
                            </span>
                            <div>
                                <div class="payout-name" data-i18n="payoutCrypto">Crypto wallet</div>
                                <div class="payout-tagline" data-i18n="payoutCryptoDesc">Send BTC, ETH, USDT or SOL on-chain</div>
                            </div>
                        </div>
                        <div class="payout-meta">
                            <span class="payout-pill">⚡ 2–30 min</span>
                            <span class="payout-pill" data-i18n="pillNetworkFee">Network fee</span>
                            <span class="payout-pill" data-i18n="pill247">24/7</span>
                        </div>
                    </button>

                    <button class="payout-card" onclick="selectWithdrawMethod('bank')">
                        <div class="payout-top">
                            <span class="payout-ico">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 10l9-6 9 6"/><path d="M5 10v9M9.5 10v9M14.5 10v9M19 10v9"/><path d="M3 21h18"/></svg>
                            </span>
                            <div>
                                <div class="payout-name" data-i18n="payoutBank">Canadian bank account</div>
                                <div class="payout-tagline" data-i18n="payoutBankDesc">Direct EFT deposit to any Canadian bank</div>
                            </div>
                        </div>
                        <div class="payout-meta">
                            <span class="payout-pill">🇨🇦 CAD</span>
                            <span class="payout-pill">1–3 <span data-i18n="businessDays">business days</span></span>
                            <span class="payout-pill free" data-i18n="feeFree">No fee</span>
                        </div>
                    </button>

                    <button class="payout-card" onclick="selectWithdrawMethod('interac')">
                        <span class="payout-flag" data-i18n="fastest">Fastest</span>
                        <div class="payout-top">
                            <span class="payout-ico green">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 6 10-6"/></svg>
                            </span>
                            <div>
                                <div class="payout-name" data-i18n="payoutInterac">Interac e-Transfer</div>
                                <div class="payout-tagline" data-i18n="payoutInteracDesc">Sent to your email, deposited in minutes</div>
                            </div>
                        </div>
                        <div class="payout-meta">
                            <span class="payout-pill">🇨🇦 CAD</span>
                            <span class="payout-pill">⚡ 5–30 min</span>
                            <span class="payout-pill">$1.50</span>
                        </div>
                    </button>

                    <button class="payout-card" onclick="selectWithdrawMethod('wire')">
                        <div class="payout-top">
                            <span class="payout-ico purple">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18z"/></svg>
                            </span>
                            <div>
                                <div class="payout-name" data-i18n="payoutWire">International wire</div>
                                <div class="payout-tagline" data-i18n="payoutWireDesc">SWIFT transfer in USD, EUR, GBP and more</div>
                            </div>
                        </div>
                        <div class="payout-meta">
                            <span class="payout-pill">🌍 <span data-i18n="global">Global</span></span>
                            <span class="payout-pill">1–5 <span data-i18n="businessDays">business days</span></span>
                            <span class="payout-pill">$25.00</span>
                        </div>
                    </button>

                    <button class="payout-card" onclick="selectWithdrawMethod('card')">
                        <div class="payout-top">
                            <span class="payout-ico slate">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
                            </span>
                            <div>
                                <div class="payout-name" data-i18n="payoutCard">Back to card</div>
                                <div class="payout-tagline" data-i18n="payoutCardDesc">Refund to the card used for your deposit</div>
                            </div>
                        </div>
                        <div class="payout-meta">
                            <span class="payout-pill">💳 Visa / MC</span>
                            <span class="payout-pill">1–3 <span data-i18n="businessDays">business days</span></span>
                            <span class="payout-pill">1.5%</span>
                        </div>
                    </button>

                    <button class="payout-card" onclick="selectWithdrawMethod('internal')">
                        <div class="payout-top">
                            <span class="payout-ico">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 2l4 4-4 4"/><path d="M3 6h18"/><path d="M7 22l-4-4 4-4"/><path d="M21 18H3"/></svg>
                            </span>
                            <div>
                                <div class="payout-name" data-i18n="payoutInternal">VT Markets transfer</div>
                                <div class="payout-tagline" data-i18n="payoutInternalDesc">Instant transfer to another VT Markets account</div>
                            </div>
                        </div>
                        <div class="payout-meta">
                            <span class="payout-pill">⚡ <span data-i18n="instant">Instant</span></span>
                            <span class="payout-pill free" data-i18n="feeFree">No fee</span>
                            <span class="payout-pill" data-i18n="pill247">24/7</span>
                        </div>
                    </button>
                </div>

                <div class="callout info" style="margin-top:18px;">
                    <span class="callout-icon">ℹ️</span>
                    <div>
                        <strong data-i18n="payoutNoteTitle">Payout methods must be verified</strong>
                        <span data-i18n="payoutNoteBody">Bank accounts and cards must belong to the account holder. Third-party payouts are declined under our anti-money-laundering policy.</span>
                    </div>
                </div>
            </div>

            <!-- ============ STEP 2: THE FLOW ============ -->
            <div id="wdFlowStep" style="display:none;">
                <button class="flow-back" onclick="backToWithdrawMethods()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                    <span data-i18n="changeMethod">Change method</span>
                </button>

                <div class="funds-grid" style="margin-top:14px;">
                    <div class="funds-col">
                        <div class="flow-chosen">
                            <span class="payout-ico" id="wdChosenIco"></span>
                            <div>
                                <div class="payout-name" id="wdChosenName">—</div>
                                <div class="payout-tagline" id="wdChosenDesc">—</div>
                            </div>
                        </div>

                        <!-- ---- CRYPTO ---- -->
                        <div class="funds-card wd-panel" id="wdPanelCrypto" style="display:none;">
                            <div class="funds-card-head">
                                <div class="funds-card-title"><span class="funds-step-num">1</span> <span data-i18n="selectAsset">Select asset</span></div>
                            </div>
                            <div class="asset-picker" id="wdAssetPicker">
                                <div class="asset-chip active" onclick="selectWithdrawAsset('USDT', this)">
                                    <span class="asset-coin" style="background:#26a17b">₮</span><span class="asset-ticker">USDT</span><span class="asset-name" id="withdrawAssetQty">0.00</span>
                                </div>
                                <div class="asset-chip" onclick="selectWithdrawAsset('BTC', this)">
                                    <span class="asset-coin" style="background:#f7931a">₿</span><span class="asset-ticker">BTC</span><span class="asset-name">—</span>
                                </div>
                                <div class="asset-chip" onclick="selectWithdrawAsset('ETH', this)">
                                    <span class="asset-coin" style="background:#627eea">Ξ</span><span class="asset-ticker">ETH</span><span class="asset-name">—</span>
                                </div>
                                <div class="asset-chip" onclick="selectWithdrawAsset('SOL', this)">
                                    <span class="asset-coin" style="background:#9945ff">◎</span><span class="asset-ticker">SOL</span><span class="asset-name">—</span>
                                </div>
                            </div>

                            <div style="margin-top:18px;">
                                <label class="funds-label" data-i18n="whitelistedWallet">Whitelisted wallet</label>
                                <select class="form-select-custom" onchange="selectWithdrawDestination(this.value)">
                                    <option value="COLD">Cold Storage Vault — TRC20</option>
                                    <option value="LEDGER">Hardware Ledger — ERC20</option>
                                    <option value="NEW" data-i18n="addNewDestination">+ Use a new address…</option>
                                </select>
                            </div>

                            <div class="field-block" style="margin-top:14px;">
                                <label class="funds-label" data-i18n="recipientAddr">Destination address</label>
                                <input type="text" class="form-input-custom" id="withdrawAddrInput" value="TYv9K2mP8NqW5xL7zR4bV1cX0yA3eM6k9D" style="font-family:'JetBrains Mono',monospace; font-size:12px;">
                            </div>

                            <div class="callout warn">
                                <span class="callout-icon">🔐</span>
                                <div>
                                    <strong data-i18n="newAddrLockTitle">New addresses are held for 24 hours</strong>
                                    <span data-i18n="newAddrLockBody">Withdrawals to a recently added address are queued until the security hold clears.</span>
                                </div>
                            </div>
                        </div>

                        <!-- ---- CANADIAN BANK ---- -->
                        <div class="funds-card wd-panel" id="wdPanelBank" style="display:none;">
                            <div class="funds-card-head">
                                <div class="funds-card-title"><span class="funds-step-num">1</span> <span data-i18n="selectBank">Select your bank</span></div>
                                <span class="funds-card-hint" data-i18n="canadaOnly">Canadian institutions</span>
                            </div>
                            <input type="text" class="bank-search" data-i18n-placeholder="searchBank" placeholder="Search bank…" oninput="filterBanks(this.value)">
                            <div class="bank-grid" id="bankGrid"></div>

                            <div class="field-row-2" style="margin-top:18px;">
                                <div class="field-block">
                                    <label class="funds-label" data-i18n="institutionNo">Institution no.</label>
                                    <input type="text" class="form-input-custom" id="bankInstitution" readonly value="003">
                                </div>
                                <div class="field-block">
                                    <label class="funds-label" data-i18n="transitNo">Transit no.</label>
                                    <input type="text" class="form-input-custom" id="bankTransit" inputmode="numeric" maxlength="5" placeholder="00000">
                                    <div class="field-hint" data-i18n="transitHint">5 digits, found on your cheque or in online banking</div>
                                </div>
                            </div>

                            <div class="field-block">
                                <label class="funds-label" data-i18n="accountNo">Account number</label>
                                <input type="text" class="form-input-custom" id="bankAccount" inputmode="numeric" maxlength="12" placeholder="0000000">
                                <div class="field-hint" data-i18n="accountHint">7 to 12 digits, excluding the transit and institution numbers</div>
                            </div>

                            <div class="field-block">
                                <label class="funds-label" data-i18n="accountHolder">Account holder</label>
                                <input type="text" class="form-input-custom" id="bankHolder" class="user-card-fullname-input" value="" placeholder="Account holder name">
                                <div class="field-hint" data-i18n="holderHint">Must match the name on your verified VT Markets account</div>
                            </div>
                        </div>

                        <!-- ---- INTERAC ---- -->
                        <div class="funds-card wd-panel" id="wdPanelInterac" style="display:none;">
                            <div class="funds-card-head">
                                <div class="funds-card-title"><span class="funds-step-num">1</span> <span data-i18n="interacDetails">Transfer details</span></div>
                            </div>
                            <div class="field-block">
                                <label class="funds-label" data-i18n="interacEmail">Recipient email</label>
                                <input type="email" class="form-input-custom" id="interacEmail" class="user-card-email-input" value="" placeholder="you@example.com">
                                <div class="field-hint" data-i18n="interacEmailHint">Must be registered for Interac e-Transfer with your bank</div>
                            </div>
                            <div class="field-row-2">
                                <div class="field-block">
                                    <label class="funds-label" data-i18n="securityQuestion">Security question</label>
                                    <input type="text" class="form-input-custom" id="interacQuestion" placeholder="e.g. City of birth?">
                                </div>
                                <div class="field-block">
                                    <label class="funds-label" data-i18n="securityAnswer">Answer</label>
                                    <input type="text" class="form-input-custom" id="interacAnswer" placeholder="One word, no spaces">
                                </div>
                            </div>
                            <div class="callout info">
                                <span class="callout-icon">💡</span>
                                <div>
                                    <strong data-i18n="autodepositTitle">Autodeposit registered?</strong>
                                    <span data-i18n="autodepositBody">If your bank has Autodeposit enabled for this email, the security question is skipped and funds land automatically.</span>
                                </div>
                            </div>
                        </div>

                        <!-- ---- WIRE ---- -->
                        <div class="funds-card wd-panel" id="wdPanelWire" style="display:none;">
                            <div class="funds-card-head">
                                <div class="funds-card-title"><span class="funds-step-num">1</span> <span data-i18n="beneficiaryBank">Beneficiary bank</span></div>
                            </div>
                            <div class="field-row-2">
                                <div class="field-block">
                                    <label class="funds-label" data-i18n="swiftBic">SWIFT / BIC</label>
                                    <input type="text" class="form-input-custom" id="wireSwift" placeholder="ROYCCAT2" style="font-family:'JetBrains Mono',monospace;">
                                </div>
                                <div class="field-block">
                                    <label class="funds-label" data-i18n="wireCurrency">Currency</label>
                                    <select class="form-select-custom" id="wireCurrency">
                                        <option value="CAD">CAD — Canadian Dollar</option>
                                        <option value="USD">USD — US Dollar</option>
                                        <option value="EUR">EUR — Euro</option>
                                        <option value="GBP">GBP — British Pound</option>
                                        <option value="CHF">CHF — Swiss Franc</option>
                                    </select>
                                </div>
                            </div>
                            <div class="field-block">
                                <label class="funds-label" data-i18n="ibanAccount">IBAN / account number</label>
                                <input type="text" class="form-input-custom" id="wireIban" placeholder="GB89 BARK 2020 1599 8214 00" style="font-family:'JetBrains Mono',monospace;">
                            </div>
                            <div class="field-block">
                                <label class="funds-label" data-i18n="bankNameAddr">Bank name &amp; address</label>
                                <input type="text" class="form-input-custom" id="wireBank" placeholder="Royal Bank of Canada, Toronto ON">
                            </div>
                            <div class="callout warn">
                                <span class="callout-icon">⚠️</span>
                                <div>
                                    <strong data-i18n="wireFeeTitle">Intermediary bank fees may apply</strong>
                                    <span data-i18n="wireFeeBody">Correspondent banks can deduct their own charges before the funds reach your account. VT Markets does not control those deductions.</span>
                                </div>
                            </div>
                        </div>

                        <!-- ---- CARD ---- -->
                        <div class="funds-card wd-panel" id="wdPanelCard" style="display:none;">
                            <div class="funds-card-head">
                                <div class="funds-card-title"><span class="funds-step-num">1</span> <span data-i18n="selectCard">Select card</span></div>
                            </div>
                            <div class="network-list">
                                <div class="network-item" style="color:var(--text-muted); font-size:12px;">
                                    No card on file. Deposit with a card first — payouts return to the original card.
                                </div>
                            </div>
                            <div class="callout info" style="margin-top:14px;">
                                <span class="callout-icon">↩️</span>
                                <div>
                                    <strong data-i18n="cardRefundTitle">Refunds go back to the original card</strong>
                                    <span data-i18n="cardRefundBody">Card payouts are limited to the total you deposited with that card. Anything above that must be withdrawn to a bank account.</span>
                                </div>
                            </div>
                        </div>

                        <!-- ---- INTERNAL ---- -->
                        <div class="funds-card wd-panel" id="wdPanelInternal" style="display:none;">
                            <div class="funds-card-head">
                                <div class="funds-card-title"><span class="funds-step-num">1</span> <span data-i18n="recipientAccount">Recipient account</span></div>
                            </div>
                            <div class="field-block">
                                <label class="funds-label" data-i18n="recipientUid">Recipient UID or email</label>
                                <input type="text" class="form-input-custom" id="internalUid" placeholder="Recipient UID" style="font-family:'JetBrains Mono',monospace;">
                                <div class="field-hint" data-i18n="internalHint">Internal transfers are instant, free and stay on the VT Markets ledger</div>
                            </div>
                            <div class="field-block">
                                <label class="funds-label" data-i18n="noteOptional">Note (optional)</label>
                                <input type="text" class="form-input-custom" id="internalNote" placeholder="Reference for the recipient">
                            </div>
                        </div>

                        <!-- ---- AMOUNT (shared) ---- -->
                        <div class="funds-card">
                            <div class="funds-card-head">
                                <div class="funds-card-title"><span class="funds-step-num">2</span> <span data-i18n="withdrawAmount">Amount</span></div>
                            </div>
                            <div class="amount-wrap">
                                <input type="number" step="0.01" class="amount-input" id="withdrawAmountInput" placeholder="0.00" oninput="calculateWithdrawFee(this.value)">
                                <span class="amount-unit" id="withdrawUnitLabel">USDT</span>
                            </div>
                            <div class="pct-row">
                                <button class="pct-btn" onclick="setWithdrawPct(25, this)">25%</button>
                                <button class="pct-btn" onclick="setWithdrawPct(50, this)">50%</button>
                                <button class="pct-btn" onclick="setWithdrawPct(75, this)">75%</button>
                                <button class="pct-btn" onclick="setWithdrawPct(100, this)">MAX</button>
                            </div>
                            <div class="avail-line">
                                <span data-i18n="available">Available</span>
                                <strong id="withdrawAvailVal">$0.00</strong>
                            </div>
                        </div>
                    </div>

                    <!-- RIGHT: summary -->
                    <div class="funds-col">
                        <div class="funds-card">
                            <div class="funds-card-head">
                                <div class="funds-card-title" data-i18n="orderSummary">Summary</div>
                            </div>
                            <div class="summary-box">
                                <div class="summary-row"><span data-i18n="withdrawAmount">Amount</span><strong id="wdSumAmount">0.00</strong></div>
                                <div class="summary-row"><span id="wdFeeLabel" data-i18n="networkFee">Network fee</span><strong id="wdSumNetFee">1.00</strong></div>
                                <div class="summary-row"><span data-i18n="platformFee">Platform fee</span><strong id="wdSumPlatFee">0.00</strong></div>
                                <div class="summary-divider"></div>
                                <div class="summary-row total"><span data-i18n="youReceive">You receive</span><strong id="netReceiveVal">0.00</strong></div>
                            </div>

                            <div class="summary-row" style="margin-top:12px;">
                                <span data-i18n="estArrival">Estimated arrival</span>
                                <strong id="wdEta">—</strong>
                            </div>

                            <div class="limit-block">
                                <div class="limit-head">
                                    <span data-i18n="dailyLimit">Daily withdrawal limit</span>
                                    <strong id="limitText">0 / 2,500,000</strong>
                                </div>
                                <div class="limit-track"><div class="limit-fill" id="limitFill" style="width:1%"></div></div>
                            </div>

                            <div class="sec-list" style="margin-top:18px;">
                                <div class="sec-row"><span class="sec-tick">✓</span><span data-i18n="secCheck2fa">Two-factor authentication</span><span class="sec-state" data-i18n="enabled">Enabled</span></div>
                                <div class="sec-row"><span class="sec-tick">✓</span><span data-i18n="secCheckEmail">Email confirmation</span><span class="sec-state" data-i18n="enabled">Enabled</span></div>
                                <div class="sec-row"><span class="sec-tick kyc-tick">·</span><span data-i18n="secCheckKyc">Identity verification</span><span class="sec-state kyc-state">–</span></div>
                            </div>

                            <button class="btn-funds-primary" style="margin-top:18px;" onclick="submitWithdrawal()" data-i18n="btnSubmitWithdraw">Review withdrawal</button>
                            <div style="font-size:10.5px; color:var(--text-light); text-align:center; margin-top:10px;" data-i18n="withdrawNotice">You will be asked to confirm with your 2FA code before the transaction is released.</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,

    // 4. PAYMENT DETAILS — whitelisted wallets & fiat methods
    paymentDetails: `
        <div class="funds-page">
            <div class="funds-header">
                <div>
                    <div class="funds-title" data-i18n="paymentDetailsTitle">Payment details</div>
                    <div class="funds-sub" data-i18n="paymentDetailsSubtitle">Manage the wallets and payment methods your account is allowed to withdraw to. Withdrawals can only be sent to a whitelisted destination.</div>
                </div>
                <div class="funds-badges">
                    <button class="btn-funds-primary" style="width:auto; padding:10px 18px; font-size:12px;" onclick="addWhitelistAddress()" data-i18n="addNewAddressBtn">+ Add address</button>
                </div>
            </div>

            <div class="callout warn">
                <span class="callout-icon">🔐</span>
                <div>
                    <strong data-i18n="whitelistLockTitle">Withdrawal whitelist is active</strong>
                    <span data-i18n="whitelistLockBody">Only the destinations listed below can receive funds. Newly added addresses are subject to a 24-hour security hold before their first withdrawal.</span>
                </div>
            </div>

            <div class="funds-card">
                <div class="funds-card-head">
                    <div class="funds-card-title" data-i18n="cryptoWallets">Whitelisted crypto wallets</div>
                    <span class="funds-card-hint">3 <span data-i18n="ofSlots">of 10 slots used</span></span>
                </div>

                <div class="method-grid" id="savedMethodsGrid">
                    <div class="method-card" style="grid-column:1/-1; text-align:center; color:var(--text-muted); font-size:12px;">
                        No saved payment methods yet. Add one from the deposit page.
                    </div>
                </div>
            </div>
        </div>
    `,

    // 5. TRANSACTION HISTORY — statements & on-chain records
    transactionHistory: `
        <div class="funds-page">
            <div class="funds-header">
                <div>
                    <div class="funds-title" data-i18n="txHistoryTitle">Transaction history</div>
                    <div class="funds-sub" data-i18n="txHistorySubtitle">A complete record of deposits, withdrawals and internal transfers, with on-chain references for every settled transaction.</div>
                </div>
                <div class="funds-badges">
                    <button class="btn-funds-ghost" onclick="exportStatement('csv')">📥 <span data-i18n="exportCsv">Export CSV</span></button>
                    <button class="btn-funds-ghost" onclick="exportStatement('pdf')">📄 <span data-i18n="exportPdf">Export PDF</span></button>
                </div>
            </div>

            <div class="funds-tiles">
                <div class="funds-tile">
                    <div class="tile-label">↓ <span data-i18n="tileDeposits">Total deposits</span></div>
                    <div class="tile-value up" id="txTileDeposits">$0.00</div>
                    <div class="tile-sub" data-i18n="last30d">Last 30 days</div>
                </div>
                <div class="funds-tile">
                    <div class="tile-label">↑ <span data-i18n="tileWithdrawals">Total withdrawals</span></div>
                    <div class="tile-value down" id="txTileWithdrawals">$0.00</div>
                    <div class="tile-sub" data-i18n="last30d">Last 30 days</div>
                </div>
                <div class="funds-tile">
                    <div class="tile-label">⇄ <span data-i18n="tileNetFlow">Net flow</span></div>
                    <div class="tile-value up" id="txTileNet">$0.00</div>
                    <div class="tile-sub" data-i18n="last30d">Last 30 days</div>
                </div>
                <div class="funds-tile">
                    <div class="tile-label">⧗ <span data-i18n="tilePending">Pending</span></div>
                    <div class="tile-value">1</div>
                    <div class="tile-sub" data-i18n="awaitingConf">Awaiting confirmations</div>
                </div>
            </div>

            <div class="funds-card">
                <div class="tx-toolbar" style="margin-bottom:18px;">
                    <select class="form-select-custom" onchange="filterTxHistory(this.value)">
                        <option value="ALL" data-i18n="filterAllTypes">All types</option>
                        <option value="DEPOSIT" data-i18n="deposit">Deposit</option>
                        <option value="WITHDRAWAL" data-i18n="withdrawal">Withdrawal</option>
                        <option value="TRANSFER" data-i18n="transfer">Transfer</option>
                    </select>
                    <select class="form-select-custom" onchange="filterTxHistory(this.value)">
                        <option value="ALL" data-i18n="filterAllAssets">All assets</option>
                        <option value="USDT">USDT</option>
                        <option value="BTC">BTC</option>
                        <option value="ETH">ETH</option>
                        <option value="SOL">SOL</option>
                    </select>
                    <select class="form-select-custom" onchange="filterTxHistory(this.value)">
                        <option value="30D" data-i18n="last30d">Last 30 days</option>
                        <option value="90D" data-i18n="last90d">Last 90 days</option>
                        <option value="1Y" data-i18n="lastYear">Last 12 months</option>
                    </select>
                    <input type="text" class="form-input-custom" data-i18n-placeholder="searchTxPlaceholder" placeholder="Search transaction ID…" oninput="searchTxHash(this.value)">
                </div>

                <div class="table-responsive-wrapper vt-scroll">
                    <table class="markets-table">
                        <thead>
                            <tr>
                                <th data-i18n="colTxId">Transaction ID</th>
                                <th data-i18n="colType">Type</th>
                                <th data-i18n="colAsset">Asset</th>
                                <th data-i18n="colAmount">Amount</th>
                                <th data-i18n="networkFee">Network fee</th>
                                <th data-i18n="colStatus">Status</th>
                                <th data-i18n="colDateTime">Date</th>
                                <th data-i18n="colExplorer">Explorer</th>
                            </tr>
                        </thead>
                        <tbody id="txHistoryTableBody">
                            <!-- Rendered from /api/me/transactions by VTHydrate.txHistory(). -->
                        </tbody>
                    </table>
                </div>

                <!-- Built by VTHydrate.txHistory() from the real row count. The
                     whole control stays hidden while everything fits on one page. -->
                <div class="tx-pagination" id="txPagination" style="display:none;">
                    <span id="txPageSummary"></span>
                    <div class="page-btns" id="txPageBtns"></div>
                </div>
            </div>
        </div>
    `,

    // 6. PROTRADER BOT — automated strategy console
    protrader: `
        <div class="bot-page">

            <!-- ============ HERO ============ -->
            <div class="bot-hero" id="botHero">
                <div class="bot-identity">
                    <div class="bot-avatar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9">
                            <rect x="4" y="8" width="16" height="12" rx="3"/>
                            <path d="M12 4v4M9 14h.01M15 14h.01M9.5 17.5h5"/>
                            <path d="M2 13v3M22 13v3"/>
                            <circle cx="12" cy="3" r="1.4"/>
                        </svg>
                    </div>
                    <div>
                        <div class="bot-name">
                            ProTrader Bot
                            <span class="bot-ver">v4.2 · NEURAL</span>
                        </div>
                        <div class="bot-strap" data-i18n="botStrap">Your automated trading desk. ProTrader Bot scans the order book across your selected pairs, sizes each position against your risk budget, and manages every exit with a hard stop-loss.</div>
                        <div class="bot-cap-note" id="botCapitalNote"></div>
                        <div class="bot-runtime">
                            <div class="rt-capital">
                                <span data-i18n="botUnderMgmt">Capital under management</span>
                                <strong id="botCapital">$0.00</strong>
                                <span class="cap-mode demo" id="botCapitalMode">DEMO</span>
                            </div>
                            <div><span data-i18n="botUptime">Uptime</span><strong id="botUptime">00:00:00</strong></div>
                            <div><span data-i18n="botSignals">Signals scanned</span><strong id="botSignals">0</strong></div>
                            <div><span data-i18n="botLatency">Exec. latency</span><strong id="botLatency">14 ms</strong></div>
                            <div><span data-i18n="botEngine">Engine</span><strong>VT-Core</strong></div>
                        </div>
                    </div>
                </div>

                <div class="bot-controls">
                    <span class="bot-state-pill" id="botStatePill" data-i18n="botRunning">Running</span>
                    <button class="btn-bot warn" id="botPauseBtn" onclick="toggleBotRunning()">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                        <span id="botPauseLabel" data-i18n="botPause">Pause</span>
                    </button>
                    <button class="btn-bot danger" onclick="botKillSwitch()">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18.36 6.64A9 9 0 1 1 5.64 6.64"/><path d="M12 2v10"/></svg>
                        <span data-i18n="botKill">Close all</span>
                    </button>
                </div>
            </div>

            <!-- ============ KPI TILES ============ -->
            <div class="bot-kpis">
                <div class="bot-kpi">
                    <div class="kpi-label" data-i18n="kpiNetPnl">Net P&amp;L</div>
                    <div class="kpi-val up" id="kpiPnl">+$0.00</div>
                    <div class="kpi-sub" id="kpiPnlSub">—</div>
                    <div class="kpi-spark"><span id="kpiPnlBar" style="width:0%"></span></div>
                </div>
                <div class="bot-kpi">
                    <div class="kpi-label" data-i18n="kpiWinRate">Win rate</div>
                    <div class="kpi-val" id="kpiWin">0%</div>
                    <div class="kpi-sub" id="kpiWinSub">0 W / 0 L</div>
                    <div class="kpi-spark"><span id="kpiWinBar" style="width:0%"></span></div>
                </div>
                <div class="bot-kpi">
                    <div class="kpi-label" data-i18n="kpiTrades">Trades today</div>
                    <div class="kpi-val" id="kpiTrades">0</div>
                    <div class="kpi-sub" id="kpiTradesSub" data-i18n="kpiOpenNow">0 open now</div>
                    <div class="kpi-spark"><span id="kpiTradesBar" style="width:0%"></span></div>
                </div>
                <div class="bot-kpi">
                    <div class="kpi-label" data-i18n="kpiDrawdown">Current drawdown</div>
                    <div class="kpi-val down" id="kpiDd">0.00%</div>
                    <div class="kpi-sub" id="kpiDdSub">—</div>
                    <div class="kpi-spark"><span id="kpiDdBar" style="width:0%"></span></div>
                </div>
                <div class="bot-kpi">
                    <div class="kpi-label" data-i18n="kpiSharpe">Sharpe ratio</div>
                    <div class="kpi-val" id="kpiSharpe">0.00</div>
                    <div class="kpi-sub" data-i18n="kpiRolling">30-day rolling</div>
                    <div class="kpi-spark"><span id="kpiSharpeBar" style="width:0%"></span></div>
                </div>
            </div>

            <!-- ============ MAIN GRID ============ -->
            <div class="bot-grid">
                <div class="bot-col">

                    <!-- EQUITY CURVE -->
                    <div class="bot-card">
                        <div class="bot-card-head">
                            <div class="bot-card-title">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/></svg>
                                <span data-i18n="botEquity">Equity curve</span>
                            </div>
                            <div class="eq-range">
                                <button onclick="setBotRange('1D', this)">1D</button>
                                <button class="active" onclick="setBotRange('1W', this)">1W</button>
                                <button onclick="setBotRange('1M', this)">1M</button>
                                <button onclick="setBotRange('ALL', this)">ALL</button>
                            </div>
                        </div>
                        <div class="equity-wrap"><canvas id="botEquityChart"></canvas></div>
                        <div class="equity-legend">
                            <span><span data-i18n="botStartingCap">Starting capital</span> <b id="eqStart">—</b></span>
                            <span><span data-i18n="botCurrentEquity">Current equity</span> <b id="eqNow">—</b></span>
                            <span><span data-i18n="botPeak">Peak</span> <b id="eqPeak">—</b></span>
                            <span><span data-i18n="botMaxDd">Max drawdown</span> <b id="eqMaxDd">0.00%</b></span>
                        </div>
                    </div>

                    <!-- EXECUTION TERMINAL -->
                    <div class="bot-card term-card">
                        <div class="bot-card-head">
                            <div class="bot-card-title">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 9l3 3-3 3M12 15h5"/></svg>
                                <span data-i18n="botTerminal">Execution terminal</span>
                            </div>
                            <div class="term-tools">
                                <span class="term-speed-lbl" data-i18n="botSpeed">Speed</span>
                                <div class="speed-group">
                                    <button class="speed-btn" onclick="setBotSpeed(0.5, this)">0.5&times;</button>
                                    <button class="speed-btn active" onclick="setBotSpeed(1, this)">1&times;</button>
                                    <button class="speed-btn" onclick="setBotSpeed(2, this)">2&times;</button>
                                </div>
                                <span class="term-badge" id="termCount">0</span>
                                <button class="term-btn" onclick="clearTerminal()" data-i18n="btnClear">Clear</button>
                            </div>
                        </div>
                        <div class="terminal" id="botTerm"></div>
                        <div class="term-foot" data-i18n="termFoot">Every line is a real step in the execution path: signal → risk check → currency conversion → order → fill → protection → exit → settlement.</div>
                    </div>

                    <!-- OPEN POSITIONS -->
                    <div class="bot-card">
                        <div class="bot-card-head">
                            <div class="bot-card-title">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16"/></svg>
                                <span data-i18n="botOpenPositions">Open positions</span>
                            </div>
                            <span class="bot-card-hint" id="posCount">0 <span data-i18n="botActive">active</span></span>
                        </div>
                        <div class="pos-table-wrap">
                            <table class="pos-table">
                                <thead>
                                    <tr>
                                        <th data-i18n="colSymbol">Symbol</th>
                                        <th data-i18n="botSide">Side</th>
                                        <th data-i18n="botEntry">Entry</th>
                                        <th data-i18n="botMark">Mark</th>
                                        <th data-i18n="botSize">Size</th>
                                        <th>SL / TP</th>
                                        <th data-i18n="botUnrealized">Unrealised</th>
                                    </tr>
                                </thead>
                                <tbody id="botPositions"></tbody>
                            </table>
                        </div>
                    </div>

                    <!-- BACKTEST -->
                    <div class="bot-card">
                        <div class="bot-card-head">
                            <div class="bot-card-title">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></svg>
                                <span data-i18n="botBacktest">Strategy backtest</span>
                            </div>
                            <span class="bot-card-hint" id="btWindow">— · 4h candles</span>
                        </div>
                        <div class="bt-grid">
                            <div class="bt-cell"><div class="bt-lbl" data-i18n="btReturn">Total return</div><div class="bt-val up" id="btReturn">+0%</div></div>
                            <div class="bt-cell"><div class="bt-lbl" data-i18n="btCagr">CAGR</div><div class="bt-val up" id="btCagr">+0%</div></div>
                            <div class="bt-cell"><div class="bt-lbl" data-i18n="btMaxDd">Max drawdown</div><div class="bt-val down" id="btMaxDd">0%</div></div>
                            <div class="bt-cell"><div class="bt-lbl" data-i18n="btProfitFactor">Profit factor</div><div class="bt-val" id="btPf">0.00</div></div>
                            <div class="bt-cell"><div class="bt-lbl" data-i18n="btTrades">Trades</div><div class="bt-val" id="btTrades">0</div></div>
                            <div class="bt-cell"><div class="bt-lbl" data-i18n="btAvgHold">Avg. hold</div><div class="bt-val" id="btHold">0h</div></div>
                        </div>
                        <div class="bot-disclosure" style="margin-top:16px;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>
                            <div>
                                <strong data-i18n="botBtWarnTitle">Backtested results are hypothetical</strong>
                                <span data-i18n="botBtWarnBody">These figures are produced by running the strategy over historical data. They do not represent actual trading and are not a reliable indicator of future results. Live performance will differ because of slippage, spread, funding costs and market conditions that did not exist in the sample.</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- ============ RIGHT: CONFIGURATION ============ -->
                <div class="bot-col">

                    <div class="bot-card">
                        <div class="bot-card-head">
                            <div class="bot-card-title">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3 3-3 3-3-3 3-3zM12 16l3 3-3 3-3-3 3-3zM2 12l3-3 3 3-3 3-3-3zM16 12l3-3 3 3-3 3-3-3z"/></svg>
                                <span data-i18n="botStrategy">Strategy</span>
                            </div>
                        </div>
                        <div class="strat-list" id="stratList"></div>
                    </div>

                    <div class="bot-card">
                        <div class="bot-card-head">
                            <div class="bot-card-title">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                                <span data-i18n="botRisk">Risk controls</span>
                            </div>
                        </div>

                        <div class="cfg-row">
                            <div class="cfg-head">
                                <span class="cfg-label" data-i18n="cfgRiskPerTrade">Risk per trade</span>
                                <span class="cfg-value" id="cfgRiskVal">1.0%</span>
                            </div>
                            <input type="range" class="cfg-slider" id="cfgRisk" min="0.1" max="5" step="0.1" value="1"
                                   oninput="updateBotConfig('risk', this.value)">
                            <div class="cfg-scale"><span>0.1%</span><span>5%</span></div>
                            <div class="cfg-note" id="cfgRiskNote">—</div>
                        </div>

                        <div class="cfg-row">
                            <div class="cfg-head">
                                <span class="cfg-label" data-i18n="cfgMaxDd">Max drawdown stop</span>
                                <span class="cfg-value" id="cfgDdVal">10%</span>
                            </div>
                            <input type="range" class="cfg-slider" id="cfgDd" min="2" max="40" step="1" value="10"
                                   oninput="updateBotConfig('dd', this.value)">
                            <div class="cfg-scale"><span>2%</span><span>40%</span></div>
                            <div class="cfg-note" data-i18n="cfgDdNote">The bot halts and flattens every position if account equity falls this far below its peak.</div>
                        </div>

                        <div class="cfg-row">
                            <div class="cfg-head">
                                <span class="cfg-label" data-i18n="cfgMaxPos">Max concurrent positions</span>
                                <span class="cfg-value" id="cfgPosVal">4</span>
                            </div>
                            <input type="range" class="cfg-slider" id="cfgPos" min="1" max="12" step="1" value="4"
                                   oninput="updateBotConfig('pos', this.value)">
                            <div class="cfg-scale"><span>1</span><span>12</span></div>
                        </div>

                        <div class="cfg-row" style="margin-bottom:6px;">
                            <div class="cfg-head">
                                <span class="cfg-label" data-i18n="cfgLeverage">Leverage cap</span>
                                <span class="cfg-value" id="cfgLevVal">3×</span>
                            </div>
                            <input type="range" class="cfg-slider" id="cfgLev" min="1" max="20" step="1" value="3"
                                   oninput="updateBotConfig('lev', this.value)">
                            <div class="cfg-scale"><span>1×</span><span>20×</span></div>
                            <div class="cfg-note" id="cfgLevNote">—</div>
                        </div>
                    </div>

                    <div class="bot-card">
                        <div class="bot-card-head">
                            <div class="bot-card-title">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6h.09A1.65 1.65 0 0 0 10 3.09V3a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                                <span data-i18n="botExecution">Execution rules</span>
                            </div>
                        </div>

                        <div class="tog-row">
                            <div class="tog-text">
                                <div class="tog-name" data-i18n="togStop">Hard stop-loss</div>
                                <div class="tog-desc" data-i18n="togStopDesc">Every position carries a broker-side stop</div>
                            </div>
                            <div class="tog on" id="togStop" onclick="toggleBotRule('stop', this)"></div>
                        </div>
                        <div class="tog-row">
                            <div class="tog-text">
                                <div class="tog-name" data-i18n="togTrail">Trailing take-profit</div>
                                <div class="tog-desc" data-i18n="togTrailDesc">Locks gains as price moves in your favour</div>
                            </div>
                            <div class="tog on" id="togTrail" onclick="toggleBotRule('trail', this)"></div>
                        </div>
                        <div class="tog-row">
                            <div class="tog-text">
                                <div class="tog-name" data-i18n="togNews">Pause on high-impact news</div>
                                <div class="tog-desc" data-i18n="togNewsDesc">Stands aside around CPI, FOMC and NFP</div>
                            </div>
                            <div class="tog on" id="togNews" onclick="toggleBotRule('news', this)"></div>
                        </div>
                        <div class="tog-row">
                            <div class="tog-text">
                                <div class="tog-name" data-i18n="togWeekend">Weekend flat</div>
                                <div class="tog-desc" data-i18n="togWeekendDesc">Closes everything before the Friday session end</div>
                            </div>
                            <div class="tog" id="togWeekend" onclick="toggleBotRule('weekend', this)"></div>
                        </div>
                        <div class="tog-row">
                            <div class="tog-text">
                                <div class="tog-name" data-i18n="togMartingale">Recovery averaging</div>
                                <div class="tog-desc" data-i18n="togMartingaleDesc">Adds to losing positions — raises risk sharply</div>
                            </div>
                            <div class="tog" id="togMartingale" onclick="toggleBotRule('martingale', this)"></div>
                        </div>
                    </div>

                    <div class="bot-card">
                        <div class="bot-card-head">
                            <div class="bot-card-title">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18z"/></svg>
                                <span data-i18n="botPairs">Trading pairs</span>
                            </div>
                            <span class="bot-card-hint" id="pairCount">0</span>
                        </div>
                        <div class="pair-cloud" id="pairCloud"></div>
                    </div>

                    <div class="bot-card">
                        <div class="bot-card-head">
                            <div class="bot-card-title">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16v16H4z"/><path d="M8 9h8M8 13h5"/></svg>
                                <span data-i18n="botActivity">Live activity</span>
                            </div>
                            <span class="bot-card-hint" id="logCount">0</span>
                        </div>
                        <div class="bot-log" id="botLog"></div>
                    </div>
                </div>
            </div>

            <div class="bot-disclosure">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>
                <div>
                    <strong data-i18n="botRiskTitle">Automation reduces risk — it does not remove it</strong>
                    <span data-i18n="botRiskBody">ProTrader Bot enforces your stop-loss, position sizing and drawdown ceiling on every trade, which limits how much any single position can cost you. It cannot prevent losses. Gaps, slippage, exchange outages and sudden volatility can still move a position past its stop. Never allocate capital you cannot afford to lose, and review your configuration regularly.</span>
                </div>
            </div>
        </div>
    `

};

// The SPA router looks views up by their nav id, which is kebab-case.
viewsContainer['payment-details'] = viewsContainer.paymentDetails;
viewsContainer['transaction-history'] = viewsContainer.transactionHistory;
