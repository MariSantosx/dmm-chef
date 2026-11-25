/* DMM Chef — sala de pratos do dia (mistura, descrição e preço de cada marmita). */
(() => {
 'use strict';
 const $=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s));
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),finePointer=matchMedia('(hover: hover) and (pointer: fine)');
 const flavours=[
 {key:'contrafile',name:'Contrafilé',note:'O CLÁSSICO DA CASA',description:'Contrafilé grelhado, acebolado, à milanesa, à parmegiana ou a rolê. Fica ótimo com batata frita e salada.',texture:'Grelhado / acebolado / à milanesa / à parmegiana',price:'a partir de R$ 26,00',colour:'#e8832c'},
 {key:'frango',name:'Filé de frango',note:'TODO DIA, DE SEGUNDA A SÁBADO',description:'Filé de frango grelhado, acebolado, à milanesa ou à parmegiana. Leve, macio e sempre uma boa pedida.',texture:'Grelhado / acebolado / à milanesa / à parmegiana',price:'a partir de R$ 24,00',colour:'#f0a040'},
 {key:'costela',name:'Costela com batata',note:'O ESPECIAL DE SEGUNDA',description:'Costela macia com batata. Começa a semana com sabor e vai bem com arroz e feijão.',texture:'Macia / suculenta / com batata',price:'R$ 27,00',colour:'#d96a1f'},
 {key:'omelete',name:'Omelete',note:'LEVE E CAPRICHADA',description:'Omelete com queijo, tomate, cebola e orégano. Simples, gostosa e na medida.',texture:'Queijo / tomate / orégano',price:'R$ 23,00',colour:'#f4b25a'}
 ];
 const photos=$$('[data-room-image]'),room=$('#flavour-room'),dialog=$('#taste-dialog'),closeImage=$('#closeup-image'),photo=$('#room-photo');
 let selected=0,zoomed=false,lastFocus=null;
 const imageChecks=$$('img').map(async img=>{try{await img.decode();if(!img.naturalWidth)throw new Error('Empty image');return true;}catch{img.dataset.failed='true';return false;}});
 const assetsReady=Promise.all(imageChecks).then(results=>{const ready=results.every(Boolean);document.body.dataset.images=ready?'ready':'failed';return ready;});
 function checkIndex(index){if(!Number.isInteger(index)||index<0||index>=flavours.length)throw new Error('Opção desconhecida');}
 function setZoom(value){zoomed=Boolean(value);$('#closeup-photo').classList.toggle('is-zoomed',zoomed);$('#zoom-detail').setAttribute('aria-pressed',String(zoomed));$('#zoom-detail').innerHTML=zoomed?'Menos zoom <span aria-hidden="true">−</span>':'Mais zoom <span aria-hidden="true">＋</span>';closeImage.style.transformOrigin='50% 50%';$('#closeup-hint').textContent=zoomed?(finePointer.matches?'Passe o mouse pela imagem para ver os detalhes.':'Diminua o zoom para ver a marmita inteira.'):'Um pouco mais perto. Muito mais vontade.';}
 function syncCloseup(){const f=flavours[selected];closeImage.src=photos[selected].src;closeImage.alt=photos[selected].alt;$('#closeup-title').textContent=f.name;$('#closeup-description').textContent=f.description;$('#closeup-texture').textContent=f.texture;$('#closeup-number').textContent=`0${selected+1} / 04`;dialog.style.setProperty('--flavour',f.colour);$$('[data-closeup]').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===selected)));setZoom(false);}
 function selectFlavour(index){
  checkIndex(index);selected=index;const f=flavours[index];room.dataset.selected=String(index);room.style.setProperty('--flavour',f.colour);
  photos.forEach((img,i)=>{img.classList.toggle('is-active',i===index);img.setAttribute('aria-hidden',String(i!==index));});
  $$('[data-taste]').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));
  $('#room-edition').textContent=`0${index+1}`;$('#room-name').textContent=f.name;$('#room-description').textContent=f.description;$('#room-note').textContent=f.note;$('#room-texture').textContent=f.texture.toUpperCase();$('#room-price').textContent=f.price;
  $('#room-watch').dataset.explore=String(index);photo.setAttribute('aria-label',`Ver de perto: ${f.name}`);
  if(dialog.open)syncCloseup();return f;
 }
 async function openCloseup(index=selected,zoom=false){
  checkIndex(index);selectFlavour(index);syncCloseup();
  if(!dialog.open){lastFocus=document.activeElement;dialog.showModal();document.body.classList.add('detail-open');}
  await closeImage.decode();if(!closeImage.naturalWidth)throw new Error('A imagem não pôde ser exibida.');setZoom(zoom);
  return {flavour:flavours[index].name,action:'closeup',image:{loaded:true,width:closeImage.naturalWidth,height:closeImage.naturalHeight},zoomed};
 }
 function closeCloseup(){dialog.close();}
 photo.addEventListener('click',()=>{openCloseup().catch(()=>{$('#closeup-hint').textContent='A imagem não carregou. Recarregue a página.';});});
 $$('[data-taste]').forEach((button,i)=>{button.addEventListener('click',()=>selectFlavour(i));button.addEventListener('keydown',event=>{let next=i;if(event.key==='ArrowDown'||event.key==='ArrowRight')next=(i+1)%4;else if(event.key==='ArrowUp'||event.key==='ArrowLeft')next=(i+3)%4;else if(event.key==='Home')next=0;else if(event.key==='End')next=3;else return;event.preventDefault();selectFlavour(next);$$('[data-taste]')[next].focus();});});
 $$('[data-closeup]').forEach((button,i)=>button.addEventListener('click',()=>{selectFlavour(i);}));
 $('.taste-close').addEventListener('click',closeCloseup);
 dialog.addEventListener('click',event=>{if(event.target===dialog)closeCloseup();});
 dialog.addEventListener('close',()=>{document.body.classList.remove('detail-open');setZoom(false);if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});});
 $('#zoom-detail').addEventListener('click',()=>setZoom(!zoomed));
 $('#closeup-photo').addEventListener('pointermove',event=>{if(!zoomed||event.pointerType==='touch')return;const r=event.currentTarget.getBoundingClientRect();closeImage.style.transformOrigin=`${Math.max(12,Math.min(88,(event.clientX-r.left)/r.width*100))}% ${Math.max(12,Math.min(88,(event.clientY-r.top)/r.height*100))}%`;});
 $('#closeup-photo').addEventListener('pointerleave',()=>{closeImage.style.transformOrigin='50% 50%';});
 photo.addEventListener('pointermove',event=>{if(!finePointer.matches||reduced.matches||document.body.classList.contains('motion-paused'))return;const r=photo.getBoundingClientRect();photo.style.setProperty('--photo-x',`${((event.clientX-r.left)/r.width-.5)*10}px`);photo.style.setProperty('--photo-y',`${((event.clientY-r.top)/r.height-.5)*10}px`);});
 photo.addEventListener('pointerleave',()=>{photo.style.setProperty('--photo-x','0px');photo.style.setProperty('--photo-y','0px');});
 if('IntersectionObserver' in window&&!reduced.matches){
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('in-view');observer.unobserve(entry.target);}}),{threshold:.12});
  $$('.content .section-heading,.manifesto>div,.method article,.ritual>div,.faq-section>div,.footer-top').forEach((el,i)=>{el.classList.add('reveal');el.style.setProperty('--reveal-delay',`${i%3*70}ms`);observer.observe(el);});
  reduced.addEventListener('change',()=>{if(reduced.matches){$$('.reveal').forEach(el=>el.classList.add('in-view'));observer.disconnect();}});
 }
 window.DohExperience={selectFlavour,openCloseup,assetsReady};
 
})();
