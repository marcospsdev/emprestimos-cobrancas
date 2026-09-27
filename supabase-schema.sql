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
  title              TEXT NOT NULL CHECK (length(trim(title)) > 0),
  description        TEXT,
  amount_lent        DECIMAL(12,2) NOT NULL CHECK (amount_lent > 0),
  amount_to_receive  DECIMAL(12,2) NOT NULL CHECK (amount_to_receive > 0),
  loan_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date           DATE NOT NULL,
  paid_at            DATE,
  payment_method     TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW() NOT NULL
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
-- FIM DO SCHEMA
-- Se ainda não existir, crie o usuário do sistema em
-- Authentication -> Users -> Add user (e-mail + senha).
-- =====================================================
