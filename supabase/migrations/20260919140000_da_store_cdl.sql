-- Store a CDL number encrypted, without it ever passing through a client.
--
-- The caller hands over the plaintext once; the function encrypts it with the
-- Vault key and writes both the ciphertext and the last four digits used for
-- display. Service role only: da_encrypt_cdl is not granted to anon or
-- authenticated, and neither is this.
create or replace function public.da_store_cdl(p_driver uuid, p_cdl text)
returns text language plpgsql security definer set search_path = public as $$
declare last4 text;
begin
  if p_cdl is null or btrim(p_cdl) = '' then return 'skipped'; end if;
  last4 := right(regexp_replace(btrim(p_cdl), '[^A-Za-z0-9]', '', 'g'), 4);
  update public.da_drivers
     set cdl_number_enc = public.da_encrypt_cdl(p_cdl),
         cdl_last4      = last4
   where id = p_driver;
  if not found then raise exception 'no driver %', p_driver; end if;
  return 'stored';
end $$;

revoke all on function public.da_store_cdl(uuid, text) from public, anon, authenticated;

-- Read one CDL back. Deliberately one row at a time and never a bulk select,
-- so a decrypted CDL cannot be swept into an export by accident. The API
-- decides who may call it: SLP staff and the client's DER only.
create or replace function public.da_reveal_cdl(p_driver uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v bytea;
begin
  select cdl_number_enc into v from public.da_drivers where id = p_driver;
  return public.da_decrypt_cdl(v);
end $$;

revoke all on function public.da_reveal_cdl(uuid) from public, anon, authenticated;
