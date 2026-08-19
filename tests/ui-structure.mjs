import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const html = await readFile(resolve(root, "index.html"), "utf8");
const css = await readFile(resolve(root, "styles.css"), "utf8");
const script = await readFile(resolve(root, "app.js"), "utf8");

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
assert.equal(new Set(ids).size, ids.length, "IDs duplicados no HTML");

const queriedIds = [...script.matchAll(/querySelector\("#([^"]+)"\)/g)].map((match) => match[1]);
const missingIds = [...new Set(queriedIds)].filter((id) => !ids.includes(id));
assert.deepEqual(missingIds, [], `Seletores sem elemento: ${missingIds.join(", ")}`);

const tabs = [...html.matchAll(/data-tab="([^"]+)"/g)].map((match) => match[1]);
for (const tab of tabs) assert.ok(ids.includes(`panel-${tab}`), `Painel ausente para a aba ${tab}`);

const duplicateTabs = tabs.filter((tab, index) => tabs.indexOf(tab) !== index);
assert.deepEqual(duplicateTabs, [], "Abas duplicadas");

for (const landmark of ["header", "nav", "main", "section", "aside", "footer", "dialog"]) {
  assert.match(html, new RegExp(`<${landmark}\\b`), `Elemento semântico ausente: ${landmark}`);
}

assert.match(html, /<html lang="pt-BR">/, "Idioma da página");
assert.match(html, /name="viewport"/, "Viewport responsivo");
assert.match(html, /for="formulaInput"/, "Rótulo da entrada");
assert.match(html, /aria-live="polite"/, "Região de atualização acessível");
assert.match(css, /prefers-reduced-motion/, "Respeita preferência por menos movimento");
assert.doesNotMatch(html, /\son\w+\s*=/i, "HTML não deve usar eventos inline");
assert.doesNotMatch(html, /https?:\/\/(?!logiq-calculadora)/i, "Interface não deve depender de CDN externo");
assert.doesNotMatch(script, /\beval\s*\(/, "Aplicação não deve executar código dinâmico");
assert.match(script, /const escapeHtml =/, "Função de escape de HTML presente");
assert.match(script, /escapeHtml\(analysis\.normalized\)/, "Fórmula escapada antes da renderização");
assert.match(script, /escapeHtml\(member\)/, "Nomes da equipe escapados antes da renderização");

const openingBraces = (css.match(/\{/g) || []).length;
const closingBraces = (css.match(/\}/g) || []).length;
assert.equal(openingBraces, closingBraces, "Chaves CSS desbalanceadas");
assert.match(css, /@media \(max-width: 720px\)/, "Breakpoint móvel");
assert.match(css, /@media print/, "Estilos de impressão");

console.log(`OK — interface: ${ids.length} IDs, ${tabs.length} abas e verificações de acessibilidade/estrutura aprovadas.`);
