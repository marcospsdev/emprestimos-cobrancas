-- =====================================================
-- Migração: base de dados compartilhada entre todos os usuários
-- Antes: cada usuário só via o que ele mesmo cadastrou.
-- Agora: qualquer usuário logado vê e altera TODOS os clientes, empréstimos,
-- pagamentos e a chave Pix. user_id passa a ser só "quem cadastrou".
--
-- NÃO APAGA NENHUM DADO. Pode rodar mais de uma vez.
-- Proteção extra: excluir um usuário (ex.: admin) NÃO apaga mais os dados que
-- ele cadastrou (antes era ON DELETE CASCADE; agora o user_id só fica vazio).
-- Aparelhos dos avisos (push_devices) continuam sendo de cada usuário.
-- =====================================================

-- 1) Excluir usuário não leva os dados junto: FK de user_id vira ON DELETE SET NULL.
DO $$
DECLARE
  t TEXT;
  fk TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['people', 'loans', 'loan_payments', 'notification_log', 'user_settings'] LOOP
    FOR fk IN
      SELECT c.conname
      FROM pg_constraint c
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
      WHERE c.conrelid = format('public.%I', t)::regclass
        AND c.contype = 'f'
        AND a.attname = 'user_id'
    LOOP
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', t, fk);
    END LOOP;
  END LOOP;
END $$;

-- user_settings: a chave Pix passa a ser UMA só, do sistema (linha única, id = true).
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS id BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS user_settings_pkey;
ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS user_settings_single_row;
ALTER TABLE user_settings ADD CONSTRAINT user_settings_single_row CHECK (id);
-- Se por acaso houver mais de uma linha, mantém só a mais recente (é só a chave Pix).
DELETE FROM user_settings s
WHERE EXISTS (SELECT 1 FROM user_settings n WHERE n.updated_at > s.updated_at);
ALTER TABLE user_settings ADD CONSTRAINT user_settings_pkey PRIMARY KEY (id);

ALTER TABLE people           ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE loans            ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE loan_payments    ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE notification_log ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE user_settings    ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE people           ADD CONSTRAINT people_user_id_fkey           FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE loans            ADD CONSTRAINT loans_user_id_fkey            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE loan_payments    ADD CONSTRAINT loan_payments_user_id_fkey    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE notification_log ADD CONSTRAINT notification_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE user_settings    ADD CONSTRAINT user_settings_user_id_fkey    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2) Regras de acesso: qualquer usuário logado vê e altera tudo (anônimo continua sem acesso).
DROP POLICY IF EXISTS "people_policy" ON people;
CREATE POLICY "people_policy" ON people FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "loans_policy" ON loans;
CREATE POLICY "loans_policy" ON loans FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "loan_payments_policy" ON loan_payments;
CREATE POLICY "loan_payments_policy" ON loan_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "user_settings_policy" ON user_settings;
CREATE POLICY "user_settings_policy" ON user_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "notification_log_read" ON notification_log;
CREATE POLICY "notification_log_read" ON notification_log FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "notification_log_delete" ON notification_log;
CREATE POLICY "notification_log_delete" ON notification_log FOR DELETE TO authenticated USING (true);
