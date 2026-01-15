
export enum Shift {
  SHIFT_1 = '1',
  SHIFT_2 = '2',
  SHIFT_3 = '3',
  SHIFT_4 = '4'
}

export interface Container {
  id: string;
  contNo: string;
  size: string;
  expectedUnits: number;
  expectedWeight: number;
  owner: string;
  sealNo: string;
  tkHouse?: string;      // Số TK Nhà VC
  tkHouseDate?: string;  // Ngày TK Nhà VC
  tkDnl?: string;        // Số TK DNL
  tkDnlDate?: string;    // Ngày TK DNL
  vendor?: string;
  detLimit?: string;     // Hạn DET
}

export interface TallyItem {
  contId: string;
  contNo: string;
  commodityType: string;
  sealNo: string;
  actualUnits: number;
  actualWeight: number;
  isScratchedFloor: boolean;
  tornUnits: number;
  notes: string;
}

export interface TallyReport {
  id: string;
  vesselId: string;
  mode: 'NHAP' | 'XUAT';
  shift: Shift;
  workDate: string;
  owner: string;
  workerCount: number;
  workerNames: string;
  mechanicalCount: number;
  mechanicalNames: string;
  equipment: string;
  vehicleNo: string;
  shipNo?: string; // Số hiệu tàu (custom input)
  vehicleType: string;
  items: TallyItem[];
  createdAt: number;
  createdBy?: string;
  isHoliday?: boolean;
  isWeekend?: boolean;
  status: 'NHAP' | 'CHUA_DUYET' | 'DA_DUYET';
}

export interface WorkOrder {
  id: string;
  reportId: string;
  type: 'CONG_NHAN' | 'CO_GIOI';
  organization: string;
  personCount: number;
  vehicleType: string;
  vehicleNo: string;
  handlingMethod: string;
  commodityType: string;
  specification: string;
  quantity: number;
  weight: number;
  dayLaborerCount: number;
  note: string;
  status: 'NHAP' | 'HOAN_TAT';
}

export interface Vessel {
  id: string;
  name: string;
  voyage: string;
  eta: string;
  customerName: string; // Tên khách hàng từ CS
  totalConts: number;
  totalUnitsExpected: number;
  totalWeightExpected: number;
}
