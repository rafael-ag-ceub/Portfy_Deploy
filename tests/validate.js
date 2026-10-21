#!/usr/bin/env node
/* PORTFY · tests/validate.js
   Rode depois de editar:   node tests/validate.js
   Confere: arquivos existem, sintaxe JS, ids usados pelo JS existem no HTML,
   funções chamadas por onclick="..." existem, e as cores do CSS estão definidas. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
let erros = 0, avisos = 0;
const ruim = (m) => { erros++; console.log('  ✗ ' + m); };
const aviso = (m) => { avisos++; console.log('  ! ' + m); };
const bom = (m) => console.log('  ✓ ' + m);

const html = read('index.html');
console.log('1. Arquivos carregados pelo index.html');
const srcs = [...html.matchAll(/<script src="(js\/[^"?]+)/g)].map((m) => m[1]);
const css = [...html.matchAll(/href="(css\/[^"?]+)/g)].map((m) => m[1]);
[...srcs, ...css].forEach((f) => { if (!fs.existsSync(path.join(root, f))) ruim('Faltando: ' + f); });
if (!erros) bom(`${srcs.length} scripts e ${css.length} estilos encontrados`);

console.log('2. Sintaxe dos scripts');
let sint = 0;
srcs.forEach((f) => { try { new vm.Script(read(f), { filename: f }); } catch (e) { sint++; ruim(`${f}: ${e.message}`); } });
if (!sint) bom('Nenhum erro de sintaxe');

console.log('3. Ids usados no JS ($("#...")) existem no HTML');
const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
const dinamicos = new Set(); // ids criados por JS
srcs.forEach((f) => [...read(f).matchAll(/\bid="([^"$]+)"/g)].forEach((m) => dinamicos.add(m[1])));
let faltaId = 0;
srcs.forEach((f) => {
  for (const m of read(f).matchAll(/\$\('#([a-zA-Z][\w-]*)'\)/g)) {
    // m1, p1... são campos criados pelas janelas (modal.view.js)
    if (!ids.has(m[1]) && !dinamicos.has(m[1]) && !/^[mp]\d$/.test(m[1])) { faltaId++; aviso(`${f}: #${m[1]} não existe no HTML`); }
  }
});
if (!faltaId) bom('Todos os ids existem');

console.log('4. Funções chamadas em onclick/onsubmit/oninput existem');
const todo = srcs.map(read).join('\n') + '\n' + html;
const declaradas = new Set([...todo.matchAll(/(?:function\s+|const\s+|let\s+|var\s+)([A-Za-z_$][\w$]*)/g)].map((m) => m[1]));
const nativas = new Set(['event', 'this', 'if', 'return', 'document', 'window', 'location', 'localStorage', 'Math', 'Date', 'setTimeout', 'alert', 'confirm', 'history']);
let faltaFn = 0;
for (const m of todo.matchAll(/\bon(?:click|submit|input|keydown|change|focus|blur)="([^"]*)"/g)) {
  for (const c of m[1].matchAll(/(?<![.\w$])([A-Za-z_$][\w$]*)\s*\(/g)) {
    if (!declaradas.has(c[1]) && !nativas.has(c[1])) { faltaFn++; ruim(`Função não encontrada: ${c[1]}()`); }
  }
}
if (!faltaFn) bom('Todas as funções chamadas existem');

console.log('5. Variáveis de cor do CSS');
const defs = new Set(css.flatMap((f) => [...read(f).matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1])));
let semVar = 0;
css.forEach((f) => { for (const m of read(f).matchAll(/var\((--[\w-]+)/g)) if (!defs.has(m[1]) && m[1] !== '--ar') { semVar++; aviso(`${f}: ${m[1]} não está definida nos CSS`); } });
if (!semVar) bom('Todas as variáveis existem');

console.log('6. Ícones (sprite)');
const syms = new Set([...html.matchAll(/<symbol id="i-([\w-]+)"/g)].map((m) => m[1]));
let semIco = 0;
const usados = new Set([...html.matchAll(/#i-([\w-]+)"/g)].map((m) => m[1]));
srcs.forEach((f) => [...read(f).matchAll(/ico\('([\w-]+)'\)/g)].forEach((m) => usados.add(m[1])));
usados.forEach((n) => { if (!syms.has(n)) { semIco++; aviso(`Ícone "${n}" não existe no sprite do index.html`); } });
if (!semIco) bom(`${usados.size} ícones usados, todos no sprite`);

console.log(`\nResultado: ${erros} erro(s), ${avisos} aviso(s).`);
process.exit(erros ? 1 : 0);
