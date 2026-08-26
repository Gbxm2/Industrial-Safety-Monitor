import React, { useState } from "react";
import { HardHat, User, Lock, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { motion } from "motion/react";

interface LoginProps {
  onLogin: (user: string, pass: string) => void;
  onGoToRegister: () => void;
  error?: string;
}

export default function Login({ onLogin, onGoToRegister, error }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(username, password);
  };

  return (
    <div className="relative h-screen w-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-referrer"
        style={{ 
          backgroundImage: `url('https://images.unsplash.com/photo-1516937941344-00b4e0337589?q=80&w=2070&auto=format&fit=crop')`,
          filter: 'brightness(0.6)'
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />

      {/* Login Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-[400px] p-8 bg-[#1a1616]/90 backdrop-blur-xl rounded-2xl border border-white/5 shadow-2xl"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-6">
            <AlertTriangle className="w-8 h-8 text-yellow-500" />
            <span className="text-2xl font-bold text-white tracking-tight">Safety Monitor</span>
          </div>
          
          <div className="w-full h-[1px] bg-white/10 mb-8" />
          
          <h2 className="text-3xl font-medium text-white mb-8">Industrial Login</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <User className="w-5 h-5 text-zinc-500" />
            </div>
            <input
              type="text"
              placeholder="Nome de usuário ou email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#2a2424] border border-white/5 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 transition-all"
              required
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Lock className="w-5 h-5 text-zinc-500" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#2a2424] border border-white/5 rounded-xl py-4 pl-12 pr-12 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 transition-all"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-4 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {error && (
            <p className="text-red-500 text-xs font-medium text-center">{error}</p>
          )}

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-[#f5c362] to-[#e8a845] hover:from-[#f7cd7d] hover:to-[#f0b55d] text-zinc-900 font-bold py-4 rounded-xl shadow-lg shadow-yellow-900/20 transition-all active:scale-[0.98] uppercase tracking-wider"
          >
            ENTRAR
          </button>
          
          <button
            type="button"
            onClick={onGoToRegister}
            className="w-full bg-transparent border border-white/20 hover:border-white/40 text-white font-bold py-4 rounded-xl transition-all active:scale-[0.98] uppercase tracking-wider"
          >
            CADASTRAR
          </button>
        </form>

        <div className="mt-6 text-center">
          <button className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
            Esqueceu a senha?
          </button>
        </div>

        <div className="mt-8 pt-8 border-t border-white/5 text-center">
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest leading-relaxed">
            © 2026 Safety Monitor. Todos os direitos reservados.
          </p>
        </div>
      </motion.div>

      {/* Footer Copyright (outside card) */}
      <div className="absolute bottom-8 left-0 right-0 text-center">
        <p className="text-[10px] text-zinc-500 uppercase tracking-widest opacity-60">
          © 2026 Safety Monitor. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
