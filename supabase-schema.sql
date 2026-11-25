-- =====================================================
-- Schema: MeusEmpréstimos
-- Execute este arquivo inteiro no SQL Editor do Supabase.
--
-- ATENÇÃO: a primeira parte APAGA as tabelas da versão antiga do sistema
-- (parcelas, pagamentos, renegociações, configurações, auditoria) e os
-- dados que estiverem nelas. Pode ser executado de novo sem problemas.
-- =====================================================

-- =====================================================
-- LIMPEZA DA VERSÃO ANTIGA
-- =====================================================
DROP TRIGGER IF EXISTS trg_seed_settings ON auth.users;
DROP FUNCTION IF EXISTS fn_seed_settings() CASCADE;
DROP FUNCTION IF EXISTS fn_audit_log() CASCADE;
DROP FUNCTION IF EXISTS fn_create_loan(UUID, NUMERIC, NUMERIC, INT, DATE, TEXT) CASCADE;
DROP FUNCTION IF EXISTS fn_register_payment(UUID, NUMERIC, DATE, TEXT) CASCADE;
DROP FUNCTION IF EXISTS fn_renegotiate_loan(UUID, INT, DATE, NUMERIC, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS fn_dashboard_summary() CASCADE;
DROP FUNCTION IF EXISTS fn_interest_by_month(INT) CASCADE;
DROP VIEW IF EXISTS v_installments CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS renegotiations CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS installments CASCADE;
DROP TABLE IF EXISTS loan_payments CASCADE;
DROP TABLE IF EXISTS loans CASCADE;
DROP TABLE IF EXISTS people CASCADE;

-- =====================================================
-- PESSOAS (para quem o dinheiro foi emprestado)
-- =====================================================
CREATE TABLE people (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name       TEXT NOT NULL CHECK (length(trim(name)) > 0),
  phone      TEXT,
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_people_user_name ON people(user_id, name);

-- =====================================================
-- EMPRÉSTIMOS
-- O status não é gravado: é derivado no app a partir de paid_at e
-- due_date (pago / atrasado / a receber), sempre na data local.
-- =====================================================
CREATE TABLE loans (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id            UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  person_id          UUID REFERENCES people(id) ON DELETE RESTRICT NOT NULL,
  -- Não usado pelo app (o empréstimo é identificado pelo cliente + descrição).
  title              TEXT CHECK (title IS NULL OR length(trim(title)) > 0),
  description        TEXT,
  amount_lent        DECIMAL(12,2) NOT NULL CHECK (amount_lent > 0),
  -- Juros em % deste empréstimo; amount_to_receive = amount_lent * (1 + juros/100).
  interest_rate      DECIMAL(6,2) NOT NULL DEFAULT 0 CHECK (interest_rate >= 0),
  amount_to_receive  DECIMAL(12,2) NOT NULL CHECK (amount_to_receive > 0),
  -- Parcelado: total dividido em N parcelas mensais (1 = de uma vez). A última quita.
  installments       INT NOT NULL DEFAULT 1,
  installments_paid  INT NOT NULL DEFAULT 0,
  loan_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date           DATE NOT NULL,
  paid_at            DATE,
  payment_method     TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT loans_installments_check
    CHECK (installments BETWEEN 1 AND 120 AND installments_paid >= 0 AND installments_paid < installments)
);

CREATE INDEX idx_loans_user_due ON loans(user_id, due_date);
CREATE INDEX idx_loans_person ON loans(person_id);

-- =====================================================
-- ROW LEVEL SECURITY: cada usuário só enxerga os próprios dados
-- =====================================================
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "people_policy" ON people FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "loans_policy"  ON loans  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- PAGAMENTOS QUE NÃO QUITAM: só juros ou uma parcela (o vencimento vai para o mês seguinte)
-- =====================================================
CREATE TABLE IF NOT EXISTS loan_payments (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  loan_id        UUID REFERENCES loans(id) ON DELETE CASCADE NOT NULL,
  kind           TEXT NOT NULL DEFAULT 'juros' CHECK (kind IN ('juros', 'parcela')),
  amount         DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  -- Vencimento que este pagamento cobriu (o mês em que ele aparece no resumo).
  due_date       DATE NOT NULL,
  paid_at        DATE NOT NULL,
  payment_method TEXT,
  installment_number INT,  -- número da parcela (kind = parcela)
  created_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_loan_payments_user_due ON loan_payments(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_loan_payments_loan ON loan_payments(loan_id);

ALTER TABLE loan_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "loan_payments_policy" ON loan_payments;
CREATE POLICY "loan_payments_policy" ON loan_payments FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Registra o pagamento dos juros e leva o vencimento para p_next_due, tudo
-- junto (se uma parte falhar, nada é salvo). Roda com as permissões de quem
-- chama, então o RLS continua valendo.
CREATE OR REPLACE FUNCTION fn_pay_interest(
  p_loan_id UUID, p_paid_at DATE, p_payment_method TEXT, p_next_due DATE
) RETURNS loan_payments
LANGUAGE plpgsql SECURITY INVOKER AS $
DECLARE
  v_loan loans;
  v_payment loan_payments;
BEGIN
  SELECT * INTO v_loan FROM loans WHERE id = p_loan_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Empréstimo não encontrado.'; END IF;
  IF v_loan.paid_at IS NOT NULL THEN RAISE EXCEPTION 'Este empréstimo já foi quitado.'; END IF;
  IF v_loan.amount_to_receive <= v_loan.amount_lent THEN RAISE EXCEPTION 'Este empréstimo não tem juros.'; END IF;
  IF p_next_due <= v_loan.due_date THEN RAISE EXCEPTION 'O próximo vencimento precisa ser depois do atual.'; END IF;

  INSERT INTO loan_payments (loan_id, kind, amount, due_date, paid_at, payment_method)
  VALUES (p_loan_id, 'juros', v_loan.amount_to_receive - v_loan.amount_lent, v_loan.due_date, p_paid_at, NULLIF(trim(p_payment_method), ''))
  RETURNING * INTO v_payment;

  UPDATE loans SET due_date = p_next_due WHERE id = p_loan_id;
  RETURN v_payment;
END;
$;

-- Desfaz o último pagamento de juros: apaga o registro e devolve o vencimento.
CREATE OR REPLACE FUNCTION fn_undo_interest(p_payment_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY INVOKER AS $
DECLARE
  v_payment loan_payments;
BEGIN
  SELECT * INTO v_payment FROM loan_payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pagamento não encontrado.'; END IF;
  IF EXISTS (SELECT 1 FROM loan_payments WHERE loan_id = v_payment.loan_id AND due_date > v_payment.due_date) THEN
    RAISE EXCEPTION 'Só dá para desfazer o pagamento de juros mais recente deste empréstimo.';
  END IF;
  IF EXISTS (SELECT 1 FROM loans WHERE id = v_payment.loan_id AND paid_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Este empréstimo já foi quitado. Desmarque a quitação antes.';
  END IF;

  DELETE FROM loan_payments WHERE id = p_payment_id;
  UPDATE loans SET due_date = v_payment.due_date WHERE id = v_payment.loan_id;
END;
$;

-- =====================================================
-- FIM DO SCHEMA
-- Se ainda não existir, crie o usuário do sistema em
-- Authentication -> Users -> Add user (e-mail + senha).
-- =====================================================

-- Parcelamento (fn_pay_installment e fn_undo_interest atualizada para parcelas):
-- veja supabase/migrations/2026-11-22_parcelamento.sql

-- =====================================================
-- Configurações do usuário: chave Pix da cobrança (migração 2026-11-23_chave_pix.sql)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_settings (
  user_id        UUID PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  pix_key_type   TEXT CHECK (pix_key_type IS NULL OR pix_key_type IN ('cpf', 'cnpj', 'email', 'telefone', 'aleatoria')),
  pix_key        TEXT,
  pix_bank       TEXT,
  pix_holder     TEXT,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_settings_pix_pair_check CHECK ((pix_key IS NULL) = (pix_key_type IS NULL))
);
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_settings_policy" ON user_settings;
CREATE POLICY "user_settings_policy" ON user_settings FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- IMPORTANTE (2026-11-23): base COMPARTILHADA entre todos os usuários.
-- A migração 2026-11-23_base_compartilhada.sql substitui as políticas acima:
-- qualquer usuário logado vê/altera people, loans, loan_payments, user_settings
-- e notification_log (USING (true) TO authenticated). user_id = só "quem cadastrou",
-- com FK ON DELETE SET NULL (excluir usuário NÃO apaga dados).
-- user_settings vira linha única (id BOOLEAN PRIMARY KEY = true): uma chave Pix do sistema.
-- push_devices continua por usuário; os avisos vão para todos os aparelhos.
-- =====================================================

-- =====================================================
-- DESPESAS (ver supabase/migrations/2026-11-25_despesas.sql)
-- =====================================================
CREATE TABLE IF NOT EXISTS fixed_expenses (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id              UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  description          TEXT NOT NULL,
  category             TEXT NOT NULL DEFAULT 'outros',
  amount               NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  -- Dia do vencimento (em meses mais curtos vira o último dia do mês).
  due_day              SMALLINT NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  -- Primeiro mês (sempre dia 1).
  start_month          DATE NOT NULL,
  -- Último mês em que repete (dia 1). NULL = repete sempre.
  end_month            DATE,
  -- Até qual mês já foi lançada (controle interno da geração).
  last_generated_month DATE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  description      TEXT NOT NULL,
  category         TEXT NOT NULL DEFAULT 'outros',
  amount           NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  -- Data do gasto / vencimento da conta (mês em que aparece).
  due_date         DATE NOT NULL,
  -- Quando foi paga (NULL = a pagar).
  paid_at          DATE,
  notes            TEXT,
  -- Veio de uma conta fixa (NULL = gasto avulso).
  fixed_expense_id UUID REFERENCES fixed_expenses(id) ON DELETE SET NULL,
  ref_month        DATE GENERATED ALWAYS AS (date_trunc('month', due_date::timestamp)::date) STORED,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_due_date ON expenses(due_date);
-- Uma conta fixa só é lançada uma vez em cada mês.
CREATE UNIQUE INDEX IF NOT EXISTS uq_expenses_fixed_month ON expenses(fixed_expense_id, ref_month)
  WHERE fixed_expense_id IS NOT NULL;

ALTER TABLE expenses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "expenses_policy" ON expenses;
CREATE POLICY "expenses_policy" ON expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "fixed_expenses_policy" ON fixed_expenses;
CREATE POLICY "fixed_expenses_policy" ON fixed_expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- -----------------------------------------------------
-- Lança as contas fixas de todos os meses ainda não lançados até p_until
-- (no máximo até o mês que vem). Retorna quantas despesas foram criadas.
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION fn_generate_fixed_expenses(p_until DATE) RETURNS INTEGER
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_until DATE := date_trunc('month', p_until::timestamp)::date;
  v_limit DATE := (date_trunc('month', (NOW() AT TIME ZONE 'America/Fortaleza')) + INTERVAL '1 month')::date;
  f       fixed_expenses%ROWTYPE;
  m       DATE;
  v_last  DATE;
  v_days  INTEGER;
  v_n     INTEGER;
  v_count INTEGER := 0;
BEGIN
  IF v_until > v_limit THEN
    v_until := v_limit;
  END IF;

  FOR f IN
    SELECT * FROM fixed_expenses
    WHERE start_month <= v_until
      AND (last_generated_month IS NULL OR last_generated_month < v_until)
      AND (end_month IS NULL OR last_generated_month IS NULL OR last_generated_month < end_month)
    FOR UPDATE SKIP LOCKED
  LOOP
    m := COALESCE((f.last_generated_month + INTERVAL '1 month')::date, f.start_month);
    v_last := LEAST(v_until, COALESCE(f.end_month, v_until));

    WHILE m <= v_last LOOP
      v_days := EXTRACT(DAY FROM (m + INTERVAL '1 month' - INTERVAL '1 day'))::int;
      INSERT INTO expenses (user_id, description, category, amount, due_date, fixed_expense_id)
      VALUES (f.user_id, f.description, f.category, f.amount, m + (LEAST(f.due_day, v_days) - 1), f.id)
      ON CONFLICT DO NOTHING;
      GET DIAGNOSTICS v_n = ROW_COUNT;
      v_count := v_count + v_n;
      m := (m + INTERVAL '1 month')::date;
    END LOOP;

    IF v_last >= COALESCE(f.last_generated_month, v_last) THEN
      UPDATE fixed_expenses SET last_generated_month = v_last WHERE id = f.id;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION fn_generate_fixed_expenses(DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION fn_generate_fixed_expenses(DATE) TO authenticated;
