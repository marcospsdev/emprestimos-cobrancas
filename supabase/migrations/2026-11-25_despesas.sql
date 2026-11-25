-- =====================================================
-- Migração: módulo de Despesas (gastos do mês)
-- - expenses: cada gasto (pago ou a pagar), com categoria.
-- - fixed_expenses: contas fixas que se repetem todo mês (aluguel, luz...).
--   O app chama fn_generate_fixed_expenses ao abrir um mês e a conta do mês
--   é lançada sozinha em expenses (uma vez só por mês; se o usuário excluir
--   a do mês, ela não volta).
-- Base compartilhada como o resto do app: todo usuário logado vê e altera tudo.
-- NÃO APAGA NENHUM DADO. Pode rodar mais de uma vez.
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

-- -----------------------------------------------------
-- Tela de Armazenamento passa a contar as tabelas de despesas também.
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION fn_storage_usage() RETURNS JSON
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT json_build_object(
    'database_bytes', pg_database_size(current_database()),
    'tables', (
      SELECT json_agg(json_build_object('table', t, 'bytes', pg_total_relation_size(format('public.%I', t)::regclass)))
      FROM unnest(ARRAY['people', 'loans', 'loan_payments', 'expenses', 'fixed_expenses', 'push_devices', 'notification_log']) AS t
      WHERE to_regclass(format('public.%I', t)) IS NOT NULL
    )
  );
$$;

REVOKE ALL ON FUNCTION fn_storage_usage() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION fn_storage_usage() TO authenticated;
