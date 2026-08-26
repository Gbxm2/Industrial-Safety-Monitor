import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Employee } from "../types";
import { useEffect } from "react";

// Custom Helmet Icon
const createHelmetIcon = (status: string) => {
  const color = status === "EMERGENCY" ? "#ef4444" : 
                status === "ONLINE" ? "#22c55e" : 
                status === "UNSTABLE" ? "#eab308" : "#71717a";

  return L.divIcon({
    className: `custom-helmet-icon ${status === "EMERGENCY" ? "emergency-pulse" : ""}`,
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 2px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-hard-hat"><path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2z"/><path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"/><path d="M4 15a8 8 0 0 1 16 0"/></svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

interface MapProps {
  employees: Employee[];
  selectedEmployeeId: string | null;
  onSelectEmployee: (id: string) => void;
  userLocation: [number, number] | null;
}

export default function Map({ employees, selectedEmployeeId, onSelectEmployee, userLocation }: MapProps) {
  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
  
  const center: [number, number] = selectedEmployee 
    ? [selectedEmployee.lat, selectedEmployee.lng] 
    : userLocation || [-23.5505, -46.6333];

  const userIcon = L.divIcon({
    className: "user-location-icon",
    html: `
      <div style="
        background-color: #3b82f6;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
      "></div>
    `,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

  return (
    <div className="w-full h-full relative">
      <MapContainer 
        center={center} 
        zoom={16} 
        scrollWheelZoom={true}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {userLocation && (
          <Marker position={userLocation} icon={userIcon}>
            <Popup>
              <div className="p-1">
                <h3 className="font-bold text-zinc-900">Sua Localização</h3>
              </div>
            </Popup>
          </Marker>
        )}

        {employees.map((emp) => (
          <Marker 
            key={emp.id} 
            position={[emp.lat, emp.lng]} 
            icon={createHelmetIcon(emp.status)}
            eventHandlers={{
              click: () => onSelectEmployee(emp.id),
            }}
          >
            <Popup>
              <div className="p-1">
                <h3 className="font-bold text-zinc-900">{emp.name}</h3>
                <p className="text-xs text-zinc-600">ID: {emp.id}</p>
                <p className={`text-xs font-semibold mt-1 ${
                  emp.status === "EMERGENCY" ? "text-red-600" : 
                  emp.status === "ONLINE" ? "text-green-600" : "text-zinc-500"
                }`}>
                  Status: {emp.status}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
        {selectedEmployee && <MapUpdater center={[selectedEmployee.lat, selectedEmployee.lng]} />}
      </MapContainer>
    </div>
  );
}
