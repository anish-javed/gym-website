/* Small helpers shared by all pages (Pakistan time, motion setting, formatting). */
window.PF = window.PF || {};

(function () {
  'use strict';

  var reduceMQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  PF.reduce = function () { return reduceMQ.matches; };

  var DAY_INDEX = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  PF.DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  /**
   * Current time in Pakistan (Asia/Karachi), whatever the visitor's own time zone is.
   * Returns { day: 0-6 (Monday = 0), minutes: minutes since midnight, iso: 'YYYY-MM-DD' }
   */
  PF.pkNow = function (date) {
    var d = date || new Date();
    try {
      var parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Karachi', weekday: 'short', year: 'numeric', month: '2-digit',
        day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
      }).formatToParts(d);
      var o = {};
      parts.forEach(function (p) { o[p.type] = p.value; });
      var h = parseInt(o.hour, 10) % 24;
      return {
        day: DAY_INDEX[o.weekday],
        minutes: h * 60 + parseInt(o.minute, 10),
        iso: o.year + '-' + o.month + '-' + o.day
      };
    } catch (e) {
      // Fallback: Pakistan is UTC+5 all year.
      var u = new Date(d.getTime() + 5 * 3600000);
      var pad = function (n) { return (n < 10 ? '0' : '') + n; };
      return {
        day: (u.getUTCDay() + 6) % 7,
        minutes: u.getUTCHours() * 60 + u.getUTCMinutes(),
        iso: u.getUTCFullYear() + '-' + pad(u.getUTCMonth() + 1) + '-' + pad(u.getUTCDate())
      };
    }
  };

  /** 'YYYY-MM-DD' plus a number of days. */
  PF.addDaysISO = function (iso, n) {
    var p = iso.split('-');
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n));
    return d.toISOString().slice(0, 10);
  };

  /** 17*60+30 -> '5:30 PM' (works past midnight too) */
  PF.fmtMinutes = function (total) {
    var m = ((total % 1440) + 1440) % 1440;
    var h = Math.floor(m / 60), mm = m % 60;
    var ap = h >= 12 ? 'PM' : 'AM';
    var h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + ':' + (mm < 10 ? '0' : '') + mm + ' ' + ap;
  };

  PF.fmtPKR = function (n) { return 'Rs ' + Math.round(n).toLocaleString('en-US'); };

  PF.esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  /** Safe browser storage (can be blocked in private windows). */
  PF.store = {
    get: function (k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
  };
})();
