import * as XLSX from 'xlsx';
import React, { useState, useRef, useEffect } from 'react';
import { Vessel, Container, ContainerStatus, UnitType } from '../../../types/index';
import { ICONS } from '../constants';
import { processImportData, displayDate, generateTemplate } from '../services/dataService';

export const StatusBadge: React.FC<{ status: ContainerStatus }> = ({ status }) => {
  const configs = {
    [ContainerStatus.PENDING]: { label: 'Chờ tờ khai', class: 'bg-slate-100 text-slate-600 border-slate-200' },
    [ContainerStatus.READY]: { label: 'Sẵn sàng', class: 'bg-blue-50 text-blue-600 border-blue-200' },
    [ContainerStatus.IN_PROGRESS]: { label: 'Đang khai thác', class: 'bg-amber-50 text-amber-600 border-amber-200' },
    [ContainerStatus.COMPLETED]: { label: 'Hoàn tất', class: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  };

  const config = configs[status];

  return (
    <div className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${config.class}`}>
      {config.label}
    </div>
  );
};

interface ColumnConfig {
  id: string;
  label: string;
  width: number;
  visible: boolean;
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'stt', label: 'STT', width: 60, visible: true },
  { id: 'ngayKeHoach', label: 'Ngày Kế hoạch', width: 140, visible: true },
  { id: 'containerNo', label: 'Số hiệu Cont', width: 180, visible: true },
  { id: 'sealNo', label: 'Số Seal', width: 140, visible: true },
  { id: 'tkNhaVC', label: 'Số TK Nhà VC', width: 140, visible: true },
  { id: 'ngayTkNhaVC', label: 'Ngày TK Nhà VC', width: 140, visible: true },
  { id: 'tkDnlOla', label: 'Số TK DNL', width: 140, visible: true },
  { id: 'ngayTkDnl', label: 'Ngày TK DNL', width: 140, visible: true },
  { id: 'pkgs', label: 'Số kiện', width: 100, visible: true },
  { id: 'weight', label: 'Số tấn', width: 100, visible: true },
  { id: 'vendor', label: 'Vendor', width: 160, visible: true },
  { id: 'detExpiry', label: 'Hạn DET', width: 140, visible: true },
  { id: 'noiHaRong', label: 'Nơi hạ rỗng', width: 160, visible: true },
];

interface VesselImportProps {
  vessels: Vessel[];
  onUpdateVessels: (v: Vessel[]) => Promise<void>;
  containers: Container[];
  onUpdateContainers: (c: Container[]) => Promise<void>;
}

const VesselImport: React.FC<VesselImportProps> = ({ vessels, onUpdateVessels, containers, onUpdateContainers }) => {
  const [selectedVesselId, setSelectedVesselId] = useState<string>(vessels[0]?.id || '');
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    const saved = localStorage.getItem('danalog_vessel_columns');
    return saved ? JSON.parse(saved) : DEFAULT_COLUMNS;
  });
  const [resizingCol, setResizingCol] = useState<{ id: string, startX: number, startWidth: number } | null>(null);
  const [draggingColId, setDraggingColId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('danalog_vessel_columns', JSON.stringify(columns));
  }, [columns]);

  // Resize Effect to handle mouse events globally
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingCol) return;
      const diff = e.clientX - resizingCol.startX;
      const newWidth = Math.max(50, resizingCol.startWidth + diff);
      setColumns(prev => prev.map(c => c.id === resizingCol.id ? { ...c, width: newWidth } : c));
    };

    const handleMouseUp = () => {
      setResizingCol(null);
    };

    if (resizingCol) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingCol]);

  const [newVesselData, setNewVesselData] = useState({
    name: '',
    commodity: 'Bột giấy đã nén dạng tấm, hàng mới 100%',
    consignee: ''
  });

  const handleCreateVessel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVesselData.name || !newVesselData.consignee) {
      alert("Vui lòng nhập đầy đủ Tên tàu và Chủ hàng!");
      return;
    }

    const newVessel: Vessel = {
      id: `v_${Math.random().toString(36).substr(2, 5)}`,
      vesselName: newVesselData.name.toUpperCase(),
      voyageNo: 'N/A',
      commodity: newVesselData.commodity,
      consignee: newVesselData.consignee,
      totalContainers: 0,
      totalPkgs: 0,
      totalWeight: 0
    };

    try {
      await onUpdateVessels([...vessels, newVessel]);
      // Update filters to match new vessel
      setFilterConsignee(newVessel.consignee);
      setFilterVesselName(newVessel.vesselName);
      setSelectedVesselId(newVessel.id); // This will sync with effect

      setShowCreateModal(false);
      setNewVesselData({ name: '', commodity: 'Bột giấy đã nén dạng tấm, hàng mới 100%', consignee: '' });
    } catch (error: any) {
      console.error('Lỗi khi lưu tàu mới:', error);
      alert(`Không thể lưu tàu mới vào database.\n\nLỗi: ${error?.message || 'Unknown error'}`);
    }
  };

  // Get unique consignees for datalist
  const uniqueConsignees = Array.from(new Set(vessels.map(v => v.consignee))).filter(Boolean).sort();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit increased to 50MB to handle bloated files
    if (file.size > 50 * 1024 * 1024) {
      alert("File quá lớn (> 50MB). Vui lòng chia nhỏ file.");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsImporting(true);
    setImportProgress(10); // Start progress

    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) {
          throw new Error("File content is empty");
        }
        // Use readAsArrayBuffer is more robust
        // OPTIMIZATION: dense: true reduces memory usage significantly
        const wb = XLSX.read(data, { type: 'array', dense: true });

        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];

        // Debug Range
        console.log("Sheet Range:", ws['!ref']);

        const rows = XLSX.utils.sheet_to_json(ws);

        setImportProgress(60);

        // Calculate Process
        setTimeout(async () => {
          try {
            // Process Data
            const safeContainers = Array.isArray(containers) ? containers : [];
            const { containers: processed, summary } = processImportData(rows, selectedVesselId, safeContainers);

            // Wait for both updates to complete
            await onUpdateContainers([
              ...safeContainers.filter(c => c.vesselId !== selectedVesselId),
              ...processed
            ]);

            await onUpdateVessels(vessels.map(v => v.id === selectedVesselId ? {
              ...v,
              totalContainers: processed.length,
              totalPkgs: summary.totalPkgs,
              totalWeight: summary.totalWeight
            } : v));

            setImportProgress(100);

            setTimeout(() => {
              setIsImporting(false);
              setImportProgress(0);
              alert(`Đã cập nhật ${processed.length} dòng dữ liệu thành công!`);
            }, 500);

          } catch (processError: any) {
            console.error("=== IMPORT ERROR DETAILS ===");
            console.error("Error Type:", processError?.name);
            console.error("Error Message:", processError?.message);
            console.error("Error Stack:", processError?.stack);
            console.error("Full Error:", JSON.stringify(processError, Object.getOwnPropertyNames(processError)));
            alert(`Lỗi: Không thể lưu dữ liệu vào hệ thống.\n\nChi tiết: ${processError?.message || 'Unknown error'}\n\nVui lòng kiểm tra Console (F12) để biết thêm thông tin.`);
            setIsImporting(false);
          }
        }, 100);

      } catch (error) {
        console.error("Read Error", error);
        alert("Lỗi khi đọc file Excel. File có thể bị lỗi.");
        setIsImporting(false);
      }
    };

    reader.onerror = () => {
      alert("Lỗi không thể đọc file.");
      setIsImporting(false);
    };

    reader.readAsArrayBuffer(file);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const triggerFileInput = () => {
    if (!selectedVesselId) {
      alert("Vui lòng chọn chuyến tàu trước khi Import!");
      return;
    }
    fileInputRef.current?.click();
  };

  const handleDownloadTemplate = () => {
    generateTemplate();
  };

  const handleResizeStart = (e: React.MouseEvent, colId: string, currentWidth: number) => {
    e.preventDefault();
    e.stopPropagation(); // Ngăn không cho Drag & Drop bắt đầu
    setResizingCol({ id: colId, startX: e.clientX, startWidth: currentWidth });
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    // Nếu đang resize thì không cho drag
    if (resizingCol) {
      e.preventDefault();
      return;
    }
    setDraggingColId(id);
    e.dataTransfer.setData('colId', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (draggingColId === targetId) return;

    setColumns(prev => {
      const oldIndex = prev.findIndex(c => c.id === draggingColId);
      const newIndex = prev.findIndex(c => c.id === targetId);
      const newCols = [...prev];
      const [movedItem] = newCols.splice(oldIndex, 1);
      newCols.splice(newIndex, 0, movedItem);
      return newCols;
    });
  };

  const handleDragEnd = () => {
    setDraggingColId(null);
  };

  const renderCellContent = (c: Container, colId: string, index: number) => {
    switch (colId) {
      case 'stt': return index + 1;
      case 'ngayKeHoach': return displayDate(c.ngayKeHoach);
      case 'containerNo': return (
        <div className="flex items-center gap-1.5 truncate">
          {c.unitType === UnitType.VEHICLE ? <ICONS.Package className="w-3 h-3 text-amber-500 shrink-0" /> : <ICONS.Ship className="w-3 h-3 text-blue-500 shrink-0" />}
          {c.containerNo}
        </div>
      );
      case 'sealNo': return c.sealNo;
      case 'tkNhaVC': return c.tkNhaVC || '-';
      case 'ngayTkNhaVC': return displayDate(c.ngayTkNhaVC);
      case 'tkDnlOla': return c.tkDnlOla || '-';
      case 'ngayTkDnl': return displayDate(c.ngayTkDnl);
      case 'pkgs': return c.pkgs;
      case 'weight': return c.weight.toFixed(1);
      case 'vendor': return c.vendor;
      case 'detExpiry': return displayDate(c.detExpiry);
      case 'noiHaRong': return c.noiHaRong || '-';
      default: return null;
    }
  };

  /* New Filtering State Logic */
  // Initialize from props if available
  const [filterConsignee, setFilterConsignee] = useState<string>('');
  const [filterVesselName, setFilterVesselName] = useState<string>('');

  // Sync initial state when vessels load
  useEffect(() => {
    if (vessels.length > 0 && !selectedVesselId) {
      // Default select first one
      const first = vessels[0];
      setFilterConsignee(first.consignee);
      setFilterVesselName(first.vesselName);
      setSelectedVesselId(first.id);
    } else if (selectedVesselId) {
      // Reverse sync if ID is set externally or from prev state
      const current = vessels.find(v => v.id === selectedVesselId);
      if (current) {
        setFilterConsignee(current.consignee);
        setFilterVesselName(current.vesselName);
      }
    }
  }, [vessels, selectedVesselId]); // Run when vessels change or initial ID setup

  // Derived current vessel based on FILTERS, not just ID
  const currentVessel = vessels.find(v =>
    v.consignee === filterConsignee &&
    v.vesselName === filterVesselName
  );

  // Effect: When resolved vessel changes, update the main ID
  useEffect(() => {
    if (currentVessel && currentVessel.id !== selectedVesselId) {
      setSelectedVesselId(currentVessel.id);
    }
    // If filters don't match any vessel (e.g. valid name but wrong consignee), selectedId remains partially stale or we can clear it.
    // Better to clear it to avoid "ghost" data.
    if (!currentVessel && selectedVesselId) {
      setSelectedVesselId('');
    }
  }, [currentVessel, selectedVesselId]);


  // Calculate derivative data for render
  const vesselContainers = containers.filter(c => c.vesselId === selectedVesselId);
  const totalWidth = columns.reduce((s, c) => s + c.width, 0);

  return (
    <div className="space-y-4 animate-fadeIn relative text-left">
      <div className="bg-white p-4 md:p-6 rounded-[1.5rem] shadow-sm border border-slate-100 no-print">
        <div className="flex flex-col items-center gap-3">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn chuyến tàu làm việc</label>
          <div className="flex flex-wrap items-center justify-center gap-2.5 w-full">
            {/* Two-way Filtering Controls */}
            <div className="flex gap-2 min-w-[320px] max-w-xl flex-1">
              {/* Box 1: Consignee Select */}
              <div className="relative flex-1">
                <select
                  className="w-full border border-slate-100 rounded-xl py-2.5 px-3 font-bold text-slate-700 bg-slate-50/50 focus:bg-white focus:border-blue-500 outline-none transition-all appearance-none shadow-sm text-sm truncate"
                  value={filterConsignee}
                  onChange={(e) => {
                    const newConsignee = e.target.value;
                    setFilterConsignee(newConsignee);

                    // Smart Logic: Check if current vessel name exists for new consignee
                    // If not, clear vessel name to force re-selection
                    const exists = vessels.some(v => v.consignee === newConsignee && v.vesselName === filterVesselName);
                    if (!exists) {
                      // Try to auto-select if only 1 vessel for this consignee? 
                      // Or just pick the first one to be helpful
                      const firstForConsignee = vessels.find(v => v.consignee === newConsignee);
                      if (firstForConsignee) {
                        setFilterVesselName(firstForConsignee.vesselName);
                      } else {
                        setFilterVesselName('');
                      }
                    }
                  }}
                >
                  <option value="">-- Chọn Chủ Hàng --</option>
                  {Array.from(new Set(vessels.map(v => v.consignee))).filter(Boolean).sort().map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                  <ICONS.User className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Box 2: Vessel Name Select */}
              <div className="relative flex-1">
                <select
                  className="w-full border border-slate-100 rounded-xl py-2.5 px-3 font-bold text-slate-700 bg-slate-50/50 focus:bg-white focus:border-blue-500 outline-none transition-all appearance-none shadow-sm text-sm truncate"
                  value={filterVesselName}
                  onChange={(e) => {
                    const newName = e.target.value;
                    setFilterVesselName(newName);

                    // Smart Logic: If consignee is not set, or current consignee doesn't own this vessel
                    // Auto-switching consignee if unique
                    const owners = vessels.filter(v => v.vesselName === newName).map(v => v.consignee);
                    const uniqueOwners = [...new Set(owners)];

                    if (uniqueOwners.length === 1) {
                      // Only 1 owner for this vessel name, auto-select
                      setFilterConsignee(uniqueOwners[0]);
                    } else {
                      // Multiple owners (Name Collision)
                      // If current consignee is valid for this vessel, keep it.
                      // If not, we might need to reset consignee or warn user. 
                      // For now, let's keep consignee if valid, else reset to force choice.
                      if (!uniqueOwners.includes(filterConsignee)) {
                        // Current consignee doesn't own this new vessel name. 
                        // Reset consignee to blank to make user choose "Which owner?"
                        // Or default to first one? Reset is safer to avoid confusion.
                        setFilterConsignee('');
                      }
                    }
                  }}
                >
                  <option value="">-- Chọn Tàu --</option>
                  {/* Show vessels filtered by consignee if selected, else all unique names */}
                  {Array.from(new Set(
                    vessels
                      .filter(v => !filterConsignee || v.consignee === filterConsignee)
                      .map(v => v.vesselName)
                  )).sort().map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                  <ICONS.Ship className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
            <button onClick={() => setShowCreateModal(true)} className="px-5 py-2.5 bg-[#4a4e5d] text-white rounded-xl hover:bg-slate-800 transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-sm shrink-0">
              <ICONS.Ship className="w-3.5 h-3.5 text-blue-300" /> Tạo tàu mới
            </button>
            <button onClick={handleDownloadTemplate} className="px-5 py-2.5 bg-slate-500 text-white rounded-xl hover:bg-slate-600 transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-sm shrink-0">
              <ICONS.FileText className="w-3.5 h-3.5 text-white" /> Tải Mẫu
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".xlsx,.xls,.csv" />
            <button onClick={triggerFileInput} disabled={!selectedVesselId || isImporting} className={`px-6 py-2.5 rounded-2xl transition-all font-black text-[11px] uppercase tracking-widest flex items-center gap-2.5 shadow-md active:scale-95 shrink-0 ${!selectedVesselId || isImporting ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' : 'bg-[#3B82F6] text-white hover:bg-blue-600 border border-blue-400/20'}`}>
              {isImporting ? <span className="flex items-center gap-2"><svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> IMPORTING {importProgress}%</span> : <><ICONS.FileText className="w-3.5 h-3.5 opacity-80" /> IMPORT EXCEL</>}
            </button>
          </div>
        </div>
      </div>   {showCreateModal && (
        <div className="fixed inset-0 bg-[#333a4d]/70 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-slideUp">
            <div className="p-6 flex justify-center items-center relative"><h3 className="font-black text-slate-800 uppercase tracking-tight text-[13px] text-center">THIẾT LẬP TÀU MỚI</h3><button onClick={() => setShowCreateModal(false)} className="absolute right-6 text-slate-300 hover:text-slate-500 transition active:scale-90"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg></button></div>
            <div className="h-px bg-slate-100 w-full"></div>
            <form onSubmit={handleCreateVessel} className="p-8 pt-6 space-y-6">
              <div><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">TÊN TÀU</label><input type="text" autoFocus className="w-full border border-blue-100 rounded-xl p-3.5 font-black text-slate-700 focus:border-blue-400 focus:ring-4 focus:ring-blue-50 outline-none uppercase bg-white transition-all placeholder:text-slate-300 text-sm" placeholder="VD: TOKYO EXPRESS" value={newVesselData.name} onChange={(e) => setNewVesselData({ ...newVesselData, name: e.target.value })} /></div>
              <div><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">TÊN HÀNG</label><input type="text" className="w-full border border-slate-100 rounded-xl p-3.5 font-bold text-slate-700 focus:border-blue-300 outline-none bg-slate-50/50 transition-all text-sm" placeholder="Nhập tên hàng hóa..." value={newVesselData.commodity} onChange={(e) => setNewVesselData({ ...newVesselData, commodity: e.target.value })} /></div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">CHỦ HÀNG <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  list="consignee-list"
                  className="w-full border border-slate-100 rounded-xl p-3.5 font-bold text-slate-700 focus:border-blue-300 outline-none bg-slate-50/50 transition-all text-sm"
                  placeholder="VD: SHIPCHANCO / LOGI SERVICE..."
                  value={newVesselData.consignee}
                  onChange={(e) => setNewVesselData({ ...newVesselData, consignee: e.target.value })}
                />
                <datalist id="consignee-list">
                  {Array.from(new Set(vessels.map(v => v.consignee))).filter(Boolean).sort().map(c => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div className="pt-1"><button type="submit" className="w-full py-4 bg-[#3B82F6] text-white rounded-xl font-black uppercase text-[11px] tracking-widest hover:bg-blue-600 shadow-md transition-all active:scale-[0.97]">XÁC NHẬN THIẾT LẬP</button></div>
            </form>
          </div>
        </div>
      )}

      {currentVessel ? (
        <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-100 overflow-hidden animate-slideUp">
          <div className="px-6 py-4 border-b border-slate-50 text-left flex justify-between items-end no-print">
            <div>
              <div className="flex items-center gap-2.5 mb-0.5"><div className="w-1 h-5 bg-blue-600 rounded-full"></div><h3 className="font-black text-slate-900 uppercase tracking-tight text-base">DỮ LIỆU TÀU: {currentVessel.vesselName}</h3></div>
              <div className="flex gap-5 mt-0.5 ml-3.5"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">HÀNG HÓA: <span className="text-slate-600">{currentVessel.commodity}</span></p><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">CHỦ HÀNG: <span className="text-blue-600 italic">{currentVessel.consignee}</span></p></div>
            </div>
            <div className="text-[9px] font-bold text-slate-400 italic">
              * Kéo tiêu đề cột để đổi thứ tự, kéo mép cột để đổi độ rộng
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar relative">
            <table className="min-w-full text-left text-[11px] border-collapse table-fixed" style={{ width: totalWidth > 0 ? totalWidth : '100%' }}>
              <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-100 sticky top-0 z-30 backdrop-blur-sm">
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col.id}
                      className={`relative px-3 py-3 font-black uppercase text-[8px] tracking-wider border-r border-slate-100 group cursor-move select-none ${draggingColId === col.id ? 'bg-blue-50 opacity-50' : ''}`}
                      style={{ width: col.width }}
                      draggable
                      onDragStart={(e) => handleDragStart(e, col.id)}
                      onDragOver={(e) => handleDragOver(e, col.id)}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate">{col.label}</span>
                        <div
                          className={`absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400 transition-colors z-40 no-print ${resizingCol?.id === col.id ? 'bg-blue-600' : ''}`}
                          onMouseDown={(e) => handleResizeStart(e, col.id, col.width)}
                        />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {vesselContainers.map((c, index) => (
                  <tr key={c.id} className="hover:bg-blue-50/30 transition-all group">
                    {columns.map((col) => {
                      const content = renderCellContent(c, col.id, index);
                      const isStt = col.id === 'stt';
                      const isNumber = col.id === 'pkgs' || col.id === 'weight';
                      const isHighLight = col.id === 'containerNo' || col.id === 'tkDnlOla' || col.id === 'detExpiry';

                      return (
                        <td
                          key={col.id}
                          className={`px-3 py-2.5 border-r border-slate-100 truncate ${isStt ? 'text-center font-black text-slate-400' : ''} ${isNumber ? 'text-center font-black text-slate-700' : ''} ${isHighLight ? 'font-black text-slate-900' : 'text-slate-600'} ${col.id === 'detExpiry' ? 'text-red-500' : ''} ${col.id === 'ngayKeHoach' ? 'text-blue-800' : ''}`}
                          style={{ width: col.width }}
                        >
                          {content}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {vesselContainers.length === 0 && (
                  <tr>
                    <td colSpan={columns.length} className="px-6 py-16 text-center text-slate-300 font-bold italic text-sm">Chưa có dữ liệu cho chuyến tàu này</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 8px; width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; border: 2px solid #f1f5f9; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        
        /* Fix for dragging ghost image */
        th[draggable="true"] {
          -webkit-user-drag: element;
        }
      `}</style>
    </div>
  );
};

export default VesselImport;
