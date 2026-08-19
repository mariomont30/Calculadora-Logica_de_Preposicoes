# LogiQ — Provador de Fórmulas Proposicionais

Aplicação web desenvolvida para a atividade AV1 de Lógica Proposicional. O projeto implementa as três etapas solicitadas no enunciado:

1. análise léxica dos símbolos;
2. análise sintática de fórmulas bem formuladas (FBF);
3. prova de tautologia por Tableaux semântico.

Além do método principal, a aplicação gera uma tabela-verdade completa para conferência, classifica fórmulas como tautologia, contradição ou contingência e apresenta um contraexemplo quando a fórmula não é tautológica.

## Como executar

Não é necessário instalar dependências. Abra `index.html` em um navegador moderno.

Para servir localmente com Python:

```bash
python -m http.server 8080
```

Depois, acesse `http://localhost:8080`.

## Símbolos aceitos

| Operação | Símbolo principal | Alternativas |
|---|---:|---:|
| Negação | `¬` | `~`, `!`, `∼` |
| Conjunção | `∧` | `^`, `&` |
| Disjunção | `∨` | `v`, `|` |
| Condicional | `→` | `->` |
| Bicondicional | `↔` | `<->` |

As proposições são representadas por letras de `A` a `Z`. O `v` minúsculo é interpretado como disjunção, como na notação `PvQ` do enunciado.

## Método de Tableaux

O programa usa Tableaux semântico assinado. Para testar se uma fórmula `φ` é tautologia, o algoritmo inicia com `F φ`, isto é, supõe a fórmula falsa. Em seguida, aplica regras lineares (α) e ramificadas (β). Um ramo fecha ao conter simultaneamente `T P` e `F P` para alguma proposição `P`.

- se todos os ramos fecham, `φ` é tautologia;
- se existe um ramo aberto, os seus literais fornecem um contraexemplo para `φ`.

## Roteiro curto de apresentação

1. Apresente o problema e as três etapas exibidas no topo da página.
2. Teste um erro léxico, por exemplo `P + Q`.
3. Teste um erro sintático, por exemplo `P ∧∧ Q`.
4. Demonstre uma tautologia com `((P → Q) ∧ P) → Q`.
5. Mostre os ramos fechados e compare com a tabela-verdade.
6. Teste `P ∧ Q` e explique o ramo aberto e o contraexemplo.
7. Finalize na seção da equipe.

## Estrutura

- `index.html`: conteúdo e estrutura semântica da interface;
- `styles.css`: identidade visual, responsividade, tema e impressão;
- `app.js`: analisadores, avaliador, Tableaux e interações da interface.

Todo o processamento ocorre localmente no navegador e nenhum dado é enviado para servidores externos.
