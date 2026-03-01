// ─── CASERNE 10 MULTISCREEN SYNC v4 ───
// Generic staging system: any slide can have sub-stages
(function() {
  const slides = document.querySelectorAll('.slide');
  const counter = document.getElementById('slide-counter');
  const TOTAL = slides.length;
  let current = 0;
  let stage = 0;
  const channel = new BroadcastChannel('caserne10-sync');

  const path = window.location.pathname;
  let screenRole = 'unknown';
  if (path.includes('left')) screenRole = 'left';
  else if (path.includes('right')) screenRole = 'right';
  else if (path.includes('center')) screenRole = 'center';

  // Slides with sub-stages: slideIndex -> maxStage
  const STAGED_SLIDES = {
    0: 2,  // Title: 0=center, 1=+left(traffic), 2=+right(fire)
    3: 3   // First Caserne: 0=center p1, 1=+chief+helmet, 2=+p2+greatfire, 3=+p3+map
  };

  // Sound triggers: { slideIndex: { stage: [role, method, args] } }
  const SOUND_TRIGGERS = {
    0: {
      1: ['left', 'playTraffic', [30, 3, 3]],
      2: ['right', 'playFire', [30, 2, 4]]
    },
    5: {
      0: ['left', 'playGregorian', [35, 4, 5]]
    }
  };

  // Fade-out sound before stage 2 on title (traffic→fire crossfade)
  const SOUND_FADEOUTS = {
    0: { 2: 'left' }  // Before stage 2 on slide 0, fade out on left
  };

  function getMaxStage(slideIndex) {
    return STAGED_SLIDES[slideIndex] || 0;
  }

  function updateStageVisibility() {
    const slide = slides[current];

    // Handle stage-hidden slides (left/right initially hidden on staged slides)
    if (STAGED_SLIDES[current] !== undefined && (screenRole === 'left' || screenRole === 'right')) {
      const stageHidden = slide.querySelector('.stage-panel') || slide;
      if (slide.classList.contains('stage-hidden')) {
        // Determine when this screen should reveal
        let revealStage = 1; // default
        const revealAttr = slide.getAttribute('data-reveal-at');
        if (revealAttr) revealStage = parseInt(revealAttr);
        if (stage >= revealStage) {
          slide.classList.add('revealed');
        } else {
          slide.classList.remove('revealed');
        }
      }
    }

    // Show/hide staged elements
    slide.querySelectorAll('[data-stage-min]').forEach(el => {
      const min = parseInt(el.getAttribute('data-stage-min'));
      const max = el.getAttribute('data-stage-max') ? parseInt(el.getAttribute('data-stage-max')) : 999;
      if (stage >= min && stage <= max) {
        el.style.opacity = '1';
        el.style.pointerEvents = 'auto';
        // Trigger fade-up animations on newly revealed elements
        el.querySelectorAll('.fade-up').forEach(f => {
          f.style.animation = 'none'; f.offsetHeight; f.style.animation = '';
        });
      } else {
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
      }
    });

    // Fire animation control
    const fireOverlay = slide.querySelector('.fire-overlay');
    if (fireOverlay) {
      const min = parseInt(fireOverlay.getAttribute('data-stage-min') || '0');
      fireOverlay.style.display = (stage >= min) ? 'block' : 'none';
    }
  }

  function triggerSound() {
    if (!window.sfx) return;
    const slideSounds = SOUND_TRIGGERS[current];
    if (!slideSounds) return;
    const trigger = slideSounds[stage];
    if (!trigger) return;
    const [role, method, args] = trigger;
    if (screenRole === role) {
      window.sfx[method](...args);
    }
  }

  function triggerFadeout() {
    if (!window.sfx) return;
    const fadeouts = SOUND_FADEOUTS[current];
    if (!fadeouts || !fadeouts[stage]) return;
    if (screenRole === fadeouts[stage]) {
      window.sfx.fadeOutAndStop(2);
    }
  }

  function goTo(index) {
    if (index < 0 || index >= TOTAL) return;

    // Stop sounds when changing slides
    if (window.sfx) window.sfx.fadeOutAndStop(1.5);

    slides[current].classList.remove('active');
    slides[current].classList.remove('revealed');
    slides[current].querySelectorAll('.fade-up').forEach(el => {
      el.style.animation = 'none'; el.offsetHeight; el.style.animation = '';
    });

    current = index;
    stage = 0;
    slides[current].classList.add('active');

    // Apply stage-hidden for staged slides on side screens
    if (STAGED_SLIDES[current] !== undefined && (screenRole === 'left' || screenRole === 'right')) {
      if (slides[current].classList.contains('stage-hidden')) {
        slides[current].classList.remove('revealed');
      }
    }

    if (counter) counter.textContent = (current + 1) + ' / ' + TOTAL;

    updateStageVisibility();

    // Auto-trigger stage 0 sounds (like Gregorian on slide 5)
    setTimeout(() => triggerSound(), 500);
  }

  function setStage(s) {
    stage = s;
    triggerFadeout();
    updateStageVisibility();
    setTimeout(() => triggerSound(), screenRole === 'right' ? 1500 : 0);
  }

  function advance() {
    const maxStage = getMaxStage(current);
    if (stage < maxStage) {
      stage++;
      triggerFadeout();
      updateStageVisibility();
      setTimeout(() => triggerSound(), (SOUND_FADEOUTS[current] && SOUND_FADEOUTS[current][stage]) ? 1500 : 0);
      channel.postMessage({ type: 'stage', slide: current, stage: stage });
    } else {
      const next = current + 1;
      goTo(next);
      channel.postMessage({ type: 'goto', index: next });
    }
  }

  function retreat() {
    if (stage > 0) {
      if (window.sfx) window.sfx.fadeOutAndStop(1);
      stage--;
      updateStageVisibility();
      channel.postMessage({ type: 'stage', slide: current, stage: stage });
    } else {
      const prev = current - 1;
      if (prev >= 0) {
        goTo(prev);
        // Jump to max stage of previous slide
        const prevMax = getMaxStage(prev);
        if (prevMax > 0) {
          stage = prevMax;
          updateStageVisibility();
        }
        channel.postMessage({ type: 'goto', index: prev });
      }
    }
  }

  channel.onmessage = (e) => {
    if (e.data.type === 'goto') goTo(e.data.index);
    if (e.data.type === 'stage' && e.data.slide === current) setStage(e.data.stage);
  };

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); advance(); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); retreat(); }
    else if (e.key === 'Home') { goTo(0); channel.postMessage({ type: 'goto', index: 0 }); }
    else if (e.key === 'End') { goTo(TOTAL - 1); channel.postMessage({ type: 'goto', index: TOTAL - 1 }); }
  });

  goTo(0);

  window.syncAdvance = advance;
  window.syncRetreat = retreat;
})();
