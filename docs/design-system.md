# Design system — MeusEmpréstimos

O app é usado principalmente **no celular**, por quem não é da área de tecnologia.
Toda decisão abaixo parte disso: poucos elementos por tela, alvos grandes, uma
ação óbvia por contexto, e o teclado só aparece quando a pessoa toca num campo.

## Princípios

1. **Mobile-first.** Classes base = celular; `sm:` (≥640px) e `lg:` (≥1024px) só
   compactam/reorganizam para telas maiores.
2. **Alvo de toque ≥ 44px.** Botões `md` têm 48px no celular, o check de pago tem 44px,
   itens de lista e opções de combobox têm no mínimo 48px.
3. **Teclado só quando o usuário pede.** Nada recebe foco sozinho em aparelho de toque:
   - `DialogContent` foca o próprio modal ao abrir, não o primeiro campo.
   - `ComboboxField` não foca a busca ao abrir a lista no celular (`isTouchDevice()`).
   - Nunca usar `autoFocus` em campos.
4. **Teclado certo para cada campo.** Valores: `inputMode="decimal"` (MoneyField).
   Telefone: `type="tel"`. Busca: `type="search"` + `enterKeyHint="search"`. Datas: seletor nativo.
5. **Fonte ≥ 16px em campos no celular.** Abaixo disso o iPhone dá zoom na página ao focar.
6. **Status sempre com cor + texto.** Nunca só cor.

## Tokens (`src/index.css`, bloco `@theme`)

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

| Status | Regra | Cor | Rótulo |
|---|---|---|---|
| `pendente` | não pago e data ≥ hoje | `info` (azul) | A receber |
| `atrasado` | não pago e data < hoje | `danger` (vermelho) | Atrasado |
| `pago` | `paid_at` preenchido | `success` (verde) | Pago |

As cores ficam só em `status.ts` (`STATUS_BADGE_VARIANT`, `STATUS_BG_CLASS`) e aparecem em três lugares:
- na etiqueta de status;
- na barra vertical à esquerda de cada linha da `LoanList`;
- na legenda (`LoanStatusLegend`), que aparece acima das listas. Ela é desligada com `showLegend={false}` quando a lista tem um status só.

## Componentes

**Base (`components/ui`)**
- `Button`: variantes `primary`, `secondary`, `outline`, `ghost`, `danger` e `link`; tamanhos `sm`, `md`, `lg` e `icon`. Aceita `loading` e `asChild`.
- `Dialog`: vira *bottom sheet* no celular (arrastar para baixo fecha) e modal centralizado em `sm:`+. No celular os botões do rodapé dividem a largura.
- `MonthNavigator`: ‹ mês › com largura total no celular e o link "Voltar para o mês atual".
- `StatCard`: ícone, rótulo, valor e `hint` opcional. Tons `brand`, `gold`, `success`, `danger` e `neutral`.
- `Badge`, `EmptyState`, `Skeleton`, `Toast` (`useToast`), `ConfirmDialog` (`await confirm({...})`).
- Formulário: `TextField`, `MoneyField`, `DateField`, `TextareaField`, `PasswordField` e `ComboboxField`, todos sobre o `FieldShell` (rótulo, erro e dica).

**Empréstimos (`features/loans`)**
- `LoanList`: a lista padrão do app. Cada linha tem check de pago, título, pessoa, data, valor, status e o botão de cobrar no WhatsApp. Tocar na linha abre a edição.
- `PaidCheck`: o círculo de pago.
- `MarkPaidDialog`: confirma a data do pagamento (hoje por padrão) e a forma de pagamento.
- `PaymentMethodPicker`: botões Pix, Dinheiro, Transferência, Cartão e Outro. Um toque escolhe, outro desmarca.
- `LoanFormModal`: formulário único de cadastro e edição, com cadastro rápido de pessoa embutido.
- `useLoanForm()`: abre esse formulário de qualquer tela (`openNewLoan`, `openEditLoan`).

## Navegação

- **Celular:** `BottomNav` fixa embaixo (Resumo · Empréstimos · **+ Novo** · Pessoas) e `MobileHeader` com o menu da conta. O botão "Novo empréstimo" escrito também aparece no topo do Resumo e da lista, porque ícone sozinho não basta para quem não é da área.
- **Desktop (`lg:`)**: `Sidebar` fixa com o botão "Novo empréstimo".
- O mês selecionado fica na URL (`?mes=2026-09`) e acompanha a troca entre Resumo e Empréstimos.
