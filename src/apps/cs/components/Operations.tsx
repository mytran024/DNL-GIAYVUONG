
import React, { useState, useEffect } from 'react';
import { Container, ContainerStatus, DetentionConfig, UnitType, Vessel } from '../../../types/index';
import { ICONS } from '../constants';
import { checkDetentionStatus } from '../services/dataService';
import { StatusBadge } from './VesselImport';

interface OperationsProps {
  containers: Container[];
  vessels: Vessel[]; // New prop
  onUpdateContainers: (c: Container[]) => void;
  detentionConfig: DetentionConfig;
  onUpdateDetentionConfig: (config: DetentionConfig) => void;
  initialFilterStatus?: string; // New prop
  initialVesselId?: string; // New prop
}

// ... Toast interface

const Operations: React.FC<OperationsProps> = ({
  containers,
  vessels,
  onUpdateContainers,
  detentionConfig,
  onUpdateDetentionConfig,
  initialFilterStatus = 'ALL',
  initialVesselId = 'ALL'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>(initialFilterStatus);
  const [filterVesselId, setFilterVesselId] = useState<string>(initialVesselId);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [tempConfig, setTempConfig] = useState<DetentionConfig>({ ...detentionConfig });
  const [urgingIds, setUrgingIds] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);

  // React to prop changes (navigation from Dashboard)
  useEffect(() => {
    if (initialFilterStatus) setFilterStatus(initialFilterStatus);
    if (initialVesselId) setFilterVesselId(initialVesselId);
  }, [initialFilterStatus, initialVesselId]);

  // ... addToast function

  const filteredContainers = containers.filter(c => {
    const matchesSearch = c.containerNo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesVessel = filterVesselId === 'ALL' || c.vesselId === filterVesselId; // Vessel filter
    const isReady = !!(c.tkNhaVC && c.tkDnlOla);

    if (!matchesVessel) return false;

    if (filterStatus === 'NOT_STARTED') return matchesSearch && c.status !== ContainerStatus.COMPLETED && isReady;
    if (filterStatus === 'PENDING_DOCS') return matchesSearch && !isReady && c.status !== ContainerStatus.COMPLETED;
    if (filterStatus === 'URGENT_DET') return matchesSearch && checkDetentionStatus(c.detExpiry, detentionConfig) === 'urgent' && c.status !== ContainerStatus.COMPLETED;
    if (filterStatus === 'COMPLETED') return matchesSearch && c.status === ContainerStatus.COMPLETED;
    return matchesSearch;
  }).sort((a, b) => {
    // Priority 1: URGENT / WARNING (based on DET)
    const statusA = checkDetentionStatus(a.detExpiry, detentionConfig);
    const statusB = checkDetentionStatus(b.detExpiry, detentionConfig);

    // Assign score: Urgent = 3, Warning = 2, Safe = 1
    const scoreA = statusA === 'urgent' ? 3 : statusA === 'warning' ? 2 : 1;
    const scoreB = statusB === 'urgent' ? 3 : statusB === 'warning' ? 2 : 1;

    // Completed always last (-10)
    const finalScoreA = a.status === ContainerStatus.COMPLETED ? -10 : scoreA;
    const finalScoreB = b.status === ContainerStatus.COMPLETED ? -10 : scoreB;

    return finalScoreB - finalScoreA; // Higher score first
  });

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateDetentionConfig(tempConfig);
    setIsConfigOpen(false);
    addToast("Đã cập nhật cấu hình DET cảnh báo.");
  };

  const handleUrgeInspector = (containerId: string, containerNo: string) => {
    if (urgingIds.has(containerId)) return;

    // Hiệu ứng gửi lệnh
    setUrgingIds(prev => new Set(prev).add(containerId));

    // Giả lập độ trễ kết nối mạng đến thiết bị hiện trường
    setTimeout(() => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

      onUpdateContainers(containers.map(c =>
        c.id === containerId ? { ...c, lastUrgedAt: now.toISOString() } : c
      ));

      setUrgingIds(prev => {
        const next = new Set(prev);
        next.delete(containerId);
        return next;
      });

      addToast(`Đã đôn đốc ${containerNo} gửi tới Kiểm viên (Lúc ${timeStr})`, 'success');
    }, 1200);
  };

  return (
    <div className="space-y-4 animate-fadeIn text-left relative">
      {/* Toast Notification Container */}
      <div className="fixed top-6 right-6 z-[200] space-y-3 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto animate-slideInRight bg-white border-l-4 border-blue-500 shadow-2xl rounded-xl p-4 flex items-center gap-3 min-w-[320px] max-w-md">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              {toast.type === 'success' ? <ICONS.CheckCircle className="w-5 h-5" /> : <ICONS.AlertTriangle className="w-5 h-5" />}
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-black uppercase text-slate-400 tracking-widest mb-0.5">Thông báo hệ thống</p>
              <p className="text-[13px] font-bold text-slate-800 leading-tight">{toast.message}</p>
            </div>
            <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="text-slate-300 hover:text-slate-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
        ))}
      </div>

      {/* Header Section */}
      <div className="flex items-center justify-between mb-4 no-print">
        <div className="flex items-center gap-2.5">
          <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">LỊCH SỬ KHAI THÁC</h2>
        </div>

        <button
          onClick={() => {
            setTempConfig({ ...detentionConfig });
            setIsConfigOpen(true);
          }}
          className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          Cấu hình DET
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-2 rounded-xl border border-gray-100 shadow-sm flex flex-wrap gap-4 items-center mb-6 no-print">
        {/* Search - Smaller width, White Background */}
        <div className="w-[200px] relative">
          <input
            type="text"
            placeholder="Tìm số hiệu..."
            className="w-full bg-white border border-slate-200 rounded-lg py-2.5 pl-9 pr-3 font-bold text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-50 outline-none transition-all text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        </div>

        {/* Stats - Compact & Next to search */}
        <div className="flex items-center px-2">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1.5 ml-0.5">TỔNG SỐ CONTAINER</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-800 leading-none">{filteredContainers.length}</span>
              <span className="text-xs font-bold text-slate-400">/ {containers.length} Cont</span>
            </div>
          </div>
        </div>

        {/* Spacer to push Select to right */}
        <div className="flex-1"></div>

        {/* Vessel Filter */}
        <select
          value={filterVesselId}
          onChange={(e) => setFilterVesselId(e.target.value)}
          className="bg-gray-50 border border-gray-100 rounded-lg py-2 px-4 text-sm font-bold text-gray-600 outline-none focus:bg-white focus:border-blue-500 max-w-[200px]"
        >
          <option value="ALL">Tất cả tàu</option>
          {vessels.map(v => (
            <option key={v.id} value={v.id}>
              {v.vesselName}{v.voyageNo && v.voyageNo !== 'N/A' ? ` - ${v.voyageNo}` : ''}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-gray-50 border border-gray-100 rounded-lg py-2 px-4 text-sm font-bold text-gray-600 outline-none focus:bg-white focus:border-blue-500"
        >
          <option value="ALL">Tất cả container</option>
          <option value="NOT_STARTED">Sẵn sàng khai thác</option>
          <option value="PENDING_DOCS">Chưa đủ tờ khai</option>
          <option value="URGENT_DET">Hạn DET khẩn cấp</option>
          <option value="COMPLETED">Đã hoàn tất</option>
        </select>
      </div>

      {/* Config Modal */}
      {isConfigOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-slideUp">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black text-slate-800 uppercase tracking-tight text-[12px]">CÀI ĐẶT CẢNH BÁO DET</h3>
              <button onClick={() => setIsConfigOpen(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="p-8 space-y-6">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Mức khẩn cấp (Ngày)</label>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-8 bg-red-500 rounded-full"></div>
                  <input
                    type="number"
                    min="1"
                    className="flex-1 border border-slate-100 rounded-xl p-3 font-black text-slate-800 focus:border-red-400 focus:ring-4 focus:ring-red-50 outline-none transition-all"
                    value={tempConfig.urgentDays}
                    onChange={(e) => setTempConfig({ ...tempConfig, urgentDays: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Mức cảnh báo (Ngày)</label>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-8 bg-amber-500 rounded-full"></div>
                  <input
                    type="number"
                    min="1"
                    className="flex-1 border border-slate-100 rounded-xl p-3 font-black text-slate-800 focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all"
                    value={tempConfig.warningDays}
                    onChange={(e) => setTempConfig({ ...tempConfig, warningDays: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all active:scale-[0.97]"
              >
                LƯU CẤU HÌNH
              </button>
            </form>
          </div>
        </div>
      )}

      {/* List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredContainers.map(c => {
          const detStatus = checkDetentionStatus(c.detExpiry, detentionConfig);
          const isUrgent = detStatus === 'urgent' && c.status !== ContainerStatus.COMPLETED;
          const isWarning = detStatus === 'warning' && c.status !== ContainerStatus.COMPLETED;
          const isUrging = urgingIds.has(c.id);

          return (
            <div
              key={c.id}
              className={`bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-wrap items-center justify-between transition-all hover:shadow-md relative
                ${isUrgent ? 'border-l-4 border-l-red-500' : isWarning ? 'border-l-4 border-l-amber-500' : 'border-l-4 border-l-blue-100'}
              `}
            >
              <div className="flex-1 min-w-[300px]">
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                      {c.unitType === UnitType.VEHICLE ? 'BIỂN SỐ XE / RƠ-MOÓC' : 'SỐ HIỆU CONTAINER'}
                    </span>
                    <h4 className="text-xl font-black text-slate-800 tracking-tight leading-none">{c.containerNo}</h4>
                  </div>
                  <StatusBadge status={c.status} />

                  {c.lastUrgedAt && c.status !== ContainerStatus.COMPLETED && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full border border-amber-100">
                      <span className="animate-pulse w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      <span className="text-[8px] font-black uppercase tracking-tighter">
                        Đã đôn đốc lúc {new Date(c.lastUrgedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-x-6 text-[10px] font-bold uppercase">
                  <div>
                    <span className="text-[8px] text-slate-400 block mb-0.5">SỐ SEAL</span>
                    <span className="text-slate-700 font-mono truncate block max-w-[100px]">{c.sealNo || 'TRỐNG'}</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-slate-400 block mb-0.5">TỜ KHAI VC</span>
                    <span className={c.tkNhaVC ? 'text-emerald-500 font-black' : 'text-red-400'}>{c.tkNhaVC || 'TRỐNG'}</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-slate-400 block mb-0.5">TỜ KHAI OLA</span>
                    <span className={c.tkDnlOla ? 'text-emerald-500 font-black' : 'text-red-400'}>{c.tkDnlOla || 'TRỐNG'}</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-slate-400 block mb-0.5">HẠN DET</span>
                    <span className={`font-black ${isUrgent ? 'text-red-600 border-b border-red-500' : isWarning ? 'text-amber-600' : 'text-slate-700'}`}>
                      {isNaN(new Date(c.detExpiry).getTime()) ? 'INVALID DATE' : new Date(c.detExpiry).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                </div>

                {c.status === ContainerStatus.COMPLETED && (
                  <div className="mt-3 flex flex-col items-start gap-1">
                    <div className="bg-[#e6fffa] text-[#2c7a7b] px-3 py-1 rounded-lg text-[9px] font-black uppercase flex items-center gap-1.5 border border-[#b2f5ea]">
                      <ICONS.CheckCircle className="w-3.5 h-3.5" /> ĐÃ KHAI THÁC
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-8">
                <div className="text-right">
                  <p className="text-xl font-black text-slate-800">{c.pkgs} <span className="text-[10px] text-slate-400 ml-0.5 font-bold uppercase">Kiện</span></p>
                  <p className="text-xs font-black text-blue-500">{c.weight.toFixed(1)} Tấn</p>
                </div>

                {c.status !== ContainerStatus.COMPLETED && (isUrgent || isWarning) && (
                  <button
                    onClick={() => handleUrgeInspector(c.id, c.containerNo)}
                    disabled={isUrging}
                    className={`min-w-[120px] px-5 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2.5 shadow-md transition-all active:scale-95 no-print
                      ${isUrging ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' : 'bg-[#e57373] text-white hover:bg-red-500'}
                    `}
                  >
                    {isUrging ? (
                      <>
                        <svg className="animate-spin h-3.5 w-3.5 text-slate-400" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        GỬI...
                      </>
                    ) : (
                      <><ICONS.AlertTriangle className="w-4 h-4" /> ĐÔN ĐỐC</>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {filteredContainers.length === 0 && (
          <div className="py-20 text-center text-slate-300 font-bold italic uppercase tracking-widest text-sm">
            Không tìm thấy dữ liệu phù hợp
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(100%); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slideInRight {
          animation: slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  );
};

export default Operations;
