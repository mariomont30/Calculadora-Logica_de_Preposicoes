# Relatório de testes — LogiQ

**Projeto:** Provador de Fórmulas Proposicionais  
**Versão testada:** 1.1.0<br>
**Data:** 20 de agosto de 2026<br>
**Resultado geral:** APROVADO

## Resumo executivo

A calculadora foi submetida a uma suíte automatizada e determinística. Foram analisadas **2.017 fórmulas**, **512 argumentos gerados** e realizadas **34.494 verificações lógicas**. Todos os testes terminaram com sucesso.

Embora o conjunto de todas as fórmulas proposicionais seja infinito e, portanto, não possa ser percorrido literalmente, a estratégia combina testes exaustivos sobre uma base representativa, leis clássicas, casos-limite e geração aleatória reproduzível de fórmulas profundas.

## Cobertura

| Área | Verificação | Resultado |
|---|---|---:|
| Léxico | Símbolos oficiais e aliases `~`, `!`, `^`, `&`, `v`, `|`, `->` e `<->` | Aprovado |
| Léxico | Caracteres inválidos e entradas vazias | Aprovado |
| Sintaxe | Parênteses, operandos, operadores duplicados e fórmulas incompletas | Aprovado |
| Gramática | Precedência `¬`, `∧`, `∨`, `→`, `↔` | Aprovado |
| Gramática | Associatividade à direita da condicional | Aprovado |
| Semântica | Avaliação independente de todas as interpretações | Aprovado |
| Tableaux | Tautologia se, e somente se, todos os ramos fecham | Aprovado |
| Contraexemplo | Fórmulas falsas recebem somente interpretações confirmadas pelo avaliador | Aprovado |
| Classificação | Tautologia, contradição e contingência | Aprovado |
| Argumentos | Premissas dinâmicas, conclusão e fórmula de validade | Aprovado |
| Frases | Tradução de `não`, inclusive após o sujeito, `e`, `ou`, `se... então` e bicondicional | Aprovado |
| Português controlado | Reutilização de proposições, sujeito omitido, coordenações e normalização de caixa | Aprovado |
| Ambiguidade | Referências múltiplas e enumerações incompletas são recusadas com orientação | Aprovado |
| Escopo | Quantificadores claros são recusados sem simular Lógica de Predicados | Aprovado |
| Texto corrido | Pontos e conectivos `logo`, `portanto`, `assim`, `conclusão:` e `∴` | Aprovado |
| Validade | Modus Ponens, Modus Tollens, silogismo hipotético e silogismo disjuntivo | Aprovado |
| Invalidade | Afirmação do consequente e negação do antecedente com contraexemplo confirmado | Aprovado |
| Consistência | Tableaux, tabela-verdade e avaliador semântico produzem a mesma decisão | Aprovado |
| Matriz de argumentos | 512 combinações determinísticas de premissas e conclusão | Aprovado |
| Escala | Oito proposições e 256 interpretações | Aprovado |
| Interface | IDs, abas, elementos semânticos e acessibilidade | Aprovado |
| Segurança | Escape de conteúdo, ausência de eventos inline e de código dinâmico | Aprovado |
| Servidor | Rotas, tipos MIME, HEAD, 404 e cabeçalhos de segurança | Aprovado |

## Leis e argumentos clássicos conferidos

- terceiro excluído;
- não contradição;
- modus ponens;
- modus tollens;
- contraposição;
- duas leis de De Morgan;
- definição da bicondicional;
- distributividade da conjunção;
- distributividade da disjunção;
- identidade da condicional;
- silogismo hipotético;
- silogismo disjuntivo;
- detecção da falácia da afirmação do consequente;
- detecção da falácia da negação do antecedente;
- contradições e fórmulas contingentes simples.

## Testes gerativos

O gerador combina proposições e subfórmulas usando todos os conectivos implementados. Um segundo avaliador, escrito separadamente do algoritmo da aplicação, calcula o resultado esperado. Para cada fórmula, a suíte verifica:

1. o resultado de cada linha da tabela-verdade;
2. a classificação semântica;
3. o fechamento ou a abertura do Tableaux;
4. a validade do contraexemplo, quando existente.

O fuzz usa uma semente fixa. Assim, qualquer falha pode ser reproduzida exatamente.

Uma matriz adicional combina oito fórmulas simbólicas em duas premissas e uma conclusão, totalizando 512 argumentos. Para cada argumento, a suíte compara os três métodos e, quando o resultado é inválido, reavalia separadamente todas as premissas e a conclusão sob o contraexemplo.

## Como reproduzir

Na pasta do projeto, execute:

```bash
npm test
```

Saída esperada:

```text
OK — 2.017 fórmulas, 512 argumentos gerados e 34.494 verificações lógicas.
OK — interface: 63 IDs, 4 abas e acessibilidade/estrutura aprovadas.
OK — servidor: rotas, tipos MIME, HEAD, 404 e cabeçalhos aprovados.
```

## Conclusão

Nenhuma divergência foi encontrada entre o avaliador de referência, a tabela-verdade e o provador por Tableaux no conjunto testado. O projeto está apto para apresentação e entrega acadêmica.
