
import React, { useState, useEffect } from 'react';
import { WorkOrder, WorkOrderType } from '../../../types/index';
import { TallyReport } from '../../../types/inspector';
import WorkOrderPrintTemplate from '../components/WorkOrderPrintTemplate';

interface WorkOrderViewProps {
  workOrder: WorkOrder;
  report: TallyReport;
  onSave: (wo: WorkOrder, isDraft: boolean) => void;
  onCancel: () => void;
}

const WorkOrderView: React.FC<WorkOrderViewProps> = ({ workOrder, report, onSave, onCancel }) => {
  const [formData, setFormData] = useState<WorkOrder>(workOrder);

  useEffect(() => {
    setFormData(workOrder);
  }, [workOrder]);

  const handleAction = (isDraft: boolean) => {
    const updatedWO: WorkOrder = {
      ...formData,
      status: isDraft ? workOrder.status : workOrder.status // Determine status logic? Shared WO status is Enum.
    };
    // If saving draft is not supported by shared type, handling it might be different.
    // For now, assume we just pass it back.
    onSave(updatedWO, isDraft);
  };

  const isLabor = formData.type === WorkOrderType.LABOR;

  return (
    <div className="space-y-6 animate-fade-in pb-40">
      {/* Mobile App Interface */}
      <div className="print:hidden space-y-6">
        <div className={`p-5 rounded-3xl shadow-lg text-white ${isLabor ? 'bg-green-600' : 'bg-orange-600'}`}>
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-black uppercase tracking-tighter">Phiếu công tác {isLabor ? 'CN' : 'CG'}</h2>
            <span className="text-[10px] font-black bg-white/20 px-2 py-1 rounded-lg">CA {formData.shift} • {formData.date}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Tổ (Cá nhân)</label>
              <textarea
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-100 min-h-[60px]"
                value={formData.teamName || ''}
                onChange={e => setFormData({ ...formData, teamName: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Số người</label>
              <input type="number" className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-sm outline-none"
                value={formData.peopleCount || 0} onChange={e => setFormData({ ...formData, peopleCount: parseInt(e.target.value) || 0 })} />
            </div>

            <div className="flex items-center h-full pt-6">
              <div
                onClick={() => setFormData({ ...formData, isHoliday: !formData.isHoliday })}
                className={`flex-1 p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-center gap-3 active:scale-95 ${formData.isHoliday ? 'bg-amber-50 border-amber-500' : 'bg-gray-50 border-gray-200'}`}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${formData.isHoliday ? 'bg-amber-500 border-amber-500' : 'bg-white border-gray-300'}`}>
                  {formData.isHoliday && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                </div>
                <span className={`text-[11px] font-black uppercase tracking-wide ${formData.isHoliday ? 'text-amber-600' : 'text-gray-400'}`}>Tính giá lễ (Holiday)</span>
              </div>
            </div>

            {!isLabor && (
              <div className="col-span-2">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Phương tiện</label>
                <input className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-sm outline-none"
                  value={formData.vehicleType || ''} onChange={e => setFormData({ ...formData, vehicleType: e.target.value })} />

                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-2">Biển số</label>
                <input className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-sm outline-none"
                  value={formData.vehicleNos?.join(', ') || ''}
                  onChange={e => setFormData({ ...formData, vehicleNos: e.target.value.split(',').map(s => s.trim()) })} />
              </div>
            )}

            {/* Note: WorkOrderItems handling is complex for a simple form. 
                For now we just display/edit simple fields if they exist, or the FIRST item.
            */}

            {/*
            <div className="col-span-2">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Phương án bốc dỡ</label>
              <textarea className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-sm outline-none min-h-[80px]"
                value={formData.handlingMethod || ''} onChange={e => setFormData({ ...formData, handlingMethod: e.target.value })} />
            </div>
            */}

            <div className="col-span-2">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Container</label>
              <div className="text-xs font-bold text-gray-700">{formData.containerNos?.join(', ')}</div>
            </div>

          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-gray-100 max-w-md mx-auto z-40 shadow-2xl">
          <div className="grid grid-cols-2 gap-3">
            <button onClick={onCancel} className="py-4 bg-gray-100 text-gray-600 font-black rounded-2xl uppercase text-[11px] active:scale-95 transition-all">
              Hủy
            </button>
            <button onClick={() => handleAction(false)} className={`py-4 font-black rounded-2xl text-white uppercase text-[11px] shadow-xl active:scale-95 transition-all ${isLabor ? 'bg-green-600' : 'bg-orange-600'}`}>
              Lưu thay đổi
            </button>
          </div>
        </div>
      </div>

      <div className="hidden print:block bg-white">
        <WorkOrderPrintTemplate wo={formData} report={report} />
      </div>

      <style>{`
          @media screen {
            .print-wo-document { display: none; }
          }
          @media print {
            @page { 
              size: portrait; 
              margin: 10mm; 
            }
            body { 
              background: white !important; 
              margin: 0 !important;
              padding: 0 !important;
            }
            .print\\:hidden { display: none !important; }
            .print-wo-document { 
              display: block !important;
              width: 100% !important;
            }
          }
        `}</style>
    </div>
  );
};

export default WorkOrderView;
