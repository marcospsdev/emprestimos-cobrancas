-- =====================================================
-- Migração: título do empréstimo opcional
-- Execute no SQL Editor do Supabase (pode rodar mais de uma vez).
-- Não apaga dados.
-- =====================================================
ALTER TABLE loans ALTER COLUMN title DROP NOT NULL;
ALTER TABLE loans DROP CONSTRAINT IF EXISTS loans_title_check;
ALTER TABLE loans ADD CONSTRAINT loans_title_check CHECK (title IS NULL OR length(trim(title)) > 0);
