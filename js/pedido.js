/* DMM CHEF — pedido por WhatsApp, "Aberto agora" e cardápio do dia.
   Os dados do negócio ficam em js/config.js. Aqui não precisa mexer. */
(() => {
  'use strict';
  const C = Object.assign({ whatsapp: '', telefone: '', endereco: '', mapa: '', instagram: '', pagamentos: '',
    fuso: 'America/Sao_Paulo', abre: [10, 0], fecha: [14, 30], dias: [1, 2, 3, 4, 5, 6] }, window.DMM || {});
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  // ---------- cardápio por dia (0 = domingo). Dados do cliente, sem alteração ----------
  const CARDAPIO = {
    1: { nome: 'segunda', resumo: 'Costela com batata, R$ 27,00' },
    2: { nome: 'terça', resumo: 'Sobrecoxa com batata assada, R$ 26,00' },
    3: { nome: 'quarta', resumo: 'Feijoada, R$ 40,00 · Bisteca com fritas, R$ 25,00' },
    4: { nome: 'quinta', resumo: 'Bife à parmegiana, R$ 33,50 · Panquecas, de R$ 26,00 a R$ 33,00' },
    5: { nome: 'sexta', resumo: 'Filé de linguado empanado, R$ 42,00' },
    6: { nome: 'sábado', resumo: 'Feijoada, R$ 40,00 · Bisteca com fritas, R$ 25,00' },
  };
  const NOMES_DIA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const MISTURAS = ['contrafilé', 'filé de frango', 'costela com batata', 'omelete'];
  // ---------- cartão do prato do dia: cada dia pode ter mais de uma opção (setinha "Ver outra opção") ----------
  const DIA_CARD = {
    1: [{ nome: 'Costela com batata', preco: 'R$ 27,00', extra: '', img: 'img/dia/costela.webp' }],
    2: [{ nome: 'Sobrecoxa com batata assada', preco: 'R$ 26,00', extra: '', img: 'img/dia/sobrecoxa.webp' }],
    3: [{ nome: 'Feijoada completa', preco: 'R$ 40,00', extra: '', img: 'img/dia/feijoada.webp' },
        { nome: 'Bisteca com fritas', preco: 'R$ 25,00', extra: '', img: 'img/dia/bisteca.webp' }],
    4: [{ nome: 'Bife à parmegiana', preco: 'R$ 33,50', extra: '', img: 'img/dia/parmegiana.webp' },
        { nome: 'Panquecas com arroz', preco: 'R$ 26,00 a R$ 33,00', extra: '3 unidades. Carne com queijo, carne, queijo ou frango com Catupiry', img: 'img/panqueca/panqueca.webp' }],
    5: [{ nome: 'Filé de linguado empanado', preco: 'R$ 42,00', extra: '', img: 'img/dia/linguado.webp' }],
    6: [{ nome: 'Feijoada completa', preco: 'R$ 40,00', extra: '', img: 'img/dia/feijoada.webp' },
        { nome: 'Bisteca com fritas', preco: 'R$ 25,00', extra: '', img: 'img/dia/bisteca.webp' }],
  };
  let cardDia = -1, cardOp = 0, cardCtx = null;
  function desenharCard() {
    if (!cardCtx || !$('#hc-nome')) return;
    const { d, ops } = cardCtx, o = ops[cardOp % ops.length];
    $('#hc-label').textContent = `${d.rotulo}, ${NOMES_DIA[d.n]}`.toUpperCase();
    $('#hc-nome').textContent = o.nome; $('#hc-preco').textContent = o.preco;
    const ex = $('#hc-extra'); ex.textContent = o.extra; ex.hidden = !o.extra;
    const im = $('#hc-img'); if (!im.src.endsWith(o.img)) im.src = o.img;
    const t = $('.hc-troca'); if (t) { t.hidden = ops.length < 2; const n = $('.hc-troca-n', t); if (n) n.textContent = ops.length > 1 ? `${(cardOp % ops.length) + 1}/${ops.length}` : ''; }
  }
  const trocaBtn = $('.hc-troca');
  if (trocaBtn) trocaBtn.addEventListener('click', () => {
    if (!cardCtx) return;
    const box = $('.hojecard'); box.classList.add('trocando');
    setTimeout(() => { cardOp = (cardOp + 1) % cardCtx.ops.length; desenharCard(); box.classList.remove('trocando'); }, 170);
  });
  const placeholder = !C.whatsapp || /^(55)?0+$/.test(C.whatsapp);

  // ---------- data e hora no fuso do restaurante ----------
  function agora() {
    const f = new Intl.DateTimeFormat('pt-BR', { timeZone: C.fuso, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
    const p = Object.fromEntries(f.formatToParts(new Date()).map(x => [x.type, x.value]));
    const dias = { dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sáb: 6, sab: 6 };
    return { dia: dias[p.weekday.replace('.', '').toLowerCase()], min: (parseInt(p.hour, 10) % 24) * 60 + parseInt(p.minute, 10) };
  }
  const hm = ([h, m]) => (m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`);
  const proximoDiaAberto = d => { for (let i = 1; i <= 7; i++) { const n = (d + i) % 7; if (C.dias.includes(n)) return { n, i }; } return null; };

  function estado() {
    const t = agora();
    const ab = C.abre[0] * 60 + C.abre[1], fe = C.fecha[0] * 60 + C.fecha[1];
    const hoje = C.dias.includes(t.dia);
    if (hoje && t.min >= ab && t.min < fe) return { aberto: true, texto: `Aberto agora, até ${hm(C.fecha)}`, t };
    if (hoje && t.min < ab) return { aberto: false, texto: `Abrimos hoje às ${hm(C.abre)}`, t };
    const prox = proximoDiaAberto(t.dia);
    const quando = prox ? (prox.i === 1 ? 'amanhã' : NOMES_DIA[prox.n]) : '';
    return { aberto: false, texto: hoje ? `Hoje já encerramos. Voltamos ${quando} às ${hm(C.abre)}` : `Hoje não abrimos. Voltamos ${quando} às ${hm(C.abre)}`, t };
  }
  // qual cardápio mostrar: o de hoje (se ainda vai abrir ou está aberto) ou o do próximo dia aberto
  function diaDoPrato(e) {
    const hojeAberto = C.dias.includes(e.t.dia);
    const fe = C.fecha[0] * 60 + C.fecha[1];
    if (hojeAberto && e.t.min < fe) return { n: e.t.dia, rotulo: 'Hoje' };
    const prox = proximoDiaAberto(e.t.dia);
    return prox ? { n: prox.n, rotulo: prox.i === 1 ? 'Amanhã' : NOMES_DIA[prox.n][0].toUpperCase() + NOMES_DIA[prox.n].slice(1) } : null;
  }

  function mensagem() {
    const e = estado(), d = diaDoPrato(e);
    let t = 'Olá, DMM Chef! Quero fazer um pedido.';
    if (window.dmmMistura != null) t += ` Quero uma marmita de ${MISTURAS[window.dmmMistura]}.`;
    else if (d && CARDAPIO[d.n]) t += ` Vi o prato de ${d.rotulo.toLowerCase()} no site: ${CARDAPIO[d.n].resumo}.`;
    return t;
  }
  const linkWhatsApp = () => `https://wa.me/${C.whatsapp}?text=${encodeURIComponent(mensagem())}`;

  // todo botão "Peça a sua / Pedir" abre o WhatsApp com a mensagem pronta
  document.addEventListener('click', ev => {
    const b = ev.target.closest('[data-order]');
    if (!b) return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    window.open(linkWhatsApp(), '_blank', 'noopener');
  }, true);

  // ---------- preenche "Aberto agora" e o prato do dia ----------
  function atualizar() {
    const e = estado(), d = diaDoPrato(e);
    const box = $('#dm-hoje');
    if (box) {
      box.classList.toggle('fechado', !e.aberto);
      const st = $('.dm-hoje-status span', box);
      if (st) st.textContent = e.texto;
      const lb = $('.dm-hoje-label', box);
      if (lb) lb.textContent = d && CARDAPIO[d.n] ? `${d.rotulo}, ${CARDAPIO[d.n].nome}` : 'Cardápio';
      const p = $('.dm-hoje-prato', box);
      p.textContent = d && CARDAPIO[d.n] ? CARDAPIO[d.n].resumo : '';
    }
    $$('[data-cfg="status"]').forEach(el => (el.textContent = e.texto));
    // cartão do prato do dia (hoje, ou o próximo dia aberto)
    const cc = d && DIA_CARD[d.n];
    if (cc && $('#hc-nome')) {
      if (cardDia !== d.n) { cardDia = d.n; cardOp = 0; }
      cardCtx = { d, ops: cc };
      desenharCard();
    }
    // destaca na lousa o dia de hoje
    $$('.lousa .ls').forEach(r => r.classList.toggle('is-today', !!d && Number(r.dataset.d) === d.n));
    // destaca no cardápio os pratos do dia
    $$('#board .menu-row').forEach(row => {
      const nome = (row.querySelector('span')?.childNodes[0]?.textContent || '').trim().toLowerCase();
      row.classList.toggle('is-today', !!d && nome === CARDAPIO[d.n]?.nome);
    });
  }

  // ---------- dados do negócio no rodapé e nas dúvidas ----------
  function preencher() {
    $$('[data-cfg="endereco"]').forEach(el => {
      if (C.endereco) {
        el.textContent = C.endereco;
        if (C.mapa) { const a = document.createElement('a'); a.href = C.mapa; a.target = '_blank'; a.rel = 'noopener'; a.textContent = ' Ver no mapa'; el.appendChild(a); }
      }
    });
    $$('[data-cfg="faq-endereco"]').forEach(el => {
      if (C.endereco) el.textContent = `Estamos em ${C.endereco}.` + (C.pagamentos ? ` Aceitamos ${C.pagamentos}.` : '');
    });
    $$('[data-cfg="telefone"]').forEach(el => {
      if (C.telefone) { el.textContent = C.telefone; el.hidden = false; } else el.hidden = true;
    });
    $$('[data-cfg="pagamentos"]').forEach(el => {
      if (C.pagamentos) { el.textContent = `Pagamento: ${C.pagamentos}`; el.hidden = false; } else el.hidden = true;
    });
    $$('[data-cfg-link="instagram"]').forEach(a => {
      if (C.instagram) a.href = C.instagram; else (a.closest('.f-social') || a).remove();
    });
  }

  preencher();
  atualizar();
  setInterval(atualizar, 60000);
  if (placeholder) console.info('DMM Chef: troque o número de WhatsApp em js/config.js (hoje está com um número de exemplo).');
})();
