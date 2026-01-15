import React, { useState } from 'react';
// import { MOCK_AUTH_DATABASE } from '../constants'; // Removed static import
import { ApiService } from '../services/api';

interface UnifiedLoginProps {
    onLogin: (role: 'CS' | 'INSPECTOR' | 'ADMIN', user: any) => void;
}

const UnifiedLogin: React.FC<UnifiedLoginProps> = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const data = await ApiService.login({ username, password });
            if (data.success && data.user) {
                onLogin(data.user.role, data.user);
            } else {
                setError('Đăng nhập thất bại.');
                setLoading(false);
            }
        } catch (err) {
            setError('Tài khoản hoặc mật khẩu không chính xác!');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
            <div className="max-w-md w-full animate-fadeIn">
                {/* Logo Section */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-900 rounded-3xl shadow-2xl mb-4 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
                        <svg className="text-blue-400 w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-black tracking-tighter text-slate-900 uppercase">
                        DANALOG <span className="text-blue-600">PORTAL</span>
                    </h1>
                    <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.2em] mt-2">Cổng thông tin hợp nhất</p>
                </div>

                {/* Login Card */}
                <div className="bg-white p-8 rounded-[2rem] shadow-2xl border border-slate-100">
                    <form onSubmit={handleSubmit} className="space-y-5 text-left">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tên đăng nhập</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    autoFocus
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3.5 pl-11 font-bold text-slate-700 focus:bg-white focus:border-blue-500 outline-none transition-all text-sm"
                                    placeholder="Nhập username..."
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                />
                                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Mật khẩu</label>
                            <div className="relative">
                                <input
                                    type="password"
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3.5 pl-11 font-bold text-slate-700 focus:bg-white focus:border-blue-500 outline-none transition-all text-sm"
                                    placeholder="Nhập password..."
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-red-500 bg-red-50 p-3 rounded-lg border border-red-100 text-xs font-bold animate-shake">
                                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-slate-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            {loading ? 'Đang xử lý...' : 'Đăng nhập hệ thống'}
                        </button>
                    </form>


                </div>
            </div>
            <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        .animate-fadeIn { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}</style>
        </div>
    );
};

export default UnifiedLogin;
