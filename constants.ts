import { Ship, ShipType, Berth, TidePoint } from './types';

// Palette: Professional Maritime Tech
export const SHIP_COLORS = {
    [ShipType.CONTAINER]: '#3b82f6', // Blue 500
    [ShipType.BULK]: '#f59e0b',      // Amber 500
    [ShipType.TANKER]: '#ef4444',    // Red 500
};

export const INITIAL_SHIPS: Ship[] = [
  {
    id: 'S001',
    name: '长赐号 II',
    type: ShipType.CONTAINER,
    length: 399,
    draft: 16.5,
    etaOriginal: '10:00',
    priority: 10,
    status: 'waiting',
    color: SHIP_COLORS[ShipType.CONTAINER],
    candidateBerths: [],
  },
  {
    id: 'S002',
    name: '中远之星',
    type: ShipType.CONTAINER,
    length: 200,
    draft: 10.5,
    etaOriginal: '10:15',
    priority: 7,
    status: 'waiting',
    color: SHIP_COLORS[ShipType.CONTAINER],
    candidateBerths: [],
  },
  {
    id: 'S003',
    name: '海王荣耀',
    type: ShipType.BULK,
    length: 280,
    draft: 14.5,
    etaOriginal: '09:30',
    priority: 5,
    status: 'waiting',
    color: SHIP_COLORS[ShipType.BULK],
    candidateBerths: [],
  },
  {
    id: 'S004',
    name: '全球能源',
    type: ShipType.TANKER,
    length: 330,
    draft: 18.2,
    etaOriginal: '11:00',
    priority: 9,
    status: 'waiting',
    color: SHIP_COLORS[ShipType.TANKER],
    candidateBerths: [],
  },
  {
    id: 'S005',
    name: '支线快运',
    type: ShipType.CONTAINER,
    length: 120,
    draft: 7.0,
    etaOriginal: '10:45',
    priority: 4,
    status: 'waiting',
    color: '#6366f1', // Indigo
    candidateBerths: [],
  },
  {
    id: 'S006',
    name: '长绿号',
    type: ShipType.CONTAINER,
    length: 180,
    draft: 9.0,
    etaOriginal: '11:15',
    priority: 6,
    status: 'waiting',
    color: '#06b6d4', // Cyan
    candidateBerths: [],
  }
];

// 6 Berths as requested
export const PORT_BERTHS: Berth[] = [
  { id: 'A01', name: 'A01 (深水)', zone: 'A', length: 450, depth: 18, isOccupied: false },
  { id: 'A02', name: 'A02 (深水)', zone: 'A', length: 450, depth: 18, isOccupied: false },
  { id: 'B01', name: 'B01 (通用)', zone: 'B', length: 300, depth: 14, isOccupied: false },
  { id: 'B02', name: 'B02 (通用)', zone: 'B', length: 300, depth: 14, isOccupied: false },
  { id: 'C01', name: 'C01 (支线)', zone: 'C', length: 150, depth: 10, isOccupied: false },
  { id: 'C02', name: 'C02 (支线)', zone: 'C', length: 150, depth: 10, isOccupied: false },
];

export const TIDE_DATA: TidePoint[] = [
  { time: '06:00', height: 2.1 },
  { time: '08:00', height: 3.5 },
  { time: '10:00', height: 4.8 }, // High tide
  { time: '12:00', height: 4.2 },
  { time: '14:00', height: 2.5 },
  { time: '16:00', height: 1.2 },
  { time: '18:00', height: 0.8 },
  { time: '20:00', height: 2.0 },
];

// Helper to generate random ships for "Continue Scheduling"
// 每次只生成1艘新船
export const generateNewShips = (startIndex: number): Ship[] => {
    const types = [ShipType.CONTAINER, ShipType.BULK, ShipType.TANKER];
    const names = ['东方巨人', '太平洋探索', '北极星', '南方之珠', '亚洲龙', '金色财富', '深蓝先锋'];
    const newShips: Ship[] = [];
    
    // 只生成1艘船
    const type = types[Math.floor(Math.random() * types.length)];
    const idNum = startIndex + 1;
    const id = `S00${idNum}`;
    const name = `${names[Math.floor(Math.random() * names.length)]} ${idNum}`;
    
    let length = 150;
    let draft = 8;
    
    if (type === ShipType.TANKER) { length = 300; draft = 16; }
    if (type === ShipType.CONTAINER) { length = 200 + Math.random() * 150; draft = 10 + Math.random() * 5; }
    
    // 计算ETA时间（基于当前时间，避免重复）
    const currentHour = new Date().getHours();
    const etaHour = (currentHour + 1) % 24; // 1小时后到达
    
    newShips.push({
        id,
        name,
        type,
        length: Math.floor(length),
        draft: parseFloat(draft.toFixed(1)),
        etaOriginal: `${String(etaHour).padStart(2, '0')}:00`,
        priority: Math.floor(Math.random() * 5) + 5,
        status: 'waiting',
        color: SHIP_COLORS[type],
        candidateBerths: []
    });
    
    return newShips;
};