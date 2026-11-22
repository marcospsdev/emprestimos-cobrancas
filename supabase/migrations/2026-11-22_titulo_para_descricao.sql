-- =====================================================
-- Migração: o título do empréstimo deixou de existir no app.
-- Os títulos já cadastrados passam para o começo da descrição,
-- para nenhuma informação se perder. Pode rodar mais de uma vez.
-- (A coluna title continua no banco, vazia, por segurança.)
-- =====================================================
UPDATE loans
SET description = CASE
      WHEN description IS NULL OR trim(description) = '' THEN trim(title)
      ELSE trim(title) || E'\n' || description
    END,
    title = NULL
WHERE title IS NOT NULL AND trim(title) <> '';
