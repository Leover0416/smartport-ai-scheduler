export enum ShipType {
  CONTAINER = '集装箱船',
  BULK = '散货船',
  TANKER = '油轮',
}

export enum AgentType {
  SHIP = 'SHIP_AGENT',
  RESOURCE = 'RESOURCE_AGENT',
  SCHEDULER = 'SCHEDULER_AGENT',
  OPTIMIZER = 'OPTIMIZER_AGENT',
  COORDINATOR = 'COORDINATOR_AGENT',
}

export enum SimulationPhase {
  IDLE = '待机',
  PERCEPTION = '智能感知 & ETA修正',
  MATCHING = '物理约束匹配',
  OPTIMIZATION = '协同优化 & 博弈',
  EXECUTION = '执行 & 动态监控',
}

export interface ConstraintCheck {
  length: boolean;
  draftTide: boolean;
  channel: boolean;
  special: boolean;
}

export interface Ship {
  id: string;
  name: string;
  type: ShipType;
  length: number; // meters
  draft: number; // meters
  priority: number; // 1-10
  status: 'waiting' | 'navigating' | 'docking' | 'docked' | 'departing';
  color: string;
  
  // Phase 1: Perception Data
  etaOriginal: string;
  etaCorrected?: string;
  earliestOperationTime?: string; // EOT
  isDelayed?: boolean;

  // Phase 1b: VSP Data
  vspSavings?: number; // Fuel saved in tons
  recommendedSpeed?: number; // knots
  virtualArrivalMode?: boolean;

  // Phase 2: Matching Data
  constraints?: ConstraintCheck;
  candidateBerths?: string[];

  // Phase 3 & 4: Execution Data
  assignedBerthId?: string;
  optimizationLog?: string[];
  
  // Bottom Viz
  gantt?: {
    startTime: number; // 0-24 scale
    duration: number;
    channelSlot: 'Deep' | 'Feeder';
  }
}

export interface Berth {
  id: string;
  name: string;
  zone: 'A' | 'B' | 'C'; // A: Deep, B: General, C: Feeder
  length: number;
  depth: number;
  isOccupied: boolean;
  currentShipId?: string;
}

export interface AgentMessage {
  id: string;
  from: AgentType;
  to: AgentType | 'ALL';
  content: string;
  timestamp: string;
  type: 'info' | 'warning' | 'success' | 'negotiation';
}

export interface TidePoint {
  time: string;
  height: number;
}