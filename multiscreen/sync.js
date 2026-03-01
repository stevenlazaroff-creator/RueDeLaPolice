// ─── CASERNE 10 MULTISCREEN SYNC v3 ───
(function() {
  const slides = document.querySelectorAll('.slide');
  const counter = document.getElementById('slide-counter');
  const TOTAL = slides.length;
  let current = 0;
  let titleStage = 0;
  const TITLE_MAX_STAGE = 2;
  const channel = new BroadcastChannel('caserne10-sync');

  const path = window.location.pathname;
  let screenRole = 'unknown';
  if (path.includes('left')) screenRole = 'left';
  else if (path.includes('right')) screenRole = 'right';
  else if (path.includes('center')) screenRole = 'center';

  // Slides that trigger ambient sound (on any screen that has sfx)
  const SOUND_SLIDES = {
    5: 'gregorian'  // Grey Nuns slide
  };

  function goTo(index) {
    if (index < 0 || index >= TOTAL) return;

    // Stop sounds when leaving a slide
    if (window.sfx) window.sfx.fadeOutAndStop(1.5);

    slides[current].classList.remove('active');
    if (current === 0) {
      slides[0].classList.remove('revealed');
      slides[0].classList.remove('stage-hidden');
    }
    slides[current].querySelectorAll('.fade-up').forEach(el => {
      el.style.animation = 'none'; el.offsetHeight; el.style.animation = '';
    });

    current = index;
    titleStage = 0;
    slides[current].classList.add('active');

    if (current === 0 && (screenRole === 'left' || screenRole === 'right')) {
      slides[0].classList.add('stage-hidden');
    }

    if (counter) counter.textContent = (current + 1) + ' / ' + TOTAL;

    // Trigger slide-specific sounds (on left screen only to avoid doubling)
    if (window.sfx && screenRole === 'left' && SOUND_SLIDES[current]) {
      setTimeout(() => {
        if (SOUND_SLIDES[current] === 'gregorian') window.sfx.playGregorian(35, 4, 5);
      }, 500);
    }
  }

  function handleStage(stage) {
    titleStage = stage;

    if (stage === 1 && screenRole === 'left') {
      slides[0].classList.add('revealed');
      if (window.sfx) window.sfx.playTraffic(30, 3, 3);
    }

    if (stage === 2) {
      // Fade out traffic before fire starts
      if (window.sfx && screenRole === 'left') {
        window.sfx.fadeOutAndStop(2);
      }
      if (screenRole === 'right') {
        slides[0].classList.add('revealed');
        // Delay fire sound slightly so traffic can fade
        if (window.sfx) setTimeout(() => window.sfx.playFire(30, 2, 4), 1500);
      }
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
      if (window.sfx) window.sfx.fadeOutAndStop(1);
      if (titleStage === 2 && screenRole === 'right') slides[0].classList.remove('revealed');
      if (titleStage === 1 && screenRole === 'left') slides[0].classList.remove('revealed');
      titleStage--;
      channel.postMessage({ type: 'stage', slide: 0, stage: titleStage });
    } else {
      const prev = current - 1;
      goTo(prev);
      channel.postMessage({ type: 'goto', index: prev });
    }
  }

  channel.onmessage = (e) => {
    if (e.data.type === 'goto') goTo(e.data.index);
    if (e.data.type === 'stage' && e.data.slide === 0) handleStage(e.data.stage);
  };

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); advance(); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); retreat(); }
    else if (e.key === 'Home') { goTo(0); channel.postMessage({ type: 'goto', index: 0 }); }
    else if (e.key === 'End') { goTo(TOTAL - 1); channel.postMessage({ type: 'goto', index: TOTAL - 1 }); }
  });

  goTo(0);
  if (screenRole === 'left' || screenRole === 'right') slides[0].classList.add('stage-hidden');

  window.syncAdvance = advance;
  window.syncRetreat = retreat;
  window.syncGoTo = function(i) { goTo(i); channel.postMessage({ type: 'goto', index: i }); };
})();
