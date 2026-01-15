
import React from 'react';

// Hardcoded accounts for demonstration
const ACCOUNTS: Record<string, { name: string; pass: string }> = {
  'khanh': { name: 'Hà Xuân Khánh', pass: '1' },
  'dung': { name: 'Hồ Kỳ Dũng', pass: '1' },
  'vi': { name: 'Nguyễn Mai Vi', pass: '1' },
  'admin': { name: 'Quản trị viên', pass: '1' }
};

interface LoginViewProps {
  onLogin: (user: { name: string, role: string }) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const account = ACCOUNTS[username.toLowerCase()];
    if (account && account.pass === password) {
      onLogin({ name: account.name, role: 'INSPECTOR' });
    } else {
      setError('Tên đăng nhập hoặc mật khẩu không đúng!');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6 space-y-8">
      <div className="text-center">
        <div className="w-24 h-24 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg rotate-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="text-3xl font-extrabold text-blue-900">DANALOG</h1>
        <p className="text-gray-500 font-medium tracking-widest uppercase text-xs mt-2">Đăng nhập hệ thống</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white p-8 rounded-3xl shadow-xl border border-gray-100 space-y-6">
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Tài khoản</label>
          <input
            type="text"
            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none font-bold text-gray-700"
            placeholder="Nhập tên đăng nhập..."
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Mật khẩu</label>
          <input
            type="password"
            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none font-bold text-gray-700"
            placeholder="Nhập mật khẩu..."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-500 text-sm font-bold rounded-xl flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-lg hover:bg-blue-700 active:scale-95 transition-all uppercase tracking-wider text-sm"
        >
          Đăng nhập ngay
        </button>
      </form>

      <div className="text-center space-y-2">
        <p className="text-xs text-gray-400 font-medium">Tài khoản mặc định (Mật khẩu: 1)</p>
        <div className="flex flex-wrap justify-center gap-2">
          {Object.entries(ACCOUNTS).slice(0, 3).map(([user, data]) => (
            <span key={user} className="inline-block px-3 py-1 bg-gray-100 rounded-lg text-xs text-gray-500 font-mono">
              {user}
            </span>
          ))}
        </div>
      </div>

      <div className="text-gray-300 text-[10px] text-center uppercase font-black tracking-widest">
        Logistics Cảng Đà Nẵng © 2024
      </div>
    </div>
  );
};

export default LoginView;
