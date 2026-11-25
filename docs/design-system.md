# Design system — MeusEmpréstimos

O app é usado principalmente **no celular**, por quem não é da área de tecnologia.
Toda decisão abaixo parte disso: poucos elementos por tela, alvos grandes, uma
ação óbvia por contexto, e o teclado só aparece quando a pessoa toca num campo.

## Princípios

0. **Usuário principal: pessoa leiga, só no celular.** Cada linha de lista tem no máximo uma ação com texto (ex.: "Cobrar"); editar = tocar na linha; excluir fica dentro do formulário/página, longe de botões frequentes.

1. **Mobile-first.** Classes base = celular; `sm:` (≥640px) e `lg:` (≥1024px) só
   compactam/reorganizam para telas maiores.
2. **Alvo de toque ≥ 44px.** Botões `md` têm 48px no celular, o check de pago tem 44px,
   itens de lista e opções de combobox têm no mínimo 48px.
3. **Teclado só quando o usuário pede.** Nada recebe foco sozinho em aparelho de toque:
   - `DialogContent` foca o próprio modal ao abrir, não o primeiro campo.
   - `ComboboxField` não foca a busca ao abrir a lista no celular (`isTouchDevice()`).
   - Nunca usar `autoFocus` em campos.
4. **Teclado certo para cada campo.** Valores: `inputMode="decimal"` (MoneyField).
   Telefone: `type="tel"`. Busca: `type="search"` + `enterKeyHint="search"`. Datas: calendário próprio (`DateField`), nunca o seletor nativo do navegador.
5. **Fonte ≥ 16px em campos no celular.** Abaixo disso o iPhone dá zoom na página ao focar.
6. **Status sempre com cor + texto.** Nunca só cor.

## Tokens (`src/index.css`, bloco `@theme`)

Dois temas: **escuro** (valores do `@theme`, padrão) e **claro** (`:root[data-theme="light"]`, que só troca os valores). A escolha fica no menu da conta (Claro / Escuro / Do aparelho) e no botão de sol/lua do login, salva no `localStorage` (`src/lib/theme.ts`); um script no `index.html` aplica antes de carregar, sem piscar. **Nunca use cor fixa** (hex, `bg-black`, `text-gray-*`): sempre os tokens, para funcionar nos dois temas.

| Grupo | Tokens | Uso |
|---|---|---|
| Superfícies | `background` → `surface` → `surface-elevated`, `surface-hover` | fundo da página → cartões → campos/menus |
| Bordas | `border`, `border-strong` | divisórias / contorno de campos e botões |
| Marca | `brand-300…700` (verde esmeralda) | ação principal, navegação ativa, foco |
| Lucro | `gold-400/500`, `gold-muted` | **só** valores de lucro |
| Texto | `text-primary`, `text-secondary`, `text-muted` | título/valor, rótulo, dica |
| Estados | `success`, `danger`, `warning`, `info` (+ `-muted`) | pago, atrasado, aviso, a receber |

Raios: `rounded-xl`/`rounded-2xl` no celular (cartões, campos), `rounded-lg` em `sm:`+.

## Status do empréstimo

Calculado em `features/loans/status.ts` (`getLoanStatus`), na data local do aparelho:

| Status | Regra | Cor | Ícone | Rótulo |
|---|---|---|---|---|
| `pendente` | não pago e data ≥ hoje | `info` (azul) | relógio | A receber |
| `atrasado` | não pago e data < hoje | `danger` (vermelho) | alerta | Atrasado |
| `pago` | `paid_at` preenchido | `success` (verde) | check | Pago |

Sempre **cor + ícone + texto**. O verde da marca (`brand`) nunca representa status: verde de status é só `success` = pago. "Vence hoje/amanhã" (ainda a receber) aparece com o texto da data em `warning` (amarelo).

As cores ficam só em `status.ts` (`STATUS_BADGE_VARIANT`, `STATUS_BG_CLASS`, `STATUS_TEXT_CLASS`, `STATUS_ICON`, `STATUS_CHIP_ACTIVE_CLASS`, `STATUS_ROW_CLASS`) e aparecem em:
- na etiqueta de status (com ícone);
- na barra vertical à esquerda de cada linha da `LoanList`; a linha atrasada ganha também um fundo vermelho leve;
- na legenda (`LoanStatusLegend`), que aparece acima das listas. Ela é desligada com `showLegend={false}` quando a lista tem um status só;
- nos filtros da lista (bolinha na cor; selecionado fica na cor do status);
- nos totais do topo da lista (A receber azul, Atrasado vermelho, Recebido verde) e no "Deve" dos clientes (azul, ou vermelho se tem atraso).

## Componentes

**Base (`components/ui`)**
- `Button`: variantes `primary`, `secondary`, `outline`, `ghost`, `danger` e `link`; tamanhos `sm`, `md`, `lg` e `icon`. Aceita `loading` e `asChild`.
- `Dialog`: vira *bottom sheet* no celular (arrastar para baixo fecha) e modal centralizado em `sm:`+. No celular os botões do rodapé dividem a largura.
- `MonthNavigator`: ‹ mês › com largura total no celular e o link "Voltar para o mês atual".
- `StatCard`: ícone, rótulo, valor e `hint` opcional. Tons `brand`, `gold`, `success`, `danger` e `neutral`.
- `Badge`, `EmptyState`, `Skeleton`, `Toast` (`useToast`), `ConfirmDialog` (`await confirm({...})`).
- `DateField`: calendário próprio em pt-BR (domingo primeiro, dias de 44px no celular, "Hoje", "Limpar" quando opcional, toque no título escolhe mês/ano, setas/PageUp/PageDown no teclado). Valor em `yyyy-MM-dd`; usar com `Controller`.
- `CheckboxField`: checkbox próprio (nunca o nativo): linha inteira tocável, caixa de 24px que fica verde com check branco e fundo verde leve quando marcada.
- Formulário: `TextField`, `MoneyField`, `PercentField`, `DateField`, `CheckboxField`, `TextareaField`, `PasswordField` e `ComboboxField`, todos sobre o `FieldShell` (rótulo, erro e dica).

**Empréstimos (`features/loans`)**
- `LoanList`: a lista padrão do app. Cada linha tem check de pago, título, pessoa, data, valor, status e o botão de cobrar no WhatsApp. Tocar na linha abre a edição.
- `PaidCheck`: o círculo de pago.
- `MarkPaidDialog`: confirma a data do pagamento (hoje por padrão) e a forma de pagamento.
- `PaymentMethodPicker`: botões Pix, Dinheiro, Transferência, Cartão e Outro. Um toque escolhe, outro desmarca.
- `LoanFormModal`: formulário único de cadastro e edição, com cadastro rápido de pessoa embutido.
- `useLoanForm()`: abre esse formulário de qualquer tela (`openNewLoan`, `openEditLoan`).

## Navegação

- **Celular:** `BottomNav` fixa embaixo (Resumo · Empréstimos · Clientes · Despesas · Conta) e um botão flutuante com texto acima dela, à direita: "Novo empréstimo" ("Novo cliente" na lista de Clientes, "Nova despesa" em Despesas). Por isso os botões de cadastrar do topo das telas só aparecem no desktop. Conta abre uma folha com avisos, Pix, Armazenamento, senha e sair.
- **Desktop (`lg:`)**: `Sidebar` fixa com o botão "Novo empréstimo".
- O mês selecionado fica na URL (`?mes=2026-09`) e acompanha a troca entre Resumo e Empréstimos.
