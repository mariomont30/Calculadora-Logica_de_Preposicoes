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
let argumentsChecked = 0;
const startedAt = performance.now();

function check(condition, message) {
  assertions += 1;
  assert.ok(condition, message);
}

function equal(actual, expected, message) {
  assertions += 1;
  assert.equal(actual, expected, message);
}

function throwsLogic(action, stage, message, title = null) {
  assertions += 1;
  assert.throws(
    action,
    (error) => error instanceof LogicError && error.stage === stage && (!title || error.title === title),
    message,
  );
}

function verifyArgumentCountermodel(result, label) {
  equal(result.isValid, false, `${label}: argumento inválido`);
  equal(result.countermodelVerified, true, `${label}: contraexemplo marcado como confirmado`);
  result.premiseFormulas.forEach((formula, index) => {
    equal(
      evaluate(parse(lex(formula)), result.countermodel),
      true,
      `${label}: premissa ${index + 1} verdadeira no contraexemplo`,
    );
  });
  equal(
    evaluate(parse(lex(result.conclusionFormula)), result.countermodel),
    false,
    `${label}: conclusão falsa no contraexemplo`,
  );
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
    equal(analysis.countermodelVerified, true, `${label}: contraexemplo confirmado antes da exibição`);
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

const parsedCoordinatedArgument = parseArgumentText(
  "Hoje chove. Eu estudo. Eu trabalho. Eu vou à academia. Assim, hoje chove e eu estudo, trabalho e vou à academia.",
);
const coordinatedArgument = compileArgument(parsedCoordinatedArgument.premises, parsedCoordinatedArgument.conclusion);
equal(coordinatedArgument.isValid, true, "Enumeração na conclusão reutiliza as proposições das premissas");
equal(coordinatedArgument.premiseFormulas.join(""), "ABCD", "Quatro premissas recebem quatro proposições");
equal(coordinatedArgument.conclusionFormula, "(((A ∧ B) ∧ C) ∧ D)", "Sujeitos omitidos são recuperados sem criar letras extras");
equal(coordinatedArgument.mapping.length, 4, "A enumeração não cria proposições E e F");
equal(coordinatedArgument.variables.join(""), "ABCD", "A fórmula corrigida usa somente A, B, C e D");

const omittedFirstPerson = compileArgument(["Eu estudo", "Eu trabalho"], "Estudo e trabalho");
equal(omittedFirstPerson.isValid, true, "Pronome de primeira pessoa pode ser omitido na conclusão");
equal(omittedFirstPerson.mapping.length, 2, "Omissão do pronome preserva duas proposições");

const omittedThirdPerson = compileArgument(["Ele estuda"], "Estuda");
equal(omittedThirdPerson.isValid, true, "Pronome de terceira pessoa pode ser omitido quando a referência é única");
equal(omittedThirdPerson.mapping.length, 1, "Omissão inequívoca do sujeito preserva uma proposição");

const sharedCopula = compileArgument(["Maria é médica", "Maria é professora"], "Maria é médica e professora");
equal(sharedCopula.isValid, true, "Complemento após cópula reutiliza a proposição correspondente");
equal(sharedCopula.mapping.length, 2, "Cópula compartilhada não cria uma terceira proposição");

const sharedVerb = compileArgument(["Pedro compra pão", "Pedro compra leite"], "Pedro compra pão e leite");
equal(sharedVerb.isValid, true, "Objeto coordenado reutiliza as proposições completas");
equal(sharedVerb.mapping.length, 2, "Verbo compartilhado não cria uma terceira proposição");

const compoundSubject = compileArgument(["Ana e Bruno estudam"], "Ana e Bruno estudam");
equal(compoundSubject.isValid, true, "Sujeito composto repetido continua sendo uma proposição atômica");
equal(compoundSubject.mapping.length, 1, "Nomes unidos por e não são separados como fórmulas");

const compoundObject = compileArgument(["Pedro compra pão e leite"], "Pedro compra pão e leite");
equal(compoundObject.isValid, true, "Objeto composto repetido continua sendo uma proposição atômica");
equal(compoundObject.mapping.length, 1, "Objetos unidos por e não são separados sem contexto");

const normalizedPhrase = compileArgument(["Eu estudo"], "EU ESTUDO");
equal(normalizedPhrase.isValid, true, "Maiúsculas e minúsculas não criam proposições diferentes");
equal(normalizedPhrase.mapping.length, 1, "Normalização de caixa preserva uma única proposição");

const conditionalCoordination = compileArgument(
  ["Eu estudo", "Eu trabalho"],
  "Se eu estudo, então eu estudo e trabalho",
);
equal(conditionalCoordination.isValid, true, "Coordenação também é reutilizada dentro da condicional");
equal(conditionalCoordination.mapping.length, 2, "Condicional coordenada não cria proposições extras");

throwsLogic(
  () => compileArgument(["João é mortal", "Sócrates é mortal"], "João é mortal e mortal"),
  "syntax",
  "Referência elíptica com mais de um antecedente é recusada",
  "Referência ambígua",
);
throwsLogic(
  () => compileArgument(["Ele estuda", "Ela estuda"], "Estuda"),
  "syntax",
  "Sujeito omitido com duas referências possíveis é recusado",
  "Referência ambígua",
);
throwsLogic(
  () => compileArgument(["Eu estudo"], "Eu estudo, trabalho e canto"),
  "syntax",
  "Enumeração parcialmente desconhecida pede frases completas",
  "Enumeração ambígua",
);

const repeatedAtomicProposition = compileArgument(
  ["João estuda", "Maria trabalha", "Pedro viajou", "Ana trabalha"],
  "João estuda",
);
equal(repeatedAtomicProposition.premiseFormulas.join(""), "ABCD", "Proposições atômicas recebem letras estáveis");
equal(repeatedAtomicProposition.conclusionFormula, "A", "Proposição repetida na conclusão conserva a letra A");
equal(repeatedAtomicProposition.mapping.length, 4, "Repetição não cria uma quinta proposição");
equal(repeatedAtomicProposition.isValid, true, "Repetição direta produz argumento válido");

const repeatedCompoundPropositions = compileArgument(["João estuda", "Maria trabalha"], "João estuda e Maria trabalha");
equal(repeatedCompoundPropositions.premiseFormulas.join(""), "AB", "Premissas simples recebem A e B");
equal(repeatedCompoundPropositions.conclusionFormula, "(A ∧ B)", "Conclusão composta reutiliza A e B");
equal(repeatedCompoundPropositions.mapping.length, 2, "Conclusão composta não cria novas letras");
equal(repeatedCompoundPropositions.isValid, true, "Conjunção das premissas é uma conclusão válida");

const internalNegation = compileArgument(["João estuda"], "João não estuda");
equal(internalNegation.premiseFormulas[0], "A", "Proposição positiva recebe A");
equal(internalNegation.conclusionFormula, "¬A", "Negação após o sujeito reutiliza A");
equal(internalNegation.mapping.length, 1, "Negação interna não cria proposição independente");
verifyArgumentCountermodel(internalNegation, "Negação interna");

const parsedInternalNegation = parseArgumentText("João estuda. Logo, João não estuda.");
const textInternalNegation = compileArgument(parsedInternalNegation.premises, parsedInternalNegation.conclusion);
equal(textInternalNegation.conclusionFormula, "¬A", "Texto corrido preserva a negação após o sujeito");
verifyArgumentCountermodel(textInternalNegation, "Negação interna em texto corrido");

const negativePremiseFirst = compileArgument(["João não estuda"], "João estuda");
equal(negativePremiseFirst.premiseFormulas[0], "¬A", "Premissa negativa cria a base positiva A");
equal(negativePremiseFirst.conclusionFormula, "A", "Forma positiva posterior reutiliza A");
equal(negativePremiseFirst.mapping[0].phrase, "João estuda", "Legenda registra a proposição sem a negação");
verifyArgumentCountermodel(negativePremiseFirst, "Premissa negativa inicial");

const explicitCompoundPremise = compileArgument(["João estuda e Maria trabalha"], "João estuda");
equal(explicitCompoundPremise.premiseFormulas[0], "(A ∧ B)", "Conectivo explícito preserva a conjunção");
equal(explicitCompoundPremise.conclusionFormula, "A", "Conclusão reutiliza a parte esquerda da conjunção");
equal(explicitCompoundPremise.isValid, true, "Simplificação da conjunção é válida");

const negationInsideCompound = compileArgument(
  ["João estuda", "Maria trabalha"],
  "João estuda e Maria não trabalha",
);
equal(negationInsideCompound.conclusionFormula, "(A ∧ ¬B)", "Negação interna é preservada dentro da conjunção");
equal(negationInsideCompound.mapping.length, 2, "Negação composta reutiliza somente A e B");
verifyArgumentCountermodel(negationInsideCompound, "Negação dentro da conjunção");

const namedModusPonens = compileArgument(
  ["Se João estuda, então João será aprovado", "João estuda"],
  "João será aprovado",
);
equal(namedModusPonens.premiseFormulas[0], "(A → B)", "Condicional natural preserva A → B");
equal(namedModusPonens.premiseFormulas[1], "A", "Antecedente natural reutiliza A");
equal(namedModusPonens.conclusionFormula, "B", "Consequente natural reutiliza B");
equal(namedModusPonens.isValid, true, "Modus Ponens natural é válido");
equal(namedModusPonens.inferenceRule?.label, "Modus Ponens", "Modus Ponens é identificado");

const parsedNamedModusPonens = parseArgumentText(
  "Se João estuda, então João será aprovado. João estuda. Logo, João será aprovado.",
);
const textNamedModusPonens = compileArgument(parsedNamedModusPonens.premises, parsedNamedModusPonens.conclusion);
equal(textNamedModusPonens.premiseFormulas.join(","), "(A → B),A", "Texto corrido preserva as premissas do Modus Ponens");
equal(textNamedModusPonens.conclusionFormula, "B", "Texto corrido reutiliza o consequente B");
equal(textNamedModusPonens.inferenceRule?.label, "Modus Ponens", "Texto corrido identifica Modus Ponens");

const reorderedModusPonens = compileArgument(["P", "P → Q"], "Q");
equal(reorderedModusPonens.inferenceRule?.label, "Modus Ponens", "Modus Ponens independe da ordem das premissas");

const modusPonensWithExtraPremise = compileArgument(["P → Q", "R", "P"], "Q");
equal(modusPonensWithExtraPremise.isValid, true, "Premissa adicional não altera a validade do Modus Ponens");
equal(modusPonensWithExtraPremise.inferenceRule?.label, "Modus Ponens", "Regra é reconhecida com premissa adicional");

const namedModusTollens = compileArgument(
  ["Se João estuda, então João será aprovado", "João não será aprovado"],
  "João não estuda",
);
equal(namedModusTollens.isValid, true, "Modus Tollens natural é válido");
equal(namedModusTollens.inferenceRule?.label, "Modus Tollens", "Modus Tollens é identificado");

const namedHypotheticalSyllogism = compileArgument(
  ["Se João estuda, então João será aprovado", "Se João será aprovado, então João comemora"],
  "Se João estuda, então João comemora",
);
equal(namedHypotheticalSyllogism.isValid, true, "Silogismo Hipotético natural é válido");
equal(namedHypotheticalSyllogism.inferenceRule?.label, "Silogismo Hipotético", "Silogismo Hipotético é identificado");

const reorderedHypotheticalSyllogism = compileArgument(["Q → R", "P → Q"], "P → R");
equal(reorderedHypotheticalSyllogism.inferenceRule?.label, "Silogismo Hipotético", "Silogismo Hipotético independe da ordem das premissas");

const namedDisjunctiveSyllogism = compileArgument(
  ["João estuda ou Maria trabalha", "João não estuda"],
  "Maria trabalha",
);
equal(namedDisjunctiveSyllogism.isValid, true, "Silogismo Disjuntivo natural é válido");
equal(namedDisjunctiveSyllogism.inferenceRule?.label, "Silogismo Disjuntivo", "Silogismo Disjuntivo é identificado");

const namedAffirmingConsequent = compileArgument(
  ["Se João estuda, então João será aprovado", "João será aprovado"],
  "João estuda",
);
equal(namedAffirmingConsequent.inferenceRule?.label, "Afirmação do consequente", "Afirmação do consequente é identificada");
verifyArgumentCountermodel(namedAffirmingConsequent, "Afirmação do consequente");

const namedDenyingAntecedent = compileArgument(
  ["Se João estuda, então João será aprovado", "João não estuda"],
  "João não será aprovado",
);
equal(namedDenyingAntecedent.inferenceRule?.label, "Negação do antecedente", "Negação do antecedente é identificada");
verifyArgumentCountermodel(namedDenyingAntecedent, "Negação do antecedente");

for (const [result, expectedValidity, label] of [
  [namedModusPonens, true, "Modus Ponens"],
  [namedModusTollens, true, "Modus Tollens"],
  [namedHypotheticalSyllogism, true, "Silogismo Hipotético"],
  [namedDisjunctiveSyllogism, true, "Silogismo Disjuntivo"],
  [namedAffirmingConsequent, false, "Afirmação do consequente"],
  [namedDenyingAntecedent, false, "Negação do antecedente"],
]) {
  equal(result.methodAgreement.consistent, true, `${label}: métodos marcados como consistentes`);
  equal(result.methodAgreement.tableaux, expectedValidity, `${label}: resultado do Tableaux`);
  equal(result.methodAgreement.truthTable, expectedValidity, `${label}: resultado da tabela-verdade`);
  equal(result.methodAgreement.semanticEvaluator, expectedValidity, `${label}: resultado do avaliador semântico`);
}

equal(
  namedModusPonens.validityExplanation,
  "Não existe interpretação em que todas as premissas sejam verdadeiras e a conclusão seja falsa. Portanto, a conclusão decorre logicamente das premissas.",
  "Explicação didática do argumento válido",
);
equal(
  namedAffirmingConsequent.validityExplanation,
  "Existe pelo menos uma interpretação em que todas as premissas são verdadeiras e a conclusão é falsa. Portanto, a conclusão não decorre necessariamente das premissas.",
  "Explicação didática do argumento inválido",
);

const unlabelledValidArgument = compileArgument(["P ∧ Q"], "Q ∧ P");
equal(unlabelledValidArgument.isValid, true, "Argumento válido não listado continua correto");
equal(unlabelledValidArgument.inferenceRule, null, "Regra desconhecida não recebe rótulo inventado");
equal(unlabelledValidArgument.countermodel, null, "Argumento válido não possui contraexemplo");

const tenseSensitiveArgument = compileArgument(
  ["Se João estuda, então João será aprovado", "João foi aprovado"],
  "João estudou",
);
equal(tenseSensitiveArgument.isValid, false, "Tempos verbais diferentes permanecem proposições distintas");
equal(tenseSensitiveArgument.mapping.length, 4, "Tradutor não inventa equivalência semântica entre tempos verbais");
equal(tenseSensitiveArgument.inferenceRule, null, "Tempos verbais diferentes não produzem falsa identificação de regra");
verifyArgumentCountermodel(tenseSensitiveArgument, "Diferença de tempo verbal");

for (const scopedArgument of [
  ["Todo médico estudou anatomia", "João é médico"],
  ["Algum aluno foi aprovado", "João estuda"],
  ["Nenhum peixe é mamífero", "Baleias são mamíferos"],
  ["Existe uma pessoa estudiosa", "Maria estuda"],
  ["Alguém estuda lógica", "Maria estuda"],
  ["Ninguém faltou à aula", "João estuda"],
]) {
  throwsLogic(
    () => compileArgument(scopedArgument, "João estudou anatomia"),
    "syntax",
    `Quantificador fora do escopo: ${scopedArgument[0]}`,
    "Fora do escopo proposicional",
  );
}

throwsLogic(
  () => compileArgument(["João não só estuda"], "João estuda"),
  "syntax",
  "Negação ambígua solicita reformulação",
  "Negação ambígua",
);
throwsLogic(
  () => compileArgument(["Não só estudo"], "Estudo"),
  "syntax",
  "Negação ambígua no início solicita reformulação",
  "Negação ambígua",
);
for (const incompleteNegation of ["Não", "João não"]) {
  throwsLogic(
    () => compileArgument([incompleteNegation], "João estuda"),
    "syntax",
    `Negação incompleta: ${incompleteNegation}`,
    "Negação incompleta",
  );
}

// Matriz determinística de argumentos: concordância dos métodos e contraexemplos.
const argumentFormulaPool = ["P", "Q", "¬P", "¬Q", "P → Q", "Q → P", "P ∧ Q", "P ∨ Q"];
for (const firstPremise of argumentFormulaPool) {
  for (const secondPremise of argumentFormulaPool) {
    for (const generatedConclusion of argumentFormulaPool) {
      const label = `${firstPremise}, ${secondPremise} ∴ ${generatedConclusion}`;
      const generatedArgument = compileArgument([firstPremise, secondPremise], generatedConclusion);
      equal(generatedArgument.methodAgreement.consistent, true, `${label}: métodos consistentes`);
      equal(generatedArgument.methodAgreement.tableaux, generatedArgument.isValid, `${label}: Tableaux`);
      equal(generatedArgument.methodAgreement.truthTable, generatedArgument.isValid, `${label}: tabela-verdade`);
      equal(generatedArgument.methodAgreement.semanticEvaluator, generatedArgument.isValid, `${label}: avaliador semântico`);
      if (generatedArgument.isValid) {
        equal(generatedArgument.countermodel, null, `${label}: argumento válido sem contraexemplo`);
      } else {
        verifyArgumentCountermodel(generatedArgument, label);
      }
      argumentsChecked += 1;
    }
  }
}

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
console.log(`OK — ${formulasChecked.toLocaleString("pt-BR")} fórmulas, ${argumentsChecked.toLocaleString("pt-BR")} argumentos gerados e ${assertions.toLocaleString("pt-BR")} verificações lógicas em ${elapsed} ms.`);
