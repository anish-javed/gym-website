/* Shared behaviour: menu, icons, hover tilt, flip cards, FAQ, and all GSAP animations.
   Animation rules:
   - nothing is pinned and the page is never paused or slowed while scrolling
   - phones get lighter animations (but keep some movement, only in places that never cover text)
   - visitors with "reduce motion" on get no animation at all */
(function () {
  'use strict';

  /* ---------- basics ---------- */
  PF.hydrateIcons();

  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
  document.querySelectorAll('[data-phone]').forEach(function (el) { el.textContent = PHONE_TEXT; });
  document.querySelectorAll('a[data-tel]').forEach(function (a) { a.setAttribute('href', 'tel:' + PHONE_TEXT.replace(/\s+/g, '')); });
  document.querySelectorAll('[data-logo]').forEach(function (el) { el.innerHTML = PF.logoMark(); });

  // Mobile menu
  var toggle = document.getElementById('navToggle');
  var nav = document.getElementById('siteNav');
  if (toggle && nav) {
    var setMenu = function (open) {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      toggle.innerHTML = PF.icon(open ? 'close' : 'menu');
    };
    setMenu(false);
    toggle.addEventListener('click', function () { setMenu(!nav.classList.contains('is-open')); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  }

  // Mark the current page in the menu
  var page = document.body.getAttribute('data-page');
  document.querySelectorAll('#siteNav a[data-nav]').forEach(function (a) {
    if (a.getAttribute('data-nav') === page) a.setAttribute('aria-current', 'page');
  });

  /* ---------- hover tilt (mouse only; skipped on phones and with reduced motion) ---------- */
  var canTilt = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (canTilt) {
    var cur = null, easeTimer;
    var release = function (el) {
      el.classList.add('tilt-ease');
      el.style.transform = '';
      el.style.removeProperty('--mx');
      el.style.removeProperty('--my');
      setTimeout(function () { el.classList.remove('tilt-ease'); }, 450);
    };
    document.addEventListener('pointermove', function (e) {
      if (PF.reduce() || e.pointerType === 'touch') return;
      var t = e.target.closest ? e.target.closest('.tilt') : null;
      if (t !== cur) {
        if (cur) release(cur);
        cur = t;
        if (cur) {
          cur.classList.add('tilt-ease');
          clearTimeout(easeTimer);
          easeTimer = setTimeout(function () { if (cur) cur.classList.remove('tilt-ease'); }, 160);
        }
      }
      if (!cur) return;
      var r = cur.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      cur.style.transform = 'perspective(900px) translateY(-6px) rotateX(' + ((0.5 - py) * 9).toFixed(2) +
        'deg) rotateY(' + ((px - 0.5) * 11).toFixed(2) + 'deg)';
      cur.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
      cur.style.setProperty('--my', (py * 100).toFixed(1) + '%');
    }, { passive: true });
    document.documentElement.addEventListener('mouseleave', function () {
      if (cur) { release(cur); cur = null; }
    });
  }

  /* ---------- flip cards ---------- */
  var hoverFlips = window.matchMedia && window.matchMedia('(hover: hover)').matches;
  document.querySelectorAll('.flip').forEach(function (card) {
    var flip = function () {
      var on = card.classList.toggle('is-flipped');
      card.setAttribute('aria-pressed', on ? 'true' : 'false');
    };
    card.addEventListener('click', function () { if (!hoverFlips) flip(); });
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); }
    });
    card.addEventListener('blur', function () {
      card.classList.remove('is-flipped');
      card.setAttribute('aria-pressed', 'false');
    });
  });

  /* ---------- FAQ (one open at a time) ---------- */
  var faqs = document.querySelectorAll('.faq details');
  faqs.forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (d.open) faqs.forEach(function (o) { if (o !== d) o.open = false; });
    });
  });

  /* ---------- count-up numbers ---------- */
  var counters = Array.prototype.slice.call(document.querySelectorAll('[data-count]'));
  function fmt(el, v) {
    el.textContent = (el.getAttribute('data-prefix') || '') + Math.round(v).toLocaleString('en-US') + (el.getAttribute('data-suffix') || '');
  }
  function showFinalCounts() {
    counters.forEach(function (el) { fmt(el, parseFloat(el.getAttribute('data-count'))); });
  }
  showFinalCounts();

  /* ---------- GSAP animations ---------- */
  if (!window.gsap) return;               // library did not load: the page simply stays still
  if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  var mm = gsap.matchMedia();
  mm.add({
    desktop: '(min-width: 821px) and (prefers-reduced-motion: no-preference)',
    phone: '(max-width: 820px) and (prefers-reduced-motion: no-preference)',
    reduce: '(prefers-reduced-motion: reduce)'
  }, function (ctx) {
    var c = ctx.conditions;
    if (c.reduce) return;                 // no animation at all

    var light = c.phone;
    var hasST = !!window.ScrollTrigger;
    var trig = function (el, start) {
      return hasST ? { trigger: el, start: start || 'top 92%', once: true } : undefined;
    };

    /* hero entrance */
    var heroBits = gsap.utils.toArray('[data-hero] > *');
    if (heroBits.length) {
      gsap.from(heroBits, { opacity: 0, y: light ? 16 : 34, duration: light ? 0.5 : 0.8, ease: 'power3.out', stagger: 0.09, clearProps: 'transform,opacity' });
    }

    /* floating, slowly rotating dumbbells and kettlebells (hero stage only: never over text) */
    gsap.utils.toArray('.floater').forEach(function (el, i) {
      var inner = el.querySelector('.floater-spin') || el;
      var dir = i % 2 ? -1 : 1;
      var drift = light ? 10 : 18;
      gsap.to(el, { y: (i % 2 ? drift : -drift), x: (i % 3 === 0 ? 6 : -6), duration: 3.2 + i * 0.7, ease: 'sine.inOut', yoyo: true, repeat: -1 });
      gsap.to(inner, { rotation: dir * 360, duration: (light ? 60 : 44) + i * 9, ease: 'none', repeat: -1, transformOrigin: '50% 50%' });
    });

    /* scroll reveals (each item plays once; the page never waits for them) */
    gsap.utils.toArray('[data-reveal]').forEach(function (el) {
      gsap.from(el, { opacity: 0, y: light ? 18 : 40, duration: light ? 0.5 : 0.8, ease: 'power3.out', clearProps: 'transform,opacity', scrollTrigger: trig(el) });
    });
    gsap.utils.toArray('[data-stagger]').forEach(function (group) {
      gsap.from(group.children, {
        opacity: 0, y: light ? 18 : 36, duration: light ? 0.45 : 0.7, ease: 'power3.out',
        stagger: light ? 0.05 : 0.09, clearProps: 'transform,opacity', scrollTrigger: trig(group, 'top 88%')
      });
    });

    /* gentle parallax on the big background word (desktop only, no pinning) */
    if (!light && hasST) {
      gsap.utils.toArray('[data-parallax]').forEach(function (el) {
        gsap.to(el, { yPercent: -18, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
      });
    }

    /* count-up numbers */
    counters.forEach(function (el) {
      var end = parseFloat(el.getAttribute('data-count'));
      var o = { v: 0 };
      fmt(el, 0);
      gsap.to(o, {
        v: end, duration: light ? 1.4 : 2, ease: 'power2.out',
        onUpdate: function () { fmt(el, o.v); },
        onComplete: function () { fmt(el, end); },
        scrollTrigger: trig(el, 'top 94%')
      });
    });

    return function () { showFinalCounts(); };   // runs if the visitor changes the motion setting or resizes
  });

  window.addEventListener('load', function () { if (window.ScrollTrigger) ScrollTrigger.refresh(); });
})();
