import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../utils/helpers';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (e, p) => { setEmail(e); setPassword(p); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-xl">🏢</div>
          <h1 className="text-2xl font-bold text-white">Employee Management</h1>
          <p className="text-gray-400 text-sm mt-1">Sign in to your account</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="label">Email Address</label>
              <input
                type="email"
                className="input"
                placeholder="you@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                >
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 text-base">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center mb-3 font-medium">DEMO ACCOUNTS</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'CEO', email: 'ceo@company.com', color: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100' },
                { label: 'Manager', email: 'sara@company.com', color: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' },
                { label: 'Employee', email: 'layla@company.com', color: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' },
              ].map(acc => (
                <button
                  key={acc.label}
                  type="button"
                  onClick={() => quickLogin(acc.email, 'password123')}
                  className={`border rounded-lg py-2 px-1 text-xs font-medium transition-colors ${acc.color}`}
                >
                  {acc.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 text-center mt-2">Password: <code className="bg-gray-100 px-1 rounded">password123</code></p>
          </div>
        </div>

        <p className="text-center text-gray-500 text-xs mt-6">
          © {new Date().getFullYear()} Employee Management System
        </p>
      </div>
    </div>
  );
}
