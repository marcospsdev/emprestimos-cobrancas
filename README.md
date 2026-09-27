# MeusEmpréstimos

Controle pessoal de dinheiro emprestado: para quem, quanto, quando vai receber e se
já pagou. Feito para ser usado principalmente no celular. React + TypeScript + Vite + Supabase,
com login único (sem cadastro de usuários pelo app).

## Como funciona

- **Empréstimo** tem título, pessoa, valor emprestado, valor a receber (igual ao emprestado
  por padrão; se for maior, a diferença aparece como lucro), data do empréstimo, data combinada
  de pagamento e uma descrição livre (ex.: "3 parcelas de R$ 200").
- **Status** (calculado automaticamente):
  - **A receber**: ainda está no prazo.
  - **Atrasado**: a data passou e o empréstimo não foi pago.
  - **Pago**: foi marcado no check, com a data do pagamento e a forma (Pix, dinheiro...), que é opcional.
- **Pessoas** têm nome, WhatsApp e observações. Dá para cadastrar a pessoa direto no
  formulário do empréstimo.
- **WhatsApp**: o botão verde abre a conversa com a mensagem de cobrança já escrita
  (título, valor e data). É só apertar enviar.
- **Resumo (dashboard)** e **lista** navegam por mês (mês da data de pagamento). Os atrasados
  de meses anteriores aparecem em destaque até serem pagos.

Design system e regras de UI/UX mobile: [`docs/design-system.md`](docs/design-system.md).

## Stack

React 19, TypeScript, Vite, Tailwind CSS v4, Supabase (Auth + Postgres), React Router, TanStack
Query, React Hook Form + Zod, Iconify (set `tabler`), Recharts. A exportação usa jsPDF e ExcelJS,
carregados só no momento em que alguém exporta.

## Configuração do Supabase

1. Crie um projeto em [supabase.com](https://supabase.com) (plano Free é suficiente).
2. Abra o **SQL Editor**, cole todo o conteúdo de `supabase-schema.sql` e execute.
   Ele cria as tabelas `people` e `loans` com RLS.
   **Atenção:** o script apaga as tabelas da versão antiga do sistema (parcelas, pagamentos etc.).
3. Crie o usuário em **Authentication → Users → Add user** (e-mail + senha), se ainda não existir.
4. Em **Settings → API**, copie:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public / publishable key** → `VITE_SUPABASE_ANON_KEY`

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
3. Em **Settings → Environment Variables**, adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
4. Redeploy.

## Recuperação de senha

A tela de login usa o e-mail embutido do Supabase Auth (`resetPasswordForEmail`), sem precisar
configurar SMTP. Ele envia poucos e-mails por hora e pode cair no spam. Se precisar de mais,
configure um SMTP em **Authentication → Settings → SMTP Settings**, sem mudar nada no código.
O link do e-mail leva para `/redefinir-senha`.
