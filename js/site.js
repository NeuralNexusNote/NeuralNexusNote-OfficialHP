// NeuralNexusNote — site.js
// Mobile navigation toggle and the screenshot zoom dialog. No dependencies.
(function () {
  'use strict';

  // --- Mobile navigation ---
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // --- Screenshot zoom ---
  var box = document.getElementById('lightbox');
  if (!box || typeof box.showModal !== 'function') return;
  var img = box.querySelector('img');
  var cap = box.querySelector('.lightbox-bar p');

  document.addEventListener('click', function (e) {
    var trigger = e.target.closest('[data-zoom]');
    if (!trigger) return;
    img.src = trigger.getAttribute('data-zoom');
    img.alt = trigger.getAttribute('data-alt') || '';
    cap.textContent = trigger.getAttribute('data-caption') || '';
    box.showModal();
  });
  box.addEventListener('click', function (e) {
    // Close on the close button or on the backdrop (the dialog element itself).
    if (e.target === box || e.target.closest('.lightbox-close')) box.close();
  });
  box.addEventListener('close', function () { img.removeAttribute('src'); });
})();
