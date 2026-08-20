# LogiQ — Calculadora de Lógica Proposicional

> Análise de fórmulas e argumentos proposicionais de maneira simples, visual e verificável.

## 1. Apresentação

O **LogiQ** é uma calculadora web para estudar Lógica Proposicional. Ela recebe fórmulas simbólicas ou frases em português controlado, constrói a Fórmula Bem Formulada (FBF) e apresenta cada etapa da análise.

A validação combina **Tableaux semântico**, **tabela-verdade** e um **avaliador independente**. Quando um argumento é inválido, a calculadora mostra um contraexemplo confirmado.

## 2. Links do projeto

### 🌐 [Abrir a apresentação da calculadora](https://mariomont30.github.io/Calculadora-Logica_de_Preposicoes/)

### 💻 [Acessar o código-fonte no GitHub](https://github.com/mariomont30/Calculadora-Logica_de_Preposicoes)

## 3. Principais funcionalidades

- análise léxica dos símbolos proposicionais;
- validação sintática de FBFs;
- prova de tautologia por Tableaux;
- geração da tabela-verdade;
- classificação em tautologia, contradição ou contingência;
- validação de argumentos e contraexemplos;
- tradução de português controlado;
- entrada por campos separados ou texto corrido;
- reconhecimento de regras de inferência;
- temas claro e escuro;
- interface responsiva para computador e celular.

## 4. Equipe

**Disciplina:** Res problemas nat discreta

- Mário Monteiro
- Bruno Gonçalves
- Ana Gabriella
- José Cleidson

**Responsável pelo repositório:** Mário_DEV

## 5. Como utilizar

### Argumento por campos

Preencha as premissas, informe a conclusão e clique em **Verificar validade do argumento**. Novos campos podem ser adicionados quando necessário.

### Argumento em texto corrido

Separe as premissas por ponto e indique a conclusão com `logo`, `portanto`, `assim`, `conclusão:` ou `∴`.

```text
Se estudo, então sou aprovado. Estudo. Logo, sou aprovado.
```

Tradução produzida:

```text
A → B, A ∴ B
```

### Fórmula proposicional

Na aba **Fórmula**, digite diretamente uma expressão como:

```text
((P → Q) ∧ P) → Q
```

## 6. Entradas aceitas

| Operação | Símbolo | Alternativas |
|---|:---:|:---:|
| Negação | `¬` | `~`, `!`, `∼` |
| Conjunção | `∧` | `^`, `&` |
| Disjunção | `∨` | `v`, `\|` |
| Condicional | `→` | `->` |
| Bicondicional | `↔` | `<->` |

Em português controlado, são reconhecidos `não`, `e`, `ou`, `se..., então...` e `se e somente se`.

O tradutor respeita a precedência `¬ > ∧ > ∨ > → > ↔`, preserva parênteses e reutiliza proposições já registradas. Se uma construção for ambígua, o sistema solicita sua reescrita em vez de escolher uma interpretação silenciosamente.

## 7. Resultados apresentados

A análise pode exibir:

- legenda das proposições e FBF resultante;
- análise léxica e confirmação sintática;
- desenvolvimento do Tableaux;
- tabela-verdade completa;
- classificação da fórmula ou validade do argumento;
- regra de inferência reconhecida;
- contraexemplo com premissas verdadeiras e conclusão falsa.

Entre as regras didáticas estão Modus Ponens, Modus Tollens, Silogismo Hipotético, Silogismo Disjuntivo, Simplificação e Conjunção. As falácias da Afirmação do consequente e da Negação do antecedente também podem ser identificadas.

O projeto trabalha exclusivamente com **Lógica Proposicional** e não tenta simular Lógica de Predicados.

## 8. Testes e confiabilidade

A suíte automatizada verifica:

- **2.023 fórmulas proposicionais**;
- **554 argumentos**;
- **34.722 verificações lógicas**;
- os 14 cenários funcionais obrigatórios;
- fórmulas aleatórias reproduzíveis e até 256 interpretações;
- concordância entre Tableaux, tabela-verdade e avaliador independente;
- validade de todos os contraexemplos;
- interface, acessibilidade, build e servidor.

Consulte o [`RELATORIO-DE-TESTES.md`](RELATORIO-DE-TESTES.md) para ver as FBFs, os resultados e os contraexemplos dos 14 cenários.

## 9. Executar localmente

Abra `index.html` em um navegador moderno ou inicie um servidor local:

```bash
python -m http.server 8080
```

Depois, acesse `http://localhost:8080`.

Para executar todos os testes:

```bash
npm test
```

Arquivos principais:

- `index.html`: estrutura da interface;
- `styles.css`: temas e responsividade;
- `app.js`: tradução, parser e motores lógicos;
- `ui.js`: interação e apresentação dos resultados;
- `tests/`: testes automatizados.

Todo o processamento ocorre localmente no navegador. Nenhuma fórmula ou frase é enviada para servidores externos.
