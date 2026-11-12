// Блоки после первого экрана.
// Всё, что считается от позиции прокрутки, пересчитывается в одном месте (update)
// и в том же кадре, где сдвинулась страница (kmkScroll.onFrame, см. smooth-scroll.js).
// Остальное — на IntersectionObserver и CSS-переходах.
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hover = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const vh = () => innerHeight;
  // телефон и планшет (≤ 900) — вёрстка в одну колонку, см. конец blocks.css
  const mob = matchMedia('(max-width: 900px)');
  const isMob = () => mob.matches;

  // ── заголовки: делим на слова; проявляются из размытия по мере прокрутки (как текст «О проекте») ──
  $$('[data-split]').forEach(el => {
    let i = 0;
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/([ \t\n\r]+)/).forEach(part => {
            if (!part) return;
            if (/^[ \t\n\r]+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'w';
            const s = document.createElement('span'); s.textContent = part; s.style.setProperty('--i', i++);
            w.appendChild(s); frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    walk(el);
    $$('.w', el).forEach(w => w.setAttribute('aria-hidden', 'true'));
  });

  // ── «О проекте»: слова проявляются из размытия по мере прокрутки ──
  const mf = $('[data-blur]');
  let mfWords = [];
  if (mf) {
    const wrapWords = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/([ \t\n\r]+)/).forEach(part => {
            if (!part) return;
            if (/^[ \t\n\r]+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const s = document.createElement('span'); s.className = 'bw'; s.textContent = part;
            frag.appendChild(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) wrapWords(n);
      });
    };
    wrapWords(mf);
    mfWords = $$('.bw', mf);
  }

  // ── кнопки: стрелка из двух SVG (вместо маски) ──
  const AR = '<svg viewBox="0 0 16 16"><path d="M1 8h13M9 3l5 5-5 5"/></svg>';
  $$('.pill-ar').forEach(a => { a.innerHTML = AR + AR; });

  // ── появление по IntersectionObserver ──
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('is-in');
    io.unobserve(e.target);
    if (e.target._onIn) e.target._onIn();
  }), { rootMargin: '0px 0px -12% 0px' });
  $$('[data-reveal],.reviews,.apply,.co-ph').forEach(el => io.observe(el));

  // зачёркивания идут прямо за прокруткой, без таймеров: у каждой строки свой отрезок пути --p 0→1 —
  // линия начинает тянуться, когда верх строки поднялся до 68 % высоты окна, и дочерчена к 38 %.
  // Строки стоят друг под другом, поэтому и зачёркиваются по очереди; скролл назад — стирается
  // «Вместо этого» и описание выпадают по словам сверху вниз из-под маски (как заголовки раньше
  // поднимались снизу) — когда строка зачёркнута на треть; скролл назад убирает их обратно
  const stRows = $$('.st-row');
  stRows.forEach(row => {
    const yes = $('.st-yes', row);
    if (!yes) return;
    let i = 0;
    [...yes.querySelectorAll('*'), yes].forEach(el => [...el.childNodes].forEach(n => {
      if (n.nodeType !== 3 || !n.textContent.trim()) return;
      const frag = document.createDocumentFragment();
      n.textContent.split(/([ \t\n\r]+)/).forEach(part => {
        if (!part) return;
        if (/^[ \t\n\r]+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
        const w = document.createElement('span'); w.className = 'w';
        const s = document.createElement('span'); s.textContent = part; s.style.setProperty('--i', i++);
        w.appendChild(s); frag.appendChild(w);
      });
      n.replaceWith(frag);
    }));
  });
  function stScrub(h) {
    for (const row of stRows) {
      const p = +(reduced ? 1 : clamp((h * .68 - row.getBoundingClientRect().top) / (h * .3), 0, 1)).toFixed(3);
      if (row._p === p) continue;
      row._p = p; row.style.setProperty('--p', p);
      row.classList.toggle('is-yes', p > .3);
    }
  }

  // заголовки: слово i проявляется на своём отрезке длиной SPAN слов, как «О проекте». Отрезок
  // заголовка — пока его верх поднимается с 92 % до 50 % высоты окна; надпись на ролике прибита
  // к окну, её ведёт то, насколько открылось окно ролика
  const heads = $$('[data-split]').map(el => ({ el, words: $$('.w', el), host: el.closest('.reel') }));
  function headScrub(h) {
    const SPAN = 4;
    for (const hd of heads) {
      const r = (hd.host || hd.el).getBoundingClientRect();
      let p = hd.host ? clamp(((1 - r.top / h) - .3) / .5, 0, 1) : clamp((h * .92 - r.top) / (h * .42), 0, 1);
      if (reduced) p = 1;
      if (hd._p === p) continue;
      hd._p = p;
      const N = hd.words.length;
      for (let i = 0; i < N; i++) {
        const t = +clamp((p * (N + SPAN) - i) / SPAN, 0, 1).toFixed(3);
        if (hd.words[i]._t !== t) { hd.words[i]._t = t; hd.words[i].style.setProperty('--t', t); }
      }
    }
  }


  // свет в «Чего у нас нет» переливается, только пока блок на экране
  const ioLive = new IntersectionObserver(es => es.forEach(e =>
    e.target.classList.toggle('is-live', e.isIntersecting)));
  $$('.strike').forEach(el => ioLive.observe(el));

  // ── счётчики ──
  $$('[data-count]').forEach(el => {
    const to = +el.dataset.count;
    if (reduced) return;
    el.textContent = '0';
    const host = el.closest('[data-reveal]');
    host._onIn = () => {
      const t0 = performance.now(), dur = 1600 + to * 4;
      const step = now => {
        const p = clamp((now - t0) / dur, 0, 1);
        el.textContent = Math.round(to * (1 - Math.pow(1 - p, 4)));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
  });

  // ── как проходит интенсив: плашки липнут к центру и наезжают друг на друга ──
  const hwCards = $$('.hw-card');

  // ── фото интенсивов: из темноты во всю ширину → сетка 3×3 уменьшается к центру ──
  const life = $('.life'), lfGrid = $('.lf-grid'), lfDim = $('.lf-dim'), stGlow = $('.st-glow');
  // мягкое ускорение и торможение без рывка посередине (пик скорости ×1.57, у кубической было ×3)
  const ease = t => (1 - Math.cos(Math.PI * t)) / 2;
  let lfW = 0, lfS0 = 1, lfY0 = 0, lfY1 = 0;
  function lfLayout() {
    if (!life) return;
    if (isMob()) {
      // телефон: сетка 3×3 из кадров 3:4 (шаг 2.4 % ширины) — высота сетки 1.3173 её ширины.
      // Финал — во всю колонку и не выше окна под шапкой; старт — центральный кадр накрывает окно целиком
      const barH = bar ? bar.offsetHeight : 0;
      lfW = Math.min(innerWidth - 32, 640, (vh() - barH - 48) / 1.3173);
      const cw = lfW * .3173, ch = cw * 4 / 3;
      lfS0 = Math.max(innerWidth / cw, vh() / ch) * 1.02;
      lfY0 = 0; lfY1 = barH / 2;
      lfGrid.style.setProperty('--rad', '10px');
      life.style.marginBottom = '';
      return;
    }
    // финал: сетка во всю ширину, но помещается между шапкой и низом окна (с полями по 16 px)
    const barH = bar ? bar.offsetHeight : 0;
    lfW = Math.min(innerWidth, (vh() - barH - 32) * 1800 / 866);
    lfY1 = barH / 2;
    // окно выше 16:9 — сетка упирается в ширину и под ней пустеет низ сцены; следующий блок
    // подтягиваем на эту пустоту (оставляя 16 px), иначе между фото и «Форматом» чёрная дыра
    const lfGap = vh() / 2 - lfY1 - lfW * 866 / 1800 / 2 - 16;
    life.style.marginBottom = lfGap > 0 ? -lfGap.toFixed(1) + 'px' : '';
    // старт: центральное фото (582 из 1800) растянуто на всю ширину окна и прижато к верху,
    // чтобы верхний ряд был за краем — первыми открываются фото слева, справа и снизу
    // накрывает окно целиком при любых пропорциях: кадр 582×280 (2.08:1) шире почти любого окна, поэтому тянем и по высоте,
    // иначе под ним виден нижний ряд и сцена стартует «уже раскрытой»
    lfS0 = Math.max(innerWidth / (lfW * 582 / 1800), vh() / (lfW * 280 / 1800)) * 1.02;
    lfY0 = lfW * 280 / 1800 * lfS0 / 2 - vh() / 2;
    lfGrid.style.setProperty('--rad', (16 * lfW / 1800).toFixed(2) + 'px');
  }

  // ── бегущая строка: сама ползёт, скролл её подгоняет ──
  const mqIn = $('.mq-in'), mqRow = $('.mq-row');
  if (mqIn) mqRow.appendChild(mqIn.cloneNode(true)).setAttribute('aria-hidden', 'true');
  const mqItems = $$('.mq-in');
  let mqX = 0, mqVel = -40, mqSV = 0, mqAcc = 0, lastY = scrollY, mqW = 0;

  // ── липкая шапка ──
  const bar = $('.bar'), reel = $('.reel'), stage = $('.stage');
  let dimLast = -1;

  function update() {
    const y = scrollY, h = vh();

    // шапка появляется, когда ролик уехал
    const rb = reel.getBoundingClientRect().bottom;
    // на телефоне — как только «О проекте» накрыл первый экран: там в шапке меню
    bar.classList.toggle('is-on', isMob() ? y > (stage.offsetHeight || h) - 64 : rb < 80);

    // первый экран гаснет под наезжающим «О проекте» (до 85 %, как город на «Байкале»)
    const dim = +(clamp(y / (stage.offsetHeight || 1), 0, 1) * .85).toFixed(3);
    if (dim !== dimLast) { dimLast = dim; stage.style.setProperty('--dim', dim); }

    // «О проекте»: текст начинает проявляться, когда верх абзаца на 70 % высоты окна,
    // и проявлен целиком, когда он поднялся до 25 %. Слово i проявляется на своём
    // отрезке длиной SPAN слов — соседние перекрываются, фронт идёт мягкой волной
    if (mfWords.length) {
      const r = mf.getBoundingClientRect();
      const p = reduced ? 1 : clamp((h * .7 - r.top) / (h * .45), 0, 1);
      const N = mfWords.length, SPAN = 7;
      for (let i = 0; i < N; i++) {
        const t = +clamp((p * (N + SPAN) - i) / SPAN, 0, 1).toFixed(3);
        if (mfWords[i]._t !== t) { mfWords[i]._t = t; mfWords[i].style.setProperty('--t', t); }
      }
    }

    // стопка плашек: --t у плашки — сколько пути уже прошла следующая до места прилипания
    // (путь = расстояние между верхами плашек в потоке)
    for (let i = 0; i < hwCards.length - 1; i++) {
      const cur = hwCards[i], next = hwCards[i + 1];
      const stick = parseFloat(getComputedStyle(cur).top);
      const d = cur.offsetHeight + parseFloat(getComputedStyle(next).marginTop);
      const nt = next.getBoundingClientRect().top;
      // первую треть пути следующей плашки текущая не трогается, дальше эффект набирается плавно
      const k = clamp(((stick + d - nt) / d - .35) / .65, 0, 1);
      const t = +(k * k * (3 - 2 * k)).toFixed(3);
      if (hwCards[i]._t !== t) { hwCards[i]._t = t; hwCards[i].style.setProperty('--t', t); }
    }

    // фото интенсивов
    if (life) {
      const r = life.getBoundingClientRect();
      // вход: верх секции идёт от низа окна к верху — фото проступает, свет выше гаснет
      const e = clamp(1 - r.top / h, 0, 1);
      // липкая часть: сетка уменьшается от lfS0 до 1
      const t = clamp(-r.top / Math.max(1, r.height - h), 0, 1);
      // ширина сетки: от lfS0 (центральное фото во всю ширину) до финальной
      const k = ease(t), s = lfS0 + (1 - lfS0) * k;
      lfGrid.style.setProperty('--W', (lfW * s).toFixed(1) + 'px');
      lfGrid.style.setProperty('--y', (lfY0 + (lfY1 - lfY0) * k).toFixed(1) + 'px');
      lfDim.style.setProperty('--dim', (.9 * Math.pow(1 - e, 1.3)).toFixed(3));
      if (stGlow) stGlow.style.opacity = (1 - clamp((e - .15) / .75, 0, 1)).toFixed(3);
    }

    stScrub(h);
    headScrub(h);
    geoScrub(h);

    mqAcc += y - lastY;
    lastY = y;
  }

  // бегущая строка крутится своим циклом: сама ползёт влево 40 px/с, прокрутка подгоняет её в свою сторону.
  // Толчков нет: скорость прокрутки (px/с) сглаживается, строка плавно тянется к целевой скорости,
  // при прокрутке вверх разворачивается через ноль, а не перескоком
  const MQ_BASE = 40, MQ_GAIN = .75, MQ_MAX = 1200;
  let mqT = performance.now();
  function mqTick(now) {
    const dt = Math.min(.05, (now - mqT) / 1000); mqT = now;
    if (!mqW) mqW = mqItems[0].offsetWidth;
    if (dt > 0) {
      mqSV += (mqAcc / dt - mqSV) * (1 - Math.exp(-dt * 8));
      mqAcc = 0;
    }
    const vt = clamp(-MQ_BASE - mqSV * MQ_GAIN, -MQ_MAX, MQ_MAX);
    mqVel += (vt - mqVel) * (1 - Math.exp(-dt * 4));
    mqX += mqVel * dt;
    if (mqX <= -mqW) mqX += mqW;
    if (mqX > 0) mqX -= mqW;
    const t = `translate3d(${mqX.toFixed(2)}px,0,0)`;
    mqItems.forEach(el => el.style.transform = t);
    requestAnimationFrame(mqTick);
  }
  if (mqItems.length && !reduced && !isMob()) requestAnimationFrame(mqTick);   // на телефоне строки нет (mobile.css)

  // ── география: дуги тянутся к Петербургу по мере прокрутки. Дальние стартуют первыми
  // (рендер уже отсортировал их по длине), точка региона зажигается, когда дуга тронулась.
  // Старт — верх карты на 85 % окна, финал — чуть раньше, чем карта встанет посередине ──
  const geo = $('.geo-map'), geoSvg = geo && $('svg', geo);
  const geoArcs = geo ? $$('.geo-arc', geo) : [], geoDots = geo ? $$('.geo-dot', geo) : [];
  const geoCnt = $('.geo-cnt'), geoTotal = geoCnt ? +geoCnt.dataset.to || 0 : 0;
  let geoP = -1, geoN = -1;
  // телефон: карта — неподвижная картинка в финальном виде (все дуги и точки), собранная из того же SVG,
  // что отдал рендер: регионы из админки попадают и сюда. Картинку браузер рисует один раз — никаких
  // пересчётов дуг на прокрутке, импульсов и касаний
  const geoStill = !!geoSvg && isMob();
  if (geoStill) {
    const NS = 'http://www.w3.org/2000/svg', c = geoSvg.cloneNode(true), [, , vw, vhh] = c.getAttribute('viewBox').split(' ');
    const pl = c.querySelector('.geo-pulses'); if (pl) pl.remove();
    const st = document.createElementNS(NS, 'style');
    st.textContent = '.geo-land path{fill-rule:evenodd}.t0{fill:#37250f}.t1{fill:#1f180d}.t2{fill:#d0a161}' +
      '.geo-arc{fill:none;stroke-width:1.25;opacity:.31}.geo-dot,.geo-hubdot{fill:#fbf4e3}';
    c.insertBefore(st, c.firstChild);
    c.setAttribute('xmlns', NS); c.setAttribute('width', vw); c.setAttribute('height', vhh);
    const img = new Image();
    img.className = 'geo-svg'; img.alt = geoSvg.getAttribute('aria-label') || ''; img.decoding = 'async';
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(c));
    geoSvg.replaceWith(img);
  }
  if (geoCnt && !reduced && !geoStill) geoCnt.textContent = '0';
  function geoScrub(h) {
    if (!geo || geoStill) return;
    const r = geo.getBoundingClientRect();
    const p = reduced ? 1 : +clamp((h * .85 - r.top) / (h * .75 - (h - r.height) / 2), 0, 1).toFixed(3);
    if (p === geoP) return;
    geoP = p;
    // телефон: карта шире окна и едет с востока к Петербургу, пока дуги тянутся (дальние стартуют первыми)
    if (isMob()) {
      const z = parseFloat(getComputedStyle(geo).getPropertyValue('--gz')) || 1;
      const over = Math.max(0, geo.offsetWidth * z - geo.parentElement.clientWidth);
      const k = p * p * (3 - 2 * p);
      geo.style.setProperty('--gx', (-over * (1 - k)).toFixed(1) + 'px');
    } else geo.style.removeProperty('--gx');
    const N = geoArcs.length, SPAN = .32;
    for (let i = 0; i < N; i++) {
      const s = N > 1 ? i / (N - 1) * (1 - SPAN) : 0;
      const k = clamp((p - s) / SPAN, 0, 1), e = 1 - Math.pow(1 - k, 3);
      // пунктир в настоящих единицах длины дуги; долетевшая — сплошная, без пунктира вовсе
      const arc = geoArcs[i], L = arc._L || (arc._L = arc.getTotalLength());
      const off = k >= 1 ? -1 : +(L * (1 - e)).toFixed(2);
      if (arc._o !== off) {
        arc._o = off;
        arc.style.strokeDasharray = off < 0 ? 'none' : L + ' ' + L;
        arc.style.strokeDashoffset = off < 0 ? 0 : off;
      }
      geoDots[i].classList.toggle('is-lit', k > 0);
    }
    // счёт — все отмеченные регионы, не только те, от которых есть дуга
    const n = Math.round(geoTotal * (1 - Math.pow(1 - p, 2)));
    if (geoCnt && !reduced && n !== geoN) { geoN = n; geoCnt.textContent = n; }
    if (p >= 1) geoPulseStart();
  }

  // ── импульс: изредка по одной дуге к Петербургу пробегает свечение. Это не шарик, а сама линия
  // вспыхивает на отрезке: несколько штрихов той же ширины, что и дуга, с общей головой —
  // короткий яркий впереди, длинные тусклые позади. Хвост целиком уходит в Петербург ──
  const PULSE = [[120, .16], [64, .32], [30, .6], [11, 1]];
  const geoPulses = geo && $('.geo-pulses', geo);
  // импульсы — в своём SVG поверх карты, на своём слое: иначе каждый их кадр перерисовывал всю карту вместе
  // с ~80 светящимися точками (у каждой фильтр из четырёх теней), и прокрутка мимо карты подлагивала
  if (geoPulses && !geoStill) {
    const ov = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    ov.setAttribute('viewBox', geoSvg.getAttribute('viewBox'));
    if (geoSvg.getAttribute('preserveAspectRatio')) ov.setAttribute('preserveAspectRatio', geoSvg.getAttribute('preserveAspectRatio'));
    ov.setAttribute('class', 'geo-svg geo-ov');
    ov.setAttribute('aria-hidden', 'true');
    ov.appendChild(geoPulses);
    geoSvg.after(ov);
  }
  let pulseOn = false, pulseSeen = false, pulseT = 0, pulseLast = -1;
  function geoPulseStart() {
    if (pulseOn || reduced || !geoPulses || !geoArcs.length || !geoPulses.animate) return;
    pulseOn = true;
    new IntersectionObserver(([e]) => {
      pulseSeen = e.isIntersecting;
      clearTimeout(pulseT);
      if (pulseSeen) pulseT = setTimeout(geoPulse, 900);
    }).observe(geo);
  }
  function geoPulse() {
    if (!pulseSeen) return;
    let i = Math.floor(Math.random() * geoArcs.length);
    if (i === pulseLast && geoArcs.length > 1) i = (i + 1) % geoArcs.length;
    pulseLast = i;
    pulseRun(i, () => { clearTimeout(pulseT); pulseT = setTimeout(geoPulse, 2600 + Math.random() * 3400); });
  }
  // один проход по дуге i; скорость от длины, чтобы короткие не мелькали, а длинные не тянулись
  function pulseRun(i, done) {
    const arc = geoArcs[i];
    if (!geoPulses || !geoPulses.animate || arc._run) return;
    arc._run = true;
    const L = arc._L || (arc._L = arc.getTotalLength()), run = L + PULSE[0][0];
    const dur = 1500 + L * 2.2, NS = 'http://www.w3.org/2000/svg';
    let left = PULSE.length;
    PULSE.forEach(([s, o]) => {
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', arc.getAttribute('d'));
      p.setAttribute('stroke', '#f6ddb0');
      p.setAttribute('stroke-opacity', o);
      p.style.strokeDasharray = s + ' ' + (L + 400);
      p.style.strokeDashoffset = s;
      geoPulses.appendChild(p);
      p.animate([{ strokeDashoffset: s }, { strokeDashoffset: s - run }],
        { duration: dur, easing: 'cubic-bezier(.45,.05,.4,1)', fill: 'forwards' }).onfinish = () => {
        p.remove();
        if (--left === 0) { arc._run = false; if (done) done(); }
      };
    });
  }

  // ── наведение на карту: субъект чуть светлеет; если оттуда приезжали — его дуга разгорается,
  // точка подрастает, над ней подпись, и по дуге сразу уходит импульс в Петербург ──
  if (geoSvg && !geoStill) {
    const pin = $('.geo-pin', geo), [, , VW, VH] = geoSvg.getAttribute('viewBox').split(' ').map(Number);
    const landBy = new Map();
    $$('.geo-land path', geo).forEach(p => { const n = p.dataset.n; if (n) (landBy.get(n) || landBy.set(n, []).get(n)).push(p); });
    let hot = null, hotEls = [];
    const show = (n, dot) => {
      if (hot === n && !dot) return;
      hotEls.forEach(e => e.classList.remove('is-hot'));
      hot = n; hotEls = [];
      if (!n) { pin.classList.remove('is-on'); return; }
      hotEls.push(...(landBy.get(n) || []));
      const idx = geoArcs.map((a, i) => a.dataset.n === n ? i : -1).filter(i => i >= 0);
      idx.forEach(i => hotEls.push(geoArcs[i], geoDots[i]));
      hotEls.forEach(e => e.classList.add('is-hot'));
      const d = dot || geoDots[idx[0]];
      if (!d) { pin.classList.remove('is-on'); return; }
      const x = +d.getAttribute('cx') / VW;
      pin.textContent = d.dataset.t;
      pin.style.left = x * 100 + '%'; pin.style.top = +d.getAttribute('cy') / VH * 100 + '%';
      pin.style.setProperty('--ax', x > .8 ? 'calc(-100% + 2.4rem)' : x < .2 ? '-2.4rem' : '-50%');
      pin.classList.add('is-on');
      if (!reduced) pulseRun(geoDots.indexOf(d));
    };
    const pick = e => {
      const t = e.target, n = t.dataset && t.dataset.n;
      show(n || null, t.classList.contains('geo-dot') ? t : null);
    };
    if (hover) {
      geoSvg.addEventListener('pointerover', pick);
      geoSvg.addEventListener('pointerleave', () => show(null));
    } else {
      // на телефоне — касанием: регион подсвечивается и подписывается, касание мимо карты убирает подпись
      geoSvg.addEventListener('click', pick);
      document.addEventListener('click', e => { if (!geoSvg.contains(e.target)) show(null); });
    }
  }

  let sq = 0;
  addEventListener('scroll', () => { if (!sq) sq = requestAnimationFrame(() => { sq = 0; update(); }); }, { passive: true });
  if (window.kmkScroll && window.kmkScroll.active) window.kmkScroll.onFrame(update);
  addEventListener('resize', () => { lfLayout(); mqW = 0; update(); });
  addEventListener('load', () => { lfLayout(); update(); });
  lfLayout(); update();

  // ── интенсивы: аккордеон. Первый пункт раскрывается сам, когда верх списка поднялся
  // до 70 % высоты окна — один раз и только если посетитель ещё ничего не открывал сам ──
  const rows = $$('.in-row');
  const setOpen = row => {
    rows.forEach(r => {
      const on = r === row;
      r.classList.toggle('is-open', on);
      $('.in-head', r).setAttribute('aria-expanded', on);
    });
    setTimeout(update, 950);
  };
  let inTouched = false;
  // телефон: пока соседний пункт сворачивается, а этот раскрывается (0.9 с), держим нажатую строку на месте —
  // иначе её уносит вверх за экран. Если строка была в нижней половине окна, за то же время плавно
  // поднимаем её под шапку, чтобы раскрытое содержимое оказалось в экране
  const holdInView = head => {
    const barH = bar ? bar.offsetHeight : 0, y0 = head.getBoundingClientRect().top;
    const goal = y0 > innerHeight * .45 ? barH + 16 : Math.max(y0, barH + 16), t0 = performance.now(), T = 950;
    const step = now => {
      const k = Math.min(1, (now - t0) / T), e = ease(k);
      const d = head.getBoundingClientRect().top - (y0 + (goal - y0) * e);
      if (Math.abs(d) > .5) window.scrollBy({ top: d, behavior: 'instant' });
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  rows.forEach(row => $('.in-head', row).addEventListener('click', () => {
    inTouched = true;
    const opening = !row.classList.contains('is-open');
    setOpen(opening ? row : null);
    if (isMob()) holdInView($('.in-head', row));
  }));
  const inList = $('.in-list');
  if (inList) {
    const ioIn = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      ioIn.disconnect();
      if (!inTouched) setOpen(rows[0]);
    }, { rootMargin: '0px 0px -30% 0px' });
    ioIn.observe(inList);
    // ссылка на блок ниже списка («Компаниям», «Эксперты», «Записаться»…): по пути первый пункт сам не раскрываем —
    // раскрытие сдвигает всё ниже на высоту пункта, и плавная прокрутка приезжала на 360–560 px выше начала блока
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href^="#"]');
      if (!a || inTouched || a.getAttribute('href').length < 2) return;
      const t = document.getElementById(a.getAttribute('href').slice(1));
      if (t && t.getBoundingClientRect().top >= inList.getBoundingClientRect().bottom - 2) inTouched = true;
    }, true);
  }

  // ── отзывы: перетаскивание, стрелки, счётчик, видео в окне ──
  const strip = $('.rv-strip');
  if (strip) {
    const cards = $$('.rv', strip), cnt = $('.rv-cnt b');
    cards.forEach((c, i) => c.style.setProperty('--d', (i * .07) + 's'));
    const stepW = () => cards[0].offsetWidth + parseFloat(getComputedStyle($('.rv-track')).columnGap || 20);
    // прокрутка по времени: стрелка листает на 3 отзыва с плавным разгоном и торможением,
    // повторный клик во время хода продолжает от уже заданной цели
    const PAGE = 3;
    let target = 0, raf = 0, tw = null;
    const inOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const outCubic = t => 1 - Math.pow(1 - t, 3);
    const go = (x, dur = 1100, ease = inOut) => {
      target = clamp(x, 0, strip.scrollWidth - strip.clientWidth);
      tw = { from: strip.scrollLeft, to: target, t0: performance.now(), dur, ease };
      strip.classList.add('is-glide');   // доводка до карточки на телефоне не должна спорить с анимацией
      if (!raf) raf = requestAnimationFrame(glide);
    };
    function glide(now) {
      const k = Math.min(1, (now - tw.t0) / tw.dur);
      strip.scrollLeft = tw.from + (tw.to - tw.from) * tw.ease(k);
      raf = k < 1 ? requestAnimationFrame(glide) : 0;
      if (!raf) strip.classList.remove('is-glide');
    }
    const page = dir => {
      const base = raf ? target : strip.scrollLeft;
      go(Math.round(base / stepW() + dir * PAGE) * stepW());
    };
    $('.rv-prev').addEventListener('click', () => page(-1));
    $('.rv-next').addEventListener('click', () => page(1));
    strip.addEventListener('scroll', () => {
      const i = clamp(Math.round(strip.scrollLeft / stepW()), 0, cards.length - 1);
      const end = strip.scrollLeft >= strip.scrollWidth - strip.clientWidth - 2;
      cnt.textContent = String(end ? cards.length : i + 1).padStart(2, '0');
    }, { passive: true });

    // тянем мышью, отпускаем — лента докатывается по инерции
    let drag = null;
    strip.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse' || e.button) return;
      drag = { x: e.clientX, s: strip.scrollLeft, v: 0, t: performance.now(), lx: e.clientX, moved: false };
    });
    addEventListener('pointermove', e => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) > 5) { drag.moved = true; strip.classList.add('is-drag'); }
      if (!drag.moved) return;
      const now = performance.now();
      drag.v = (e.clientX - drag.lx) / Math.max(1, now - drag.t); drag.lx = e.clientX; drag.t = now;
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      strip.scrollLeft = drag.s - dx;
    });
    addEventListener('pointerup', () => {
      if (!drag) return;
      if (drag.moved) go(strip.scrollLeft - drag.v * 380, 800, outCubic);
      setTimeout(() => strip.classList.remove('is-drag'), 0);
      drag = null;
    });

    // немое превью на наведении: крошечный клип (~60 КБ) создаётся при первом наведении,
    // а карточкам в кадре ленты подгружается заранее, пока браузер свободен
    const prevOf = c => {
      if (c._pv || !c.dataset.prev) return c._pv;
      const v = c._pv = document.createElement('video');
      v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto';
      v.setAttribute('muted', ''); v.src = c.dataset.prev;
      v.addEventListener('error', () => c.classList.remove('is-prev'));
      c.querySelector('img').after(v);
      return v;
    };
    if (hover && !reduced) {
      cards.forEach(c => {
        c.addEventListener('pointerenter', () => {
          const v = prevOf(c); if (!v) return;
          c.classList.add('is-prev');
          v.play().catch(() => {});
        });
        c.addEventListener('pointerleave', () => {
          c.classList.remove('is-prev');
          if (c._pv) setTimeout(() => { if (!c.classList.contains('is-prev')) c._pv.pause(); }, 450);
        });
      });
      const idle = window.requestIdleCallback || (f => setTimeout(f, 200));
      const warm = new IntersectionObserver(es => es.forEach(e => {
        if (e.isIntersecting) { warm.unobserve(e.target); idle(() => prevOf(e.target)); }
      }), { root: strip, rootMargin: '0px 30% 0px 0px' });
      new IntersectionObserver((es, o) => {
        if (es[0].isIntersecting) { o.disconnect(); cards.forEach(c => warm.observe(c)); }
      }, { rootMargin: '0px 0px 30% 0px' }).observe(strip);
    }

    const modal = $('.kv-modal'), box = $('.kv-box');
    const close = () => {
      if (!modal.classList.contains('is-open')) return;
      modal.classList.remove('is-open'); box.innerHTML = '';
      document.documentElement.classList.remove('is-locked');
    };
    cards.forEach(c => c.addEventListener('click', () => {
      // свой mp4 — вертикальный плеер; Kinescope — как было, во фрейме
      const src = c.dataset.src;
      box.classList.toggle('is-v', !!src);
      box.innerHTML = src
        ? `<video src="${src}" poster="${c.querySelector('img').getAttribute('src')}" controls autoplay playsinline preload="auto"></video>`
        : `<iframe src="https://kinescope.io/embed/${c.dataset.kin}?autoplay=1" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen></iframe>`;
      modal.classList.add('is-open');
      document.documentElement.classList.add('is-locked');
    }));
    $('.kv-close').addEventListener('click', close);
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  }


  // ── MAX по номеру телефона: у мессенджера нет ссылки на номер (как wa.me), поэтому значок открывает окошко
  //    с номером — скопировать и найти в MAX; без JS ссылка просто ведёт в веб-версию MAX ──
  const mxLinks = $$('a[data-max]');
  if (mxLinks.length) {
    const pop = document.createElement('div');
    pop.className = 'mx-pop';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-modal', 'true');
    pop.setAttribute('aria-label', 'Написать в MAX');
    pop.innerHTML = '<div class="mx-box"><button class="mx-x" type="button" aria-label="Закрыть">×</button>' +
      '<p class="mx-t">Напишите нам в&nbsp;MAX</p><p class="mx-s">Найдите нас в MAX по номеру телефона:</p>' +
      '<a class="mx-num" href=""></a><div class="mx-act"><button class="mx-copy" type="button">Скопировать номер</button>' +
      '<a class="mx-open" href="https://web.max.ru/" target="_blank" rel="noopener">Открыть MAX</a></div></div>';
    document.body.append(pop);
    const num = $('.mx-num', pop), copy = $('.mx-copy', pop);
    const shut = () => {
      if (!pop.classList.contains('is-open')) return;
      pop.classList.remove('is-open');
      if (!document.documentElement.classList.contains('is-menu')) document.documentElement.classList.remove('is-locked');
    };
    mxLinks.forEach(a => a.addEventListener('click', e => {
      e.preventDefault();
      num.textContent = a.dataset.max;
      num.href = 'tel:' + a.dataset.tel;
      copy.textContent = 'Скопировать номер';
      pop.classList.add('is-open');
      // значок в меню телефона: меню закрывается тем же кликом и снимает блокировку — ставим её после
      setTimeout(() => document.documentElement.classList.add('is-locked'));
      copy.focus({ preventScroll: true });
    }));
    copy.addEventListener('click', () => {
      const t = num.href.replace(/^tel:/, '');
      const done = () => { copy.textContent = 'Номер скопирован'; };
      if (navigator.clipboard && isSecureContext) navigator.clipboard.writeText(t).then(done, () => {});
      else {
        const r = document.createRange(); r.selectNodeContents(num);
        const s = getSelection(); s.removeAllRanges(); s.addRange(r);
        try { document.execCommand('copy'); done(); } catch (_) {}
      }
    });
    $('.mx-x', pop).addEventListener('click', shut);
    pop.addEventListener('click', e => { if (e.target === pop) shut(); });
    addEventListener('keydown', e => { if (e.key === 'Escape') shut(); });
  }

  // ── заявка: выбор интенсива из кнопок, маска телефона, отправка ──
  $$('[data-pick]').forEach(a => a.addEventListener('click', () => {
    const box = $$('.ap-int input').find(i => i.value === a.dataset.pick);
    if (box) box.checked = true;
  }));
  // формы: заявка внизу страницы и смета «Для компаний» — маска телефона, проверка и отправка общие
  const forms = $$('.ap-form, .co-form');
  // поле почты: пусто — можно (если не обязательное), заполнено — должно быть похоже на адрес
  const badMail = v => v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  // телефон: код страны стоит перед полем (Россия и Казахстан +7 — 10 цифр (000) 000 00 00, Беларусь +375 — 9 цифр
  // (00) 000 00 00); вставленный номер с кодом или 8 в начале срезается до своего
  const FLAGS = {
    ru: '<path fill="#EEE" d="M16 2.5H2a2 2 0 0 0-2 2v2h18v-2a2 2 0 0 0-2-2z"/><path fill="#22408C" d="M0 6.5h18v5H0z"/><path fill="#CE2028" d="M18 13.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2h18z"/>',
    by: '<path fill="#C8313E" d="M16 2.5H2a2 2 0 0 0-2 2v6.2h18V4.5a2 2 0 0 0-2-2z"/><path fill="#4AA657" d="M0 10.7h18v2.8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2z"/><path fill="#FFF" d="M2 2.5h1.4v13H2a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2z"/><path fill="#C8313E" d="M.7 4.2h1.9v1.1H.7zm0 3h1.9v1.1H.7zm0 3h1.9v1.1H.7zm0 3h1.9v1.1H.7z"/>',
    kz: '<path fill="#00ABC2" d="M16 2.5H2a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2z"/><circle cx="9.6" cy="8" r="2.3" fill="#FEC50C"/><path fill="#FEC50C" d="M6.4 11.3c1 .8 5.4.8 6.4 0l-.5.9c-1.3.6-4.1.6-5.4 0zM1.3 3.9h.8v10.2h-.8z"/>'
  };
  const CC = { ru: { code: '+7', g: [3, 3, 2, 2], strip: /^[78]/ }, by: { code: '+375', g: [2, 3, 2, 2], strip: /^(375|80)/ }, kz: { code: '+7', g: [3, 3, 2, 2], strip: /^[78]/ } };
  const ccOf = inp => CC[inp.dataset.country || 'ru'];
  const telMask = (v, inp) => {
    const c = ccOf(inp), n = c.g.reduce((a, b) => a + b, 0);
    let d = v.replace(/\D/g, '');
    if (d.length > n && c.strip.test(d)) d = d.replace(c.strip, '');
    d = d.slice(0, n);
    const p = []; let i = 0; c.g.forEach(k => { p.push(d.slice(i, i + k)); i += k; });
    return !d ? '' : d.length <= c.g[0] ? '(' + p[0] : '(' + p[0] + ') ' + p.slice(1).filter(Boolean).join(' ');
  };
  $$('.ap-ccsel').forEach(sel => sel.addEventListener('change', () => {
    const box = sel.closest('.ap-tel'), inp = $('input[data-cc]', box), c = CC[sel.value];
    $('.ap-cc svg', box).innerHTML = FLAGS[sel.value];
    $('.ap-cc b', box).textContent = c.code;
    inp.dataset.country = sel.value; inp.dataset.cc = c.code;
    inp.placeholder = '(' + '0'.repeat(c.g[0]) + ') ' + c.g.slice(1).map(k => '0'.repeat(k)).join(' ');
    inp.value = telMask(inp.value, inp);
    box.classList.remove('is-bad');
    inp.focus();
  }));
  forms.forEach(form => form.addEventListener('input', e => {
    // при стирании маску не навязываем — только срезаем хвостовые скобки и пробелы, иначе «)» не стереть
    const t = e.target;
    if (t.dataset.cc) t.value = /^delete/.test(e.inputType || '') ? t.value.replace(/\D+$/, '') : telMask(t.value, t);
    const f = e.target.closest('.ap-f,.ap-opt,.ap-chk,.ap-agree');
    if (f) f.classList.remove('is-bad');
  }));
  forms.forEach(form => form.addEventListener('submit', e => {
    e.preventDefault();
    let ok = true;
    $$('.ap-f', form).forEach(f => {
      const inp = $('input,textarea', f), v = inp.value.trim();
      const digits = v.replace(/\D/g, '').length;
      const bad = (inp.required && !v) || (inp.type === 'tel' && v && (inp.dataset.cc ? digits !== ccOf(inp).g.reduce((a, b) => a + b, 0) : digits < 6)) || (inp.type === 'email' && badMail(v));
      f.classList.toggle('is-bad', bad);
      if (bad) ok = false;
    });
    // выбор варианта и галочка: обязательные — хотя бы что-то отмечено
    $$('.ap-opt[data-req],.ap-chk[data-req],.ap-agree', form).forEach(f => {
      const bad = !$('input:checked', f);
      f.classList.toggle('is-bad', bad);
      if (bad) ok = false;
    });
    if (!ok) { const first = $('.is-bad input,.is-bad textarea', form); if (first) first.focus(); return; }
    if (form.classList.contains('is-busy')) return;
    // заявку принимает send.php и рассылает туда, куда указано в админке (почта, Telegram, CRM)
    const data = new FormData(form);
    $$('[data-cc]', form).forEach(i => { if (i.value.trim()) data.set(i.name, i.dataset.cc + ' ' + i.value.trim()); });
    if (form._data) form._data(data);
    data.append('t', Math.round((performance.now() - formT0) / 1000));
    form.classList.remove('is-err');
    form.classList.add('is-busy');
    fetch(form.action, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(res => {
        if (!res || !res.ok) return Promise.reject();
        form.classList.add('is-sent');
        // цель Метрики «lead» — любая заявка; «lead_corp» — отдельно заявки компаний
        if (window.ym && window.KMK_YM) {
          window.ym(window.KMK_YM, 'reachGoal', 'lead');
          if (form.classList.contains('co-form')) window.ym(window.KMK_YM, 'reachGoal', 'lead_corp');
        }
        if (form._sent) form._sent();
      })
      .catch(() => form.classList.add('is-err'))
      .finally(() => form.classList.remove('is-busy'));
  }));
  const formT0 = performance.now();

  // ── для компаний: темы галочками → дни, стоимость, скидка от двух тем. Итог «бежит» к новому
  // значению. На телефоне, пока листают темы, а смета ещё ниже, внизу экрана — панель с итогом ──
  const co = $('.co-form');
  if (co) {
    const NB = ' ';
    const day = +co.dataset.day || 0, d2 = +co.dataset.d2 || 0, d3 = +co.dataset.d3 || d2;
    const boxes = $$('.co-row input', co);
    const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, NB);
    const pl = (n, f) => f[n % 10 === 1 && n % 100 !== 11 ? 0 : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2];
    const TEM = ['тема', 'темы', 'тем'], DNI = ['день', 'дня', 'дней'];
    const elN = $('.co-sum-n', co), elV = $('.co-v', co), elCalc = $('.co-calc', co), elSale = $('.co-sale', co), elSaleTx = $('.co-sale span', co);
    // тексты пустой сметы — из шаблона, их и возвращаем, когда галочки сняли
    const empty = { n: elN.innerHTML, calc: elCalc.innerHTML, sale: elSaleTx.innerHTML };
    const state = () => {
      const on = boxes.filter(b => b.checked);
      const n = on.length, days = on.reduce((a, b) => a + (+b.dataset.days || 0), 0);
      const base = days * day, pct = n >= 3 ? d3 : n >= 2 ? d2 : 0;
      return { on, n, days, base, pct, total: Math.round(base * (1 - pct / 100)) };
    };
    const label = s => s.n + NB + pl(s.n, TEM) + ' · ' + s.days + NB + pl(s.days, DNI);

    let shown = day, raf = 0;
    const run = to => {
      cancelAnimationFrame(raf);
      if (reduced) { shown = to; elV.textContent = fmt(to); return; }
      const from = shown, t0 = performance.now(), T = 650;
      const step = now => {
        const k = Math.min(1, (now - t0) / T);
        shown = from + (to - from) * (1 - Math.pow(1 - k, 3));
        elV.textContent = fmt(k < 1 ? Math.round(shown / 1000) * 1000 : to);
        if (k < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };

    // панель итога на телефоне
    const cbar = $('.co-bar'), sum = $('.co-sum', co), list = $('.co-list', co);
    let listIn = false, sumIn = false;
    const barCheck = () => {
      if (!cbar) return;
      const on = isMob() && listIn && !sumIn && boxes.some(b => b.checked) && !co.classList.contains('is-sent');
      // плашка про cookies ещё не закрыта — панель встаёт над ней
      const ck = $('.ck.is-on');
      cbar.style.bottom = on && ck ? Math.round(innerHeight - ck.getBoundingClientRect().top + 8) + 'px' : '';
      cbar.classList.toggle('is-on', on);
    };
    if (cbar) {
      new IntersectionObserver(([e]) => { listIn = e.isIntersecting; barCheck(); }).observe(list);
      // смета «на экране», когда её верх поднялся выше 70 % высоты окна
      new IntersectionObserver(([e]) => { sumIn = e.isIntersecting; barCheck(); }, { rootMargin: '0px 0px -30% 0px' }).observe(sum);
      mob.addEventListener('change', barCheck);
      $('.co-bar-go', cbar).addEventListener('click', () => {
        const y = sum.getBoundingClientRect().top + scrollY - (bar ? bar.offsetHeight : 0) - 16;
        if (window.kmkScroll && window.kmkScroll.to) window.kmkScroll.to(y); else scrollTo({ top: y, behavior: 'smooth' });
      });
      document.querySelectorAll('.ck [data-ck]').forEach(b => b.addEventListener('click', () => setTimeout(barCheck, 600)));
    }

    // первая отмеченная тема — по контуру «Дорого ли это?» один раз пробегает блик: цена появилась, вопрос рядом
    const costBtn = $('.co-cost', co);
    let hadN = 0;
    const paint = () => {
      const s = state();
      if (costBtn && s.n && !hadN && !reduced) {
        costBtn.classList.remove('is-ping');
        void costBtn.offsetWidth;
        costBtn.classList.add('is-ping');
      }
      hadN = s.n;
      elN.classList.toggle('is-empty', !s.n);
      elN.innerHTML = s.n ? label(s) : empty.n;
      run(s.n ? s.total : day);
      elCalc.innerHTML = !s.n ? empty.calc
        : s.pct ? `<s>${fmt(s.base)}${NB}₽</s> · скидка ${s.pct}${NB}%`
        : `${s.days}${NB}${pl(s.days, DNI)} × ${fmt(day)}${NB}₽`;
      elSale.classList.toggle('is-on', s.n >= 2);
      elSaleTx.innerHTML = s.n >= 2
        ? (s.pct ? `Скидка ${s.pct}${NB}% за${NB}${s.n}${NB}${pl(s.n, TEM)} уже в${NB}итоге` : `Скидка за${NB}комплекс${NB}— назовём на${NB}созвоне`)
        : s.n === 1 ? `Ещё одна тема${NB}— и${NB}будет скидка` : empty.sale;
      if (cbar) {
        $('.co-bar-v', cbar).textContent = fmt(s.total) + NB + '₽';
        $('.co-bar-n', cbar).textContent = s.n ? label(s) : '';
      }
      barCheck();
    };
    co.addEventListener('change', e => { if (e.target.closest('.co-row')) paint(); });

    // в заявку: пометка «для компании», выбранные темы (value галочек — «тема — 2 дня») и итог
    co._data = data => {
      const s = state();
      data.delete('i[]');
      data.append('i[]', 'Обучение для компании');
      s.on.forEach(b => data.append('i[]', b.value));
      data.append('i[]', s.n
        ? `Итого: ${label(s)} · ${fmt(s.total)} ₽${s.pct ? ` со скидкой ${s.pct} %` : s.n >= 2 ? ' до скидки' : ''}`.replace(/ /g, ' ')
        : 'Темы не выбраны — подобрать на созвоне');
    };
    co._sent = barCheck;
    paint();
  }

  // ── «Дорого ли это?»: окно-лист поверх страницы. Страница под ним стоит (html.is-locked), поэтому после закрытия
  // посетитель там же, где был. Открытие добавляет в историю #dorogo: «Назад» на телефоне закрывает окно, а не уводит
  // с сайта; по ссылке …/#dorogo окно открывается сразу (страница под ним — у сметы). Фото грузятся заранее, когда
  // смета подъезжает к экрану. Разделы проявляются по прокрутке листа, проценты набегают от нуля ──
  const cost = $('.cost');
  if (cost) {
    const HASH = '#dorogo';
    const root = document.documentElement, sc = $('.cost-sc', cost), xBtn = $('.cost-x', cost);
    const openers = $$('.co-cost');
    let back = null, pushed = false;
    // в <picture> у ПК свои кадры (source с media): сначала отдаём srcset источникам, потом src картинке —
    // браузер выбирает один вариант, и телефон не качает обложки ПК, а ПК — вертикальные кадры телефона.
    // Заранее, когда смета подъезжает к экрану, грузим только шапку (она видна сразу при открытии), остальное — при открытии
    const load = box => {
      $$('source[data-srcset]', box).forEach(s => { s.srcset = s.dataset.srcset; s.removeAttribute('data-srcset'); });
      $$('img[data-src]', box).forEach(img => { img.src = img.dataset.src; img.removeAttribute('data-src'); });
    };
    const sumEl = $('.co-sum');
    if (sumEl) new IntersectionObserver(([e], o) => { if (e.isIntersecting) { o.disconnect(); load($('.cost-head', cost) || cost); } }, { rootMargin: '600px 0px' }).observe(sumEl);

    const count = el => {
      const to = +el.dataset.to;
      if (!to || reduced) return;
      const t0 = performance.now(), dur = 1500 + to * 3;
      const step = now => {
        const p = clamp((now - t0) / dur, 0, 1);
        el.textContent = Math.round(to * (1 - Math.pow(1 - p, 4)));
        if (p < 1) requestAnimationFrame(step);
      };
      el.textContent = '0';
      setTimeout(() => requestAnimationFrame(step), 300);
    };
    const seen = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      seen.unobserve(e.target);
      e.target.classList.add('is-in');
      $$('[data-to]', e.target).forEach(count);
    }), { root: sc, rootMargin: '0px 0px -14% 0px' });

    // ПК: обложка и финал — фото во всю ширину листа, оба отстают от прокрутки (параллакс только по скроллу).
    // --cy — сколько пикселей лист прокручен (обложка уходит медленнее текста), --ep — где финал: 1 — только
    // показался снизу, 0 — его верх у верха листа. На телефоне фото в потоке, переменные CSS там не читает
    const head = $('.cost-head', cost), end = $('.cost-end', cost);
    let praf = 0;
    const para = () => {
      praf = 0;
      if (reduced || isMob()) return;
      const H = sc.clientHeight, y = sc.scrollTop;
      if (head) head.style.setProperty('--cy', Math.min(y, H).toFixed(1));
      if (end) {
        const t = end.getBoundingClientRect().top - sc.getBoundingClientRect().top;
        end.style.setProperty('--ep', clamp(t / H, 0, 1).toFixed(4));
      }
    };
    sc.addEventListener('scroll', () => { if (!praf) praf = requestAnimationFrame(para); }, { passive: true });

    const isOpen = () => cost.classList.contains('is-open');
    const open = fromHistory => {
      if (isOpen()) return;
      load(cost);
      back = document.activeElement;
      sc.scrollTop = 0;
      para();
      cost.classList.add('is-open');
      root.classList.add('is-locked');
      $$('[data-cr]:not(.is-in)', cost).forEach(el => seen.observe(el));
      // в предпросмотре админки (страница из blob:) история может быть недоступна — тогда окно просто без записи
      if (!fromHistory) try { history.pushState({ kmkCost: 1 }, '', HASH); pushed = true; } catch (e) { pushed = false; }
      // фокус — на прокручиваемый лист: стрелки и PageDown листают окно, Tab идёт по кнопкам внутри
      sc.focus({ preventScroll: true });
      if (window.ym && window.KMK_YM) window.ym(window.KMK_YM, 'reachGoal', 'cost_open');
    };
    const close = fromHistory => {
      if (!isOpen()) return;
      cost.classList.remove('is-open');
      if (!root.classList.contains('is-menu')) root.classList.remove('is-locked');
      if (back && back.focus && document.contains(back)) back.focus({ preventScroll: true });
      back = null;
      if (fromHistory) { pushed = false; return; }
      // закрыли кнопкой: свою запись истории снимаем шагом назад; пришли по ссылке с #dorogo — просто убираем хвост адреса
      if (pushed) { pushed = false; history.back(); }
      else if (location.hash === HASH) try { history.replaceState(history.state, '', location.pathname + location.search); } catch (e) { /* ничего */ }
    };
    openers.forEach(b => b.addEventListener('click', () => open(false)));
    $$('[data-cost-x]', cost).forEach(b => b.addEventListener('click', () => close(false)));
    addEventListener('popstate', () => { if (location.hash === HASH) open(true); else close(true); });
    addEventListener('keydown', e => {
      if (!isOpen()) return;
      if (e.key === 'Escape') { close(false); return; }
      // Tab не уходит из окна на страницу под ним
      if (e.key !== 'Tab') return;
      const f = $$('button,a[href],input,[tabindex]:not([tabindex="-1"])', cost).filter(el => el.offsetParent !== null && !el.disabled);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1], cur = document.activeElement;
      if (e.shiftKey && cur === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && cur === last) { e.preventDefault(); first.focus(); }
    });

    // «Обсудить программу» в конце окна — закрываем и ставим курсор в «Имя» сметы; если смета не на экране — подкатываем к ней
    const go = $('.cost-go', cost);
    if (go) go.addEventListener('click', () => {
      close(false);
      const sum = $('.co-sum'), inp = $('.co-fields input', co || document);
      if (!sum) return;
      setTimeout(() => {
        const r = sum.getBoundingClientRect(), top = bar ? bar.offsetHeight : 0;
        if (r.top < top || r.top > innerHeight * .5) {
          const y = r.top + scrollY - top - 24;
          if (window.kmkScroll && window.kmkScroll.to) window.kmkScroll.to(y); else scrollTo({ top: y, behavior: 'smooth' });
        }
        if (inp) inp.focus({ preventScroll: true });
      }, 120);
    });

    // пришли по ссылке …/#dorogo — под окном сразу ставим страницу к смете, чтобы после закрытия посетитель был у цены.
    // При перезагрузке браузер сам возвращает прежнюю прокрутку уже после нас — на эту загрузку её выключаем,
    // а после load ставим страницу к смете ещё раз (шрифты и картинки к этому времени сдвигают вёрстку)
    if (location.hash === HASH) {
      const toSum = () => {
        const sum = $('.co-sum');
        if (!sum) return;
        const y = sum.getBoundingClientRect().top + scrollY - (bar ? bar.offsetHeight : 0) - 24;
        root.style.scrollBehavior = 'auto';
        scrollTo(0, Math.max(0, y));
        root.style.scrollBehavior = '';
      };
      const manual = 'scrollRestoration' in history;
      if (manual) history.scrollRestoration = 'manual';
      toSum();
      addEventListener('load', () => { toSum(); if (manual) setTimeout(() => { history.scrollRestoration = 'auto'; }); }, { once: true });
      open(true);
    }
  }

  // ── «Для компаний»: видео с интенсива. Немая петля грузится, когда блок подъезжает к окну, и играет, только пока
  // видна. Нажатие — весь ролик со звуком в окне видеоотзывов; пока оно открыто, петля стоит ──
  const coVid = $('.co-vid'), coWatch = $('.co-watch');
  if (coVid) {
    let seen = false;
    const kv = $('.kv-modal');
    const playIf = () => { if (seen && !reduced && !(kv && kv.classList.contains('is-open'))) coVid.play().catch(() => {}); };
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen && !coVid.getAttribute('src')) coVid.src = coVid.dataset.src;
      seen ? playIf() : coVid.pause();
    }, { rootMargin: '250px 0px' }).observe(coVid);
    if (kv) new MutationObserver(playIf).observe(kv, { attributes: true, attributeFilter: ['class'] });
    if (coWatch && kv) coWatch.addEventListener('click', () => {
      const box = $('.kv-box', kv);
      coVid.pause();
      box.classList.add('is-v');
      box.innerHTML = `<video src="${coWatch.dataset.full}" poster="${coWatch.dataset.poster}" controls autoplay playsinline preload="auto"></video>`;
      kv.classList.add('is-open');
      document.documentElement.classList.add('is-locked');
    });
  }

  // плашка cookies: «Разрешить» включает Яндекс Метрику (window.kmkYm из <head>), «Только необходимые» — без неё.
  // Пока выбора нет, Метрика не грузится. «Настройки cookies» в подвале открывают плашку снова.
  // Хранилище может быть недоступно (приватный режим) — тогда плашка показывается при каждом заходе.
  const ck = $('.ck');
  if (ck) {
    let choice = '';
    try { choice = localStorage.getItem('kmk-ck') || ''; } catch (e) { /* без хранилища */ }
    const show = delay => {
      ck.hidden = false;
      setTimeout(() => ck.classList.add('is-on'), delay);
    };
    const hide = () => {
      ck.classList.remove('is-on');
      setTimeout(() => { ck.hidden = true; }, 500);
    };
    // старое значение '1' («Хорошо» без выбора) — спрашиваем заново
    if (choice !== 'all' && choice !== 'need') show(1200);
    ck.querySelectorAll('[data-ck]').forEach(b => b.addEventListener('click', () => {
      const v = b.getAttribute('data-ck'), was = choice;
      choice = v;
      try { localStorage.setItem('kmk-ck', v); } catch (e) { /* ничего */ }
      hide();
      if (v === 'all' && window.kmkYm) window.kmkYm();
      // отозвали согласие — стираем cookies Метрики и перезагружаем страницу без неё
      if (v === 'need' && was === 'all') {
        const host = location.hostname.replace(/^www\./, '');
        document.cookie.split(';').map(x => x.split('=')[0].trim()).filter(n => /^_ym/.test(n)).forEach(n => {
          ['', '; domain=' + host, '; domain=.' + host].forEach(d => { document.cookie = n + '=; Max-Age=0; path=/' + d; });
        });
        location.reload();
      }
    }));
    // «Подробнее» — полный перечень данных Метрики (политика, п. 6.2: раскрывается до согласия)
    const more = ck.querySelector('.ck-more'), det = ck.querySelector('.ck-det');
    if (more && det) more.addEventListener('click', () => { det.hidden = !det.hidden; more.setAttribute('aria-expanded', String(!det.hidden)); more.textContent = det.hidden ? 'Подробнее' : 'Свернуть'; });
    document.addEventListener('click', e => {
      if (!e.target.closest('[data-ck-open]')) return;
      e.preventDefault();
      show(30);
    });
  }
})();
