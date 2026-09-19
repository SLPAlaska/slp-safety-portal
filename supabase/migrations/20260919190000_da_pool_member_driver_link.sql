-- Link a pool member to the driver record they are.
--
-- Without this the same human exists twice: once in da_drivers, queried
-- annually against the Clearinghouse, and once in da_pool_members, drawn for
-- random tests. Two disconnected rows means a driver can leave the roster in
-- one place and stay in the other, and the person selected for a random test
-- cannot be tied to the person whose CDL and consent we hold.
--
-- Nullable on purpose. A pool member is not necessarily a CDL driver at all -
-- a non-DOT pool is mostly shop hands - so the link exists where it is true
-- and is absent where it is not, rather than forcing a driver record into
-- existence for everyone in a pool.
alter table public.da_pool_members
  add column if not exists driver_id uuid references public.da_drivers(id) on delete set null;

create index if not exists da_pool_members_driver_idx
  on public.da_pool_members (driver_id) where driver_id is not null;

-- One pool membership per driver per pool. Loading a roster twice should
-- collide rather than double someone's chance of being drawn.
create unique index if not exists da_pool_members_pool_driver_uidx
  on public.da_pool_members (pool_id, driver_id) where driver_id is not null;

comment on column public.da_pool_members.driver_id is
  'The da_drivers record this pool member is, where they are a CDL driver. '
  'Nullable: non-DOT pool members often have no driver record.';
