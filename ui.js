(() => {
  "use strict";

  const {
    LogicError,
    analyzeFormula,
    compileArgument,
    parseArgumentText,
  } = window.LogiQ;

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
  const NODE_SYMBOLS = { not: "¬", and: "∧", or: "∨", imp: "→", iff: "↔" };
  const NODE_LABELS = {
    prop: "proposição",
    not: "negação",
    and: "conjunção",
    or: "disjunção",
    imp: "condicional",
    iff: "bicondicional",
  };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const escapeHtml = (value) => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
  const delay = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

  function init() {
    const elements = {
      argumentPanel: $("#argumentPanel"),
      formulaPanel: $("#formulaPanel"),
      premiseList: $("#premiseList"),
      addPremise: $("#addPremiseButton"),
      conclusion: $("#conclusionInput"),
      argumentFields: $("#argumentFieldsPanel"),
      argumentTextPanel: $("#argumentTextPanel"),
      argumentText: $("#argumentTextInput"),
      parsedPreview: $("#parsedPreview"),
      formula: $("#formulaInput"),
      message: $("#inputMessage"),
      analyze: $("#analyzeButton"),
      analyzeLabel: $("#analyzeButtonLabel"),
      results: $("#results"),
      errorPanel: $("#errorPanel"),
      successResults: $("#successResults"),
      errorStage: $("#errorStage"),
      errorTitle: $("#errorTitle"),
      errorMessage: $("#errorMessage"),
      errorPointer: $("#errorPointer"),
      resultHero: $("#resultHero"),
      resultSymbol: $("#resultSymbol"),
      resultKicker: $("#resultKicker"),
      resultTitle: $("#resultTitle"),
      resultDescription: $("#resultDescription"),
      resultFormula: $("#resultFormula"),
      plainExplanation: $("#plainExplanation"),
      argumentReading: $("#argumentReading"),
      argumentFlow: $("#argumentFlow"),
      propositionLegend: $("#propositionLegend"),
      countermodel: $("#countermodel"),
      countermodelValues: $("#countermodelValues"),
      summaryClassification: $("#summaryClassification"),
      summaryClassificationHelp: $("#summaryClassificationHelp"),
      summaryBranches: $("#summaryBranches"),
      summaryBranchesHelp: $("#summaryBranchesHelp"),
      summaryRows: $("#summaryRows"),
      summaryRowsHelp: $("#summaryRowsHelp"),
      summaryVariables: $("#summaryVariables"),
      tableauStart: $("#tableauStart"),
      tableauSteps: $("#tableauSteps"),
      branchGrid: $("#branchGrid"),
      truthSummary: $("#truthSummary"),
      truthFilter: $("#truthFilterButton"),
      truthTable: $("#truthTable"),
      tokenStream: $("#tokenStream"),
      astTree: $("#astTree"),
      copyResult: $("#copyResultButton"),
      printResult: $("#printResultButton"),
      theme: $("#themeButton"),
      team: $("#teamButton"),
      dialog: $("#teamDialog"),
      toast: $("#toast"),
    };

    let mode = "argument";
    let argumentInputMode = "fields";
    let premises = ["Se estudo, então sou aprovado", "Estudo"];
    let currentResult = null;
    let validationTimer;
    let toastTimer;

    const pipeline = Object.fromEntries(
      ["lexical", "syntax", "tableau"].map((stage) => [stage, $(`[data-stage="${stage}"]`)]),
    );

    function showToast(message) {
      elements.toast.textContent = message;
      elements.toast.classList.add("show");
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => elements.toast.classList.remove("show"), 2400);
    }

    function setMessage(message, state = "") {
      elements.message.className = `live-message ${state}`.trim();
      elements.message.innerHTML = `<span></span>${escapeHtml(message)}`;
    }

    function setPipeline(stage, state, message) {
      const item = pipeline[stage];
      item.classList.remove("success", "failed");
      if (state) item.classList.add(state);
      item.querySelector("small").textContent = message;
    }

    function resetPipeline() {
      Object.keys(pipeline).forEach((stage) => setPipeline(stage, "", "Aguardando"));
    }

    function pointerFor(source, position = 0) {
      const safe = Math.max(0, Math.min(position, source.length));
      const before = source.slice(0, safe);
      const lineNumber = before.split("\n").length;
      const lineStart = before.lastIndexOf("\n") + 1;
      const lineEnd = source.indexOf("\n", safe);
      const line = source.slice(lineStart, lineEnd === -1 ? source.length : lineEnd) || "(entrada vazia)";
      return `Linha ${lineNumber}, coluna ${safe - lineStart + 1}\n${line}\n${" ".repeat(safe - lineStart)}^`;
    }

    function getArgumentInput() {
      if (argumentInputMode === "text") return parseArgumentText(elements.argumentText.value);
      return { premises: [...premises], conclusion: elements.conclusion.value };
    }

    function sourceForCurrentInput() {
      if (mode === "formula") return elements.formula.value;
      if (argumentInputMode === "text") return elements.argumentText.value;
      return [...premises.map((item) => `${item}.`), `Logo, ${elements.conclusion.value}.`].join(" ");
    }

    function renderPremises() {
      elements.premiseList.innerHTML = premises.map((premise, index) => `
        <div class="premise-row">
          <span class="premise-label">Premissa ${index + 1}</span>
          <label class="logic-field"><input data-premise-index="${index}" type="text" value="${escapeHtml(premise)}" placeholder="Ex.: Se P, então Q" autocomplete="off" /></label>
          <button class="remove-premise" data-remove-premise="${index}" type="button" aria-label="Remover premissa ${index + 1}" ${premises.length === 1 ? "disabled" : ""}>×</button>
        </div>`).join("");

      $$('[data-premise-index]').forEach((input) => input.addEventListener("input", () => {
        premises[Number(input.dataset.premiseIndex)] = input.value;
        queueValidation();
      }));
      $$('[data-remove-premise]').forEach((button) => button.addEventListener("click", () => {
        if (premises.length === 1) return;
        premises.splice(Number(button.dataset.removePremise), 1);
        renderPremises();
        queueValidation();
      }));
      elements.addPremise.hidden = premises.length >= 8;
    }

    function renderParsedPreview() {
      if (argumentInputMode !== "text") return;
      try {
        const parsed = parseArgumentText(elements.argumentText.value);
        elements.parsedPreview.classList.add("visible");
        elements.parsedPreview.innerHTML = `<strong>Leitura reconhecida</strong><ul>${parsed.premises.map((premise, index) => `<li>Premissa ${index + 1}: ${escapeHtml(premise)}</li>`).join("")}<li>Conclusão: ${escapeHtml(parsed.conclusion)}</li></ul>`;
      } catch (error) {
        elements.parsedPreview.classList.remove("visible");
        elements.parsedPreview.innerHTML = "";
      }
    }

    function switchMode(nextMode) {
      mode = nextMode;
      $$('[data-mode]').forEach((button) => {
        const selected = button.dataset.mode === mode;
        button.classList.toggle("active", selected);
        button.setAttribute("aria-selected", String(selected));
      });
      elements.argumentPanel.hidden = mode !== "argument";
      elements.formulaPanel.hidden = mode !== "formula";
      elements.analyzeLabel.textContent = mode === "argument" ? "Verificar validade do argumento" : "Analisar fórmula";
      elements.results.hidden = true;
      currentResult = null;
      queueValidation();
    }

    function switchArgumentInput(nextMode) {
      argumentInputMode = nextMode;
      $$('[data-argument-input]').forEach((button) => button.classList.toggle("active", button.dataset.argumentInput === nextMode));
      elements.argumentFields.hidden = nextMode !== "fields";
      elements.argumentTextPanel.hidden = nextMode !== "text";
      elements.results.hidden = true;
      renderParsedPreview();
      queueValidation();
    }

    function currentAnalysis() {
      if (mode === "formula") return { ...analyzeFormula(elements.formula.value), kind: "formula" };
      const argument = getArgumentInput();
      return compileArgument(argument.premises, argument.conclusion);
    }

    function queueValidation() {
      window.clearTimeout(validationTimer);
      currentResult = null;
      elements.results.hidden = true;
      renderParsedPreview();
      setMessage("Verificando a estrutura enquanto você digita...");
      validationTimer = window.setTimeout(() => {
        try {
          const result = currentAnalysis();
          const message = mode === "argument"
            ? `${result.premises.length} premissa${result.premises.length === 1 ? "" : "s"} e conclusão reconhecidas · ${result.variables.length} proposição${result.variables.length === 1 ? "" : "ões"}.`
            : `FBF válida · ${result.tokens.length - 1} tokens · ${result.variables.length} proposição${result.variables.length === 1 ? "" : "ões"}.`;
          setMessage(message, "valid");
        } catch (error) {
          setMessage(error.message, "error");
        }
      }, 360);
    }

    function showError(error, source) {
      const stageNames = {
        lexical: "Etapa I · Análise léxica",
        syntax: "Etapa II · Análise sintática",
        tableau: "Etapa III · Tableaux",
      };
      elements.errorStage.textContent = stageNames[error.stage] || "Análise interrompida";
      elements.errorTitle.textContent = error.title || "Revise a entrada";
      elements.errorMessage.textContent = error.message;
      elements.errorPointer.textContent = pointerFor(source, error.position || 0);
      elements.errorPanel.hidden = false;
      elements.successResults.hidden = true;
      setPipeline(error.stage || "lexical", "failed", "Erro encontrado");
      setMessage(error.message, "error");
    }

    function classificationInfo(classification) {
      return {
        tautology: {
          title: "Tautologia",
          symbol: "✓",
          className: "",
          description: "Verdadeira em todas as interpretações possíveis.",
          explanation: "Não existe atribuição de valores que torne esta fórmula falsa.",
        },
        contradiction: {
          title: "Contradição",
          symbol: "×",
          className: "invalid",
          description: "Falsa em todas as interpretações possíveis.",
          explanation: "Não existe atribuição de valores que torne esta fórmula verdadeira.",
        },
        contingency: {
          title: "Contingência",
          symbol: "◇",
          className: "contingency",
          description: "Pode ser verdadeira ou falsa, conforme a interpretação.",
          explanation: "A tabela mostra cenários verdadeiros e falsos para a mesma fórmula.",
        },
      }[classification];
    }

    function renderArgumentReading(result) {
      elements.argumentReading.hidden = result.kind !== "argument";
      if (result.kind !== "argument") return;

      elements.argumentFlow.innerHTML = result.premiseFormulas.map((formula, index) => `
        <span class="flow-item" title="${escapeHtml(result.premises[index])}">P${index + 1}: <strong>${escapeHtml(formula)}</strong></span>
        ${index < result.premiseFormulas.length - 1 ? '<span class="flow-arrow">+</span>' : ""}`).join("")
        + `<span class="flow-arrow">∴</span><span class="flow-item flow-conclusion">C: <strong>${escapeHtml(result.conclusionFormula)}</strong></span>`;

      const mapped = new Map(result.mapping.map(({ symbol, phrase }) => [symbol, phrase]));
      elements.propositionLegend.innerHTML = `<small>Legenda das proposições</small>${result.variables.map((variable) => `
        <div class="legend-row"><strong>${escapeHtml(variable)}</strong><span>${escapeHtml(mapped.get(variable) || "proposição simbólica informada")}</span></div>`).join("")}`;
    }

    function renderCountermodel(result) {
      const show = result.kind === "argument" ? !result.isValid : result.truthTable.classification !== "tautology";
      elements.countermodel.hidden = !show;
      if (!show) return;
      const assignment = result.tableau.countermodel || result.truthTable.rows.find((row) => !row.result)?.assignment || {};
      elements.countermodelValues.innerHTML = result.variables.map((variable) => `<span>${escapeHtml(variable)} = ${assignment[variable] ? "V" : "F"}</span>`).join("");
      const text = elements.countermodel.querySelector("small");
      text.textContent = result.kind === "argument"
        ? "Estes valores tornam as premissas verdadeiras e a conclusão falsa."
        : "Estes valores tornam a fórmula falsa.";
    }

    function renderSummary(result) {
      const { classification, trueCount, falseCount, rows } = result.truthTable;
      const info = result.kind === "argument"
        ? {
            title: result.isValid ? "Argumento válido" : "Argumento inválido",
            help: result.isValid ? "A conclusão decorre das premissas." : "Há um contraexemplo para a conclusão.",
          }
        : { title: classificationInfo(classification).title, help: classificationInfo(classification).description };
      elements.summaryClassification.textContent = info.title;
      elements.summaryClassificationHelp.textContent = info.help;
      elements.summaryBranches.textContent = `${result.tableau.closedCount}/${result.tableau.branches.length} fechados`;
      elements.summaryBranchesHelp.textContent = result.tableau.allClosed ? "Todos os ramos chegaram a contradição." : `${result.tableau.openCount} ramo(s) consistente(s).`;
      elements.summaryRows.textContent = `${rows.length} linhas`;
      elements.summaryRowsHelp.textContent = `${trueCount} verdadeira${trueCount === 1 ? "" : "s"} · ${falseCount} falsa${falseCount === 1 ? "" : "s"}.`;
      elements.summaryVariables.textContent = String(result.variables.length);
    }

    function renderTableau(result) {
      elements.tableauStart.innerHTML = `<span>F</span><strong>${escapeHtml(result.normalized)}</strong><small>hipótese inicial para a refutação</small>`;
      elements.tableauSteps.innerHTML = result.tableau.steps.length
        ? result.tableau.steps.map((step) => `
          <article class="tableau-step ${step.rule.includes("β") ? "beta" : "alpha"}">
            <span class="step-index">${step.number}</span>
            <div class="step-source"><small>Ramo ${escapeHtml(step.branch)}</small><code>${escapeHtml(step.source)}</code></div>
            <span class="rule-badge">${escapeHtml(step.rule)}</span>
            <div class="step-explanation"><strong>${escapeHtml(step.description)}</strong><small>${escapeHtml(step.outcome)}</small></div>
          </article>`).join("")
        : '<article class="tableau-step alpha"><span class="step-index">1</span><div class="step-source"><small>Entrada</small><code>Fórmula atômica</code></div><span class="rule-badge">literal</span><div class="step-explanation"><strong>Nenhum conectivo para expandir.</strong><small>O ramo já está saturado.</small></div></article>';

      elements.branchGrid.innerHTML = result.tableau.branches.map((branch) => {
        const literals = branch.formulas
          .filter((item) => item.node.type === "prop")
          .sort((a, b) => a.node.name.localeCompare(b.node.name) || Number(b.sign) - Number(a.sign));
        return `<article class="branch-card ${branch.closed ? "closed" : "open"}">
          <div class="branch-header"><strong>${escapeHtml(branch.id)} · ramo ${escapeHtml(branch.label)}</strong><span class="branch-status">${branch.closed ? "fechado ×" : "aberto ○"}</span></div>
          <div class="literal-list">${literals.map((item) => `<span class="${item.sign ? "literal-true" : "literal-false"}">${item.sign ? "T" : "F"} ${escapeHtml(item.node.name)}</span>`).join("") || "<span>sem literais</span>"}</div>
          ${branch.closed ? `<p class="contradiction-mark">Contradição: T ${escapeHtml(branch.contradiction)} e F ${escapeHtml(branch.contradiction)}</p>` : '<p class="open-mark">Ramo consistente: fornece um contraexemplo.</p>'}
        </article>`;
      }).join("");
    }

    function renderTruthTable(result) {
      const { trueCount, falseCount, rows } = result.truthTable;
      elements.truthTable.closest(".table-wrap").classList.remove("truth-filtered");
      elements.truthSummary.textContent = `${trueCount} linha${trueCount === 1 ? "" : "s"} V e ${falseCount} linha${falseCount === 1 ? "" : "s"} F.`;
      elements.truthFilter.disabled = falseCount === 0;
      elements.truthFilter.classList.remove("active");
      elements.truthFilter.textContent = falseCount === 0 ? "Nenhuma linha falsa" : "Mostrar somente falsas";
      elements.truthTable.innerHTML = `<thead><tr><th>#</th>${result.variables.map((variable) => `<th>${escapeHtml(variable)}</th>`).join("")}<th>${escapeHtml(result.normalized)}</th></tr></thead>
        <tbody>${rows.map((row, index) => `<tr class="${row.result ? "row-true" : "row-false"}"><td class="row-number">${index + 1}</td>${result.variables.map((variable) => `<td class="${row.assignment[variable] ? "value-true" : "value-false"}">${row.assignment[variable] ? "V" : "F"}</td>`).join("")}<td class="${row.result ? "truth-true" : "truth-false"}">${row.result ? "V" : "F"}</td></tr>`).join("")}</tbody>`;
    }

    function astHtml(node) {
      const symbol = node.type === "prop" ? node.name : NODE_SYMBOLS[node.type];
      const children = node.type === "prop" ? [] : node.type === "not" ? [node.child] : [node.left, node.right];
      return `<li><span class="ast-node"><strong>${escapeHtml(symbol)}</strong><small>${escapeHtml(NODE_LABELS[node.type])}</small></span>${children.length ? `<ul>${children.map(astHtml).join("")}</ul>` : ""}</li>`;
    }

    function renderStructure(result) {
      elements.tokenStream.innerHTML = result.tokens.filter((token) => token.type !== "EOF").map((token) => `
        <div class="token"><strong>${escapeHtml(token.value)}</strong><span>${escapeHtml(TOKEN_LABELS[token.type])}</span><small>posição ${token.start + 1}</small></div>`).join("");
      elements.astTree.innerHTML = `<ul class="ast-tree">${astHtml(result.ast)}</ul>`;
    }

    function renderResult(result) {
      currentResult = result;
      const classification = result.truthTable.classification;
      const formulaInfo = classificationInfo(classification);
      const view = result.kind === "argument"
        ? {
            title: result.isValid ? "Argumento válido" : "Argumento inválido",
            symbol: result.isValid ? "✓" : "×",
            className: result.isValid ? "" : "invalid",
            kicker: "Resultado do argumento",
            description: result.isValid ? "A conclusão decorre logicamente das premissas." : "A conclusão não decorre necessariamente das premissas.",
            explanation: result.isValid
              ? "Em toda interpretação na qual as premissas são verdadeiras, a conclusão também é verdadeira. O Tableaux fechou todos os ramos."
              : "Existe pelo menos uma interpretação em que todas as premissas são verdadeiras e a conclusão é falsa. Veja o contraexemplo abaixo.",
          }
        : { ...formulaInfo, kicker: "Resultado da fórmula" };

      elements.resultHero.className = `result-hero ${view.className}`.trim();
      elements.resultSymbol.textContent = view.symbol;
      elements.resultKicker.textContent = view.kicker;
      elements.resultTitle.textContent = view.title;
      elements.resultDescription.textContent = view.description;
      elements.resultFormula.textContent = result.normalized;
      elements.resultFormula.title = result.normalized;
      elements.plainExplanation.textContent = view.explanation;
      elements.errorPanel.hidden = true;
      elements.successResults.hidden = false;

      renderArgumentReading(result);
      renderCountermodel(result);
      renderSummary(result);
      renderTableau(result);
      renderTruthTable(result);
      renderStructure(result);
    }

    async function runAnalysis() {
      const source = sourceForCurrentInput();
      resetPipeline();
      elements.results.hidden = false;
      elements.errorPanel.hidden = true;
      elements.successResults.hidden = true;
      elements.analyze.classList.add("loading");
      elements.analyze.disabled = true;

      try {
        const result = currentAnalysis();
        setPipeline("lexical", "success", `${result.tokens.length - 1} tokens válidos`);
        await delay(100);
        setPipeline("syntax", "success", "FBF confirmada");
        await delay(100);
        setPipeline("tableau", "success", result.tableau.allClosed ? "Todos fechados" : `${result.tableau.openCount} ramo(s) aberto(s)`);
        renderResult(result);
        setMessage("Análise concluída com sucesso.", "valid");
        await delay(30);
        elements.results.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (error) {
        const logicError = error instanceof LogicError
          ? error
          : new LogicError("tableau", "Ocorreu um erro inesperado durante a prova. Revise a entrada e tente novamente.", 0, "Falha durante a análise");
        showError(logicError, source);
      } finally {
        elements.analyze.classList.remove("loading");
        elements.analyze.disabled = false;
      }
    }

    function resultSummary() {
      if (!currentResult) return "";
      if (currentResult.kind === "argument") {
        return [
          `LogiQ — ${currentResult.isValid ? "Argumento válido" : "Argumento inválido"}`,
          ...currentResult.premises.map((premise, index) => `Premissa ${index + 1}: ${premise}`),
          `Conclusão: ${currentResult.conclusion}`,
          `Fórmula de validade: ${currentResult.normalized}`,
          `Tableaux: ${currentResult.tableau.closedCount}/${currentResult.tableau.branches.length} ramos fechados`,
        ].join("\n");
      }
      const label = classificationInfo(currentResult.truthTable.classification).title;
      return `LogiQ — ${label}\nFórmula: ${currentResult.normalized}\nTableaux: ${currentResult.tableau.closedCount}/${currentResult.tableau.branches.length} ramos fechados`;
    }

    async function copySummary() {
      const summary = resultSummary();
      if (!summary) return;
      try {
        await navigator.clipboard.writeText(summary);
      } catch (_) {
        const temporary = document.createElement("textarea");
        temporary.value = summary;
        temporary.style.position = "fixed";
        temporary.style.opacity = "0";
        document.body.appendChild(temporary);
        temporary.select();
        document.execCommand("copy");
        temporary.remove();
      }
      showToast("Resumo da análise copiado.");
    }

    function insertAtCursor(value) {
      const input = elements.formula;
      const start = input.selectionStart;
      const end = input.selectionEnd;
      input.value = input.value.slice(0, start) + value + input.value.slice(end);
      input.focus();
      input.setSelectionRange(start + value.length, start + value.length);
      queueValidation();
    }

    $$('[data-mode]').forEach((button) => button.addEventListener("click", () => switchMode(button.dataset.mode)));
    $$('[data-argument-input]').forEach((button) => button.addEventListener("click", () => switchArgumentInput(button.dataset.argumentInput)));
    $$('[data-insert]').forEach((button) => button.addEventListener("click", () => insertAtCursor(button.dataset.insert)));
    $$('[data-formula-example]').forEach((button) => button.addEventListener("click", () => {
      elements.formula.value = button.dataset.formulaExample;
      queueValidation();
    }));
    $$('[data-argument-example]').forEach((button) => button.addEventListener("click", () => {
      const examples = {
        modus: { premises: ["Se estudo, então sou aprovado", "Estudo"], conclusion: "Sou aprovado" },
        invalid: { premises: ["Se chove, então a rua fica molhada", "A rua fica molhada"], conclusion: "Chove" },
        socrates: { premises: ["Se Sócrates é homem, então Sócrates é mortal", "Sócrates é homem"], conclusion: "Sócrates é mortal" },
      };
      const example = examples[button.dataset.argumentExample];
      premises = [...example.premises];
      elements.conclusion.value = example.conclusion;
      elements.argumentText.value = `${example.premises.join(". ")}. Logo, ${example.conclusion}.`;
      renderPremises();
      queueValidation();
    }));

    elements.addPremise.addEventListener("click", () => {
      if (premises.length >= 8) return;
      premises.push("");
      renderPremises();
      elements.premiseList.lastElementChild.querySelector("input").focus();
      queueValidation();
    });
    elements.conclusion.addEventListener("input", queueValidation);
    elements.argumentText.addEventListener("input", queueValidation);
    elements.formula.addEventListener("input", queueValidation);
    elements.formula.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        runAnalysis();
      }
    });
    elements.analyze.addEventListener("click", runAnalysis);
    elements.copyResult.addEventListener("click", copySummary);
    elements.printResult.addEventListener("click", () => window.print());

    elements.truthFilter.addEventListener("click", () => {
      const wrapper = elements.truthTable.closest(".table-wrap");
      const filtered = wrapper.classList.toggle("truth-filtered");
      elements.truthFilter.classList.toggle("active", filtered);
      elements.truthFilter.textContent = filtered ? "Mostrar todas as linhas" : "Mostrar somente falsas";
    });

    $$('[data-result-tab]').forEach((tab) => tab.addEventListener("click", () => {
      $$('[data-result-tab]').forEach((item) => {
        const selected = item === tab;
        item.classList.toggle("active", selected);
        item.setAttribute("aria-selected", String(selected));
      });
      $$(".result-tab-panel").forEach((panel) => {
        panel.hidden = panel.id !== `result-tab-${tab.dataset.resultTab}`;
      });
    }));

    const storedTheme = localStorage.getItem("logiq-theme");
    if (storedTheme === "light") document.documentElement.dataset.theme = "light";
    elements.theme.addEventListener("click", () => {
      const light = document.documentElement.dataset.theme !== "light";
      document.documentElement.dataset.theme = light ? "light" : "dark";
      localStorage.setItem("logiq-theme", light ? "light" : "dark");
    });

    elements.team.addEventListener("click", () => elements.dialog.showModal());

    renderPremises();
    queueValidation();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
