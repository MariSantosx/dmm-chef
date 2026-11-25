/* DMM CHEF — transição entre as dobras.
   As seções que ficam "presas" na tela (pratos do dia e os três passos) vão sumindo só conforme a dobra de baixo
   sobe e cobre a tela, então nunca fica uma tela vazia no meio da passagem. */
(() => {
  'use strict';
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const ease = t => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const pares = [['.room-pin', '#atelier'], ['.swap-pin', '#board']]
    .map(([f, n]) => ({ pin: document.querySelector(f), next: document.querySelector(n) }))
    .filter(x => x.pin && x.next);
  if (!pares.length) return;
  let raf = 0;
  function update() {
    raf = 0;
    for (const { pin, next } of pares) {
      const cobertura = clamp((innerHeight - next.getBoundingClientRect().top) / (innerHeight * .9));
      pin.style.opacity = (1 - ease(cobertura)).toFixed(3);
    }
  }
  const fila = () => { if (!raf) raf = requestAnimationFrame(update); };
  addEventListener('scroll', fila, { passive: true });
  addEventListener('resize', fila);
  update();
})();
