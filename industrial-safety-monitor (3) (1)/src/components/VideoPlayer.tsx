import { Employee } from "../types";
import { Video, Maximize2, Settings, Mic, Radio, AlertCircle } from "lucide-react";
import { useEffect, useState, useRef } from "react";

interface VideoPlayerProps {
  employee: Employee | null;
}

export default function VideoPlayer({ employee }: VideoPlayerProps) {
  const [isLive, setIsLive] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (employee && employee.status !== "OFFLINE") {
      setIsLive(true);
      
      // Simple canvas animation to simulate helmet cam noise/movement
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      let frame = 0;
      const render = () => {
        frame++;
        ctx.fillStyle = "#18181b";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Grid lines
        ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
        ctx.lineWidth = 1;
        for (let i = 0; i < canvas.width; i += 40) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, canvas.height);
          ctx.stroke();
        }
        for (let i = 0; i < canvas.height; i += 40) {
          ctx.beginPath();
          ctx.moveTo(0, i);
          ctx.lineTo(canvas.width, i);
          ctx.stroke();
        }

        // Simulated "view" - some moving shapes
        ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
        const offset = Math.sin(frame * 0.05) * 20;
        ctx.fillRect(100 + offset, 100 + offset, 200, 150);
        ctx.fillRect(400 - offset, 200 + offset, 150, 100);

        // Noise
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          if (Math.random() > 0.98) {
            data[i] = data[i+1] = data[i+2] = 255;
            data[i+3] = 20;
          }
        }
        ctx.putImageData(imageData, 0, 0);

        // HUD
        ctx.fillStyle = "#22c55e";
        ctx.font = "12px monospace";
        ctx.fillText(`REC [${employee.id}]`, 20, 30);
        ctx.fillText(`LAT: ${employee.lat.toFixed(6)}`, 20, 50);
        ctx.fillText(`LNG: ${employee.lng.toFixed(6)}`, 20, 70);
        ctx.fillText(`BATT: ${Math.round(employee.battery)}%`, 20, 90);

        if (employee.status === "EMERGENCY") {
          ctx.fillStyle = "#ef4444";
          ctx.font = "bold 24px sans-serif";
          ctx.fillText("WARNING: IMPACT DETECTED", canvas.width / 2 - 150, canvas.height / 2);
          ctx.strokeStyle = "#ef4444";
          ctx.lineWidth = 4;
          ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
        }

        requestAnimationFrame(render);
      };

      const animId = requestAnimationFrame(render);
      return () => cancelAnimationFrame(animId);
    } else {
      setIsLive(false);
    }
  }, [employee]);

  return (
    <div className="flex-1 bg-zinc-950 flex flex-col border-l border-zinc-800">
      <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400">
            <Video className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-100">
              {employee ? `HELMET CAM: ${employee.name}` : "SELECT EMPLOYEE"}
            </h2>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
              {isLive ? "LIVE STREAMING" : "NO SIGNAL"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors">
            <Mic className="w-4 h-4" />
          </button>
          <button className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors">
            <Settings className="w-4 h-4" />
          </button>
          <button className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden bg-black group">
        {isLive ? (
          <canvas 
            ref={canvasRef} 
            width={800} 
            height={600} 
            className="w-full h-full object-cover opacity-80"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-700">
            <Radio className="w-16 h-16 mb-4 animate-pulse" />
            <p className="text-sm font-bold tracking-widest uppercase">Waiting for connection...</p>
          </div>
        )}

        {employee?.status === "EMERGENCY" && (
          <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 animate-bounce shadow-xl">
            <AlertCircle className="w-4 h-4" />
            EMERGENCY
          </div>
        )}

        <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
           <div className="bg-black/60 backdrop-blur-md p-3 rounded-xl border border-white/10 text-[10px] font-mono text-white/80">
              <div>DEVICE_ID: {employee?.id || "N/A"}</div>
              <div>SIGNAL_STRENGTH: 98%</div>
              <div>ENCRYPTION: AES-256</div>
           </div>
           <div className="flex gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-bold text-white uppercase tracking-widest">Live Feed</span>
           </div>
        </div>
      </div>
    </div>
  );
}
