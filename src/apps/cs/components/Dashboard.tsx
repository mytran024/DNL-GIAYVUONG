
import React, { useState, useMemo } from 'react';
import { ICONS } from '../constants';
import { Container, Vessel, ContainerStatus, DetentionConfig } from '../../../types/index';
import { checkDetentionStatus } from '../services/dataService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

interface DashboardProps {
  containers: Container[];
  vessels: Vessel[];
  detentionConfig: DetentionConfig;
  onNavigate: (tab: string, params?: { filterStatus?: string; vesselId?: string }) => void; // New prop
}

const Dashboard: React.FC<DashboardProps> = ({ containers, vessels, detentionConfig, onNavigate }) => {
  // Filter States
  const [filterVesselId, setFilterVesselId] = useState<string>('ALL');
  const [filterConsignee, setFilterConsignee] = useState<string>('ALL');
  const [filterMonth, setFilterMonth] = useState<string>('ALL');
  const [filterYear, setFilterYear] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Derived Data for Filters
  const uniqueConsignees = useMemo(() => {
    const consignees = new Set(vessels.map(v => v.consignee).filter(Boolean));
    return Array.from(consignees);
  }, [vessels]);

  const years = useMemo(() => {
    // Collect years from vessel ETAs or container dates
    const yearsSet = new Set<string>();
    const currentYear = new Date().getFullYear().toString();
    yearsSet.add(currentYear);
    vessels.forEach(v => {
      if (v.eta) yearsSet.add(v.eta.split('-')[0]);
    });
    return Array.from(yearsSet).sort().reverse();
  }, [vessels]);

  // Filtering Logic
  const filteredData = useMemo(() => {
    let fContainers = containers;
    let fVessels = vessels;

    // 1. Filter Containers by Date Range (Plan Date - ngayKeHoach)
    if (startDate || endDate) {
      fContainers = fContainers.filter(c => {
        if (!c.ngayKeHoach) return false;
        // Handle dd/MM/yyyy or yyyy-MM-dd
        let d = c.ngayKeHoach;
        if (d.includes('/')) {
          const [DD, MM, YYYY] = d.split('/');
          d = `${YYYY}-${MM}-${DD}`;
        }
        const planDate = new Date(d).getTime();
        const start = startDate ? new Date(startDate).getTime() : 0;
        const end = endDate ? new Date(endDate).getTime() : Infinity;
        return planDate >= start && planDate <= end;
      });
    }

    // 2. Filter Vessels based on Filtered Containers (if Date Range is active)
    // If date range is active, only show vessels involved in those containers?
    // User requirement: "Khoảng thời gian là theo plandate".
    // If we strictly follow this, vessels with no containers in that plan date range might be irrelevant?
    // Let's filter vessels that have matching containers OR if no date range, keep all.
    if (startDate || endDate) {
      const activeVesselIds = new Set(fContainers.map(c => c.vesselId));
      fVessels = fVessels.filter(v => activeVesselIds.has(v.id));
    }

    // 3. Filter by Consignee
    if (filterConsignee !== 'ALL') {
      fVessels = fVessels.filter(v => v.consignee === filterConsignee);
    }

    // 4. Filter by Vessel ID
    if (filterVesselId !== 'ALL') {
      fVessels = fVessels.filter(v => v.id === filterVesselId);
    }

    // 5. Filter by Month/Year (Ship ETA)
    if (filterMonth !== 'ALL' || filterYear !== 'ALL') {
      fVessels = fVessels.filter(v => {
        if (!v.eta) return false;
        const d = new Date(v.eta);
        const matchMonth = filterMonth === 'ALL' || (d.getMonth() + 1).toString() === filterMonth;
        const matchYear = filterYear === 'ALL' || d.getFullYear().toString() === filterYear;
        return matchMonth && matchYear;
      });
    }

    // 6. Sync Containers with Final Vessel List
    // We already filtered containers by Date. Now ensure they belong to the filtered vessels (e.g. Consignee/ID/Month filter)
    const validVesselIds = new Set(fVessels.map(v => v.id));
    fContainers = fContainers.filter(c => validVesselIds.has(c.vesselId));

    return { vessels: fVessels, containers: fContainers };
  }, [vessels, containers, filterConsignee, filterVesselId, filterMonth, filterYear, startDate, endDate]);

  const handleClearFilters = () => {
    setFilterVesselId('ALL');
    setFilterConsignee('ALL');
    setFilterMonth('ALL');
    setFilterYear('ALL');
    setStartDate('');
    setEndDate('');
  };

  const stats = {
    total: filteredData.containers.length,
    ready: filteredData.containers.filter(c => !!(c.tkNhaVC && c.tkDnlOla) && c.status !== ContainerStatus.COMPLETED).length, // Match Operations logic
    urgentDet: filteredData.containers.filter(c => checkDetentionStatus(c.detExpiry, detentionConfig) === 'urgent' && c.status !== ContainerStatus.COMPLETED).length,
    completed: filteredData.containers.filter(c => c.status === ContainerStatus.COMPLETED).length,
  };

  const chartData = [
    { name: 'Sẵn sàng', count: stats.ready, fill: '#3B82F6' },
    { name: 'Đang khai thác', count: filteredData.containers.filter(c => c.status === ContainerStatus.IN_PROGRESS).length, fill: '#F59E0B' },
    { name: 'Hoàn tất', count: stats.completed, fill: '#10B981' },
    { name: 'Chờ TK', count: filteredData.containers.filter(c => c.status === ContainerStatus.PENDING).length, fill: '#94A3B8' },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-wrap items-center gap-4">
        {/* Vessel Filter */}
        <select
          value={filterVesselId}
          onChange={(e) => setFilterVesselId(e.target.value)}
          className="bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-sm font-bold text-gray-600 outline-none focus:border-blue-500 min-w-[200px]"
        >
          <option value="ALL">Tất cả tàu</option>
          {vessels.map(v => (
            <option key={v.id} value={v.id}>{v.vesselName} {v.voyageNo && v.voyageNo !== 'N/A' ? `- ${v.voyageNo}` : ''}</option>
          ))}
        </select>

        {/* Consignee Filter */}
        <select
          value={filterConsignee}
          onChange={(e) => setFilterConsignee(e.target.value)}
          className="bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-sm font-bold text-gray-600 outline-none focus:border-blue-500 min-w-[150px]"
        >
          <option value="ALL">Tất cả chủ hàng</option>
          {uniqueConsignees.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Month Filter */}
        <select
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-sm font-bold text-gray-600 outline-none focus:border-blue-500"
        >
          <option value="ALL">Tháng</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
            <option key={m} value={m.toString()}>Tháng {m}</option>
          ))}
        </select>

        {/* Year Filter */}
        <select
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
          className="bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-sm font-bold text-gray-600 outline-none focus:border-blue-500"
        >
          <option value="ALL">Năm</option>
          {years.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        {/* Date Range */}
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2" title="Lọc theo Plan Date (Ngày kế hoạch)">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-transparent py-2 text-sm font-bold text-gray-600 outline-none w-[110px]"
          />
          <span className="text-gray-400">-</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-transparent py-2 text-sm font-bold text-gray-600 outline-none w-[110px]"
          />
        </div>

        {/* Clear Filter Button */}
        {(filterVesselId !== 'ALL' || filterConsignee !== 'ALL' || filterMonth !== 'ALL' || filterYear !== 'ALL' || startDate || endDate) && (
          <button
            onClick={handleClearFilters}
            className="px-3 py-2 text-xs font-black text-red-500 uppercase tracking-wider hover:bg-red-50 rounded-lg transition-colors ml-auto"
          >
            Xóa lọc
          </button>
        )}

      </div>
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Tổng Container"
          value={stats.total}
          icon={<ICONS.Ship className="text-blue-600" />}
          trend="+5% từ tuần trước"
          bgColor="bg-blue-50"
          onClick={() => onNavigate('operations', { filterStatus: 'ALL' })}
        />
        <MetricCard
          title="Sẵn sàng khai thác"
          value={stats.ready}
          icon={<ICONS.CheckCircle className="text-green-600" />}
          trend="Dựa trên tờ khai"
          bgColor="bg-green-50"
          onClick={() => onNavigate('operations', { filterStatus: 'NOT_STARTED' })}
        />
        <MetricCard
          title="Cảnh báo DET (Gấp)"
          value={stats.urgentDet}
          icon={<ICONS.AlertTriangle className="text-red-600" />}
          trend={`Hết hạn < ${detentionConfig.urgentDays} ngày`}
          bgColor="bg-red-50"
          onClick={() => onNavigate('operations', { filterStatus: 'URGENT_DET' })}
        />
        <MetricCard
          title="Hoàn tất trong ngày"
          value={stats.completed}
          icon={<ICONS.FileText className="text-indigo-600" />}
          trend="Cập nhật 2 phút trước"
          bgColor="bg-indigo-50"
          onClick={() => onNavigate('operations', { filterStatus: 'COMPLETED' })}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="text-lg font-semibold mb-6 text-gray-800">Trạng thái Container toàn hệ thống</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#F8FAFC' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Vessel Activity List */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Chuyến tàu đang xử lý</h3>
          <div className="space-y-4">
            {vessels.map(v => (
              <div
                key={v.id}
                className="p-4 rounded-lg bg-gray-50 border border-gray-100 text-left hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group"
                onClick={() => onNavigate('operations', { vesselId: v.id })}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{v.vesselName}</h4>
                  {v.voyageNo && v.voyageNo !== 'N/A' && (
                    <span className="text-xs font-mono bg-white px-2 py-1 rounded border shadow-sm text-slate-600">{v.voyageNo}</span>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-1 text-[10px] text-gray-500 uppercase font-bold tracking-tight">
                  <p className="truncate text-blue-600">Hàng: {v.commodity}</p>
                  <p>Sản lượng: {v.totalWeight.toFixed(1)} Tấn</p>
                </div>
                <div className="mt-3 bg-gray-200 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full w-[65%]"></div>
                </div>
              </div>
            ))}
            {vessels.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Chưa có chuyến tàu nào</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard: React.FC<{
  title: string;
  value: number | string;
  icon: React.ReactNode;
  trend: string;
  bgColor: string;
  onClick?: () => void; // New prop
}> = ({
  title, value, icon, trend, bgColor, onClick
}) => (
    <div
      onClick={onClick}
      className={`bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow text-left ${onClick ? 'cursor-pointer hover:border-blue-300 group' : ''}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-lg ${bgColor}`}>
          {icon}
        </div>
      </div>
      <div className="space-y-1">
        <h4 className="text-sm font-medium text-gray-500 group-hover:text-blue-500 transition-colors">{title}</h4>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-400 mt-2">{trend}</p>
      </div>
    </div>
  );

export default Dashboard;
