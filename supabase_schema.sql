-- Enable UUID extension if needed (though we use string IDs from frontend usually)
-- create extension if not exists "uuid-ossp";

-- 1. USERS
create table public.users (
  id text primary key,
  username text unique not null,
  password text not null,
  name text not null,
  role text not null,
  "isActive" boolean default true,
  "phoneNumber" text,
  department text default 'Kho',
  "createdAt" text
);

-- 2. WORKERS
create table public.workers (
  id text primary key,
  name text not null,
  "phoneNumber" text,
  department text default 'Kho'
);

-- 3. TEAMS
create table public.teams (
  id text primary key,
  name text not null,
  "phoneNumber" text,
  department text default 'Kho'
);

-- 4. VESSELS
create table public.vessels (
  id text primary key,
  "vesselName" text not null,
  "voyageNo" text,
  commodity text,
  consignee text,
  "totalContainers" integer default 0,
  "totalPkgs" integer default 0,
  "totalWeight" float default 0,
  eta text
);

-- 5. CONTAINERS
create table public.containers (
  id text primary key,
  "vesselId" text references public.vessels(id),
  "unitType" text,
  "containerNo" text,
  size text,
  "sealNo" text,
  consignee text,
  carrier text,
  pkgs integer,
  weight float,
  "billNo" text,
  vendor text,
  "detExpiry" text,
  "tkNhaVC" text,
  "ngayTkNhaVC" text,
  "tkDnlOla" text,
  "ngayTkDnl" text,
  "ngayKeHoach" text,
  "noiHaRong" text,
  "workerNames" jsonb default '[]'::jsonb, -- Using JSONB for arrays
  status text default 'PENDING',
  "updatedAt" text,
  "tallyApproved" boolean default false,
  "workOrderApproved" boolean default false,
  remarks text,
  "lastUrgedAt" text
);

-- 6. TALLY REPORTS
create table public.tally_reports (
  id text primary key,
  "vesselId" text, -- Loose reference or FK? Keeping loose to match SQLite flexibility if needed, but FK is better. Let's keep loose for safety.
  mode text,
  shift text,
  "workDate" text,
  owner text,
  consignee text,
  "workerCount" integer,
  "workerNames" text, -- Keeping as text/string from SQLite? Or JSON? SQLite had TEXT. Code might expect string.
  "mechanicalCount" integer,
  "mechanicalNames" text,
  equipment text,
  "vehicleNo" text,
  "shipNo" text,
  "vehicleType" text,
  items jsonb,
  "createdAt" bigint, -- SQLite had INTEGER for Date.now()
  "createdBy" text,
  "isHoliday" boolean default false,
  "isWeekend" boolean default false,
  status text default 'NHAP'
);

-- 7. WORK ORDERS
create table public.work_orders (
  id text primary key,
  type text,
  "containerIds" jsonb,
  "containerNos" jsonb,
  "vesselId" text,
  "teamName" text,
  "workerNames" jsonb,
  "peopleCount" integer,
  "vehicleType" text,
  "vehicleNos" jsonb,
  shift text,
  date text,
  items jsonb,
  status text,
  "isHoliday" boolean,
  "isWeekend" boolean,
  "createdBy" text,
  "tallyId" text
);

-- ROW LEVEL SECURITY (Optional - Disable for simple API usage with Service Role or keep public for Anon)
-- For this migration, we will keep RLS off or allow all for simplicy as Auth is handled by App logic, not Supabase Auth.
alter table public.users enable row level security;
alter table public.workers enable row level security;
alter table public.teams enable row level security;
alter table public.vessels enable row level security;
alter table public.containers enable row level security;
alter table public.tally_reports enable row level security;
alter table public.work_orders enable row level security;

-- Allow everything for now (Simulating SQLite's open access)
create policy "Enable all for users" on public.users for all using (true);
create policy "Enable all for workers" on public.workers for all using (true);
create policy "Enable all for teams" on public.teams for all using (true);
create policy "Enable all for vessels" on public.vessels for all using (true);
create policy "Enable all for containers" on public.containers for all using (true);
create policy "Enable all for tally_reports" on public.tally_reports for all using (true);
create policy "Enable all for work_orders" on public.work_orders for all using (true);
