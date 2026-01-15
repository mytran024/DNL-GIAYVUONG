-- DISABLE ROW LEVEL SECURITY (RLS)
-- Chạy script này để tắt bảo mật tạm thời, cho phép Server đọc/ghi dữ liệu thoải mái.

alter table public.users disable row level security;
alter table public.workers disable row level security;
alter table public.teams disable row level security;
alter table public.vessels disable row level security;
alter table public.containers disable row level security;
alter table public.tally_reports disable row level security;
alter table public.work_orders disable row level security;
