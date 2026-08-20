# LogiQ — Calculadora de Lógica Proposicional

Aplicação web desenvolvida para a atividade AV1 de Lógica Proposicional. O projeto implementa as três etapas solicitadas no enunciado:

1. análise léxica dos símbolos;
2. análise sintática de fórmulas bem formuladas (FBF);
3. prova de tautologia por Tableaux semântico.

Além do método principal, a aplicação testa a validade de argumentos, gera uma tabela-verdade completa, classifica fórmulas como tautologia, contradição ou contingência e apresenta um contraexemplo matematicamente confirmado quando a conclusão não decorre das premissas.

## O que a calculadora faz

- cria campos dinâmicos para **Premissa 1, Premissa 2, ...** e uma conclusão;
- aceita fórmulas simbólicas ou frases em português controlado nos mesmos campos;
- aceita texto corrido, separando as premissas por ponto e reconhecendo a conclusão após `logo`, `portanto`, `assim`, `conclusão:` ou `∴`;
- traduz frases para proposições, reutiliza ideias já informadas e mostra a legenda utilizada;
- testa a validade do argumento por meio da fórmula `(P1 ∧ P2 ∧ ...) → C`;
- identifica didaticamente regras clássicas de inferência e falácias quando o padrão é inequívoco;
- mantém um modo exclusivo para análise de fórmulas proposicionais;
- exibe análise léxica, confirmação de FBF, Tableaux, tabela-verdade e explicação do resultado.

Exemplo de texto corrido:

```text
Se estudo, então sou aprovado. Estudo. Logo, sou aprovado.
```

Conectivos escritos aceitos nas frases: `não`, `e`, `ou`, `se..., então...` e `se e somente se`.

O tradutor respeita a mesma precedência do modo simbólico (`¬`, `∧`, `∨`, `→`, `↔`) e reconhece parênteses em expressões controladas. Assim, `(A ou B) e C` permanece diferente de `A ou (B e C)`. Também são aceitos antecedentes e consequentes compostos, como `Se o sensor está ativo e a porta está aberta, então o alarme dispara`.

Como o conteúdo é de lógica **proposicional**, uma frase completa é tratada como uma proposição atômica. O programa reconhece relações escritas explicitamente com esses conectivos e reaproveita proposições anteriores quando a conclusão omite um sujeito, verbo ou complemento de forma inequívoca.

Exemplo de reaproveitamento correto:

```text
Hoje chove. Eu estudo. Eu trabalho. Eu vou à academia.
Assim, hoje chove e eu estudo, trabalho e vou à academia.
```

Nesse caso, a conclusão é traduzida com as mesmas quatro proposições das premissas, sem criar letras extras. Diferenças entre maiúsculas e minúsculas e a omissão inequívoca de pronomes também são normalizadas. Se um trecho puder apontar para mais de uma proposição ou se uma enumeração estiver incompleta, a calculadora pede que as frases sejam reescritas por extenso em vez de escolher uma interpretação silenciosamente.

O recurso é intencionalmente um **português controlado**: ele não tenta identificar sinônimos, referências contextuais ou equivalências semânticas entre frases diferentes. Quando a estrutura não puder ser determinada de modo inequívoco, a calculadora solicita a reescrita de cada lado do conectivo como uma proposição completa. Essa limitação mantém a tradução previsível e o resultado lógico verificável.

A negação também reutiliza a proposição positiva quando a construção é direta. Por exemplo, se `A` representa `João estuda`, a frase `João não estuda` é traduzida como `¬A`. Construções ambíguas, como `não só`, não são interpretadas silenciosamente.

## Regras didáticas e segurança formal

Quando a estrutura corresponde exatamente a um padrão conhecido, o resultado informa **Modus Ponens**, **Modus Tollens**, **Silogismo Hipotético**, **Silogismo Disjuntivo**, **Simplificação**, **Conjunção**, **Afirmação do consequente** ou **Negação do antecedente**. Essa identificação é apenas explicativa: a validade continua sendo calculada pelo Tableaux, pela tabela-verdade e pelo avaliador semântico.

Antes de mostrar um contraexemplo, o programa confirma que todas as premissas são verdadeiras e a conclusão é falsa sob a atribuição apresentada. Se os três métodos não concordarem, a análise é interrompida em vez de exibir um resultado inseguro.

Entradas com quantificadores claros, como `todo`, `algum`, `nenhum` ou `existe`, recebem uma orientação de que dependem de relações internas não representadas pela Lógica Proposicional. O sistema não implementa nem simula Lógica de Predicados.

## Identidade visual

A interface utiliza uma linguagem acadêmica inspirada em materiais de estudo:

- **tema claro:** papel em tom marfim, pautas discretas, azul universitário e verde para conclusões;
- **tema escuro:** lousa em verde-grafite, texto em branco quente e detalhes suaves, sem efeitos neon;
- fórmulas e títulos usam tipografia editorial, enquanto controles permanecem simples e legíveis;
- resultados, Tableaux, tabela-verdade e análise léxica são apresentados como partes de um relatório acadêmico;
- o seletor no cabeçalho permite alternar entre os temas claro e escuro, mantendo a preferência salva no navegador.

Essa identidade visual não altera o funcionamento lógico, a estrutura dos campos da calculadora nem os resultados.

## Equipe

**Disciplina:** Res problemas nat discreta

- Mário Monteiro
- Bruno Gonçalves
- Ana Gabriella
- José Cleidson 

## Link da apresentação

**Apresentação — GitHub Pages:** https://mariomont30.github.io/Calculadora-Logica_de_Preposicoes/

**Código-fonte:** https://github.com/mariomont30/Calculadora-Logica_de_Preposicoes

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

## Estrutura

- `index.html`: conteúdo e estrutura semântica da interface;
- `styles.css`: identidade visual, responsividade, tema e impressão;
- `app.js`: analisadores, tradutor de frases, avaliador, tabela-verdade e Tableaux;
- `ui.js`: comportamento da interface, premissas dinâmicas e apresentação dos resultados.

Todo o processamento ocorre localmente no navegador e nenhum dado é enviado para servidores externos.

## Testes automatizados

A entrega inclui uma suíte reproduzível, sem dependências externas. Para executá-la:

```bash
npm test
```

A suíte valida:

- 2.023 fórmulas proposicionais, 554 argumentos e 34.722 verificações lógicas;
- os 14 cenários funcionais obrigatórios em texto corrido, com suas FBFs, regras e contraexemplos;
- argumentos válidos e inválidos, em símbolos e em frases portuguesas;
- precedência, parênteses, conectivos repetidos, negação dupla e negação de fórmulas compostas;
- negação interna, reutilização de proposições, sujeito compartilhado e estruturas compostas explícitas;
- identificação das seis regras válidas e das duas falácias documentadas;
- rejeição segura de estruturas ambíguas, conectivos incompletos e parênteses incorretos;
- recusa didática de quantificadores fora do escopo proposicional;
- separação de texto por ponto e conectivos de conclusão;
- combinações exaustivas de negação, conjunção, disjunção, condicional e bicondicional;
- fórmulas aleatórias profundas com semente determinística;
- equivalência entre Tableaux, tabela-verdade e um avaliador de referência independente;
- validade de todos os contraexemplos produzidos;
- aliases, precedência, associatividade e mensagens de erro;
- fórmulas com até oito proposições e 256 interpretações;
- integridade da interface, acessibilidade, responsividade e segurança da renderização;
- build de produção, rotas, tipos MIME, requisições HEAD, página 404 e cabeçalhos de segurança.

Os resultados completos, incluindo as 14 FBFs e os contraexemplos validados, estão em [`RELATORIO-DE-TESTES.md`](RELATORIO-DE-TESTES.md).
