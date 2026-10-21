# Como editar o Portfy sem quebrar nada

Depois de qualquer mudança: recarregue com Ctrl+F5 e rode `node tests/validate.js`.

## 1. Mudar cores, fontes e arredondamento
Tudo fica no começo de `css/base.css`, em `:root { --br: ...; }` (tema claro) e no bloco do tema escuro logo abaixo. Troque o valor da variável e o app inteiro muda. Não apague variáveis: apenas altere valores.

## 2. Mudar textos
- **Landing, planos, rodapé:** `index.html` (procure o texto e troque).
- **Janelas do rodapé (Termos, Privacidade, etc.):** objeto `INFO` em `js/models/constants.js`.
- **Boas-vindas e sugestões do chat:** `WELCOME` e `SUGGESTIONS` em `js/models/chat.model.js`.
- **Quantidade de conversas salvas:** `CHAT_MAX` em `chat.model.js`.
- **Menu lateral:** `NAV` e `NAV_GROUPS` em `constants.js`.

## 3. Adicionar um ícone
No `index.html`, dentro do bloco `<svg>` de símbolos, acrescente `<symbol id="i-meuicone" viewBox="0 0 24 24">…</symbol>`. Use em HTML: `<svg class="i"><use href="#i-meuicone"/></svg>` ou em JS: `ico('meuicone')`.

## 4. O que NÃO renomear
- **ids do `index.html`** (`#pc`, `#sb`, `#nv`, `#ed`, `#ov`, `#md`, `#ts`, `#a-login`, `#ms`, `#ci`…): o JS os procura pelo nome. Pode mudar estilo e posição, não o id.
- **Nomes de função** chamados em `onclick="..."` (`chatNew`, `aiPause`, `go`…): se renomear, troque nos dois lugares.
- **Ordem dos `<script>`** no fim do `index.html`: models → services → views → controllers → main.
- **Nomes de tabela/coluna** no Supabase: o mapa está em `js/services/portfy-api.js` (`MAP`, `TABELA`).
- **`USE_SUPABASE`**: vem de `js/config.js`; config vazia = modo demonstração.

## 5. Onde mexer em cada coisa
| Quero mudar… | Arquivo |
|---|---|
| Visual da landing | `css/landing.css` + `index.html` |
| Login/cadastro | `css/auth.css` + `index.html` |
| Painel e páginas | `css/app.css` + `js/views/pages.view.js` |
| Chat de IA (visual) | `js/views/chat.view.js` + `css/app.css` (`.chatx`) |
| Chat de IA (comportamento) | `js/controllers/ai.controller.js` |
| Resposta da IA / modelo | `supabase/functions/_shared/ai.service.ts` (e redeploy) |

## 6. Se algo quebrar
Abra o console (F12). Rode `node tests/validate.js`. Cache antigo? Aumente `?v=5` para `?v=6` nas tags do `index.html`.
