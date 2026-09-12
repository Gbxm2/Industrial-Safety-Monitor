import { useEffect, useState, useRef } from "react";
import { Employee, WebSocketMessage } from "./types";
import Sidebar from "./components/Sidebar";
import Map from "./components/Map";
import VideoPlayer from "./components/VideoPlayer";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";
import { AlertCircle, Bell, X, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authView, setAuthView] = useState<"LOGIN" | "REGISTER">("LOGIN");
  const [username, setUsername] = useState("");
  const [view, setView] = useState<"HOME" | "MAP">("HOME");
  const [loginError, setLoginError] = useState("");
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Get user location
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
          if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: "SET_BASE_LOCATION", lat: latitude, lng: longitude }));
          }
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    ws.current = new WebSocket(`${protocol}//${host}`);

    ws.current.onopen = () => {
      if (userLocation) {
        ws.current?.send(JSON.stringify({ type: "SET_BASE_LOCATION", lat: userLocation[0], lng: userLocation[1] }));
      }
    };

    ws.current.onmessage = (event) => {
      const message: WebSocketMessage = JSON.parse(event.data);
      if (message.type === "INITIAL_STATE" || message.type === "UPDATE") {
        setEmployees(message.data);
      }
    };

    return () => {
      ws.current?.close();
    };
  }, [isAuthenticated]);

  const handleLogin = async (user: string, pass: string) => {
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user, password: pass }),
      });
      const data = await response.json();
      if (data.success) {
        setIsAuthenticated(true);
        setUsername(data.user.username);
        setLoginError("");
      } else {
        setLoginError(data.message || "Usuário ou senha incorretos.");
      }
    } catch (err) {
      setLoginError("Erro de conexão com o servidor.");
    }
  };

  const handleRegister = async (userData: any) => {
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });
      const data = await response.json();
      if (data.success) {
        setAuthView("LOGIN");
        setLoginError("");
        return true;
      } else {
        return false;
      }
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUsername("");
    setView("HOME");
    setSelectedEmployeeId(null);
  };

  const ignoreEmergency = (employeeId: string) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: "IGNORE_EMERGENCY", employeeId }));
    }
  };

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId) || null;

  if (!isAuthenticated) {
    if (authView === "REGISTER") {
      return (
        <Register 
          onRegister={handleRegister} 
          onGoBack={() => setAuthView("LOGIN")} 
        />
      );
    }
    return (
      <Login 
        onLogin={handleLogin} 
        onGoToRegister={() => setAuthView("REGISTER")}
        error={loginError} 
      />
    );
  }

  if (view === "HOME") {
    return (
      <Dashboard 
        username={username} 
        employees={employees} 
        onNavigateToMap={() => setView("MAP")} 
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="flex h-screen w-screen bg-zinc-950 overflow-hidden font-sans">
      <div className="flex flex-col">
        <button 
          onClick={() => setView("HOME")}
          className="bg-zinc-900 p-4 border-b border-zinc-800 text-zinc-400 hover:text-white flex items-center gap-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-widest">Início</span>
        </button>
        <Sidebar 
          employees={employees} 
          selectedEmployeeId={selectedEmployeeId} 
          onSelectEmployee={setSelectedEmployeeId} 
          onIgnoreEmergency={ignoreEmergency}
        />
      </div>

      <main className="flex-1 flex flex-col">
        <div className="h-2/3 relative border-b border-zinc-800">
          <Map 
            employees={employees} 
            selectedEmployeeId={selectedEmployeeId} 
            onSelectEmployee={setSelectedEmployeeId} 
            userLocation={userLocation}
          />
          
          {/* Map Overlay Controls */}
          <div className="absolute bottom-6 left-6 z-[1000] flex flex-col gap-2">
             <div className="bg-zinc-900/80 backdrop-blur-md p-4 rounded-2xl border border-zinc-800 shadow-2xl">
                <div className="flex items-center gap-3 mb-3">
                   <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                   <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">System Status: Nominal</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <div className="text-[10px] text-zinc-500 uppercase font-bold">Active Helmets</div>
                      <div className="text-xl font-bold text-zinc-100">{employees.filter(e => e.status !== "OFFLINE").length}</div>
                   </div>
                   <div>
                      <div className="text-[10px] text-zinc-500 uppercase font-bold">Emergencies</div>
                      <div className="text-xl font-bold text-red-500">{employees.filter(e => e.status === "EMERGENCY").length}</div>
                   </div>
                </div>
             </div>
          </div>
        </div>

        <div className="h-1/3 flex">
          <VideoPlayer employee={selectedEmployee} />
          
          <div className="w-96 bg-zinc-900 p-6 border-l border-zinc-800 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Recent Activity
              </h3>
            </div>
            <div className="space-y-4">
              {employees.filter(e => e.status === "EMERGENCY" || e.status === "OFFLINE").length === 0 ? (
                <div className="text-center py-8 text-zinc-600 text-xs italic">
                  No critical activity recorded.
                </div>
              ) : (
                employees.filter(e => e.status === "EMERGENCY" || e.status === "OFFLINE").map(emp => (
                  <div key={emp.id} className="flex gap-4 items-start border-l-2 border-zinc-800 pl-4 py-1 group">
                    <div className={cn(
                      "w-2 h-2 rounded-full mt-1.5",
                      emp.status === "EMERGENCY" ? "bg-red-500" : "bg-zinc-600"
                    )} />
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <p className="text-xs font-bold text-zinc-200">
                          {emp.status === "EMERGENCY" ? "Impact Alert" : "Connection Lost"}
                        </p>
                        {emp.status === "EMERGENCY" && (
                          <button 
                            onClick={() => ignoreEmergency(emp.id)}
                            className="text-[9px] bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-2 py-0.5 rounded border border-zinc-700 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            Ignorar
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-0.5">
                        {emp.name} ({emp.id}) - {new Date().toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
