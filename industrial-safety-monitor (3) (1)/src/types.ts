export type EmployeeStatus = "ONLINE" | "OFFLINE" | "EMERGENCY" | "UNSTABLE";

export interface Employee {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: EmployeeStatus;
  lastSeen: number;
  battery: number;
}

export interface WebSocketMessage {
  type: "INITIAL_STATE" | "UPDATE";
  data: Employee[];
}
