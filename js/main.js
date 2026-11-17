/* ==========================================================
   Page behavior: starts the 3D animation, fades things in as
   you scroll, and highlights the current section in the menu.
   ========================================================== */

(function () {
  'use strict';

  var root = document.documentElement;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function ready() { root.classList.add('is-ready'); }

  // show a plain photo instead of the 3D animation
  function usePhoto() {
    root.classList.add('no-webgl');
    var img = document.querySelector('.hero__fallback[data-src]');
    if (img) img.src = img.getAttribute('data-src');
  }

  // ---- 3D dot animation (falls back to a plain photo if it can't run)
  var canvas = document.getElementById('stage');
  if (window.Stage && canvas) {
    window.Stage.init(canvas, { reduced: reduced })
      .then(ready)
      .catch(function (err) {
        if (window.console) console.warn('3D animation is off:', err && err.message);
        usePhoto();
        ready();
      });
  } else {
    usePhoto();
    ready();
  }
  setTimeout(ready, 3500);

  // ---- fade things in when they scroll into view
  var revealEls = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      var shown = 0;
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.style.setProperty('--d', (shown * 0.09) + 's');
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
        shown++;
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.06 });
    revealEls.forEach(function (el) { io.observe(el); });

    // ---- highlight the current section in the menu
    var links = {};
    Array.prototype.forEach.call(document.querySelectorAll('.nav a'), function (a) {
      links[a.getAttribute('href').slice(1)] = a;
    });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var link = links[entry.target.id];
        if (link) link.classList.toggle('is-active', entry.isIntersecting);
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(links).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) spy.observe(el);
    });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
  }

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
