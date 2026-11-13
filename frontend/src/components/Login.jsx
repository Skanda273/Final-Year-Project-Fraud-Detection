import React, { useState } from 'react';
import { ShieldCheck, User, Lock, ArrowRight } from 'lucide-react';
import { API_BASE_URL } from '../config';

const Login = ({ onLogin, onSwitchToRegister }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok) {
        onLogin(data);
        return;
      } else {
        // If server returned an error (e.g. invalid credentials)
        // Check offline registered users as fallback
        const localUsers = JSON.parse(localStorage.getItem('fraud_demo_users') || '{}');
        const found = localUsers[username.toLowerCase().trim()];
        if (found && found.password === password) {
          onLogin({
            token: 'demo-token-' + Date.now(),
            user: { username: found.username, role: found.role || 'admin' }
          });
          return;
        }
        setError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      // Backend unreachable (e.g. running on Vercel without deployed backend)
      const localUsers = JSON.parse(localStorage.getItem('fraud_demo_users') || '{}');
      const found = localUsers[username.toLowerCase().trim()];
      if (found && found.password === password) {
        onLogin({
          token: 'demo-token-' + Date.now(),
          user: { username: found.username, role: found.role || 'admin' }
        });
        return;
      }
      // Allow instant access so visitors on Vercel can test without a setup
      onLogin({
        token: 'demo-token-' + Date.now(),
        user: { username: username.trim() || 'Security Officer', role: 'admin' }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = () => {
    onLogin({
      token: 'demo-token-' + Date.now(),
      user: { username: 'Admin Evaluator', role: 'admin' }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-panel p-8 w-full max-w-md space-y-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg shadow-blue-900/40">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight mt-4">Security Login</h2>
          <p className="text-slate-400 text-sm">Unified Financial Fraud Detection System</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Username</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="text"
                required
                placeholder="Enter admin ID"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 pl-12 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="password"
                required
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 pl-12 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-medium p-3 rounded-lg text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/40"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
            {!loading && <ArrowRight size={18} />}
          </button>

          <button
            type="button"
            onClick={handleQuickDemo}
            className="w-full bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold py-3 px-4 rounded-xl border border-slate-800 flex items-center justify-center gap-2 transition-all"
          >
            🚀 1-Click Instant Demo Access (No password needed)
          </button>
        </form>

        <div className="text-center pt-4 border-t border-slate-800/50">
          <p className="text-sm text-slate-500">
            Don't have an account?{' '}
            <button 
              onClick={onSwitchToRegister}
              className="text-blue-500 font-bold hover:underline"
            >
              Register Now
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
