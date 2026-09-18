# MeusEmpréstimos

Sistema pessoal de controle de empréstimos e cobranças (pessoas, empréstimos, parcelas,
pagamentos, juros, inadimplência e renegociação). React + TypeScript + Vite + Supabase, com login
único (sem cadastro de usuários pelo app).

## Stack

React 19, TypeScript, Vite, Tailwind CSS v4, Supabase (Auth + Postgres), React Router, TanStack
Query, React Hook Form + Zod, Iconify (set `tabler`), Recharts, jsPDF + jspdf-autotable, ExcelJS,
[React Bits](https://reactbits.dev) `Lightfall` (ogl/WebGL) no fundo da tela de login.

## Configuração do Supabase

1. Crie um projeto em [supabase.com](https://supabase.com) (plano Free é suficiente).
2. Abra **SQL Editor** no painel do projeto, cole o conteúdo completo de `supabase-schema.sql`
   (raiz deste repositório) e execute. Isso cria todas as tabelas, triggers, RLS, views e funções
   usadas pelo dashboard/relatórios/cálculo de parcelas e juros.
3. **Só depois** crie o único usuário do sistema em **Authentication → Users → Add user** (e-mail +
   senha). Não existe tela de cadastro no app — o login é sempre com essa conta. A criação do
   usuário dispara um trigger que semeia automaticamente os parâmetros padrão de cobrança (multa
   2% + juros de mora 0,10% ao dia) — por isso a ordem importa.
4. Em **Settings → API**, copie:
   - **Project URL** → variável `VITE_SUPABASE_URL`
   - **anon public / publishable key** → variável `VITE_SUPABASE_ANON_KEY`

   Nunca use a **service_role / secret key** no frontend.

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_ANON_KEY
```

## Rodando localmente

```bash
npm install
npm run dev
```

## Deploy (Vercel)

1. Importe o repositório na Vercel (framework detectado automaticamente: Vite).
2. Build command: `npm run build` · Output directory: `dist`.
3. Em **Settings → Environment Variables**, adicione as mesmas duas variáveis do `.env.local`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Redeploy.

## Recuperação de senha ("Esqueci minha senha")

A tela de login usa o serviço de e-mail **embutido** do Supabase Auth
(`supabase.auth.resetPasswordForEmail`) — não é necessário configurar SMTP. Limitações a ter em
mente:

- É limitado a poucos envios por hora e usa o domínio padrão do Supabase (o e-mail pode cair em
  spam).
- Para um app pessoal de usuário único isso é suficiente. Se um dia precisar de mais
  confiabilidade/volume, configure um SMTP próprio em **Authentication → Settings → SMTP
  Settings** no painel do Supabase — não exige nenhuma mudança no código.
- O link do e-mail leva para `/redefinir-senha`, onde a nova senha é definida.

## Modelo de dados (resumo)

- **Pessoas**: cadastro de clientes/tomadores (nome, CPF, telefone/WhatsApp, endereço,
  observações), com histórico de empréstimos e pagamentos na tela de detalhe.
- **Empréstimos**: valor emprestado, juros (simples, por parcela), número de parcelas, frequência
  e data do 1º vencimento. O valor total e as parcelas (iguais) são calculados automaticamente
  pela função `fn_create_loan` no banco.
- **Parcelas e pagamentos**: cada parcela aceita múltiplos pagamentos (suporte nativo a pagamento
  parcial). Status (Pendente/Pago/Atrasado) e valor atualizado em atraso (multa + juros de mora ao
  dia) são calculados pela view `v_installments`.
- **Inadimplência**: parcelas com status Atrasado, com atalho para WhatsApp/telefone da pessoa.
- **Renegociação**: soma o saldo em aberto de um empréstimo, cancela suas parcelas pendentes
  (preservando o histórico) e cria um novo empréstimo com esse saldo — tudo em uma única função
  (`fn_renegotiate_loan`), registrado em `renegotiations`.
- **Auditoria**: criação de empréstimo, pagamento e renegociação são gravados automaticamente em
  `audit_log` por trigger.
- **Relatórios**: empréstimos, pagamentos, juros recebidos, valores a receber e inadimplência, por
  período livre, todos com exportação em PDF e Excel.

## Configurações

O menu **Configurações** reúne os parâmetros de cobrança (multa e juros de mora, aplicados a todas
as parcelas em atraso), a contagem de linhas por tabela e uma rotina de limpeza de empréstimos
quitados muito antigos (mais de 5 anos); para uso real de banco em MB, veja **Settings → Usage →
Database Size** no painel do Supabase.
