import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import Register from './components/Register';
import { LogOut } from 'lucide-react';

function App() {
  const [user, setUser] = useState(null);
  const [authView, setAuthView] = useState('login'); // 'login' or 'register'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const savedUser = localStorage.getItem('fraud_guard_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = (data) => {
    localStorage.setItem('fraud_guard_user', JSON.stringify(data.user));
    localStorage.setItem('fraud_guard_token', data.token);
    setUser(data.user);
  };

  const handleLogout = () => {
    localStorage.removeItem('fraud_guard_user');
    localStorage.removeItem('fraud_guard_token');
    setUser(null);
  };

  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) return null;

  if (!user) {
    return authView === 'login' ? (
      <Login onLogin={handleLogin} onSwitchToRegister={() => setAuthView('register')} />
    ) : (
      <Register onRegisterSuccess={() => setAuthView('login')} onSwitchToLogin={() => setAuthView('login')} />
    );
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'manual-check', label: 'Analytics' },
    { id: 'vision', label: 'Vision' },
    { id: 'history', label: 'Database' }
  ];

  return (
    <div className="min-h-screen bg-slate-950 selection:bg-blue-500/30">
      {/* Navigation - Top Bar */}
      <nav className="h-16 border-b border-slate-800/50 flex items-center px-8 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
            F
          </div>
          <span className="font-bold text-xl tracking-tight text-white">Unified Financial <span className="text-blue-500 font-medium">Fraud Detection System</span></span>
        </div>
        
        <div className="ml-auto flex items-center gap-6">
          <div className="hidden md:flex gap-6 text-sm font-medium text-slate-400">
            {navItems.map(item => (
              <button 
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`hover:text-white transition-all relative py-2 ${
                  activeTab === item.id ? 'text-blue-500' : ''
                }`}
              >
                {item.label}
                {activeTab === item.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 animate-in fade-in slide-in-from-bottom-1" />
                )}
              </button>
            ))}
          </div>
          <div className="h-4 w-[1px] bg-slate-800 hidden md:block" />
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold border border-slate-700 text-white uppercase">
              {user.username.substring(0, 2)}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white leading-none">{user.username}</span>
              <span className="text-[10px] text-slate-500 uppercase font-bold mt-1">{user.role} Console</span>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-500 hover:text-rose-500 transition-colors ml-2"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        <Dashboard user={user} activeTab={activeTab} setActiveTab={setActiveTab} />
      </main>

      {/* Footer / Status Bar */}
      <footer className="py-6 border-t border-slate-800/50 px-8 flex justify-between items-center text-slate-500 text-xs">
        <p>© 2024 Unified Financial Fraud Detection System. Protected by Advanced ML.</p>
        <div className="flex gap-4">
          <span className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> API: Responsive
          </span>
          <span className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> ML Engine: Active
          </span>
        </div>
      </footer>
    </div>
  );
}

export default App;
