
import React, { useState, useMemo, useEffect } from 'react';
import { Container, ContainerStatus, WorkOrder, WorkOrderType } from '../../../types/index';
import { ICONS } from '../constants';

interface WorkerStatItem {
  id: string;
  name: string;
  date: string;
  shift: string;
  method: string;
  cargoType: string;
  normalShifts: number;
  weekendShifts: number;
  holidayShifts: number;
}

interface MechanicalStatItem {
  id: string;
  name: string;
  date: string;
  shift: string;
  method: string;
  cargoType: string;
  normalWeight: number;
  weekendWeight: number;
  holidayWeight: number;
  vehicleNo: string;
}

interface StatColumnConfig {
  id: string;
  label: string;
  width: number;
}

const DEFAULT_WORKER_COLS: StatColumnConfig[] = [
  { id: 'name', label: 'TÊN NHÂN VIÊN', width: 220 },
  { id: 'cargoType', label: 'LOẠI HÀNG', width: 140 },
  { id: 'method', label: 'PHƯƠNG ÁN KHAI THÁC', width: 320 },
  { id: 'date', label: 'NGÀY KHAI THÁC', width: 140 },
  { id: 'normalShifts', label: 'CA HC', width: 90 },
  { id: 'weekendShifts', label: 'CA CUỐI TUẦN', width: 110 },
  { id: 'holidayShifts', label: 'CA LỄ', width: 90 },
];

const DEFAULT_MECHANICAL_COLS: StatColumnConfig[] = [
  { id: 'name', label: 'TÊN NHÂN VIÊN', width: 220 },
  { id: 'cargoType', label: 'LOẠI HÀNG', width: 140 },
  { id: 'method', label: 'PHƯƠNG ÁN KHAI THÁC', width: 320 },
  { id: 'date', label: 'NGÀY KHAI THÁC', width: 140 },
  { id: 'normalWeight', label: 'TẤN HC', width: 110 },
  { id: 'weekendWeight', label: 'TẤN CUỐI TUẦN', width: 130 },
  { id: 'holidayWeight', label: 'TẤN LỄ', width: 110 },
];

const Statistics: React.FC<{ containers: Container[]; workOrders: WorkOrder[] }> = ({ containers, workOrders }) => {
  const [reportType, setReportType] = useState<'WORKER' | 'MECHANICAL'>('WORKER');
  const [workerFilters, setWorkerFilters] = useState<string[]>([]);
  const [mechanicalFilters, setMechanicalFilters] = useState<string[]>([]);
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showExportMenu, setShowExportMenu] = useState(false);

  const [workerCols, setWorkerCols] = useState<StatColumnConfig[]>(() => {
    // Reset columns hardcoded cause schema changed
    // const saved = localStorage.getItem('danalog_stat_worker_cols');
    // return saved ? JSON.parse(saved) : DEFAULT_WORKER_COLS;
    return DEFAULT_WORKER_COLS;
  });
  const [mechCols, setMechCols] = useState<StatColumnConfig[]>(() => {
    // const saved = localStorage.getItem('danalog_stat_mech_cols');
    // return saved ? JSON.parse(saved) : DEFAULT_MECHANICAL_COLS;
    return DEFAULT_MECHANICAL_COLS;
  });

  const [resizingCol, setResizingCol] = useState<{ id: string, startX: number, startWidth: number } | null>(null);
  const [draggingColId, setDraggingColId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('danalog_stat_worker_cols', JSON.stringify(workerCols));
    localStorage.setItem('danalog_stat_mech_cols', JSON.stringify(mechCols));
  }, [workerCols, mechCols]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingCol) return;
      const diff = e.clientX - resizingCol.startX;
      const newWidth = Math.max(50, resizingCol.startWidth + diff);
      const setter = reportType === 'WORKER' ? setWorkerCols : setMechCols;
      setter(prev => prev.map(c => c.id === resizingCol.id ? { ...c, width: newWidth } : c));
    };
    const handleMouseUp = () => setResizingCol(null);
    if (resizingCol) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingCol, reportType]);

  const cleanName = (name: string) => name.split('(')[0].trim();

  const handleResizeStart = (e: React.MouseEvent, colId: string, currentWidth: number) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingCol({ id: colId, startX: e.clientX, startWidth: currentWidth });
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (resizingCol) { e.preventDefault(); return; }
    setDraggingColId(id);
    e.dataTransfer.setData('colId', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (draggingColId === targetId) return;
    const setter = reportType === 'WORKER' ? setWorkerCols : setMechCols;
    setter(prev => {
      const oldIndex = prev.findIndex(c => c.id === draggingColId);
      const newIndex = prev.findIndex(c => c.id === targetId);
      const newCols = [...prev];
      const [movedItem] = newCols.splice(oldIndex, 1);
      newCols.splice(newIndex, 0, movedItem);
      return newCols;
    });
  };

  const processedData = useMemo(() => {
    if (reportType === 'WORKER') {
      const aggregationMap = new Map<string, WorkerStatItem>();

      workOrders.filter(wo => wo.type === WorkOrderType.LABOR).forEach(wo => {
        let d, m, y;
        if (wo.date.includes('/')) {
          [d, m, y] = wo.date.split('/');
        } else {
          [y, m, d] = wo.date.split('-');
        }
        const isoDate = `${y}-${m}-${d}`;
        if (monthFilter !== 'ALL' && m !== monthFilter) return;
        if (yearFilter !== 'ALL' && y !== yearFilter) return;
        if (dateRange.start && isoDate < dateRange.start) return;
        if (dateRange.end && isoDate > dateRange.end) return;

        if (dateRange.end && isoDate > dateRange.end) return;

        // Fix: Split by comma if names are combined in one string
        let people = wo.workerNames.flatMap(n => n.split(',').map(s => s.trim())).filter(s => s);

        // Fallback: If no explicit worker names, check if Team Name looks like a list of names
        if (people.length === 0 && wo.teamName) {
          people = wo.teamName.split(',').map(s => s.trim()).filter(s => s);
        }

        people.forEach(name => {
          if (workerFilters.length > 0 && !workerFilters.includes(name)) return;

          const method = wo.items[0]?.method || 'N/A';
          const cargoType = wo.items[0]?.cargoType || 'Giấy';
          const aggKey = `${name}-${wo.date}-${method}-${cargoType}`;

          if (aggregationMap.has(aggKey)) {
            const existing = aggregationMap.get(aggKey)!;
            // 1 Phiếu công tác = 1 Ca
            if (wo.isHoliday) {
              existing.holidayShifts += 1;
            } else if (wo.isWeekend) {
              existing.weekendShifts += 1;
            } else {
              existing.normalShifts += 1;
            }
          } else {
            aggregationMap.set(aggKey, {
              id: aggKey,
              name,
              date: wo.date,
              shift: wo.shift,
              method,
              cargoType,
              normalShifts: (!wo.isHoliday && !wo.isWeekend) ? 1 : 0,
              weekendShifts: (!wo.isHoliday && wo.isWeekend) ? 1 : 0,
              holidayShifts: wo.isHoliday ? 1 : 0
            });
          }
        });
      });
      return Array.from(aggregationMap.values());
    } else {
      const aggregationMap = new Map<string, MechanicalStatItem>();

      workOrders.filter(wo => wo.type === WorkOrderType.MECHANICAL).forEach(wo => {
        let d, m, y;
        if (wo.date.includes('/')) {
          [d, m, y] = wo.date.split('/');
        } else {
          [y, m, d] = wo.date.split('-');
        }
        const isoDate = `${y}-${m}-${d}`;
        if (monthFilter !== 'ALL' && m !== monthFilter) return;
        if (yearFilter !== 'ALL' && y !== yearFilter) return;
        if (dateRange.start && isoDate < dateRange.start) return;
        if (dateRange.end && isoDate > dateRange.end) return;

        // Tính tổng sản lượng (tấn) trong phiếu
        let totalWeightInWo = wo.containerNos.reduce((sum, cNo) => {
          const container = containers.find(c => c.containerNo === cNo);
          return sum + (container?.weight || 0);
        }, 0);

        // Fallback if container weight missing: parse from wo items
        if (totalWeightInWo === 0) {
          totalWeightInWo = wo.items.reduce((sum, item) => {
            const wStr = item.weight?.toLowerCase().replace('tấn', '').trim() || '0';
            return sum + parseFloat(wStr);
          }, 0);
        }

        // Fix: Split by comma if names are combined in one string
        // Fix: Split by comma if names are combined in one string
        let people = wo.workerNames.flatMap(n => n.split(',').map(s => s.trim())).filter(s => s);

        // Fallback: If no explicit worker names, check if Team Name looks like a list of names
        if (people.length === 0 && wo.teamName) {
          people = wo.teamName.split(',').map(s => s.trim()).filter(s => s);
        }

        // Determine iteration source: Use people list if available (split per person), else vehicle list, else team name
        const effectiveEntities = people.length > 0 ? people : (wo.vehicleNos.length > 0 ? wo.vehicleNos : [wo.teamName]);

        // Chia đều cho số lượng thực tế
        const weightPerOperator = totalWeightInWo / (effectiveEntities.length || 1);

        effectiveEntities.forEach((entity, idx) => {
          let name = wo.teamName;
          let vehicle = 'N/A';

          if (people.length > 0) {
            name = entity; // entity is person name
            // Try to map vehicle
            if (wo.vehicleNos.length === people.length) {
              vehicle = wo.vehicleNos[idx];
            } else {
              vehicle = wo.vehicleNos.join(', ');
            }
          } else if (wo.vehicleNos.length > 0) {
            // iterating vehicles
            vehicle = entity;
            name = wo.teamName;
          }

          if (mechanicalFilters.length > 0 && !mechanicalFilters.includes(name)) return;

          const method = wo.items[0]?.method || 'N/A';
          const cargoType = wo.items[0]?.cargoType || 'Giấy';

          // Generate key ensuring uniqueness for this breakdown
          const aggKey = `${name}-${vehicle}-${wo.date}-${method}-${cargoType}`;


          if (aggregationMap.has(aggKey)) {
            const existing = aggregationMap.get(aggKey)!;
            if (wo.isHoliday) {
              existing.holidayWeight += weightPerOperator;
            } else if (wo.isWeekend) {
              existing.weekendWeight += weightPerOperator;
            } else {
              existing.normalWeight += weightPerOperator;
            }
          } else {
            aggregationMap.set(aggKey, {
              id: aggKey,
              name,
              date: wo.date,
              shift: wo.shift,
              method,
              cargoType,
              normalWeight: (!wo.isHoliday && !wo.isWeekend) ? weightPerOperator : 0,
              weekendWeight: (!wo.isHoliday && wo.isWeekend) ? weightPerOperator : 0,
              holidayWeight: wo.isHoliday ? weightPerOperator : 0,
              vehicleNo: vehicle
            });
          }
        });
      });
      return Array.from(aggregationMap.values());
    }
  }, [workOrders, containers, reportType, workerFilters, mechanicalFilters, monthFilter, yearFilter, dateRange]);

  const totals = useMemo(() => {
    return {
      normalShifts: processedData.reduce((sum, i: any) => sum + (i.normalShifts || 0), 0),
      weekendShifts: processedData.reduce((sum, i: any) => sum + (i.weekendShifts || 0), 0),
      holidayShifts: processedData.reduce((sum, i: any) => sum + (i.holidayShifts || 0), 0),
      normalWeight: processedData.reduce((sum, i: any) => sum + (i.normalWeight || 0), 0),
      weekendWeight: processedData.reduce((sum, i: any) => sum + (i.weekendWeight || 0), 0),
      holidayWeight: processedData.reduce((sum, i: any) => sum + (i.holidayWeight || 0), 0),
    };
  }, [processedData]);

  const handlePrint = () => { if (processedData.length === 0) return alert("Chưa có dữ liệu!"); window.print(); };

  const exportToFile = (format: 'CSV' | 'XLS') => {
    if (processedData.length === 0) return alert("Chưa có dữ liệu!");
    const activeColumns = reportType === 'WORKER' ? workerCols : mechCols;
    let headers = activeColumns.map(c => c.label);
    let rows = processedData.map((item: any) => activeColumns.map(col => {
      const val = item[col.id];
      if (col.id === 'name') return cleanName(val);
      if (typeof val === 'number') return val % 1 === 0 ? val : val.toFixed(2);
      return val;
    }));
    const content = [headers, ...rows];
    const fileName = `Bang_Ke_San_Luong_${reportType}_${new Date().toISOString().slice(0, 10)}`;
    if (format === 'CSV') {
      const csvContent = "\uFEFF" + content.map(row => row.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", `${fileName}.csv`);
      link.click();
    } else {
      const htmlTable = `<table border="1"><thead><tr>${headers.map(h => `<th style="background-color: #f2f2f2;">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map((cell: any) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
      const blob = new Blob(["\uFEFF" + htmlTable], { type: 'application/vnd.ms-excel' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", `${fileName}.xls`);
      link.click();
    }
    setShowExportMenu(false);
  };

  const handleMultiSelect = (val: string, current: string[], setter: (v: string[]) => void) => {
    if (val === 'ALL') { setter([]); return; }
    setter(current.includes(val) ? current.filter(i => i !== val) : [...current, val]);
  };

  const renderCell = (item: any, colId: string) => {
    const val = item[colId];
    if (colId === 'name') return cleanName(val);
    if (colId.includes('Shifts') || colId.includes('Weight')) return val === 0 ? '-' : (typeof val === 'number' && !Number.isInteger(val) ? val.toFixed(2) : val);
    return val;
  };

  const activeColumns = reportType === 'WORKER' ? workerCols : mechCols;
  const totalWidth = activeColumns.reduce((s, c) => s + c.width, 0);

  return (
    <div className="space-y-6 animate-fadeIn text-left">
      <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-100 overflow-hidden print:overflow-visible print:shadow-none print:border-none print:rounded-none">
        <div className="p-6 border-b border-slate-50 bg-slate-50/30 space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
              <h3 className="font-black text-slate-800 uppercase tracking-tight text-lg flex items-center gap-2.5">
                <div className="w-1 h-5 bg-blue-600 rounded-full print:hidden"></div>
                BẢNG KÊ {reportType === 'WORKER' ? 'SẢN LƯỢNG CÔNG NHÂN' : 'SẢN LƯỢNG CƠ GIỚI'}
              </h3>
              <p className="text-[9px] text-slate-400 mt-0.5 uppercase tracking-[0.2em] font-black italic">NGUỒN: PHIẾU CÔNG TÁC (PCT) DANALOG</p>
            </div>
            <div className="flex gap-2.5 no-print">
              <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                <button onClick={() => setReportType('WORKER')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${reportType === 'WORKER' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>CÔNG NHÂN</button>
                <button onClick={() => setReportType('MECHANICAL')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${reportType === 'MECHANICAL' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>CƠ GIỚI</button>
              </div>
              <div className="relative">
                <button onClick={() => setShowExportMenu(!showExportMenu)} className="px-4 py-2 bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 flex items-center gap-2 shadow-md transition active:scale-95">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                  XUẤT FILE
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-slideUp">
                    <button onClick={() => exportToFile('XLS')} className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-600 flex items-center gap-2.5">Excel (.xls)</button>
                    <button onClick={() => exportToFile('CSV')} className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-600 flex items-center gap-2.5 border-t border-slate-50">CSV (.csv)</button>
                  </div>
                )}
              </div>
              <button onClick={handlePrint} className="px-4 py-2 bg-[#3B82F6] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 flex items-center gap-2 shadow-md transition active:scale-95">
                <ICONS.FileText className="w-3.5 h-3.5" /> IN BẢNG KÊ
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-3.5 pt-3 border-t border-slate-100 no-print">
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-1">NHÂN VIÊN</label>
              <div className="relative group">
                <div className="w-full text-[10px] font-bold bg-white border border-slate-200 rounded-lg py-2 px-3 shadow-sm cursor-pointer flex justify-between items-center truncate">
                  <span>{reportType === 'WORKER' ? (workerFilters.length === 0 ? "Tất cả nhân viên" : `Đã chọn ${workerFilters.length}`) : (mechanicalFilters.length === 0 ? "Tất cả nhân viên cơ giới" : `Đã chọn ${mechanicalFilters.length}`)}</span>
                  <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
                <div className="absolute hidden group-hover:block top-full left-0 w-full bg-white border border-slate-100 rounded-lg shadow-xl z-50 p-1.5 max-h-52 overflow-y-auto mt-1">
                  <div onClick={() => reportType === 'WORKER' ? setWorkerFilters([]) : setMechanicalFilters([])} className="p-1.5 hover:bg-slate-50 rounded text-[10px] font-bold cursor-pointer italic text-slate-400">Tất cả</div>
                  {/* Lấy danh sách nhân viên thực tế từ các PCT */}
                  {Array.from(new Set<string>(workOrders.filter(wo => wo.type === (reportType === 'WORKER' ? WorkOrderType.LABOR : WorkOrderType.MECHANICAL)).flatMap(wo => {
                    const names = wo.workerNames.flatMap(n => n.split(',').map(s => s.trim())).filter(s => s);
                    if (names.length === 0 && wo.teamName) {
                      return wo.teamName.split(',').map(s => s.trim()).filter(s => s);
                    }
                    return names;
                  }))).map((opt: string) => (
                    <div key={opt} onClick={() => reportType === 'WORKER' ? handleMultiSelect(opt, workerFilters, setWorkerFilters) : handleMultiSelect(opt, mechanicalFilters, setMechanicalFilters)} className={`p-1.5 hover:bg-slate-50 rounded text-[10px] font-bold cursor-pointer flex items-center justify-between ${(reportType === 'WORKER' ? workerFilters : mechanicalFilters).includes(opt) ? 'bg-blue-50 text-blue-600' : ''}`}>{opt}</div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-1">THÁNG / NĂM</label>
              <div className="flex gap-1.5">
                <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="flex-1 text-[10px] font-bold bg-white border border-slate-200 rounded-lg py-2 outline-none focus:border-blue-400 shadow-sm text-center">
                  <option value="ALL">Tháng</option>
                  {Array.from({ length: 12 }).map((_, i) => <option key={i + 1} value={(i + 1).toString().padStart(2, '0')}>{(i + 1).toString().padStart(2, '0')}</option>)}
                </select>
                <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className="flex-1 text-[10px] font-bold bg-white border border-slate-200 rounded-lg py-2 outline-none focus:border-blue-400 shadow-sm text-center">
                  <option value="ALL">Năm</option>
                  <option value="2026">2026</option><option value="2025">2025</option>
                </select>
              </div>
            </div>

            <div className="space-y-1 lg:col-span-2">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-1">KHOẢNG THỜI GIAN</label>
              <div className="flex items-center gap-1.5">
                <input type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} className="flex-1 text-[9px] font-bold bg-white border border-slate-200 rounded-lg py-2 px-2 outline-none shadow-sm" />
                <span className="text-slate-300 font-bold text-xs">→</span>
                <input type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} className="flex-1 text-[9px] font-bold bg-white border border-slate-200 rounded-lg py-2 px-2 outline-none shadow-sm" />
              </div>
            </div>
            <div className="flex items-end justify-end no-print">
              <p className="text-[8px] font-bold text-slate-300 italic mb-2">* Cơ giới tính theo: Tổng tấn trong PCT / Số người vận hành</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="text-left text-[11px] border-collapse table-fixed min-w-full" style={{ width: totalWidth > 0 ? totalWidth : '100%' }}>
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
              <tr>
                {activeColumns.map((col) => (
                  <th key={col.id} className={`relative px-6 py-4 font-black uppercase text-[8px] tracking-widest border-r border-slate-100 group cursor-move select-none`} style={{ width: col.width }} draggable onDragStart={(e) => handleDragStart(e, col.id)} onDragOver={(e) => handleDragOver(e, col.id)} onDragEnd={() => setDraggingColId(null)}>
                    <div className="flex items-center justify-between">
                      <span className="truncate">{col.label}</span>
                      <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400 transition-colors z-40" onMouseDown={(e) => handleResizeStart(e, col.id, col.width)} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {processedData.length > 0 ? (
                <>
                  {processedData.map((item: any) => (
                    <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                      {activeColumns.map((col) => {
                        const isName = col.id === 'name';
                        const isShiftCol = col.id.includes('Shifts') || col.id.includes('Weight');
                        return (
                          <td key={col.id} className={`px-6 py-3 border-r border-slate-50 truncate ${isName ? 'text-blue-900 font-black uppercase' : 'text-slate-500 font-bold'} ${isShiftCol ? 'text-center' : ''} ${col.id === 'holidayShifts' || col.id === 'holidayWeight' ? 'text-amber-600 font-black' : ''} ${col.id === 'weekendShifts' || col.id === 'weekendWeight' ? 'text-purple-600 font-black' : ''}`} style={{ width: col.width }}>
                            {renderCell(item, col.id)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {/* TOTAL ROW (Moved to tbody for consistent printing) */}
                  <tr className="bg-slate-50 font-black text-[11px] border-t-2 border-slate-100 uppercase print:bg-white print:border-t-2 print:border-black print:text-black">
                    {activeColumns.map((col, idx) => (
                      <td key={`total-${col.id}`} className={`px-6 py-4 border-r border-slate-100 ${idx === 0 ? 'text-left' : 'text-center'} print:border-slate-300`} style={{ width: col.width }}>
                        {idx === 0 && <span className="text-slate-400 print:text-black">TỔNG CỘNG:</span>}
                        {col.id === 'normalShifts' && `${totals.normalShifts} Ca`}
                        {col.id === 'weekendShifts' && `${totals.weekendShifts} Ca`}
                        {col.id === 'holidayShifts' && `${totals.holidayShifts} Ca`}
                        {col.id === 'normalWeight' && `${totals.normalWeight.toFixed(1)} T`}
                        {col.id === 'weekendWeight' && `${totals.weekendWeight.toFixed(1)} T`}
                        {col.id === 'holidayWeight' && `${totals.holidayWeight.toFixed(1)} T`}
                      </td>
                    ))}
                  </tr>
                </>
              ) : (
                <tr><td colSpan={activeColumns.length} className="px-6 py-12 text-center text-slate-300 font-black italic uppercase">Không tìm thấy dữ liệu báo cáo</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Statistics;
