/* Home page only: draws the floating hero objects and builds the equipment flip cards. */
(function () {
  'use strict';

  // Floating hero objects
  document.querySelectorAll('[data-art]').forEach(function (el) {
    var kind = el.getAttribute('data-art');
    el.innerHTML = kind === 'kettlebell' ? PF.kettlebell('', el.parentNode.classList.contains('f2') ? '12' : '20') : PF.dumbbell();
  });

  // Equipment flip cards
  var EQUIP = [
    { art: 'dumbbell', name: 'Dumbbells', blurb: 'A full rack of brand-new pairs.',
      facts: ['Pairs from 2.5 kg to 50 kg', 'Rubber hex heads, kind to the floor', 'Knurled handles for a firm grip'] },
    { art: 'kettlebell', name: 'Kettlebells', blurb: 'Swing, squat and sweat.',
      facts: ['Sizes from 4 kg to 32 kg', 'Smooth cast-iron bodies', 'Wide handles for two-hand swings'] },
    { art: 'treadmill', name: 'Treadmills', blurb: 'Walk, jog or sprint.',
      facts: ['Quiet, powerful motors', 'Incline up to 15%', 'Heart-rate grips and a clear screen'] },
    { art: 'rack', name: 'Power racks', blurb: 'Heavy lifting, done safely.',
      facts: ['Safety bars on every rack', 'Olympic bars and bumper plates', 'Plenty of space for deadlifts'] },
    { art: 'cable', name: 'Cable machines', blurb: 'Smooth, controlled strength.',
      facts: ['Two adjustable pulleys', 'Smooth weight stacks', 'Lots of handles and attachments'] },
    { art: 'bench', name: 'Benches', blurb: 'Flat, incline and decline.',
      facts: ['Adjustable back pad', 'Firm, comfortable padding', 'Easy-clean covers'] }
  ];

  var grid = document.getElementById('equipGrid');
  if (!grid) return;

  grid.innerHTML = EQUIP.map(function (e) {
    return '<div class="flip" tabindex="0" role="button" aria-pressed="false" aria-label="' + e.name + ' - press to flip the card and see details">' +
      '<div class="flip-inner">' +
      '<div class="flip-face flip-front"><div class="flip-art">' + PF.equipmentArt(e.art) + '</div>' +
      '<h3>' + e.name + '</h3><p class="flip-hint">' + PF.icon('sparkle') + ' Flip for details</p></div>' +
      '<div class="flip-face flip-back"><h3>' + e.name + '</h3><p class="muted" style="margin-bottom:12px">' + e.blurb + '</p>' +
      '<ul>' + e.facts.map(function (f) { return '<li>' + PF.icon('check') + '<span>' + f + '</span></li>'; }).join('') + '</ul>' +
      '<p class="flip-hint">Details are examples for this demo</p></div>' +
      '</div></div>';
  }).join('');
})();
