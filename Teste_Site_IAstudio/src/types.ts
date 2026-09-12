export type EmployeeStatus = "ONLINE" | "OFFLINE" | "EMERGENCY" | "UNSTABLE";

export interface EmployeeTelemetry {
  aceleracao?: number;
  aceleracaoG?: number;
  picoAceleracaoG?: number;
  picoG?: number;
  pontuacao?: number;
  pontosMPU?: number;
  pontosVibracao?: number;
  pontosSom?: number;
  vibracao?: boolean;
  som?: boolean;
  satelites?: number;
  altitude?: number;
  hdop?: number;
  gpsValido?: boolean;
  mapsUrl?: string;
  wifi?: string;
  ip?: string;
}

export interface Employee {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: EmployeeStatus;
  lastSeen: number;
  battery: number;
  telemetry?: EmployeeTelemetry;
}

export interface WebSocketMessage {
  type: "INITIAL_STATE" | "UPDATE";
  data: Employee[];
}

