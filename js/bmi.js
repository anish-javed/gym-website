/* BMI + daily calorie calculator with an animated gauge. */
(function () {
  'use strict';

  var form = document.getElementById('bmiForm');
  if (!form) return;

  var $ = function (id) { return document.getElementById(id); };
  var NS = 'http://www.w3.org/2000/svg';
  var CX = 120, CY = 120, R = 88;
  var MIN = 15, MAX = 40;

  var SEGMENTS = [
    { from: 15, to: 18.5, cls: 'seg-under' },
    { from: 18.5, to: 25, cls: 'seg-normal' },
    { from: 25, to: 30, cls: 'seg-over' },
    { from: 30, to: 40, cls: 'seg-obese' }
  ];

  function pt(bmi, r) {
    var t = (Math.min(MAX, Math.max(MIN, bmi)) - MIN) / (MAX - MIN);
    var a = Math.PI * (1 - t);
    return { x: CX + r * Math.cos(a), y: CY - r * Math.sin(a) };
  }

  /* ---------- draw the gauge once ---------- */
  var gauge = $('gauge');
  var needle;
  (function drawGauge() {
    var svg = '<svg viewBox="0 0 240 150" class="gauge-svg" role="img" aria-label="BMI gauge">';
    SEGMENTS.forEach(function (s) {
      var a = pt(s.from, R), b = pt(s.to, R);
      svg += '<path class="seg ' + s.cls + '" d="M' + a.x.toFixed(2) + ' ' + a.y.toFixed(2) +
        ' A' + R + ' ' + R + ' 0 0 1 ' + b.x.toFixed(2) + ' ' + b.y.toFixed(2) + '" fill="none" stroke-width="16"/>';
    });
    [18.5, 25, 30].forEach(function (v) {
      var a = pt(v, R - 14), b = pt(v, R + 14);
      svg += '<path class="tick" d="M' + a.x.toFixed(2) + ' ' + a.y.toFixed(2) + 'L' + b.x.toFixed(2) + ' ' + b.y.toFixed(2) + '" stroke-width="2"/>';
      var l = pt(v, R + 24);
      svg += '<text class="g-label" x="' + l.x.toFixed(1) + '" y="' + (l.y + 3).toFixed(1) + '" text-anchor="middle">' + v + '</text>';
    });
    svg += '<g class="needle" id="needle"><path d="M' + CX + ' ' + (CY - R + 12) + 'L' + (CX - 5) + ' ' + CY + 'L' + (CX + 5) + ' ' + CY + 'Z"/></g>' +
      '<circle class="hub" cx="' + CX + '" cy="' + CY + '" r="9"/>' +
      '<text class="g-end" x="22" y="140" text-anchor="middle">Low</text><text class="g-end" x="218" y="140" text-anchor="middle">High</text></svg>';
    gauge.innerHTML = svg;
    needle = $('needle');
    needle.style.transform = 'rotate(-90deg)';
  })();

  /* ---------- height units ---------- */
  var unit = $('bmiUnit');
  function syncUnit() {
    var cm = unit.value === 'cm';
    $('cmWrap').hidden = !cm;
    $('ftWrap').hidden = cm;
  }
  unit.addEventListener('change', syncUnit);
  syncUnit();

  /* ---------- maths ---------- */
  var ACTIVITY = { 1.2: 'little exercise', 1.375: 'light exercise', 1.55: 'moderate exercise', 1.725: 'hard exercise' };

  function category(bmi) {
    if (bmi < 18.5) return { key: 'under', label: 'Underweight' };
    if (bmi < 25) return { key: 'normal', label: 'Healthy weight' };
    if (bmi < 30) return { key: 'over', label: 'Overweight' };
    return { key: 'obese', label: 'Obese range' };
  }

  var ADVICE = {
    under: {
      lose: 'You are already on the lighter side, so we would not cut calories. Talk to a trainer about building strength instead.',
      maintain: 'Your weight is a little low. Eat regular meals with enough protein and add strength training to build healthy muscle.',
      gain: 'Great goal! Eat a little more each day, keep protein high and lift 3 to 4 times a week. Slow and steady wins.'
    },
    normal: {
      lose: 'You are in a healthy range already. If you want to look leaner, aim for a very small calorie cut and keep lifting.',
      maintain: 'Lovely! You are in the healthy range. Keep moving, eat balanced meals and sleep well to stay there.',
      gain: 'You are in a healthy range, so a small calorie boost plus strength training is perfect for building muscle.'
    },
    over: {
      lose: 'Small steps work best. Walk daily, lift weights 3 times a week and trim portions a little. You can do this!',
      maintain: 'You are a bit above the healthy range. Staying active and choosing more home-cooked meals will help.',
      gain: 'Building muscle is possible, but a trainer can help you do it without adding extra fat. Ask us for a plan.'
    },
    obese: {
      lose: 'Start gently: daily walks, simple strength moves and fewer sugary drinks. A trainer can build a safe plan for you.',
      maintain: 'Please talk to a doctor or trainer before starting. Gentle, regular movement is a great first step.',
      gain: 'We would suggest building strength while keeping calories steady. A trainer can guide you safely.'
    }
  };

  function readNumber(id) {
    var v = parseFloat($(id).value);
    return isFinite(v) ? v : NaN;
  }

  function showError(msg) {
    var e = $('bmiErr');
    e.textContent = msg || '';
    e.hidden = !msg;
  }

  function calculate() {
    var age = readNumber('bmiAge');
    var kg = readNumber('bmiKg');
    var cm = unit.value === 'cm' ? readNumber('bmiCm') : readNumber('bmiFt') * 30.48 + (readNumber('bmiIn') || 0) * 2.54;
    var sex = (form.querySelector('input[name="bmiSex"]:checked') || {}).value;

    if (!sex) return showError('Please choose Female or Male so we can work out your calories.'), null;
    if (!(age >= 14 && age <= 80)) return showError('Please enter your age (between 14 and 80).'), null;
    if (!(cm >= 120 && cm <= 220)) return showError('Please check your height. It should be between 120 cm (3 ft 11 in) and 220 cm (7 ft 3 in).'), null;
    if (!(kg >= 30 && kg <= 250)) return showError('Please check your weight. It should be between 30 kg and 250 kg.'), null;
    showError('');

    var m = cm / 100;
    var bmi = kg / (m * m);
    var cat = category(bmi);
    var goal = $('bmiGoal').value;
    var factor = parseFloat($('bmiActivity').value);

    var bmr = 10 * kg + 6.25 * cm - 5 * age + (sex === 'male' ? 5 : -161);
    var tdee = bmr * factor;
    var target = goal === 'lose' ? tdee - 450 : goal === 'gain' ? tdee + 350 : tdee;
    var floor = sex === 'male' ? 1500 : 1200;
    target = Math.max(floor, target);

    return {
      bmi: bmi, cat: cat, goal: goal,
      calories: Math.round(target / 10) * 10,
      protein: Math.round(kg * (goal === 'maintain' ? 1.2 : 1.6)),
      low: 18.5 * m * m, high: 24.9 * m * m
    };
  }

  /* ---------- show the result ---------- */
  var tween;
  function countTo(el, to, decimals, ms) {
    if (PF.reduce()) { el.textContent = to.toFixed(decimals); return; }
    cancelAnimationFrame(tween);
    var start = performance.now();
    var from = parseFloat(el.getAttribute('data-v')) || 0;
    (function step(now) {
      var t = Math.min(1, (now - start) / ms);
      var e = 1 - Math.pow(1 - t, 3);
      el.textContent = (from + (to - from) * e).toFixed(decimals);
      if (t < 1) tween = requestAnimationFrame(step);
    })(start);
    el.setAttribute('data-v', to);
  }

  function show(r) {
    var t = (Math.min(MAX, Math.max(MIN, r.bmi)) - MIN) / (MAX - MIN);
    needle.style.transform = 'rotate(' + (t * 180 - 90).toFixed(1) + 'deg)';
    countTo($('bmiValue'), r.bmi, 1, 1100);

    var out = $('bmiResult');
    out.setAttribute('data-cat', r.cat.key);
    out.hidden = false;
    $('gaugeHint').hidden = true;
    $('bmiCat').textContent = r.cat.label;
    $('bmiRange').textContent = r.low.toFixed(0) + ' to ' + r.high.toFixed(0) + ' kg';
    countTo($('calValue'), r.calories, 0, 1100);
    $('proteinValue').textContent = r.protein + ' g';
    $('bmiAdvice').textContent = ADVICE[r.cat.key][r.goal];
    $('gaugeLive').textContent = 'Your BMI is ' + r.bmi.toFixed(1) + '. ' + r.cat.label + '.';
  }

  var calculatedOnce = false;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var r = calculate();
    if (!r) return;
    calculatedOnce = true;
    show(r);
  });

  // After the first result, keep it fresh as the person changes numbers.
  form.addEventListener('input', function () {
    if (!calculatedOnce) return;
    var r = calculate();
    if (r) show(r);
  });
  form.addEventListener('change', function () {
    if (!calculatedOnce) return;
    var r = calculate();
    if (r) show(r);
  });
})();
