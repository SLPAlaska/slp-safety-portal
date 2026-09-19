-- Let the CDL functions see pgcrypto.
--
-- On Supabase, pgcrypto installs into the `extensions` schema, not `public`.
-- The encrypt/decrypt functions pin search_path to public, vault - which is
-- right, a security definer function must not resolve names against a
-- caller-controlled path - but that pinning also hid pgp_sym_encrypt and the
-- call failed with 42883. `extensions` is added explicitly rather than by
-- widening the path.
create or replace function public.da_encrypt_cdl(p_cdl text)
returns bytea language plpgsql security definer
set search_path = public, extensions, vault as $$
declare k text;
begin
  if p_cdl is null or btrim(p_cdl) = '' then return null; end if;
  select decrypted_secret into k from vault.decrypted_secrets where name = 'da_cdl_key';
  if k is null then
    raise exception 'vault secret da_cdl_key is not set; refusing to store a CDL number in clear';
  end if;
  return pgp_sym_encrypt(btrim(p_cdl), k);
end $$;

create or replace function public.da_decrypt_cdl(p_enc bytea)
returns text language plpgsql security definer
set search_path = public, extensions, vault as $$
declare k text;
begin
  if p_enc is null then return null; end if;
  select decrypted_secret into k from vault.decrypted_secrets where name = 'da_cdl_key';
  if k is null then return null; end if;
  return pgp_sym_decrypt(p_enc, k);
end $$;

revoke all on function public.da_encrypt_cdl(text)  from public, anon, authenticated;
revoke all on function public.da_decrypt_cdl(bytea) from public, anon, authenticated;
grant execute on function public.da_encrypt_cdl(text)  to service_role;
grant execute on function public.da_decrypt_cdl(bytea) to service_role;

notify pgrst, 'reload schema';
