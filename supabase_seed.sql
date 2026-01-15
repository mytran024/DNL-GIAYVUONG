-- 1. SEED USERS (Mật khẩu mặc định: 1)
INSERT INTO public.users (id, username, password, name, role, "isActive", department, "createdAt") VALUES
('u-admin', 'admin', '1', 'Admin User', 'ADMIN', true, 'Kho', NOW()),
('u-cs1', 'cs', '1', 'Nguyễn Thị CS', 'CS', true, 'Kho', NOW()),
('u-kv1', 'kv1', '1', 'Trần Văn Kiểm', 'INSPECTOR', true, 'Kho', NOW()),
('u-kv2', 'kv2', '1', 'Lê Văn Soát', 'INSPECTOR', true, 'Kho', NOW())
ON CONFLICT (id) DO NOTHING;

-- 2. SEED WORKERS
INSERT INTO public.workers (id, name, "phoneNumber", department) VALUES
('w1', 'Nguyễn Văn Nam', '0905111222', 'Kho'),
('w2', 'Trần Văn Hùng', '0905333444', 'Kho'),
('w3', 'Lê Văn Tùng', '0905555666', 'Kho'),
('w4', 'Phạm Văn Tú', '0905777888', 'Kho'),
('w5', 'Đỗ Văn Minh', '0905999000', 'Kho')
ON CONFLICT (id) DO NOTHING;

-- 3. SEED TEAMS
INSERT INTO public.teams (id, name, "phoneNumber", department) VALUES
('t1', 'Nguyễn Văn Tám', '0905123123', 'Kho'),
('t2', 'Lê Văn Chín', '0905456456', 'Kho'),
('t3', 'Trần Văn Mười', '0905789789', 'Kho'),
('t4', 'Phạm Văn Tý', '0905000111', 'Kho')
ON CONFLICT (id) DO NOTHING;

-- 4. SEED VESSELS
INSERT INTO public.vessels (id, "vesselName", "voyageNo", eta, consignee, "totalContainers", "totalPkgs", "totalWeight") VALUES
('v1', 'TÀU S30', 'V2026-05', '05/01/2026', 'EASY SUCCUESS SHIPPING PTE LTD', 15, 240, 432),
('v2', 'WAN HAI 302', 'N112', '10/01/2026', 'SHINING LOGISTICS', 10, 160, 300),
('v3', 'GLORY OCEAN', '2403N', '15/01/2026', 'DA NANG PORT LOGISTICS (DPL)', 8, 128, 230)
ON CONFLICT (id) DO NOTHING;

-- 5. SEED CONTAINERS
INSERT INTO public.containers (id, "vesselId", "containerNo", size, pkgs, weight, "sealNo", vendor, "tkNhaVC", "tkDnlOla", "detExpiry") VALUES
-- Vessel 1
('c1', 'v1', 'GESU6721400', '40HC', 16, 28.8, 'H/25.0462426', 'SME', '500592570963', '500592633150', '07/01/2026'),
('c2', 'v1', 'MEDU8466699', '40HC', 16, 28.8, 'H/25.0462427', 'SME', '500592570964', '', '07/01/2026'),
('c3', 'v1', 'MSMU4755070', '40HC', 16, 28.8, 'H/25.0462430', 'SME', '500592570967', '500592633150', '07/01/2026'),
('c4', 'v1', 'TXGU5463840', '40HC', 16, 28.8, 'H/25.0462432', 'SME', '', '', '07/01/2026'),
-- Vessel 2
('c101', 'v2', 'WHLU5723261', '40HC', 16, 28.8, 'H/25.0462434', 'HDC', '500592570971', '500592633150', '17/01/2026'),
-- Vessel 3
('c201', 'v3', '29D012.45/29R019.42', 'XE THỚT', 16, 26.5, 'H/25.999001', 'Vận tải Thăng Long', '500592571001', '500592634001', '20/01/2026'),
('c202', 'v3', '43C123.45/43R001.23', 'XE THỚT', 16, 27.2, 'H/25.999002', 'Vận tải Đà Nẵng', '500592571002', '500592634002', '20/01/2026'),
('c203', 'v3', '15C555.55/15R666.66', 'XE THỚT', 16, 25.8, 'H/25.999003', 'Vận tải Hải Phòng', '500592571003', '500592634003', '20/01/2026'),
('c204', 'v3', '51D888.12/51R888.34', 'XE THỚT', 16, 28.0, 'H/25.999004', 'Sài Gòn Trans', '500592571004', '', '20/01/2026')
ON CONFLICT (id) DO NOTHING;
