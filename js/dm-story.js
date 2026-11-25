/* DMM CHEF — a marmita sendo montada conforme você rola.
   Lê a posição da rolagem dentro de #story (0 a 1) e anima as camadas (fotos recortadas).
   Para mexer no ritmo, edite os números em CAPITULOS, CAMADAS e ESCOLHA. */
(() => {
  'use strict';
  const story = document.getElementById('story');
  const svg = document.getElementById('dm-svg');
  if (!story || !svg) return;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const seg = (p, a, b) => clamp((p - a) / (b - a));
  const ease = t => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  // [início, fim] da rolagem (0 a 1) em que cada texto aparece
  const CAPITULOS = [[0, .15], [.15, .23], [.23, .37], [.37, .51], [.51, .65], [.65, .78], [.78, .91], [.91, 1.01]];

  // out = [começa a sair, termina de sair]; in = [começa a entrar, termina de entrar]
  const CAMADAS = {
    fries: { el: '#L-fries', out: [.09, .125], in: [.235, .31],  lista: 0 },   // 1º: batata frita
    salad: { el: '#L-salad', out: [.08, .115], in: [.385, .46],  lista: 1 },   // 2º: salada
    rice:  { el: '#L-rice',  out: [.12, .155], in: [.525, .60],  lista: 2 },   // 3º: arroz e feijão (uma peça só)
    beans: { el: '#L-beans', out: [.11, .145], in: [.525, .60] },              // (vazio: o feijão vem junto com o arroz)
    steak: { el: '#L-steak', out: [.10, .135], in: [.665, .74],  lista: 3 },   // 4º: a mistura
    lid:   { el: '#L-lid',   in: [.925, .975] },
  };
  const ESCOLHA = [.80, .895]; // trecho em que o prato se dissolve entre as 4 misturas
  const GIRO = [.14, .225];   // trecho em que a bandeja chega girando, vinda da borda esquerda da tela, e para
  const GIRO_VOLTAS = 2;     // quantas voltas ela dá antes de parar
  const GIRO_DIST = 1000;    // de quão longe ela vem (unidades do SVG)
  const DROP = 300;           // quanto a camada "cai" ao entrar (unidades do SVG)

  const camadas = Object.values(CAMADAS).map(c => ({ ...c, g: $(c.el, svg) }));
  const plates = $$('.dm-plate', svg); // pratos 2, 3 e 4 (o 1º é a própria montagem)
  const chapters = $$('.dm-ch', story);
  const items = $$('.dm-list li', story);
  const list = $('.dm-list', story), count = $('.dm-count', story), countN = $('#dm-count-n', story);
  const bar = $('#dm-progress', story);
  const navBtns = $$('[data-dmjump]', story);
  const protBtns = $$('[data-dmprot]', story);
  const stageEl = $('#stage');
  const trayEl = $('#L-tray', svg);
  let curProt = -1, curCh = -1, raf = 0;

  // ---- vapor: nuvens suaves (canvas) que sobem da comida, crescem e somem ----
  // Só aparece no começo (marmita pronta) e no fim (marmita fechada). Ajuste em EMISSORES e nos números de spawn().
  const art = svg.closest('.dm-art');
  const reduzMovimento = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cv = document.createElement('canvas');
  cv.className = 'dm-steam';
  cv.setAttribute('aria-hidden', 'true');
  art.appendChild(cv);
  const ctx = cv.getContext('2d');
  const VB = { x: 0, y: -190, w: 842 };           // mesmo viewBox do SVG
  const EMISSORES = [[230, 120], [400, 90], [570, 110], [700, 150], [480, 230]]; // de onde sobe (unidades do SVG)
  let steamLevel = 1, puffs = [], lastT = 0, acc = 0, cssW = 1, cssH = 1, u = 1, dpr = 1, steamOn = false, visivel = true;

  function sizeSteam() {
    const r = art.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2);
    cssW = r.width; cssH = r.height;
    cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr);
    u = cssW / VB.w;
  }
  function spawn(preAge = 0) {
    const [ex, ey] = EMISSORES[(Math.random() * EMISSORES.length) | 0];
    const vy = 62 + Math.random() * 40;
    const fio = Math.random() < .7; // 70% fios finos e altos, 30% névoa larga e suave
    puffs.push({
      x: ex + (Math.random() - .5) * 80, y: ey + (Math.random() - .5) * 30 - vy * preAge * .75,
      r: fio ? 12 + Math.random() * 9 : 28 + Math.random() * 16,
      grow: fio ? 8 + Math.random() * 9 : 24 + Math.random() * 18,
      vy, ph: Math.random() * 6.28, sw: fio ? 20 + Math.random() * 24 : 14 + Math.random() * 18,
      age: preAge, life: 4 + Math.random() * 1.8,
      a: fio ? .17 + Math.random() * .13 : .08 + Math.random() * .07,
      sq: fio ? 2 + Math.random() * .9 : 1.2 + Math.random() * .4,
    });
  }
  function steamFrame(now) {
    steamOn = false;
    if (!visivel || reduzMovimento) return;
    const dt = Math.min(.05, (now - lastT) / 1000 || .016);
    lastT = now;
    if (steamLevel > .02) { acc += dt * 15 * steamLevel; while (acc >= 1) { spawn(); acc -= 1; } }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    for (let i = puffs.length - 1; i >= 0; i--) {
      const q = puffs[i];
      q.age += dt;
      if (q.age > q.life) { puffs.splice(i, 1); continue; }
      const k = q.age / q.life;
      q.y -= q.vy * dt * (1 - .45 * k);
      const r = (q.r + q.grow * q.age) * u;
      const x = (q.x + Math.sin(q.ph + q.age * 1.1) * q.sw + q.age * 8 - VB.x) * u;
      const y = (q.y - VB.y) * u;
      const a = q.a * Math.min(1, k / .12) * (k < .5 ? 1 : Math.pow(1 - (k - .5) / .5, 1.3)) * steamLevel;
      if (a < .002) continue;
      ctx.save();
      ctx.translate(x, y); ctx.scale(1, q.sq);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      g.addColorStop(0, `rgba(255,252,245,${a})`);
      g.addColorStop(.55, `rgba(255,252,245,${a * .45})`);
      g.addColorStop(1, 'rgba(255,252,245,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.2832); ctx.fill();
      ctx.restore();
    }
    if (puffs.length || steamLevel > .02) { steamOn = true; requestAnimationFrame(steamFrame); }
    else ctx.clearRect(0, 0, cssW, cssH);
  }
  function startSteam() {
    if (steamOn || reduzMovimento || !visivel) return;
    if (!puffs.length) for (let i = 0; i < 22; i++) spawn(Math.random() * 3); // já começa "fumegando"
    steamOn = true; lastT = performance.now(); requestAnimationFrame(steamFrame);
  }
  sizeSteam();
  addEventListener('resize', sizeSteam);
  if ('IntersectionObserver' in window) new IntersectionObserver(e => { visivel = e[0].isIntersecting; if (visivel) queue(); }).observe(story);

  function vis(c, p) {
    const [i0, i1] = c.in;
    if (c.out) {
      const [o0, o1] = c.out;
      if (p < o0) return 1;
      if (p < o1) return 1 - ease(seg(p, o0, o1));
      if (p < i0) return 0;
    } else if (p < i0) return 0;
    return p < i1 ? ease(seg(p, i0, i1)) : 1;
  }

  function update() {
    raf = 0;
    const range = story.offsetHeight - innerHeight;
    const p = range > 0 ? clamp(-story.getBoundingClientRect().top / range) : 0;

    for (const c of camadas) {
      const v = vis(c, p);
      c.g.style.opacity = v.toFixed(3);
      const dy = c === CAMADAS.lid ? -DROP * 1.25 : -DROP;
      c.g.style.transform = `translateY(${((1 - v) * dy).toFixed(1)}px) scale(${(0.92 + 0.08 * v).toFixed(3)})`;
      if (c.lista !== undefined && items[c.lista]) items[c.lista].classList.toggle('on', v > .95);
    }
    // bandeja: entra girando pela borda da tela e desacelera até parar na posição
    const g = seg(p, GIRO[0], GIRO[1]), ge = 1 - Math.pow(1 - g, 3);
    trayEl.style.transform = g >= 1 ? '' : `translateX(${(-(1 - ge) * GIRO_DIST).toFixed(1)}px) rotate(${((1 - ge) * 360 * GIRO_VOLTAS).toFixed(1)}deg)`;
    steamLevel = Math.max(1 - seg(p, .05, .10), seg(p, .95, 1));
    if (steamLevel > .02) startSteam();

    // dissolve o prato entre as misturas: contrafilé -> frango -> costela -> omelete
    const f = seg(p, ESCOLHA[0], ESCOLHA[1]) * 3;
    plates.forEach((g, i) => { g.style.opacity = clamp(f - i).toFixed(3); });
    const idx = Math.round(f);
    window.dmmMistura = p >= ESCOLHA[0] ? idx : null; // usado pelo botão de pedido (js/pedido.js)
    if (idx !== curProt) {
      curProt = idx;
      protBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(i === idx)));
    }

    // capítulo de texto ativo
    let ch = 0;
    CAPITULOS.forEach(([a, b], i) => { if (p >= a && p < b) ch = i; });
    if (p >= CAPITULOS[CAPITULOS.length - 1][0]) ch = CAPITULOS.length - 1;
    if (ch !== curCh) {
      curCh = ch;
      chapters.forEach((el, i) => {
        const on = i === ch;
        el.classList.toggle('is-on', on);
        el.setAttribute('aria-hidden', String(!on));
        if ('inert' in el) el.inert = !on;
      });
      const nav = ch - 1; // o hero (capítulo 0) não tem botão
      navBtns.forEach((b, i) => { if (i === nav) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
    }

    const n = items.filter(li => li.classList.contains('on')).length;
    countN.textContent = n;
    const showList = p > .2 && p < .985;
    list.classList.toggle('is-on', showList);
    count.classList.toggle('is-on', showList);
    bar.style.width = (p * 100).toFixed(1) + '%';
    // o palco só some conforme a próxima dobra sobe e cobre a tela (nunca fica uma tela vazia no meio)
    const prox = document.getElementById('collection');
    const cobertura = prox ? clamp((innerHeight - prox.getBoundingClientRect().top) / (innerHeight * .9)) : 0;
    stageEl.style.opacity = (1 - ease(cobertura)).toFixed(3);
  }

  const queue = () => { if (!raf) raf = requestAnimationFrame(update); };
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);

  const toP = p => scrollTo({ top: story.offsetTop + p * (story.offsetHeight - innerHeight), behavior: 'smooth' });
  const PULOS = [.225, .30, .44, .58, .715, .845, .96]; // meio de cada capítulo (do 2º ao 8º)
  navBtns.forEach((b, i) => b.addEventListener('click', () => toP(PULOS[i])));
  const alvo = i => ESCOLHA[0] + (ESCOLHA[1] - ESCOLHA[0]) * (i / 3) + .001;
  protBtns.forEach((b, i) => b.addEventListener('click', () => toP(alvo(i))));

  update();
})();
