// ─── CASERNE 10 MULTISCREEN SYNC v5 (no sound) ───
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

  const STAGED_SLIDES = {
    0: 1,  // Title: 0=center+"From a Street Name"+left, 1=+"to a Catastrophe"+right
    3: 3   // First Caserne: 0=center p1, 1=+chief+helmet, 2=+p2+greatfire, 3=+p3+map
  };

  function getMaxStage(slideIndex) {
    return STAGED_SLIDES[slideIndex] || 0;
  }

  function updateStageVisibility() {
    const slide = slides[current];

    if (STAGED_SLIDES[current] !== undefined && (screenRole === 'left' || screenRole === 'right')) {
      if (slide.classList.contains('stage-hidden')) {
        let revealStage = 1;
        const revealAttr = slide.getAttribute('data-reveal-at');
        if (revealAttr) revealStage = parseInt(revealAttr);
        if (stage >= revealStage) {
          slide.classList.add('revealed');
        } else {
          slide.classList.remove('revealed');
        }
      }
    }

    slide.querySelectorAll('[data-stage-min]').forEach(el => {
      const min = parseInt(el.getAttribute('data-stage-min'));
      const max = el.getAttribute('data-stage-max') ? parseInt(el.getAttribute('data-stage-max')) : 999;
      if (stage >= min && stage <= max) {
        el.style.opacity = '1';
        el.style.pointerEvents = 'auto';
        el.querySelectorAll('.fade-up').forEach(f => {
          f.style.animation = 'none'; f.offsetHeight; f.style.animation = '';
        });
      } else {
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
      }
    });

    const fireOverlay = slide.querySelector('.fire-overlay');
    if (fireOverlay) {
      const min = parseInt(fireOverlay.getAttribute('data-stage-min') || '0');
      fireOverlay.style.display = (stage >= min) ? 'block' : 'none';
    }
  }

  function goTo(index) {
    if (index < 0 || index >= TOTAL) return;

    slides[current].classList.remove('active');
    slides[current].classList.remove('revealed');
    slides[current].querySelectorAll('.fade-up').forEach(el => {
      el.style.animation = 'none'; el.offsetHeight; el.style.animation = '';
    });

    current = index;
    stage = 0;
    slides[current].classList.add('active');

    if (STAGED_SLIDES[current] !== undefined && (screenRole === 'left' || screenRole === 'right')) {
      if (slides[current].classList.contains('stage-hidden')) {
        slides[current].classList.remove('revealed');
      }
    }

    if (counter) counter.textContent = (current + 1) + ' / ' + TOTAL;
    updateStageVisibility();
  }

  function setStage(s) {
    stage = s;
    updateStageVisibility();
  }

  function advance() {
    const maxStage = getMaxStage(current);
    if (stage < maxStage) {
      stage++;
      updateStageVisibility();
      channel.postMessage({ type: 'stage', slide: current, stage: stage });
    } else {
      const next = current + 1;
      goTo(next);
      channel.postMessage({ type: 'goto', index: next });
    }
  }

  function retreat() {
    if (stage > 0) {
      stage--;
      updateStageVisibility();
      channel.postMessage({ type: 'stage', slide: current, stage: stage });
    } else {
      const prev = current - 1;
      if (prev >= 0) {
        goTo(prev);
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
