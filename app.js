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
 $('#products').innerHTML=products.length ? products.map(p=>`<article class="product-card"><div class="product-image"><img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.name)}" loading="lazy" width="750" height="750">${p.description.includes('Sob encomenda')?'<span class="product-tag">SOB ENCOMENDA</span>':''}</div><p class="category">${escapeHTML(p.category)}</p><h3>${escapeHTML(p.name)}</h3>${p.description?`<p class="description">${escapeHTML(p.description)}</p>`:''}<p class="price">${p.price===null?'Sob consulta':money(p.price)+` <small>/ ${p.unit}</small>`}</p><p class="minimum">${p.minimumSpecified?`Mínimo de ${p.minimumQuantity} unidades`:'Consulte condições do pedido'}</p><button class="add" data-add="${p.id}">Adicionar à sacola <span aria-hidden="true">＋</span></button></article>`).join(''):'<p class="empty">Nenhum produto encontrado. Experimente outra busca ou categoria.</p>';
}
function renderCart(){
 $('#cart-count').textContent=state.cart.reduce((n,i)=>n+i.quantity,0);
 $('#open-cart').setAttribute('aria-label',`Abrir sacola, ${$('#cart-count').textContent} unidades`);
 let total=0,unknown=false;
 $('#cart-items').innerHTML=state.cart.length?state.cart.map(item=>{
 const p=state.products.find(p=>p.id===item.id),price=unitPrice(p,item.quantity);
 if(price===null)unknown=true;else total+=Math.round(price*100)*item.quantity;
 return `<article class="cart-item"><img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.name)}"><div><h3>${escapeHTML(p.name)}</h3><p>${price===null?'Valor sob consulta':money(price)+' / '+p.unit+' · '+money(price*item.quantity)}</p><label for="qty-${p.id}">Quantidade${p.minimumSpecified?' · mínimo '+p.minimumQuantity:''}</label><div class="quantity"><input id="qty-${p.id}" data-quantity="${p.id}" type="number" min="${p.minimumQuantity}" max="99999" step="1" value="${item.quantity}"><button class="remove" data-remove="${p.id}" aria-label="Remover ${escapeHTML(p.name)}">Remover</button></div></div></article>`;
 }).join(''):'<div class="empty">Sua sacola está esperando boas ideias.<br>Escolha seus favoritos no catálogo.<br><button class="button" id="continue-shopping">Explorar catálogo ↗</button></div>';
 $('#cart-checkout').hidden=!state.cart.length;
 $('.total span').textContent=unknown?'Subtotal conhecido':'Total dos produtos';
 $('#total').textContent=money(total/100)+(unknown?' + sob consulta':'');
}
$('#products').addEventListener('click',event=>{
 const button=event.target.closest('[data-add]');if(!button)return;
 const p=state.products.find(p=>p.id===button.dataset.add),existing=state.cart.find(i=>i.id===p.id);
 if(existing)existing.quantity=validQuantity(existing.quantity+p.minimumQuantity,p);else state.cart.push({id:p.id,quantity:p.minimumQuantity});
 persist();toast(`${p.name} adicionado à sacola`);
});
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
 const message=buildMessage(state.cart,state.products,$('#notes').value);
 window.open(`https://wa.me/${state.store.whatsapp}?text=${encodeURIComponent(message)}`,'_blank','noopener,noreferrer');
});
$('#year').textContent=new Date().getFullYear();
async function load(){try{
 const responses=await Promise.all([fetch('./data/products.json'),fetch('./data/store.json')]);
 if(responses.some(r=>!r.ok))throw Error('Falha no catálogo');
 [state.products,state.store]=await Promise.all(responses.map(r=>r.json()));
 if(!/^\d{10,15}$/.test(state.store.whatsapp))throw Error('Contato inválido');
 let saved=null;try{saved=localStorage.getItem(storageKey);}catch{}
 state.cart=restoreCart(saved,state.products);
 $('#categories').innerHTML=['Todos',...new Set(state.products.map(p=>p.category))].map(c=>`<button data-category="${escapeHTML(c)}" aria-pressed="${c==='Todos'}">${escapeHTML(c)}</button>`).join('');
 renderProducts();renderCart();
}catch(error){$('#results').textContent='Não foi possível carregar o catálogo.';$('#products').innerHTML='<p>Recarregue a página ou <a href="https://wa.me/5551997393969">fale conosco pelo WhatsApp</a>.</p>';$('#cart-items').textContent='Catálogo indisponível. Recarregue a página para tentar novamente.';$('#cart-checkout').hidden=true;}}
load();
