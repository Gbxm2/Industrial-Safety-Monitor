import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

interface Employee {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: "ONLINE" | "OFFLINE" | "EMERGENCY" | "UNSTABLE";
  lastSeen: number;
  battery: number;
}

// Initial mockup data
let employees: Employee[] = [
  { id: "EMP001", name: "Gabriel Araújo", lat: -23.5505, lng: -46.6333, status: "ONLINE", lastSeen: Date.now(), battery: 85 },
  { id: "EMP002", name: "Gustavo Felix", lat: -23.5515, lng: -46.6343, status: "ONLINE", lastSeen: Date.now(), battery: 92 },
  { id: "EMP003", name: "Fabio Akira", lat: -23.5525, lng: -46.6353, status: "ONLINE", lastSeen: Date.now(), battery: 45 },
  { id: "EMP004", name: "Fabio Pelissari", lat: -23.5535, lng: -46.6363, status: "ONLINE", lastSeen: Date.now(), battery: 12 },
];

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
          employees = employees.map((emp, index) => ({
            ...emp,
            lat: lat + (Math.random() - 0.5) * 0.01,
            lng: lng + (Math.random() - 0.5) * 0.01,
          }));
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

  // Simulation loop
  setInterval(() => {
    employees = employees.map((emp) => {
      const now = Date.now();
      
      // Random movement
      const newLat = emp.lat + (Math.random() - 0.5) * 0.0005;
      const newLng = emp.lng + (Math.random() - 0.5) * 0.0005;

      // Random impact simulation (0.5% chance per tick)
      let newStatus = emp.status;
      if (Math.random() < 0.005 && emp.status !== "OFFLINE") {
        newStatus = "EMERGENCY";
      }

      // Heartbeat logic
      const timeSinceLastSeen = now - emp.lastSeen;
      if (timeSinceLastSeen > 30000) {
        newStatus = "OFFLINE";
      } else if (timeSinceLastSeen > 15000) {
        newStatus = "UNSTABLE";
      }

      // Simulate battery drain
      const newBattery = Math.max(0, emp.battery - Math.random() * 0.1);

      // Update lastSeen randomly to simulate heartbeat
      const updatedLastSeen = Math.random() > 0.1 ? now : emp.lastSeen;

      return {
        ...emp,
        lat: newLat,
        lng: newLng,
        status: newStatus,
        lastSeen: updatedLastSeen,
        battery: newBattery,
      };
    });

    // Broadcast to all clients
    const updateMsg = JSON.stringify({ type: "UPDATE", data: employees });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(updateMsg);
      }
    });
  }, 2000);

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
