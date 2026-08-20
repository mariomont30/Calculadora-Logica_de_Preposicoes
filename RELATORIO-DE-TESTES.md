# Relatório de revisão e testes — LogiQ

**Projeto:** Provador de Fórmulas Proposicionais<br>
**Versão testada:** 1.1.0<br>
**Data:** 20 de agosto de 2026<br>
**Responsável pelo repositório:** Mário_DEV<br>
**Resultado geral:** APROVADO

## Resumo executivo

O tradutor de português controlado foi revisado sem alterar a decisão formal dos motores lógicos. A entrada continua seguindo o fluxo:

`português controlado → conectivos e agrupamentos → átomos → FBF → Tableaux/tabela-verdade → resultado`

A suíte final analisou **2.023 fórmulas**, **554 argumentos** e realizou **34.722 verificações lógicas**. Os 14 cenários obrigatórios, os testes antigos e a nova bateria de casos difíceis terminaram com sucesso. Tableaux, tabela-verdade e avaliador semântico independente concordaram em todos os argumentos verificados.

## Causas encontradas e correções

| Causa | Comportamento anterior | Comportamento corrigido |
|---|---|---|
| Lista de verbos controlados insuficiente | Frases como “o celular está carregando ou a bateria está cheia” podiam virar um único átomo | Orações reconhecíveis são decompostas em `A ∨ B` ou `A ∧ B` |
| Separação plana por expressão regular | Conectivos dentro de parênteses não tinham proteção estrutural | A separação ocorre somente no nível externo e preserva agrupamentos |
| Ausência de precedência completa no tradutor textual | Combinações de `e`, `ou`, condicional e bicondicional podiam perder a estrutura | O português controlado segue `¬ > ∧ > ∨ > → > ↔`, como o parser simbólico |
| Sujeito omitido limitado a átomos já completos | “O usuário possui senha ou possui biometria” podia criar uma letra indevida | O sujeito compartilhado é completado apenas quando a omissão é inequívoca |
| Estado negativo conhecido não reutilizado | “televisão desligada” podia virar um novo átomo depois de “televisão ligada” | O par controlado `ligado/desligado` reutiliza `A` e produz `¬A` quando a forma positiva já existe |
| Estruturas duvidosas aceitas silenciosamente | Uma coordenação não reconhecida podia ser registrada como átomo | A entrada recebe erro de “Estrutura ambígua” e orientação para reescrita |
| Regras didáticas incompletas | Simplificação e Conjunção não recebiam rótulo | As duas regras agora são identificadas sem interferir no cálculo formal |

Nenhuma validade foi forçada e nenhum resultado do Tableaux ou da tabela-verdade foi alterado para atender a exemplos específicos.

## Arquivos e funções alterados

| Arquivo | Alterações principais |
|---|---|
| `app.js` | Separação por profundidade, validação e remoção segura de parênteses externos, precedência textual, conclusão de sujeito compartilhado, negação total explícita, estado negativo conhecido, erro de ambiguidade e novas regras didáticas |
| `tests/comprehensive.mjs` | 14 cenários obrigatórios e regressões de precedência, agrupamento, negação, normalização, ambiguidade, inferência e contraexemplos |
| `README.md` | Capacidades, regras reconhecidas, limites do português controlado e números atualizados |
| `RELATORIO-DE-TESTES.md` | Causas, FBFs, resultados formais, contraexemplos e estatísticas desta revisão |

As principais rotinas incluídas ou revisadas foram `validateNaturalParentheses`, `unwrapNaturalParentheses`, `splitTopLevelNatural`, `splitNaturalCoordination`, `completeCoordinatedParts`, `looksLikeNaturalClause`, `controlledKnownStateNegation`, `translateNaturalExpression` e `identifyInferenceRule`.

## Resultado dos 14 cenários obrigatórios

Na coluna “FBF de validade”, a conjunção de todas as premissas é o antecedente e a conclusão é o consequente. “Fechado” significa que todos os ramos do Tableaux da negação da fórmula fecharam.

| Teste | Argumento normalizado | FBF de validade | Tableaux | Tabela-verdade | Resultado didático |
|---:|---|---|---|---|---|
| 1 | `A, B, C, D ∴ A` | `(((A ∧ B) ∧ C) ∧ D) → A` | Fechado | Tautologia | Válido |
| 2 | `A, B, C, D ∴ A ∧ C` | `(((A ∧ B) ∧ C) ∧ D) → (A ∧ C)` | Fechado | Tautologia | Válido — Conjunção |
| 3 | `A ∨ B, ¬A, C, D ∴ B` | `((((A ∨ B) ∧ ¬A) ∧ C) ∧ D) → B` | Fechado | Tautologia | Válido — Silogismo Disjuntivo |
| 4 | `A → B, A, C, D ∴ B` | `((((A → B) ∧ A) ∧ C) ∧ D) → B` | Fechado | Tautologia | Válido — Modus Ponens |
| 5 | `A → B, ¬B, C, D ∴ ¬A` | `((((A → B) ∧ ¬B) ∧ C) ∧ D) → ¬A` | Fechado | Tautologia | Válido — Modus Tollens |
| 6 | `A → B, B → C, D, E ∴ A → C` | `((((A → B) ∧ (B → C)) ∧ D) ∧ E) → (A → C)` | Fechado | Tautologia | Válido — Silogismo Hipotético |
| 7 | `A ∧ B, C, D, E ∴ B` | `((((A ∧ B) ∧ C) ∧ D) ∧ E) → B` | Fechado | Tautologia | Válido — Simplificação |
| 8 | `A → B, B, C, D ∴ A` | `((((A → B) ∧ B) ∧ C) ∧ D) → A` | Aberto | Contingência | Inválido — Afirmação do consequente |
| 9 | `A → B, ¬A, C, D ∴ ¬B` | `((((A → B) ∧ ¬A) ∧ C) ∧ D) → ¬B` | Aberto | Contingência | Inválido — Negação do antecedente |
| 10 | `A, B, C, D ∴ ¬A` | `(((A ∧ B) ∧ C) ∧ D) → ¬A` | Aberto | Contingência | Inválido |
| 11 | `A ∨ B, ¬B, C, D ∴ A` | `((((A ∨ B) ∧ ¬B) ∧ C) ∧ D) → A` | Fechado | Tautologia | Válido — Silogismo Disjuntivo |
| 12 | `A → B, B → C, A, D ∴ C` | `((((A → B) ∧ (B → C)) ∧ A) ∧ D) → C` | Fechado | Tautologia | Válido |
| 13 | `A ∨ B, A, C, D ∴ B` | `((((A ∨ B) ∧ A) ∧ C) ∧ D) → B` | Aberto | Contingência | Inválido |
| 14 | `A, B, C, D ∴ A ∧ B` | `(((A ∧ B) ∧ C) ∧ D) → (A ∧ B)` | Fechado | Tautologia | Válido — Conjunção |

As legendas dos 14 testes contêm apenas os átomos presentes nas FBFs. Em especial, os testes 3, 7, 10, 11 e 13 não criam letras extras.

## Contraexemplos confirmados

Todos os valores abaixo foram reavaliados pela suíte. Em cada linha, todas as premissas resultam em `V` e a conclusão resulta em `F`.

| Teste | Atribuição confirmada | Premissas | Conclusão |
|---:|---|---:|---:|
| 8 | `A=F, B=V, C=V, D=V` | Todas `V` | `A=F` |
| 9 | `A=F, B=V, C=V, D=V` | Todas `V` | `¬B=F` |
| 10 | `A=V, B=V, C=V, D=V` | Todas `V` | `¬A=F` |
| 13 | `A=V, B=F, C=V, D=V` | Todas `V` | `B=F` |

## Bateria de casos difíceis

| Categorias | Casos cobertos |
|---|---|
| A–C | Conectivos repetidos, precedência mista, dupla negação e negação explícita de fórmula composta |
| D–G | Antecedente conjuntivo/disjuntivo, consequente composto e bicondicional simples/composto |
| H–L | Repetição, positivo/negativo, caixa, pontuação final e espaços duplicados |
| M–O | Limites de tokens em `e`/`ou`, `então` interno e `logo` dentro de conteúdo textual |
| P–R | Entrada simbólica com frases, parênteses naturais e simbólicos, implicação à direita e bicondicional à esquerda |
| S–V | 1.400 fórmulas aleatórias com semente fixa, matriz de argumentos, comparação entre três métodos e testes metamórficos |
| W–Y | Tautologias, contradições e contingências clássicas |
| Z | Operando ausente, operador duplicado, parênteses incorretos, condicional incompleta e estrutura textual ambígua |

Também foram testadas oito proposições simultâneas, totalizando `2^8 = 256` interpretações. A matriz determinística cobre 512 combinações de duas premissas e uma conclusão; todo argumento inválido tem o contraexemplo reavaliado de forma independente.

## Integridade da regressão

- testes antigos removidos: **0**;
- condições especiais para frases completas específicas: **0**;
- divergências entre Tableaux, tabela-verdade e avaliador semântico: **0**;
- contraexemplos rejeitados pela verificação independente: **0**;
- falhas na interface, build ou servidor: **0**.

## Como reproduzir

Na pasta do projeto, execute:

```bash
npm test
```

Saída lógica esperada:

```text
OK — 2.023 fórmulas, 554 argumentos e 34.722 verificações lógicas.
```

A execução completa também confirma:

```text
OK — interface: 63 IDs, 4 abas e verificações de acessibilidade/estrutura aprovadas.
Build concluído: 5 rotas estáticas empacotadas.
OK — servidor: rotas, tipos MIME, HEAD, 404 e cabeçalhos de segurança aprovados.
```

## Conclusão

Os 14 cenários obrigatórios, os testes antigos e as novas regressões foram aprovados. A validade continua sendo obtida exclusivamente pela FBF do argumento, pelo Tableaux, pela tabela-verdade e pelo avaliador semântico. O tradutor passou a preservar conectivos e agrupamentos reconhecidos, reutilizar corretamente os átomos e recusar estruturas ambíguas sem inventar significado de predicados ou sinônimos.
