/* Weekly class timetable (made-up classes) with filters.
   Rules: Ladies classes run 10 AM - 4 PM. Everyone classes run 5 PM - 1 AM. Nothing 4 - 5 PM. */
window.PF = window.PF || {};

(function () {
  'use strict';

  // [day (Mon=0), start 'HH:MM', minutes, name, type, audience, trainer]
  var L = 'ladies', E = 'everyone';
  var ROWS = [
    // ---- Ladies only (10 AM - 4 PM) ----
    [0, '10:00', 60, 'Sunrise Yoga Flow', 'Yoga', L, 'Hina Farooq'],
    [0, '12:00', 60, 'Zumba Party', 'Zumba', L, 'Mehwish Siddiqui'],
    [0, '14:30', 60, 'Strength Basics', 'Strength', L, 'Sana Rehman'],
    [1, '10:30', 45, 'Fat-Burn HIIT', 'HIIT', L, 'Ayesha Khan'],
    [1, '12:30', 60, 'Dance Cardio', 'Cardio', L, 'Mehwish Siddiqui'],
    [1, '15:00', 45, 'Stretch & Restore', 'Yoga', L, 'Hina Farooq'],
    [2, '10:00', 60, 'Strong Women Lift', 'Strength', L, 'Sana Rehman'],
    [2, '12:00', 45, 'HIIT & Core', 'HIIT', L, 'Ayesha Khan'],
    [2, '14:30', 60, 'Zumba Gold', 'Zumba', L, 'Mehwish Siddiqui'],
    [3, '10:30', 60, 'Balance Yoga', 'Yoga', L, 'Hina Farooq'],
    [3, '13:00', 45, 'Cardio Sculpt', 'Cardio', L, 'Ayesha Khan'],
    [3, '15:00', 60, 'Glutes & Legs', 'Strength', L, 'Sana Rehman'],
    [4, '10:00', 60, 'Zumba Party', 'Zumba', L, 'Mehwish Siddiqui'],
    [4, '12:00', 45, 'Fat-Burn HIIT', 'HIIT', L, 'Ayesha Khan'],
    [4, '14:30', 60, 'Gentle Yoga', 'Yoga', L, 'Hina Farooq'],
    [5, '10:00', 60, 'Weekend Zumba', 'Zumba', L, 'Mehwish Siddiqui'],
    [5, '11:30', 60, 'Strength Basics', 'Strength', L, 'Sana Rehman'],
    [5, '14:00', 60, 'Power Yoga', 'Yoga', L, 'Hina Farooq'],
    [6, '10:30', 60, 'Yoga & Breathwork', 'Yoga', L, 'Hina Farooq'],
    [6, '12:30', 45, 'HIIT Express', 'HIIT', L, 'Ayesha Khan'],
    [6, '14:30', 60, 'Dance Cardio', 'Cardio', L, 'Mehwish Siddiqui'],
    // ---- Everyone (5 PM - 1 AM) ----
    [0, '17:30', 60, 'Power Strength', 'Strength', E, 'Usman Tariq'],
    [0, '19:00', 45, 'HIIT Blast', 'HIIT', E, 'Bilal Ahmed'],
    [0, '21:00', 45, 'Cardio Blast', 'Cardio', E, 'Hamza Raza'],
    [1, '17:30', 60, 'Muscle Builder', 'Strength', E, 'Danish Malik'],
    [1, '19:30', 45, 'Evening Zumba', 'Zumba', E, 'Mehwish Siddiqui'],
    [1, '21:30', 45, 'Midnight Mobility', 'Yoga', E, 'Hina Farooq'],
    [2, '17:30', 45, 'HIIT Blast', 'HIIT', E, 'Bilal Ahmed'],
    [2, '19:00', 60, 'Power Strength', 'Strength', E, 'Usman Tariq'],
    [2, '21:00', 45, 'Cardio Blast', 'Cardio', E, 'Hamza Raza'],
    [3, '17:30', 60, 'Muscle Builder', 'Strength', E, 'Danish Malik'],
    [3, '19:00', 45, 'Evening Yoga', 'Yoga', E, 'Hina Farooq'],
    [3, '21:00', 45, 'HIIT Finisher', 'HIIT', E, 'Bilal Ahmed'],
    [3, '23:00', 45, 'Late Night Lift', 'Strength', E, 'Usman Tariq'],
    [4, '17:30', 45, 'Friday HIIT', 'HIIT', E, 'Bilal Ahmed'],
    [4, '19:00', 60, 'Zumba Night', 'Zumba', E, 'Mehwish Siddiqui'],
    [4, '21:00', 60, 'Heavy Day Strength', 'Strength', E, 'Danish Malik'],
    [5, '17:30', 60, 'Power Strength', 'Strength', E, 'Usman Tariq'],
    [5, '19:00', 45, 'HIIT Blast', 'HIIT', E, 'Bilal Ahmed'],
    [5, '20:30', 45, 'Cardio Blast', 'Cardio', E, 'Hamza Raza'],
    [5, '22:00', 60, 'Late Night Lift', 'Strength', E, 'Danish Malik'],
    [6, '17:30', 60, 'Stretch & Flow', 'Yoga', E, 'Hina Farooq'],
    [6, '19:00', 45, 'Cardio Blast', 'Cardio', E, 'Hamza Raza'],
    [6, '20:30', 60, 'Muscle Builder', 'Strength', E, 'Danish Malik']
  ];

  var CLASSES = ROWS.map(function (r) {
    var p = r[1].split(':');
    var start = parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
    return { day: r[0], start: start, end: start + r[2], mins: r[2], name: r[3], type: r[4], aud: r[5], trainer: r[6] };
  }).sort(function (a, b) { return a.day - b.day || a.start - b.start; });

  PF.classes = CLASSES;

  // Fill "how many classes" counters on other pages.
  document.querySelectorAll('[data-class-total]').forEach(function (el) {
    el.setAttribute('data-count', CLASSES.length);
    el.textContent = CLASSES.length;
  });

  var host = document.getElementById('timetable');
  if (!host) return;

  var TYPES = ['Strength', 'HIIT', 'Yoga', 'Zumba', 'Cardio'];
  var TYPE_ICON = { Strength: 'dumbbell', HIIT: 'flame', Yoga: 'heart', Zumba: 'sparkle', Cardio: 'bolt' };
  var state = { aud: 'all', type: 'all' };

  var countEl = document.getElementById('classCount');
  var typeBox = document.getElementById('typeFilters');

  typeBox.innerHTML = '<button type="button" class="chip is-on" data-type="all" aria-pressed="true">All types</button>' +
    TYPES.map(function (t) {
      return '<button type="button" class="chip" data-type="' + t + '" aria-pressed="false">' + t + '</button>';
    }).join('');

  function matches(c) {
    return (state.aud === 'all' || c.aud === state.aud) && (state.type === 'all' || c.type === state.type);
  }

  function card(c) {
    var ladies = c.aud === 'ladies';
    return '<article class="cls tilt ' + (ladies ? 'is-ladies' : 'is-everyone') + '">' +
      '<p class="cls-time">' + PF.fmtMinutes(c.start) + ' - ' + PF.fmtMinutes(c.end) + '</p>' +
      '<h4>' + PF.esc(c.name) + '</h4>' +
      '<p class="cls-by">with ' + PF.esc(c.trainer) + '</p>' +
      '<p class="cls-tags"><span class="pill pill-type"><span class="ico-sm" data-icon="' + TYPE_ICON[c.type] + '"></span>' + c.type + '</span>' +
      '<span class="pill ' + (ladies ? 'pill-ladies' : 'pill-all') + '">' + (ladies ? 'Ladies only' : 'Everyone') + '</span></p>' +
      '</article>';
  }

  function render() {
    var today = PF.pkNow().day;
    var shown = 0;
    var html = PF.DAY_NAMES.map(function (name, d) {
      var list = CLASSES.filter(function (c) { return c.day === d && matches(c); });
      shown += list.length;
      return '<section class="day' + (d === today ? ' is-today' : '') + '" aria-label="' + name + '">' +
        '<h3 class="day-name">' + name + (d === today ? ' <span class="today-tag">Today</span>' : '') + '</h3>' +
        (list.length ? list.map(card).join('') : '<p class="day-empty">No classes match this day.</p>') +
        '</section>';
    }).join('');
    host.innerHTML = html;
    PF.hydrateIcons(host);
    countEl.textContent = shown + (shown === 1 ? ' class' : ' classes') + ' shown';
    host.classList.remove('swap');
    void host.offsetWidth;          // restart the little fade-in
    host.classList.add('swap');
  }

  function bind(boxId, key) {
    var box = document.getElementById(boxId);
    box.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-' + (key === 'aud' ? 'aud' : 'type') + ']');
      if (!b) return;
      state[key] = b.getAttribute('data-' + (key === 'aud' ? 'aud' : 'type'));
      box.querySelectorAll('button').forEach(function (x) {
        var on = x === b;
        x.classList.toggle('is-on', on);
        x.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      render();
    });
  }
  bind('audFilters', 'aud');
  bind('typeFilters', 'type');

  document.getElementById('resetFilters').addEventListener('click', function () {
    state.aud = 'all'; state.type = 'all';
    document.querySelectorAll('#audFilters button, #typeFilters button').forEach(function (x) {
      var on = x.getAttribute('data-aud') === 'all' || x.getAttribute('data-type') === 'all';
      x.classList.toggle('is-on', on);
      x.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    render();
  });

  render();
})();
