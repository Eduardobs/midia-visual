export const colorName = color => typeof color === 'string' ? color : color?.name;

export function unitPrice(product, quantity) {
  return (product.priceTiers || []).reduce((price, tier) => quantity >= tier.minimumQuantity ? tier.price : price, product.price);
}
export function validQuantity(value, product) {
  const number = Number(value);
  return Math.min(99999, Math.max(product.minimumQuantity, Number.isFinite(number) ? Math.floor(number) : product.minimumQuantity));
}
export function restoreCart(raw, products) {
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    const result = new Map();
    for (const item of data) {
      const product = products.find(p => p.id === item?.id);
      if (!product) continue;
      const entry = {id: product.id, quantity: validQuantity(item.quantity, product)};
      if (typeof item.color === 'string' && item.color.trim()) entry.color = item.color;
      result.set(JSON.stringify([entry.id, entry.color]), entry);
    }
    return [...result.values()];
  } catch { return []; }
}
export const money = value => new Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'}).format(value);
export function buildMessage(cart, products, notes, storeName) {
  let total = 0, unknown = false;
  const lines = cart.map(item => {
    const p = products.find(product => product.id === item.id);
    const price = unitPrice(p, item.quantity);
    if (price === null) unknown = true; else total += Math.round(price * 100) * item.quantity;
    return `• ${p.name} (${p.id})${item.color ? '\n  Cor: ' + item.color : ''}\n  Quantidade: ${item.quantity} | ${price === null ? 'Valor sob consulta' : money(price) + '/' + p.unit + ' | Subtotal: ' + money(price * item.quantity)}`;
  });
  return [`Olá, ${storeName}! Gostaria de solicitar um orçamento:`, '', ...lines, '', `${unknown ? 'Subtotal dos itens com preço' : 'Total dos produtos'}: ${money(total / 100)}`, ...(unknown ? ['Há itens com valor sob consulta.'] : []), ...(notes.trim() ? ['', 'Cores e personalização: ' + notes.trim()] : []), '', 'Por favor, confirmem a disponibilidade, personalização, prazo e frete. Enviarei a arte de gravação nesta conversa.'].join('\n');
}
