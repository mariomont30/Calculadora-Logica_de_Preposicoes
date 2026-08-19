(() => {
  "use strict";

  const TOKEN_LABELS = {
    PROP: "Proposição",
    NOT: "Negação",
    AND: "Conjunção",
    OR: "Disjunção",
    IMP: "Condicional",
    IFF: "Bicondicional",
    LPAREN: "Abre parêntese",
    RPAREN: "Fecha parêntese",
  };

  const NODE_SYMBOLS = {
    not: "¬",
    and: "∧",
    or: "∨",
    imp: "→",
    iff: "↔",
  };

  const NODE_LABELS = {
    prop: "proposição",
    not: "negação",
    and: "conjunção",
    or: "disjunção",
    imp: "condicional",
    iff: "bicondicional",
  };

  class LogicError extends Error {
    constructor(stage, message, position = 0, title = "Não foi possível analisar") {
      super(message);
      this.name = "LogicError";
      this.stage = stage;
      this.position = position;
      this.title = title;
    }
  }

  function token(type, value, raw, start, end) {
    return { type, value, raw, start, end };
  }

  function lex(source) {
    if (typeof source !== "string" || source.trim() === "") {
      throw new LogicError("lexical", "Digite uma fórmula proposicional antes de continuar.", 0, "A fórmula está vazia");
    }

    const tokens = [];
    let index = 0;

    while (index < source.length) {
      const char = source[index];

      if (/\s/u.test(char)) {
        index += 1;
        continue;
      }

      const triple = source.slice(index, index + 3);
      const double = source.slice(index, index + 2);

      if (triple === "<->") {
        tokens.push(token("IFF", "↔", triple, index, index + 3));
        index += 3;
        continue;
      }

      if (double === "->") {
        tokens.push(token("IMP", "→", double, index, index + 2));
        index += 2;
        continue;
      }

      const direct = {
        "¬": ["NOT", "¬"],
        "~": ["NOT", "¬"],
        "∼": ["NOT", "¬"],
        "!": ["NOT", "¬"],
        "∧": ["AND", "∧"],
        "^": ["AND", "∧"],
        "&": ["AND", "∧"],
        "∨": ["OR", "∨"],
        "|": ["OR", "∨"],
        "→": ["IMP", "→"],
        "↔": ["IFF", "↔"],
        "(": ["LPAREN", "("],
        ")": ["RPAREN", ")"],
      }[char];

      if (direct) {
        tokens.push(token(direct[0], direct[1], char, index, index + 1));
        index += 1;
        continue;
      }

      // Na notação tradicional usada no enunciado, o "v" minúsculo é disjunção.
      if (char === "v") {
        tokens.push(token("OR", "∨", char, index, index + 1));
        index += 1;
        continue;
      }

      if (/[A-Za-z]/.test(char)) {
        tokens.push(token("PROP", char.toUpperCase(), char, index, index + 1));
        index += 1;
        continue;
      }

      throw new LogicError(
        "lexical",
        `O caractere “${char}” não pertence ao alfabeto da lógica proposicional aceito pelo programa.`,
        index,
        "Símbolo não reconhecido",
      );
    }

    tokens.push(token("EOF", "", "", source.length, source.length));
    return tokens;
  }

  class Parser {
    constructor(tokens) {
      this.tokens = tokens;
      this.current = 0;
    }

    parse() {
      const expression = this.parseBiconditional();
      const remaining = this.peek();
      if (remaining.type !== "EOF") {
        if (remaining.type === "RPAREN") {
          throw this.syntaxError(remaining, "Há um parêntese de fechamento sem abertura correspondente.", "Parêntese excedente");
        }
        if (remaining.type === "PROP" || remaining.type === "LPAREN" || remaining.type === "NOT") {
          throw this.syntaxError(remaining, "Falta um operador lógico entre as duas subfórmulas.", "Operador ausente");
        }
        throw this.syntaxError(remaining, `O símbolo “${remaining.value}” apareceu em uma posição inesperada.`);
      }
      return expression;
    }

    parseBiconditional() {
      let node = this.parseImplication();
      while (this.match("IFF")) {
        const operator = this.previous();
        const right = this.requireRightOperand(() => this.parseImplication(), operator);
        node = { type: "iff", left: node, right, position: operator.start };
      }
      return node;
    }

    parseImplication() {
      const left = this.parseDisjunction();
      if (this.match("IMP")) {
        const operator = this.previous();
        const right = this.requireRightOperand(() => this.parseImplication(), operator);
        return { type: "imp", left, right, position: operator.start };
      }
      return left;
    }

    parseDisjunction() {
      let node = this.parseConjunction();
      while (this.match("OR")) {
        const operator = this.previous();
        const right = this.requireRightOperand(() => this.parseConjunction(), operator);
        node = { type: "or", left: node, right, position: operator.start };
      }
      return node;
    }

    parseConjunction() {
      let node = this.parseUnary();
      while (this.match("AND")) {
        const operator = this.previous();
        const right = this.requireRightOperand(() => this.parseUnary(), operator);
        node = { type: "and", left: node, right, position: operator.start };
      }
      return node;
    }

    parseUnary() {
      if (this.match("NOT")) {
        const operator = this.previous();
        if (this.check("EOF") || this.check("RPAREN") || this.isBinary(this.peek())) {
          throw this.syntaxError(this.peek(), "A negação precisa ser seguida por uma proposição ou subfórmula.", "Operando ausente");
        }
        return { type: "not", child: this.parseUnary(), position: operator.start };
      }
      return this.parsePrimary();
    }

    parsePrimary() {
      if (this.match("PROP")) {
        const proposition = this.previous();
        return { type: "prop", name: proposition.value, position: proposition.start };
      }

      if (this.match("LPAREN")) {
        const opening = this.previous();
        if (this.check("RPAREN")) {
          throw this.syntaxError(this.peek(), "Parênteses vazios não formam uma fórmula proposicional.", "Subfórmula vazia");
        }
        const expression = this.parseBiconditional();
        if (!this.match("RPAREN")) {
          throw this.syntaxError(this.peek(), `O parêntese aberto na posição ${opening.start + 1} não foi fechado.`, "Parêntese não fechado");
        }
        return expression;
      }

      const current = this.peek();
      if (current.type === "RPAREN") {
        throw this.syntaxError(current, "O parêntese fecha antes que uma subfórmula seja concluída.", "Estrutura incompleta");
      }
      if (this.isBinary(current)) {
        throw this.syntaxError(current, `O operador “${current.value}” precisa de uma fórmula à esquerda.`, "Operando ausente");
      }
      throw this.syntaxError(current, "Era esperada uma proposição, uma negação ou uma subfórmula entre parênteses.", "Fórmula incompleta");
    }

    requireRightOperand(parseFunction, operator) {
      if (this.check("EOF") || this.check("RPAREN") || this.isBinary(this.peek())) {
        throw this.syntaxError(this.peek(), `O operador “${operator.value}” precisa de uma fórmula à direita.`, "Operando ausente");
      }
      return parseFunction();
    }

    isBinary(tokenValue) {
      return ["AND", "OR", "IMP", "IFF"].includes(tokenValue.type);
    }

    match(...types) {
      if (!types.some((type) => this.check(type))) return false;
      this.advance();
      return true;
    }

    check(type) {
      return this.peek().type === type;
    }

    advance() {
      if (!this.check("EOF")) this.current += 1;
      return this.previous();
    }

    peek() {
      return this.tokens[this.current];
    }

    previous() {
      return this.tokens[Math.max(0, this.current - 1)];
    }

    syntaxError(tokenValue, message, title = "Fórmula malformada") {
      return new LogicError("syntax", message, tokenValue.start, title);
    }
  }

  function parse(tokens) {
    return new Parser(tokens).parse();
  }

  function formatFormula(node) {
    if (node.type === "prop") return node.name;
    if (node.type === "not") return `¬${formatFormula(node.child)}`;
    return `(${formatFormula(node.left)} ${NODE_SYMBOLS[node.type]} ${formatFormula(node.right)})`;
  }

  function collectVariables(node, variables = new Set()) {
    if (node.type === "prop") variables.add(node.name);
    else if (node.type === "not") collectVariables(node.child, variables);
    else {
      collectVariables(node.left, variables);
      collectVariables(node.right, variables);
    }
    return [...variables].sort((a, b) => a.localeCompare(b));
  }

  function evaluate(node, assignment) {
    switch (node.type) {
      case "prop": return Boolean(assignment[node.name]);
      case "not": return !evaluate(node.child, assignment);
      case "and": return evaluate(node.left, assignment) && evaluate(node.right, assignment);
      case "or": return evaluate(node.left, assignment) || evaluate(node.right, assignment);
      case "imp": return !evaluate(node.left, assignment) || evaluate(node.right, assignment);
      case "iff": return evaluate(node.left, assignment) === evaluate(node.right, assignment);
      default: throw new Error(`Tipo de nó desconhecido: ${node.type}`);
    }
  }

  function buildTruthTable(ast, variables) {
    const rowCount = 2 ** variables.length;
    const rows = [];
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      const assignment = {};
      variables.forEach((variable, variableIndex) => {
        const bit = 1 << (variables.length - variableIndex - 1);
        assignment[variable] = (rowIndex & bit) === 0;
      });
      rows.push({ assignment, result: evaluate(ast, assignment) });
    }
    const trueCount = rows.filter((row) => row.result).length;
    const classification = trueCount === rows.length ? "tautology" : trueCount === 0 ? "contradiction" : "contingency";
    return { rows, trueCount, falseCount: rows.length - trueCount, classification };
  }

  function signedKey(sign, node) {
    return `${sign ? "T" : "F"}:${formatFormula(node)}`;
  }

  function addSignedFormula(branch, sign, node) {
    const key = signedKey(sign, node);
    if (branch.formulas.some((item) => item.key === key)) return;
    branch.formulas.push({ sign, node, key, expanded: node.type === "prop" });
  }

  function findContradiction(branch) {
    const literals = new Map();
    for (const item of branch.formulas) {
      if (item.node.type !== "prop") continue;
      if (literals.has(item.node.name) && literals.get(item.node.name) !== item.sign) return item.node.name;
      literals.set(item.node.name, item.sign);
    }
    return null;
  }

  function closeIfContradictory(branch) {
    const contradiction = findContradiction(branch);
    if (contradiction) {
      branch.closed = true;
      branch.contradiction = contradiction;
    }
  }

  function expansionFor(item) {
    const { sign, node } = item;
    const signed = (value, child) => ({ sign: value, node: child });

    if (node.type === "not") {
      return {
        kind: "alpha",
        rule: sign ? "T¬ (α)" : "F¬ (α)",
        description: sign ? "A negação verdadeira torna a subfórmula falsa." : "A negação falsa torna a subfórmula verdadeira.",
        groups: [[signed(!sign, node.child)]],
      };
    }

    if (node.type === "and") {
      return sign
        ? { kind: "alpha", rule: "T∧ (α)", description: "Os dois termos da conjunção são verdadeiros no mesmo ramo.", groups: [[signed(true, node.left), signed(true, node.right)]] }
        : { kind: "beta", rule: "F∧ (β)", description: "Ao menos um termo da conjunção é falso.", groups: [[signed(false, node.left)], [signed(false, node.right)]] };
    }

    if (node.type === "or") {
      return sign
        ? { kind: "beta", rule: "T∨ (β)", description: "Ao menos um termo da disjunção é verdadeiro.", groups: [[signed(true, node.left)], [signed(true, node.right)]] }
        : { kind: "alpha", rule: "F∨ (α)", description: "Os dois termos da disjunção são falsos no mesmo ramo.", groups: [[signed(false, node.left), signed(false, node.right)]] };
    }

    if (node.type === "imp") {
      return sign
        ? { kind: "beta", rule: "T→ (β)", description: "A condicional é verdadeira se o antecedente for falso ou o consequente verdadeiro.", groups: [[signed(false, node.left)], [signed(true, node.right)]] }
        : { kind: "alpha", rule: "F→ (α)", description: "A condicional falsa exige antecedente verdadeiro e consequente falso.", groups: [[signed(true, node.left), signed(false, node.right)]] };
    }

    if (node.type === "iff") {
      return sign
        ? { kind: "beta", rule: "T↔ (β)", description: "Na bicondicional verdadeira, os dois lados têm valores iguais.", groups: [[signed(true, node.left), signed(true, node.right)], [signed(false, node.left), signed(false, node.right)]] }
        : { kind: "beta", rule: "F↔ (β)", description: "Na bicondicional falsa, os dois lados têm valores diferentes.", groups: [[signed(true, node.left), signed(false, node.right)], [signed(false, node.left), signed(true, node.right)]] };
    }

    throw new Error(`Não existe regra de expansão para ${node.type}.`);
  }

  function cloneBranch(branch, id, label) {
    return {
      id,
      label,
      formulas: branch.formulas.map((item) => ({ ...item })),
      closed: false,
      contradiction: null,
    };
  }

  function buildTableau(ast, variables) {
    let serial = 1;
    let branches = [{
      id: `B${serial}`,
      label: "1",
      formulas: [{ sign: false, node: ast, key: signedKey(false, ast), expanded: ast.type === "prop" }],
      closed: false,
      contradiction: null,
    }];
    const steps = [];
    let guard = 0;

    while (guard < 2500) {
      guard += 1;
      const branchIndex = branches.findIndex((branch) => !branch.closed && branch.formulas.some((item) => !item.expanded));
      if (branchIndex === -1) break;

      const branch = branches[branchIndex];
      const itemIndex = branch.formulas.findIndex((item) => !item.expanded);
      const item = branch.formulas[itemIndex];
      const expansion = expansionFor(item);
      item.expanded = true;

      if (expansion.kind === "alpha") {
        expansion.groups[0].forEach((derived) => addSignedFormula(branch, derived.sign, derived.node));
        closeIfContradictory(branch);
        steps.push({
          number: steps.length + 1,
          branch: branch.id,
          source: `${item.sign ? "T" : "F"} ${formatFormula(item.node)}`,
          rule: expansion.rule,
          description: expansion.description,
          outcome: branch.closed ? `O ramo ${branch.id} fechou.` : `Novas fórmulas adicionadas a ${branch.id}.`,
        });
      } else {
        serial += 1;
        const leftBranch = cloneBranch(branch, `B${serial}`, `${branch.label}.1`);
        serial += 1;
        const rightBranch = cloneBranch(branch, `B${serial}`, `${branch.label}.2`);
        expansion.groups[0].forEach((derived) => addSignedFormula(leftBranch, derived.sign, derived.node));
        expansion.groups[1].forEach((derived) => addSignedFormula(rightBranch, derived.sign, derived.node));
        closeIfContradictory(leftBranch);
        closeIfContradictory(rightBranch);
        branches.splice(branchIndex, 1, leftBranch, rightBranch);
        steps.push({
          number: steps.length + 1,
          branch: branch.id,
          source: `${item.sign ? "T" : "F"} ${formatFormula(item.node)}`,
          rule: expansion.rule,
          description: expansion.description,
          outcome: `${branch.id} originou ${leftBranch.id} e ${rightBranch.id}.`,
        });
      }
    }

    if (guard >= 2500) {
      throw new LogicError("tableau", "A fórmula produziu uma prova maior que o limite seguro desta demonstração.", 0, "Limite de expansão atingido");
    }

    branches.forEach(closeIfContradictory);
    const openBranches = branches.filter((branch) => !branch.closed);
    const allClosed = openBranches.length === 0;
    let countermodel = null;

    if (!allClosed) {
      countermodel = Object.fromEntries(variables.map((variable) => [variable, false]));
      openBranches[0].formulas.forEach((item) => {
        if (item.node.type === "prop") countermodel[item.node.name] = item.sign;
      });
    }

    return {
      branches,
      steps,
      allClosed,
      closedCount: branches.filter((branch) => branch.closed).length,
      openCount: openBranches.length,
      countermodel,
    };
  }

  function analyzeFormula(source) {
    const tokens = lex(source);
    const ast = parse(tokens);
    const variables = collectVariables(ast);
    if (variables.length > 8) {
      throw new LogicError("tableau", "Para manter a prova e a tabela legíveis, use no máximo 8 proposições diferentes.", 0, "Muitas proposições");
    }
    const truthTable = buildTruthTable(ast, variables);
    const tableau = buildTableau(ast, variables);
    return { source, tokens, ast, variables, truthTable, tableau, normalized: formatFormula(ast) };
  }

  const escapeHtml = (value) => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const delay = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

  function initInterface() {
    const elements = {
      input: document.querySelector("#formulaInput"),
      inputField: document.querySelector("#formulaField"),
      inputHelp: document.querySelector("#inputHelp"),
      analyze: document.querySelector("#analyzeButton"),
      clear: document.querySelector("#clearButton"),
      results: document.querySelector("#results"),
      errorPanel: document.querySelector("#errorPanel"),
      successResults: document.querySelector("#successResults"),
      errorStage: document.querySelector("#errorStage"),
      errorTitle: document.querySelector("#errorTitle"),
      errorMessage: document.querySelector("#errorMessage"),
      errorPointer: document.querySelector("#errorPointer"),
      verdict: document.querySelector("#verdictCard"),
      verdictIcon: document.querySelector("#verdictIcon"),
      verdictTitle: document.querySelector("#verdictTitle"),
      verdictDescription: document.querySelector("#verdictDescription"),
      normalized: document.querySelector("#normalizedFormula"),
      variableCount: document.querySelector("#variableCount"),
      branchCount: document.querySelector("#branchCount"),
      closedCount: document.querySelector("#closedCount"),
      counterexample: document.querySelector("#counterexample"),
      assignmentList: document.querySelector("#assignmentList"),
      tableauStart: document.querySelector("#tableauStart"),
      tableauSteps: document.querySelector("#tableauSteps"),
      branchGrid: document.querySelector("#branchGrid"),
      truthSummary: document.querySelector("#truthSummary"),
      truthTable: document.querySelector("#truthTable"),
      tokenStream: document.querySelector("#tokenStream"),
      astTree: document.querySelector("#astTree"),
      theme: document.querySelector("#themeButton"),
      presentation: document.querySelector("#presentationButton"),
      settings: document.querySelector("#settingsButton"),
      teamEdit: document.querySelector("#teamEditButton"),
      dialog: document.querySelector("#settingsDialog"),
      settingsForm: document.querySelector("#settingsForm"),
      projectInput: document.querySelector("#projectTitleInput"),
      courseInput: document.querySelector("#courseInput"),
      memberInputs: document.querySelector("#memberInputs"),
      addMember: document.querySelector("#addMemberButton"),
      projectDisplay: document.querySelector("#projectTitleDisplay"),
      courseDisplay: document.querySelector("#courseDisplay"),
      memberList: document.querySelector("#memberList"),
      toast: document.querySelector("#toast"),
    };

    const pipeline = {
      lexical: document.querySelector('[data-pipeline="lexical"]'),
      syntax: document.querySelector('[data-pipeline="syntax"]'),
      tableau: document.querySelector('[data-pipeline="tableau"]'),
    };

    function setPipeline(stage, state, message) {
      const step = pipeline[stage];
      step.classList.remove("success", "failed");
      if (state) step.classList.add(state);
      step.querySelector("small").textContent = message;
    }

    function resetPipeline() {
      Object.keys(pipeline).forEach((stage) => setPipeline(stage, null, "Aguardando"));
    }

    function pointerFor(source, position) {
      const safePosition = Math.max(0, Math.min(position, source.length));
      const before = source.slice(0, safePosition);
      const lineNumber = before.split("\n").length;
      const lineStart = before.lastIndexOf("\n") + 1;
      const lineEnd = source.indexOf("\n", safePosition);
      const line = source.slice(lineStart, lineEnd === -1 ? source.length : lineEnd) || "(entrada vazia)";
      const column = safePosition - lineStart;
      return `Linha ${lineNumber}, coluna ${column + 1}\n${line}\n${" ".repeat(column)}^`;
    }

    function showError(error, source) {
      const stageNames = { lexical: "Etapa I · Análise léxica", syntax: "Etapa II · Análise sintática", tableau: "Etapa III · Tableaux" };
      elements.errorStage.textContent = stageNames[error.stage] || "Análise interrompida";
      elements.errorTitle.textContent = error.title || "Revise a fórmula";
      elements.errorMessage.textContent = error.message;
      elements.errorPointer.textContent = pointerFor(source, error.position || 0);
      elements.errorPanel.hidden = false;
      elements.successResults.hidden = true;
      elements.inputField.classList.add("error");
      elements.inputHelp.classList.add("error");
      elements.inputHelp.textContent = error.message;
      setPipeline(error.stage || "lexical", "failed", "Erro encontrado");
    }

    function renderVerdict(analysis) {
      const { classification, trueCount, falseCount } = analysis.truthTable;
      const messages = {
        tautology: {
          title: "Tautologia",
          icon: "✓",
          description: "A fórmula é verdadeira em todas as interpretações possíveis.",
        },
        contradiction: {
          title: "Contradição",
          icon: "×",
          description: "A fórmula é falsa em todas as interpretações possíveis.",
        },
        contingency: {
          title: "Contingência",
          icon: "◇",
          description: "A fórmula pode ser verdadeira ou falsa, dependendo da interpretação.",
        },
      };
      const verdict = messages[classification];
      elements.verdict.className = `verdict panel is-${classification}`;
      elements.verdictIcon.textContent = verdict.icon;
      elements.verdictTitle.textContent = verdict.title;
      elements.verdictDescription.textContent = verdict.description;
      elements.normalized.textContent = analysis.normalized;
      elements.normalized.title = analysis.normalized;
      elements.variableCount.textContent = analysis.variables.length;
      elements.branchCount.textContent = analysis.tableau.branches.length;
      elements.closedCount.textContent = analysis.tableau.closedCount;

      if (classification !== "tautology") {
        const assignment = analysis.tableau.countermodel || analysis.truthTable.rows.find((row) => !row.result).assignment;
        elements.assignmentList.innerHTML = analysis.variables
          .map((variable) => `<span>${escapeHtml(variable)} = ${assignment[variable] ? "V" : "F"}</span>`)
          .join("");
        elements.counterexample.hidden = false;
      } else {
        elements.counterexample.hidden = true;
      }

      elements.truthSummary.textContent = `${trueCount} linha${trueCount === 1 ? "" : "s"} verdadeira${trueCount === 1 ? "" : "s"} e ${falseCount} falsa${falseCount === 1 ? "" : "s"}.`;
    }

    function renderTableau(analysis) {
      elements.tableauStart.innerHTML = `<span>F</span><strong>${escapeHtml(analysis.normalized)}</strong><small>hipótese inicial para a refutação</small>`;
      elements.tableauSteps.innerHTML = analysis.tableau.steps.length
        ? analysis.tableau.steps.map((step) => `
          <div class="tableau-step">
            <span>${step.number}</span>
            <code>${escapeHtml(step.branch)} · ${escapeHtml(step.source)}</code>
            <span class="rule-badge">${escapeHtml(step.rule)}</span>
            <small>${escapeHtml(step.description)} ${escapeHtml(step.outcome)}</small>
          </div>`).join("")
        : '<div class="tableau-step"><span>1</span><code>Fórmula atômica</code><span class="rule-badge">literal</span><small>Não há conectivos para expandir.</small></div>';

      elements.branchGrid.innerHTML = analysis.tableau.branches.map((branch) => {
        const literals = branch.formulas
          .filter((item) => item.node.type === "prop")
          .sort((a, b) => a.node.name.localeCompare(b.node.name) || Number(b.sign) - Number(a.sign));
        return `
          <article class="branch-card ${branch.closed ? "closed" : "open"}">
            <div class="branch-header"><strong>${escapeHtml(branch.id)} · ramo ${escapeHtml(branch.label)}</strong><span class="branch-status">${branch.closed ? "fechado ×" : "aberto ○"}</span></div>
            <div class="literal-list">${literals.map((item) => `<span>${item.sign ? "T" : "F"} ${escapeHtml(item.node.name)}</span>`).join("") || "<span>sem literais</span>"}</div>
            ${branch.closed
              ? `<p class="contradiction-mark">Contradição: T ${escapeHtml(branch.contradiction)} e F ${escapeHtml(branch.contradiction)}</p>`
              : '<p class="open-mark">Ramo consistente: fornece um contraexemplo.</p>'}
          </article>`;
      }).join("");
    }

    function renderTruthTable(analysis) {
      const headers = [...analysis.variables, analysis.normalized];
      elements.truthTable.innerHTML = `
        <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
        <tbody>${analysis.truthTable.rows.map((row) => `
          <tr>
            ${analysis.variables.map((variable) => `<td>${row.assignment[variable] ? "V" : "F"}</td>`).join("")}
            <td class="${row.result ? "truth-true" : "truth-false"}">${row.result ? "V" : "F"}</td>
          </tr>`).join("")}
        </tbody>`;
    }

    function renderTokens(analysis) {
      elements.tokenStream.innerHTML = analysis.tokens
        .filter((item) => item.type !== "EOF")
        .map((item) => `
          <div class="token">
            <strong>${escapeHtml(item.value)}</strong>
            <span>${escapeHtml(TOKEN_LABELS[item.type])}</span>
            <small>posição ${item.start + 1}</small>
          </div>`).join("");
    }

    function astHtml(node) {
      const symbol = node.type === "prop" ? node.name : NODE_SYMBOLS[node.type];
      const children = node.type === "prop" ? [] : node.type === "not" ? [node.child] : [node.left, node.right];
      return `<li><span class="ast-node"><strong>${escapeHtml(symbol)}</strong><small>${escapeHtml(NODE_LABELS[node.type])}</small></span>${children.length ? `<ul>${children.map(astHtml).join("")}</ul>` : ""}</li>`;
    }

    function renderAst(analysis) {
      elements.astTree.innerHTML = `<ul class="ast-tree">${astHtml(analysis.ast)}</ul>`;
    }

    function renderSuccess(analysis) {
      elements.errorPanel.hidden = true;
      elements.successResults.hidden = false;
      elements.inputField.classList.remove("error");
      elements.inputHelp.classList.remove("error");
      elements.inputHelp.textContent = "Análise concluída: a fórmula é uma FBF.";
      renderVerdict(analysis);
      renderTableau(analysis);
      renderTruthTable(analysis);
      renderTokens(analysis);
      renderAst(analysis);
    }

    async function runAnalysis() {
      const source = elements.input.value;
      resetPipeline();
      elements.results.hidden = false;
      elements.errorPanel.hidden = true;
      elements.successResults.hidden = true;
      elements.inputField.classList.remove("error");
      elements.inputHelp.classList.remove("error");
      elements.analyze.classList.add("loading");
      elements.analyze.disabled = true;

      try {
        const tokens = lex(source);
        setPipeline("lexical", "success", `${tokens.length - 1} tokens válidos`);
        await delay(140);
        const ast = parse(tokens);
        setPipeline("syntax", "success", "FBF confirmada");
        await delay(140);
        const variables = collectVariables(ast);
        if (variables.length > 8) {
          throw new LogicError("tableau", "Para manter a prova e a tabela legíveis, use no máximo 8 proposições diferentes.", 0, "Muitas proposições");
        }
        const analysis = {
          source,
          tokens,
          ast,
          variables,
          truthTable: buildTruthTable(ast, variables),
          tableau: buildTableau(ast, variables),
          normalized: formatFormula(ast),
        };
        setPipeline("tableau", "success", analysis.tableau.allClosed ? "Todos fechados" : `${analysis.tableau.openCount} ramo(s) aberto(s)`);
        renderSuccess(analysis);
        await delay(30);
        elements.results.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (error) {
        const logicError = error instanceof LogicError
          ? error
          : new LogicError("tableau", "Ocorreu um erro inesperado durante a prova. Revise a fórmula e tente novamente.", 0, "Falha durante a análise");
        showError(logicError, source);
      } finally {
        elements.analyze.classList.remove("loading");
        elements.analyze.disabled = false;
      }
    }

    function insertAtCursor(value) {
      const start = elements.input.selectionStart;
      const end = elements.input.selectionEnd;
      const current = elements.input.value;
      elements.input.value = current.slice(0, start) + value + current.slice(end);
      const cursor = start + value.length;
      elements.input.focus();
      elements.input.setSelectionRange(cursor, cursor);
      elements.inputField.classList.remove("error");
      elements.inputHelp.classList.remove("error");
      elements.inputHelp.textContent = "A fórmula será validada antes de iniciar a prova.";
    }

    document.querySelectorAll("[data-insert]").forEach((button) => button.addEventListener("click", () => insertAtCursor(button.dataset.insert)));
    document.querySelectorAll("[data-example]").forEach((button) => button.addEventListener("click", () => {
      elements.input.value = button.dataset.example;
      elements.input.focus();
      elements.input.setSelectionRange(elements.input.value.length, elements.input.value.length);
    }));
    elements.analyze.addEventListener("click", runAnalysis);
    elements.input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        runAnalysis();
      }
    });
    elements.input.addEventListener("input", () => {
      elements.inputField.classList.remove("error");
      elements.inputHelp.classList.remove("error");
      elements.inputHelp.textContent = "A fórmula será validada antes de iniciar a prova.";
    });
    elements.clear.addEventListener("click", () => {
      elements.input.value = "";
      elements.results.hidden = true;
      elements.inputField.classList.remove("error");
      elements.inputHelp.classList.remove("error");
      elements.inputHelp.textContent = "A fórmula será validada antes de iniciar a prova.";
      elements.input.focus();
    });

    document.querySelectorAll("[data-tab]").forEach((tab) => tab.addEventListener("click", () => {
      document.querySelectorAll("[data-tab]").forEach((item) => {
        const selected = item === tab;
        item.classList.toggle("active", selected);
        item.setAttribute("aria-selected", String(selected));
      });
      document.querySelectorAll(".tab-panel").forEach((panel) => {
        const selected = panel.id === `panel-${tab.dataset.tab}`;
        panel.hidden = !selected;
        panel.classList.toggle("active", selected);
      });
    }));

    const storedTheme = localStorage.getItem("logiq-theme");
    if (storedTheme === "light") document.documentElement.dataset.theme = "light";
    elements.theme.addEventListener("click", () => {
      const light = document.documentElement.dataset.theme !== "light";
      document.documentElement.dataset.theme = light ? "light" : "dark";
      localStorage.setItem("logiq-theme", light ? "light" : "dark");
    });

    elements.presentation.addEventListener("click", () => {
      const enabled = !document.body.classList.contains("presentation-mode");
      document.body.classList.toggle("presentation-mode", enabled);
      elements.presentation.lastChild.textContent = enabled ? " Sair da apresentação" : " Modo apresentação";
      if (enabled && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
      if (!enabled && document.fullscreenElement) document.exitFullscreen().catch(() => {});
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    document.addEventListener("fullscreenchange", () => {
      if (!document.fullscreenElement && document.body.classList.contains("presentation-mode")) {
        document.body.classList.remove("presentation-mode");
        elements.presentation.lastChild.textContent = " Modo apresentação";
      }
    });

    let toastTimer;
    function showToast(message) {
      elements.toast.textContent = message;
      elements.toast.classList.add("show");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 2600);
    }

    const defaultSettings = {
      title: "Provador de Fórmulas Proposicionais",
      course: "Trabalho desenvolvido para a avaliação AV1 — Unidade I.",
      members: ["Integrante 1", "Integrante 2", "Integrante 3"],
    };

    function loadSettings() {
      try {
        const saved = JSON.parse(localStorage.getItem("logiq-team"));
        if (saved && Array.isArray(saved.members)) return { ...defaultSettings, ...saved };
      } catch (_) { /* Mantém os valores padrão se os dados locais estiverem corrompidos. */ }
      return { ...defaultSettings, members: [...defaultSettings.members] };
    }

    let teamSettings = loadSettings();

    function initials(name) {
      return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
    }

    function renderTeam() {
      elements.projectDisplay.textContent = teamSettings.title;
      elements.courseDisplay.textContent = teamSettings.course;
      elements.memberList.innerHTML = teamSettings.members.map((member, index) => `
        <div class="member">
          <span class="member-avatar">${escapeHtml(initials(member))}</span>
          <span><strong>${escapeHtml(member)}</strong><small>Integrante ${index + 1}</small></span>
        </div>`).join("");
    }

    function renderMemberInputs(members) {
      elements.memberInputs.innerHTML = members.map((member, index) => `
        <div class="member-input-row">
          <input aria-label="Nome do integrante ${index + 1}" maxlength="70" value="${escapeHtml(member)}" placeholder="Nome completo" />
          <button class="remove-member" data-remove-member="${index}" type="button" aria-label="Remover integrante ${index + 1}">×</button>
        </div>`).join("");
      elements.memberInputs.querySelectorAll("[data-remove-member]").forEach((button) => button.addEventListener("click", () => {
        const inputs = [...elements.memberInputs.querySelectorAll("input")].map((input) => input.value);
        if (inputs.length <= 3) {
          showToast("A atividade exige pelo menos 3 integrantes.");
          return;
        }
        inputs.splice(Number(button.dataset.removeMember), 1);
        renderMemberInputs(inputs);
      }));
      elements.addMember.hidden = members.length >= 5;
    }

    function openSettings() {
      elements.projectInput.value = teamSettings.title;
      elements.courseInput.value = teamSettings.course;
      renderMemberInputs(teamSettings.members);
      elements.dialog.showModal();
    }

    elements.settings.addEventListener("click", openSettings);
    elements.teamEdit.addEventListener("click", openSettings);
    elements.addMember.addEventListener("click", () => {
      const members = [...elements.memberInputs.querySelectorAll("input")].map((input) => input.value);
      if (members.length >= 5) return;
      members.push("");
      renderMemberInputs(members);
      elements.memberInputs.lastElementChild.querySelector("input").focus();
    });
    elements.settingsForm.addEventListener("submit", (event) => {
      if (event.submitter?.value === "cancel") return;
      const members = [...elements.memberInputs.querySelectorAll("input")].map((input) => input.value.trim()).filter(Boolean);
      if (members.length < 3) {
        event.preventDefault();
        showToast("Informe o nome de pelo menos 3 integrantes.");
        return;
      }
      teamSettings = {
        title: elements.projectInput.value.trim() || defaultSettings.title,
        course: elements.courseInput.value.trim() || defaultSettings.course,
        members,
      };
      localStorage.setItem("logiq-team", JSON.stringify(teamSettings));
      renderTeam();
      showToast("Informações da equipe salvas.");
    });

    document.querySelector("#currentYear").textContent = new Date().getFullYear();
    renderTeam();

    const observer = "IntersectionObserver" in window
      ? new IntersectionObserver((entries) => entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        }), { threshold: 0.1 })
      : null;
    document.querySelectorAll(".reveal").forEach((item) => observer ? observer.observe(item) : item.classList.add("visible"));
  }

  const publicScope = typeof window !== "undefined" ? window : globalThis;
  publicScope.LogiQ = {
    LogicError,
    lex,
    parse,
    evaluate,
    formatFormula,
    collectVariables,
    buildTruthTable,
    buildTableau,
    analyzeFormula,
  };

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initInterface);
    else initInterface();
  }
})();
