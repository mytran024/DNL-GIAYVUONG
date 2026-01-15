
import React, { useState, useEffect } from 'react';
import { ICONS, MOCK_USER } from './constants';
import { UserRole, Vessel, Container, ContainerStatus, WorkOrder, DetentionConfig, BusinessType, UnitType } from '../../types/index';
import Dashboard from './components/Dashboard';
import VesselImport from './components/VesselImport';
import Operations from './components/Operations';
import TallyReview from './components/TallyReview';
import WorkOrderReview from './components/WorkOrderReview';
import Statistics from './components/Statistics';
import AccountManagement from './components/AccountManagement';
import ResourceManagement from './components/ResourceManagement';
import BusinessSelect from './components/BusinessSelect';
import { ApiService } from '../../services/api';

interface CSAppProps {
  currentUser?: any;
  onLogout: () => void;
}

const App: React.FC<CSAppProps> = ({ currentUser = MOCK_USER, onLogout }) => {
  // const [isLoggedIn, setIsLoggedIn] = useState(false); // Removed internal auth
  const [businessType, setBusinessType] = useState<BusinessType | null>(() => {
    // ... existing state init ... (not changing lines 21-27 here, just the interface/props above)
    // Wait, I need to match the StartLine correctly.
    // Let's refine the range.

    const saved = localStorage.getItem('danalog_cs_state');
    return saved ? JSON.parse(saved).businessType : null;
  });
  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem('danalog_cs_state');
    return saved ? JSON.parse(saved).activeTab : 'vessels';
  });

  // Use passed user or fallback (fallback mainly for dev/compat)
  const user = currentUser || MOCK_USER;

  // Dashboard Navigation State
  const [operationsParams, setOperationsParams] = useState<{ filterStatus: string; vesselId: string }>({ filterStatus: 'ALL', vesselId: 'ALL' });

  const handleDashboardNavigation = (tab: string, params: { filterStatus?: string; vesselId?: string } = {}) => {
    setActiveTab(tab);
    if (tab === 'operations') {
      setOperationsParams({
        filterStatus: params.filterStatus || 'ALL',
        vesselId: params.vesselId || 'ALL'
      });
    }
  };

  const [detentionConfig, setDetentionConfig] = useState<DetentionConfig>({
    urgentDays: 2,
    warningDays: 5
  });

  // Persistence Effect
  useEffect(() => {
    if (businessType) {
      localStorage.setItem('danalog_cs_state', JSON.stringify({ businessType, activeTab }));
    }
  }, [businessType, activeTab]);

  // Removed separate import/export states, now using a single source of truth
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [tallyReports, setTallyReports] = useState<any[]>([]); // Use any temporarily or import TallyReport

  // Helpers to split for legacy child components
  const filteredVessels = vessels.filter(v =>
    businessType === BusinessType.IMPORT ? !v.id.startsWith('v_e') : v.id.startsWith('v_e')
  );

  const filteredContainers = containers.filter(c => {
    const parentVessel = vessels.find(v => v.id === c.vesselId);
    if (!parentVessel) return false;
    return businessType === BusinessType.IMPORT ? !parentVessel.id.startsWith('v_e') : parentVessel.id.startsWith('v_e');
  });


  // Initial Data Load & Sync
  useEffect(() => {
    const load = async () => {
      try {
        const [v, c, w, t] = await Promise.all([
          ApiService.getVessels(),
          ApiService.getContainers(),
          ApiService.getWorkOrders(),
          ApiService.getTallyReports()
        ]);
        setVessels(v);
        setContainers(c);
        setWorkOrders(w);
        setTallyReports(t);
      } catch (err) {
        console.error("Failed to load data", err);
      }
    };
    load();
    // window.addEventListener('storage', load); // localstorage sync no longer relevant with API?
    // With API, we might need polling or socket. For now, just load once.
    // Or keep simple polling? Let's leave it manual refresh or simple load for now.
    // user requested "Production ready", but real-time sync via socket is a bigger task (not in plan).
    // I will comment out storage listener.
    return () => { }; // window.removeEventListener('storage', load);
  }, []);

  // ...

  const handleUpdateVessels = async (newVessels: Vessel[]) => {
    const otherVessels = vessels.filter(v =>
      businessType === BusinessType.IMPORT ? v.id.startsWith('v_e') : !v.id.startsWith('v_e')
    );
    const merged = [...otherVessels, ...newVessels];
    setVessels(merged);
    return ApiService.saveVessels(merged);
  };

  const handleUpdateContainers = async (updatedSubset: Container[]) => {
    const currentModeVesselIds = new Set(filteredVessels.map(v => v.id));
    const containersFromOtherModes = containers.filter(c => !currentModeVesselIds.has(c.vesselId));

    const merged = [...containersFromOtherModes, ...updatedSubset];
    setContainers(merged);
    return ApiService.saveContainers(merged);
  };

  const handleUpdateWorkOrders = async (updatedList: WorkOrder[]) => {
    setWorkOrders(updatedList);
    // supports bulk save per server implementation
    await ApiService.saveWorkOrder(updatedList);
  };

  const handleUpdateTallyReports = async (updatedReports: any[]) => {
    setTallyReports(updatedReports);
    // supports bulk save per server implementation if we pass array
    await ApiService.saveTallyReport(updatedReports);
  };

  const handleLogout = () => {
    localStorage.removeItem('danalog_cs_state');
    onLogout();
  };

  const handleBusinessSelect = (type: BusinessType) => {
    setBusinessType(type);
    setActiveTab('vessels');
  };

  const menuItems = [
    { id: 'vessels', label: businessType === BusinessType.IMPORT ? 'Quản lý Tàu & Import' : 'Quản lý Tàu & Export', icon: ICONS.Ship },
    { id: 'operations', label: 'Lịch sử khai thác', icon: ICONS.Package },
    { id: 'tally', label: 'Phê duyệt Tally', icon: ICONS.FileText },
    { id: 'workorders', label: 'Danh sách PCT', icon: ICONS.ClipboardList },
    { id: 'stats', label: 'Thống kê sản lượng', icon: ICONS.TrendingUp },
    { id: 'dashboard', label: 'Dashboard', icon: ICONS.Layout },
    // Admin only menu
    ...(user.role === 'ADMIN' ? [
      { id: 'accounts', label: 'Quản lý tài khoản', icon: ICONS.User },
      { id: 'resources', label: 'Quản lý nguồn lực', icon: ICONS.Users }
    ] : [])
  ];

  const showBusinessSwitcher = ['vessels', 'operations'].includes(activeTab);

  // REMOVED Login Check
  // if (!isLoggedIn) {
  //   return <Login onLogin={() => setIsLoggedIn(true)} />;
  // }

  if (!businessType) {
    return <BusinessSelect onSelect={handleBusinessSelect} userName={user.name} />;
  }

  const allContainers = containers;
  const allVessels = vessels;
  const allWorkOrders = workOrders;

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden text-slate-900 animate-fadeIn">
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl no-print">
        <div className="p-5 border-b border-slate-800">
          <h1 className="text-xl font-black tracking-tight text-blue-400">DANALOG <span className="text-white">LOGISTICS</span></h1>
          <p className="text-[9px] text-slate-400 mt-0.5 uppercase tracking-widest font-bold">Hệ thống CS khai thác giấy</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg transition-all duration-200 ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
            >
              <item.icon className="w-4.5 h-4.5" />
              <span className="font-semibold text-[13px]">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2.5 p-1.5">
            <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center font-bold text-base">{user.name.charAt(0)}</div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-semibold truncate">{user.name}</p>
              <p className="text-[9px] text-slate-400 uppercase font-bold">{user.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full mt-1.5 flex items-center gap-2 px-2.5 py-2 text-[10px] font-black text-red-400 hover:bg-red-400/10 rounded-lg transition-colors uppercase tracking-wider"
          >
            <ICONS.LogOut className="w-3.5 h-3.5" /> Đăng xuất
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 bg-white border-b flex items-center justify-between px-6 shadow-sm z-10 no-print">
          <div className="flex items-center gap-3">
            <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
            <h2 className="text-base font-black text-slate-800 uppercase tracking-tight">
              {menuItems.find(m => m.id === activeTab)?.label}
            </h2>

            {showBusinessSwitcher && (
              <>
                <div className="h-4 w-px bg-slate-200 mx-1"></div>
                <div className="flex items-center gap-2 animate-fadeIn">
                  <span className="text-[9px] font-black text-slate-400 uppercase">Nghiệp vụ:</span>
                  <div className="relative">
                    <select
                      value={businessType || BusinessType.IMPORT}
                      onChange={(e) => setBusinessType(e.target.value as BusinessType)}
                      className={`appearance-none px-3 py-1 pr-7 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all hover:shadow-sm cursor-pointer outline-none
                          ${businessType === BusinessType.IMPORT
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                    >
                      <option value={BusinessType.IMPORT}>Nhập hàng</option>
                      <option value={BusinessType.EXPORT}>Xuất hàng</option>
                    </select>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg className="w-2.5 h-2.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="px-2.5 py-0.5 bg-green-50 text-green-700 rounded-full text-[9px] font-black border border-green-200 uppercase tracking-widest">Server: Danang-01</div>
          </div>
        </header>



        <div className="flex-1 overflow-y-auto p-6 print:p-0 bg-slate-50/50">
          {activeTab === 'dashboard' && (
            <Dashboard
              containers={allContainers}
              vessels={allVessels}
              detentionConfig={detentionConfig}
              onNavigate={handleDashboardNavigation}
            />
          )}
          {activeTab === 'vessels' && (
            <VesselImport vessels={filteredVessels} onUpdateVessels={handleUpdateVessels} containers={filteredContainers} onUpdateContainers={handleUpdateContainers} />
          )}
          {activeTab === 'operations' && (
            <Operations
              containers={filteredContainers}
              vessels={filteredVessels}
              onUpdateContainers={handleUpdateContainers}
              detentionConfig={detentionConfig}
              onUpdateDetentionConfig={setDetentionConfig}
              initialFilterStatus={operationsParams.filterStatus}
              initialVesselId={operationsParams.vesselId}
            />
          )}
          {activeTab === 'tally' && <TallyReview containers={allContainers} vessels={allVessels} onUpdateContainers={handleUpdateContainers} tallyReports={tallyReports} onUpdateTallyReports={handleUpdateTallyReports} />}
          {activeTab === 'workorders' && (
            <WorkOrderReview containers={allContainers} workOrders={allWorkOrders} onUpdateWorkOrders={handleUpdateWorkOrders} onUpdateContainers={handleUpdateContainers} tallyReports={tallyReports} vessels={allVessels} />
          )}
          {activeTab === 'stats' && <Statistics containers={allContainers} workOrders={allWorkOrders} />}
          {activeTab === 'accounts' && <AccountManagement />}
          {activeTab === 'resources' && <ResourceManagement />}
        </div>
      </main>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out; }

        @media print {
@page { size: ${['stats', 'workorders'].includes(activeTab) ? 'landscape' : 'portrait'}; margin: 5mm; }
          html, body, #root, main { height: auto !important; overflow: visible !important; display: block !important; }
          body { background: white; -webkit-print-color-adjust: exact; }
          .no-print, aside, header { display: none !important; }
          main { margin: 0 !important; padding: 0 !important; }
          .overflow-y-auto, .overflow-x-auto, .overflow-hidden { overflow: visible !important; height: auto !important; }
          
          /* Reset backgrounds for print */
          .bg-gray-100, .bg-slate-50, .bg-slate-50\/50, .bg-white { background: white !important; }
          
          /* Ensure table headers repeat on new pages */
          thead { display: table-header-group; }
          tr { break-inside: avoid; }
        }`}</style>
    </div>
  );
};

export default App;
