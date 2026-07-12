
REVOKE EXECUTE ON FUNCTION public.ensure_money_path(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_money_path(uuid) TO authenticated, service_role;
