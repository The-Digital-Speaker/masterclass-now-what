/* ============================================================
   SLIDE ENGINE — shared navigation + postMessage bridge
   Used by all episode HTML files.
   ============================================================ */
(function(){
  var slides = document.querySelectorAll('.slide');
  var total = slides.length;
  var current = 0;

  function go(n, d) {
    if (n < 0 || n >= total || n === current) return;
    var oldIdx = current;
    slides[oldIdx].classList.remove('active');
    if (d === 'next') {
      slides[oldIdx].classList.add('exit-left');
      setTimeout(function(){ slides[oldIdx].classList.remove('exit-left'); }, 500);
    }
    // Force re-trigger .animate-in animations so content reappears
    var anims = slides[n].querySelectorAll('.animate-in');
    for (var i = 0; i < anims.length; i++) {
      anims[i].style.animation = 'none';
      void anims[i].offsetHeight; // force reflow
      anims[i].style.animation = '';
    }
    slides[n].classList.add('active');
    current = n;
    prog();
    if (window.parent !== window) {
      window.parent.postMessage({type:'slideChanged', current: current + 1, total: total}, '*');
    }
  }

  function goToSlide(num) {
    var idx = num - 1;
    if (idx < 0 || idx >= total || idx === current) return;
    go(idx, idx > current ? 'next' : 'prev');
  }

  // Expose globally for any onclick attributes in HTML
  window.changeSlide = function(d) { go(current + d, d > 0 ? 'next' : 'prev'); };
  window.goToSlide = goToSlide;

  function prog() {
    var bar = document.getElementById('progress-bar');
    var counter = document.getElementById('slide-counter');
    if (bar) bar.style.width = ((current + 1) / total) * 100 + '%';
    if (counter) counter.textContent = (current + 1) + ' / ' + total;
  }

  // Keyboard nav
  document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); go(current + 1, 'next'); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(current - 1, 'prev'); }
    if (window.parent !== window) window.parent.postMessage({type:'keyNav', key: e.key}, '*');
  });

  // Button nav (skip if buttons already have onclick attributes)
  var nb = document.getElementById('next-btn'), pb = document.getElementById('prev-btn');
  if (nb && !nb.getAttribute('onclick')) nb.addEventListener('click', function(){ go(current + 1, 'next'); });
  if (pb && !pb.getAttribute('onclick')) pb.addEventListener('click', function(){ go(current - 1, 'prev'); });

  // Touch / swipe
  var tx = 0;
  document.addEventListener('touchstart', function(e){ tx = e.changedTouches[0].screenX; });
  document.addEventListener('touchend', function(e){
    var d = tx - e.changedTouches[0].screenX;
    if (Math.abs(d) > 50) { d > 0 ? go(current + 1, 'next') : go(current - 1, 'prev'); }
  });

  /* ── PostMessage bridge (parent ↔ episode iframe) ──────────── */
  window.addEventListener('message', function(e) {
    var msg = e.data;
    if (!msg || !msg.type) return;

    if (msg.type === 'nextSlide') go(current + 1, 'next');
    if (msg.type === 'prevSlide') go(current - 1, 'prev');
    if (msg.type === 'goToSlide' && msg.slide) goToSlide(msg.slide);

    if (msg.type === 'revealElement') {
      var sl = slides[msg.slide - 1];
      if (sl) {
        var el = sl.querySelectorAll('.animate-in')[msg.index];
        if (el) el.style.animation = 'fadeUp 0.6s ease forwards';
      }
    }
    if (msg.type === 'revealAllOnSlide') {
      var sl = slides[msg.slide - 1];
      if (sl) sl.querySelectorAll('.animate-in').forEach(function(el){
        el.style.animation = 'fadeUp 0.6s ease forwards';
      });
    }
    if (msg.type === 'enableStagedMode') {
      for (var i = 0; i < total; i++) {
        slides[i].querySelectorAll('.animate-in').forEach(function(el){
          el.style.animation = 'none';
          el.style.opacity = '0';
          el.style.transform = 'translateY(20px)';
        });
      }
    }
    if (msg.type === 'disableStagedMode') {
      for (var i = 0; i < total; i++) {
        slides[i].querySelectorAll('.animate-in').forEach(function(el){
          el.style.animation = '';
          el.style.opacity = '';
          el.style.transform = '';
        });
      }
      // Re-trigger current slide animations
      slides[current].querySelectorAll('.animate-in').forEach(function(el){
        el.style.animation = 'none';
        void el.offsetHeight;
        el.style.animation = '';
      });
    }
  });

  /* ── Quiz (data-idx pattern) ───────────────────────────────── */
  document.querySelectorAll('.quiz-option').forEach(function(o){
    if (o.getAttribute('onclick')) return; // skip if already has onclick handler
    o.addEventListener('click', function(){
      var q = this.closest('.quiz-question');
      if (!q || q.classList.contains('answered')) return;
      q.classList.add('answered');
      var ci = parseInt(q.dataset.correct), si = parseInt(this.dataset.idx);
      this.classList.add(si === ci ? 'correct' : 'incorrect');
      if (si !== ci) {
        var opts = q.querySelectorAll('.quiz-option');
        if (opts[ci]) opts[ci].classList.add('correct');
      }
    });
  });

  // Tell parent our initial state
  if (window.parent !== window) {
    window.parent.postMessage({type:'slideChanged', current: 1, total: total}, '*');
  }
  prog();
})();
