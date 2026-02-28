// ─── CASERNE 10 MULTISCREEN SYNC ───
// Handles slide navigation, title stage reveals, and sound triggers
// Works via BroadcastChannel — all windows on same origin stay in sync

(function() {
  const slides = document.querySelectorAll('.slide');
  const counter = document.getElementById('slide-counter');
  const TOTAL = slides.length;
  let current = 0;
  let titleStage = 0; // 0 = center only, 1 = left revealed, 2 = right revealed
  const TITLE_MAX_STAGE = 2;

  const channel = new BroadcastChannel('caserne10-sync');

  // Detect which screen this is
  const path = window.location.pathname;
  let screenRole = 'unknown';
  if (path.includes('left')) screenRole = 'left';
  else if (path.includes('right')) screenRole = 'right';
  else if (path.includes('center')) screenRole = 'center';
  else if (path.includes('controller')) screenRole = 'controller';

  function goTo(index) {
    if (index < 0 || index >= TOTAL) return;
    slides[current].classList.remove('active');
    // Reset stage-hidden if leaving title
    if (current === 0) {
      const sh = slides[0];
      sh.classList.remove('revealed');
      sh.classList.remove('stage-hidden');
    }
    slides[current].querySelectorAll('.fade-up').forEach(el => {
      el.style.animation = 'none'; el.offsetHeight; el.style.animation = '';
    });
    current = index;
    titleStage = 0;
    slides[current].classList.add('active');

    // Re-apply stage-hidden for title slide
    if (current === 0 && (screenRole === 'left' || screenRole === 'right')) {
      slides[0].classList.add('stage-hidden');
    }

    if (counter) counter.textContent = (current + 1) + ' / ' + TOTAL;

    // Stop any playing sounds when changing slides
    if (window.sfx) window.sfx.stopAll();
  }

  function handleStage(stage) {
    titleStage = stage;

    if (stage === 1 && screenRole === 'left') {
      slides[0].classList.add('revealed');
      if (window.sfx) window.sfx.playTraffic(10, 2, 4);
    }

    if (stage === 2 && screenRole === 'right') {
      slides[0].classList.add('revealed');
      if (window.sfx) window.sfx.playFire(12, 1.5, 4);
    }
  }

  function advance() {
    if (current === 0 && titleStage < TITLE_MAX_STAGE) {
      titleStage++;
      handleStage(titleStage);
      channel.postMessage({ type: 'stage', slide: 0, stage: titleStage });
    } else {
      const next = current + 1;
      goTo(next);
      channel.postMessage({ type: 'goto', index: next });
    }
  }

  function retreat() {
    if (current === 0 && titleStage > 0) {
      // Undo stages in reverse
      if (titleStage === 2 && screenRole === 'right') {
        slides[0].classList.remove('revealed');
      }
      if (titleStage === 1 && screenRole === 'left') {
        slides[0].classList.remove('revealed');
      }
      titleStage--;
      channel.postMessage({ type: 'stage', slide: 0, stage: titleStage });
      if (window.sfx) window.sfx.stopAll();
    } else {
      const prev = current - 1;
      goTo(prev);
      channel.postMessage({ type: 'goto', index: prev });
    }
  }

  // Listen for sync messages from other windows
  channel.onmessage = (e) => {
    if (e.data.type === 'goto') {
      goTo(e.data.index);
    }
    if (e.data.type === 'stage' && e.data.slide === 0) {
      handleStage(e.data.stage);
    }
  };

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
      e.preventDefault();
      advance();
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      retreat();
    } else if (e.key === 'Home') {
      goTo(0);
      channel.postMessage({ type: 'goto', index: 0 });
    } else if (e.key === 'End') {
      goTo(TOTAL - 1);
      channel.postMessage({ type: 'goto', index: TOTAL - 1 });
    }
  });

  // Initialize
  goTo(0);
  // Apply initial stage-hidden for title
  if (screenRole === 'left' || screenRole === 'right') {
    slides[0].classList.add('stage-hidden');
  }

  // Expose for controller buttons
  window.syncAdvance = advance;
  window.syncRetreat = retreat;
  window.syncGoTo = function(i) { goTo(i); channel.postMessage({ type: 'goto', index: i }); };
  window.getCurrentSlide = function() { return current; };
  window.getTitleStage = function() { return titleStage; };
})();
