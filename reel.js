// Ролик: блок «О проекте» уезжает вверх и открывает видео, которое стоит на месте.
// Пока окно приоткрыто — кадр почти чёрный, затемнение уходит до макетного по мере прокрутки.
// Фон — короткая немая петля; это только атмосфера: кнопки плеера и полного просмотра нет.
(function () {
  const reel = document.querySelector('.reel');
  if (!reel) return;
  const card = reel.querySelector('.reel-card');
  const head = card.querySelector('.reel-h');
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  // ── скролл: ролик прибит к окну, видна только та часть, что под секцией ──
  function layout() {
    const r = reel.getBoundingClientRect();
    // окно открылось на долю open: 0 — только показался край, 1 — ролик во весь экран
    const open = clamp(1 - r.top / innerHeight, 0, 1);
    card.style.setProperty('--shade', (0.45 + 0.55 * Math.pow(1 - open, 1.4)).toFixed(3));
    // надпись встаёт, когда окно открыто наполовину
    if (head && !head.classList.contains('is-in') && open > 0.5) head.classList.add('is-in');
  }
  let sq = 0;
  const onScroll = () => { if (!sq) sq = requestAnimationFrame(() => { sq = 0; layout(); }); };
  addEventListener('scroll', onScroll, { passive: true });
  // при плавной прокрутке — в том же кадре, что и сдвиг страницы (см. smooth-scroll.js)
  if (window.kmkScroll && window.kmkScroll.active) window.kmkScroll.onFrame(layout);
  addEventListener('resize', onScroll);
  layout();

  // ── фон: короткая немая петля — на телефоне вертикальная (video/reel-m.mp4, 2.8 с), на компьютере
  // 16:9 (video/reel-d.mp4, 6 с). Плеер Kinescope тянул весь ролик и не всегда успевал прогрузиться.
  // Грузим, когда блок подъезжает к окну, играем, только пока он в экране ──
  const loop = card.querySelector(matchMedia('(max-width: 900px)').matches ? '.reel-m' : '.reel-bg');
  if (!loop) return;
  loop.poster = loop.dataset.poster;
  let loaded = false;
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) {
      if (!loaded) { loaded = true; loop.src = loop.dataset.src; }
      const p = loop.play(); if (p && p.catch) p.catch(() => {});
    } else if (loaded) loop.pause();
  }, { rootMargin: '100% 0px' }).observe(reel);
})();
