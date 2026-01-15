
import React from 'react';
import { TallyReport, Vessel } from '../../../types/inspector';
import { Container } from '../../../types/index';

interface TallyPrintTemplateProps {
  report: TallyReport;
  vessel: Vessel;
  containers?: Container[];
  isPreview?: boolean;
}

const TallyPrintTemplate: React.FC<TallyPrintTemplateProps> = ({ report, vessel, containers = [], isPreview }) => {
  const numberToVietnameseText = (n: number): string => {
    if (n === 0) return 'KHÔNG';
    const units = ['', 'MỘT', 'HAI', 'BA', 'BỐN', 'NĂM', 'SÁU', 'BẢY', 'TÁM', 'CHÍN'];
    // Simple implementation for small numbers (0-99), extend if needed
    if (n < 10) return units[n];
    return n.toString(); // Fallback for larger numbers or implement full logic
  };

  const chunkArray = <T,>(array: T[], size: number): T[][] => {
    if (!array || array.length === 0) return [];
    const result: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      result.push(array.slice(i, i + size));
    }
    return result;
  };

  const itemsToCheck = report.items || [];
  // Use 15 items per page as requested
  const itemChunks = itemsToCheck.length > 0 ? chunkArray(itemsToCheck, 15) : [[]];

  const today = new Date(report.createdAt || Date.now());
  const d = today.getDate().toString().padStart(2, '0');
  const m = (today.getMonth() + 1).toString().padStart(2, '0');
  const y = today.getFullYear().toString();
  const vesselCode = vessel.name.split(' ').pop() || vessel.name;

  // Helper to validate owner string
  const isValidOwner = (s: string | null | undefined): s is string => {
    if (!s) return false;
    const lower = s.trim().toLowerCase();
    return lower !== 'n/a' && lower !== 'na' && lower !== 'undefined' && lower !== 'null' && lower !== '';
  };

  // 1. Try from matched container (CS data)
  const firstContNo = report.items?.[0]?.contNo;
  const matchedContRef = firstContNo ? containers.find(c => c.containerNo === firstContNo) : null;
  const contOwner = matchedContRef?.consignee || (matchedContRef as any)?.owner;

  // 2. Try from Report (User input)
  const reportOwner = report.owner;

  // 3. Try from Vessel (Master data)
  const vesselOwner = (vessel as any).consignee || vessel.customerName;

  // Priority: Report (if edited) > Container (Specific) > Vessel (Default)
  // Re-ordered to prioritize Report if user manually fixed it (via new input), 
  // then Container if specific, then Vessel as fallback.
  // Actually, previously it was Container > Report > Vessel.
  // Let's stick to: Report (User Override) > Container > Vessel

  let displayOwner = '';
  if (isValidOwner(reportOwner)) {
    displayOwner = reportOwner;
  } else if (isValidOwner(contOwner)) {
    displayOwner = contOwner;
  } else if (isValidOwner(vesselOwner)) {
    displayOwner = vesselOwner;
  } else {
    displayOwner = '';
  }

  return (
    <div className="w-full h-auto bg-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Tinos:ital,wght@0,400;0,700;1,400;1,700&display=swap');
        .font-signature { font-family: 'Dancing Script', cursive; }
        
        @media print {
            @page { 
                size: A4; 
                margin: 0; 
            }
            html, body { 
                width: 210mm; 
                margin: 0 !important; 
                padding: 0 !important; 
                background-color: white !important;
                -webkit-print-color-adjust: exact !important; 
                print-color-adjust: exact !important;
            }
            .no-print, header, nav, .app-bar, .navbar { 
                display: none !important; 
            }
            .file-print-container {
                position: relative;
                width: 210mm !important;
                height: 297mm !important;
                margin: 0 !important;
                padding: 0 !important;
                background-color: white !important;
                color: black !important;
                box-shadow: none !important; /* Remove shadow for flat vector interaction */
                border: none !important;
                page-break-after: always; /* Ensure each chunk is a new page */
                break-after: page;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                z-index: 10;
            }
            
            /* Ensure text is strictly black and sharp */
            .file-print-container * {
                color: black !important;
                text-shadow: none !important;
                filter: none !important;
            }

            /* Ensure borders are solid and sharp */
            table, th, td, div {
                border-color: black !important;
                border-style: solid !important;
            }
        }
      `}</style>

      {itemChunks.map((chunk, pageIdx) => {
        const effectiveChunk = chunk;

        // Calculate empty rows needed to maintain consistent height layout
        const neededRows = 15 - effectiveChunk.length;
        const emptyRows = neededRows > 0 ? neededRows : 0;

        const subTotalUnits = effectiveChunk.reduce((s, i) => s + (i.actualUnits || 0), 0);
        const subTotalWeight = effectiveChunk.reduce((s, i) => s + (i.actualWeight || 0), 0);

        // Preview mode: use aspect-ratio or fixed dimensions to simulate A4
        // A4 ratio is ~1.414 (297/210).
        // Using w-[210mm] and min-h-[297mm] for preview.
        return (
          <div key={pageIdx} className={`file-print-container bg-white text-black mx-auto relative font-sans text-left box-border
            ${isPreview ? 'w-[210mm] h-[297mm] shadow-2xl p-[10mm] mb-10 overflow-hidden flex flex-col justify-between' : 'print:w-[210mm] print:h-[297mm]'}`}>

            <div className="flex-1 px-[10mm]"> {/* Top section content wrapper */}
              {/* HEADER */}
              <div className="flex justify-between items-start mb-4">
                <div className="w-[55%]">
                  <h1 className="font-bold text-[12px] uppercase">CÔNG TY CỔ PHẦN LOGISTICS CẢNG ĐÀ NẴNG</h1>
                  <h2 className="font-black text-[16px] tracking-widest uppercase ml-8 leading-none mt-1">DANALOG</h2>
                  <div className="mt-1 ml-6 text-[12px]">
                    <p className="font-bold">KHO HÀNG: DANALOG</p>
                    <p className="italic text-[11px] font-bold">Warehouse Division</p>
                    <p className="font-bold mt-1">
                      {(() => {
                        const baseIdStr = report.id?.split('-')[1]?.substring(0, 3) || '001';
                        const baseId = parseInt(baseIdStr, 10);
                        const currentId = isNaN(baseId) ? baseIdStr : (baseId + pageIdx).toString().padStart(3, '0');
                        const finalId = report.shipNo ? report.shipNo : currentId;
                        return `No : ${finalId} - ${vesselCode}`;
                      })()}
                    </p>
                  </div>
                </div>
                <div className="w-[45%] text-center">
                  <p className="font-bold text-[12px] uppercase leading-tight">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                  <p className="font-bold text-[10px] uppercase italic tracking-tighter leading-tight">SOCIALIST REPUBLIC OF VIETNAM</p>
                  <p className="font-bold text-[13px] uppercase mt-1 leading-tight">Độc Lập – Tự Do – Hạnh Phúc</p>
                  <p className="italic text-[10px] leading-tight">Independence – Freedom – Happiness</p>
                </div>
              </div>

              <div className="text-center mb-4">
                <h1 className="text-xl font-bold uppercase tracking-tight">PHIẾU KIỂM GIAO NHẬN HÀNG - TALLY REPORT</h1>
                <h2 className="text-lg font-bold uppercase">TẠI BÃI CẢNG</h2>
              </div>

              {/* INFO */}
              <div className="space-y-1 mb-4 text-[13px]">
                <div className="flex items-baseline">
                  <span className="font-bold mr-2 whitespace-nowrap">1.Chủ hàng/Consignee:</span>
                  <span className="font-bold uppercase border-b border-dotted border-black flex-1 leading-none">{displayOwner}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-bold whitespace-nowrap">2.Ca/Shift:</span>
                  <span className="font-bold px-2 w-8 text-center border-b border-dotted border-black">{report.shift}</span>
                  <span className="whitespace-nowrap ml-4">ngày/day:</span>
                  <span className="font-bold px-2 w-8 text-center border-b border-dotted border-black">{d}</span>
                  <span className="whitespace-nowrap ml-2">tháng/month:</span>
                  <span className="font-bold px-2 w-8 text-center border-b border-dotted border-black">{m}</span>
                  <span className="whitespace-nowrap ml-2">năm/year:</span>
                  <span className="font-bold px-2 w-12 text-center border-b border-dotted border-black">{y}</span>
                </div>
                <div className="flex items-baseline gap-4">
                  <div className="flex items-baseline flex-1">
                    <span className="font-bold whitespace-nowrap">3.Tổ công nhân xếp dỡ/Stevedore:</span>
                    <span className="font-bold uppercase ml-2 border-b border-dotted border-black flex-1 text-center leading-none">{report.workerNames}</span>
                  </div>
                  <div className="flex items-baseline flex-1">
                    <span className="whitespace-nowrap">Thiết bị sử dụng/Equipment:</span>
                    <span className="font-bold ml-2 border-b border-dotted border-black flex-1 text-center leading-none">{report.equipment}</span>
                  </div>
                </div>
              </div>

              {/* TABLE */}
              <div className="border-2 border-black mb-2">
                <table className="w-full text-[11px] border-collapse text-center">
                  <thead>
                    <tr className="font-bold">
                      <th className="border-r border-b border-black w-8 p-1">STT<br />No</th>
                      <th className="border-r border-b border-black w-10 p-1">Size<br />type</th>
                      <th className="border-r border-b border-black p-1">Loại hàng/Description<br />Ký mã hiệu/Marsks</th>
                      <th className="border-r border-b border-black w-24 p-1">Số lượng<br />Number of package</th>
                      <th className="border-r border-b border-black w-32 p-1">Ghi chú/<br />Remarks</th>
                      <th className="border-b border-black w-24 p-1">Số tờ khai</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Print 'Giay/Tau' header row only on the first page, or every page? 
                      Usually standard forms might Repeat it or just have it on first.
                      For safety and visual checking, let's keep it on every page or just first. 
                      User said "next tally has same data", so likely every page is a standalone or continuation.
                      Let's include it on the FIRST page only to save space, or if requested every page. 
                      Let's stick to simple: include it if it's the start of the list. 
                      But since we want 15 items + headers to fit, we need to be careful with space.
                      Let's toggle it: always show it to be safe as it contains "Tau XXX".
                  */}
                    <tr className="font-bold h-8">
                      <td className="border-r border-black"></td>
                      <td className="border-r border-black"></td>
                      <td className="border-r border-black text-left px-2 flex justify-between items-center h-full pt-1">
                        <span>GIẤY</span>
                        <span className="italic opacity-70">TÀU {vesselCode}</span>
                      </td>
                      <td className="border-r border-black"></td>
                      <td className="border-r border-black italic text-xs pt-1">Vị trí rút ruột: Kho Danalog</td>
                      <td></td>
                    </tr>

                    {effectiveChunk.map((item, idx) => {
                      const matchedCont = containers.find(c => c.containerNo === item.contNo);
                      // Fallback to 'tkDnl' if 'tkDnlOla' is missing
                      const customsDecl = matchedCont?.tkDnlOla || (matchedCont as any)?.tkDnl || '';

                      return (
                        <tr key={idx} className="h-8 border-t border-black">
                          <td className="border-r border-black font-bold">{(pageIdx * 15) + idx + 1}</td>
                          <td className="border-r border-black font-bold">{item.contNo.includes('/') ? 'THỚT' : '40\''}</td>
                          <td className="border-r border-black text-left px-2 font-bold flex justify-between items-center h-full py-1">
                            <span>{item.contNo}</span>
                            <span className="text-[9px] font-normal">{item.sealNo}</span>
                          </td>
                          <td className="border-r border-black font-bold">{item.actualUnits} Kiện</td>
                          <td className="border-r border-black text-left px-2 italic text-[10px]">
                            {item.isScratchedFloor ? 'Sàn xước, ' : ''}
                            {item.tornUnits > 0 ? `rách ${item.tornUnits} kiện, ` : ''}
                            {item.notes}
                          </td>
                          <td className="border-black font-bold text-[10px]">{customsDecl}</td>
                        </tr>
                      );
                    })}

                    {/* Fill empty rows to always have 15 lines of items (not including the header row above) */}
                    {Array.from({ length: emptyRows }).map((_, i) => (
                      <tr key={`empty-${i}`} className="h-8 border-t border-black">
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td></td>
                      </tr>
                    ))}

                    <tr className="h-8 border-t border-black">
                      <td colSpan={3} className="border-r border-black"></td>
                      <td className="border-r border-black font-bold text-[11px] whitespace-nowrap">
                        {subTotalUnits} Kiện / {subTotalWeight.toFixed(1)} Tấn
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* FOOTER */}
              <div className="mt-2 space-y-2 text-[12px] px-2 font-bold">
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
                    <span className="ml-2 border-b border-dotted border-black w-24 text-center h-5">{effectiveChunk.length}</span>
                    <span className="ml-1">{effectiveChunk.some(i => i.contNo?.includes('/')) ? 'XE THỚT' : 'X40\'F'}</span>
                  </div>
                  <div className="flex items-baseline flex-1">
                    <span className="whitespace-nowrap">Viết bằng chữ (In letter) :</span>
                    <span className="ml-2 border-b border-dotted border-black flex-1 text-center h-5 uppercase">{numberToVietnameseText(effectiveChunk.length)}</span>
                  </div>
                  <div className="whitespace-nowrap underline">
                    {effectiveChunk.some(i => i.contNo?.includes('/')) ? 'Xe thớt có hàng nguyên chì' : 'Container có hàng nguyên chì'}
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="mt-auto grid grid-cols-3 text-center text-[11px] font-bold uppercase pb-2">
                <div className="flex flex-col h-24 justify-between">
                  <div>
                    <p>ĐẠI DIỆN CỦA TÀU/CHỦ HÀNG</p>
                    <p className="font-normal italic normal-case opacity-60 mt-0.5 tracking-tighter">Ship’s representative/ Consignee</p>
                  </div>
                </div>
                <div className="flex flex-col h-24 justify-between">
                  <div>
                    <p>HẢI QUAN GIÁM SÁT</p>
                    <p className="font-normal italic normal-case opacity-60 mt-0.5 tracking-tighter">Customs Officer</p>
                  </div>
                </div>
                <div className="flex flex-col h-24 justify-between items-center">
                  <div>
                    <p>ĐẠI DIỆN KHO HÀNG</p>
                    <p className="font-normal italic normal-case opacity-60 mt-0.5 tracking-tighter">Warehouse Division’s representative</p>
                  </div>
                  <div className="flex flex-col items-center justify-end">
                    <p className="italic font-bold normal-case text-[12px] text-blue-900 px-2 text-center">
                      {report.createdBy}
                    </p>
                  </div>
                </div>
              </div>

            </div> {/* End of flex-1 top section wrapper */}

          </div>
        );
      })}
    </div>
  );
};

export default TallyPrintTemplate;
