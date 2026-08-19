import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";

await import("../app.js");

const {
  LogicError,
  lex,
  parse,
  evaluate,
  formatFormula,
  collectVariables,
  buildTruthTable,
  buildTableau,
  analyzeFormula,
  parseArgumentText,
  compileArgument,
} = globalThis.LogiQ;

let assertions = 0;
let formulasChecked = 0;
const startedAt = performance.now();

function check(condition, message) {
  assertions += 1;
  assert.ok(condition, message);
}

function equal(actual, expected, message) {
  assertions += 1;
  assert.equal(actual, expected, message);
}

function throwsLogic(action, stage, message) {
  assertions += 1;
  assert.throws(action, (error) => error instanceof LogicError && error.stage === stage, message);
}

function assignmentsFor(variables) {
  return Array.from({ length: 2 ** variables.length }, (_, row) => Object.fromEntries(
    variables.map((variable, index) => [variable, (row & (1 << (variables.length - index - 1))) === 0]),
  ));
}

function refProp(name) { return { type: "prop", name }; }
function refNot(child) { return { type: "not", child }; }
function refBinary(type, left, right) { return { type, left, right }; }

const symbols = { and: "∧", or: "∨", imp: "→", iff: "↔" };
function refFormula(node) {
  if (node.type === "prop") return node.name;
  if (node.type === "not") return `¬${refFormula(node.child)}`;
  return `(${refFormula(node.left)} ${symbols[node.type]} ${refFormula(node.right)})`;
}

function refEvaluate(node, assignment) {
  if (node.type === "prop") return Boolean(assignment[node.name]);
  if (node.type === "not") return !refEvaluate(node.child, assignment);
  const left = refEvaluate(node.left, assignment);
  const right = refEvaluate(node.right, assignment);
  if (node.type === "and") return left && right;
  if (node.type === "or") return left || right;
  if (node.type === "imp") return !left || right;
  if (node.type === "iff") return left === right;
  throw new Error(`Referência desconhecida: ${node.type}`);
}

function verifyReference(reference, label = refFormula(reference)) {
  const source = refFormula(reference);
  const analysis = analyzeFormula(source);
  const variables = [...new Set(source.match(/[A-Z]/g) || [])].sort();
  const expectedValues = assignmentsFor(variables).map((assignment) => refEvaluate(reference, assignment));
  const expectedClass = expectedValues.every(Boolean)
    ? "tautology"
    : expectedValues.every((value) => !value)
      ? "contradiction"
      : "contingency";

  equal(analysis.truthTable.classification, expectedClass, `${label}: classificação`);
  equal(analysis.tableau.allClosed, expectedClass === "tautology", `${label}: Tableaux versus semântica`);
  equal(analysis.truthTable.rows.length, expectedValues.length, `${label}: quantidade de interpretações`);
  analysis.truthTable.rows.forEach((row, index) => {
    equal(row.result, expectedValues[index], `${label}: valor da linha ${index + 1}`);
    equal(evaluate(analysis.ast, row.assignment), expectedValues[index], `${label}: avaliador na linha ${index + 1}`);
  });
  if (expectedClass !== "tautology") {
    check(analysis.tableau.countermodel !== null, `${label}: contraexemplo presente`);
    equal(refEvaluate(reference, analysis.tableau.countermodel), false, `${label}: contraexemplo válido na referência`);
    equal(evaluate(analysis.ast, analysis.tableau.countermodel), false, `${label}: contraexemplo válido no programa`);
  }
  formulasChecked += 1;
}

// Alfabeto, aliases e normalização.
const aliases = [
  ["~P", "¬P"], ["!P", "¬P"], ["∼P", "¬P"],
  ["P^Q", "(P ∧ Q)"], ["P&Q", "(P ∧ Q)"],
  ["PvQ", "(P ∨ Q)"], ["P|Q", "(P ∨ Q)"],
  ["P->Q", "(P → Q)"], ["P<->Q", "(P ↔ Q)"],
  ["p v q", "(P ∨ Q)"], ["V", "V"],
];
for (const [source, normalized] of aliases) {
  equal(analyzeFormula(source).normalized, normalized, `Alias ${source}`);
}

// Argumentos em campos separados e em linguagem natural.
const parsedArgument = parseArgumentText("Se estudo, então sou aprovado. Estudo. Logo, sou aprovado.");
equal(parsedArgument.premises.length, 2, "Texto corrido separa duas premissas");
equal(parsedArgument.conclusion, "sou aprovado", "Texto corrido reconhece a conclusão");
for (const connector of ["Logo", "Portanto", "Assim", "Conclusão:", "∴"]) {
  const parsed = parseArgumentText(`P. ${connector} Q.`);
  equal(parsed.premises[0], "P", `Premissa com conectivo ${connector}`);
  equal(parsed.conclusion, "Q", `Conclusão com conectivo ${connector}`);
}
throwsLogic(() => parseArgumentText("P. Q."), "syntax", "Exige conectivo de conclusão");
throwsLogic(() => parseArgumentText("Logo, Q."), "syntax", "Exige premissa antes da conclusão");
throwsLogic(() => compileArgument(["P", ""], "Q"), "syntax", "Campo de premissa vazio é informado");

const naturalModusPonens = compileArgument(
  ["Se estudo, então sou aprovado", "Estudo"],
  "Sou aprovado",
);
equal(naturalModusPonens.isValid, true, "Modus Ponens com frases é válido");
equal(naturalModusPonens.truthTable.classification, "tautology", "Validade equivale a tautologia");
equal(naturalModusPonens.mapping.length, 2, "Frases repetidas reutilizam as mesmas proposições");

const symbolicModusPonens = compileArgument(["P → Q", "P"], "Q");
equal(symbolicModusPonens.isValid, true, "Modus Ponens simbólico é válido");
equal(symbolicModusPonens.mapping.length, 0, "Fórmulas simbólicas dispensam tradução");

const hypotheticalSyllogism = compileArgument(
  ["Se estudo, então sou aprovado", "Se sou aprovado, então comemoro", "Estudo"],
  "Comemoro",
);
equal(hypotheticalSyllogism.isValid, true, "Silogismo hipotético com frases é válido");

const disjunctiveSyllogism = compileArgument(["Estudo ou trabalho", "Não estudo"], "Trabalho");
equal(disjunctiveSyllogism.isValid, true, "Disjunção e negação em português são reconhecidas");

const invalidAffirmingConsequent = compileArgument(
  ["Se chove, então a rua fica molhada", "A rua fica molhada"],
  "Chove",
);
equal(invalidAffirmingConsequent.isValid, false, "Afirmação do consequente é inválida");
check(invalidAffirmingConsequent.tableau.countermodel !== null, "Argumento inválido possui contraexemplo");

const biconditionalPhrase = compileArgument(["Estudo se e somente se sou aprovado", "Estudo"], "Sou aprovado");
equal(biconditionalPhrase.isValid, true, "Bicondicional em português é reconhecida");

const mixedArgument = compileArgument(["P → Q", "Estudo"], "Estudo");
equal(mixedArgument.isValid, true, "Entradas simbólicas e frases podem ser combinadas");
equal(mixedArgument.mapping[0].symbol, "A", "Tradução evita colisão com P e Q já usados");

const invalidLexical = ["", "   ", "P + Q", "P @ Q", "P = Q", "P # Q", "P => Q", "P;Q", "P₂", "<script>"];
for (const source of invalidLexical) throwsLogic(() => lex(source), "lexical", `Erro léxico: ${source}`);

const invalidSyntax = [
  "P Q", "P))", "((P", "()", "( )", "→P", "P→", "P∧∧Q", "P&&Q", "P∨∨Q", "P↔↔Q",
  "¬", "¬→P", "P( Q )", "(P)Q", "P → )Q(", "((P ∧ Q)", "P ∧ (Q ∨)", "P ↔",
];
for (const source of invalidSyntax) throwsLogic(() => parse(lex(source)), "syntax", `Erro sintático: ${source}`);

const validSyntax = ["P", "((P))", "¬¬¬P", "(P ∧ Q)", "P∨Q∧R", "P→Q→R", "(P↔Q)↔R", "¬(P ∨ (Q ∧ ¬R))"];
for (const source of validSyntax) {
  const tokens = lex(source);
  const ast = parse(tokens);
  check(Boolean(ast), `Sintaxe válida: ${source}`);
  check(formatFormula(ast).length > 0, `Formatação válida: ${source}`);
}

// Precedência e associatividade.
equal(evaluate(parse(lex("P ∨ Q ∧ R")), { P: false, Q: true, R: false }), false, "∧ precede ∨");
equal(evaluate(parse(lex("P ∨ Q ∧ R")), { P: true, Q: false, R: false }), true, "Disjunção externa");
equal(evaluate(parse(lex("P → Q → R")), { P: false, Q: true, R: false }), true, "→ é associativo à direita");
equal(collectVariables(parse(lex("R ∧ (P ∨ Q)"))).join(""), "PQR", "Variáveis ordenadas e únicas");

// Leis clássicas e classificações conhecidas.
const knownCases = [
  ["P ∨ ¬P", "tautology"], ["P → P", "tautology"], ["¬(P ∧ ¬P)", "tautology"],
  ["((P → Q) ∧ P) → Q", "tautology"], ["(P → Q) ↔ (¬Q → ¬P)", "tautology"],
  ["¬(P ∨ Q) ↔ (¬P ∧ ¬Q)", "tautology"], ["¬(P ∧ Q) ↔ (¬P ∨ ¬Q)", "tautology"],
  ["(P ↔ Q) ↔ ((P → Q) ∧ (Q → P))", "tautology"],
  ["(P ∧ (Q ∨ R)) ↔ ((P ∧ Q) ∨ (P ∧ R))", "tautology"],
  ["(P ∨ (Q ∧ R)) ↔ ((P ∨ Q) ∧ (P ∨ R))", "tautology"],
  ["P ∧ ¬P", "contradiction"], ["¬(P → P)", "contradiction"],
  ["P", "contingency"], ["P ∧ Q", "contingency"], ["P ∨ Q", "contingency"], ["P → Q", "contingency"], ["P ↔ Q", "contingency"],
];
for (const [source, expected] of knownCases) {
  const analysis = analyzeFormula(source);
  equal(analysis.truthTable.classification, expected, `Caso conhecido: ${source}`);
  equal(analysis.tableau.allClosed, expected === "tautology", `Tableaux conhecido: ${source}`);
  formulasChecked += 1;
}

// Conjunto exaustivo: todas as combinações dos cinco operadores sobre uma base variada.
const P = refProp("P");
const Q = refProp("Q");
const basis = [
  P, Q, refNot(P), refNot(Q),
  refBinary("and", P, Q), refBinary("or", P, Q), refBinary("imp", P, Q), refBinary("iff", P, Q),
  refBinary("imp", Q, P), refBinary("and", P, refNot(Q)), refBinary("or", refNot(P), Q), refBinary("iff", P, refNot(Q)),
];
const binaryTypes = ["and", "or", "imp", "iff"];
for (const item of basis) verifyReference(item, `Base ${refFormula(item)}`);
for (const item of basis) verifyReference(refNot(item), `Negação ${refFormula(item)}`);
for (const type of binaryTypes) {
  for (const left of basis) {
    for (const right of basis) verifyReference(refBinary(type, left, right));
  }
}

// Fuzz determinístico reproduzível com fórmulas profundas.
let randomState = 0x5f3759df;
function random() {
  randomState ^= randomState << 13;
  randomState ^= randomState >>> 17;
  randomState ^= randomState << 5;
  return (randomState >>> 0) / 0x100000000;
}
const randomVariables = [refProp("P"), refProp("Q"), refProp("R")];
function randomReference(depth) {
  if (depth <= 0 || random() < 0.24) return randomVariables[Math.floor(random() * randomVariables.length)];
  if (random() < 0.22) return refNot(randomReference(depth - 1));
  const type = binaryTypes[Math.floor(random() * binaryTypes.length)];
  return refBinary(type, randomReference(depth - 1), randomReference(depth - 1));
}
for (let index = 0; index < 1400; index += 1) verifyReference(randomReference(2 + (index % 4)), `Fuzz ${index + 1}`);

// Limites, escala e invariantes internos.
const eightVariables = "(A ∨ ¬A) ∧ (B ∨ ¬B) ∧ (C ∨ ¬C) ∧ (D ∨ ¬D) ∧ (E ∨ ¬E) ∧ (F ∨ ¬F) ∧ (G ∨ ¬G) ∧ (H ∨ ¬H)";
const scaleAnalysis = analyzeFormula(eightVariables);
equal(scaleAnalysis.variables.length, 8, "Suporta oito proposições");
equal(scaleAnalysis.truthTable.rows.length, 256, "Tabela com 256 interpretações");
equal(scaleAnalysis.truthTable.classification, "tautology", "Tautologia com oito proposições");
equal(scaleAnalysis.tableau.allClosed, true, "Tableaux fecha na fórmula com oito proposições");
throwsLogic(() => analyzeFormula("A ∨ B ∨ C ∨ D ∨ E ∨ F ∨ G ∨ H ∨ I"), "tableau", "Limite de nove proposições informado");

const directAst = parse(lex("(P → Q) ∧ ¬R"));
const directTruth = buildTruthTable(directAst, collectVariables(directAst));
const directTableau = buildTableau(directAst, collectVariables(directAst));
equal(directTruth.rows.length, 8, "API direta da tabela-verdade");
check(directTableau.branches.length >= 1, "API direta do Tableaux");

const elapsed = Math.round(performance.now() - startedAt);
console.log(`OK — ${formulasChecked.toLocaleString("pt-BR")} fórmulas, ${assertions.toLocaleString("pt-BR")} verificações lógicas em ${elapsed} ms.`);
