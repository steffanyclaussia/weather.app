import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface AuthProps {
  onBack?: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onBack }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        if (!username.trim()) {
          throw new Error("Username is required");
        }
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        
        if (data.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([{ id: data.user.id, email, username }]);
            
          if (profileError) {
             console.error("Profile creation error:", profileError);
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-[#0f172a] to-[#020617] relative">
      
      {onBack && (
        <button 
          onClick={onBack}
          className="absolute top-6 left-6 p-3 bg-slate-900/50 rounded-full text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition-colors shadow-lg border border-slate-800/50 z-10 backdrop-blur-sm"
          title="Kembali ke Cuaca"
        >
          <ArrowLeft size={24} />
        </button>
      )}

      <div className="bg-slate-900/40 p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-full max-w-md border border-slate-800/50 relative z-0 backdrop-blur-md">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-medium text-slate-100 mb-2 tracking-wide">
            {isLogin ? 'Masuk' : 'Daftar Akun Baru'}
          </h2>
          <p className="text-slate-500 text-sm font-light">
            {isLogin ? "Masukkan email dan password Anda untuk masuk." : "Daftarkan diri Anda untuk mulai mengobrol."}
          </p>
        </div>

        {error && (
          <div className="bg-rose-900/20 border border-rose-500/30 text-rose-400 p-3 rounded-xl mb-6 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-5">
          {!isLogin && (
            <div>
              <label className="block text-slate-500 text-[10px] font-semibold uppercase tracking-widest mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-800/80 text-slate-200 p-3.5 rounded-xl focus:outline-none focus:border-indigo-500/50 transition-all placeholder-slate-700 text-sm"
                placeholder="Username Anda"
                required={!isLogin}
              />
            </div>
          )}
          <div>
            <label className="block text-slate-500 text-[10px] font-semibold uppercase tracking-widest mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950/50 border border-slate-800/80 text-slate-200 p-3.5 rounded-xl focus:outline-none focus:border-indigo-500/50 transition-all placeholder-slate-700 text-sm"
              placeholder="email@contoh.com"
              required
            />
          </div>
          <div>
            <label className="block text-slate-500 text-[10px] font-semibold uppercase tracking-widest mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950/50 border border-slate-800/80 text-slate-200 p-3.5 rounded-xl focus:outline-none focus:border-indigo-500/50 transition-all placeholder-slate-700 text-sm"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3.5 rounded-xl transition-all mt-8 disabled:opacity-50 shadow-lg shadow-indigo-900/20 tracking-wide"
          >
            {loading ? 'Memproses...' : isLogin ? 'Masuk' : 'Daftar'}
          </button>
        </form>

        <div className="mt-8 text-sm text-center text-slate-500 font-light">
          {isLogin ? 'Belum punya akun? ' : 'Sudah punya akun? '}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-indigo-400 hover:text-indigo-300 hover:underline focus:outline-none font-medium transition-colors"
          >
            {isLogin ? 'Daftar' : 'Masuk'}
          </button>
        </div>
      </div>
    </div>
  );
};
