
import React from 'react';
import { WorkOrder } from '../../../types/index';
import { TallyReport } from '../../../types/inspector';

interface WorkOrderPrintTemplateProps {
    wo: WorkOrder;
    report?: TallyReport;
    isPreview?: boolean;
    onUpdate?: (woId: string, field: 'workerNames' | 'vehicleNos', value: string) => void;
}

const WorkOrderPrintTemplate: React.FC<WorkOrderPrintTemplateProps> = ({ wo, report, isPreview, onUpdate }) => {
    const today = new Date();
    const d = today.getDate().toString().padStart(2, '0');
    const m = (today.getMonth() + 1).toString().padStart(2, '0');
    const y = today.getFullYear().toString();

    // Helper to format vehicle numbers
    const vehicleNosStr = wo.vehicleNos ? wo.vehicleNos.join(', ') : '';
    const workerNamesStr = wo.workerNames && wo.workerNames.length > 0 ? wo.workerNames.join(', ') : wo.teamName;

    return (
        <div className={`print-wo-section bg-white text-black mx-auto overflow-hidden relative flex flex-col font-serif-paper
      ${isPreview ? 'w-[297mm] h-[210mm] shadow-2xl p-10 mb-10 scale-90 origin-top' : 'w-full h-auto print:w-[297mm] print:h-[210mm]'}`}
        >
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Tinos:ital,wght@0,400;0,700;1,400;1,700&display=swap');
        .font-signature { font-family: 'Dancing Script', cursive; }
        .font-serif-paper { font-family: 'Times New Roman', Times, serif; }
        
        @media print {
            @page { 
                size: A4 landscape; 
                margin: 0; 
            }
            html, body { 
                width: 297mm; 
                height: 210mm; 
                margin: 0 !important; 
                padding: 0 !important; 
                overflow: hidden !important;
                background-color: white !important; 
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            .no-print, header, nav, .app-bar, .navbar, .sidebar { 
                display: none !important; 
            }
            
            .print-wo-section {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 297mm !important;
                height: 210mm !important;
                margin: 0 !important;
                padding: 0 !important;
                background-color: white !important;
                z-index: 9999 !important;
                display: flex !important;
                visibility: visible !important;
                box-shadow: none !important;
            }
            
            /* Clean up any preview artifacts */
            .print-wo-section * {
                color: black !important;
                filter: none !important;
            }
        }
      `}</style>

            <div className={`w-[270mm] h-[190mm] mx-auto border-0 pt-5 relative flex flex-col justify-between ${isPreview ? '' : 'print:m-[10mm] print:absolute print:inset-0'}`}>
                {/* HEADER */}
                <div className="flex justify-between items-start mb-2 px-4">
                    <div className="flex items-start gap-4">
                        {/* Logo Placeholder or Text */}
                        <div className="flex flex-col items-center">
                            <div className="border-2 border-black w-[110px] h-8 flex items-center justify-center font-bold text-xl tracking-tighter leading-none pt-1">DANALOG</div>
                            <div className="text-[9px] font-bold tracking-widest leading-none">DANANG PORT LOGISTICS</div>
                        </div>
                    </div>
                    <div className="text-right">
                        <h1 className="font-bold text-[13px] uppercase leading-tight">CÔNG TY CỔ PHẦN LOGISTICS CẢNG ĐÀ NẴNG</h1>
                        <p className="text-[11px] leading-tight">97 Yết Kiêu, Phường Thọ Quang, Quận Sơn Trà, Tp Đà Nẵng</p>
                    </div>
                </div>

                <div className="text-center mb-4">
                    <h1 className="text-3xl font-bold uppercase tracking-wide">PHIẾU CÔNG TÁC</h1>
                </div>

                {/* INFO */}
                <div className="space-y-3 mb-6 px-4 text-[14px]">
                    <div className="flex items-baseline justify-between">
                        <div className="flex items-baseline flex-1">
                            <span className="font-bold whitespace-nowrap italic">Tổ (Cá nhân):</span>
                            <div className="ml-2 border-b border-dotted border-black px-4 font-bold italic text-blue-900 min-w-[200px] relative">
                                {workerNamesStr}
                                {onUpdate && (
                                    <input
                                        type="text"
                                        className="no-print absolute inset-0 opacity-0 focus:opacity-100 bg-white border border-blue-400 font-bold px-2 outline-none z-10 text-sm"
                                        defaultValue={workerNamesStr}
                                        onBlur={(e) => onUpdate(wo.id, 'workerNames', e.target.value)}
                                    />
                                )}
                            </div>
                        </div>

                        <div className="flex items-baseline gap-2">
                            <span className="font-bold italic">Số người:</span>
                            <span className="border-b border-dotted border-black w-12 text-center font-bold italic text-blue-900">{wo.peopleCount}</span>
                        </div>

                        <div className="flex justify-end gap-1 items-baseline ml-10">
                            <span className="font-bold">Ca:</span>
                            <span className="border-b border-dotted border-black/50 w-8 text-center font-bold h-6 italic text-blue-900">{wo.shift}</span>
                            <span className="font-bold">, ngày</span>
                            <span className="border-b border-dotted border-black/50 w-8 text-center font-bold h-6 italic text-blue-900">{d}</span>
                            <span className="font-bold">tháng</span>
                            <span className="border-b border-dotted border-black/50 w-8 text-center font-bold h-6 italic text-blue-900">{m}</span>
                            <span className="font-bold">năm {y}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-12 gap-x-2 items-baseline">
                        <div className="col-span-5 flex items-baseline">
                            <span className="whitespace-nowrap font-bold">Loại xe:</span>
                            <span className="ml-2 border-b border-dotted border-black/50 flex-1 font-bold h-6 italic text-blue-900">{wo.vehicleType || ''}</span>
                        </div>
                        <div className="col-span-4 flex items-baseline">
                            <span className="whitespace-nowrap font-bold ml-2">Số xe:</span>
                            <div className="ml-2 border-b border-dotted border-black/50 flex-1 relative min-h-[24px]">
                                <span className="font-bold px-2 italic text-blue-900">{vehicleNosStr || ''}</span>
                                {onUpdate && (
                                    <input
                                        type="text"
                                        className="no-print absolute inset-0 opacity-0 focus:opacity-100 bg-white border border-blue-400 font-bold px-2 outline-none z-10 text-sm"
                                        defaultValue={vehicleNosStr}
                                        onBlur={(e) => onUpdate(wo.id, 'vehicleNos', e.target.value)}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* TABLE */}
                <div className="relative border-2 border-black flex-1 mx-4">
                    <table className="w-full border-collapse text-[13px] text-center table-fixed">
                        <thead>
                            <tr className="font-bold h-10 border-b border-black bg-gray-50/50">
                                <th className="border-r border-black p-1 w-[190px] leading-tight text-[11px]">PHƯƠNG ÁN BỐC DỠ</th>
                                <th className="border-r border-black p-1 w-[90px] leading-tight text-[11px]">Loại Hàng</th>
                                <th className="border-r border-black p-1 w-[80px] leading-tight text-[11px]">Quy Cách</th>
                                <th className="border-r border-black p-1 w-[80px] leading-tight text-[11px]">Khối Lượng</th>
                                <th className="border-r border-black p-1 w-[80px] leading-tight text-[11px]">Trọng Lượng</th>
                                <th className="border-r border-black p-1 w-[80px] leading-tight text-[11px]">Số người làm công nhật</th>
                                <th className="p-1 text-[11px]">Ghi Chú</th>
                            </tr>
                        </thead>
                        <tbody>
                            {wo.items?.map((item, idx) => (
                                <tr key={idx} className="h-16 align-middle border-b border-black">
                                    <td className="border-r border-black p-1 font-bold italic text-[12px] leading-tight text-left px-3">
                                        {item.method}
                                    </td>
                                    <td className="border-r border-black p-1 italic text-blue-900 font-bold">{item.cargoType}</td>
                                    <td className="border-r border-black p-1 italic text-blue-900 font-bold">{item.specs}</td>
                                    <td className="border-r border-black p-1 italic text-blue-900 font-bold">
                                        {item.volume ? (item.volume.toString().toLowerCase().includes('kiện') ? item.volume : `${item.volume} Kiện`) : ''}
                                    </td>
                                    <td className="border-r border-black p-1 italic text-blue-900 font-bold">
                                        {item.weight ? (item.weight.toString().toLowerCase().includes('tấn')
                                            ? item.weight
                                            : `${parseFloat(item.weight.toString()).toFixed(3)} Tấn`) : ''}
                                    </td>
                                    <td className="border-r border-black p-1 italic text-blue-900 font-bold">{item.extraLabor || ''}</td>
                                    <td className="p-1 italic text-blue-900 text-left px-2 text-[11px]">{item.notes}</td>
                                </tr>
                            ))}

                            {Array.from({ length: Math.max(0, 5 - (wo.items?.length || 0)) }).map((_, i) => (
                                <tr key={i} className={`h-10 border-b border-black last:border-b-0`}>
                                    <td className="border-r border-black"></td>
                                    <td className="border-r border-black"></td>
                                    <td className="border-r border-black"></td>
                                    <td className="border-r border-black"></td>
                                    <td className="border-r border-black"></td>
                                    <td className="border-r border-black"></td>
                                    <td className=""></td>
                                </tr>
                            ))}
                            <tr className="h-12 font-bold bg-gray-50/20">
                                <td colSpan={1} className="border-r border-black text-center font-bold uppercase text-[11px]">Tổng cộng</td>
                                <td colSpan={3} className="border-r border-black"></td>
                                <td colSpan={1} className="border-r border-black text-lg italic text-blue-900 text-center">
                                    {wo.items?.[0]?.weight ? (wo.items[0].weight.toString().toLowerCase().includes('tấn')
                                        ? wo.items[0].weight
                                        : `${parseFloat(wo.items[0].weight.toString()).toFixed(3)} Tấn`) : ''}
                                </td>
                                <td colSpan={2} className=""></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* SIGNATURES */}
                <div className="mt-4 mb-2 grid grid-cols-4 text-center text-[10px] font-bold uppercase gap-2 mx-4">
                    <div className="flex flex-col h-32">
                        <p className="mb-0.5 tracking-tight">PHÒNG KINH DOANH</p>
                        <p className="font-normal italic normal-case opacity-60 text-[9px]">(Ghi rõ họ tên)</p>
                    </div>
                    <div className="flex flex-col h-32 items-center">
                        <p className="mb-0.5 tracking-tight">NGƯỜI THỰC HIỆN</p>
                        <p className="font-normal italic normal-case opacity-60 text-[9px]">(Ghi rõ họ tên)</p>
                        <div className="mt-auto h-20 flex flex-col items-center justify-center pt-2">
                            <span className="font-signature italic text-blue-900 text-3xl opacity-80 leading-none">
                                {(() => {
                                    let rawName = '';
                                    if (wo.workerNames && wo.workerNames.length > 0) {
                                        rawName = wo.workerNames[0];
                                    } else if (wo.type === 'MECHANICAL') {
                                        rawName = wo.teamName;
                                    }

                                    // Always split to get the first person
                                    const firstPerson = rawName ? rawName.split(/[,;\-\.\uff0c]/)[0].trim() : '';

                                    // Signature is the last word of the first person's name
                                    return firstPerson ? firstPerson.split(' ').pop() : '';
                                })()}
                            </span>
                            <p className="text-[13px] text-blue-900 font-bold mt-3 px-4 pt-1 whitespace-nowrap">
                                {wo.workerNames && wo.workerNames.length > 0
                                    ? wo.workerNames[0].split(',')[0].trim()
                                    : wo.type === 'MECHANICAL' ? wo.teamName
                                        : ''}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col h-32 items-center">
                        <p className="mb-0.5 tracking-tight">XÁC NHẬN NV CHỈ ĐẠO</p>
                        <p className="font-normal italic normal-case opacity-60 text-[9px]">(Ghi rõ họ tên)</p>
                        <div className="mt-auto h-20 flex flex-col items-center justify-center pt-2">
                            <span className="font-signature italic text-blue-900 text-3xl opacity-80 leading-none">
                                {(() => {
                                    const supervisorName = report ? report.createdBy : wo.createdBy;
                                    return supervisorName ? supervisorName.split(' ').pop() : '';
                                })()}
                            </span>
                            <p className="text-[13px] text-blue-900 font-bold mt-3 px-4 pt-1 whitespace-nowrap">
                                {report ? report.createdBy : (wo.createdBy || '')}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col h-32 items-center">
                        <p className="mb-0.5 tracking-tight">GIAO NHẬN</p>
                        <p className="font-normal italic normal-case opacity-60 text-[9px]">(Ghi rõ họ tên)</p>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default WorkOrderPrintTemplate;
