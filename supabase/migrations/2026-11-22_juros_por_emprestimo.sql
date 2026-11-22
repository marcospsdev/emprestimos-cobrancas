-- =====================================================
-- Migração: porcentagem de juros por empréstimo
-- Execute no SQL Editor do Supabase (pode rodar mais de uma vez).
-- Não apaga dados.
-- =====================================================
ALTER TABLE loans
  ADD COLUMN IF NOT EXISTS interest_rate DECIMAL(6,2) NOT NULL DEFAULT 0 CHECK (interest_rate >= 0);

-- Empréstimos antigos: deduz a % a partir do que já estava cadastrado
-- (valor a receber ÷ valor emprestado − 1).
UPDATE loans
SET interest_rate = GREATEST(ROUND((amount_to_receive / amount_lent - 1) * 100, 2), 0)
WHERE interest_rate = 0 AND amount_to_receive > amount_lent;
