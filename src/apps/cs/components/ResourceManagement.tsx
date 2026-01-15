
import React, { useState, useEffect } from 'react';
import { ApiService } from '../../../services/api';
import { ICONS } from '../constants';
import { ResourceItem } from '../../../types/index';

const ResourceManagement: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'WORKERS' | 'TEAMS'>('WORKERS');
    const [workers, setWorkers] = useState<ResourceItem[]>([]);
    const [teams, setTeams] = useState<ResourceItem[]>([]);

    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<ResourceItem | null>(null);
    const [formData, setFormData] = useState<ResourceItem>({
        id: '',
        name: '',
        phoneNumber: '',
        department: 'Kho'
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const w = await ApiService.getWorkers();
        setWorkers(w);
        const t = await ApiService.getTeams();
        setTeams(t);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        const currentList = activeTab === 'WORKERS' ? workers : teams;

        // Validation: Unique Name (excluding self)
        if (currentList.some(item => item.name.toLowerCase() === formData.name.toLowerCase() && item.id !== formData.id)) {
            alert(`Tên ${activeTab === 'WORKERS' ? 'công nhân' : 'đội cơ giới'} đã tồn tại!`);
            return;
        }

        const payload = {
            ...formData,
            id: editingItem ? editingItem.id : `${activeTab === 'WORKERS' ? 'w' : 't'}-${Date.now()}`
        };

        if (activeTab === 'WORKERS') {
            const updated = editingItem
                ? workers.map(w => w.id === payload.id ? payload : w)
                : [...workers, payload];
            await ApiService.saveWorkers(updated); // Bulk save for now to match backend sync logic
            setWorkers(updated);
        } else {
            const updated = editingItem
                ? teams.map(t => t.id === payload.id ? payload : t)
                : [...teams, payload];
            await ApiService.saveTeams(updated);
            setTeams(updated);
        }
        closeModal();
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Bạn có chắc chắn muốn xóa "${name}" không?`)) return;

        if (activeTab === 'WORKERS') {
            const updated = workers.filter(w => w.id !== id);
            await ApiService.saveWorkers(updated);
            setWorkers(updated);
        } else {
            const updated = teams.filter(t => t.id !== id);
            await ApiService.saveTeams(updated);
            setTeams(updated);
        }
    };

    const openModal = (item?: ResourceItem) => {
        if (item) {
            setEditingItem(item);
            setFormData(item);
        } else {
            setEditingItem(null);
            setFormData({
                id: '',
                name: '',
                phoneNumber: '',
                department: 'Kho'
            });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingItem(null);
    };

    const currentList = activeTab === 'WORKERS' ? workers : teams;

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-8rem)]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Quản lý nguồn lực</h2>
                    <p className="text-[11px] font-black text-slate-400 uppercase mt-1">
                        Quản lý danh sách Công nhân và Đội cơ giới
                    </p>
                </div>

                <div className="flex gap-4">
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button
                            onClick={() => setActiveTab('WORKERS')}
                            className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase transition-all ${activeTab === 'WORKERS'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            Công nhân ({workers.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('TEAMS')}
                            className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase transition-all ${activeTab === 'TEAMS'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            Đội cơ giới ({teams.length})
                        </button>
                    </div>
                    <button
                        onClick={() => openModal()}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider shadow-lg transition-all active:scale-95 flex items-center gap-2"
                    >
                        <span>+ Thêm mới</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                                <th className="p-4 w-16 text-center">STT</th>
                                <th className="p-4">Tên {activeTab === 'WORKERS' ? 'nhân sự' : 'đội'}</th>
                                <th className="p-4">Số điện thoại</th>
                                <th className="p-4">Bộ phận</th>
                                <th className="p-4 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {currentList.map((item, idx) => (
                                <tr key={item.id} className="hover:bg-blue-50/50 transition-colors">
                                    <td className="p-4 text-center">
                                        <div className={`w-6 h-6 rounded-full mx-auto flex items-center justify-center font-black text-[10px] ${activeTab === 'WORKERS' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                            {idx + 1}
                                        </div>
                                    </td>
                                    <td className="p-4 font-bold text-slate-700 text-sm">{item.name}</td>
                                    <td className="p-4 text-sm font-semibold text-slate-600">{item.phoneNumber || '-'}</td>
                                    <td className="p-4">
                                        <span className="inline-block px-2 py-1 rounded bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider border border-slate-200">
                                            {item.department}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => openModal(item)}
                                                className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                                                title="Sửa"
                                            >
                                                <ICONS.Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id, item.name)}
                                                className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                                                title="Xóa"
                                            >
                                                <ICONS.Trash className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {currentList.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-slate-400 font-bold text-xs uppercase">
                                        Chưa có dữ liệu
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                                {editingItem ? 'Cập nhật thông tin' : 'Thêm mới'}
                            </h3>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">
                                    Tên {activeTab === 'WORKERS' ? 'nhân sự' : 'đội'}
                                </label>
                                <input
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-500"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    placeholder="Nhập tên..."
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Số điện thoại</label>
                                <input
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-500"
                                    value={formData.phoneNumber}
                                    onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                                    placeholder="Nhập số điện thoại..."
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Bộ phận</label>
                                <select
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-500"
                                    value={formData.department}
                                    onChange={e => setFormData({ ...formData, department: e.target.value })}
                                >
                                    <option value="Kho">Kho</option>
                                    <option value="Vận tải">Vận tải</option>
                                    <option value="Depot">Depot</option>
                                </select>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-200 transition-all active:scale-95"
                                >
                                    {editingItem ? 'Lưu' : 'Thêm'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResourceManagement;
