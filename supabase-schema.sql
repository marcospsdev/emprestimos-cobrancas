-- =====================================================
-- Schema Completo: MeusEmpréstimos (Empréstimos e Cobranças)
-- Execute este arquivo, do início ao fim, no SQL Editor do Supabase
-- ANTES de criar o usuário em Authentication -> Users (o trigger de
-- seed dos parâmetros de cobrança dispara na criação do usuário).
-- =====================================================

-- =====================================================
-- PESSOAS (clientes/tomadores do empréstimo)
-- =====================================================
CREATE TABLE IF NOT EXISTS people (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name       TEXT NOT NULL,
  cpf        TEXT,
  phone      TEXT,
  address    TEXT,
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (user_id, cpf)
);

-- =====================================================
-- EMPRÉSTIMOS
-- =====================================================
CREATE TABLE IF NOT EXISTS loans (
  id                     UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  person_id              UUID REFERENCES people(id) ON DELETE RESTRICT NOT NULL,
  principal_amount       DECIMAL(12,2) NOT NULL CHECK (principal_amount > 0),
  interest_rate          DECIMAL(6,3) NOT NULL CHECK (interest_rate >= 0),
  installments_count     INT NOT NULL CHECK (installments_count > 0),
  installment_frequency  TEXT NOT NULL DEFAULT 'mensal' CHECK (installment_frequency IN ('mensal', 'quinzenal', 'semanal')),
  first_due_date         DATE NOT NULL,
  total_amount           DECIMAL(12,2) NOT NULL CHECK (total_amount > 0),
  status                 TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'quitado', 'renegociado', 'cancelado')),
  created_at             TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- PARCELAS
-- cancelled_at é usado só pela renegociação: preserva a parcela como
-- histórico sem contá-la como "a receber"/"em atraso".
-- =====================================================
CREATE TABLE IF NOT EXISTS installments (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_id           UUID REFERENCES loans(id) ON DELETE CASCADE NOT NULL,
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sequence          INT NOT NULL,
  due_date          DATE NOT NULL,
  principal_amount  DECIMAL(12,2) NOT NULL CHECK (principal_amount >= 0),
  interest_amount   DECIMAL(12,2) NOT NULL CHECK (interest_amount >= 0),
  amount            DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  cancelled_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (loan_id, sequence)
);

CREATE INDEX IF NOT EXISTS idx_installments_loan ON installments(loan_id);
CREATE INDEX IF NOT EXISTS idx_installments_user_due ON installments(user_id, due_date);

-- =====================================================
-- PAGAMENTOS
-- Múltiplos pagamentos por parcela = suporte nativo a pagamento parcial.
-- =====================================================
CREATE TABLE IF NOT EXISTS payments (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  installment_id UUID REFERENCES installments(id) ON DELETE CASCADE NOT NULL,
  loan_id        UUID REFERENCES loans(id) ON DELETE CASCADE NOT NULL,
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount         DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  payment_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  notes          TEXT DEFAULT '',
  created_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_installment ON payments(installment_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_date ON payments(user_id, payment_date);

-- =====================================================
-- RENEGOCIAÇÕES
-- Liga o empréstimo original (marcado como 'renegociado') ao novo
-- empréstimo gerado com o saldo em aberto — histórico nunca é apagado.
-- =====================================================
CREATE TABLE IF NOT EXISTS renegotiations (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  original_loan_id  UUID REFERENCES loans(id) ON DELETE CASCADE NOT NULL,
  new_loan_id       UUID REFERENCES loans(id) ON DELETE CASCADE NOT NULL,
  reason            TEXT DEFAULT '',
  created_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- PARÂMETROS DE COBRANÇA (multa e juros de mora)
-- Uma linha por usuário, editável na tela de Configurações.
-- =====================================================
CREATE TABLE IF NOT EXISTS settings (
  user_id                  UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  late_fee_percent         DECIMAL(5,2) NOT NULL DEFAULT 2 CHECK (late_fee_percent >= 0),
  daily_interest_percent   DECIMAL(6,4) NOT NULL DEFAULT 0.10 CHECK (daily_interest_percent >= 0),
  updated_at               TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- LOG DE AUDITORIA
-- Registro automático (via trigger) das movimentações mais sensíveis:
-- criação de empréstimo, pagamento e renegociação.
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   UUID NOT NULL,
  action      TEXT NOT NULL,
  details     JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);

-- =====================================================
-- TRIGGER: log automático de auditoria
-- =====================================================
CREATE OR REPLACE FUNCTION fn_audit_log() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (user_id, entity_type, entity_id, action, details)
  VALUES (NEW.user_id, TG_ARGV[0], NEW.id, TG_OP, to_jsonb(NEW));
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_audit_loans ON loans;
CREATE TRIGGER trg_audit_loans AFTER INSERT ON loans
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log('loan');

DROP TRIGGER IF EXISTS trg_audit_payments ON payments;
CREATE TRIGGER trg_audit_payments AFTER INSERT ON payments
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log('payment');

DROP TRIGGER IF EXISTS trg_audit_renegotiations ON renegotiations;
CREATE TRIGGER trg_audit_renegotiations AFTER INSERT ON renegotiations
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log('renegotiation');

-- =====================================================
-- TRIGGER: ao criar o usuário único do sistema, semeia os parâmetros
-- padrão de cobrança (Authentication -> Users -> Add user, DEPOIS de
-- rodar este schema inteiro).
-- =====================================================
CREATE OR REPLACE FUNCTION fn_seed_settings() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.settings (user_id, late_fee_percent, daily_interest_percent)
  VALUES (NEW.id, 2, 0.10)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_seed_settings ON auth.users;
CREATE TRIGGER trg_seed_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION fn_seed_settings();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE people          ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans            ENABLE ROW LEVEL SECURITY;
ALTER TABLE installments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE renegotiations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log        ENABLE ROW LEVEL SECURITY;

CREATE POLICY "people_policy"          ON people          FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "loans_policy"           ON loans           FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "installments_policy"    ON installments    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "payments_policy"        ON payments        FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "renegotiations_policy"  ON renegotiations  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "settings_policy"        ON settings        FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "audit_log_select"       ON audit_log       FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- VIEW: v_installments
-- Fonte única de verdade para Parcelas, Inadimplência, detalhe do
-- Empréstimo e Dashboard. Calcula pago/saldo/status/valor atualizado
-- (multa fixa + juros de mora ao dia sobre o saldo, quando atrasado).
-- Ignora parcelas canceladas por renegociação.
-- =====================================================
CREATE OR REPLACE VIEW v_installments WITH (security_invoker = true) AS
WITH paid AS (
  SELECT installment_id, SUM(amount) AS paid_amount
  FROM payments
  GROUP BY installment_id
)
SELECT
  i.id,
  i.loan_id,
  i.user_id,
  l.person_id,
  p.name AS person_name,
  p.phone AS person_phone,
  i.sequence,
  i.due_date,
  i.principal_amount,
  i.interest_amount,
  i.amount,
  COALESCE(pd.paid_amount, 0) AS amount_paid,
  GREATEST(i.amount - COALESCE(pd.paid_amount, 0), 0) AS remaining_amount,
  CASE
    WHEN COALESCE(pd.paid_amount, 0) >= i.amount THEN 0
    WHEN i.due_date < CURRENT_DATE THEN
      ROUND(
        GREATEST(i.amount - COALESCE(pd.paid_amount, 0), 0)
          * (COALESCE(s.late_fee_percent, 2) / 100
             + COALESCE(s.daily_interest_percent, 0.10) / 100 * (CURRENT_DATE - i.due_date)),
        2
      )
    ELSE 0
  END AS penalty_amount,
  CASE
    WHEN i.due_date < CURRENT_DATE AND COALESCE(pd.paid_amount, 0) < i.amount THEN (CURRENT_DATE - i.due_date)
    ELSE 0
  END AS late_days,
  GREATEST(i.amount - COALESCE(pd.paid_amount, 0), 0)
    + CASE
        WHEN COALESCE(pd.paid_amount, 0) >= i.amount THEN 0
        WHEN i.due_date < CURRENT_DATE THEN
          ROUND(
            GREATEST(i.amount - COALESCE(pd.paid_amount, 0), 0)
              * (COALESCE(s.late_fee_percent, 2) / 100
                 + COALESCE(s.daily_interest_percent, 0.10) / 100 * (CURRENT_DATE - i.due_date)),
            2
          )
        ELSE 0
      END AS updated_amount,
  CASE
    WHEN COALESCE(pd.paid_amount, 0) >= i.amount THEN 'pago'
    WHEN i.due_date < CURRENT_DATE THEN 'atrasado'
    ELSE 'pendente'
  END AS status
FROM installments i
JOIN loans l ON l.id = i.loan_id
JOIN people p ON p.id = l.person_id
LEFT JOIN settings s ON s.user_id = i.user_id
LEFT JOIN paid pd ON pd.installment_id = i.id
WHERE i.cancelled_at IS NULL;

-- =====================================================
-- RPCs
-- =====================================================

-- Cria o empréstimo e gera as N parcelas iguais (juros simples sobre o
-- principal, distribuído entre as parcelas). A última parcela absorve o
-- arredondamento de centavos, garantindo soma exata. Usada tanto na
-- criação normal quanto pela renegociação.
CREATE OR REPLACE FUNCTION fn_create_loan(
  p_person_id UUID,
  p_principal_amount NUMERIC,
  p_interest_rate NUMERIC,
  p_installments_count INT,
  p_first_due_date DATE,
  p_installment_frequency TEXT DEFAULT 'mensal'
) RETURNS loans
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  v_loan loans%ROWTYPE;
  v_total NUMERIC;
  v_installment_amount NUMERIC;
  v_principal_share NUMERIC;
  v_interest_share NUMERIC;
  v_due DATE;
  i INT;
BEGIN
  IF p_installments_count < 1 THEN
    RAISE EXCEPTION 'Número de parcelas deve ser maior que zero';
  END IF;

  v_total := ROUND(p_principal_amount * (1 + (p_interest_rate / 100) * p_installments_count), 2);
  v_installment_amount := ROUND(v_total / p_installments_count, 2);
  v_principal_share := ROUND(p_principal_amount / p_installments_count, 2);
  v_interest_share := v_installment_amount - v_principal_share;

  INSERT INTO loans (
    user_id, person_id, principal_amount, interest_rate, installments_count,
    installment_frequency, first_due_date, total_amount, status
  ) VALUES (
    auth.uid(), p_person_id, p_principal_amount, p_interest_rate, p_installments_count,
    p_installment_frequency, p_first_due_date, v_total, 'ativo'
  ) RETURNING * INTO v_loan;

  v_due := p_first_due_date;
  FOR i IN 1..p_installments_count LOOP
    INSERT INTO installments (loan_id, user_id, sequence, due_date, principal_amount, interest_amount, amount)
    VALUES (
      v_loan.id,
      auth.uid(),
      i,
      v_due,
      CASE WHEN i = p_installments_count
        THEN p_principal_amount - v_principal_share * (p_installments_count - 1)
        ELSE v_principal_share END,
      CASE WHEN i = p_installments_count
        THEN (v_total - v_installment_amount * (p_installments_count - 1))
             - (p_principal_amount - v_principal_share * (p_installments_count - 1))
        ELSE v_interest_share END,
      CASE WHEN i = p_installments_count
        THEN v_total - v_installment_amount * (p_installments_count - 1)
        ELSE v_installment_amount END
    );

    v_due := CASE p_installment_frequency
      WHEN 'semanal' THEN (v_due + INTERVAL '7 days')::DATE
      WHEN 'quinzenal' THEN (v_due + INTERVAL '14 days')::DATE
      ELSE (v_due + INTERVAL '1 month')::DATE
    END;
  END LOOP;

  RETURN v_loan;
END;
$$;

-- Registra um pagamento (total ou parcial) numa parcela. Valida que o
-- valor não excede o saldo atualizado da parcela e, se essa era a
-- última parcela em aberto do empréstimo, marca o empréstimo como quitado.
CREATE OR REPLACE FUNCTION fn_register_payment(
  p_installment_id UUID,
  p_amount NUMERIC,
  p_payment_date DATE DEFAULT CURRENT_DATE,
  p_notes TEXT DEFAULT ''
) RETURNS payments
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  v_installment installments%ROWTYPE;
  v_updated NUMERIC;
  v_payment payments%ROWTYPE;
BEGIN
  SELECT * INTO v_installment FROM installments
  WHERE id = p_installment_id AND user_id = auth.uid() AND cancelled_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parcela não encontrada';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Valor do pagamento deve ser maior que zero';
  END IF;

  SELECT updated_amount INTO v_updated FROM v_installments WHERE id = p_installment_id;
  IF p_amount > v_updated + 0.01 THEN
    RAISE EXCEPTION 'Valor informado (%) é maior que o valor atualizado da parcela (%)', p_amount, v_updated;
  END IF;

  INSERT INTO payments (installment_id, loan_id, user_id, amount, payment_date, notes)
  VALUES (p_installment_id, v_installment.loan_id, auth.uid(), p_amount, p_payment_date, p_notes)
  RETURNING * INTO v_payment;

  UPDATE loans SET status = 'quitado'
  WHERE id = v_installment.loan_id
    AND status = 'ativo'
    AND NOT EXISTS (
      SELECT 1 FROM v_installments vi WHERE vi.loan_id = v_installment.loan_id AND vi.status <> 'pago'
    );

  RETURN v_payment;
END;
$$;

-- Renegocia um empréstimo: soma o saldo atualizado das parcelas em
-- aberto, cancela essas parcelas (preservando o histórico, não
-- deletando), marca o empréstimo original como 'renegociado' e cria um
-- novo empréstimo com esse saldo como principal.
CREATE OR REPLACE FUNCTION fn_renegotiate_loan(
  p_loan_id UUID,
  p_new_installments_count INT,
  p_new_first_due_date DATE,
  p_new_interest_rate NUMERIC,
  p_reason TEXT DEFAULT '',
  p_new_installment_frequency TEXT DEFAULT 'mensal'
) RETURNS loans
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  v_person_id UUID;
  v_outstanding NUMERIC;
  v_new_loan loans%ROWTYPE;
BEGIN
  SELECT person_id INTO v_person_id FROM loans WHERE id = p_loan_id AND user_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Empréstimo não encontrado';
  END IF;

  SELECT COALESCE(SUM(updated_amount), 0) INTO v_outstanding
  FROM v_installments WHERE loan_id = p_loan_id AND status <> 'pago';

  IF v_outstanding <= 0 THEN
    RAISE EXCEPTION 'Este empréstimo não possui saldo em aberto para renegociar';
  END IF;

  UPDATE installments SET cancelled_at = NOW()
  WHERE loan_id = p_loan_id
    AND cancelled_at IS NULL
    AND id IN (SELECT id FROM v_installments WHERE loan_id = p_loan_id AND status <> 'pago');

  UPDATE loans SET status = 'renegociado' WHERE id = p_loan_id;

  v_new_loan := fn_create_loan(
    v_person_id, v_outstanding, p_new_interest_rate, p_new_installments_count,
    p_new_first_due_date, p_new_installment_frequency
  );

  INSERT INTO renegotiations (user_id, original_loan_id, new_loan_id, reason)
  VALUES (auth.uid(), p_loan_id, v_new_loan.id, p_reason);

  RETURN v_new_loan;
END;
$$;

-- Números do Dashboard: quanto emprestou, recebeu, tem a receber, juros
-- recebidos/a receber, valores em atraso, empréstimos ativos e parcelas
-- vencendo nos próximos 7 dias.
CREATE OR REPLACE FUNCTION fn_dashboard_summary()
RETURNS TABLE (
  total_emprestado    NUMERIC,
  total_recebido       NUMERIC,
  total_a_receber       NUMERIC,
  juros_recebidos       NUMERIC,
  juros_a_receber       NUMERIC,
  valores_em_atraso     NUMERIC,
  emprestimos_ativos    BIGINT,
  proximos_vencimentos  BIGINT
)
LANGUAGE sql SECURITY INVOKER AS $$
  SELECT
    COALESCE((SELECT SUM(principal_amount) FROM loans WHERE user_id = auth.uid()), 0) AS total_emprestado,
    COALESCE((SELECT SUM(amount) FROM payments WHERE user_id = auth.uid()), 0) AS total_recebido,
    COALESCE((SELECT SUM(remaining_amount) FROM v_installments WHERE user_id = auth.uid() AND status <> 'pago'), 0) AS total_a_receber,
    COALESCE((
      SELECT SUM(pay.amount * (i.interest_amount / NULLIF(i.amount, 0)))
      FROM payments pay JOIN installments i ON i.id = pay.installment_id
      WHERE pay.user_id = auth.uid()
    ), 0) AS juros_recebidos,
    COALESCE((
      SELECT SUM(vi.remaining_amount * (vi.interest_amount / NULLIF(vi.amount, 0)))
      FROM v_installments vi WHERE vi.user_id = auth.uid() AND vi.status <> 'pago'
    ), 0) AS juros_a_receber,
    COALESCE((SELECT SUM(updated_amount) FROM v_installments WHERE user_id = auth.uid() AND status = 'atrasado'), 0) AS valores_em_atraso,
    COALESCE((SELECT COUNT(*) FROM loans WHERE user_id = auth.uid() AND status = 'ativo'), 0) AS emprestimos_ativos,
    COALESCE((
      SELECT COUNT(*) FROM v_installments
      WHERE user_id = auth.uid() AND status = 'pendente'
        AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
    ), 0) AS proximos_vencimentos;
$$;

-- Juros efetivamente recebidos por mês (rateio proporcional de cada
-- pagamento entre principal e juros da parcela), para o gráfico do
-- dashboard.
CREATE OR REPLACE FUNCTION fn_interest_by_month(p_months_back INT DEFAULT 6)
RETURNS TABLE (month DATE, juros NUMERIC)
LANGUAGE sql SECURITY INVOKER AS $$
  SELECT DATE_TRUNC('month', pay.payment_date)::DATE AS month,
    SUM(pay.amount * (i.interest_amount / NULLIF(i.amount, 0))) AS juros
  FROM payments pay
  JOIN installments i ON i.id = pay.installment_id
  WHERE pay.user_id = auth.uid()
    AND pay.payment_date >= (DATE_TRUNC('month', CURRENT_DATE) - (p_months_back - 1) * INTERVAL '1 month')::DATE
  GROUP BY DATE_TRUNC('month', pay.payment_date)
  ORDER BY month;
$$;

-- =====================================================
-- FIM DO SCHEMA
-- Próximo passo: Authentication -> Users -> Add user (crie o único
-- usuário do sistema manualmente aqui, com o e-mail e senha que serão
-- usados no login). Isso dispara o trigger de seed dos parâmetros de
-- cobrança padrão (multa 2% + juros de mora 0,10% ao dia).
-- =====================================================
