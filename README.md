# Mídia Visual

Loja estática com catálogo de brindes, busca, filtros, ordenação e sacola persistida no navegador. O pedido é enviado ao WhatsApp como solicitação de orçamento. Não há checkout de pagamento nem backend.

## Executar localmente

```sh
npm run dev
```

Acesse http://localhost:8000. Requer Python 3. Abra via servidor HTTP: o catálogo usa `fetch` e módulos JavaScript, que não funcionam corretamente com `file://`.

## Publicar no GitHub Pages

1. Envie os arquivos para `main` ou `master` neste repositório.
2. Em **Settings → Pages → Build and deployment → Source**, escolha **GitHub Actions**.
3. O workflow `.github/workflows/pages.yml` publica os arquivos estáticos a cada push. Também pode ser iniciado em **Actions → Publicar no GitHub Pages → Run workflow**.

O site usa caminhos relativos e funciona no endereço de projeto `https://eduardobs.github.io/midia-visual/` e em domínio próprio. Para utilizar um domínio próprio, configure-o no GitHub Pages e ajuste o DNS conforme as instruções exibidas pelo GitHub. Nenhum domínio foi alterado nesta implementação.

## Atualizar produtos

Edite `data/products.json` e coloque fotos em `assets/products/`. Não é necessário compilar. Cada produto contém:

- `id`: identificador único estável, também enviado no WhatsApp.
- `name`, `category`, `description`: dados exibidos no catálogo.
- `images`: lista de caminhos relativos à raiz do site. A primeira foto aparece no catálogo e na sacola; todas aparecem na galeria do detalhe do produto.
- `price`: valor numérico em reais; `null` para orçamento sob consulta.
- `minimumQuantity`: mínimo aceito na sacola.
- `minimumSpecified`: indica se o PDF informa um mínimo. Quando não informa, a sacola começa em 1 e a página orienta a consultar as condições.
- `unit`: unidade de cobrança (`unidade` ou `kit`).
- `priceTiers`: opcional, regras de preço por quantidade, com `minimumQuantity` e `price`.

O PDF é apenas uma referência editorial: ele não faz parte dos arquivos do projeto nem é necessário para executar ou publicar o site.

Exemplo de galeria (adicione as fotos correspondentes em `assets/products/`):

```json
"images": [
  "assets/products/MV001.webp",
  "assets/products/MV001-verso.webp"
]
```

Clique na foto do catálogo para abrir o detalhe do produto. As miniaturas permitem escolher as fotos adicionais. Os produtos atuais têm uma foto cada; outras fotos podem ser incluídas na lista quando disponíveis.

Os 61 produtos foram transcritos do **Catálogo Mídia Visual – Nov 2026.pdf** fornecido pelo proprietário. Fotos extraídas do PDF e convertidas em WebP. Produtos sem preço no documento permanecem sob consulta; fotos de modelos ilustram essas linhas personalizadas. O chaveiro Pai Nosso custa R$ 9,00 até 30 unidades e R$ 6,00 a partir de 31. As condições de pagamento e entrega também vêm do PDF. Preços, cores, arte e disponibilidade são confirmados pela loja.

A logo e o banner foram recuperados do site público https://www.midiavisualtaquari.com/. A identidade utiliza azul, preto e detalhes em amarelo presentes no material existente.

## WhatsApp e sacola

As configurações ficam em `config.json`: `name` (nome da loja), `whatsapp` (número internacional, apenas dígitos) e `instagram` (URL HTTPS). O WhatsApp do rodapé, do pedido e da mensagem de erro usa essa única configuração. O telefone exibido é formatado automaticamente; o nome da loja também é usado na mensagem do pedido. Não é necessário editar HTML ou JavaScript para trocar esses dados.

A sacola respeita o mínimo de cada produto e permite alterar a quantidade ou remover itens. Dados inválidos ou produtos removidos do catálogo são descartados na restauração. A mensagem inclui itens, códigos, quantidades, valores, desconto por quantidade, subtotal e observações. Itens sob consulta não entram no subtotal conhecido. Frete não está incluído. O cliente revisa e envia a mensagem no WhatsApp; o site não a envia automaticamente.

A sacola permanece neste navegador via `localStorage`. Se o armazenamento estiver bloqueado, ela continua funcionando durante a visita. As observações não são persistidas.

## Validação

```sh
npm test
node --check app.js
```

Testes verificam integridade do catálogo e das fotos, mínimos, restauração da sacola, desconto e composição da mensagem. O site não depende de pacotes npm. Fontes Google são opcionais; fontes do sistema são usadas como alternativa.
