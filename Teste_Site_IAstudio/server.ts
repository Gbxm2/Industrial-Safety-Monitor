import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

import { Employee, EmployeeTelemetry } from "./src/types";

// Initial employee data (EMP001 is mapped directly to the real ESP32)
let employees: Employee[] = [
  { id: "EMP001", name: "Gabriel Araújo", lat: -23.5505, lng: -46.6333, status: "ONLINE", lastSeen: Date.now(), battery: 95 },
  { id: "EMP002", name: "Gustavo Felix", lat: -23.5515, lng: -46.6343, status: "ONLINE", lastSeen: Date.now(), battery: 92 },
  { id: "EMP003", name: "Fabio Akira", lat: -23.5525, lng: -46.6353, status: "ONLINE", lastSeen: Date.now(), battery: 45 },
  { id: "EMP004", name: "Fabio Pelissari", lat: -23.5535, lng: -46.6363, status: "ONLINE", lastSeen: Date.now(), battery: 12 },
];

let latestESP32Data: any = null;
let ultimaAtualizacao: string | null = null;

async function startServer() {
  const app = express();
  app.use(express.json());
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer });

  interface UserData {
    firstName: string;
    lastName: string;
    username: string;
    cpf: string;
    position: string;
    department: string;
    email: string;
    phone: string;
    password: string;
  }

  const users: UserData[] = [
    { 
      firstName: "Admin", 
      lastName: "User", 
      username: "Gbxm", 
      cpf: "000.000.000-00", 
      position: "Administrator", 
      department: "HQ", 
      email: "admin@example.com", 
      phone: "000000000", 
      password: "123456" 
    }
  ];

  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      res.json({ success: true, user: { username: user.username, firstName: user.firstName, lastName: user.lastName } });
    } else {
      res.status(401).json({ success: false, message: "Usuário ou senha incorretos." });
    }
  });

  app.post("/api/register", (req, res) => {
    const userData: UserData = req.body;
    if (users.find(u => u.username === userData.username)) {
      return res.status(400).json({ success: false, message: "Nome de usuário já existe." });
    }
    users.push(userData);
    res.json({ success: true, message: "Usuário cadastrado com sucesso." });
  });

  // ============================================================
  // ROTAS DA API ESP32 (DADOS REAIS DOS SENSORES)
  // ============================================================
  app.post("/api/dados", (req, res) => {
    const dados = req.body;
    latestESP32Data = dados;
    ultimaAtualizacao = new Date().toISOString();

    console.log(`\n[ESP32] Dados recebidos em ${ultimaAtualizacao}:`);
    console.log(`  Wifi: ${dados.wifi} | IP: ${dados.ip}`);
    console.log(`  Aceleração: ${dados.aceleracaoG}g | Pico: ${dados.picoG}g | Pontuação: ${dados.pontuacao}`);
    console.log(`  Impacto: ${dados.impacto} | GPS Válido: ${dados.gpsValido} (${dados.latitude}, ${dados.longitude})`);

    // Atualiza os dados do funcionário EMP001 (Gabriel Araújo / Gbxm)
    const empIndex = employees.findIndex(e => e.id === "EMP001");
    if (empIndex !== -1) {
      const currentEmp = employees[empIndex];
      const now = Date.now();

      // GPS
      let newLat = currentEmp.lat;
      let newLng = currentEmp.lng;
      const latVal = typeof dados.latitude === "number" ? dados.latitude : parseFloat(dados.latitude);
      const lngVal = typeof dados.longitude === "number" ? dados.longitude : parseFloat(dados.longitude);

      if ((dados.gpsValido === true || dados.gpsValido === "true") && !isNaN(latVal) && !isNaN(lngVal) && (latVal !== 0 || lngVal !== 0)) {
        newLat = latVal;
        newLng = lngVal;
      }

      // Detecção de impacto real pelo firmware
      const isImpact = dados.impacto === true || dados.impacto === "true" || (Number(dados.pontuacao) >= 60);

      let newStatus = currentEmp.status;
      if (isImpact) {
        newStatus = "EMERGENCY";
      } else if (currentEmp.status !== "EMERGENCY") {
        newStatus = "ONLINE";
      }

      const telemetryData: EmployeeTelemetry = {
        aceleracao: parseFloat(dados.aceleracao) || 0,
        aceleracaoG: parseFloat(dados.aceleracaoG) || 0,
        picoAceleracaoG: parseFloat(dados.picoAceleracaoG) || 0,
        picoG: parseFloat(dados.picoG) || 0,
        pontuacao: Number(dados.pontuacao) || 0,
        pontosMPU: Number(dados.pontosMPU) || 0,
        pontosVibracao: Number(dados.pontosVibracao) || 0,
        pontosSom: Number(dados.pontosSom) || 0,
        vibracao: dados.vibracao === true || dados.vibracao === "true",
        som: dados.som === true || dados.som === "true",
        satelites: Number(dados.satelites) || 0,
        altitude: parseFloat(dados.altitude) || 0,
        hdop: parseFloat(dados.hdop) || 0,
        gpsValido: dados.gpsValido === true || dados.gpsValido === "true",
        mapsUrl: dados.mapsUrl || "",
        wifi: dados.wifi || "CONECTADO",
        ip: dados.ip || req.ip || ""
      };

      employees[empIndex] = {
        ...currentEmp,
        lat: newLat,
        lng: newLng,
        status: newStatus,
        lastSeen: now,
        telemetry: telemetryData
      };

      // Notifica todos os clientes conectados instantaneamente via WebSocket
      broadcastUpdate();
    }

    res.status(200).json({
      sucesso: true,
      mensagem: "Dados recebidos com sucesso pelo monitor."
    });
  });

  app.get("/api/dados", (_req, res) => {
    if (!latestESP32Data) {
      return res.status(404).json({
        sucesso: false,
        mensagem: "Ainda não existem dados do ESP32."
      });
    }
    res.json(latestESP32Data);
  });

  app.get("/api/status", (_req, res) => {
    res.json({
      api: "online",
      esp32Conectado: latestESP32Data !== null,
      ultimaAtualizacao
    });
  });

  // Vite setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // WebSocket logic
  wss.on("connection", (ws) => {
    console.log("Client connected");
    
    // Send initial state
    ws.send(JSON.stringify({ type: "INITIAL_STATE", data: employees }));

    ws.on("message", (message) => {
      try {
        const parsed = JSON.parse(message.toString());
        if (parsed.type === "IGNORE_EMERGENCY") {
          const empId = parsed.employeeId;
          employees = employees.map(emp => 
            emp.id === empId && emp.status === "EMERGENCY" 
              ? { ...emp, status: "ONLINE", lastSeen: Date.now() } 
              : emp
          );
          broadcastUpdate();
        } else if (parsed.type === "SET_BASE_LOCATION") {
          const { lat, lng } = parsed;
          // Set base location around user if GPS hasn't updated EMP001 yet
          employees = employees.map((emp) => {
            if (emp.id === "EMP001" && emp.telemetry?.gpsValido) {
              return emp; // Manter GPS real
            }
            return {
              ...emp,
              lat: lat + (Math.random() - 0.5) * 0.005,
              lng: lng + (Math.random() - 0.5) * 0.005,
            };
          });
          broadcastUpdate();
        }
      } catch (e) {
        console.error("Error parsing message", e);
      }
    });

    ws.on("close", () => console.log("Client disconnected"));
  });

  function broadcastUpdate() {
    const updateMsg = JSON.stringify({ type: "UPDATE", data: employees });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(updateMsg);
      }
    });
  }

  // Heartbeat loop: apenas monitora perda de sinal (sem movimentação ou emergência aleatória)
  setInterval(() => {
    let changed = false;
    const now = Date.now();

    employees = employees.map((emp) => {
      const timeSinceLastSeen = now - emp.lastSeen;
      let newStatus = emp.status;

      // Se não estiver em emergência ativa, atualiza status por perda de conexão
      if (emp.status !== "EMERGENCY") {
        if (timeSinceLastSeen > 30000 && emp.status !== "OFFLINE") {
          newStatus = "OFFLINE";
          changed = true;
        } else if (timeSinceLastSeen > 15000 && emp.status !== "UNSTABLE" && emp.status !== "OFFLINE") {
          newStatus = "UNSTABLE";
          changed = true;
        }
      }

      return {
        ...emp,
        status: newStatus
      };
    });

    if (changed) {
      broadcastUpdate();
    }
  }, 3000);

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
