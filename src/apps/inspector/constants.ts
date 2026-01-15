import { Vessel, Shift, Container } from '../../types/inspector';

export type AppStep =
  | 'DANG_NHAP'
  | 'CHON_LOAI_TALLY'
  | 'CHON_TAU'
  | 'NHAP_TALLY'
  | 'DANH_SACH_TALLY'
  | 'DANH_SACH_WO'
  | 'HOAN_TAT';

export const MOCK_VESSELS: Vessel[] = [
  {
    id: 'v1',
    name: 'TÀU S30',
    voyage: 'V2026-05',
    eta: '05/01/2026',
    customerName: 'EASY SUCCUESS SHIPPING PTE LTD',
    totalConts: 15,
    totalUnitsExpected: 240,
    totalWeightExpected: 432
  },
  {
    id: 'v2',
    name: 'WAN HAI 302',
    voyage: 'N112',
    eta: '10/01/2026',
    customerName: 'SHINING LOGISTICS',
    totalConts: 10,
    totalUnitsExpected: 160,
    totalWeightExpected: 300
  },
  {
    id: 'v3',
    name: 'GLORY OCEAN',
    voyage: '2403N',
    eta: '15/01/2026',
    customerName: 'DA NANG PORT LOGISTICS (DPL)',
    totalConts: 8,
    totalUnitsExpected: 128,
    totalWeightExpected: 230
  }
];

export const MOCK_CONTAINERS: Record<string, Container[]> = {
  'v1': [
    { id: '1', contNo: 'GESU6721400', size: '40HC', expectedUnits: 16, expectedWeight: 28.8, owner: 'SME', sealNo: 'H/25.0462426', tkHouse: '500592570963', tkDnl: '500592633150', detLimit: '7/1/2026' },
    { id: '2', contNo: 'MEDU8466699', size: '40HC', expectedUnits: 16, expectedWeight: 28.8, owner: 'SME', sealNo: 'H/25.0462427', tkHouse: '500592570964', tkDnl: '', detLimit: '7/1/2026' }, // Chưa đủ TK DNL
    { id: '3', contNo: 'MSMU4755070', size: '40HC', expectedUnits: 16, expectedWeight: 28.8, owner: 'SME', sealNo: 'H/25.0462430', tkHouse: '500592570967', tkDnl: '500592633150', detLimit: '7/1/2026' },
    { id: '4', contNo: 'TXGU5463840', size: '40HC', expectedUnits: 16, expectedWeight: 28.8, owner: 'SME', sealNo: 'H/25.0462432', tkHouse: '', tkDnl: '', detLimit: '7/1/2026' }, // Chưa đủ cả 2
  ],
  'v2': [
    { id: '101', contNo: 'WHLU5723261', size: '40HC', expectedUnits: 16, expectedWeight: 28.8, owner: 'HDC', sealNo: 'H/25.0462434', tkHouse: '500592570971', tkDnl: '500592633150', detLimit: '17/01/2026' },
  ],
  'v3': [
    { id: '201', contNo: '29D012.45/29R019.42', size: 'XE THỚT', expectedUnits: 16, expectedWeight: 26.5, owner: 'DPL', sealNo: 'H/25.999001', tkHouse: '500592571001', tkDnl: '500592634001', detLimit: '20/01/2026', vendor: 'Vận tải Thăng Long' },
    { id: '202', contNo: '43C123.45/43R001.23', size: 'XE THỚT', expectedUnits: 16, expectedWeight: 27.2, owner: 'DPL', sealNo: 'H/25.999002', tkHouse: '500592571002', tkDnl: '500592634002', detLimit: '20/01/2026', vendor: 'Vận tải Đà Nẵng' },
    { id: '203', contNo: '15C555.55/15R666.66', size: 'XE THỚT', expectedUnits: 16, expectedWeight: 25.8, owner: 'DPL', sealNo: 'H/25.999003', tkHouse: '500592571003', tkDnl: '500592634003', detLimit: '20/01/2026', vendor: 'Vận tải Hải Phòng' },
    { id: '204', contNo: '51D888.12/51R888.34', size: 'XE THỚT', expectedUnits: 16, expectedWeight: 28.0, owner: 'DPL', sealNo: 'H/25.999004', tkHouse: '500592571004', tkDnl: '', detLimit: '20/01/2026', vendor: 'Sài Gòn Trans' }, // Chưa đủ TK DNL
  ]
};

export const SHIFT_OPTIONS = Object.values(Shift);
