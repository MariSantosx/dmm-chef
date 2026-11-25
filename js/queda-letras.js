/* DMM CHEF — ao sair da última dobra, as letras do título caem como as panquecas.
   A queda acompanha a rolagem: quando o rodapé começa a subir por cima, cada letra se solta, gira e despenca.
   Para ajustar: INICIO/FIM (trecho da rolagem em que cai) e GRAVIDADE (quão rápido acelera). */
(() => {
  'use strict';
  const closing = document.querySelector('.closing');
  const rodape = document.querySelector('footer');
  const h2 = closing && closing.querySelector('h2');
  if (!h2 || !rodape || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const celular = matchMedia('(max-width: 860px)').matches;
  const INICIO = celular ? 0.24 : 0.0, FIM = celular ? 0.74 : 0.62, GRAVIDADE = 1.15;   // no celular o rodapé é alto: a queda só começa quando ele já cobre boa parte
  // cada letra vira um bloco solto, com seu próprio atraso, giro e desvio para o lado
  const palavras = h2.querySelectorAll('.px-w');
  const alvos = palavras.length ? palavras : [h2];
  const letras = [];
  alvos.forEach(w => {
    const txt = w.textContent;
    w.textContent = '';
    [...txt].forEach(c => {
      const s = document.createElement('span');
      s.className = 'px-l'; s.textContent = c;
      w.appendChild(s);
      letras.push({ el: s, d: Math.random() * 0.55, rot: (Math.random() - .5) * 110, dx: (Math.random() - .5) * 60, v: 0.85 + Math.random() * 0.4 });
    });
  });
  h2.setAttribute('aria-label', h2.textContent);

  let vh = innerHeight, raf = 0;
  const frame = () => {
    raf = 0;
    const topo = rodape.getBoundingClientRect().top;
    const p = Math.min(1, Math.max(0, 1 - topo / vh));          // 0: rodapé abaixo da tela · 1: rodapé cobriu tudo
    const t = Math.min(1, Math.max(0, (p - INICIO) / (FIM - INICIO)));
    for (const L of letras) {
      const q = Math.min(1, Math.max(0, (t - L.d) / (1 - L.d)));
      if (q <= 0) { if (L.on) { L.el.style.transform = ''; L.on = false; } continue; }
      const queda = Math.pow(q, 2) * vh * GRAVIDADE * L.v;      // acelera como gravidade
      L.el.style.transform = `translate(${(L.dx * q).toFixed(1)}px, ${queda.toFixed(1)}px) rotate(${(L.rot * q).toFixed(1)}deg)`;
      L.on = true;
    }
  };
  const fila = () => { if (!raf) raf = requestAnimationFrame(frame); };
  addEventListener('scroll', fila, { passive: true });
  addEventListener('resize', () => { vh = innerHeight; fila(); }, { passive: true });
  frame();
})();
