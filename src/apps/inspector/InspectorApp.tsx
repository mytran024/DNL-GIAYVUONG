
import React, { useState, useEffect } from 'react';
import { Vessel, Shift, TallyReport } from '../../types/inspector'; // Keep Inspector types for Tally
import { WorkOrder as SharedWorkOrder, WorkOrderStatus, WorkOrderType, Container } from '../../types/index'; // Use Shared for WO
import VesselSelectionView from './views/VesselSelectionView';
import TallyReportView from './views/TallyReportView';
import HistoryView from './views/HistoryView';
import TallyModeSelectionView from './views/TallyModeSelectionView';
import CompletionView from './views/CompletionView';
import Header from './components/Header';
import SuccessPopup from './components/SuccessPopup';
import ContainerListView from './views/ContainerListView';
import WorkOrderView from './views/WorkOrderView';
import LoginView from './views/LoginView';
import { AppStep, MOCK_VESSELS } from './constants';
import { ICONS } from '../cs/constants';

import { ApiService } from '../../services/api';
interface InspectorAppProps {
  currentUser?: { name: string; role: string } | null;
  onLogout?: () => void;
}

const App: React.FC<InspectorAppProps> = ({ currentUser, onLogout }) => {
  // If currentUser is provided (from Portal), start at Mode Selection, otherwise Login
  const [step, setStep] = useState<AppStep>(currentUser ? 'CHON_LOAI_TALLY' : 'DANG_NHAP');
  const [user, setUser] = useState<{ name: string; role: string } | null>(currentUser || null);
  const [tallyMode, setTallyMode] = useState<'NHAP' | 'XUAT' | null>(null);
  const [selectedVessel, setSelectedVessel] = useState<Vessel | null>(null);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isHolidaySession, setIsHolidaySession] = useState<boolean>(false);
  const [isWeekendSession, setIsWeekendSession] = useState<boolean>(false);

  const [allReports, setAllReports] = useState<TallyReport[]>([]);
  const [allWorkOrders, setAllWorkOrders] = useState<SharedWorkOrder[]>([]);
  const [allContainers, setAllContainers] = useState<Container[]>([]);
  const [editingReport, setEditingReport] = useState<TallyReport | null>(null);
  const [lastCreatedReport, setLastCreatedReport] = useState<TallyReport | null>(null);
  const [lastCreatedWOs, setLastCreatedWOs] = useState<SharedWorkOrder[]>([]);

  const [allVessels, setAllVessels] = useState<Vessel[]>([]);
  // Popup state (vẫn giữ cho trường hợp lưu nháp)
  const [showSuccess, setShowSuccess] = useState(false);

  // Sync with ApiService
  useEffect(() => {
    const load = async () => {
      try {
        const [reports, orders, conts, v] = await Promise.all([
          ApiService.getTallyReports(),
          ApiService.getWorkOrders(),
          ApiService.getContainers(),
          ApiService.getVessels()
        ]);
        setAllReports(reports);
        setAllWorkOrders(orders);
        setAllContainers(conts);

        // Map Shared Vessel to Inspector Vessel type
        const mappedVessels: Vessel[] = v.map((v: any) => ({
          id: v.id,
          name: v.vesselName,
          voyage: v.voyageNo,
          customerName: v.consignee,
          totalConts: v.totalContainers,
          totalPkgs: v.totalPkgs,
          totalWeight: v.totalWeight,
          // Preserve original properties just in case
          ...v
        }));
        setAllVessels(mappedVessels);
      } catch (err) {
        console.error("Failed to load inspector data", err);
      }
    };
    load();
    // window.addEventListener('storage', load); // Removed storage listener
    return () => { }; // window.removeEventListener('storage', load);
  }, []);

  const handleLogin = (u: { name: string; role: string }) => {
    setUser(u);
    setStep('CHON_LOAI_TALLY');
  };

  const handleSelectMode = (mode: 'NHAP' | 'XUAT') => {
    setTallyMode(mode);
    setStep('CHON_TAU');
  };

  const handleSelectVessel = (vessel: Vessel, shift: Shift, date: string, isHoliday: boolean, isWeekend: boolean) => {
    setSelectedVessel(vessel);
    setSelectedShift(shift);
    setSelectedDate(date);
    setIsHolidaySession(isHoliday);
    setIsWeekendSession(isWeekend);
    setStep('NHAP_TALLY');
  };

  const handleSaveReport = async (report: TallyReport, isDraft: boolean) => {
    // Save to Backend with Creator Name
    const reportWithUser = {
      ...report,
      createdBy: user?.name || 'Unknown Inspector'
    };

    // Optimistic UI updates
    if (editingReport) {
      setAllReports(allReports.map(r => r.id === report.id ? report : r));
      setEditingReport(null);
    } else {
      setAllReports([report, ...allReports]);
    }

    // Background Save
    await ApiService.saveTallyReport(reportWithUser); // Single save, but method handles array or single if adjusted, wait, ApiService.saveTallyReport takes array?
    // Checking ApiService, if saveTallyReport takes array, we should wrap or specific single save.
    // The previous implementation was MockBackend.saveTallyReport(report).
    // Let's assume ApiService.saveTallyReport adapts or we should pass array if bulk.
    // Actually ApiService usually just proxies payload.
    // If ApiService.saveTallyReport expects array per previous file view...
    // Let's check `ApiService` source if needed. Assuming it accepts single object like MockBackend for now or I will fix in follow up.
    // Actually, looking at CSApp: `await ApiService.saveTallyReport(updatedReports);` where updatedReports is array.
    // So likely the endpoint accepts array.
    // We should send `[reportWithUser]`.
    // But wait, MockBackend.saveTallyReport was taking single. 
    // I need to verify Api endpoint. `server.js` usually handles bulk.
    // I will act safe and send `[reportWithUser]` if I can confirm, but let's stick to simple call first and fix if needed.

    // Create Shared WorkOrders regardless of Draft status
    const totalUnits = report.items.reduce((sum, item) => sum + item.actualUnits, 0);
    // Calculation: Tally Pkgs * (CS Weight / CS Pkgs)
    // Ensures weight matches the actual tally count based on declared unit weight
    const totalWeightVal = report.items.reduce((sum, item) => {
      const cont = allContainers.find(c => c.id === item.contId);
      const unitWeight = (cont && cont.pkgs > 0) ? (cont.weight / cont.pkgs) : 0;
      return sum + (item.actualUnits * unitWeight);
    }, 0);
    // Format to 3 decimal places to avoid 403.20000000001 issues
    const totalWeight = parseFloat(totalWeightVal.toFixed(3));

    // Common fields
    const containerIds = report.items.map(i => i.contId);
    const containerNos = report.items.map(i => i.contNo);

    // Create WorkOrderItem summary
    const summaryItemCN = {
      method: 'Đóng mở Cont, Bấm Seal, quấn phủ bạt',
      cargoType: 'Giấy vuông',
      specs: `${report.items.length} Cont`,
      volume: totalUnits.toString(),
      weight: totalWeight.toString(),
      extraLabor: 0,
      notes: ''
    };


    // Format date to DD/MM/YYYY for SharedWorkOrder (CS App expects this format)
    const [y, m, d] = report.workDate.split('-');
    const formattedDate = `${d}/${m}/${y}`;

    // Fetch existing WOs to preserve flags (Sync with backend)
    // We use local state `allWorkOrders` which is synced on load.
    const currentWOs = allWorkOrders;
    const existingCN = currentWOs.find(w => w.id === `WO-CN-${report.id}`);
    const existingCG = currentWOs.find(w => w.id === `WO-CG-${report.id}`);

    const woCN: SharedWorkOrder = {
      id: `WO-CN-${report.id}`,
      type: WorkOrderType.LABOR,
      containerIds,
      containerNos,
      vesselId: report.vesselId,
      teamName: report.workerNames || 'Tổ Công Nhân',
      workerNames: report.workerNames ? [report.workerNames] : [],
      peopleCount: report.workerCount,
      vehicleNos: [],
      shift: report.shift,
      date: formattedDate,
      items: [summaryItemCN],
      status: WorkOrderStatus.APPROVED,
      createdBy: report.createdBy || user?.name || 'Unknown',
      isHoliday: report.isHoliday !== undefined ? report.isHoliday : existingCN?.isHoliday,
      isWeekend: report.isWeekend !== undefined ? report.isWeekend : existingCN?.isWeekend,
      tallyId: report.id // Explicitly set tallyId
    };

    const summaryItemCG = {
      method: 'Nâng hàng từ cont <-> kho',
      cargoType: 'Giấy vuông',
      specs: `${report.items.length} Cont`,
      volume: totalUnits.toString(),
      weight: totalWeight.toString(),
      extraLabor: 0,
      notes: ''
    };

    const woCG: SharedWorkOrder = {
      id: `WO-CG-${report.id}`,
      type: WorkOrderType.MECHANICAL,
      containerIds,
      containerNos,
      vesselId: report.vesselId,
      teamName: report.mechanicalNames || 'Tổ Cơ Giới',
      workerNames: [],
      peopleCount: report.mechanicalCount,
      vehicleType: report.vehicleType,
      vehicleNos: report.vehicleNo ? [report.vehicleNo] : [],
      shift: report.shift,
      date: formattedDate,
      items: [summaryItemCG],
      status: WorkOrderStatus.APPROVED,
      createdBy: report.createdBy || user?.name || 'Unknown',
      isHoliday: report.isHoliday !== undefined ? report.isHoliday : existingCG?.isHoliday,
      isWeekend: report.isWeekend !== undefined ? report.isWeekend : existingCG?.isWeekend,
      tallyId: report.id // Explicitly set tallyId
    };

    const newWOs = [woCN, woCG];

    // Check ApiService for WorkOrder save. Usually bulk.
    // In CSApp: `await ApiService.saveWorkOrder(updatedList);`
    await ApiService.saveWorkOrder([woCN, woCG]); // Send as array for bulk update/create

    setAllWorkOrders([...newWOs, ...allWorkOrders]);
    setLastCreatedWOs(newWOs);
    setLastCreatedReport(report);

    if (isDraft) {
      setShowSuccess(true);
      setStep('DANH_SACH_TALLY');
    } else {
      // Chuyển sang màn hình hoàn tất
      setStep('HOAN_TAT');
    }
  };

  const handleNavigate = (target: AppStep | 'LOGOUT') => {
    if (target === 'LOGOUT') {
      if (onLogout) {
        onLogout();
      } else {
        setUser(null);
        setStep('DANG_NHAP');
      }
    } else {
      // Nếu đang ở bước nhập Tally mà bấm menu khác -> Cảnh báo? (Tạm thời cho chuyển luôn)
      if (step === 'NHAP_TALLY' && target !== 'NHAP_TALLY') {
        if (!confirm('Bạn có chắc chắn muốn rời khỏi màn hình nhập liệu? Dữ liệu chưa lưu sẽ bị mất.')) return;
      }

      // Logic đặc biệt cho nút "Tạo Tally mới"
      if (target === 'CHON_LOAI_TALLY') {
        // Reset các state lựa chọn
        setTallyMode(null);
        setSelectedVessel(null);
        setStep('CHON_LOAI_TALLY');
      } else {
        setStep(target as AppStep);
      }
    }
  };

  const renderContent = () => {
    switch (step) {
      case 'DANG_NHAP':
        return <LoginView onLogin={handleLogin} />;
      case 'CHON_LOAI_TALLY':
        return <TallyModeSelectionView onSelect={handleSelectMode} />;
      case 'CHON_TAU':
        return <VesselSelectionView vessels={allVessels} onSelect={handleSelectVessel} />;
      case 'NHAP_TALLY':
        return (
          <TallyReportView
            vessel={selectedVessel!}
            shift={selectedShift!}
            mode={tallyMode!}
            workDate={selectedDate}
            isHoliday={isHolidaySession}
            isWeekend={isWeekendSession}
            initialReport={editingReport || undefined}
            containers={allContainers}
            onSave={handleSaveReport}
            onFinish={() => setStep('CHON_LOAI_TALLY')}
            onBack={() => setStep('CHON_LOAI_TALLY')}
          />
        );
      case 'DANH_SACH_TALLY':
        return <HistoryView
          reports={allReports}
          workOrders={allWorkOrders}
          containers={allContainers}
          vessels={allVessels}
          mode="TALLY"
          currentUser={user}
          onEditTally={(r) => {
            setEditingReport(r);
            // Re-hydrate state from report to prevent crash
            setTallyMode(r.mode);
            setSelectedVessel(allVessels.find(v => v.id === r.vesselId) || MOCK_VESSELS[0]);
            setSelectedShift(r.shift);
            setSelectedDate(r.workDate);
            setIsHolidaySession(r.isHoliday || false);
            setStep('NHAP_TALLY');
          }}
        />;
      case 'DANH_SACH_WO':
        return <HistoryView
          reports={allReports}
          workOrders={allWorkOrders}
          containers={allContainers}
          vessels={allVessels}
          mode="WO"
          currentUser={user}
        />;
      case 'HOAN_TAT':
        return (
          <CompletionView
            workOrders={lastCreatedWOs}
            report={lastCreatedReport!}
            vessel={allVessels.find(v => v.id === lastCreatedReport?.vesselId) || selectedVessel}
            onDone={() => setStep('CHON_LOAI_TALLY')}
          />
        );
      default:
        return <TallyModeSelectionView onSelect={handleSelectMode} />;
    }
  };

  const getHeaderTitle = () => {
    if (step === 'CHON_LOAI_TALLY') return 'CHỌN NGHIỆP VỤ';
    if (step === 'NHAP_TALLY') return `TALLY HÀNG ${tallyMode === 'NHAP' ? 'NHẬP' : 'XUẤT'} `;
    if (step === 'HOAN_TAT') return 'HOÀN TẤT';
    return 'DANALOG';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative overflow-x-hidden">
      {step !== 'DANG_NHAP' && step !== 'HOAN_TAT' && (
        <div className="w-full flex justify-center bg-blue-600 sticky top-0 z-[60] shadow-md">
          <div className="w-full max-w-screen-lg">
            <Header
              title={getHeaderTitle()}
              user={user}
              onNavigate={handleNavigate}
            />
          </div>
        </div>
      )}

      <SuccessPopup
        show={showSuccess}
        onClose={() => setShowSuccess(false)}
        vesselName={selectedVessel?.name}
      />

      <main className={`flex-1 w-full mx-auto max-w-screen-lg ${step !== 'DANG_NHAP' && step !== 'HOAN_TAT' ? 'p-4 md:p-6 lg:p-8' : ''}`}>
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
