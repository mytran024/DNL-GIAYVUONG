import React, { useState, useMemo, useRef } from 'react';
import { TallyReport, Vessel } from '../../../types/inspector';
import { WorkOrder, WorkOrderType, Container } from '../../../types/index';
import TallyPrintTemplate from '../components/TallyPrintTemplate';
import WorkOrderPrintTemplate from '../components/WorkOrderPrintTemplate';
import { generatePdf } from '../utils/pdfGenerator';

interface HistoryViewProps {
  reports: TallyReport[];
  workOrders: any[];
  containers?: Container[];
  vessels?: Vessel[];
  mode: 'TALLY' | 'WO';
  onEditTally?: (report: TallyReport) => void;
  onEditWO?: (wo: WorkOrder) => void;
  currentUser?: { name: string; role: string } | null;
}

const HistoryView: React.FC<HistoryViewProps> = ({ reports, workOrders, containers = [], vessels = [], mode, onEditTally, onEditWO, currentUser }) => {
  const [woFilter, setWoFilter] = useState<WorkOrderType>(WorkOrderType.LABOR);
  const [tallyTypeFilter, setTallyTypeFilter] = useState<'NHAP' | 'XUAT'>('NHAP');

  // Tally filters
  const [filterVesselId, setFilterVesselId] = useState('');
  const [filterOwner, setFilterOwner] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // WO filters
  const [woMonth, setWoMonth] = useState('');
  const [woFromDate, setWoFromDate] = useState('');
  const [woToDate, setWoToDate] = useState('');

  // PDF Generation State
  const [generating, setGenerating] = useState(false);
  // We use these states to control WHAT is rendered in the hidden print containers
  const [pdfTallyList, setPdfTallyList] = useState<TallyReport[]>([]);
  const [pdfWOList, setPdfWOList] = useState<WorkOrder[]>([]);

  // Refs for PDF containers
  const pdfTallyRef = useRef<HTMLDivElement>(null);
  const pdfWORef = useRef<HTMLDivElement>(null);

  // Preview State
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewReport, setPreviewReport] = useState<TallyReport | null>(null);
  const [previewWO, setPreviewWO] = useState<WorkOrder | null>(null);

  // Helper to get owner
  const getOwner = (r: TallyReport) => {
    if (r.owner) return r.owner;
    const v = vessels.find(v => v.id === r.vesselId) || vessels[0];
    return (v as any)?.consignee || v?.customerName || '';
  };

  const owners = useMemo(() => {
    const set = new Set<string>();
    reports.forEach(r => {
      const owner = getOwner(r);
      if (owner) set.add(owner);
    });
    return Array.from(set);
  }, [reports, vessels]);

  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      // 1. User Permission Filter
      // If Inspector, only show own reports. (Check if currentUser exists and is Inspector, though logic implies this view is mostly for Inspectors)
      // Assuming 'CS' or 'ADMIN' might reuse this view? If so, we should check role.
      // But based on request: "mỗi kiểm viên chỉ thấy được...".
      // Let's assume if currentUser is provided, we filter.
      if (currentUser && currentUser.role === 'INSPECTOR') {
        if (r.createdBy !== currentUser.name) return false;
      }

      if (r.mode !== tallyTypeFilter) return false;
      const matchVessel = !filterVesselId || r.vesselId === filterVesselId;
      const owner = getOwner(r);
      const matchOwner = !filterOwner || owner === filterOwner;
      const matchStatus = !filterStatus || r.status === filterStatus;
      let matchDate = true;
      if (fromDate || toDate) {
        const reportDate = new Date(r.workDate).getTime();
        if (fromDate && reportDate < new Date(fromDate).getTime()) matchDate = false;
        if (toDate && reportDate > new Date(toDate).getTime()) matchDate = false;
      }
      return matchVessel && matchOwner && matchDate && matchStatus;
    });
  }, [reports, tallyTypeFilter, filterVesselId, filterOwner, filterStatus, fromDate, toDate, vessels, currentUser]);

  const filteredWOs = useMemo(() => {
    return workOrders.filter(wo => {
      // 1. User Permission Filter
      if (currentUser && currentUser.role === 'INSPECTOR') {
        if (wo.createdBy !== currentUser.name) return false;
      }

      if (wo.type !== woFilter) return false;
      const relatedTally = reports.find(r => r.id === wo.tallyId);
      if (!relatedTally) return false;
      let matchDate = true;
      const reportDateObj = new Date(relatedTally.workDate);
      const reportDateTs = reportDateObj.getTime();
      if (woMonth) {
        const monthYear = woMonth.split('-');
        const rYear = reportDateObj.getFullYear();
        const rMonth = reportDateObj.getMonth() + 1;
        if (parseInt(monthYear[0]) !== rYear || parseInt(monthYear[1]) !== rMonth) matchDate = false;
      }
      if (woFromDate && reportDateTs < new Date(woFromDate).getTime()) matchDate = false;
      if (woToDate && reportDateTs > new Date(woToDate).getTime()) matchDate = false;
      return matchDate;
    });
  }, [workOrders, woFilter, reports, woMonth, woFromDate, woToDate, currentUser]);

  // PDF Export Logic
  const handleExportTallyPDF = async (items: TallyReport[], isBatch: boolean) => {
    if (items.length === 0) return;
    setGenerating(true);
    setPdfTallyList(items);

    // Give React time to render the hidden container
    setTimeout(async () => {
      if (pdfTallyRef.current) {
        const filename = isBatch
          ? `Tally_Batch_${tallyTypeFilter}_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.pdf`
          : `Tally_Report_${items[0].items?.[0]?.contNo?.replace(/[/\\?%*:|"<>]/g, '-') || items[0].id}.pdf`;

        try {
          // Tally is Portrait
          await generatePdf(pdfTallyRef.current, filename, 'portrait');
        } catch (error) {
          console.error("PDF Gen Error:", error);
          alert("Lỗi tạo PDF");
        }
      }
      setGenerating(false);
      setPdfTallyList([]); // Cleanup
    }, 500);
  };

  const handleExportWOPDF = async (items: WorkOrder[], isBatch: boolean) => {
    if (items.length === 0) return;
    setGenerating(true);
    setPdfWOList(items);

    setTimeout(async () => {
      if (pdfWORef.current) {
        const filename = isBatch
          ? `PhieuCT_Batch_${woFilter}_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.pdf`
          : `Phieu_Cong_Tac_${items[0].id}.pdf`;

        try {
          // WO is Landscape
          await generatePdf(pdfWORef.current, filename, 'landscape');
        } catch (error) {
          console.error("PDF Gen Error:", error);
          alert("Lỗi tạo PDF");
        }
      }
      setGenerating(false);
      setPdfWOList([]); // Cleanup
    }, 500);
  };

  const handlePrintAll = () => {
    handleExportTallyPDF(filteredReports, true);
  };

  const handlePrintAllWO = () => {
    handleExportWOPDF(filteredWOs, true);
  };

  const handlePrintFromPreview = () => {
    if (previewReport) {
      handleExportTallyPDF([previewReport], false);
    } else if (previewWO) {
      handleExportWOPDF([previewWO], false);
    }
  };

  // Preview Handlers
  const handleOpenPreview = (e: React.MouseEvent, report: TallyReport) => {
    e.stopPropagation();
    setPreviewWO(null);
    setPreviewReport(report);
    setIsPreviewing(true);
  };

  const handleOpenWOPreview = (e: React.MouseEvent, wo: WorkOrder) => {
    e.stopPropagation();
    setPreviewReport(null);
    setPreviewWO(wo);
    setIsPreviewing(true);
  };

  const handleClosePreview = () => {
    setIsPreviewing(false);
    setPreviewReport(null);
    setPreviewWO(null);
  };

  return (
    <div className="space-y-4 animate-fade-in pb-20">
      {mode === 'TALLY' ? (
        <>
          <div className="flex bg-gray-100 p-1 rounded-2xl print:hidden max-w-md mx-auto">
            <button onClick={() => setTallyTypeFilter('NHAP')} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${tallyTypeFilter === 'NHAP' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}>Tally Hàng Nhập</button>
            <button onClick={() => setTallyTypeFilter('XUAT')} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${tallyTypeFilter === 'XUAT' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>Tally Hàng Xuất</button>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-blue-50 space-y-4 print:hidden">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" /></svg>
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Bộ lọc tìm kiếm</span>
              </div>
              {filteredReports.length > 0 && (
                <button
                  onClick={handlePrintAll}
                  disabled={generating}
                  className="flex items-center gap-1 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase shadow-sm active:scale-95 transition-all disabled:opacity-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                  {generating ? 'ĐANG TẠO PDF...' : 'TẠO PDF HÀNG LOẠT'}
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div><label className="text-[9px] font-black text-gray-400 uppercase ml-1">Trạng thái</label><select className="w-full p-2.5 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-bold outline-none" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}><option value="">Tất cả trạng thái</option><option value="NHAP">Bản nháp</option><option value="CHUA_DUYET">Chưa duyệt</option><option value="DA_DUYET">Đã duyệt</option></select></div>
              <div><label className="text-[9px] font-black text-gray-400 uppercase ml-1">Tên Tàu</label><select className="w-full p-2.5 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-bold outline-none" value={filterVesselId} onChange={e => setFilterVesselId(e.target.value)}><option value="">Tất cả tàu</option>{vessels.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></div>
              <div><label className="text-[9px] font-black text-gray-400 uppercase ml-1">Khách hàng</label><select className="w-full p-2.5 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-bold outline-none" value={filterOwner} onChange={e => setFilterOwner(e.target.value)}><option value="">Tất cả khách</option>{owners.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
              <div><label className="text-[9px] font-black text-gray-400 uppercase ml-1">Từ ngày</label><input type="date" className="w-full p-2.5 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-bold outline-none" value={fromDate} onChange={e => setFromDate(e.target.value)} /></div>
              <div><label className="text-[9px] font-black text-gray-400 uppercase ml-1">Đến ngày</label><input type="date" className="w-full p-2.5 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-bold outline-none" value={toDate} onChange={e => setToDate(e.target.value)} /></div>
            </div>
          </div>

          <div className="print:hidden grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className={`bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-3 relative overflow-hidden transition-all hover:shadow-md hover:border-blue-100 ${report.status === 'NHAP' ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                onClick={() => {
                  if (report.status === 'NHAP' && onEditTally) {
                    onEditTally(report);
                  }
                }}
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h4 className="font-black text-blue-900 text-sm uppercase">{vessels.find(v => v.id === report.vesselId)?.name || 'TÀU S30'}</h4>
                    <h5 className="font-bold text-gray-800 text-sm leading-tight">{getOwner(report)}</h5>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight ${report.status === 'DA_DUYET' ? 'bg-green-100 text-green-700' :
                      (report.status === 'NHAP' ? 'bg-gray-100 text-gray-600' : 'bg-amber-100 text-amber-700')
                      }`}>
                      {report.status === 'DA_DUYET' ? 'Đã duyệt' : (report.status === 'NHAP' ? 'Bản nháp' : 'Chưa duyệt')}
                    </div>
                    <button onClick={(e) => handleOpenPreview(e, report)} className="p-2 bg-blue-600 text-white rounded-xl shadow-md active:scale-90 transition-all hover:bg-blue-700"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg></button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50">
                  <div className="flex flex-col"><span className="text-[9px] font-bold text-gray-400 uppercase">Ca làm việc</span><span className="text-xs font-black text-gray-700">CA {report.shift}</span></div>
                  <div className="flex flex-col text-right"><span className="text-[9px] font-bold text-gray-400 uppercase">Ngày thực hiện</span><span className="text-xs font-black text-gray-700">{report.workDate}</span></div>
                </div>
                {report.status === 'NHAP' && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-white/60 transition-opacity backdrop-blur-[1px]">
                    <span className="bg-blue-600 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase shadow-lg">Tiếp tục chỉnh sửa</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="flex bg-gray-100 p-1 rounded-2xl print:hidden max-w-md mx-auto">
            <button onClick={() => setWoFilter(WorkOrderType.LABOR)} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${woFilter === WorkOrderType.LABOR ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400'}`}>Công nhân</button>
            <button onClick={() => setWoFilter(WorkOrderType.MECHANICAL)} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${woFilter === WorkOrderType.MECHANICAL ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-400'}`}>Cơ giới</button>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-4 print:hidden">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" /></svg>
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Bộ lọc phiếu công tác</span>
              </div>
              {filteredWOs.length > 0 && (
                <button
                  onClick={handlePrintAllWO}
                  disabled={generating}
                  className="flex items-center gap-1 bg-gray-50 text-gray-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase shadow-sm active:scale-95 transition-all disabled:opacity-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                  {generating ? 'ĐANG TẠO PDF...' : 'TẠO PDF HÀNG LOẠT'}
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="col-span-2 md:col-span-1"><label className="text-[9px] font-black text-gray-400 uppercase ml-1">Chọn Tháng</label><input type="month" className="w-full p-2.5 bg-gray-100/50 border border-gray-100 rounded-xl text-[11px] font-bold outline-none" value={woMonth} onChange={e => setWoMonth(e.target.value)} /></div>
              <div><label className="text-[9px] font-black text-gray-400 uppercase ml-1">Từ ngày</label><input type="date" className="w-full p-2.5 bg-gray-100/50 border border-gray-100 rounded-xl text-[11px] font-bold outline-none" value={woFromDate} onChange={e => setWoFromDate(e.target.value)} /></div>
              <div><label className="text-[9px] font-black text-gray-400 uppercase ml-1">Đến ngày</label><input type="date" className="w-full p-2.5 bg-gray-100/50 border border-gray-100 rounded-xl text-[11px] font-bold outline-none" value={woToDate} onChange={e => setWoToDate(e.target.value)} /></div>
            </div>
          </div>

          <div className="print:hidden grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWOs.map((wo) => {
              const relatedTally = reports.find(r => r.id === wo.tallyId);
              return (
                <div key={wo.id} className="bg-white rounded-[1.8rem] p-5 shadow-sm border border-gray-100 transition-all hover:shadow-md hover:border-green-100">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${woFilter === WorkOrderType.LABOR ? 'bg-green-500' : 'bg-orange-500'}`}></span>
                      <span className="text-[10px] font-black text-gray-400 uppercase">{vessels.find(v => v.id === relatedTally?.vesselId)?.name || 'N/A'}</span>
                    </div>
                    <button onClick={(e) => handleOpenWOPreview(e, wo)} className="w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-500 rounded-full shadow-sm active:scale-90 transition-all hover:bg-gray-200">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-0.5">
                      <span className="text-[8.5px] font-black text-gray-400 uppercase block tracking-widest">Ca làm</span>
                      <span className="text-[13px] font-black text-gray-900 uppercase">CA {relatedTally?.shift || '---'}</span>
                    </div>
                    <div className="space-y-0.5 text-right">
                      <span className="text-[8.5px] font-black text-gray-400 uppercase block tracking-widest">Ngày làm</span>
                      <span className="text-[13px] font-black text-gray-900">{relatedTally?.workDate || '---'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* HIDDEN PRINT CONTAINERS FOR PDF GENERATION */}

      {/* 1. Tally Container (Portrait) */}
      <div className="fixed top-0 left-0 -z-50 " style={{ width: '210mm', minHeight: '297mm', position: 'absolute', opacity: 0, pointerEvents: 'none' }}>
        <div ref={pdfTallyRef} className="flex flex-col">
          {pdfTallyList.map((report) => (
            <div key={report.id} className="print-page-break">
              <TallyPrintTemplate
                report={report}
                vessel={vessels.find(v => v.id === report.vesselId) || vessels[0]}
                containers={containers}
                isPreview={false}
              />
            </div>
          ))}
        </div>
      </div>

      {/* 2. WO Container (Landscape) */}
      <div className="fixed top-0 left-0 -z-50 " style={{ width: '297mm', minHeight: '210mm', position: 'absolute', opacity: 0, pointerEvents: 'none' }}>
        <div ref={pdfWORef} className="flex flex-col">
          {pdfWOList.map((wo) => {
            const report = reports.find(r => r.id === wo.tallyId);
            return report ? (
              <div key={wo.id} className="print-page-break">
                <WorkOrderPrintTemplate wo={wo} report={report} isPreview={false} />
              </div>
            ) : null;
          })}
        </div>
      </div>

      {/* PREVIEW MODAL */}
      {isPreviewing && (previewReport || previewWO) && (
        <div className="fixed inset-0 z-[100] bg-gray-900 overflow-y-auto print:hidden">
          <div className="sticky top-0 p-4 bg-gray-800 text-white flex justify-between items-center shadow-lg">
            <button onClick={handleClosePreview} className="flex items-center gap-2 text-sm font-bold uppercase tracking-tight hover:text-blue-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              QUAY LẠI
            </button>
            <div className="text-xs font-black text-gray-400 uppercase tracking-widest">
              {previewReport ? 'In Phiếu Tally' : 'In Phiếu Công tác'}
            </div>
            <button
              onClick={handlePrintFromPreview}
              disabled={generating}
              className="bg-blue-600 px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-blue-500 active:scale-95 transition-all disabled:opacity-50"
            >
              {generating ? 'ĐANG TẠO PDF...' : 'TẠO FILE PDF'}
            </button>
          </div>
          <div className="p-4 flex justify-center bg-gray-700 min-h-screen">
            {previewReport ? (
              <TallyPrintTemplate report={previewReport} vessel={vessels.find(v => v.id === previewReport.vesselId) || vessels[0]} containers={containers} isPreview={true} />
            ) : (
              reports.find(r => r.id === previewWO?.tallyId) && <WorkOrderPrintTemplate wo={previewWO!} report={reports.find(r => r.id === previewWO?.tallyId)!} isPreview={true} />
            )}
          </div>
        </div>
      )}

      <style>{`
        .print-page-break {
          page-break-after: always;
        }
      `}</style>
    </div>
  );
};

export default HistoryView;
