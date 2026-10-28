/* All pictures on the site are drawn here as SVG code (no photos). */
window.PF = window.PF || {};

(function () {
  'use strict';

  /* ---------- small line icons (24 x 24) ---------- */
  var ICONS = {
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    locker: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M12 3v18M9.5 9h.01M14.5 9h.01M9.5 14h.01M14.5 14h.01"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14c2.6 0 4 2 4 5"/>',
    venus: '<circle cx="12" cy="9" r="5"/><path d="M12 14v8M9 18h6"/>',
    mars: '<circle cx="10" cy="14" r="5"/><path d="M14 10l6-6M15 4h5v5"/>',
    phone: '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
    pin: '<path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
    heart: '<path d="M12 20s-8-4.9-8-11a4.5 4.5 0 0 1 8-2.7A4.5 4.5 0 0 1 20 9c0 6.1-8 11-8 11z"/>',
    flame: '<path d="M12 22c4 0 7-2.8 7-7 0-3-1.8-5-3.5-7-.4 1.5-1.2 2.5-2.5 3 .5-3-.8-6.2-4-8 .2 3-1.5 4.8-3 6.5C4.8 11.5 5 13 5 15c0 4.2 3 7 7 7z"/>',
    wallet: '<path d="M3 7a2 2 0 0 1 2-2h13v4"/><path d="M3 7v10a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1H5a2 2 0 0 1-2-2z"/><circle cx="16.5" cy="14" r="1"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    chevron: '<path d="M6 9l6 6 6-6"/>',
    calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    award: '<circle cx="12" cy="9" r="5.5"/><path d="M8.5 13.5 7 21l5-2.5L17 21l-1.5-7.5"/>',
    shield: '<path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z"/>',
    alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
    dumbbell: '<path d="M3 9v6M6 6v12M18 6v12M21 9v6M6 12h12"/>',
    sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
    tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>'
  };

  PF.icon = function (name, cls) {
    return '<svg class="ico ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false" ' +
      'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      (ICONS[name] || '') + '</svg>';
  };

  /** Fills every <span data-icon="name"></span> with its icon. */
  PF.hydrateIcons = function (root) {
    (root || document).querySelectorAll('[data-icon]').forEach(function (el) {
      if (el.firstChild) return;
      el.innerHTML = PF.icon(el.getAttribute('data-icon'));
    });
  };

  /* ---------- big drawings ---------- */
  var A = function (vb, body, cls) {
    return '<svg class="art ' + (cls || '') + '" viewBox="' + vb + '" aria-hidden="true" focusable="false">' + body + '</svg>';
  };

  PF.dumbbell = function (cls) {
    return A('0 0 220 100',
      '<rect class="m2" x="60" y="43" width="100" height="14" rx="5"/>' +
      '<path class="st-w" d="M88 46v8M94 46v8M100 46v8M106 46v8M112 46v8M118 46v8M124 46v8M130 46v8" stroke-width="1.5"/>' +
      '<rect class="m1" x="22" y="10" width="24" height="80" rx="8"/>' +
      '<rect class="m1" x="46" y="24" width="14" height="52" rx="5"/>' +
      '<rect class="m2" x="58" y="40" width="8" height="20" rx="2"/>' +
      '<rect class="ac" x="28" y="18" width="4" height="64" rx="2"/>' +
      '<rect class="m1" x="174" y="10" width="24" height="80" rx="8"/>' +
      '<rect class="m1" x="160" y="24" width="14" height="52" rx="5"/>' +
      '<rect class="m2" x="154" y="40" width="8" height="20" rx="2"/>' +
      '<rect class="ac" x="188" y="18" width="4" height="64" rx="2"/>', cls);
  };

  PF.kettlebell = function (cls, label) {
    return A('0 0 120 130',
      '<path class="st-m" d="M38 58C30 6 90 6 82 58" fill="none" stroke-width="11" stroke-linecap="round"/>' +
      '<rect class="m1" x="34" y="114" width="52" height="10" rx="4"/>' +
      '<circle class="m1" cx="60" cy="82" r="40"/>' +
      '<path class="st-ac" d="M28 76C28 58 40 48 56 46" fill="none" stroke-width="4" stroke-linecap="round"/>' +
      '<circle class="ac" cx="60" cy="88" r="15"/>' +
      '<text class="art-t" x="60" y="93" text-anchor="middle">' + (label || '16') + '</text>', cls);
  };

  PF.treadmill = function (cls) {
    return A('0 0 200 140',
      '<rect class="m2" x="18" y="110" width="132" height="13" rx="6"/>' +
      '<path class="st-w" d="M34 116h100" stroke-width="2" stroke-dasharray="6 8"/>' +
      '<rect class="m1" x="30" y="123" width="8" height="10" rx="2"/><rect class="m1" x="130" y="123" width="8" height="10" rx="2"/>' +
      '<rect class="m1" x="146" y="44" width="9" height="70" rx="3"/>' +
      '<path class="st-m" d="M126 58C102 62 92 82 88 106" fill="none" stroke-width="6" stroke-linecap="round"/>' +
      '<rect class="m1" x="118" y="30" width="52" height="28" rx="7"/>' +
      '<rect class="ac" x="125" y="37" width="38" height="13" rx="3"/>' +
      '<path d="M130 44h8l3-4 4 8 3-4h8" fill="none" style="stroke:#0b0c0d" stroke-width="1.6"/>');
  };

  PF.rack = function (cls) {
    return A('0 0 200 140',
      '<rect class="m1" x="46" y="16" width="10" height="110" rx="2"/><rect class="m1" x="144" y="16" width="10" height="110" rx="2"/>' +
      '<rect class="m1" x="46" y="16" width="108" height="10" rx="3"/>' +
      '<rect class="m2" x="56" y="58" width="14" height="5" rx="2"/><rect class="m2" x="130" y="58" width="14" height="5" rx="2"/>' +
      '<rect class="m1" x="38" y="124" width="124" height="7" rx="3"/>' +
      '<rect class="m2" x="22" y="48" width="156" height="5" rx="2"/>' +
      '<rect class="ac" x="24" y="34" width="10" height="34" rx="3"/><rect class="m1" x="36" y="39" width="8" height="24" rx="3"/>' +
      '<rect class="ac" x="166" y="34" width="10" height="34" rx="3"/><rect class="m1" x="156" y="39" width="8" height="24" rx="3"/>');
  };

  PF.cable = function (cls) {
    var stack = '';
    for (var i = 0; i < 8; i++) stack += '<rect class="m2" x="78" y="' + (38 + i * 10) + '" width="44" height="8" rx="2"/>';
    return A('0 0 200 140',
      '<rect class="m1" x="60" y="12" width="10" height="114" rx="2"/><rect class="m1" x="130" y="12" width="10" height="114" rx="2"/>' +
      '<rect class="m1" x="60" y="12" width="80" height="9" rx="3"/>' + stack +
      '<rect class="ac" x="96" y="66" width="8" height="4" rx="1"/>' +
      '<circle class="m2" cx="65" cy="30" r="7"/><circle class="m2" cx="135" cy="30" r="7"/>' +
      '<path class="st-ac" d="M65 37V94M135 37V94" fill="none" stroke-width="2"/>' +
      '<rect class="ac" x="56" y="94" width="18" height="6" rx="3"/><rect class="ac" x="126" y="94" width="18" height="6" rx="3"/>' +
      '<rect class="m1" x="52" y="124" width="96" height="7" rx="3"/>');
  };

  PF.bench = function (cls) {
    return A('0 0 200 140',
      '<path class="m2" d="M60 86 L46 126 H58 L74 90Z"/><rect class="m2" x="112" y="88" width="10" height="38" rx="2"/>' +
      '<rect class="m1" x="40" y="124" width="28" height="7" rx="3"/><rect class="m1" x="100" y="124" width="34" height="7" rx="3"/>' +
      '<rect class="m1" x="74" y="72" width="82" height="16" rx="8"/>' +
      '<rect class="ac" x="84" y="77" width="62" height="3" rx="1.5"/>' +
      '<rect class="m1" x="24" y="46" width="64" height="16" rx="8" transform="rotate(-26 56 54)"/>' +
      '<rect class="ac" x="30" y="52" width="46" height="3" rx="1.5" transform="rotate(-26 56 54)"/>');
  };

  /** Equipment drawings by name, used on the flip cards. */
  PF.equipmentArt = function (name) {
    switch (name) {
      case 'dumbbell': return PF.dumbbell();
      case 'kettlebell': return PF.kettlebell();
      case 'treadmill': return PF.treadmill();
      case 'rack': return PF.rack();
      case 'cable': return PF.cable();
      case 'bench': return PF.bench();
    }
    return '';
  };

  /* ---------- brand mark ---------- */
  PF.logoMark = function () {
    return '<svg class="logo-mark" viewBox="0 0 40 40" aria-hidden="true" focusable="false">' +
      '<path d="M20 2 36 11v18L20 38 4 29V11z" fill="#0b0c0d" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>' +
      '<path d="M7 21h7l3-7 5 14 3-7h8" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  };

  /* ---------- trainer avatars (simple drawn people) ---------- */
  PF.avatar = function (o) {
    var skin = o.skin || '#d9a577';
    var hair = o.hair || '#1b1b1d';
    var back = '', front = '', neck = '<rect x="53" y="64" width="14" height="18" rx="5" fill="' + skin + '"/>';
    switch (o.style) {
      case 'short':
        front = '<path d="M43 46C41 25 79 25 77 46C72 36 48 36 43 46Z" fill="' + hair + '"/>'; break;
      case 'fade':
        front = '<path d="M44 44C46 31 74 31 76 44C70 38 50 38 44 44Z" fill="' + hair + '"/>'; break;
      case 'long':
        back = '<path d="M40 50C36 20 84 20 80 50L85 86L70 86L70 54L50 54L50 86L35 86Z" fill="' + hair + '"/>';
        front = '<path d="M44 44C48 31 72 31 76 44C68 37 52 37 44 44Z" fill="' + hair + '"/>'; break;
      case 'pony':
        back = '<path d="M42 44C38 22 82 22 78 44C88 48 92 64 86 78C84 64 80 54 76 50Z" fill="' + hair + '"/>';
        front = '<path d="M44 44C48 31 72 31 76 44C68 37 52 37 44 44Z" fill="' + hair + '"/>'; break;
      case 'bob':
        back = '<path d="M41 54C35 20 85 20 79 54L79 66L71 66L71 54L49 54L49 66L41 66Z" fill="' + hair + '"/>';
        front = '<path d="M44 44C48 30 72 30 76 44C68 36 52 36 44 44Z" fill="' + hair + '"/>'; break;
      case 'scarf':
        back = '<path d="M37 52C34 20 86 20 83 52C85 72 75 86 60 88C45 86 35 72 37 52Z" fill="' + (o.scarf || '#2f343a') + '"/>';
        neck = '';
        break;
    }
    var beard = o.beard ? '<path d="M45 55C46 74 74 74 75 55C70 65 50 65 45 55Z" fill="' + hair + '"/>' : '';
    return '<svg class="avatar" viewBox="0 0 120 120" aria-hidden="true" focusable="false">' +
      '<circle cx="60" cy="60" r="58" class="av-bg"/>' + back +
      '<path d="M16 120C16 92 36 83 60 83C84 83 104 92 104 120Z" class="av-body"/>' + neck +
      '<ellipse cx="60" cy="50" rx="15" ry="18" fill="' + skin + '"/>' + beard + front +
      '<circle cx="54" cy="50" r="1.8" fill="#1b1b1d"/><circle cx="66" cy="50" r="1.8" fill="#1b1b1d"/>' +
      '<path d="M55 59Q60 63 65 59" fill="none" stroke="#1b1b1d" stroke-width="1.6" stroke-linecap="round"/>' +
      '<path d="M48 85L60 97L72 85" fill="none" class="av-collar" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  };

  /** Map-style drawing for the contact page. */
  PF.mapArt = function () {
    return A('0 0 400 260',
      '<rect class="m1" x="0" y="0" width="400" height="260" rx="14"/>' +
      '<path class="st-m" d="M-10 60H410M-10 150H410M-10 220H410M70-10V270M180-10V270M300-10V270" fill="none" stroke-width="10"/>' +
      '<path class="st-w" d="M-10 150C100 130 200 175 410 120" fill="none" stroke-width="3" stroke-dasharray="10 8"/>' +
      '<rect class="m2" x="90" y="75" width="70" height="60" rx="6"/><rect class="m2" x="200" y="75" width="80" height="60" rx="6"/>' +
      '<rect class="m2" x="90" y="165" width="70" height="45" rx="6"/><rect class="m2" x="320" y="75" width="60" height="60" rx="6"/>' +
      '<g class="map-pin"><circle class="map-ring" cx="240" cy="190" r="26" fill="none" stroke-width="2"/>' +
      '<path class="ac" d="M240 216s-20-18-20-34a20 20 0 1 1 40 0c0 16-20 34-20 34z"/>' +
      '<circle cx="240" cy="182" r="7" fill="#0b0c0d"/></g>');
  };
})();
