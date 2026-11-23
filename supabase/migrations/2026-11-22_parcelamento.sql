-- =====================================================
-- Migração: empréstimo parcelado
-- O total (emprestado + juros, normalmente sem juros) é dividido em N parcelas
-- mensais. Cada parcela paga fica registrada em loan_payments (kind 'parcela')
-- e o vencimento vai para o mês seguinte. A última parcela quita o empréstimo
-- (paid_at), como no "pagou tudo". Não apaga dados. Pode rodar mais de uma vez.
-- =====================================================

-- 1 = de uma vez (todos os empréstimos que já existem continuam assim).
ALTER TABLE loans ADD COLUMN IF NOT EXISTS installments INT NOT NULL DEFAULT 1;
-- Quantas parcelas já foram pagas (sem contar a que quita).
ALTER TABLE loans ADD COLUMN IF NOT EXISTS installments_paid INT NOT NULL DEFAULT 0;

ALTER TABLE loans DROP CONSTRAINT IF EXISTS loans_installments_check;
ALTER TABLE loans ADD CONSTRAINT loans_installments_check
  CHECK (installments BETWEEN 1 AND 120 AND installments_paid >= 0 AND installments_paid < installments);

-- Pagamentos: agora também parcelas, com o número da parcela.
ALTER TABLE loan_payments DROP CONSTRAINT IF EXISTS loan_payments_kind_check;
ALTER TABLE loan_payments ADD CONSTRAINT loan_payments_kind_check CHECK (kind IN ('juros', 'parcela'));
ALTER TABLE loan_payments ADD COLUMN IF NOT EXISTS installment_number INT;

-- Registra uma parcela (que não seja a última) e leva o vencimento para
-- p_next_due, tudo junto. A última parcela é registrada quitando o empréstimo.
CREATE OR REPLACE FUNCTION fn_pay_installment(
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
  IF v_loan.installments <= 1 THEN RAISE EXCEPTION 'Este empréstimo não é parcelado.'; END IF;
  IF v_loan.installments_paid >= v_loan.installments - 1 THEN
    RAISE EXCEPTION 'Esta é a última parcela: registre como "pagou tudo".';
  END IF;
  IF p_next_due <= v_loan.due_date THEN RAISE EXCEPTION 'O próximo vencimento precisa ser depois do atual.'; END IF;

  INSERT INTO loan_payments (loan_id, kind, amount, due_date, paid_at, payment_method, installment_number)
  VALUES (
    p_loan_id, 'parcela', round(v_loan.amount_to_receive / v_loan.installments, 2), v_loan.due_date, p_paid_at,
    NULLIF(trim(p_payment_method), ''), v_loan.installments_paid + 1
  )
  RETURNING * INTO v_payment;

  UPDATE loans SET due_date = p_next_due, installments_paid = installments_paid + 1 WHERE id = p_loan_id;
  RETURN v_payment;
END;
$$;

-- Desfaz o último pagamento (juros ou parcela): apaga o registro e devolve o
-- vencimento (e, se for parcela, a contagem de parcelas pagas).
CREATE OR REPLACE FUNCTION fn_undo_interest(p_payment_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  v_payment loan_payments;
BEGIN
  SELECT * INTO v_payment FROM loan_payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pagamento não encontrado.'; END IF;
  IF EXISTS (SELECT 1 FROM loan_payments WHERE loan_id = v_payment.loan_id AND due_date > v_payment.due_date) THEN
    RAISE EXCEPTION 'Só dá para desfazer o pagamento mais recente deste empréstimo.';
  END IF;
  IF EXISTS (SELECT 1 FROM loans WHERE id = v_payment.loan_id AND paid_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Este empréstimo já foi quitado. Desmarque a quitação antes.';
  END IF;

  DELETE FROM loan_payments WHERE id = p_payment_id;
  UPDATE loans
     SET due_date = v_payment.due_date,
         installments_paid = CASE WHEN v_payment.kind = 'parcela' THEN GREATEST(installments_paid - 1, 0) ELSE installments_paid END
   WHERE id = v_payment.loan_id;
END;
$$;
