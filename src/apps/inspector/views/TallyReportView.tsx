
import React, { useState, useEffect, useRef } from 'react';
import { Vessel, Shift, TallyReport, TallyItem } from '../../../types/inspector';
import { Container, ContainerStatus } from '../../../types/index';
import { ApiService } from '../../../services/api';
import TallyPrintTemplate from '../components/TallyPrintTemplate';

interface TallyReportViewProps {
  vessel: Vessel;
  shift: Shift;
  mode: 'NHAP' | 'XUAT';
  workDate: string;
  isHoliday: boolean;
  isWeekend: boolean;
  initialReport?: TallyReport;
  containers: Container[]; // Passed from parent
  onSave: (report: TallyReport, isDraft: boolean) => void;
  onFinish: () => void;
  onBack: () => void;
}

const TallyReportView: React.FC<TallyReportViewProps> = ({ vessel, shift, mode, workDate, isHoliday, isWeekend, initialReport, containers, onSave, onFinish, onBack }) => {
  const [subStep, setSubStep] = useState<1 | 2>(1);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [currentReport, setCurrentReport] = useState<Partial<TallyReport>>({
    vesselId: vessel.id,
    mode: mode,
    shift: shift,
    workDate: workDate,
    isHoliday: isHoliday,
    isWeekend: isWeekend,
    owner: (vessel as any).consignee || vessel.customerName || '',
    workerCount: 0,
    workerNames: '',
    mechanicalCount: 0,
    mechanicalNames: '',
    equipment: 'Hyster+Nâng+ĐK+Hyster',
    vehicleType: 'Xe nâng',
    vehicleNo: '',
    items: []
  });

  const [containerSearch, setContainerSearch] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Focus States for Suggestions
  const [activeWorkerInput, setActiveWorkerInput] = useState<number | null>(null);
  const [activeMechInput, setActiveMechInput] = useState<number | null>(null);

  // Dynamic Suggestions
  const [workerSuggestions, setWorkerSuggestions] = useState<string[]>([]);
  const [mechanicalSuggestions, setMechanicalSuggestions] = useState<string[]>([]);

  // New State for Containers from Backend
  const [availableContainers, setAvailableContainers] = useState<Container[]>([]);

  useEffect(() => {
    if (initialReport) {
      // Patch owner if missing (Auto-fix for legacy reports)
      const patchedOwner = initialReport.owner && initialReport.owner !== 'N/A'
        ? initialReport.owner
        : ((vessel as any).consignee || vessel.customerName || '');

      setCurrentReport({
        ...initialReport,
        owner: patchedOwner
      });
    }
  }, [initialReport, vessel]);

  // Load Containers on Mount
  // Load Containers from props and suggestions from API
  useEffect(() => {
    // Filter by Vessel ID matches
    const vesselContainers = containers.filter(c => c.vesselId === vessel.id);
    setAvailableContainers(vesselContainers);

    // Load Suggestions asynchronously
    const loadSuggestions = async () => {
      try {
        const [workers, teams] = await Promise.all([
          ApiService.getWorkers(),
          ApiService.getTeams()
        ]);
        // Extract names if they are objects, assuming getWorkers returns {id, name} objects
        setWorkerSuggestions(workers.map((w: any) => w.name));
        setMechanicalSuggestions(teams.map((t: any) => t.name));
      } catch (e) {
        console.error("Failed to load suggestions", e);
      }
    };
    loadSuggestions();
  }, [vessel.id, containers]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSearchContainers = availableContainers
    .filter(c => {
      const isAlreadyAdded = currentReport.items?.some(i => i.contId === c.id);
      const matchesSearch = c.containerNo.toLowerCase().includes(containerSearch.toLowerCase());
      const isCompleted = c.status === ContainerStatus.COMPLETED;
      return !isAlreadyAdded && matchesSearch && !isCompleted;
    })
    .sort((a, b) => {
      // Urging Logic: Urged containers first
      const urgedA = a.lastUrgedAt ? new Date(a.lastUrgedAt).getTime() : 0;
      const urgedB = b.lastUrgedAt ? new Date(b.lastUrgedAt).getTime() : 0;
      return urgedB - urgedA;
    });

  const addContainerToReport = (cont: Container) => {
    // Map Shared Container fields to check exploitability
    const isExploitable = cont.tkNhaVC && cont.tkDnlOla;
    if (!isExploitable) {
      alert("Container này chưa đủ tờ khai (Nhà VC & DNL). Không thể khai thác!");
      return;
    }

    const newItem: TallyItem = {
      contId: cont.id,
      contNo: cont.containerNo, // Shared uses containerNo
      commodityType: 'Giấy trắng có bọc',
      sealNo: cont.sealNo || '',
      actualUnits: cont.pkgs || 0, // Shared uses pkgs
      actualWeight: cont.weight || 0, // Shared uses weight
      isScratchedFloor: false,
      tornUnits: 0,
      notes: ''
    };
    setCurrentReport(prev => ({
      ...prev,
      items: [...(prev.items || []), newItem]
    }));
    setContainerSearch('');
    setShowResults(false);
  };

  const updateItem = (index: number, field: keyof TallyItem, value: any) => {
    const newItems = [...(currentReport.items || [])];
    newItems[index] = { ...newItems[index], [field]: value };
    setCurrentReport(prev => ({ ...prev, items: newItems }));
  };

  const validateInfo = (): boolean => {
    if (!currentReport.workerNames || currentReport.workerNames.trim() === '') {
      alert("Vui lòng nhập tên công nhân trước khi thực hiện!");
      return false;
    }
    if (!currentReport.items || currentReport.items.length === 0) {
      alert("Vui lòng chọn ít nhất một Container để khai thác!");
      return false;
    }
    return true;
  };

  const handlePrintRequest = () => {
    if (validateInfo()) {
      setIsPreviewing(true);

      // Đặt tên file thông minh
      const originalTitle = document.title;
      const cleanContNo = currentReport.items?.[0]?.contNo.replace(/[/\\?%*:|"<>]/g, '-') || 'Tally';
      document.title = `Phieu_Tally_${cleanContNo}`;

      // Kích hoạt in sau khi render preview
      setTimeout(() => {
        window.print();
        document.title = originalTitle;
      }, 500);
    }
  };

  const handleFinalSave = (isDraft: boolean) => {
    if (!isDraft && !validateInfo()) {
      return;
    }
    const report = {
      ...currentReport,
      id: currentReport.id || `PKH-${Date.now()}`,
      createdAt: currentReport.createdAt || Date.now(),
      status: isDraft ? 'NHAP' : 'CHUA_DUYET'
    } as TallyReport;
    onSave(report, isDraft);
  };

  const handleBack = () => {
    if (subStep === 2) {
      setSubStep(1);
    } else {
      onBack();
    }
  };

  const updateWorkerName = (index: number, value: string) => {
    const names = currentReport.workerNames ? currentReport.workerNames.split(', ') : [];
    while (names.length < (currentReport.workerCount || 0)) names.push('');
    names[index] = value;
    setCurrentReport({ ...currentReport, workerNames: names.slice(0, currentReport.workerCount).join(', ') });
  };

  const updateMechanicalName = (index: number, value: string) => {
    const names = currentReport.mechanicalNames ? currentReport.mechanicalNames.split(', ') : [];
    while (names.length < (currentReport.mechanicalCount || 0)) names.push('');
    names[index] = value;
    setCurrentReport({ ...currentReport, mechanicalNames: names.slice(0, currentReport.mechanicalCount).join(', ') });
  };

  if (isPreviewing) {
    return (
      <div className="fixed inset-0 z-[100] bg-gray-900 overflow-y-auto">
        <div className="sticky top-0 p-4 bg-gray-800 text-white flex justify-between items-center shadow-lg print:hidden">
          <button
            onClick={() => setIsPreviewing(false)}
            className="flex items-center gap-2 text-sm font-bold uppercase tracking-tight hover:text-blue-400"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            QUAY LẠI
          </button>
          <div className="text-xs font-black text-gray-400 uppercase tracking-widest">Xem trước PDF</div>
          <button
            onClick={() => window.print()}
            className="bg-blue-600 px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-blue-500 active:scale-95 transition-all"
          >
            IN LẠI
          </button>
        </div>
        <div className="p-4 flex justify-center bg-gray-700 min-h-screen">
          <TallyPrintTemplate
            report={currentReport as TallyReport}
            vessel={vessel}
            containers={availableContainers}
            isPreview={true}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-40 lg:pb-52">
      <div className="print:hidden space-y-6">
        <button
          onClick={handleBack}
          className="flex items-center gap-1 text-gray-400 font-black text-[11px] uppercase hover:text-blue-600 transition-all active:translate-x-[-4px]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
          </svg>
          TRỞ VỀ
        </button>

        {subStep === 1 && (
          <div className="animate-fade-in space-y-6">
            <div className="bg-white p-5 md:p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">

                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase">Số công nhân</label>
                      <input
                        type="number"
                        min="0"
                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-100"
                        value={currentReport.workerCount}
                        onChange={e => {
                          const count = Math.max(0, parseInt(e.target.value) || 0);
                          setCurrentReport({ ...currentReport, workerCount: count });
                        }}
                      />
                    </div>
                  </div>

                  {currentReport.workerCount !== undefined && currentReport.workerCount > 0 && (
                    <div className="space-y-3 pl-2 border-l-2 border-blue-100">
                      <label className="text-[9px] font-black text-blue-400 uppercase">Nhập tên công nhân</label>
                      {Array.from({ length: currentReport.workerCount }).map((_, i) => (
                        <div key={`worker-field-${i}`} className="relative group">
                          <input
                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-100"
                            placeholder={`Tên công nhân ${i + 1}`}
                            value={currentReport.workerNames?.split(', ')[i] || ''}
                            onChange={e => updateWorkerName(i, e.target.value)}
                            onFocus={() => setActiveWorkerInput(i)}
                            onBlur={() => setTimeout(() => setActiveWorkerInput(null), 200)}
                          />
                          {activeWorkerInput === i && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                              {workerSuggestions.map((name, idx) => (
                                <div
                                  key={idx}
                                  className="p-3 hover:bg-blue-50 cursor-pointer text-sm font-bold text-gray-700 border-b border-gray-50 last:border-0"
                                  onClick={(e) => {
                                    e.preventDefault(); // Prevent blur from firing immediately if needed, though timeout handles it
                                    updateWorkerName(i, name);
                                    // Keep focus or close? Usually close after selection is better for this single-select field
                                    setActiveWorkerInput(null);
                                  }}
                                >
                                  {name}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[9px] font-black text-gray-400 uppercase">Số cơ giới</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-100"
                      value={currentReport.mechanicalCount}
                      onChange={e => {
                        const count = Math.max(0, parseInt(e.target.value) || 0);
                        setCurrentReport({ ...currentReport, mechanicalCount: count });
                      }}
                    />
                  </div>

                  {currentReport.mechanicalCount !== undefined && currentReport.mechanicalCount > 0 && (
                    <div className="space-y-3 pl-2 border-l-2 border-blue-100">
                      <label className="text-[9px] font-black text-blue-400 uppercase">Nhập tên cơ giới</label>
                      {Array.from({ length: currentReport.mechanicalCount }).map((_, i) => (
                        <div key={`mech-field-${i}`} className="relative group">
                          <input
                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-100"
                            placeholder={`Tên cơ giới ${i + 1}`}
                            value={currentReport.mechanicalNames?.split(', ')[i] || ''}
                            onChange={e => updateMechanicalName(i, e.target.value)}
                            onFocus={() => setActiveMechInput(i)}
                            onBlur={() => setTimeout(() => setActiveMechInput(null), 200)}
                          />
                          {activeMechInput === i && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                              {mechanicalSuggestions.map((name, idx) => (
                                <div
                                  key={idx}
                                  className="p-3 hover:bg-blue-50 cursor-pointer text-sm font-bold text-gray-700 border-b border-gray-50 last:border-0"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    updateMechanicalName(i, name);
                                    setActiveMechInput(null);
                                  }}
                                >
                                  {name}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>



                <div className="md:col-span-2 space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="text-[9px] font-black text-gray-400 uppercase">Thiết bị sử dụng</label>
                      <input className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-100"
                        value={currentReport.equipment} onChange={e => setCurrentReport({ ...currentReport, equipment: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-black text-gray-400 uppercase">Loại xe</label>
                      <input className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-100"
                        value={currentReport.vehicleType} onChange={e => setCurrentReport({ ...currentReport, vehicleType: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-gray-400 uppercase">Số xe</label>
                      <input className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-100"
                        placeholder="Số xe..." value={currentReport.vehicleNo} onChange={e => setCurrentReport({ ...currentReport, vehicleNo: e.target.value })} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <button
                onClick={() => {
                  // Validate Step 1
                  if (!currentReport.workerNames || currentReport.workerNames.trim() === '') {
                    alert('Vui lòng nhập số lượng và tên công nhân!');
                    return;
                  }
                  /* 
                     Make Mechanical optional or required? 
                     Usually Tally requires workers. Mech is optional? 
                     Let's stick to workers as required base on standard validation.
                  */

                  setSubStep(2);
                }}
                className="w-full md:max-w-xs py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest active:scale-95 transition-all"
              >
                TIẾP THEO
              </button>
            </div>
          </div>
        )
        }

        {
          subStep === 2 && (
            <div className="animate-fade-in space-y-6">
              <div className="bg-gray-100/50 p-5 md:p-8 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-6">
                <div className="relative max-w-2xl mx-auto" ref={searchRef}>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        className="w-full p-4 pr-10 bg-white border border-gray-100 rounded-2xl text-[13px] font-bold outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-300"
                        placeholder="Nhập số Cont/Xe để tìm"
                        value={containerSearch}
                        onFocus={() => setShowResults(true)}
                        onChange={(e) => {
                          setContainerSearch(e.target.value);
                          setShowResults(true);
                        }}
                      />
                      {containerSearch && (
                        <button
                          onClick={() => setContainerSearch('')}
                          className="absolute right-3 top-4 text-gray-300"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <button className="bg-blue-600 text-white w-14 h-14 flex items-center justify-center rounded-2xl shadow-md active:scale-90 transition-transform">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </button>
                  </div>

                  {/* CONTAINER SELECTION LIST (Always Visible) */}
                  <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden min-h-[100px] max-h-[300px] overflow-y-auto">
                    {filteredSearchContainers.length === 0 ? (
                      <div className="p-8 text-center text-gray-400 font-bold text-xs uppercase">
                        {availableContainers.length === 0
                          ? "Không có container nào cho tàu này"
                          : "Không tìm thấy hoặc đã chọn hết"}
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {filteredSearchContainers.map(c => {
                          const isExploitable = c.tkNhaVC && (c.tkDnlOla || (c as any).tkDnl); // Handle legacy
                          const displaySize = c.size.includes('40') ? 'Size 40' : (c.size.includes('20') ? 'Size 20' : c.size);
                          const isUrged = !!c.lastUrgedAt;

                          return (
                            <button
                              key={c.id}
                              onClick={() => addContainerToReport(c)}
                              className={`w-full text-left p-4 hover:bg-blue-50 active:bg-blue-100 transition-colors flex justify-between items-center group ${!isExploitable ? 'bg-gray-50/50' : 'bg-white'} ${isUrged ? 'bg-red-50' : ''}`}
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-black text-gray-900 leading-tight text-base group-hover:text-blue-600 transition-colors">{c.containerNo}</p>
                                  {isUrged && <span className="text-[9px] bg-red-500 text-white px-1.5 py-0.5 rounded animate-pulse">GẤP</span>}
                                  {c.vendor && <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold">{c.vendor}</span>}
                                </div>
                                <p className="text-[12px] text-gray-400 font-bold uppercase mt-0.5">{displaySize} • {c.sealNo}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                {!isExploitable ? (
                                  <span className="text-[10px] font-black text-red-500 bg-red-50 px-3 py-1.5 rounded-full uppercase tracking-tight">CHƯA ĐỦ TK</span>
                                ) : (
                                  <div className="text-gray-300 group-hover:text-blue-500 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentReport.items?.length === 0 ? (
                    <div className="md:col-span-2 py-12 text-center bg-white rounded-3xl border border-gray-50 shadow-sm">
                      <p className="text-gray-300 font-black text-xs uppercase tracking-tight">Chưa có Container nào được chọn</p>
                    </div>
                  ) : (
                    currentReport.items?.map((item, idx) => (
                      <div key={item.contId} className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-4 hover:border-blue-100 transition-colors">
                        <div className="flex justify-between items-center">
                          <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-tight">Mục {idx + 1}: {item.contNo}</span>
                          <button onClick={() => {
                            const newItems = [...(currentReport.items || [])];
                            newItems.splice(idx, 1);
                            setCurrentReport({ ...currentReport, items: newItems });
                          }} className="text-red-500 font-black text-[10px] uppercase">Xóa</button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[9px] font-black text-gray-400 uppercase">Số kiện (PKGS)</label>
                            <input type="number" min="0" className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl font-black text-sm outline-none"
                              value={item.actualUnits} onChange={e => updateItem(idx, 'actualUnits', Math.max(0, parseInt(e.target.value) || 0))} />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-gray-400 uppercase">Trọng lượng (TẤN)</label>
                            <input type="number" min="0" step="0.1" className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl font-black text-sm outline-none"
                              value={item.actualWeight} onChange={e => updateItem(idx, 'actualWeight', Math.max(0, parseFloat(e.target.value) || 0))} />
                          </div>
                        </div>
                        <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                          <input type="checkbox" id={`scratch-${idx}`} className="w-5 h-5 rounded border-gray-300 text-blue-600" checked={item.isScratchedFloor}
                            onChange={e => updateItem(idx, 'isScratchedFloor', e.target.checked)} />
                          <label htmlFor={`scratch-${idx}`} className="text-xs font-black text-gray-700 uppercase">SÀN BỊ XƯỚC</label>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[9px] font-black text-red-500 uppercase">Số kiện rách</label>
                            <input type="number" min="0" className="w-full p-3 bg-gray-50 border border-red-50 rounded-xl font-black text-sm text-red-600 outline-none"
                              value={item.tornUnits} onChange={e => updateItem(idx, 'tornUnits', Math.max(0, parseInt(e.target.value) || 0))} />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-gray-400 uppercase">Ghi chú khác</label>
                            <input className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-[11px] outline-none"
                              value={item.notes} onChange={e => updateItem(idx, 'notes', e.target.value)} />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/95 backdrop-blur-md border-t border-gray-50 z-40">
                <div className="max-w-screen-lg mx-auto">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <button
                      onClick={() => handleFinalSave(true)}
                      className="py-4 bg-[#f1f3f5] text-[#495057] font-black rounded-2xl uppercase text-[11px] tracking-widest active:scale-95 transition-all shadow-sm hover:bg-gray-200"
                    >
                      LƯU NHÁP
                    </button>
                    <button
                      onClick={() => handleFinalSave(false)}
                      className="py-4 bg-[#2165e3] text-white font-black rounded-2xl shadow-xl shadow-blue-200 uppercase text-[11px] tracking-widest active:scale-95 transition-all hover:bg-blue-700"
                    >
                      GỬI & LẬP PHIẾU CT
                    </button>
                  </div>

                </div>
              </div>
            </div>
          )
        }
      </div >

      <style>{`
        @media screen {
          .print-document { display: none; }
        }
        @media print {
          @page { 
            size: portrait; 
            margin: 0; 
          }
          body { 
            background: white !important; 
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact;
          }
          .print\\:hidden { display: none !important; }
          .print-document { 
            display: block !important;
            width: 100% !important;
            box-shadow: none !important;
            padding: 15mm !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </div >
  );
};

export default TallyReportView;
