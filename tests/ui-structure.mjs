import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const html = await readFile(resolve(root, "index.html"), "utf8");
const css = await readFile(resolve(root, "styles.css"), "utf8");
const core = await readFile(resolve(root, "app.js"), "utf8");
const ui = await readFile(resolve(root, "ui.js"), "utf8");

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
assert.equal(new Set(ids).size, ids.length, "IDs duplicados no HTML");

const queriedIds = [...ui.matchAll(/\$\("#([A-Za-z][\w:-]*)"\)/g)].map((match) => match[1]);
const missingIds = [...new Set(queriedIds)].filter((id) => !ids.includes(id));
assert.deepEqual(missingIds, [], `Seletores sem elemento: ${missingIds.join(", ")}`);

const tabs = [...html.matchAll(/data-result-tab="([^"]+)"/g)].map((match) => match[1]);
for (const tab of tabs) assert.ok(ids.includes(`result-tab-${tab}`), `Painel ausente para a aba ${tab}`);
assert.equal(new Set(tabs).size, tabs.length, "Abas de resultado duplicadas");

for (const requiredId of [
  "premiseList", "addPremiseButton", "conclusionInput", "argumentTextInput", "formulaInput",
  "analyzeButton", "results", "errorPanel", "successResults", "truthTable", "tableauSteps",
]) assert.ok(ids.includes(requiredId), `Controle obrigatório ausente: ${requiredId}`);

for (const landmark of ["header", "main", "section", "footer", "dialog"]) {
  assert.match(html, new RegExp(`<${landmark}\\b`), `Elemento semântico ausente: ${landmark}`);
}

assert.match(html, /<html lang="pt-BR">/, "Idioma da página");
assert.match(html, /name="viewport"/, "Viewport responsivo");
assert.match(html, /aria-label="Fórmula proposicional"/, "Entrada de fórmula identificada");
assert.match(html, /aria-live="polite"/, "Região de atualização acessível");
assert.match(html, /data-argument-input="fields"/, "Modo de premissas separadas");
assert.match(html, /data-argument-input="text"/, "Modo de texto corrido");
assert.match(html, /app\.js"><\/script>\s*<script src="ui\.js"/, "Scripts carregados na ordem correta");
assert.match(css, /prefers-reduced-motion/, "Respeita preferência por menos movimento");
assert.doesNotMatch(html, /\son\w+\s*=/i, "HTML não deve usar eventos inline");
assert.doesNotMatch(html, /https?:\/\//i, "Interface não deve depender de CDN externo");
assert.doesNotMatch(`${core}\n${ui}`, /\beval\s*\(/, "Aplicação não deve executar código dinâmico");
assert.match(ui, /const escapeHtml =/, "Função de escape de HTML presente");
assert.match(ui, /escapeHtml\(result\.normalized\)/, "Fórmula escapada antes da renderização");

for (const member of ["Mário Monteiro", "Bruno Gonçalves", "Ana Gabriella", "José Cleidson"]) {
  assert.match(html, new RegExp(member), `Integrante fixo ausente: ${member}`);
}
assert.match(html, /Res problemas nat discreta/, "Disciplina fixa ausente");
const teamDialog = html.match(/<dialog class="team-dialog"[\s\S]*?<\/dialog>/)?.[0] || "";
const teamButtons = [...teamDialog.matchAll(/<button\b/g)];
assert.equal((teamDialog.match(/class="team-member-card"/g) || []).length, 4, "A equipe deve possuir exatamente 4 integrantes");
assert.equal(teamButtons.length, 1, "A aba Equipe deve possuir somente o botão de fechar");
assert.match(teamDialog, /<button value="close" type="submit" aria-label="Fechar">×<\/button>/, "Botão de fechar da equipe ausente");
assert.doesNotMatch(teamDialog, /Integrante [1-4]/, "A equipe não deve exibir numeração abaixo dos nomes");
assert.doesNotMatch(html, /Salvar equipe|Adicionar integrante|>Cancelar</, "A equipe não deve possuir controles de edição");
assert.doesNotMatch(html, /Curso ou disciplina/, "A equipe deve exibir somente Disciplina");
assert.doesNotMatch(ui, /logiq-team-modern|renderMemberInputs|loadTeam/, "Lógica antiga de edição da equipe ainda presente");
assert.match(ui, /elements\.team\.addEventListener\("click", \(\) => elements\.dialog\.showModal\(\)\)/, "Botão Equipe deve abrir o diálogo");

const openingBraces = (css.match(/\{/g) || []).length;
const closingBraces = (css.match(/\}/g) || []).length;
assert.equal(openingBraces, closingBraces, "Chaves CSS desbalanceadas");
assert.match(css, /@media\s*\(max-width:\s*\d+px\)/, "Breakpoint móvel");
assert.match(css, /@media print/, "Estilos de impressão");

console.log(`OK — interface: ${ids.length} IDs, ${tabs.length} abas e verificações de acessibilidade/estrutura aprovadas.`);
