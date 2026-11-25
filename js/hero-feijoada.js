/* DMM CHEF — hero com a feijoada em tela cheia.
   1) Ao abrir a página aparece a foto inteira da feijoada (img/feijoada/hero.webp); ao rolar, ela cede lugar aos itens, que saem um a um.
   2) Ao rolar, os itens saem na ordem inversa e a foto some, dando lugar à montagem da marmita.
   3) Vapor sobe da panela (canvas).
   Para mexer no ritmo, edite SAIDA (rolagem) e EMISSORES (vapor). */
(() => {
  'use strict';
  const fj = document.getElementById('dm-fj');
  const story = document.getElementById('story');
  if (!fj || !story) return;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const seg = (p, a, b) => clamp((p - a) / (b - a));
  const ease = t => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const stage = $('.fj-stage', fj);
  const poster = $('.fj-poster', fj);
  const cvEl = $('.fj-steam', fj);
  const layers = $$('.fj-layer', fj);
  const imgs = $$('img', fj);

  // [começa a sair, termina de sair] na rolagem (0 a 1): a ordem é o inverso da montagem
  const SAIDA = {
    vinagrete: [.030, .075], torresmo: [.045, .090], farofa: [.060, .105],
    couve: [.075, .120], arroz: [.090, .135], panela: [.105, .150],
  };
  const SUMIR = [.14, .21]; // a foto inteira se dissolve nesse trecho
  const DESLOCA = 0.14;     // quanto cada item "levanta" ao sair (fração da altura da tela)

  // ---------- 1) montagem na abertura da página
  let pronto = false, t0 = 0;
  const liberar = () => { if (pronto) return; pronto = true; t0 = performance.now(); };  // a cena já abre montada (sem animação de entrada)
  // o vapor só começa quando a panela já chegou à mesa (ela é a primeira da fila)
  const vaporIntro = () => (reduz || !pronto ? (reduz ? 1 : 0) : seg((performance.now() - t0) / 1000, .7, 1.7));
  Promise.all(imgs.map(i => (i.decode ? i.decode().catch(() => {}) : Promise.resolve()))).then(liberar);
  setTimeout(liberar, 2500);

  // ---------- 2) rolagem
  let raf = 0, nivelVapor = 1, p = 0;
  function update() {
    raf = 0;
    const range = story.offsetHeight - innerHeight;
    p = range > 0 ? clamp(-story.getBoundingClientRect().top / range) : 0;
    const h = stage.getBoundingClientRect().height;
    for (const el of layers) {
      const [a, b] = SAIDA[el.dataset.fj];
      const v = 1 - ease(seg(p, a, b));
      el.style.opacity = v.toFixed(3);
      el.style.transform = `translateY(${(-(1 - v) * DESLOCA * h).toFixed(1)}px) scale(${(0.94 + 0.06 * v).toFixed(3)})`;
      el.style.filter = v < .995 ? `blur(${((1 - v) * 14).toFixed(1)}px)` : ''; // evapora: sobe, desfoca e some
    }
    if (poster) poster.style.opacity = (1 - ease(seg(p, .004, .034))).toFixed(3); // ao abrir, só a foto bonita; logo ao rolar ela cede lugar aos itens
    stage.style.setProperty('--dim', (0.35 * ease(seg(p, .035, .115))).toFixed(3));
    const f = 1 - seg(p, SUMIR[0], SUMIR[1]);
    // a mesa continua como fundo da dobra 2: só a sombra do lado do texto troca de lado, e o vapor some
    stage.style.setProperty('--story', ease(1 - f).toFixed(3));
    if (cvEl) cvEl.style.opacity = f.toFixed(3);
    nivelVapor = 1 - seg(p, .085, .13);
    if (nivelVapor > .02 && f > .02) iniciarVapor();
  }
  const fila = () => { if (!raf) raf = requestAnimationFrame(update); };
  addEventListener('scroll', fila, { passive: true });
  addEventListener('resize', () => { fila(); medir(); });

  // ---------- 3) vapor saindo da panela
  const cv = $('.fj-steam', fj);
  const ctx = cv.getContext('2d');
  // de onde sobe, em % da imagem [x, y]. Fica sobre a panela (a maior fonte) e um pouco sobre o arroz e a couve.
  const EMISSORES = [[71, 52, 1], [73, 50, 1], [72, 54, 1], [74, 51, 1]]; // só sobre o centro da panela // só sobre o centro da panela
  let cssW = 1, cssH = 1, u = 1, dpr = 1, nuvens = [], acc = 0, ultimo = 0, ligado = false, visivel = true;

  function medir() {
    const r = stage.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2);
    cssW = r.width; cssH = r.height;
    cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr);
    u = cssW / 1376; // 1 unidade = 1 px da imagem original
  }
  function nasce(idade = 0) {
    const e = EMISSORES[(Math.random() * EMISSORES.length) | 0];
    if (Math.random() > e[2]) return;
    const vy = 62 + Math.random() * 40;
    const fio = Math.random() < .7;
    nuvens.push({
      x: e[0] / 100 * 1376 + (Math.random() - .5) * 46, y: e[1] / 100 * 768 + (Math.random() - .5) * 30 - vy * idade * .75,
      r: fio ? 16 + Math.random() * 10 : 36 + Math.random() * 18, g: fio ? 7 + Math.random() * 7 : 20 + Math.random() * 14,
      vy, ph: Math.random() * 6.28, sw: fio ? 10 + Math.random() * 14 : 8 + Math.random() * 10, idade, vida: 4.2 + Math.random() * 2,
      a: fio ? .045 + Math.random() * .04 : .03 + Math.random() * .03, sq: fio ? 2 + Math.random() * .9 : 1.2 + Math.random() * .4,
    });
  }
  function quadro(agora) {
    ligado = false;
    if (!visivel || reduz) return;
    const dt = Math.min(.05, (agora - ultimo) / 1000 || .016);
    ultimo = agora;
    const nv = nivelVapor * vaporIntro();
    if (nv > .02) { acc += dt * 11 * nv; while (acc >= 1) { nasce(); acc -= 1; } }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    for (let i = nuvens.length - 1; i >= 0; i--) {
      const q = nuvens[i];
      q.idade += dt;
      if (q.idade > q.vida) { nuvens.splice(i, 1); continue; }
      const k = q.idade / q.vida;
      q.y -= q.vy * dt * (1 - .45 * k);
      const r = (q.r + q.g * q.idade) * u;
      const x = (q.x + Math.sin(q.ph + q.idade * 1.1) * q.sw + q.idade * 8) * u;
      const y = q.y * u;
      const a = q.a * Math.min(1, k / .12) * (k < .5 ? 1 : Math.pow(1 - (k - .5) / .5, 1.3)) * nv;
      if (a < .002) continue;
      ctx.save();
      ctx.translate(x, y); ctx.scale(1, q.sq);
      const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      gr.addColorStop(0, `rgba(255,248,236,${a})`);
      gr.addColorStop(.55, `rgba(255,248,236,${a * .45})`);
      gr.addColorStop(1, 'rgba(255,248,236,0)');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.2832); ctx.fill();
      ctx.restore();
    }
    if (nuvens.length || nivelVapor > .02) { ligado = true; requestAnimationFrame(quadro); }   // continua rodando enquanto o hero está visível
    else ctx.clearRect(0, 0, cssW, cssH);
  }
  function iniciarVapor() {
    if (ligado || reduz || !visivel) return;
    if (!nuvens.length) for (let i = 0; i < 26; i++) nasce(Math.random() * 3.2);
    ligado = true; ultimo = performance.now(); requestAnimationFrame(quadro);
  }
  if ('IntersectionObserver' in window) new IntersectionObserver(e => { visivel = e[0].isIntersecting; if (visivel) fila(); }).observe(story);

  medir();
  update();
})();
