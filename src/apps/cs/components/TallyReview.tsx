
import React, { useState, useMemo, useEffect } from 'react';
import { Container, ContainerStatus, Vessel, UnitType } from '../../../types/index';
import { TallyReport } from '../../../types/inspector';
import { ICONS } from '../constants';

interface TallyReportGroup {
  id: string;
  vesselId: string;
  vesselName: string;
  vesselCode: string;
  voyageNo: string;
  shift: string;
  day: string;
  month: string;
  year: string;
  dateStr: string;
  reportNo: string;
  reportCount: number;
  consignee: string;
  commodity: string;
  equipmentList: string[];
  containers: any[]; // Use any or specific Item type
  isApproved: boolean;
  type: 'IMPORT' | 'EXPORT';
  workerNames: string;
  createdBy?: string;
  isWeekend?: boolean;
}

interface TallyReviewProps {
  containers: Container[]; // Keep for reference if needed
  vessels: Vessel[];
  tallyReports: TallyReport[];
  onUpdateContainers: (c: Container[]) => void;
  onUpdateTallyReports?: (reports: TallyReport[]) => void;
}

const TallyReview: React.FC<TallyReviewProps> = ({ containers, vessels, tallyReports, onUpdateContainers, onUpdateTallyReports }) => {
  const [selectedReportIds, setSelectedReportIds] = useState<Set<string>>(new Set());
  const [currentViewId, setCurrentViewId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'IMPORT' | 'EXPORT'>('IMPORT');
  const [isBatchPrinting, setIsBatchPrinting] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  // ... (filters state) ...
  const [filterDate, setFilterDate] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchReportNo, setSearchReportNo] = useState<string>('');
  const [searchConsignee, setSearchConsignee] = useState<string>('');
  const [filterVesselId, setFilterVesselId] = useState<string>('ALL');

  // Convert TallyReports to "Groups" for viewing
  const reportGroups = useMemo(() => {
    // Sort by creation time (Oldest First) to ensure numbering increases with time
    const sortedReports = [...(tallyReports || [])].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

    const mappedGroups = sortedReports.map((report, idx) => {
      const vessel = vessels.find(v => v.id === report.vesselId) || { vesselName: 'Unknown', voyageNo: 'N/A', consignee: 'Unknown' } as Vessel;
      const vesselCode = vessel.vesselName.split(' ').pop() || vessel.vesselName;

      // Parse date
      let d, m, y;
      if (report.workDate.includes('/')) {
        [d, m, y] = report.workDate.split('/');
      } else {
        [y, m, d] = report.workDate.split('-');
      }

      // Reconstruct or use items
      const reportContainers = report.items.map(item => ({
        ...item,
        containerNo: item.contNo,
        size: 'N/A',
        pkgs: item.actualUnits,
        weight: item.actualWeight,
        remarks: item.notes,
        tkDnlOla: 'N/A'
      })).map(c => {
        const orig = containers.find(oc => oc.containerNo === c.containerNo);
        return {
          ...c,
          size: orig?.size || 'N/A',
          unitType: orig?.unitType,
          sealNo: c.sealNo,
          tkDnlOla: orig?.tkDnlOla || ''
        };
      });

      return {
        id: report.id || `REP-${idx}`,
        vesselId: report.vesselId,
        vesselName: vessel.vesselName,
        vesselCode: vesselCode,
        voyageNo: vessel.voyageNo,
        shift: report.shift,
        day: d || '',
        month: m || '',
        year: y || '',
        dateStr: `${y}-${m}-${d}`,
        reportNo: `${(idx + 1).toString().padStart(3, '0')} - ${vesselCode}`,
        reportCount: idx + 1,
        consignee: report.owner || vessel.consignee,
        commodity: 'Giấy',
        equipmentList: report.equipment ? report.equipment.split('+') : [],
        containers: reportContainers,
        isApproved: report.status === 'DA_DUYET', // Use persisted status
        type: report.mode === 'NHAP' ? 'IMPORT' : 'EXPORT',
        workerNames: report.workerNames || '',
        createdBy: report.createdBy,
        isWeekend: report.isWeekend
      } as TallyReportGroup;
    });

    // Return reversed so newest is on top for the list view, but numbers are correct
    return mappedGroups.reverse();
  }, [tallyReports, vessels, containers]);

  const filteredGroups = useMemo(() => {
    return reportGroups.filter(g => {
      const typeMatch = activeFilter === 'ALL' || g.type === activeFilter;
      const dateMatch = !filterDate || g.dateStr === filterDate;
      const startMatch = !startDate || g.dateStr >= startDate;
      const endMatch = !endDate || g.dateStr <= endDate;
      const reportNoMatch = !searchReportNo ||
        g.reportNo.toLowerCase().includes(searchReportNo.toLowerCase()) ||
        String(g.reportCount).includes(searchReportNo);
      const consigneeMatch = !searchConsignee || g.consignee.toLowerCase().includes(searchConsignee.toLowerCase());
      const vesselMatch = filterVesselId === 'ALL' || g.vesselId === filterVesselId;

      return typeMatch && dateMatch && startMatch && endMatch && reportNoMatch && consigneeMatch && vesselMatch;
    });
  }, [reportGroups, activeFilter, filterDate, startDate, endDate, searchReportNo, searchConsignee, filterVesselId]);

  const currentViewGroup = useMemo(() =>
    reportGroups.find(g => g.id === currentViewId),
    [reportGroups, currentViewId]
  );

  useEffect(() => {
    if (filteredGroups.length > 0 && !currentViewId) {
      setCurrentViewId(filteredGroups[0].id);
    }
  }, [filteredGroups, currentViewId]);

  const handleApprove = () => {
    const idsToApprove = selectedReportIds.size > 0 ? Array.from(selectedReportIds) : (currentViewId ? [currentViewId] : []);
    if (idsToApprove.length === 0) return;

    // 1. Update Containers (Existing Logic)
    const selectedGroups = reportGroups.filter(g => idsToApprove.includes(g.id));
    const containerIdsToUpdate = selectedGroups.flatMap(g => g.containers.map(c => c.id));

    onUpdateContainers(containers.map(c =>
      containerIdsToUpdate.includes(c.id)
        ? { ...c, tallyApproved: true, status: ContainerStatus.COMPLETED }
        : c
    ));

    // 2. Update Tally Reports Status (New Logic)
    if (onUpdateTallyReports) {
      const updatedReports = tallyReports.map(r =>
        idsToApprove.includes(r.id) ? { ...r, status: 'DA_DUYET' as const } : r
      );
      onUpdateTallyReports(updatedReports);
    }

    setSelectedReportIds(new Set());
    alert("Đã phê duyệt Tally Report thành công.");
  };

  const handlePrint = () => {
    if (selectedReportIds.size === 0 && !currentViewId) return;
    setIsBatchPrinting(true);
    setTimeout(() => {
      window.print();
      setIsBatchPrinting(false);
    }, 800);
  };

  const toggleSelectAll = () => {
    if (selectedReportIds.size === filteredGroups.length && filteredGroups.length > 0) {
      setSelectedReportIds(new Set());
    } else {
      setSelectedReportIds(new Set(filteredGroups.map(g => g.id)));
    }
  };

  const numberToVietnameseText = (num: number) => {
    const units = ["KHÔNG", "MỘT", "HAI", "BA", "BỐN", "NĂM", "SÁU", "BẢY", "TÁM", "CHÍN"];
    if (num < 10) return units[num];
    if (num === 10) return "MƯỜI";
    return num.toString();
  };

  const renderTallyPaper = (group: TallyReportGroup) => {
    // Helper to chunk array
    const chunkArray = <T,>(array: T[], size: number): T[][] => {
      if (!array || array.length === 0) return [];
      const result: T[][] = [];
      for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
      }
      return result;
    };

    const containerChunks = group.containers.length > 0 ? chunkArray(group.containers, 15) : [[]];

    return (
      <div key={group.id} className="w-full">
        {containerChunks.map((chunk, pageIdx) => {
          // Calculate totals for this page
          const subTotalPkgs = chunk.reduce((sum, c) => sum + (c.pkgs || 0), 0);
          const subTotalWeight = chunk.reduce((sum, c) => sum + (c.weight || 0), 0);

          // Empty rows if needed to maintain size
          const emptyRows = Math.max(0, 15 - chunk.length);

          return (
            <div key={`${group.id}-page-${pageIdx}`} className="bg-white p-6 text-black shadow-2xl mb-10 w-full max-w-[210mm] min-h-[297mm] print:min-h-0 print:h-auto mx-auto print:shadow-none print:border-none font-sans border border-slate-200 print:break-after-page text-left relative flex flex-col print:m-0 print:w-full print:max-w-none">
              {/* Header Section */}
              <div className="flex justify-between items-start mb-6 text-[10px] font-bold">
                <div className="text-center w-1/2">
                  <p className="uppercase">CÔNG TY CỔ PHẦN LOGISTICS CẢNG ĐÀ NẴNG</p>
                  <p className="uppercase text-[12px] my-1 font-black">DANALOG</p>
                  <div className="mt-1 ml-6 text-[12px] text-left">
                    <p className="font-bold">KHO HÀNG: DANALOG</p>
                    <p className="italic text-[11px] font-bold">Warehouse Division</p>
                    <p className="font-bold mt-1">
                      No : {group.reportNo}  {containerChunks.length > 1 ? `(${pageIdx + 1}/${containerChunks.length})` : ''}
                    </p>
                  </div>
                </div>
                <div className="text-center w-1/2">
                  <p className="uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                  <p className="uppercase text-[11px] tracking-tight">SOCIALIST REPUBLIC OF VIETNAM</p>
                  <p className="font-bold border-b border-black inline-block pb-0.5 mt-1">Độc Lập – Tự Do – Hạnh Phúc</p>
                  <p className="italic font-medium text-[9px]">Independence – Freedom – Happiness</p>
                </div>
              </div>

              {/* Title */}
              <div className="text-center mb-6">
                <h1 className="text-xl font-black uppercase leading-tight">PHIẾU KIỂM GIAO NHẬN HÀNG - TALLY REPORT</h1>
                <h2 className="text-lg font-bold uppercase">TẠI BÃI CẢNG</h2>
              </div>

              {/* Metadata */}
              <div className="space-y-2 text-[12px] mb-6 px-2">
                <div className="flex items-baseline">
                  <span className="font-bold whitespace-nowrap">1.Chủ hàng/Consignee:</span>
                  <span className="ml-2 font-bold border-b border-dotted border-black flex-1 min-h-[20px] h-auto uppercase leading-snug">{group.consignee}</span>
                </div>
                <div className="flex gap-4 items-baseline">
                  <div className="flex items-baseline">
                    <span className="font-bold whitespace-nowrap">2.Ca/Shift:</span>
                    <span className="ml-2 border-b border-dotted border-black w-8 text-center font-bold h-5">{group.shift}</span>
                  </div>
                  <div className="flex items-baseline">
                    <span className="font-bold whitespace-nowrap">ngày/day:</span>
                    <span className="ml-1 border-b border-dotted border-black w-8 text-center font-bold h-5">{group.day}</span>
                  </div>
                  <div className="flex items-baseline">
                    <span className="font-bold whitespace-nowrap">tháng/month:</span>
                    <span className="ml-1 border-b border-dotted border-black w-8 text-center font-bold h-5">{group.month}</span>
                  </div>
                  <div className="flex items-baseline">
                    <span className="font-bold whitespace-nowrap">năm/year:</span>
                    <span className="ml-1 border-b border-dotted border-black w-14 text-center font-bold h-5">{group.year}</span>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="flex-1 flex items-baseline">
                    <span className="font-bold whitespace-nowrap">3.Tổ công nhân xếp dỡ/Stevedore:</span>
                    <span className="ml-2 border-b border-dotted border-black flex-1 font-bold min-h-[20px] h-auto uppercase leading-snug">{group.workerNames}</span>
                  </div>
                  <div className="flex-1 flex items-baseline">
                    <span className="font-bold whitespace-nowrap">Thiết bị sử dụng/Equipment:</span>
                    <span className="ml-2 border-b border-dotted border-black flex-1 font-bold min-h-[20px] h-auto leading-snug">{group.equipmentList.join('+')}</span>
                  </div>
                </div>
              </div>

              {/* Table */}
              <table className="w-full border-collapse border border-black text-[11px] text-center">
                <thead>
                  <tr className="font-bold h-12">
                    <th className="border border-black p-1 w-[35px] leading-tight">STT<br />No</th>
                    <th className="border border-black p-1 w-[60px] leading-tight">Size<br />type</th>
                    <th className="border border-black p-1 leading-tight">Loại hàng/Description<br />Ký mã hiệu/Marsks</th>
                    <th className="border border-black p-1 w-[110px] leading-tight">Số lượng<br />Number of package</th>
                    <th className="border border-black p-1 w-[160px] leading-tight">Ghi chú/<br />Remarks</th>
                    <th className="border border-black p-1 w-[80px]">Số tờ khai</th>
                  </tr>
                </thead>
                <tbody>
                  {pageIdx === 0 && (
                    <tr className="h-10 bg-gray-50/50">
                      <td className="border border-black"></td>
                      <td className="border border-black"></td>
                      <td className="border border-black font-bold px-2 uppercase h-full min-h-[40px]">
                        <div className="flex justify-between items-center h-full">
                          <span>{group.commodity}</span>
                          <span className="opacity-70">TÀU {group.vesselCode}</span>
                        </div>
                      </td>
                      <td className="border border-black"></td>
                      <td className="border border-black font-bold px-2 text-[9px]">Vị trí rút ruột: Kho Danalog</td>
                      <td className="border border-black"></td>
                    </tr>
                  )}

                  {chunk.map((c, i) => (
                    <tr key={i} className="font-bold h-[18px]">
                      <td className="border border-black font-bold h-[18px] py-0.5">{(pageIdx * 15) + i + 1}</td>
                      <td className="border border-black font-bold text-[9px] h-[18px] py-0.5">{c?.size?.replace(/HC/g, '') || ''}</td>
                      <td className="border border-black px-1 font-black h-[18px]">
                        <div className="flex justify-between items-center h-full">
                          <span className="flex items-center gap-1">
                            {c?.unitType === UnitType.VEHICLE && <span className="text-[7px] bg-amber-100 px-1 rounded">XE</span>}
                            {c?.containerNo || ''}
                          </span>
                          <span className="text-[9px] opacity-70 leading-none">{c?.sealNo && c.sealNo !== 'N/A' ? c.sealNo : ''}</span>
                        </div>
                      </td>
                      <td className="border border-black font-bold h-[18px] py-0.5">{c ? `${c.pkgs} Kiện` : ''}</td>
                      <td className="border border-black px-1 text-[9px] italic text-left h-[18px] py-0.5 leading-none">{c?.remarks || ''}</td>
                      <td className="border border-black font-bold h-[18px] py-0.5">{c?.tkDnlOla || ''}</td>
                    </tr>
                  ))}

                  {Array.from({ length: emptyRows - (pageIdx === 0 ? 1 : 0) }).map((_, i) => (
                    <tr key={`empty-${i}`} className="h-[18px]">
                      <td className="border border-black py-0.5"></td>
                      <td className="border border-black py-0.5"></td>
                      <td className="border border-black py-0.5"></td>
                      <td className="border border-black py-0.5"></td>
                      <td className="border border-black py-0.5"></td>
                      <td className="border border-black py-0.5"></td>
                    </tr>
                  ))}

                  <tr className="font-bold h-10">
                    <td className="border border-black" colSpan={3}></td>
                    <td className="border border-black text-center text-[12px]">{subTotalPkgs} Kiện / {subTotalWeight.toFixed(1)} Tấn</td>
                    <td className="border border-black" colSpan={2}></td>
                  </tr>
                </tbody>
              </table>

              {/* Footer Sections */}
              <div className="mt-auto space-y-2 text-[12px] px-2 font-bold mb-8">
                <div className="flex items-baseline mb-2">
                  <span className="whitespace-nowrap">Ghi chú:</span>
                  <span className="ml-2 border-b border-dotted border-black flex-1 h-5"></span>
                </div>
                <div className="flex items-baseline">
                  <span className="whitespace-nowrap">Phương án dịch chuyển:</span>
                  <span className="ml-2 border-b border-dotted border-black flex-1 h-5"></span>
                </div>
                <div className="flex items-baseline justify-between gap-10">
                  <div className="flex items-baseline flex-1">
                    <span className="whitespace-nowrap">Tổng cộng (Grand total) :</span>
                    <span className="ml-2 border-b border-dotted border-black w-24 text-center h-5">{chunk.length}</span>
                    <span className="ml-1">X40'F</span>
                  </div>
                  <div className="flex items-baseline flex-1">
                    <span className="whitespace-nowrap">Viết bằng chữ (In letter) :</span>
                    <span className="ml-2 border-b border-dotted border-black flex-1 text-center h-5 uppercase">{numberToVietnameseText(chunk.length)}</span>
                  </div>
                  <div className="whitespace-nowrap underline">Container có hàng nguyên chì</div>
                </div>
              </div>

              {/* Signatures */}
              <div className="mt-2 grid grid-cols-3 text-center text-[11px] font-bold uppercase">
                <div className="flex flex-col h-32">
                  <p>ĐẠI DIỆN CỦA TÀU/CHỦ HÀNG</p>
                  <p className="font-normal italic normal-case opacity-60 mt-0.5 tracking-tighter">Ship’s representative/ Consignee</p>
                </div>
                <div className="flex flex-col h-32">
                  <p>HẢI QUAN GIÁM SÁT</p>
                  <p className="font-normal italic normal-case opacity-60 mt-0.5 tracking-tighter">Customs Officer</p>
                </div>
                <div className="flex flex-col h-32 items-center">
                  <p>ĐẠI DIỆN KHO HÀNG</p>
                  <p className="font-normal italic normal-case opacity-60 mt-0.5 tracking-tighter">Warehouse Division’s representative</p>
                  <div className="mt-auto h-20 flex flex-col items-center justify-center pt-2">
                    <span className="font-signature italic text-blue-900 text-3xl opacity-80 leading-none">
                      {group.createdBy ? group.createdBy.split(' ').pop() : ''}
                    </span>
                    <p className="italic font-bold normal-case text-[12px] text-blue-900 mt-1 border-t border-black/30 px-2">
                      {group.createdBy}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex h-full bg-slate-100 rounded-[1.5rem] overflow-hidden border border-slate-300 relative">
      <div className="w-72 flex flex-col bg-white border-r border-slate-200 no-print shadow-xl z-20">
        <div className="p-4 bg-white flex flex-col gap-3 border-b border-slate-100 text-left shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="font-black uppercase text-[10px] tracking-tight text-blue-800 flex items-center gap-1.5">
              <div className="w-1 h-3.5 bg-blue-600 rounded-full"></div>
              DANH SÁCH TALLY
            </h3>
            <button onClick={toggleSelectAll} className="text-[9px] font-black uppercase text-blue-600 hover:opacity-70 transition-all">TẤT CẢ</button>
          </div>

          <div className="flex gap-2">
            <button onClick={handleApprove} className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black uppercase text-[9px] transition-all shadow-md flex items-center justify-center gap-2">
              <ICONS.CheckCircle className="w-3.5 h-3.5" /> DUYỆT
            </button>
            <button onClick={handlePrint} className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-black uppercase text-[9px] transition-all shadow-md flex items-center justify-center gap-2">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
              IN PHIẾU
            </button>
          </div>

          <div className="flex p-0.5 bg-slate-100 rounded-xl border border-slate-100">
            <button onClick={() => setActiveFilter('IMPORT')} className={`flex-1 text-[8px] font-black uppercase py-2 rounded-lg transition-all ${activeFilter === 'IMPORT' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500'}`}>NHẬP</button>
            <button onClick={() => setActiveFilter('EXPORT')} className={`flex-1 text-[8px] font-black uppercase py-2 rounded-lg transition-all ${activeFilter === 'EXPORT' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500'}`}>XUẤT</button>
            <button onClick={() => setActiveFilter('ALL')} className={`flex-1 text-[8px] font-black uppercase py-2 rounded-lg transition-all ${activeFilter === 'ALL' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500'}`}>TẤT CẢ</button>
          </div>
        </div>

        <div className="bg-white px-4 py-3 border-b border-slate-100 space-y-3 shrink-0">
          <div onClick={() => setShowFilters(!showFilters)} className="flex items-center justify-between cursor-pointer py-0.5 group">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">BỘ LỌC TÌM KIẾM</span>
            <div className="flex items-center gap-3">
              <button onClick={(e) => { e.stopPropagation(); setSearchReportNo(''); setFilterDate(''); setStartDate(''); setEndDate(''); setSearchConsignee(''); setFilterVesselId('ALL'); }} className="text-[8px] font-black text-red-400 uppercase">XÓA LỌC</button>
              <span className="text-[8px] font-black text-blue-500 uppercase">{showFilters ? 'ẨN' : 'HIỆN'}</span>
            </div>
          </div>

          {showFilters && (
            <div className="animate-fadeIn space-y-3">
              <div>
                <label className="text-[8px] font-black text-slate-400 uppercase block ml-1 mb-1">CHỦ HÀNG</label>
                <input type="text" value={searchConsignee} onChange={(e) => setSearchConsignee(e.target.value)} placeholder="Tìm chủ hàng..." className="w-full text-[9px] font-black bg-slate-50 border border-slate-100 rounded-lg py-2 px-3 outline-none focus:bg-white focus:border-blue-400 shadow-sm transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[8px] font-black text-slate-400 uppercase block ml-1 mb-1">TỪ NGÀY</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full text-[9px] font-black bg-white border border-slate-200 rounded-xl py-2 px-2 outline-none focus:border-blue-400 shadow-sm" />
                </div>
                <div>
                  <label className="text-[8px] font-black text-slate-400 uppercase block ml-1 mb-1">ĐẾN NGÀY</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full text-[9px] font-black bg-white border border-slate-200 rounded-xl py-2 px-2 outline-none focus:border-blue-400 shadow-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[8px] font-black text-slate-400 uppercase block ml-1 mb-1">TALLY NO</label>
                  <input type="text" value={searchReportNo} onChange={(e) => setSearchReportNo(e.target.value)} placeholder="Nhập số No" className="w-full text-[9px] font-black bg-slate-50 border border-slate-100 rounded-lg py-2 px-2 outline-none focus:bg-white focus:border-blue-400 shadow-sm text-center" />
                </div>
                <div>
                  <label className="text-[8px] font-black text-slate-400 uppercase block ml-1 mb-1">CHUYẾN TÀU</label>
                  <select value={filterVesselId} onChange={(e) => setFilterVesselId(e.target.value)} className="w-full text-[9px] font-black bg-slate-50 border border-slate-100 rounded-lg py-2 px-2 outline-none focus:bg-white focus:border-blue-400 shadow-sm text-center">
                    <option value="ALL">Tất cả</option>
                    {vessels.map(v => <option key={v.id} value={v.id}>{v.vesselName}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col p-4 space-y-2 bg-white">
          <div className="text-center py-0.5">
            <span className="text-slate-400 text-[8px] font-black uppercase tracking-widest">KẾT QUẢ: {filteredGroups.length} PHIẾU</span>
          </div>
          <div className="space-y-2 pb-6">
            {filteredGroups.map(group => {
              const isSelected = selectedReportIds.has(group.id);
              const isViewing = currentViewId === group.id;
              const ddmmyy = `${group.day}${group.month}${group.year.slice(-2)}`;
              const tallyDisplayName = `Ca ${group.shift} - ${ddmmyy} (${group.reportCount})`;

              return (
                <div key={group.id} onClick={() => setCurrentViewId(group.id)} className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-3 relative shadow-sm ${isViewing ? 'bg-white border-[#3B82F6] ring-1 ring-blue-50' : 'bg-slate-50 border-transparent hover:border-slate-100'}`}>
                  <div onClick={(e) => { e.stopPropagation(); const next = new Set(selectedReportIds); if (next.has(group.id)) next.delete(group.id); else next.add(group.id); setSelectedReportIds(next); }} className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-200'}`}>
                    {isSelected && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col items-start">
                    <div className="flex items-center justify-between w-full">
                      <span className="font-black text-[12px] text-slate-800 truncate uppercase">{tallyDisplayName}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        {group.isApproved && <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>}
                      </div>
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase truncate mt-0.5">{group.vesselName}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-slate-200/30 print:p-0 print:bg-white print:overflow-visible">
        <div className="flex flex-col items-center print:block">
          {isBatchPrinting ? (
            selectedReportIds.size > 0
              ? reportGroups.filter(g => selectedReportIds.has(g.id)).map(g => renderTallyPaper(g))
              : currentViewGroup ? renderTallyPaper(currentViewGroup) : null
          ) : currentViewId && currentViewGroup ? (
            renderTallyPaper(currentViewGroup)
          ) : (
            <div className="mt-40 opacity-20 text-center no-print flex flex-col items-center">
              <ICONS.FileText className="w-24 h-24 mb-4 text-slate-400" />
              <p className="font-black text-base uppercase tracking-[0.2em] text-slate-900">Chọn báo cáo để soát xét</p>
            </div>
          )}
        </div>
      </div>
      <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Tinos:ital,wght@0,400;0,700;1,400;1,700&display=swap');
            .font-signature { font-family: 'Dancing Script', cursive; }
            .custom-scrollbar::-webkit-scrollbar { width: 4px; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default TallyReview;
