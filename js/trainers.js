/* Trainer cards (made-up people) with a Male / Female filter. */
window.PF = window.PF || {};

(function () {
  'use strict';

  var TRAINERS = [
    { name: 'Hina Farooq', gender: 'female', role: 'Yoga & Flexibility Coach', years: 8,
      tags: ['Yoga', 'Mobility', 'Stress relief'], cert: 'RYT-500 Yoga Alliance (demo)',
      quote: 'Move gently, grow strong.',
      look: { style: 'scarf', scarf: '#2c3a2a', skin: '#e2b58d' } },
    { name: 'Ayesha Khan', gender: 'female', role: 'HIIT & Fat-Loss Coach', years: 6,
      tags: ['HIIT', 'Weight loss', 'Cardio'], cert: 'ACE Certified (demo)',
      quote: 'Short workouts, big results.',
      look: { style: 'pony', hair: '#2a1a12', skin: '#d9a577' } },
    { name: 'Mehwish Siddiqui', gender: 'female', role: 'Zumba & Dance Fitness', years: 7,
      tags: ['Zumba', 'Dance cardio', 'Fun'], cert: 'Zumba Licensed Instructor (demo)',
      quote: 'If it is fun, you will come back.',
      look: { style: 'long', hair: '#1b1214', skin: '#e6bf98' } },
    { name: 'Sana Rehman', gender: 'female', role: 'Strength for Women', years: 5,
      tags: ['Strength', 'Posture', 'Glutes & legs'], cert: 'NASM-CPT (demo)',
      quote: 'Lift heavy. Feel powerful.',
      look: { style: 'bob', hair: '#3a2218', skin: '#d3a074' } },
    { name: 'Usman Tariq', gender: 'male', role: 'Strength & Powerlifting', years: 10,
      tags: ['Powerlifting', 'Strength', 'Technique'], cert: 'CSCS (demo)',
      quote: 'Perfect form first, heavy weight next.',
      look: { style: 'short', hair: '#17140f', skin: '#d2a07a', beard: true } },
    { name: 'Bilal Ahmed', gender: 'male', role: 'HIIT & Conditioning', years: 6,
      tags: ['HIIT', 'Conditioning', 'Stamina'], cert: 'ACE Certified (demo)',
      quote: 'Push a little more than yesterday.',
      look: { style: 'fade', hair: '#14110e', skin: '#dcae85' } },
    { name: 'Hamza Raza', gender: 'male', role: 'Weight Loss & Cardio', years: 7,
      tags: ['Weight loss', 'Cardio', 'Healthy habits'], cert: 'ISSA-CPT (demo)',
      quote: 'Small habits build big changes.',
      look: { style: 'short', hair: '#201a14', skin: '#c99468' } },
    { name: 'Danish Malik', gender: 'male', role: 'Bodybuilding & Muscle Gain', years: 9,
      tags: ['Bodybuilding', 'Muscle gain', 'Nutrition'], cert: 'IFBB Pro Card (demo)',
      quote: 'Train smart, eat well, stay patient.',
      look: { style: 'fade', hair: '#0f0e0d', skin: '#d6a47c', beard: true } }
  ];

  PF.trainers = TRAINERS;

  document.querySelectorAll('[data-trainer-total]').forEach(function (el) {
    el.setAttribute('data-count', TRAINERS.length);
    el.textContent = TRAINERS.length;
  });

  var host = document.getElementById('trainerGrid');
  if (!host) return;

  var filter = 'all';
  var countEl = document.getElementById('trainerCount');
  var emptyEl = document.getElementById('trainerEmpty');

  function card(t) {
    var fem = t.gender === 'female';
    return '<article class="trainer tilt" data-gender="' + t.gender + '">' +
      '<div class="trainer-art">' + PF.avatar(t.look) + '</div>' +
      '<p class="trainer-badge ' + (fem ? 'is-f' : 'is-m') + '"><span class="ico-sm" data-icon="' + (fem ? 'venus' : 'mars') + '"></span>' + (fem ? 'Female trainer' : 'Male trainer') + '</p>' +
      '<h3>' + PF.esc(t.name) + '</h3>' +
      '<p class="trainer-role">' + PF.esc(t.role) + '</p>' +
      '<p class="trainer-quote">&ldquo;' + PF.esc(t.quote) + '&rdquo;</p>' +
      '<ul class="trainer-tags">' + t.tags.map(function (x) { return '<li>' + PF.esc(x) + '</li>'; }).join('') + '</ul>' +
      '<p class="trainer-meta"><span><span class="ico-sm" data-icon="award"></span>' + PF.esc(t.cert) + '</span>' +
      '<span><span class="ico-sm" data-icon="clock"></span>' + t.years + ' years</span></p>' +
      '</article>';
  }

  function render() {
    var list = TRAINERS.filter(function (t) { return filter === 'all' || t.gender === filter; });
    host.innerHTML = list.map(card).join('');
    PF.hydrateIcons(host);
    emptyEl.hidden = list.length > 0;
    countEl.textContent = list.length + (list.length === 1 ? ' trainer' : ' trainers') + ' shown';
    host.classList.remove('swap');
    void host.offsetWidth;
    host.classList.add('swap');
  }

  document.getElementById('trainerFilters').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-gender]');
    if (!b) return;
    filter = b.getAttribute('data-gender');
    this.querySelectorAll('button').forEach(function (x) {
      var on = x === b;
      x.classList.toggle('is-on', on);
      x.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    render();
  });

  render();
})();
