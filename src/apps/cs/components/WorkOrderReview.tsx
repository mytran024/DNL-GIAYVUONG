
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Container, WorkOrder, WorkOrderStatus, WorkOrderType, LABOR_METHODS, MECHANICAL_METHODS, Vessel } from '../../../types/index';
import { ICONS } from '../constants';

import WorkOrderPrintTemplate from './WorkOrderPrintTemplate';

interface WorkOrderReviewProps {
  containers: Container[];
  workOrders: WorkOrder[];
  vessels?: Vessel[];
  onUpdateWorkOrders: (wo: WorkOrder[]) => void;
  onUpdateContainers: (c: Container[]) => void;
  tallyReports?: any[];
}

const CustomSelect: React.FC<{
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (val: string) => void;
}> = ({ label, value, options, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div className="space-y-1 relative" ref={containerRef}>
      <label className="text-[8px] font-black text-slate-400 uppercase block ml-1 tracking-widest">{label}</label>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-[9px] font-black bg-white border ${isOpen ? 'border-blue-500 ring-2 ring-blue-50' : 'border-slate-200'} rounded-xl py-2 px-3 flex items-center justify-between cursor-pointer transition-all shadow-sm hover:border-blue-300`}
      >
        <span className="truncate">{selectedOption?.label || 'Tất cả'}</span>
        <svg className={`w-2.5 h-2.5 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-1.5 bg-white border border-slate-100 rounded-xl shadow-2xl z-[100] overflow-hidden animate-slideUp max-h-48 overflow-y-auto custom-scrollbar">
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`px-3 py-2 text-[10px] font-bold cursor-pointer transition-colors flex items-center justify-between ${value === opt.value ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {opt.label}
              {value === opt.value && <ICONS.CheckCircle className="w-3 h-3" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const WorkOrderReview: React.FC<WorkOrderReviewProps> = ({
  containers,
  workOrders,
  onUpdateWorkOrders,
  onUpdateContainers,
  tallyReports = [],
  vessels = []
}) => {
  const [selectedWOIds, setSelectedWOIds] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<WorkOrderType>(WorkOrderType.LABOR);
  const [isBatchPrinting, setIsBatchPrinting] = useState(false);
  const [currentViewId, setCurrentViewId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(true);

  // Filter States
  const [filterMonth, setFilterMonth] = useState<string>('ALL');
  const [filterYear, setFilterYear] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Enrich Tally Reports with derived reportNo (Same logic as TallyReview)
  const enrichedTallyReports = useMemo(() => {
    if (!tallyReports || tallyReports.length === 0) return [];

    // Sort by creation time (Oldest First)
    const sortedReports = [...tallyReports].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

    return sortedReports.map((report, idx) => {
      const vessel = vessels.find(v => v.id === report.vesselId);
      const vesselCode = vessel ? (vessel.vesselName.split(' ').pop() || vessel.vesselName) : '???';

      return {
        ...report,
        reportNo: `${(idx + 1).toString().padStart(3, '0')} - ${vesselCode}`
      };
    });
  }, [tallyReports, vessels]);

  const filteredWOs = useMemo(() => {
    return workOrders.filter(wo => {
      if (wo.type !== filterType) return false;

      // Robust Date Parsing
      let d, m, y;
      if (wo.date.includes('/')) {
        [d, m, y] = wo.date.split('/');
      } else if (wo.date.includes('-')) {
        [y, m, d] = wo.date.split('-');
      } else {
        return false; // Invalid date format
      }

      const woDateISO = `${y}-${m}-${d}`;

      if (filterMonth !== 'ALL' && m !== filterMonth) return false;
      if (filterYear !== 'ALL' && y !== filterYear) return false;
      if (startDate && woDateISO < startDate) return false;
      if (endDate && woDateISO > endDate) return false;

      return true;
    });
  }, [workOrders, filterType, filterMonth, filterYear, startDate, endDate]);

  useEffect(() => {
    // Determine view ID, prioritize selected or first
    if (!currentViewId && filteredWOs.length > 0) {
      setCurrentViewId(filteredWOs[0].id);
    }
  }, [filteredWOs, currentViewId]);

  const handleUpdateNames = (woId: string, field: 'workerNames' | 'vehicleNos', value: string) => {
    const list = value.split(',').map(s => s.trim()).filter(s => s !== '');
    const updated = workOrders.map(wo =>
      wo.id === woId ? {
        ...wo,
        [field]: list,
        peopleCount: field === 'workerNames' ? list.length : wo.peopleCount
      } : wo
    );
    onUpdateWorkOrders(updated);
  };

  const handlePrint = () => {
    if (selectedWOIds.size === 0 && !currentViewId) return;
    setIsBatchPrinting(true);
    setTimeout(() => {
      window.print();
      setIsBatchPrinting(false);
    }, 800);
  };

  const toggleSelectAll = () => {
    if (selectedWOIds.size === filteredWOs.length && filteredWOs.length > 0) {
      setSelectedWOIds(new Set());
    } else {
      setSelectedWOIds(new Set(filteredWOs.map(w => w.id)));
    }
  };

  const monthOptions = [
    { value: 'ALL', label: 'Tất cả' },
    ...Array.from({ length: 12 }).map((_, i) => ({
      value: (i + 1).toString().padStart(2, '0'),
      label: `T. ${(i + 1).toString().padStart(2, '0')}`
    }))
  ];

  const yearOptions = [
    { value: 'ALL', label: 'Tất cả' },
    { value: '2026', label: '2026' },
    { value: '2025', label: '2025' }
  ];

  const currentViewWO = workOrders.find(w => w.id === currentViewId);

  const getTallyForWO = (wo: WorkOrder) => {
    return enrichedTallyReports.find((t: any) => t.id === wo.tallyId || t.id === `TALLY-${wo.tallyId}` || (t.reportNo && t.reportNo.includes(wo.tallyId)));
  };

  const renderTemplate = (wo: WorkOrder) => {
    return (
      <WorkOrderPrintTemplate
        key={wo.id}
        wo={wo}
        report={getTallyForWO(wo)}
        isPreview={true} // Using preview mode for on-screen, but CSS handles print scaling/positioning
        onUpdate={handleUpdateNames}
      />
    )
  };

  return (
    <div className="flex h-full bg-slate-100 rounded-[2rem] overflow-hidden border border-slate-300 no-print-layout relative">
      <div className="w-72 flex flex-col bg-white border-r border-slate-200 no-print shadow-xl z-20">
        <div className="p-5 bg-white flex flex-col gap-3.5 border-b border-slate-100 text-left shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="font-black uppercase text-[10px] tracking-tight text-blue-800 flex items-center gap-1.5">
              <div className="w-1 h-3.5 bg-blue-600 rounded-full"></div>
              DANH SÁCH PCT
            </h3>
            <button
              onClick={toggleSelectAll}
              className="text-[9px] font-black uppercase text-blue-600 hover:opacity-70 transition-all"
            >
              TẤT CẢ
            </button>
          </div>

          <button
            onClick={handlePrint}
            disabled={selectedWOIds.size === 0 && !currentViewId}
            className="w-full py-3 bg-[#3B82F6] hover:bg-blue-600 disabled:opacity-30 text-white rounded-2xl font-black uppercase text-[10px] transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 border border-blue-400/20"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
            IN PHIẾU
          </button>

          <div className="flex p-0.5 bg-slate-100 rounded-xl border border-slate-100">
            <button
              onClick={() => setFilterType(WorkOrderType.LABOR)}
              className={`flex-1 text-[8px] font-black uppercase py-2 rounded-lg transition-all ${filterType === WorkOrderType.LABOR ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-800/10'}`}
            >
              CÔNG NHÂN
            </button>
            <button
              onClick={() => setFilterType(WorkOrderType.MECHANICAL)}
              className={`flex-1 text-[8px] font-black uppercase py-2 rounded-lg transition-all ${filterType === WorkOrderType.MECHANICAL ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-800/10'}`}
            >
              CƠ GIỚI
            </button>
          </div>
        </div>

        <div className="bg-white px-4 py-3 border-b border-slate-100 space-y-3 shrink-0">
          <div
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center justify-between cursor-pointer py-0.5 group"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest group-hover:text-blue-500 transition-colors">BỘ LỌC THỜI GIAN</span>
              <div className="h-px bg-slate-100 flex-1 min-w-[20px]"></div>
            </div>
            <span className="text-[8px] font-black text-blue-500 uppercase tracking-tighter ml-2 whitespace-nowrap">
              {showFilters ? 'ẨN' : 'HIỆN'}
            </span>
          </div>

          {showFilters && (
            <div className="animate-fadeIn space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <CustomSelect
                  label="Tháng"
                  value={filterMonth}
                  options={monthOptions}
                  onChange={setFilterMonth}
                />
                <CustomSelect
                  label="Năm"
                  value={filterYear}
                  options={yearOptions}
                  onChange={setFilterYear}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase block ml-1 tracking-widest">Từ ngày</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full text-[9px] font-black bg-white border border-slate-200 rounded-xl py-2 px-2 outline-none focus:border-blue-400 shadow-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase block ml-1 tracking-widest">Đến ngày</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full text-[9px] font-black bg-white border border-slate-200 rounded-xl py-2 px-2 outline-none focus:border-blue-400 shadow-sm"
                  />
                </div>
              </div>


            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col p-4 space-y-2.5 bg-white">
          <div className="text-center py-0.5">
            <span className="text-slate-400 text-[8px] font-black uppercase tracking-widest">KẾT QUẢ: {filteredWOs.length} PHIẾU</span>
          </div>

          <div className="space-y-2 pb-6">
            {filteredWOs.map(wo => {
              const isSelected = selectedWOIds.has(wo.id);
              const isViewing = currentViewId === wo.id;

              let d, m, y;
              if (wo.date.includes('/')) {
                [d, m, y] = wo.date.split('/');
              } else {
                [y, m, d] = wo.date.split('-');
              }

              // Find tally report to get friendly name
              const tally = enrichedTallyReports.find((t: any) => t.id === wo.tallyId || t.id === `TALLY-${wo.tallyId}` || (t.reportNo && t.reportNo.includes(wo.tallyId)));
              const quickName = (tally && tally.reportNo) ? `(${tally.reportNo})` : '';

              const displayTitle = `Ca ${wo.shift} - ${d}${m}${y.slice(-2)} ${quickName}`;

              return (
                <div
                  key={wo.id}
                  onClick={() => setCurrentViewId(wo.id)}
                  className={`p-3 rounded-full border-2 transition-all cursor-pointer flex items-center gap-3 relative shadow-sm group ${isViewing ? 'bg-white border-[#3B82F6] ring-1 ring-blue-50' : 'bg-slate-50 border-transparent hover:border-slate-100'}`}
                >
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      const next = new Set(selectedWOIds);
                      if (next.has(wo.id)) next.delete(wo.id); else next.add(wo.id);
                      setSelectedWOIds(next);
                    }}
                    className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-blue-600 border-blue-600 shadow-md' : 'bg-white border-slate-200'}`}
                  >
                    {isSelected ? (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                    ) : (
                      <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex items-center gap-1.5 text-left">
                    <span className="font-black text-[11px] text-slate-800 truncate uppercase">{displayTitle}</span>
                    {wo.isHoliday ? (
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></div>
                    ) : wo.isWeekend ? (
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></div>
                    ) : null}
                  </div>
                </div>
              );
            })}
            {filteredWOs.length === 0 && (
              <div className="py-16 text-center text-slate-300 font-bold italic text-xs">Không tìm thấy phiếu</div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-slate-200/30 print-container">
        <div className="flex flex-col items-center">
          {isBatchPrinting ? (
            selectedWOIds.size > 0
              ? workOrders.filter(w => selectedWOIds.has(w.id)).map(w => renderTemplate(w))
              : currentViewWO ? renderTemplate(currentViewWO) : null
          ) : currentViewId && currentViewWO ? (
            <div className="w-full flex flex-col items-center">
              <div className="mb-4 px-4 py-1.5 bg-white rounded-full shadow-sm border border-slate-200 flex items-center gap-4 no-print group cursor-pointer hover:border-blue-300 transition-all"
                onClick={() => {
                  const updated = workOrders.map(w => {
                    if (w.id === currentViewId) {
                      // Cycle: Normal -> Weekend -> Holiday -> Normal
                      if (!w.isHoliday && !w.isWeekend) {
                        return { ...w, isWeekend: true, isHoliday: false };
                      } else if (w.isWeekend) {
                        return { ...w, isWeekend: false, isHoliday: true };
                      } else {
                        return { ...w, isWeekend: false, isHoliday: false };
                      }
                    }
                    return w;
                  });
                  onUpdateWorkOrders(updated);
                }}>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest group-hover:text-blue-500 transition-colors">Loại hình ca:</span>
                  <div className={`w-1.5 h-1.5 rounded-full ring-2 ring-transparent group-hover:ring-blue-100 transition-all ${currentViewWO?.isHoliday ? 'bg-amber-500' : (currentViewWO?.isWeekend ? 'bg-indigo-500' : 'bg-blue-500')}`}></div>
                  <span className={`text-[10px] font-black uppercase ${currentViewWO?.isHoliday ? 'text-amber-600' : (currentViewWO?.isWeekend ? 'text-indigo-600' : 'text-blue-600')}`}>
                    {currentViewWO?.isHoliday ? 'NGÀY LỄ / HOLIDAY' : (currentViewWO?.isWeekend ? 'CUỐI TUẦN / WEEKEND' : 'CA HÀNH CHÍNH')}
                  </span>
                  <div className="ml-2 px-1.5 py-0.5 rounded bg-slate-100 text-[8px] font-bold text-slate-400 uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                    Chạm để đổi
                  </div>
                </div>
              </div>
              {renderTemplate(currentViewWO)}
            </div>
          ) : (
            <div className="mt-40 opacity-20 text-center no-print">
              <ICONS.ClipboardList className="w-24 h-24 mx-auto mb-4" />
              <p className="font-black text-base uppercase tracking-[0.em] text-slate-900">Chọn phiếu để soát xét</p>
              <p className="text-[11px] font-bold mt-2 uppercase">Hệ thống đồng bộ dữ liệu hiện trường (Realtime)</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Tinos:ital,wght@0,400;0,700;1,400;1,700&display=swap');
        .font-serif-paper { font-family: 'Tinos', serif; }
        .font-signature { font-family: 'Dancing Script', cursive; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }

        @media print {
          /* Explicitly hide non-print elements */
          .no-print, aside, header, nav, button, select, input { display: none !important; }
          
          /* Reset root styles for print */
          body, #root, main, .no-print-layout {
            visibility: visible !important;
            display: block !important;
            overflow: visible !important;
            position: static !important;
            height: auto !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          /* Target the print container - RESET positioning to avoid glitches */
          .print-container { 
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            display: block !important;
          }

          /* Ensure all children are visible */
          .print-container * {
            visibility: visible !important;
          }

          /* Paper settings - Use simple landscape */
          @page { size: A4 landscape; margin: 10mm; }
          
          .font-serif-paper { 
            font-family: 'Times New Roman', serif; 
            box-shadow: none !important; 
            border: 1px solid #000 !important; 
            margin: 0 auto !important; 
            width: 100% !important; /* Fill the page body (which has 10mm margin) */
            max-width: none !important;
            page-break-inside: avoid;
            page-break-after: always;
          }

          /* Hide everything else on the body */
          body > *:not(#root) {
            display: none !important;
          }
        }
      `}</style>

    </div>
  );
};

export default WorkOrderReview;
