import React, { useState, useEffect } from 'react';
import { ApiService } from '../../../services/api';
import { User, UserRole } from '../../../types/index';

const AccountManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [filterRole, setFilterRole] = useState<string>('ALL');
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        name: '',
        role: UserRole.INSPECTOR,
        isActive: true,
        phoneNumber: '',
        department: 'Kho'
    });

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        const data = await ApiService.getUsers();
        setUsers(data);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        // Basic Validation
        if (!editingUser) {
            // Check unique username for new users
            if (users.some(u => u.username === formData.username)) {
                alert('Tên đăng nhập đã tồn tại!');
                return;
            }
        }

        const payload = {
            ...formData,
            id: editingUser ? editingUser.id : `u-${Date.now()}`,
            createdAt: editingUser ? editingUser.createdAt : new Date().toISOString()
        };

        await ApiService.saveUser(payload);
        loadUsers();
        closeModal();
    };

    const handleDelete = async (userId: string) => {
        if (confirm('Bạn có chắc chắn muốn xóa/hủy kích hoạt tài khoản này?')) {
            await ApiService.deleteUser(userId);
            loadUsers();
        }
    };

    const openModal = (user?: User) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                username: user.username,
                password: user.password || '', // Usually don't show password, but for this simple app...
                name: user.name,
                role: user.role,
                isActive: user.isActive,
                phoneNumber: user.phoneNumber || '',
                department: user.department || 'Kho'
            });
        } else {
            setEditingUser(null);
            setFormData({
                username: '',
                password: '',
                name: '',
                role: UserRole.INSPECTOR,
                isActive: true,
                phoneNumber: '',
                department: 'Kho'
            });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
    };

    const filteredUsers = users.filter(u => {
        const matchesRole = filterRole === 'ALL' || u.role === filterRole;
        const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
            u.username.toLowerCase().includes(search.toLowerCase());
        return matchesRole && matchesSearch;
    });

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Quản lý Tài khoản</h2>
                <button
                    onClick={() => openModal()}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider shadow-lg transition-all active:scale-95"
                >
                    + Thêm mới
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-4 items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <div className="relative flex-1 max-w-sm">
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo tên hoặc username..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold outline-none focus:border-blue-500 transition-all"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
                <select
                    className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
                    value={filterRole}
                    onChange={e => setFilterRole(e.target.value)}
                >
                    <option value="ALL">Tất cả vai trò</option>
                    <option value={UserRole.ADMIN}>ADMIN</option>
                    <option value={UserRole.CS}>CS</option>
                    <option value={UserRole.INSPECTOR}>INSPECTOR</option>
                </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                            <th className="p-4">Họ và tên</th>
                            <th className="p-4">Tên đăng nhập</th>
                            <th className="p-4">Số điện thoại</th>
                            <th className="p-4">Bộ phận</th>
                            <th className="p-4">Vai trò</th>
                            <th className="p-4">Trạng thái</th>
                            <th className="p-4 text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredUsers.map(user => (
                            <tr key={user.id} className="hover:bg-blue-50/50 transition-colors cursor-default">
                                <td className="p-4">
                                    <div className="font-bold text-slate-800 text-sm">{user.name}</div>
                                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{user.id}</div>
                                </td>
                                <td className="p-4 font-mono text-sm text-slate-600 font-semibold">{user.username}</td>
                                <td className="p-4 text-sm font-bold text-slate-700">{user.phoneNumber || '-'}</td>
                                <td className="p-4">
                                    <span className="inline-block px-2 py-1 rounded bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider border border-slate-200">
                                        {user.department || 'Kho'}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border
                                        ${user.role === UserRole.ADMIN ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                            user.role === UserRole.CS ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                'bg-orange-50 text-orange-700 border-orange-200'}`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border
                                        ${user.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                        {user.isActive ? 'Hoạt động' : 'Đã khóa'}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => openModal(user)}
                                            className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                                            title="Chỉnh sửa"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(user.id)}
                                            className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                                            title="Xóa / Khóa"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                                {editingUser ? 'Cập nhật tài khoản' : 'Thêm tài khoản mới'}
                            </h3>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Họ và tên</label>
                                <input
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-500"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
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
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Tên đăng nhập</label>
                                <input
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-500"
                                    value={formData.username}
                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                    required
                                    disabled={!!editingUser} // Prevent changing username for edit
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Mật khẩu</label>
                                <input
                                    type="password"
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-500"
                                    placeholder={editingUser ? "Để trống nếu không đổi..." : "Nhập mật khẩu..."}
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    required={!editingUser}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
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
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Vai trò</label>
                                    <select
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-500"
                                        value={formData.role}
                                        onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
                                    >
                                        <option value={UserRole.ADMIN}>ADMIN</option>
                                        <option value={UserRole.CS}>CS</option>
                                        <option value={UserRole.INSPECTOR}>INSPECTOR</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 p-3 w-full bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                    checked={formData.isActive}
                                    onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                                />
                                <span className="text-sm font-bold text-slate-700">Đang hoạt động</span>
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
                                    {editingUser ? 'Lưu thay đổi' : 'Tạo tài khoản'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AccountManagement;
