import {colorName} from '../cart.js';

const categories = ['Chaveiros', 'Térmicos', 'Churrasco', 'Canetas', 'Chimarrão', 'Presentes', 'Comunicação visual', 'Troféus/medalhas', 'Acessórios', 'Escritório', 'Acrílico e MDF', 'Churrasco e cozinha', 'Vinho e bar', 'Copos e térmicos', 'Bolsas e nécessaires', 'Datas comemorativas'];
const key = 'midia-visual-admin-draft-v1';
const $ = id => document.getElementById(id);
const form = $('form');
const field = name => form.elements.namedItem(name);
let products = [];
let editing = null;
let colors = [];
let removing = null;
let editorVersion = 0;
let readingImages = false;
const normalize = text => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('pt-BR');
const money = value => value === null ? 'Sob consulta' : value.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});

function validate(value) {
  if (!Array.isArray(value)) throw new Error('O JSON deve conter uma lista de produtos.');
  const ids = new Set();
  for (const [index, p] of value.entries()) {
    const fail = message => { throw new Error(`Produto ${index + 1}: ${message}`); };
    if (!p || typeof p !== 'object' || Array.isArray(p)) fail('registro inválido.');
    for (const name of ['id', 'name', 'category', 'unit']) {
      if (typeof p[name] !== 'string' || !p[name].trim()) fail(`campo ${name} obrigatório.`);
    }
    if (ids.has(p.id.trim())) fail('código duplicado.');
    ids.add(p.id.trim());
    if (p.price !== null && (typeof p.price !== 'number' || !Number.isFinite(p.price) || p.price < 0)) fail('preço inválido.');
    if (!Number.isSafeInteger(p.minimumQuantity) || p.minimumQuantity < 1) fail('quantidade mínima inválida.');
    if (typeof p.minimumSpecified !== 'boolean' || typeof p.description !== 'string') fail('descrição ou indicador de mínimo inválido.');
    if (!Array.isArray(p.images) || p.images.some(image => typeof image !== 'string' || !image.trim())) fail('imagens devem ser uma lista de caminhos ou URLs.');
    if (p.colors !== undefined && (!Array.isArray(p.colors) || p.colors.some(color => {
      const name = colorName(color);
      return typeof name !== 'string' || !name.trim() || /[\r\n]/.test(name) ||
        (typeof color !== 'string' && (typeof color.hex !== 'string' || !/^#[0-9a-f]{6}$/i.test(color.hex)));
    }))) fail('cores devem conter um nome e um código hexadecimal de cor sólida.');
    if (p.priceTiers !== undefined && (!Array.isArray(p.priceTiers) || p.priceTiers.some(tier => !tier || !Number.isSafeInteger(tier.minimumQuantity) || tier.minimumQuantity < 1 || typeof tier.price !== 'number' || !Number.isFinite(tier.price) || tier.price < 0))) fail('faixas devem conter minimumQuantity inteiro positivo e price não negativo.');
  }
  return value;
}
function render() {
  const query = normalize($('search').value);
  const visible = products.filter(p => normalize(p.name).includes(query));
  $('products').replaceChildren(...visible.map(p => {
    const row = document.createElement('tr');
    const name = row.insertCell();
    const code = document.createElement('small'); code.textContent = p.id;
    name.append(code, document.createTextNode(p.name));
    for (const value of [p.category, money(p.price), `${p.minimumQuantity} ${p.unit}`]) row.insertCell().textContent = value;
    const actions = document.createElement('div'); actions.className = 'actions';
    for (const [label, action] of [['Editar', () => openEditor(p)], ['Remover', () => {
      removing = p.id; $('removal-name').textContent = p.name; $('removal').showModal();
    }]]) {
      const button = document.createElement('button'); button.textContent = label; button.addEventListener('click', action); actions.append(button);
    }
    row.insertCell().append(actions); return row;
  }));
  $('count').textContent = `${visible.length} de ${products.length} produtos`;
  $('empty').hidden = visible.length > 0;
  $('json').textContent = JSON.stringify(products, null, 2);
}
function changed(message) {
  render();
  try { localStorage.setItem(key, JSON.stringify(products)); $('status').textContent = message + ' Rascunho salvo neste navegador.'; }
  catch { $('status').textContent = message + ' Não foi possível salvar o rascunho no navegador. Baixe o JSON antes de sair.'; }
}
function imageValues() {
  return field('images').value.split('\n').map(value => value.trim()).filter(Boolean);
}
function renderImages() {
  $('image-preview').replaceChildren(...imageValues().map((source, index) => {
    const item = document.createElement('div');
    const image = document.createElement('img');
    image.alt = `Imagem ${index + 1}`;
    image.src = source.startsWith('assets/') ? '../' + source : source;
    const remove = document.createElement('button');
    remove.type = 'button'; remove.textContent = 'Remover';
    remove.setAttribute('aria-label', `Remover imagem ${index + 1}`);
    remove.addEventListener('click', () => {
      field('images').value = imageValues().filter((_, i) => i !== index).join('\n');
      renderImages();
    });
    item.append(image, remove); return item;
  }));
}
$('add-images').addEventListener('click', () => $('image-files').click());
$('image-files').addEventListener('change', async event => {
  const files = [...event.target.files];
  if (!files.length) return;
  const version = editorVersion;
  readingImages = true;
  $('save-product').disabled = true;
  $('image-files').disabled = true;
  $('add-images').disabled = true;
  $('image-status').textContent = 'Carregando imagens…';
  try {
    const images = await Promise.all(files.map(file => new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) return reject(new Error(`${file.name}: selecione um arquivo de imagem.`));
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error(`Não foi possível ler ${file.name}.`));
      reader.onabort = () => reject(new Error(`Leitura cancelada: ${file.name}.`));
      reader.readAsDataURL(file);
    })));
    if (version !== editorVersion) return;
    field('images').value = [...imageValues(), ...images].join('\n');
    renderImages();
    $('image-status').textContent = `${images.length} imagem(ns) adicionada(s). Salve o produto para aplicar.`;
  } catch (error) {
    if (version === editorVersion) $('image-status').textContent = error.message;
  } finally {
    if (version === editorVersion) {
      readingImages = false;
      $('save-product').disabled = false;
      $('image-files').disabled = false;
      $('add-images').disabled = false;
      $('image-files').value = '';
    }
  }
});
$('editor').addEventListener('close', () => { editorVersion++; });
function addTier(tier) {
  const row = document.createElement('div');
  row.className = 'tier-row';
  row.innerHTML = '<label>Quantidade superior a<input class="tier-threshold" type="number" min="0" step="1" required></label><label>Preço por unidade (R$)<input class="tier-price" type="number" min="0" step="0.01" required></label><button type="button" class="danger">Remover faixa</button><p class="tier-summary"></p>';
  const threshold = row.querySelector('.tier-threshold');
  const price = row.querySelector('.tier-price');
  threshold.value = tier ? tier.minimumQuantity - 1 : '';
  price.value = tier?.price ?? '';
  const summarize = () => {
    row.querySelector('.tier-summary').textContent = threshold.value !== '' && price.value !== ''
      ? `A partir de ${Number(threshold.value) + 1} unidades: ${money(Number(price.value))} por unidade.` : '';
  };
  row.addEventListener('input', summarize);
  row.querySelector('button').addEventListener('click', () => row.remove());
  summarize();
  $('price-tiers').append(row);
  return threshold;
}
$('add-tier').addEventListener('click', () => addTier().focus());
function readTiers() {
  const tiers = [...$('price-tiers').children].map(row => ({
    minimumQuantity: Number(row.querySelector('.tier-threshold').value) + 1,
    price: Number(row.querySelector('.tier-price').value),
  })).sort((a, b) => a.minimumQuantity - b.minimumQuantity);
  if (new Set(tiers.map(tier => tier.minimumQuantity)).size !== tiers.length) {
    throw new Error('Cada faixa de preço deve ter uma quantidade diferente.');
  }
  return tiers;
}
function renderColors() {
  $('product-colors').replaceChildren(...colors.map((color, index) => {
    const name = colorName(color);
    const row = document.createElement('li');
    const swatch = document.createElement('span');
    swatch.className = 'color-swatch';
    if (color.hex) {
      swatch.style.backgroundColor = color.hex;
      swatch.setAttribute('aria-hidden', 'true');
    } else {
      swatch.textContent = '?';
      swatch.setAttribute('aria-label', 'Sem amostra cadastrada');
    }
    const label = document.createElement('span');
    label.textContent = name;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Remover';
    remove.setAttribute('aria-label', `Remover cor ${name}`);
    remove.addEventListener('click', () => {
      colors.splice(index, 1);
      renderColors();
      field('colorName').focus();
    });
    row.append(swatch, label, remove);
    return row;
  }));
}

function saveColor() {
  const name = field('colorName').value.trim();
  if (!name) return false;
  const color = {name, hex: field('colorHex').value};
  const index = colors.findIndex(existing => colorName(existing) === name);
  if (index === -1) colors.push(color);
  else colors[index] = color;
  field('colorName').value = '';
  renderColors();
  return true;
}

const namedColors = [
  ['Preto', 0x000000], ['Branco', 0xffffff], ['Cinza', 0x808080], ['Cinza-claro', 0xc0c0c0],
  ['Vermelho', 0xff0000], ['Vinho', 0x800020], ['Laranja', 0xff8000], ['Amarelo', 0xffff00],
  ['Dourado', 0xffd700], ['Verde', 0x008000], ['Verde-limão', 0x00ff00], ['Oliva', 0x808000],
  ['Azul', 0x0000ff], ['Azul-marinho', 0x000080], ['Azul-claro', 0x87ceeb], ['Turquesa', 0x40e0d0],
  ['Roxo', 0x800080], ['Lilás', 0xc8a2c8], ['Magenta', 0xff00ff], ['Rosa', 0xffc0cb],
  ['Marrom', 0x8b4513], ['Bege', 0xf5f5dc],
];

field('colorHex').addEventListener('input', event => {
  const selected = Number.parseInt(event.target.value.slice(1), 16);
  let name = '';
  let closestDistance = Infinity;
  for (const [candidate, rgb] of namedColors) {
    const red = (selected >> 16) - (rgb >> 16);
    const green = ((selected >> 8) & 255) - ((rgb >> 8) & 255);
    const blue = (selected & 255) - (rgb & 255);
    const distance = red ** 2 + green ** 2 + blue ** 2;
    if (distance < closestDistance) {
      name = candidate;
      closestDistance = distance;
    }
  }
  const hex = event.target.value;
  const nameInUse = colors.some(color => colorName(color) === name && color.hex && color.hex.toLowerCase() !== hex);
  field('colorName').value = nameInUse ? `${name} (${hex})` : name;
});

$('add-color').addEventListener('click', () => {
  $('form-error').textContent = saveColor() ? '' : 'Informe o nome da cor.';
  field('colorName').focus();
});
field('colorName').addEventListener('keydown', event => {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  $('add-color').click();
});

function openEditor(product) {
  editorVersion++;
  readingImages = false;
  $('save-product').disabled = false;
  $('image-files').disabled = false;
  $('add-images').disabled = false;
  $('image-status').textContent = '';
  editing = product?.id ?? null;
  form.reset(); $('form-error').textContent = '';
  $('editor-title').textContent = product ? 'Editar produto' : 'Novo produto';
  field('category').replaceChildren(...categories.map(category => new Option(category, category)));
  if (product && !categories.includes(product.category)) {
    field('category').add(new Option(`${product.category} (categoria atual)`, product.category));
  }
  for (const name of ['id', 'name', 'category', 'price', 'minimumQuantity', 'unit', 'description']) field(name).value = product?.[name] ?? ({minimumQuantity: 1, unit: 'unidade', category: categories[0]}[name] ?? '');
  field('minimumSpecified').checked = product?.minimumSpecified ?? true;
  colors = [...(product?.colors ?? [])];
  renderColors();
  field('images').value = product?.images.join('\n') ?? '';
  $('price-tiers').replaceChildren();
  for (const tier of product?.priceTiers ?? []) addTier(tier);
  renderImages();
  $('editor').showModal();
}
form.addEventListener('submit', event => {
  event.preventDefault();
  if (readingImages) return;
  try {
    const product = {...(products.find(p => p.id === editing) ?? {})};
    for (const name of ['id', 'name', 'category', 'unit', 'description']) product[name] = field(name).value.trim();
    if (products.some(p => p.id !== editing && p.id === product.id)) throw new Error('Já existe um produto com este código.');
    product.price = field('price').value === '' ? null : Number(field('price').value);
    product.minimumQuantity = Number(field('minimumQuantity').value);
    product.minimumSpecified = field('minimumSpecified').checked;
    product.images = imageValues();
    saveColor();
    if (colors.length) product.colors = [...colors];
    else delete product.colors;
    const tiers = readTiers();
    if (tiers.length) product.priceTiers = tiers;
    else delete product.priceTiers;
    validate([product]);
    if (editing === null) products.push(product);
    else products[products.findIndex(p => p.id === editing)] = product;
    changed('Produto salvo.'); $('editor').close();
  } catch (error) { $('form-error').textContent = error.message; }
});
for (const id of ['close', 'cancel']) $(id).addEventListener('click', () => $('editor').close());
$('keep').addEventListener('click', () => $('removal').close());
$('confirm-remove').addEventListener('click', () => { products = products.filter(p => p.id !== removing); changed('Produto removido.'); $('removal').close(); });
$('create').addEventListener('click', () => openEditor());
$('search').addEventListener('input', render);
$('import').addEventListener('click', () => $('file').click());
$('file').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  try {
    const imported = validate(JSON.parse((await file.text()).replace(/^\uFEFF/, '')));
    if (confirm(`Importar ${imported.length} produtos e substituir o rascunho atual?`)) {
      products = imported; $('search').value = ''; changed('JSON importado.');
      for (const id of ['create', 'download', 'search']) $(id).disabled = false;
    }
  } catch (error) { $('status').textContent = `Importação não realizada: ${error.message}`; }
  finally { event.target.value = ''; }
});
$('download').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(products, null, 2) + '\n'], {type: 'application/json'}));
  const link = document.createElement('a'); link.href = url; link.download = 'products.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
async function init() {
  try {
    const response = await fetch('../data/products.json', {cache: 'no-store'});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    products = validate(await response.json());
    $('status').textContent = 'Catálogo carregado de products.json.';
    try {
      const draft = localStorage.getItem(key);
      if (draft && confirm('Há um rascunho local salvo. Deseja continuar suas edições? Cancele para carregar o products.json atual.')) {
        products = validate(JSON.parse(draft)); $('status').textContent = 'Rascunho local restaurado.';
      }
    } catch { $('status').textContent = 'Catálogo carregado. O rascunho local não pôde ser restaurado.'; }
    render();
    for (const id of ['create', 'import', 'download', 'search']) $(id).disabled = false;
  } catch (error) { $('status').textContent = `Não foi possível carregar o catálogo: ${error.message}. Você pode importar um JSON.`; $('import').disabled = false; }
}
init();
