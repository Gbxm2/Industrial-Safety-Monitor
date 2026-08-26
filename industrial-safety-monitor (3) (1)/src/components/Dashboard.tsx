import React from "react";
import { 
  AlertTriangle, 
  Bell, 
  Settings, 
  User, 
  Wifi, 
  Plug, 
  Map as MapIcon, 
  HardHat,
  Monitor,
  LogOut
} from "lucide-react";
import { Employee } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface DashboardProps {
  username: string;
  employees: Employee[];
  onNavigateToMap: () => void;
  onLogout: () => void;
}

export default function Dashboard({ username, employees, onNavigateToMap, onLogout }: DashboardProps) {
  const [showProfileMenu, setShowProfileMenu] = React.useState(false);
  const activeHelmets = employees.filter(e => e.status !== "OFFLINE").length;
  const emergencies = employees.filter(e => e.status === "EMERGENCY").length;
  const disconnected = employees.filter(e => e.status === "OFFLINE").length;
  
  // Mock signals received today
  const signalsToday = 15 + employees.length * 2;

  const formatDate = () => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    };
    return now.toLocaleDateString('pt-BR', options).toUpperCase();
  };

  const recentAlerts = employees
    .filter(e => e.status === "EMERGENCY" || e.status === "OFFLINE")
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col font-sans">
      {/* Header */}
      <header className="h-16 px-6 flex items-center justify-between border-b border-white/5 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-yellow-500" />
          <span className="text-lg font-bold tracking-tight">Safety Monitor</span>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="relative cursor-pointer">
            <Bell className="w-5 h-5 text-zinc-400" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-[10px] flex items-center justify-center rounded-full font-bold">9</span>
          </div>
          <Settings className="w-5 h-5 text-zinc-400 cursor-pointer" />
          
          <div className="relative">
            <div 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <User className="w-5 h-5 text-zinc-400 group-hover:text-white transition-colors" />
              <div className="w-8 h-8 rounded-full border-2 border-yellow-500/50 flex items-center justify-center bg-zinc-900 text-yellow-500 font-bold text-sm group-hover:border-yellow-500 transition-all">
                {username.charAt(0).toUpperCase()}
              </div>
            </div>

            <AnimatePresence>
              {showProfileMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowProfileMenu(false)} 
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-20 overflow-hidden"
                  >
                    <div className="p-3 border-b border-white/5">
                      <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Usuário</p>
                      <p className="text-sm font-bold text-white truncate">{username}</p>
                    </div>
                    <button
                      onClick={onLogout}
                      className="w-full flex items-center gap-3 p-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="font-bold uppercase tracking-widest text-[10px]">Desconectar</span>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Welcome Section with Background */}
        <div className="relative h-[300px] flex flex-col justify-end p-8 overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ 
              backgroundImage: `url('https://images.unsplash.com/photo-1516937941344-00b4e0337589?q=80&w=2070&auto=format&fit=crop')`,
              filter: 'brightness(0.4)'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
          
          <div className="relative z-10">
            <p className="text-zinc-400 text-sm font-medium uppercase tracking-widest mb-1">Bem-vindo,</p>
            <h1 className="text-5xl font-bold text-yellow-500 mb-4">{username}</h1>
            <p className="text-zinc-500 text-xs font-bold tracking-[0.2em]">{formatDate()}</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 -mt-12 relative z-20">
          {/* Active Helmets */}
          <div className="bg-zinc-900/80 backdrop-blur-xl p-6 rounded-2xl border border-white/5 flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest">Sistema Nominal</span>
              </div>
              <h3 className="text-lg font-bold text-zinc-400 uppercase tracking-tighter">Active Helmet</h3>
            </div>
            <div className="text-4xl font-bold text-white">
              <span className="text-green-500 mr-2">+</span>{activeHelmets}
            </div>
          </div>

          {/* Emergencies */}
          <div className="bg-zinc-900/80 backdrop-blur-xl p-6 rounded-2xl border border-white/5 flex justify-between items-center">
            <div>
              <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Emergências</span>
              <div className="mt-4 w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-white">{emergencies}</div>
              <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">EPI Afetados</span>
            </div>
          </div>

          {/* Signals */}
          <div className="bg-zinc-900/80 backdrop-blur-xl p-6 rounded-2xl border border-white/5 flex justify-between items-center">
            <div>
              <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest">Sinais Recebidos Hoje</span>
              <div className="mt-4">
                <Wifi className="w-8 h-8 text-yellow-500" />
              </div>
            </div>
            <div className="text-4xl font-bold text-white">{signalsToday}</div>
          </div>

          {/* Disconnected */}
          <div className="bg-zinc-900/80 backdrop-blur-xl p-6 rounded-2xl border border-white/5 flex justify-between items-center">
            <div>
              <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest">Capacetes Desconectados</span>
              <div className="mt-4">
                <Plug className="w-8 h-8 text-red-500" />
              </div>
            </div>
            <div className="text-4xl font-bold text-white">{disconnected}</div>
          </div>
        </div>

        {/* Bottom Sections */}
        <div className="px-8 pb-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Recent Activity */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <Bell className="w-4 h-4 text-zinc-500" />
              <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Atividades Recentes</h2>
            </div>
            <div className="space-y-4">
              {recentAlerts.length > 0 ? recentAlerts.map(emp => (
                <div key={emp.id} className="bg-zinc-900/40 p-4 rounded-xl border border-white/5 flex items-start gap-4">
                  <div className={`w-2 h-2 rounded-full mt-1.5 ${emp.status === "EMERGENCY" ? "bg-red-500" : "bg-zinc-600"}`} />
                  <div>
                    <h4 className="text-sm font-bold text-zinc-200">Alerta de Impacto</h4>
                    <p className="text-[10px] text-zinc-500 mt-1">{emp.name} ({emp.id}) - {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              )) : (
                <div className="text-zinc-600 text-xs italic p-4">Nenhuma atividade crítica recente.</div>
              )}
            </div>
          </section>

          {/* Control Section */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <Monitor className="w-4 h-4 text-zinc-500" />
              <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Controle</h2>
            </div>
            <div className="space-y-4">
              <button 
                onClick={onNavigateToMap}
                className="w-full bg-zinc-900/40 hover:bg-zinc-800/60 p-4 rounded-xl border border-white/5 flex items-center gap-6 transition-all group"
              >
                <div className="w-16 h-12 rounded-lg overflow-hidden relative">
                  <div 
                    className="absolute inset-0 bg-cover bg-center opacity-50 group-hover:opacity-80 transition-opacity"
                    style={{ backgroundImage: `url('https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?q=80&w=2066&auto=format&fit=crop')` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <MapIcon className="w-5 h-5 text-white" />
                  </div>
                </div>
                <span className="text-sm font-bold text-zinc-300 uppercase tracking-widest">Mapa de Segurança</span>
              </button>

              <button className="w-full bg-zinc-900/40 hover:bg-zinc-800/60 p-4 rounded-xl border border-white/5 flex items-center gap-6 transition-all group">
                <div className="w-16 h-12 rounded-lg bg-zinc-800 flex items-center justify-center">
                  <HardHat className="w-6 h-6 text-yellow-500" />
                </div>
                <span className="text-sm font-bold text-zinc-300 uppercase tracking-widest">Dispositivos</span>
              </button>
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="p-8 text-center border-t border-white/5">
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest">
            © 2026 Safety Monitor. Todos os direitos reservados.
          </p>
        </footer>
      </main>
    </div>
  );
}
