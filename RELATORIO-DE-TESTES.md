# Relatório de testes — LogiQ

**Projeto:** Provador de Fórmulas Proposicionais  
**Versão testada:** 1.1.0<br>
**Data:** 20 de agosto de 2026<br>
**Resultado geral:** APROVADO

## Resumo executivo

A calculadora foi submetida a uma suíte automatizada e determinística. Foram analisadas **2.017 fórmulas** e realizadas **29.129 verificações lógicas**. Todos os testes terminaram com sucesso.

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
| Contraexemplo | Todo ramo aberto produz uma interpretação que falsifica a fórmula | Aprovado |
| Classificação | Tautologia, contradição e contingência | Aprovado |
| Argumentos | Premissas dinâmicas, conclusão e fórmula de validade | Aprovado |
| Frases | Tradução de `não`, `e`, `ou`, `se... então` e bicondicional | Aprovado |
| Português controlado | Reutilização de proposições, sujeito omitido, coordenações e normalização de caixa | Aprovado |
| Ambiguidade | Referências múltiplas e enumerações incompletas são recusadas com orientação | Aprovado |
| Texto corrido | Pontos e conectivos `logo`, `portanto`, `assim`, `conclusão:` e `∴` | Aprovado |
| Validade | Modus Ponens, silogismo hipotético, silogismo disjuntivo e bicondicional | Aprovado |
| Invalidade | Afirmação do consequente com contraexemplo verificável | Aprovado |
| Escala | Oito proposições e 256 interpretações | Aprovado |
| Interface | IDs, abas, elementos semânticos e acessibilidade | Aprovado |
| Segurança | Escape de conteúdo, ausência de eventos inline e de código dinâmico | Aprovado |
| Servidor | Rotas, tipos MIME, HEAD, 404 e cabeçalhos de segurança | Aprovado |

## Leis e argumentos clássicos conferidos

- terceiro excluído;
- não contradição;
- modus ponens;
- contraposição;
- duas leis de De Morgan;
- definição da bicondicional;
- distributividade da conjunção;
- distributividade da disjunção;
- identidade da condicional;
- silogismo hipotético;
- silogismo disjuntivo;
- detecção da falácia da afirmação do consequente;
- contradições e fórmulas contingentes simples.

## Testes gerativos

O gerador combina proposições e subfórmulas usando todos os conectivos implementados. Um segundo avaliador, escrito separadamente do algoritmo da aplicação, calcula o resultado esperado. Para cada fórmula, a suíte verifica:

1. o resultado de cada linha da tabela-verdade;
2. a classificação semântica;
3. o fechamento ou a abertura do Tableaux;
4. a validade do contraexemplo, quando existente.

O fuzz usa uma semente fixa. Assim, qualquer falha pode ser reproduzida exatamente.

## Como reproduzir

Na pasta do projeto, execute:

```bash
npm test
```

Saída esperada:

```text
OK — 2.017 fórmulas, 29.129 verificações lógicas.
OK — interface: 63 IDs, 4 abas e acessibilidade/estrutura aprovadas.
OK — servidor: rotas, tipos MIME, HEAD, 404 e cabeçalhos aprovados.
```

## Conclusão

Nenhuma divergência foi encontrada entre o avaliador de referência, a tabela-verdade e o provador por Tableaux no conjunto testado. O projeto está apto para apresentação e entrega acadêmica.
