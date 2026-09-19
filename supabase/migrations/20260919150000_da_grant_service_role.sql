-- Grant the CDL and key functions to service_role explicitly.
--
-- 20260919130000 and ...140000 revoked EXECUTE from PUBLIC to keep these away
-- from anon and authenticated. service_role was reaching them only through the
-- default PUBLIC grant, so revoking PUBLIC took it away too and the API saw a
-- 404. Naming service_role directly is what was meant: these functions are for
-- the server and nobody else.
grant execute on function public.da_encrypt_cdl(text)        to service_role;
grant execute on function public.da_decrypt_cdl(bytea)       to service_role;
grant execute on function public.da_store_cdl(uuid, text)    to service_role;
grant execute on function public.da_reveal_cdl(uuid)         to service_role;
grant execute on function public.da_set_cdl_key(text)        to service_role;

notify pgrst, 'reload schema';
