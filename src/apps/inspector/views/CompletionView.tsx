
import React, { useState, useRef } from 'react';
import { WorkOrder } from '../../../types/index';
import { TallyReport } from '../../../types/inspector';
import { MOCK_VESSELS } from '../constants';
import WorkOrderPrintTemplate from '../components/WorkOrderPrintTemplate';
import TallyPrintTemplate from '../components/TallyPrintTemplate';
import { generatePdf } from '../utils/pdfGenerator';

import { Vessel } from '../../../types/inspector'; // Import Vessel type

interface CompletionViewProps {
  workOrders: WorkOrder[];
  report: TallyReport;
  vessel?: Vessel | null; // Receive selected vessel
  onDone: () => void;
}

const CompletionView: React.FC<CompletionViewProps> = ({ workOrders, report, vessel: propVessel, onDone }) => {
  const [generating, setGenerating] = useState(false);
  // Use passed vessel, or lookup, or fallback (careful with fallback)
  const vessel = propVessel || MOCK_VESSELS.find(v => v.id === report.vesselId) || MOCK_VESSELS[0];

  // Refs for hidden print containers
  const tallyRef = useRef<HTMLDivElement>(null);
  const woRef = useRef<HTMLDivElement>(null);

  const handleExportPDF = async (type: 'TALLY' | 'WO') => {
    setGenerating(true);
    try {
      if (type === 'TALLY' && tallyRef.current) {
        const cleanContNo = report.items?.[0]?.contNo.replace(/[/\\?%*:|"<>]/g, '-') || report.id;
        const filename = `Tally_Report_${cleanContNo}.pdf`;
        await generatePdf(tallyRef.current, filename);
      } else if (type === 'WO' && woRef.current) {
        const filename = `Phieu_Cong_Tac_${report.id}.pdf`;
        await generatePdf(woRef.current, filename, 'landscape');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Có lỗi khi tạo file PDF. Vui lòng thử lại.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white font-sans">
      {/* Hidden container for PDF generation */}
      {/* Tally Container (Portrait) */}
      <div className="fixed top-0 left-0 -z-50 " style={{ width: '210mm', minHeight: '297mm', position: 'absolute', opacity: 0, pointerEvents: 'none' }}>
        <div ref={tallyRef}>
          <TallyPrintTemplate report={report} vessel={vessel} isPreview={false} />
        </div>
      </div>

      {/* WO Container (Landscape) */}
      <div className="fixed top-0 left-0 -z-50 " style={{ width: '297mm', minHeight: '210mm', position: 'absolute', opacity: 0, pointerEvents: 'none' }}>
        <div ref={woRef} className="flex flex-col">
          {workOrders.map((wo, idx) => (
            <div key={wo.id} className="print-page-break">
              <WorkOrderPrintTemplate wo={wo} report={report} isPreview={false} />
            </div>
          ))}
        </div>
      </div>

      {/* Success Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in relative z-10">
        <div className="w-32 h-32 bg-[#e6fcf5] rounded-full flex items-center justify-center mb-10 shadow-inner">
          <div className="w-16 h-16 bg-[#20c997] rounded-full flex items-center justify-center shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <h2 className="text-[26px] font-black text-[#1a1c1e] leading-tight mb-3 uppercase tracking-tight">Gửi dữ liệu thành công!</h2>
        <p className="text-[#6c757d] font-bold text-[15px] leading-relaxed max-w-[300px] mb-12">
          Báo cáo Tally và Phiếu công tác đã được ghi nhận vào hệ thống.
        </p>

        {generating ? (
          <div className="mb-4 text-blue-600 font-bold animate-pulse">Đang tạo file PDF...</div>
        ) : null}

        <div className="w-full max-w-sm space-y-4">
          <button
            onClick={() => handleExportPDF('TALLY')}
            disabled={generating}
            className="w-full py-4.5 py-4 bg-[#2563eb] text-white font-black rounded-2xl shadow-xl shadow-blue-200 uppercase text-[13px] tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            XUẤT & IN FILE TALLY (PDF)
          </button>

          <button
            onClick={() => handleExportPDF('WO')}
            disabled={generating}
            className="w-full py-4 bg-[#2563eb] text-white font-black rounded-2xl shadow-xl shadow-blue-200 uppercase text-[13px] tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            XUẤT & IN FILE PCT (PDF)
          </button>

          <button
            onClick={onDone}
            className="w-full py-4 bg-[#f1f3f5] text-[#495057] font-black rounded-2xl uppercase text-[13px] tracking-widest active:scale-95 transition-all"
          >
            VỀ TRANG CHỦ
          </button>
        </div>
      </div>

      <style>{`
        .print-page-break {
          page-break-after: always;
        }
      `}</style>
    </div>
  );
};

export default CompletionView;
