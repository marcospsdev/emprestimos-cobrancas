-- =====================================================
-- Migração: tela de Armazenamento
-- fn_storage_usage: tamanho REAL do banco e de cada tabela do app (em bytes),
-- para mostrar "X MB de 500 MB" sem precisar abrir o painel do Supabase.
-- Também libera o usuário a apagar os próprios avisos antigos (limpeza).
-- Não apaga dados. Pode rodar mais de uma vez.
-- =====================================================
CREATE OR REPLACE FUNCTION fn_storage_usage() RETURNS JSON
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT json_build_object(
    'database_bytes', pg_database_size(current_database()),
    'tables', (
      SELECT json_agg(json_build_object('table', t, 'bytes', pg_total_relation_size(format('public.%I', t)::regclass)))
      FROM unnest(ARRAY['people', 'loans', 'loan_payments', 'push_devices', 'notification_log']) AS t
      WHERE to_regclass(format('public.%I', t)) IS NOT NULL
    )
  );
$$;

REVOKE ALL ON FUNCTION fn_storage_usage() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION fn_storage_usage() TO authenticated;

DROP POLICY IF EXISTS "notification_log_delete" ON notification_log;
CREATE POLICY "notification_log_delete" ON notification_log FOR DELETE USING (auth.uid() = user_id);
