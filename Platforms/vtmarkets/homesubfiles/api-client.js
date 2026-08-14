// -------------------------------------------------------------
// VT MARKETS — FRONTEND API CLIENT + HYDRATION
//
// Connects the static frontend to the real backend (vtmarkets/server).
// Replaces the previously hardcoded balances / KYC / transactions / profile
// with live data for the signed-in user. Loaded AFTER app.js so it can wrap
// switchPageView() and hydrate each view as it is injected.
//
// API base resolution (first match wins):
//   1) window.VT_API_BASE
//   2) localStorage 'vt_api_base'
//   3) <meta name="vt-api-base" content="...">
//   4) default http://localhost:4000
// This keeps the frontend independent of where the backend is hosted.
// -------------------------------------------------------------
(function () {
  'use strict';

  function resolveApiBase() {
    if (window.VT_API_BASE) return window.VT_API_BASE;
    try { var ls = localStorage.getItem('vt_api_base'); if (ls) return ls; } catch (e) {}
    var meta = document.querySelector('meta[name="vt-api-base"]');
    if (meta && meta.content) return meta.content;
    return 'http://localhost:4000';
  }

  var API_BASE = resolveApiBase();
  var TOKEN_KEY = 'vt_token';

  // ---------------- session ----------------
  var VTAuth = {
    getToken: function () { try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; } },
    setToken: function (t) { try { localStorage.setItem(TOKEN_KEY, t); } catch (e) {} },
    clear: function () { try { localStorage.removeItem(TOKEN_KEY); } catch (e) {} },
    isAuthed: function () { return !!VTAuth.getToken(); },

    login: function (email, password) {
      return VTApi.post('/api/auth/login', { email: email, password: password }, false)
        .then(function (res) { VTAuth.setToken(res.token); return res; });
    },
    logout: function () {
      return VTApi.post('/api/auth/logout', {}, true)
        .catch(function () {})
        .then(function () { VTAuth.clear(); window.location.href = 'login.html'; });
    },
    // Redirect to login if not authenticated. Returns true if authed.
    requireAuth: function () {
      if (!VTAuth.isAuthed()) { window.location.replace('login.html'); return false; }
      return true;
    },
  };

  // ---------------- fetch wrapper ----------------
  var VTApi = {
    request: function (method, path, body, auth) {
      var headers = { 'Content-Type': 'application/json' };
      if (auth !== false) {
        var t = VTAuth.getToken();
        if (t) headers.Authorization = 'Bearer ' + t;
      }
      return fetch(API_BASE + path, {
        method: method,
        headers: headers,
        body: body ? JSON.stringify(body) : undefined,
      }).then(function (r) {
        if (r.status === 401) {
          // Session expired / invalid — bounce to login (except on login page).
          VTAuth.clear();
          if (!/login\.html$/.test(location.pathname)) window.location.replace('login.html');
        }
        return r.json().catch(function () { return {}; }).then(function (data) {
          if (!r.ok) {
            var err = new Error((data.error && data.error.message) || ('HTTP ' + r.status));
            err.status = r.status; err.data = data;
            throw err;
          }
          return data;
        });
      });
    },
    get: function (p, auth) { return VTApi.request('GET', p, null, auth); },
    post: function (p, b, auth) { return VTApi.request('POST', p, b, auth); },
  };

  // ---------------- live data cache ----------------
  var VTData = { user: null, balances: null, transactions: null, positions: null, kyc: null };

  function loadAll() {
    return Promise.all([
      VTApi.get('/api/auth/me'),
      VTApi.get('/api/me/balances'),
      VTApi.get('/api/me/transactions?limit=100'),
      VTApi.get('/api/me/positions'),
      VTApi.get('/api/me/kyc'),
    ]).then(function (r) {
      VTData.user = r[0].user;
      VTData.balances = r[1];
      VTData.transactions = r[2].transactions || [];
      VTData.positions = r[3].positions || [];
      VTData.kyc = r[4].kyc;
      return VTData;
    });
  }

  // ---------------- formatting ----------------
  function money(v, cur) {
    return '$' + Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + (cur || 'USD');
  }
  function initials(u) {
    if (!u) return '–';
    var a = (u.first_name || '').charAt(0), b = (u.last_name || '').charAt(0);
    return (a + b).toUpperCase() || (u.email || '?').charAt(0).toUpperCase();
  }
  function setAll(sel, text) {
    document.querySelectorAll(sel).forEach(function (el) { el.textContent = text; });
  }
  function setValueAll(sel, val) {
    document.querySelectorAll(sel).forEach(function (el) { if (!el.value) el.value = val; });
  }
  // Everything rendered via innerHTML below comes from the API; escape it anyway
  // so a name or reference containing markup can never inject into the page.
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmtDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    var p = function (n) { return String(n).padStart(2, '0'); };
    return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  // ---------------- hydration ----------------
  var VTHydrate = {
    // The persistent shell (nav balance, profile card) — present on every page.
    shell: function () {
      var d = VTData;
      if (d.balances && typeof window.setAccountBalance === 'function') {
        window.setAccountBalance(d.balances.summary.total_balance);
        window.accountCurrency = d.balances.summary.currency || 'USD';
        if (typeof window.renderBalance === 'function') window.renderBalance();
      }
      if (d.user) {
        var name = d.user.full_name || d.user.email;
        setAll('.user-card-name', name);
        setAll('.user-card-uid', 'UID: ' + d.user.id.slice(0, 8).toUpperCase());
        setAll('.user-card-email', d.user.email || '—');
        setAll('.user-card-initials', initials(d.user));
        setAll('.user-card-joined', d.user.created_at ? 'Member since ' + fmtDate(d.user.created_at).slice(0, 10) : '');
        // Prefill (not hardcode) the payout forms with the account holder's own details.
        setValueAll('.user-card-fullname-input', d.user.full_name || '');
        setValueAll('.user-card-email-input', d.user.email || '');
      }
      VTHydrate.notifications();
      VTHydrate.quickTrade();
    },

    // Notifications are derived from the user's own real state — KYC and recent
    // transactions. There is no notifications table, so nothing is invented.
    notifications: function () {
      var list = document.getElementById('notifList');
      if (!list) return;
      var items = [];
      var k = VTData.kyc;
      if (k && k.status !== 'verified') {
        items.push({
          icon: '🛡️', bg: '#eff6ff', fg: '#2563eb',
          title: k.status === 'pending' ? 'Identity verification in review' : 'Identity verification required',
          desc: k.status === 'pending'
            ? 'We are reviewing the documents you submitted.'
            : 'Verify your identity to raise your limits and enable withdrawals.',
          time: '',
        });
      }
      (VTData.transactions || []).slice(0, 5).forEach(function (t) {
        items.push({
          icon: t.type === 'deposit' ? '↓' : '↑',
          bg: t.type === 'deposit' ? '#dcfce7' : '#fee2e2',
          fg: t.type === 'deposit' ? '#15803d' : '#b91c1c',
          title: t.type.charAt(0).toUpperCase() + t.type.slice(1) + ' ' + money(t.amount, t.currency),
          desc: 'Status: ' + t.status,
          time: fmtDate(t.created_at),
        });
      });

      if (!items.length) {
        list.innerHTML = '<div class="notif-item" style="color:var(--text-muted);font-size:12px;">No notifications yet.</div>';
      } else {
        list.innerHTML = items.map(function (n) {
          return '<div class="notif-item unread">' +
            '<div class="notif-badge-icon" style="background:' + n.bg + '; color:' + n.fg + '">' + n.icon + '</div>' +
            '<div><div class="notif-content-title">' + esc(n.title) + '</div>' +
            '<div class="notif-content-desc">' + esc(n.desc) + '</div>' +
            '<div class="notif-time">' + esc(n.time) + '</div></div></div>';
        }).join('');
      }

      var badge = document.getElementById('notifCountBadge');
      if (badge) badge.textContent = String(items.length);
      var dot = document.getElementById('notifDot');
      if (dot) dot.style.display = items.length ? '' : 'none';
    },

    // The quick-trade panel advertised a fabricated "Max: 10.0 BTC" and a
    // prefilled price. Both now derive from the real spot balance + live price.
    quickTrade: function () {
      var maxEl = document.getElementById('orderMaxQty');
      if (!maxEl) return;
      var spot = 0;
      if (VTData.balances) {
        VTData.balances.accounts.forEach(function (a) { if (a.type === 'spot') spot = Number(a.balance) || 0; });
      }
      // Read the live price straight off the chart's own ticker element.
      var priceEl = document.getElementById('livePrice');
      var px = priceEl ? Number(priceEl.textContent.replace(/[^0-9.]/g, '')) || 0 : 0;
      maxEl.textContent = px > 0
        ? 'Max: ' + (spot / px).toFixed(6) + ' BTC'
        : 'Max: ' + money(spot, (VTData.balances && VTData.balances.summary.currency) || 'USD');
    },

    // Called after switchPageView injects viewsContainer[viewId].
    view: function (viewId) {
      var root = document.getElementById('view-' + viewId);
      if (!root) return;
      if (viewId === 'account') VTHydrate.account(root);
      if (viewId === 'transaction-history' || viewId === 'transactionHistory') VTHydrate.txHistory(root);
      if (viewId === 'withdraw') VTHydrate.withdrawAvail(root);
      if (viewId === 'deposit') VTHydrate.recentDeposits(root);
      // Identity hooks appear inside injected templates too, not just the shell.
      VTHydrate.shell();
    },

    account: function (root) {
      var d = VTData;
      if (!d.user) return;
      var nameEl = root.querySelector('.account-user-info span');
      if (nameEl) nameEl.textContent = d.user.full_name || d.user.email;
      var avatar = root.querySelector('.user-big-avatar');
      if (avatar) avatar.textContent = initials(d.user);

      // KYC badge — real status, no fabricated "Verified Tier 2".
      var kycBadge = root.querySelector('.kyc-badge');
      if (kycBadge && d.kyc) {
        if (d.kyc.status === 'verified') kycBadge.textContent = '✓ Verified KYC Tier ' + d.kyc.level;
        else if (d.kyc.status === 'pending') kycBadge.textContent = '⧗ KYC pending';
        else if (d.kyc.status === 'rejected') kycBadge.textContent = '✕ KYC rejected';
        else kycBadge.textContent = 'KYC not started';
      }

      // Sub-balance cards: map by title, fall back to order.
      if (d.balances) {
        var byType = {};
        d.balances.accounts.forEach(function (a) { byType[a.type] = a.balance; });
        var pnl = (d.positions || []).reduce(function (s, p) { return s + (p.pnl || 0); }, 0);
        root.querySelectorAll('.sub-balance-card').forEach(function (card) {
          var title = (card.querySelector('.sub-balance-title') || {}).textContent || '';
          var val = card.querySelector('.sub-balance-val');
          if (!val) return;
          var t = title.toLowerCase();
          if (t.indexOf('spot') > -1) val.textContent = money(byType.spot || 0, d.balances.summary.currency);
          else if (t.indexOf('futures') > -1 || t.indexOf('margin') > -1) val.textContent = money(byType.futures || 0, d.balances.summary.currency);
          else if (t.indexOf('funding') > -1) val.textContent = money(byType.funding || 0, d.balances.summary.currency);
          else if (t.indexOf('pnl') > -1 || t.indexOf('unrealized') > -1) val.textContent = (pnl >= 0 ? '+' : '') + money(pnl, d.balances.summary.currency);
        });
      }

      VTHydrate.holdings(root);
    },

    // Holdings table: one row per real account. The template previously shipped
    // six invented positions (BTC/USDT/ETH/SOL/BNB/XRP) that every new user saw.
    holdings: function (root) {
      var tbody = (root || document).querySelector('#holdingsTableBody');
      if (!tbody) return;
      var d = VTData;
      var accounts = (d.balances && d.balances.accounts) || [];
      var total = accounts.reduce(function (s, a) { return s + (Number(a.balance) || 0); }, 0);

      if (!accounts.length || total <= 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px;">' +
          'No holdings yet. Deposit funds to get started.</td></tr>';
        return;
      }

      tbody.innerHTML = accounts.map(function (a) {
        var bal = Number(a.balance) || 0;
        var pct = total > 0 ? (bal / total) * 100 : 0;
        return '<tr>' +
          '<td><div class="market-symbol"><div class="symbol-flag-box" style="background:#2563eb;">' +
            esc(a.currency.charAt(0)) + '</div><div><div style="font-weight:700;text-transform:capitalize;">' +
            esc(a.type) + '</div><div style="font-size:10px; color:var(--text-muted);">' + esc(a.currency) + '</div></div></div></td>' +
          '<td style="font-family:\'JetBrains Mono\',monospace; font-weight:700;">' + esc(money(bal, a.currency)) + '</td>' +
          '<td style="font-size:11px; color:var(--text-muted);">' + esc(money(bal, a.currency)) + '</td>' +
          '<td style="font-family:\'JetBrains Mono\',monospace;">—</td>' +
          '<td style="font-family:\'JetBrains Mono\',monospace; font-weight:800; color:var(--primary-blue);">' + esc(money(bal, a.currency)) + '</td>' +
          '<td><div class="portfolio-alloc-wrap"><div class="portfolio-alloc-bar">' +
            '<div class="portfolio-alloc-fill" style="width:' + pct.toFixed(1) + '%; background:#2563eb;"></div></div>' +
            '<span style="font-size:11px; font-weight:700;">' + pct.toFixed(1) + '%</span></div></td>' +
          '<td><div style="display:flex; gap:6px;">' +
            '<button class="btn-trade-row" onclick="switchPageView(\'deposit\')">Deposit</button></div></td>' +
          '</tr>';
      }).join('');
    },

    // Deposits / withdrawals / net over the last 30 days — the tiles previously
    // showed fixed figures ($12,480 / $3,215.40 / +$9,264.60) for every user.
    txTiles: function (root) {
      var cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      var cur = (VTData.balances && VTData.balances.summary.currency) || 'USD';
      var dep = 0, wd = 0;
      (VTData.transactions || []).forEach(function (t) {
        if (new Date(t.created_at).getTime() < cutoff) return;
        if (t.type === 'deposit') dep += Number(t.amount) || 0;
        if (t.type === 'withdrawal') wd += Number(t.amount) || 0;
      });
      var set = function (id, v, signed) {
        var el = (root || document).querySelector('#' + id);
        if (el) el.textContent = (signed && v >= 0 ? '+' : '') + money(v, cur);
      };
      set('txTileDeposits', dep);
      set('txTileWithdrawals', wd);
      set('txTileNet', dep - wd, true);
    },

    // Withdrawable amount — was a fixed "85,420.00 USDT" for everyone.
    withdrawAvail: function (root) {
      var scope = root || document;
      var el = scope.querySelector('#withdrawAvailVal');
      if (el && VTData.balances) {
        el.textContent = money(VTData.balances.summary.total_balance, VTData.balances.summary.currency);
        var qty = scope.querySelector('#withdrawAssetQty');
        if (qty) qty.textContent = Number(VTData.balances.summary.total_balance || 0).toFixed(2);
      }
      // The pre-withdrawal checklist claimed "Identity verification: Verified"
      // unconditionally. Show the account's actual KYC state.
      var k = VTData.kyc;
      scope.querySelectorAll('.kyc-state').forEach(function (n) {
        n.textContent = k ? k.status : '–';
        n.className = 'sec-state' + (k && k.status === 'verified' ? '' : ' pending');
      });
      scope.querySelectorAll('.kyc-tick').forEach(function (n) {
        n.textContent = k && k.status === 'verified' ? '✓' : '⧗';
        n.className = 'sec-tick' + (k && k.status === 'verified' ? '' : ' pending');
      });
    },

    // "Recent deposits" shipped three invented rows (+500 USDT, +0.25 BTC, +1.4 ETH).
    recentDeposits: function (root) {
      var list = (root || document).querySelector('#recentDepositsList');
      if (!list) return;
      var rows = (VTData.transactions || []).filter(function (t) { return t.type === 'deposit'; }).slice(0, 3);
      if (!rows.length) {
        list.innerHTML = '<div class="sec-row" style="color:var(--text-muted);">No deposits yet.</div>';
        return;
      }
      list.innerHTML = rows.map(function (t) {
        var done = t.status === 'completed';
        return '<div class="sec-row">' +
          '<span class="sec-tick' + (done ? '' : ' pending') + '">' + (done ? '✓' : '⧗') + '</span>' +
          '<span>+' + esc(money(t.amount, t.currency)) + ' · ' + esc(t.method || '—') + '</span>' +
          '<span class="sec-state' + (done ? '' : ' pending') + '">' +
            esc(done ? fmtDate(t.created_at).slice(0, 10) : t.status) + '</span>' +
          '</div>';
      }).join('');
    },

    txHistory: function (root) {
      VTHydrate.txTiles(root);
      var tbody = root.querySelector('#txHistoryTableBody');
      if (!tbody || !VTData.transactions) return;
      if (!VTData.transactions.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:24px;">No transactions yet</td></tr>';
        return;
      }
      tbody.innerHTML = VTData.transactions.map(function (t) {
        var inc = t.type === 'deposit';
        var pill = inc ? 'pos' : 'neg';
        var amt = (inc ? '+' : '−') + Number(t.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        var statusClass = 'tx-status-' + t.status;
        return '<tr>' +
          '<td><span class="tx-hash">' + (t.reference || t.id.slice(0, 8)) + '…</span></td>' +
          '<td><span class="change-pill ' + pill + '">' + t.type + '</span></td>' +
          '<td><div class="tx-asset">' + (t.asset || 'USD') + '</div></td>' +
          '<td><span class="tx-amount ' + (inc ? 'in' : 'out') + '">' + amt + '</span></td>' +
          '<td style="font-family:monospace;color:var(--text-muted);">0.00</td>' +
          '<td><span class="tx-status-pill ' + statusClass + '">' + t.status + '</span></td>' +
          '<td style="color:var(--text-muted);font-size:11px;">' + fmtDate(t.created_at) + '</td>' +
          '<td><span class="tx-explorer" style="opacity:.5">—</span></td>' +
          '</tr>';
      }).join('');
    },
  };

  // ---------------- wire deposit/withdraw actions ----------------
  // Expose helpers the views can call to create real transactions.
  window.VTActions = {
    deposit: function (amount, method) {
      return VTApi.post('/api/me/deposit', { amount: Number(amount), method: method || 'card' }, true)
        .then(function (r) { return refreshFinancials().then(function () { return r; }); });
    },
    withdraw: function (amount, method, destination) {
      return VTApi.post('/api/me/withdraw', { amount: Number(amount), method: method || 'bank', destination: destination }, true)
        .then(function (r) { return refreshFinancials().then(function () { return r; }); });
    },
  };

  function refreshFinancials() {
    return Promise.all([
      VTApi.get('/api/me/balances'),
      VTApi.get('/api/me/transactions?limit=100'),
    ]).then(function (r) {
      VTData.balances = r[0];
      VTData.transactions = r[1].transactions || [];
      VTHydrate.shell();
    });
  }

  // ---------------- boot on home page ----------------
  function bootHome() {
    if (!VTAuth.requireAuth()) return;
    loadAll().then(function () {
      // An admin set a temporary password — force the user to choose their own.
      if (VTData.user && VTData.user.must_change_password) {
        window.location.replace('change-password.html?forced=1');
        return;
      }
      VTHydrate.shell();
      // hydrate the currently active view (default dashboard needs no template)
      var active = document.querySelector('.page-view.active');
      if (active && active.id) VTHydrate.view(active.id.replace('view-', ''));
    }).catch(function (e) {
      console.error('[api-client] failed to load account data', e);
    });

    // Wrap switchPageView so every injected view gets hydrated.
    if (typeof window.switchPageView === 'function' && !window.switchPageView.__vtWrapped) {
      var orig = window.switchPageView;
      window.switchPageView = function (viewId, el) {
        var out = orig.apply(this, arguments);
        try { VTHydrate.view(viewId); } catch (e) {}
        return out;
      };
      window.switchPageView.__vtWrapped = true;
    }
  }

  // Expose for other scripts / login page.
  window.VTAuth = VTAuth;
  window.VTApi = VTApi;

  // Handler for the Log Out menu item. Kept here (not inline in the page) so the
  // link still degrades to a plain navigation if this script fails to load.
  window.vtLogout = function (event) {
    if (event) event.preventDefault();
    VTAuth.logout();
    return false;
  };
  window.VTData = VTData;
  window.VTHydrate = VTHydrate;

  // Only auto-boot the account experience on home.html.
  if (/home\.html$/.test(location.pathname) || document.getElementById('navBalanceVal')) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bootHome);
    } else {
      bootHome();
    }
  }
})();
