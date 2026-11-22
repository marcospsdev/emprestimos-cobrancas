-- =====================================================
-- Migração: pagamento só dos juros
-- No vencimento o cliente pode (1) pagar tudo e quitar, ou (2) pagar só os
-- juros: o empréstimo continua igual e o vencimento vai para o mês seguinte.
-- Cada pagamento de juros fica registrado aqui (conta como recebido e lucro
-- no mês em que vencia). Não apaga dados. Pode rodar mais de uma vez.
-- =====================================================
CREATE TABLE IF NOT EXISTS loan_payments (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  loan_id        UUID REFERENCES loans(id) ON DELETE CASCADE NOT NULL,
  kind           TEXT NOT NULL DEFAULT 'juros' CHECK (kind IN ('juros')),
  amount         DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  -- Vencimento que este pagamento cobriu (o mês em que ele aparece no resumo).
  due_date       DATE NOT NULL,
  paid_at        DATE NOT NULL,
  payment_method TEXT,
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
LANGUAGE plpgsql SECURITY INVOKER AS $$
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
$$;

-- Desfaz o último pagamento de juros: apaga o registro e devolve o vencimento.
CREATE OR REPLACE FUNCTION fn_undo_interest(p_payment_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY INVOKER AS $$
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
$$;
