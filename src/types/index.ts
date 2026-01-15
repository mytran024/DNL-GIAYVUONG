
export enum UserRole {
  ADMIN = 'ADMIN',
  CS = 'CS',
  INSPECTOR = 'INSPECTOR'
}

export interface ResourceItem {
  id: string; // Unique ID (could use name if unique, but ID is safer)
  name: string;
  phoneNumber?: string;
  department: string; // Default 'Kho'
}

export interface User {
  id: string;
  username: string;
  password?: string; // Optional when displaying
  name: string;
  role: UserRole;
  isActive: boolean;
  phoneNumber?: string;
  department?: string; // Default 'Kho'
  createdAt: string;
}

export enum BusinessType {
  IMPORT = 'IMPORT',
  EXPORT = 'EXPORT'
}

export enum UnitType {
  CONTAINER = 'CONTAINER',
  VEHICLE = 'VEHICLE' // Xe thớt / Rơ-moóc
}

export enum ContainerStatus {
  PENDING = 'PENDING',
  READY = 'READY',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED'
}

export enum WorkOrderStatus {
  SUBMITTED = 'SUBMITTED', // Đang chờ duyệt
  APPROVED = 'APPROVED',  // Đã duyệt
  REJECTED = 'REJECTED'   // Từ chối
}

export enum WorkOrderType {
  LABOR = 'LABOR', // Tổ công nhân
  MECHANICAL = 'MECHANICAL' // Tổ cơ giới (Xe nâng/Hyster)
}

export interface DetentionConfig {
  urgentDays: number;
  warningDays: number;
}

export interface Vessel {
  id: string;
  vesselName: string;
  voyageNo: string;
  commodity: string;
  consignee: string; // Thêm trường chủ hàng
  totalContainers: number;
  totalPkgs: number;
  totalWeight: number;
  eta?: string; // Keep for internal date logic if needed
}

export interface Container {
  id: string;
  vesselId: string;
  unitType: UnitType; // Phân loại Cont hoặc Xe thớt
  containerNo: string; // Số Cont hoặc Biển số xe
  size: string;
  sealNo: string;
  consignee?: string; // Chủ hàng
  carrier: string;
  pkgs: number;
  weight: number;
  billNo: string;
  vendor: string;
  detExpiry: string;
  tkNhaVC?: string;
  ngayTkNhaVC?: string;
  tkDnlOla?: string;
  ngayTkDnl?: string;
  ngayKeHoach?: string; // Ngày bốc cont
  noiHaRong?: string;   // Nơi hạ rỗng
  status: ContainerStatus;
  updatedAt: string;
  tallyApproved?: boolean;
  workOrderApproved?: boolean;
  remarks?: string;
  workerNames?: string[]; // Danh sách nhân viên (Lấy từ Tally)
  lastUrgedAt?: string; // Thời điểm đôn đốc gần nhất
}

export interface WorkOrder {
  id: string;
  type: WorkOrderType;
  containerIds: string[]; // Danh sách ID các đơn vị (Cont/Xe)
  containerNos: string[]; // Danh sách số hiệu để hiển thị
  vesselId: string;
  teamName: string;
  workerNames: string[];
  peopleCount: number;
  vehicleType?: string;
  vehicleNos: string[]; // Danh sách biển số xe/thiết bị thực hiện
  shift: string;
  date: string;
  items: WorkOrderItem[];
  status: WorkOrderStatus;
  isHoliday?: boolean; // Đánh dấu ngày lễ
  isWeekend?: boolean; // Đánh dấu ngày cuối tuần
  createdBy?: string; // Người tạo (Kiểm viên)
  tallyId?: string; // ID phiếu Tally gốc
}

export interface WorkOrderItem {
  method: string;
  cargoType: string;
  specs: string;
  volume: string;
  weight: string;
  extraLabor: number;
  notes: string;
}

// Phương án bốc dỡ chuẩn Danalog
export const LABOR_METHODS = [
  "Bấm seal, đóng mở cửa cont, quấn phủ bạt",
  "Bấm seal, đóng mở cửa cont",
  "Bấm seal, đóng mở cửa cont, trải bạt",
  "Bấm seal",
  "Bấm seal, quấn phủ bạt",
  "Bấm seal, tăng đơ xếp bạt"
];

export const MECHANICAL_METHODS = [
  "Nâng hàng từ cont <-> kho",
  "Nâng hàng từ cont -> kho",
  "Nâng hàng từ kho -> cont"
];
