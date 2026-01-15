import * as XLSX from 'xlsx';
import { Container, Vessel, ContainerStatus, DetentionConfig, UnitType } from '../../../types/index';

/**
 * Hàm chuẩn hóa ngày tháng về định dạng chuẩn quốc tế YYYY-MM-DD
 * Tối ưu tốc độ cho dữ liệu lớn.
 */
export const normalizeDate = (dateInput: string | number | undefined): string => {
  if (dateInput === undefined || dateInput === null || dateInput === '') return '';

  // 1. Check Excel Serial Number (Fastest Path for Excel data)
  if (typeof dateInput === 'number') {
    const utc_days = Math.floor(dateInput - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    return date_info.toISOString().substring(0, 10); // YYYY-MM-DD
  }

  const dateStr = dateInput.toString().trim();
  if (!dateStr) return '';

  // 2. Check "DD/MM/YYYY" (Common in Vietnam)
  if (dateStr.indexOf('/') !== -1) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      // Assume DD/MM/YYYY or DD/MM/YY
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      let y = parseInt(parts[2], 10);

      if (y < 100) y += 2000; // Handle 2-digit year

      // Simple pad
      const ms = m < 10 ? '0' + m : m;
      const ds = d < 10 ? '0' + d : d;
      return y + '-' + ms + '-' + ds;
    }
  }

  // 3. Check ISO "YYYY-MM-DD"
  if (dateStr.length === 10 && dateStr[4] === '-' && dateStr[7] === '-') {
    return dateStr;
  }

  // 4. Check Serial Number string "45200"
  if (/^\d{5,}$/.test(dateStr)) {
    const num = parseInt(dateStr, 10);
    return normalizeDate(num); // Recurse to number handler
  }

  // 5. Fallback to Date.parse (Slowest, covering text formats like "Jan 1, 2024")
  const timestamp = Date.parse(dateStr);
  if (!isNaN(timestamp)) {
    const d = new Date(timestamp);
    return d.toISOString().substring(0, 10);
  }

  return '';
};

/**
 * Hàm hiển thị ngày tháng sang chuẩn Việt Nam cho UI
 */
export const displayDate = (isoDate: string | undefined): string => {
  if (!isoDate) return '-';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  // Fix template literal issue by using string concatenation
  return parts[2] + '/' + parts[1] + '/' + parts[0];
};

export const generateTemplate = () => {
  const headers = [
    "STT", "Ngày Kế hoạch", "Số hiệu Cont/Xe", "Số Seal", "Số TK Nhà VC", "Ngày TK Nhà VC",
    "Số TK DNL", "Ngày TK DNL", "Số kiện", "Số tấn", "Vendor", "Hạn DET", "Nơi hạ rỗng"
  ];
  // Sample Row
  const data = [
    headers,
    ["1", "31/12/2025", "GESU6721400", "H/25.0462426", "500592570963", "01/01/2026", "500592633150", "02/01/2026", 16, 28.8, "DH/SME/SME", "07/01/2026", "TIEN SA"]
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, "Template_Import");
  XLSX.writeFile(wb, "Template_Import_Container.xlsx");
};

/**
 * Logic: Parse Excel & Merge Data
 * KEY xác định trùng lặp: ContainerNo + NgayKeHoach
 */
export const processImportData = (
  rawRows: any[], // Dữ liệu thô từ Excel (đã convert sang JSON)
  currentVesselId: string,
  existingContainers: Container[]
): { containers: Container[]; summary: { totalPkgs: number; totalWeight: number } } => {

  if (!Array.isArray(rawRows)) {
    console.error("rawRows is not an array");
    return { containers: [], summary: { totalPkgs: 0, totalWeight: 0 } };
  }
  if (!Array.isArray(existingContainers)) {
    console.error("existingContainers is not an array");
    return { containers: [], summary: { totalPkgs: 0, totalWeight: 0 } };
  }

  const containerMap = new Map<string, Container>();

  try {
    // 1. Load existing containers into Map using Key: "ContNo_Date"
    existingContainers.forEach(c => {
      // Safety check for null container in array
      if (!c) return;

      if (c.vesselId === currentVesselId) {
        // Fix template literal issue by using string concatenation
        const key = c.containerNo + '_' + c.ngayKeHoach;
        containerMap.set(key, c);
      }
    });

    const detectUnitType = (id: string): UnitType => {
      if (!id) return UnitType.VEHICLE; // Safety check
      const cleanId = id.toString().trim().toUpperCase();
      if (cleanId.includes('/')) return UnitType.VEHICLE;
      const containerPattern = /^[A-Z]{4}\d{7}$/;
      if (containerPattern.test(cleanId.replace(/[\s\.-]/g, ''))) return UnitType.CONTAINER;
      return UnitType.VEHICLE;
    };

    // Helper to find value case-insensitively and ignoring ALL whitespace/newlines
    const findVal = (rowObj: any, potentialKeys: string[]): any => {
      const keys = Object.keys(rowObj);
      const normalize = (k: string) => k.toLowerCase().replace(/[\s\r\n]+/g, '');

      for (const pk of potentialKeys) {
        const foundKey = keys.find(k => normalize(k) === normalize(pk));
        if (foundKey) return rowObj[foundKey];
      }
      return undefined;
    };

    rawRows.forEach((row: any, index: number) => {
      try {
        if (!row) return; // Skip null rows

        // DEBUG: Log first valid row to see keys
        if (index === 0) {
          console.log("DEBUG: First Row Keys:", Object.keys(row));
          console.log("DEBUG: First Row Data:", row);
        }

        // Flexible mapping
        const containerNo = (findVal(row, ['Số hiệu Cont/Xe', 'Số hiệu Cont', 'containerNo', 'Container Number', 'Số Cont']) || '').toString().trim();
        const planDateRaw = (findVal(row, ['Ngày Kế hoạch', 'ngayKeHoach', 'Plan Date', 'Ngày']) || '').toString().trim();

        // Safety normalization
        const planDate = normalizeDate(planDateRaw || new Date().toISOString());

        if (!containerNo || containerNo === 'undefined') return;

        // Fix template literal issue by using string concatenation
        const key = containerNo + '_' + planDate;
        const existing = containerMap.get(key);

        // Determine info if new
        const unitType = detectUnitType(containerNo);
        const size = existing?.size || (unitType === UnitType.CONTAINER ? "40'HC" : "Xe thớt"); // Default logic

        const getVal = (keys: string[], currentVal: any, defaultVal: any = '') => {
          const rowVal = findVal(row, keys);
          if (currentVal && currentVal !== '') return currentVal;
          if (rowVal !== undefined && rowVal !== null && rowVal !== '') return rowVal;
          return defaultVal;
        };

        // Special Date Handler
        const getDateVal = (keys: string[], currentVal: string) => {
          if (currentVal) return currentVal;
          const rowVal = findVal(row, keys);
          if (rowVal) return normalizeDate(rowVal);
          return '';
        };

        const newContainer: Container = {
          id: existing?.id || Math.random().toString(36).substr(2, 9),
          vesselId: currentVesselId, // Always merge into current vessel scope
          unitType: existing?.unitType || unitType,
          containerNo: containerNo,
          ngayKeHoach: planDate,

          size: size,
          sealNo: getVal(['Số Seal', 'Seal No', 'sealNo'], existing?.sealNo),

          // Customs / Transport Info
          tkNhaVC: getVal(['Số TK Nhà VC', 'tkNhaVC', 'Tờ khai', 'Số tờ khai', 'Số TK', 'Customs No'], existing?.tkNhaVC),
          ngayTkNhaVC: getDateVal(['Ngày TK Nhà VC', 'ngayTkNhaVC', 'Ngày tờ khai', 'Ngày TK', 'Customs Date'], existing?.ngayTkNhaVC || ''),

          tkDnlOla: getVal(['Số TK DNL', 'tkDnlOla', 'Số TK DNL/OLA', 'Tờ khai DNL'], existing?.tkDnlOla),
          ngayTkDnl: getDateVal(['Ngày TK DNL', 'ngayTkDnl', 'Ngày TK DNL/OLA', 'Ngày tờ khai DNL'], existing?.ngayTkDnl || ''),

          billNo: getVal(['Bill No', 'billNo', 'Vận đơn'], existing?.billNo, ''),

          // Cargo Info
          pkgs: Number(getVal(['Số kiện', 'pkgs', 'Package'], existing?.pkgs, 16)),
          weight: Number(getVal(['Số tấn', 'weight', 'Weight'], existing?.weight, 28.8)),

          vendor: getVal(['Vendor', 'vendor'], existing?.vendor),
          consignee: getVal(['Chủ hàng', 'Consignee', 'consignee', 'Khách hàng', 'Customer'], existing?.consignee, 'N/A'),
          carrier: getVal(['Hãng tàu', 'carrier', 'Carrier'], existing?.carrier, 'N/A'),

          detExpiry: normalizeDate(findVal(row, ['Hạn DET', 'detExpiry', 'DET']) || existing?.detExpiry || new Date(Date.now() + 14 * 86400000).toISOString()),
          noiHaRong: getVal(['Nơi hạ rỗng', 'noiHaRong', 'Empty Return'], existing?.noiHaRong, 'TIEN SA'),

          // Status Logic: If full info -> READY, else PENDING (or preserve existing)
          status: existing?.status || ContainerStatus.PENDING,
          updatedAt: new Date().toISOString()
        };

        // Auto-update status if fields are filled now
        if (newContainer.tkNhaVC && newContainer.tkDnlOla && newContainer.status === ContainerStatus.PENDING) {
          newContainer.status = ContainerStatus.READY;
        }

        containerMap.set(key, newContainer);
      } catch (rowError) {
        console.error(`Error processing row ${index}`, rowError);
      }
    });

  } catch (err) {
    console.error("Critical error in processImportData", err);
    return { containers: [], summary: { totalPkgs: 0, totalWeight: 0 } };
  }

  const finalContainers = Array.from(containerMap.values());

  // Re-calculate Summary
  const totalPkgs = finalContainers.reduce((sum, c) => sum + (c.pkgs || 0), 0);
  const totalWeight = finalContainers.reduce((sum, c) => sum + (c.weight || 0), 0);

  return { containers: finalContainers, summary: { totalPkgs, totalWeight } };
};

export const checkDetentionStatus = (
  expiryDate: string,
  config: DetentionConfig = { urgentDays: 2, warningDays: 5 }
): 'urgent' | 'warning' | 'safe' => {
  const expiry = new Date(expiryDate).getTime();
  const now = new Date().getTime();
  const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  if (diffDays <= config.urgentDays) return 'urgent';
  if (diffDays <= config.warningDays) return 'warning';
  return 'safe';
};
