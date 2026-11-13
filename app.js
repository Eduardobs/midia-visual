import {unitPrice, validQuantity, restoreCart, money, buildMessage} from './cart.js';
const $ = selector => document.querySelector(selector);
const state = {products:[],cart:[],category:'Todos',store:null};
const storageKey='midia-visual-cart-v1';
const escapeHTML = value => String(value).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let toastTimer;
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),2600);}
function persist(){try{localStorage.setItem(storageKey,JSON.stringify(state.cart));}catch{}renderCart();}
function renderProducts(){
 const query=$('#search').value.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
 let products=state.products.filter(p=>(state.category==='Todos'||p.category===state.category)&&`${p.name} ${p.category} ${p.description} ${p.id}`.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().includes(query));
 const sort=$('#sort').value;
 if(sort==='name') products.sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
 if(sort==='price-up') products.sort((a,b)=>(a.price??Infinity)-(b.price??Infinity));
 if(sort==='price-down') products.sort((a,b)=>(b.price??-Infinity)-(a.price??-Infinity));
 $('#results').textContent=`${products.length} ${products.length===1?'produto encontrado':'produtos encontrados'}`;
 $('#products').innerHTML=products.length ? products.map(p=>`<article class="product-card"><button class="product-image detail-trigger" data-detail="${p.id}" aria-label="Ver detalhes de ${escapeHTML(p.name)}"><img src="${escapeHTML(p.images[0])}" alt="${escapeHTML(p.name)}" loading="lazy" width="750" height="750">${p.description.includes('Sob encomenda')?'<span class="product-tag">SOB ENCOMENDA</span>':''}<span class="details-label">Ver detalhes ↗</span></button><p class="category">${escapeHTML(p.category)}</p><h3>${escapeHTML(p.name)}</h3>${p.description?`<p class="description">${escapeHTML(p.description)}</p>`:''}<p class="price">${p.price===null?'Sob consulta':money(p.price)+` <small>/ ${p.unit}</small>`}</p><p class="minimum">${p.minimumSpecified?`Mínimo de ${p.minimumQuantity} unidades`:'Consulte condições do pedido'}</p><button class="add" data-add="${p.id}">Adicionar à sacola <span aria-hidden="true">＋</span></button></article>`).join(''):'<p class="empty">Nenhum produto encontrado. Experimente outra busca ou categoria.</p>';
}
function renderCart(){
 $('#cart-count').textContent=state.cart.reduce((n,i)=>n+i.quantity,0);
 $('#open-cart').setAttribute('aria-label',`Abrir sacola, ${$('#cart-count').textContent} unidades`);
 let total=0,unknown=false;
 $('#cart-items').innerHTML=state.cart.length?state.cart.map(item=>{
 const p=state.products.find(p=>p.id===item.id),price=unitPrice(p,item.quantity);
 if(price===null)unknown=true;else total+=Math.round(price*100)*item.quantity;
 return `<article class="cart-item"><img src="${escapeHTML(p.images[0])}" alt="${escapeHTML(p.name)}"><div><h3>${escapeHTML(p.name)}</h3><p>${price===null?'Valor sob consulta':money(price)+' / '+p.unit+' · '+money(price*item.quantity)}</p><label for="qty-${p.id}">Quantidade${p.minimumSpecified?' · mínimo '+p.minimumQuantity:''}</label><div class="quantity"><input id="qty-${p.id}" data-quantity="${p.id}" type="number" min="${p.minimumQuantity}" max="99999" step="1" value="${item.quantity}"><button class="remove" data-remove="${p.id}" aria-label="Remover ${escapeHTML(p.name)}">Remover</button></div></div></article>`;
 }).join(''):'<div class="empty">Sua sacola está esperando boas ideias.<br>Escolha seus favoritos no catálogo.<br><button class="button" id="continue-shopping">Explorar catálogo ↗</button></div>';
 $('#cart-checkout').hidden=!state.cart.length;
 $('.total span').textContent=unknown?'Subtotal conhecido':'Total dos produtos';
 $('#total').textContent=money(total/100)+(unknown?' + sob consulta':'');
}
function addToCart(id){
 const p=state.products.find(p=>p.id===id),existing=state.cart.find(i=>i.id===id);
 if(!p)return;
 if(existing)existing.quantity=validQuantity(existing.quantity+p.minimumQuantity,p);else state.cart.push({id:p.id,quantity:p.minimumQuantity});
 persist();toast(`${p.name} adicionado à sacola`);
}
function showProduct(id){
 const p=state.products.find(p=>p.id===id);if(!p)return;
 $('#detail-content').innerHTML=`<div class="detail-gallery"><img id="detail-image" class="detail-image" src="${escapeHTML(p.images[0])}" alt="${escapeHTML(p.name)} — foto 1 de ${p.images.length}"><div class="thumbnails" aria-label="Fotos do produto">${p.images.length>1?p.images.map((image,index)=>`<button data-image-index="${index}" data-product="${p.id}" aria-label="Ver foto ${index+1} de ${p.images.length}" aria-pressed="${index===0}"><img src="${escapeHTML(image)}" alt="" loading="lazy"></button>`).join(''):''}</div></div><div class="detail-info"><p class="eyebrow">${escapeHTML(p.category)}</p><h2 id="detail-title">${escapeHTML(p.name)}</h2><p class="detail-code">Código ${p.id}</p><p class="description">${escapeHTML(p.description)}</p><p class="price">${p.price===null?'Sob consulta':money(p.price)+` <small>/ ${p.unit}</small>`}</p><p class="minimum">${p.minimumSpecified?`Mínimo de ${p.minimumQuantity} unidades`:'Consulte condições do pedido'}</p><button class="button" data-add="${p.id}">Adicionar à sacola ＋</button></div>`;
 $('#product-detail').showModal();
}
$('#products').addEventListener('click',event=>{
 const details=event.target.closest('[data-detail]');if(details){showProduct(details.dataset.detail);return;}
 const add=event.target.closest('[data-add]');if(add)addToCart(add.dataset.add);
});
$('#detail-content').addEventListener('click',event=>{
 const add=event.target.closest('[data-add]');if(add){addToCart(add.dataset.add);return;}
 const thumbnail=event.target.closest('[data-image-index]');if(!thumbnail)return;
 const p=state.products.find(p=>p.id===thumbnail.dataset.product),index=Number(thumbnail.dataset.imageIndex);
 $('#detail-image').src=p.images[index];
 $('#detail-image').alt=`${p.name} — foto ${index+1} de ${p.images.length}`;
 for(const button of document.querySelectorAll('.thumbnails button'))button.setAttribute('aria-pressed',String(button===thumbnail));
});
$('#close-detail').addEventListener('click',()=>$('#product-detail').close());
$('#product-detail').addEventListener('click',event=>{if(event.target===$('#product-detail')){const r=event.target.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)event.target.close();}});
$('#cart-items').addEventListener('click',event=>{
 const button=event.target.closest('[data-remove]');
 if(button){state.cart=state.cart.filter(i=>i.id!==button.dataset.remove);persist();}
 if(event.target.closest('#continue-shopping')){$('#cart').close();$('#catalogo').scrollIntoView();}
});
$('#cart-items').addEventListener('change',event=>{
 const id=event.target.dataset.quantity;if(!id)return;
 const p=state.products.find(p=>p.id===id),item=state.cart.find(i=>i.id===id);
 item.quantity=validQuantity(event.target.value,p);persist();
});
$('#categories').addEventListener('click',event=>{
 const button=event.target.closest('button');if(!button)return;state.category=button.dataset.category;
 for(const b of $('#categories').children)b.setAttribute('aria-pressed',b===button?'true':'false');renderProducts();
});
$('#search').addEventListener('input',renderProducts);$('#sort').addEventListener('change',renderProducts);
$('#open-cart').addEventListener('click',()=>$('#cart').showModal());
$('#close-cart').addEventListener('click',()=>$('#cart').close());
$('#cart').addEventListener('click',event=>{if(event.target===$('#cart')){const r=$('#cart').getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)$('#cart').close();}});
$('#checkout').addEventListener('click',()=>{
 if(!state.cart.length||!state.store)return;
 const message=buildMessage(state.cart,state.products,$('#notes').value,state.store.name);
 window.open(`https://wa.me/${state.store.whatsapp}?text=${encodeURIComponent(message)}`,'_blank','noopener,noreferrer');
});
$('#year').textContent=new Date().getFullYear();
function applyConfig(config){
 if(!/^\d{10,15}$/.test(config.whatsapp)||!config.name)throw Error('Configuração inválida');
 state.store=config;
 for(const link of document.querySelectorAll('[data-whatsapp]')){link.href=`https://wa.me/${config.whatsapp}`;link.hidden=false;}
 const phone=config.whatsapp.replace(/^55(\d{2})(\d{5})(\d{4})$/,'($1) $2-$3');
 for(const label of document.querySelectorAll('[data-store-phone]'))label.textContent=phone;
 if(config.instagram){
  const url=new URL(config.instagram);
  if(url.protocol==='https:')for(const link of document.querySelectorAll('[data-instagram]')){link.href=url.href;link.hidden=false;}
 }
}
async function load(){try{
 const results=await Promise.allSettled(['./config.json','./data/products.json'].map(async path=>{
  const response=await fetch(path);if(!response.ok)throw Error('Falha ao carregar '+path);return response.json();
 }));
 if(results[0].status==='fulfilled')applyConfig(results[0].value);else throw results[0].reason;
 if(results[1].status==='rejected')throw results[1].reason;
 state.products=results[1].value;
 let saved=null;try{saved=localStorage.getItem(storageKey);}catch{}
 state.cart=restoreCart(saved,state.products);
 $('#categories').innerHTML=['Todos',...new Set(state.products.map(p=>p.category))].map(c=>`<button data-category="${escapeHTML(c)}" aria-pressed="${c==='Todos'}">${escapeHTML(c)}</button>`).join('');
 renderProducts();renderCart();
}catch(error){
 $('#results').textContent='Não foi possível carregar o catálogo.';
 $('#products').innerHTML='<p>Recarregue a página para tentar novamente.</p>';
 if(state.store){
  const link=document.createElement('a');link.href=`https://wa.me/${state.store.whatsapp}`;link.textContent='Fale conosco pelo WhatsApp';$('#products').append(link);
 }
 $('#cart-items').textContent='Catálogo indisponível. Recarregue a página para tentar novamente.';$('#cart-checkout').hidden=true;
}}
load();
