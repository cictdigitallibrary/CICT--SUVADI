import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, ArrowRight, Lock } from 'lucide-react';
import axios from 'axios';

const AdminLogin = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:3001/api/admin/login', { username, password });
      if (res.data && res.data.token) {
        onLogin(res.data.token);
      }
    } catch (err) {
      setError(true);
      setTimeout(() => setError(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-ivory flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] opacity-[0.02]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gold/5 blur-[100px] pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md px-6"
      >
        <div className="bg-white rounded-3xl shadow-2xl shadow-maroon/5 border border-maroon/10 overflow-hidden">
          {/* Header */}
          <div className="bg-maroon p-10 flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-gold to-transparent opacity-80" />
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6 border border-white/10 shadow-inner">
              <Lock className="w-7 h-7 text-gold" />
            </div>
            <h1 className="font-cinzel text-2xl font-black text-white tracking-widest uppercase mb-2">Suvadi Portal</h1>
            <p className="text-gold/80 text-[10px] uppercase tracking-[0.3em] font-bold">Authorized Access Only</p>
          </div>

          {/* Form */}
          <div className="p-10 pt-8">
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 bg-red-50 text-red-600 text-[11px] font-bold uppercase tracking-wider p-4 rounded-xl border border-red-100 flex items-center gap-3"
                >
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  Invalid username or password
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div>
                <label className="block text-[10px] font-black text-stone/40 uppercase tracking-widest mb-2">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-stone/5 border border-stone/10 rounded-xl px-4 py-3.5 text-sm font-bold text-maroon focus:ring-2 focus:ring-gold/30 focus:border-gold/50 outline-none transition-all"
                  placeholder="Enter admin username"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-stone/40 uppercase tracking-widest mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-stone/5 border border-stone/10 rounded-xl px-4 py-3.5 text-sm text-maroon focus:ring-2 focus:ring-gold/30 focus:border-gold/50 outline-none transition-all font-sans"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                className="mt-4 w-full bg-maroon text-white py-4 rounded-xl font-black uppercase tracking-widest text-[11px] hover:bg-maroon-dark transition-all shadow-lg shadow-maroon/20 hover:shadow-xl hover:shadow-maroon/30 flex items-center justify-center gap-2 group"
              >
                Sign In Securely
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          </div>
        </div>
        
        <p className="text-center text-[10px] text-stone/40 uppercase tracking-widest mt-8 font-bold">
          © {new Date().getFullYear()} Central Institute of Classical Tamil
        </p>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
