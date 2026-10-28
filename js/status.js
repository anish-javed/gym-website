/* Live opening status, always in Pakistan time. */
(function () {
  'use strict';

  var LADIES_START = 10 * 60;   // 10:00 AM
  var LADIES_END = 16 * 60;     // 4:00 PM
  var OPEN_START = 17 * 60;     // 5:00 PM
  var CLOSE_AT = 1 * 60;        // 1:00 AM (next day)

  /** Which part of the day is it right now? */
  PF.slotNow = function (date) {
    var m = PF.pkNow(date).minutes;
    if (m >= LADIES_START && m < LADIES_END) return 'ladies';
    if (m >= LADIES_END && m < OPEN_START) return 'break';
    if (m >= OPEN_START || m < CLOSE_AT) return 'open';
    return 'closed';
  };

  var TEXT = {
    ladies: 'Ladies hour now - until 4 PM',
    break: 'Break - opens for everyone at 5 PM',
    open: 'Open for everyone - until 1 AM',
    closed: 'Closed - opens 10 AM (ladies)'
  };

  function paint(el, slot) {
    if (el.getAttribute('data-slot') === slot) return;   // nothing changed
    el.setAttribute('data-slot', slot);
    el.innerHTML = '<span class="dot" aria-hidden="true"></span><span class="status-text">' + TEXT[slot] + '</span>';
  }

  function update() {
    var slot = PF.slotNow();
    document.querySelectorAll('[data-status]').forEach(function (el) { paint(el, slot); });
    // Highlight the matching row on the timings page.
    document.querySelectorAll('[data-slot-row]').forEach(function (row) {
      var on = row.getAttribute('data-slot-row') === slot;
      row.classList.toggle('is-now', on);
      var tag = row.querySelector('.now-tag');
      if (tag) tag.hidden = !on;
    });
  }

  update();
  setInterval(update, 30000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) update(); });
})();
