/* Membership page: cost calculator, join form, USDT payment screen, transaction ID box.
   Talks to the Google Apps Script web app (SHEET_URL in js/config.js). */
(function () {
  'use strict';

  var form = document.getElementById('joinForm');
  if (!form) return;

  var $ = function (id) { return document.getElementById(id); };
  PF.hydrateIcons();   // icons inside buttons must exist before we remember the button text
  var DRAFT_KEY = 'pf_join_draft_v1';
  var PAY_KEY = 'pf_payment_v1';
  var FIELDS = ['fullName', 'phone', 'gender', 'trainerPref', 'months', 'startDate', 'consent'];

  /* =====================================================================
     1. Live price of USDT in PKR (CoinGecko), with a safe fallback
     ===================================================================== */
  var rate = { value: FALLBACK_RATE_PKR, live: false };
  var ratePromise = null;

  function loadRate() {
    if (ratePromise) return ratePromise;
    ratePromise = new Promise(function (resolve) {
      var ctrl = window.AbortController ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctrl) ctrl.abort(); resolve(rate); }, 6000);
      fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=pkr', { signal: ctrl ? ctrl.signal : undefined })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (j) {
          var v = j && j.tether && Number(j.tether.pkr);
          if (v >= 100 && v <= 1000) { rate = { value: v, live: true }; }   // ignore silly numbers
        })
        .catch(function () { /* keep the fallback rate */ })
        .then(function () { clearTimeout(timer); resolve(rate); });
    });
    return ratePromise;
  }

  /** Total PKR / rate, rounded UP to 2 decimals. In test mode it is always exactly 1.00. */
  function usdtFor(totalPkr, r) {
    if (TEST_MODE) return 1;
    var x = totalPkr / r;
    return Math.ceil(Number((x * 100).toFixed(6))) / 100;
  }
  function totalFor(months) { return ADMISSION_FEE_PKR + months * MONTHLY_FEE_PKR; }
  function fmtUsdt(n) { return n.toFixed(2); }

  /* =====================================================================
     2. Cost calculator
     ===================================================================== */
  function selectedMonths() {
    var c = form.querySelector('input[name="months"]:checked');
    return c ? parseInt(c.value, 10) : 0;
  }

  function paintCost() {
    var m = selectedMonths();
    var live = rate.live ? 'Live rate' : 'Estimated rate';
    $('rateNote').textContent = live + ': 1 USDT = Rs ' + rate.value.toLocaleString('en-US', { maximumFractionDigits: 2 });
    if (!m) {
      $('costLine').textContent = 'Choose how many months to see your total.';
      $('costTotal').textContent = '-';
      $('costUsdt').textContent = '-';
      $('recap').textContent = 'Pick a plan above to see your total.';
      return;
    }
    var total = totalFor(m);
    var approx = Math.ceil(Number((total / rate.value * 100).toFixed(6))) / 100;
    $('costLine').textContent = PF.fmtPKR(ADMISSION_FEE_PKR) + ' + ' + m + ' x ' + PF.fmtPKR(MONTHLY_FEE_PKR);
    $('costTotal').textContent = PF.fmtPKR(total);
    $('costUsdt').textContent = '≈ ' + fmtUsdt(approx) + ' USDT';
    $('recap').textContent = m + (m === 1 ? ' month' : ' months') + ': ' + PF.fmtPKR(total) + ' (≈ ' + fmtUsdt(approx) + ' USDT)';
    $('testNote').hidden = !TEST_MODE;
  }

  form.querySelectorAll('input[name="months"]').forEach(function (r) {
    r.addEventListener('change', paintCost);
  });

  /* =====================================================================
     3. Form: validation, phone format, saved progress
     ===================================================================== */
  var todayISO = PF.pkNow().iso;
  var startInput = $('startDate');
  startInput.min = todayISO;
  startInput.max = PF.addDaysISO(todayISO, 90);

  function normPhone(v) {
    var d = String(v).replace(/\D/g, '');
    if (d.indexOf('92') === 0 && d.length >= 12) d = '0' + d.slice(2);   // +92 300 1234567
    d = d.slice(0, 11);
    return d.length > 4 ? d.slice(0, 4) + '-' + d.slice(4) : d;
  }

  var RULES = {
    fullName: function (v) {
      v = v.trim().replace(/\s+/g, ' ');
      if (v.length < 3) return 'Please tell us your full name (at least 3 letters).';
      if (!/^[\p{L}][\p{L} .'\-]{2,59}$/u.test(v)) return 'Please use letters only in your name.';
      return '';
    },
    phone: function (v) {
      return /^03\d{2}-\d{7}$/.test(v) ? '' : 'Please type your mobile number like 0300-1234567.';
    },
    gender: function () {
      return form.querySelector('input[name="gender"]:checked') ? '' : 'Please choose Female or Male.';
    },
    trainerPref: function () {
      return form.querySelector('input[name="trainerPref"]:checked') ? '' : 'Please choose a female or male trainer.';
    },
    months: function () {
      return selectedMonths() ? '' : 'Please choose how many months you want.';
    },
    startDate: function (v) {
      if (!v) return 'Please pick the day you want to start.';
      if (v < todayISO) return 'That day has already passed. Please pick today or a later day.';
      if (v > startInput.max) return 'That is too far away. Please pick a day within the next 90 days.';
      return '';
    },
    consent: function () {
      return $('consent').checked ? '' : 'Please tick the box so we are allowed to contact you.';
    }
  };

  function fieldValue(name) {
    if (name === 'gender' || name === 'trainerPref' || name === 'months') {
      var c = form.querySelector('input[name="' + name + '"]:checked');
      return c ? c.value : '';
    }
    return $(name).value;
  }

  function setError(name, msg) {
    var box = $('err-' + name);
    var wrap = form.querySelector('[data-field="' + name + '"]');
    if (box) { box.textContent = msg; box.hidden = !msg; }
    if (wrap) wrap.classList.toggle('has-error', !!msg);
    var input = form.querySelector('[name="' + name + '"]');
    if (input) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }

  function validateField(name) {
    var msg = RULES[name](fieldValue(name));
    setError(name, msg);
    return !msg;
  }

  function validateAll() {
    var firstBad = null;
    FIELDS.forEach(function (n) {
      if (!validateField(n) && !firstBad) firstBad = n;
    });
    return firstBad;
  }

  // Phone: format as the person types
  $('phone').addEventListener('input', function () {
    var pos = this.selectionStart, before = this.value.length;
    this.value = normPhone(this.value);
    if (pos !== null && pos >= before) this.setSelectionRange(this.value.length, this.value.length);
  });

  // Re-check a field once it has shown an error, and when the person leaves it
  FIELDS.forEach(function (n) {
    var els = form.querySelectorAll('[name="' + n + '"]');
    els.forEach(function (el) {
      el.addEventListener('blur', function () { if (fieldValue(n) || el.type !== 'checkbox') validateField(n); });
      el.addEventListener('change', function () {
        var wrap = form.querySelector('[data-field="' + n + '"]');
        if (wrap && wrap.classList.contains('has-error')) validateField(n);
      });
      el.addEventListener('input', function () {
        var wrap = form.querySelector('[data-field="' + n + '"]');
        if (wrap && wrap.classList.contains('has-error')) validateField(n);
      });
    });
  });

  /* ----- progress saved in the browser ----- */
  var saveTimer;
  function saveDraft() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      var d = {};
      FIELDS.forEach(function (n) { d[n] = n === 'consent' ? $('consent').checked : fieldValue(n); });
      PF.store.set(DRAFT_KEY, d);
      var note = $('savedNote');
      note.hidden = false;
      note.textContent = 'Progress saved on this device.';
    }, 300);
  }
  form.addEventListener('input', saveDraft);
  form.addEventListener('change', saveDraft);

  function restoreDraft() {
    var d = PF.store.get(DRAFT_KEY);
    if (!d) return;
    if (d.fullName) $('fullName').value = d.fullName;
    if (d.phone) $('phone').value = normPhone(d.phone);
    ['gender', 'trainerPref', 'months'].forEach(function (n) {
      if (!d[n]) return;
      var el = form.querySelector('input[name="' + n + '"][value="' + d[n] + '"]');
      if (el) el.checked = true;
    });
    if (d.startDate && d.startDate >= todayISO && d.startDate <= startInput.max) startInput.value = d.startDate;
    if (d.consent) $('consent').checked = true;
    $('savedNote').hidden = false;
    $('savedNote').textContent = 'Welcome back! We restored what you typed earlier.';
  }

  /* =====================================================================
     4. Sending to Google Sheets
     ===================================================================== */
  function isConnected() {
    return typeof SHEET_URL === 'string' &&
      /^https:\/\/script\.google\.com\/(a\/[^/]+\/)?macros\/s\/[^/]+\/exec/.test(SHEET_URL.trim());
  }
  var DEMO = /[?&]demo=1\b/.test(location.search);   // lets you preview the payment screen before the sheet is set up

  function fail(code, message) { var e = new Error(message || code); e.code = code; return e; }

  function sendToSheet(data, timeoutMs) {
    if (!isConnected()) {
      if (DEMO && data.action === 'join') return Promise.resolve({ result: 'success', memberId: 'PF-1000' });
      if (DEMO && data.action === 'txid') {
        return new Promise(function (resolve) {
          setTimeout(function () { resolve({ result: 'success', status: 'paid', reason: 'Payment confirmed' }); }, 1500);
        });
      }
      return Promise.reject(fail('NOT_CONNECTED'));
    }
    var fd = new FormData();
    Object.keys(data).forEach(function (k) { fd.append(k, data[k]); });
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, timeoutMs || 25000);
    return fetch(SHEET_URL.trim(), { method: 'POST', body: fd, signal: ctrl ? ctrl.signal : undefined })
      .then(function (res) {
        clearTimeout(timer);
        if (!res.ok) throw fail('HTTP', 'HTTP ' + res.status);
        return res.json();
      })
      .then(function (json) {
        if (!json || json.result !== 'success') throw fail('SERVER', json && json.message);
        return json;
      })
      .catch(function (err) {
        clearTimeout(timer);
        if (err && err.code) throw err;
        throw fail('NETWORK', err && err.message);
      });
  }

  function setBusy(btn, busy, label) {
    if (busy) {
      btn.setAttribute('data-label', btn.innerHTML);
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner" aria-hidden="true"></span> ' + label;
    } else {
      btn.disabled = false;
      if (btn.hasAttribute('data-label')) btn.innerHTML = btn.getAttribute('data-label');
    }
  }

  function showAlert(el, kind, title, text) {
    el.className = 'alert alert-' + kind;
    el.innerHTML = '<strong>' + PF.esc(title) + '</strong>' + (text ? '<span>' + PF.esc(text) + '</span>' : '');
    el.hidden = false;
  }

  /* =====================================================================
     5. Join form submit
     ===================================================================== */
  var sending = false;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sending) return;

    // Robots fill the hidden field. Real people never see it.
    if (form.elements.company_website.value) return;

    var alertBox = $('formAlert');
    alertBox.hidden = true;

    var bad = validateAll();
    if (bad) {
      showAlert(alertBox, 'warn', 'Almost there!', 'Please check the highlighted questions and press the button again.');
      var target = form.querySelector('[data-field="' + bad + '"]');
      if (target) {
        target.scrollIntoView({ block: 'center', behavior: PF.reduce() ? 'auto' : 'smooth' });
        var focusEl = target.querySelector('input, select');
        if (focusEl) focusEl.focus({ preventScroll: true });
      }
      return;
    }

    sending = true;
    var btn = $('submitBtn');
    setBusy(btn, true, 'Sending...');

    var months = selectedMonths();
    var total = totalFor(months);

    loadRate().then(function (r) {
      var usdt = usdtFor(total, r.value);
      return sendToSheet({
        action: 'join',
        company_website: '',
        fullName: $('fullName').value.trim().replace(/\s+/g, ' '),
        phone: $('phone').value,
        gender: fieldValue('gender'),
        trainerPref: fieldValue('trainerPref'),
        months: months,
        startDate: $('startDate').value,
        consent: 'yes',
        totalPkr: total,
        usdtAmount: fmtUsdt(usdt),
        testMode: TEST_MODE ? 'yes' : 'no',
        rateUsed: r.value
      }).then(function (res) {
        if (!/^PF-\d{3,}$/.test(String(res.memberId || ''))) throw fail('SERVER', 'No member ID came back.');
        var pay = {
          memberId: res.memberId, name: $('fullName').value.trim(), phone: $('phone').value,
          months: months, totalPkr: total, usdt: fmtUsdt(usdt), test: TEST_MODE, rate: r.value, txSent: false
        };
        PF.store.set(PAY_KEY, pay);
        PF.store.del(DRAFT_KEY);
        showPayment(pay, true);
      });
    }).catch(function (err) {
      if (err && err.code === 'NOT_CONNECTED') {
        showAlert(alertBox, 'warn', 'The form is not connected yet.',
          'The owner still needs to finish the Google Sheet setup (see SETUP-GOOGLE-SHEET.md). For now please call us on ' + PHONE_TEXT + '.');
      } else {
        showAlert(alertBox, 'warn', 'Sorry, we could not send your form.',
          (err && err.code === 'SERVER' && err.message && err.message !== 'SERVER' ? err.message + ' ' : '') +
          'Please check your internet and try again. Your answers are still here. You can also call us on ' + PHONE_TEXT + '.');
        if (window.console) console.warn('Join failed:', err);
      }
      alertBox.scrollIntoView({ block: 'center', behavior: PF.reduce() ? 'auto' : 'smooth' });
    }).then(function () {
      sending = false;
      setBusy(btn, false);
    });
  });

  /* =====================================================================
     6. Payment screen
     ===================================================================== */
  var BASE58 = /^[1-9A-HJ-NP-Za-km-z]{80,90}$/;

  function qrSvg(text) {
    if (typeof qrcode !== 'function') return '';
    var qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    var n = qr.getModuleCount(), q = 3, d = '';
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        if (qr.isDark(r, c)) d += 'M' + (c + q) + ' ' + (r + q) + 'h1v1h-1z';
      }
    }
    var size = n + q * 2;
    return '<svg viewBox="0 0 ' + size + ' ' + size + '" shape-rendering="crispEdges" role="img" aria-label="QR code of the wallet address">' +
      '<rect width="' + size + '" height="' + size + '" fill="#ffffff"/><path d="' + d + '" fill="#0b0c0d"/></svg>';
  }

  function copyText(t) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(t);
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = t; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy') ? resolve() : reject(); } catch (err) { reject(err); }
      document.body.removeChild(ta);
    });
  }

  function wireCopy(btn, getText, doneLabel) {
    var original = btn.innerHTML;
    btn.addEventListener('click', function () {
      copyText(getText()).then(function () {
        btn.innerHTML = PF.icon('check') + ' ' + doneLabel;
        btn.classList.add('is-done');
      }).catch(function () {
        btn.textContent = 'Press and hold the text to copy';
      }).then(function () {
        setTimeout(function () { btn.innerHTML = original; btn.classList.remove('is-done'); }, 2200);
      });
    });
  }

  function showPayment(pay, justJoined) {
    $('joinSection').hidden = true;
    $('resumeBar').hidden = true;
    var sec = $('paySection');
    sec.hidden = false;

    $('payId').textContent = pay.memberId;
    $('payName').textContent = pay.name;
    $('payAmount').textContent = pay.usdt;
    $('payTotal').textContent = PF.fmtPKR(pay.totalPkr) + ' for ' + pay.months + (pay.months === 1 ? ' month' : ' months');
    $('payTest').hidden = !pay.test;
    $('payWallet').textContent = WALLET_ADDRESS;

    var qr = qrSvg(WALLET_ADDRESS);
    $('payQr').innerHTML = qr || '<p class="muted small">The QR code could not load. Please copy the address instead.</p>';

    paintTx(pay);
    if (justJoined) sec.scrollIntoView({ behavior: PF.reduce() ? 'auto' : 'smooth', block: 'start' });
  }

  wireCopy($('copyWallet'), function () { return WALLET_ADDRESS; }, 'Copied!');
  wireCopy($('copyAmount'), function () { return $('payAmount').textContent; }, 'Copied!');

  /* ----- result of the blockchain check ----- */
  function txState(pay) {
    if (pay.txStatus) return pay.txStatus;
    return pay.txSent ? 'waiting' : '';          // saved by an older version of this page
  }

  function whatsappLink() { return PF.whatsappLink(); }

  function confettiHtml() {
    if (PF.reduce()) return '';
    var colors = ['#c8ff1f', '#f3f5f6', '#9fe600', '#ffd23f', '#5aa7ff'];
    var count = window.matchMedia && window.matchMedia('(max-width: 820px)').matches ? 26 : 48;
    var html = '';
    for (var i = 0; i < count; i++) {
      html += '<i style="--x:' + (Math.random() * 100).toFixed(1) + '%;--d:' + (Math.random() * 0.9).toFixed(2) +
        's;--t:' + (1.8 + Math.random() * 1.6).toFixed(2) + 's;--r:' + Math.round(Math.random() * 720 - 360) +
        'deg;--c:' + colors[i % colors.length] + '"></i>';
    }
    return '<div class="confetti" aria-hidden="true">' + html + '</div>';
  }

  function paintResult(state, reason, pay, celebrate) {
    var box = $('txResult');
    if (!state) { box.hidden = true; box.innerHTML = ''; return; }
    var html;
    if (state === 'paid') {
      html = '<div class="tx-result is-paid">' + (celebrate ? confettiHtml() : '') +
        '<div class="tx-result-body">' +
        '<svg class="tick-draw" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="23"/><path d="M15 27l7 7 15-16"/></svg>' +
        '<h3>Payment confirmed</h3>' +
        '<p>Welcome to Pulse Forge, ' + PF.esc(pay.name) + '! Your membership <strong>' + PF.esc(pay.memberId) + '</strong> is now paid. ' +
        'Bring your member ID on your first day. See you on the floor!</p></div></div>';
    } else if (state === 'rejected') {
      html = '<div class="tx-result is-problem"><div class="tx-result-body">' +
        '<span class="tx-result-icon">' + PF.icon('alert') + '</span>' +
        '<h3>Payment problem: ' + PF.esc(reason || 'we could not confirm this payment') + '.</h3>' +
        '<p>Please contact us on WhatsApp.</p>' +
        '<p class="btn-row"><a class="btn btn-primary" href="' + whatsappLink() + '" target="_blank" rel="noopener">Chat on WhatsApp (' + PF.esc(PHONE_TEXT) + ')</a></p>' +
        '<p class="muted small">Pasted the wrong transaction ID? You can paste the correct one above and press Submit again.</p>' +
        '</div></div>';
    } else {
      html = '<div class="tx-result is-waiting"><div class="tx-result-body">' +
        '<span class="tx-result-icon">' + PF.icon('clock') + '</span>' +
        (state === 'manual'
          ? '<h3>We are checking your payment by hand.</h3><p>We will confirm soon. Your member ID is <strong>' + PF.esc(pay.memberId) + '</strong>.</p>'
          : '<h3>Still waiting for the blockchain.</h3><p>We will keep checking and confirm soon. You can close this page. Your member ID is <strong>' + PF.esc(pay.memberId) + '</strong>.</p>') +
        '</div></div>';
    }
    box.innerHTML = html;
    box.hidden = false;
    var confetti = box.querySelector('.confetti');
    if (confetti) setTimeout(function () { if (confetti.parentNode) confetti.parentNode.removeChild(confetti); }, 4500);
  }

  function paintTx(pay) {
    var state = txState(pay);
    $('txChecking').hidden = true;
    // The box stays open after a problem, so a corrected TxID can be sent.
    $('txForm').hidden = state === 'paid' || state === 'waiting' || state === 'manual';
    paintResult(state, pay.txReason, pay, false);
  }

  function normTxid(v) {
    v = String(v || '').trim();
    var m = v.match(/\/tx\/([1-9A-HJ-NP-Za-km-z]+)/);   // allow pasting a Solscan / explorer link
    return m ? m[1] : v.replace(/\s+/g, '');
  }

  $('txForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var pay = PF.store.get(PAY_KEY);
    var out = $('txAlert');
    out.hidden = true;
    if (!pay) {
      showAlert(out, 'warn', 'We lost your member ID on this device.', 'Please call us on ' + PHONE_TEXT + ' and tell us your name.');
      return;
    }
    var tx = normTxid($('txid').value);
    if (!tx) { showAlert(out, 'warn', 'Please paste your transaction ID first.', 'You can find it in your crypto app after you send the payment.'); return; }
    if (!BASE58.test(tx)) {
      showAlert(out, 'warn', 'That does not look like a Solana transaction ID.', 'It is a long mix of letters and numbers (about 87 or 88 characters). Please copy it again from your crypto app.');
      return;
    }
    var btn = $('txBtn');
    setBusy(btn, true, 'Checking...');
    // "Checking the blockchain..." animation (shown for at least a moment so it can be read).
    $('txForm').hidden = true;
    paintResult('', '', pay, false);
    $('txChecking').hidden = false;
    var shownAt = Date.now();
    var atLeast = function (value) {
      var wait = Math.max(0, 1600 - (Date.now() - shownAt));
      return new Promise(function (resolve) { setTimeout(function () { resolve(value); }, wait); });
    };

    sendToSheet({ action: 'txid', company_website: '', memberId: pay.memberId, phone: pay.phone, txid: tx }, 60000)
      .then(atLeast)
      .then(function (res) {
        var state = ['paid', 'rejected', 'waiting', 'manual'].indexOf(res.status) >= 0 ? res.status : 'waiting';
        pay.txSent = true;
        pay.txStatus = state;
        pay.txReason = res.reason || '';
        PF.store.set(PAY_KEY, pay);
        $('txChecking').hidden = true;
        $('txForm').hidden = state !== 'rejected';
        paintResult(state, pay.txReason, pay, true);
        $('txResult').scrollIntoView({ block: 'center', behavior: PF.reduce() ? 'auto' : 'smooth' });
      })
      .catch(function (err) {
        $('txChecking').hidden = true;
        $('txForm').hidden = false;
        if (err && err.code === 'NOT_CONNECTED') {
          showAlert(out, 'warn', 'The form is not connected yet.', 'The owner still needs to finish the Google Sheet setup.');
        } else if (err && err.code === 'SERVER' && err.message && err.message !== 'SERVER') {
          showAlert(out, 'warn', 'We could not save that.', err.message);
        } else {
          showAlert(out, 'warn', 'Sorry, we could not send it.', 'Please check your internet and try again, or call us on ' + PHONE_TEXT + '.');
          if (window.console) console.warn('TxID failed:', err);
        }
      })
      .then(function () { setBusy(btn, false); });
  });

  $('newApplication').addEventListener('click', function () {
    PF.store.del(PAY_KEY);
    $('paySection').hidden = true;
    $('joinSection').hidden = false;
    $('txid').value = '';
    $('txAlert').hidden = true;
    $('txChecking').hidden = true;
    $('txForm').hidden = false;
    paintResult('', '', {}, false);
    form.reset();
    paintCost();
    window.scrollTo({ top: $('joinSection').offsetTop - 80, behavior: PF.reduce() ? 'auto' : 'smooth' });
  });

  /* =====================================================================
     7. Start-up
     ===================================================================== */
  $('testBadge').hidden = !TEST_MODE;
  restoreDraft();
  if (!startInput.value) startInput.value = todayISO;
  paintCost();
  loadRate().then(paintCost);

  var saved = PF.store.get(PAY_KEY);
  if (saved && saved.memberId) {
    $('resumeBar').hidden = false;
    $('resumeId').textContent = saved.memberId;
    $('resumeBtn').addEventListener('click', function () { showPayment(saved, true); });
  }
})();
