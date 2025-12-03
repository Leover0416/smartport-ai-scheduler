import React from 'react';
import { Berth, Ship, ShipType } from '../types';

interface PortMapProps {
  ships: Ship[];
  berths: Berth[];
  simulationPhase: string;
  onBerthClick?: (berthId: string) => void;
  processingShipIds?: string[]; // 正在处理中的船只ID列表
}

// Layout Constants
const MAP_CONFIG = {
  ANCHORAGE_X: 80, 
  ANCHORAGE_Y: 250, 
  BERTH_START_X: 850, // Right side
  BERTH_START_Y: 5, // 再往上移一点，确保C2完全可见
  BERTH_SPACING: 68, // 稍微减小间距
  BERTH_HEIGHT: 52,  // 稍微减小高度
  CHANNEL_WAYPOINT_X: 450, // Fixed waypoint for alignment
  CHANNEL_WAYPOINT_Y: 350,
  // 锚地配置
  ANCHORAGE_WIDTH: 280, // 扩大锚地宽度
  ANCHORAGE_HEIGHT: 200, // 扩大锚地高度
  ANCHORAGE_SHIP_SPACING_X: 60, // 船只水平间距
  ANCHORAGE_SHIP_SPACING_Y: 45, // 船只垂直间距
};

const PortMap: React.FC<PortMapProps> = ({ ships, berths, simulationPhase, onBerthClick, processingShipIds = [] }) => {
  
  const getBerthCenterPosition = (berthId: string) => {
    const berthIndex = berths.findIndex(b => b.id === berthId);
    if (berthIndex === -1) return null;
    return {
      x: MAP_CONFIG.BERTH_START_X - 120, // Entrance point
      y: MAP_CONFIG.BERTH_START_Y + berthIndex * MAP_CONFIG.BERTH_SPACING + (MAP_CONFIG.BERTH_HEIGHT / 2)
    };
  };

  const getShipPosition = (ship: Ship, index: number, waitingShips: Ship[]) => {
    // 1. Waiting - 改进排列算法，避免重叠
    if (ship.status === 'waiting') {
      // 计算在waiting船只中的索引
      const waitingIndex = waitingShips.findIndex(s => s.id === ship.id);
      if (waitingIndex === -1) return { x: -9999, y: -9999 };
      
      // 计算每行可以放多少艘船（根据锚地宽度）
      const shipsPerRow = Math.floor(MAP_CONFIG.ANCHORAGE_WIDTH / MAP_CONFIG.ANCHORAGE_SHIP_SPACING_X);
      const row = Math.floor(waitingIndex / shipsPerRow);
      const col = waitingIndex % shipsPerRow;
      
      // 居中排列
      const totalInRow = Math.min(shipsPerRow, waitingShips.length - row * shipsPerRow);
      const startX = MAP_CONFIG.ANCHORAGE_X + (MAP_CONFIG.ANCHORAGE_WIDTH - (totalInRow - 1) * MAP_CONFIG.ANCHORAGE_SHIP_SPACING_X) / 2;
      
      return { 
        x: startX + (col * MAP_CONFIG.ANCHORAGE_SHIP_SPACING_X), 
        y: MAP_CONFIG.ANCHORAGE_Y + (row * MAP_CONFIG.ANCHORAGE_SHIP_SPACING_Y)
      };
    }
    
    // 2. Navigating (Moves to Waypoint)
    // 由于现在是一艘船走完再走下一艘，所以不需要错开位置
    if (ship.status === 'navigating') {
        return { x: MAP_CONFIG.CHANNEL_WAYPOINT_X, y: MAP_CONFIG.CHANNEL_WAYPOINT_Y };
    }

    // 3. Docking (Moves from Waypoint to Berth)
    if (ship.status === 'docking' && ship.assignedBerthId) {
       const berthPos = getBerthCenterPosition(ship.assignedBerthId);
       if (berthPos) return { x: berthPos.x, y: berthPos.y };
    }
    
    // 4. Departing
    if (ship.status === 'departing') {
        return { x: -200, y: 100 };
    }

    return { x: -9999, y: -9999 };
  };

  const renderShipSvg = (ship: Ship) => {
    const width = Math.min(90, Math.max(50, ship.length / 4)); 
    const height = 16; 
    const baseColor = ship.color; 
    const deckColor = '#cbd5e1'; 
    
    if (ship.type === ShipType.TANKER) {
      return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="drop-shadow-lg filter overflow-visible">
           <defs><filter id="shadow"><feDropShadow dx="1" dy="1" stdDeviation="1" floodOpacity="0.5"/></filter></defs>
           <path d={`M8,0 L${width},0 L${width},${height} L8,${height} L0,${height/2} Z`} fill={baseColor} stroke="#0f172a" strokeWidth="0.5" />
           <line x1={width*0.2} y1={height/2} x2={width*0.8} y2={height/2} stroke={deckColor} strokeWidth="2" />
           <rect x={width - 20} y={-4} width="16" height="4" fill="white" rx="1" stroke="#0f172a" strokeWidth="0.5"/>
        </svg>
      );
    } else if (ship.type === ShipType.BULK) {
       return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="drop-shadow-lg">
           <path d={`M4,0 L${width-4},0 L${width},${height} L0,${height} Z`} fill={baseColor} stroke="#0f172a" strokeWidth="0.5" />
           <rect x={width*0.2} y="3" width={width*0.15} height={height-6} fill={deckColor} rx="1" stroke="#0f172a" strokeWidth="0.2"/>
           <rect x={width*0.45} y="3" width={width*0.15} height={height-6} fill={deckColor} rx="1" stroke="#0f172a" strokeWidth="0.2"/>
           <rect x={width - 18} y={-5} width="14" height="5" fill="white" rx="1" stroke="#0f172a" strokeWidth="0.5"/>
        </svg>
       );
    } else {
       return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="drop-shadow-lg">
           <path d={`M0,2 L${width},2 L${width},${height} L4,${height} L0,${height-2} Z`} fill={baseColor} stroke="#0f172a" strokeWidth="0.5" />
           <rect x={width*0.15} y="-2" width={width*0.1} height="6" fill={deckColor} stroke="black" strokeWidth="0.2" />
           <rect x={width*0.3} y="-2" width={width*0.1} height="6" fill={deckColor} stroke="black" strokeWidth="0.2"/>
           <rect x={width*0.45} y="-2" width={width*0.1} height="6" fill={deckColor} stroke="black" strokeWidth="0.2"/>
           <rect x={width - 18} y={-6} width="14" height="8" fill="white" rx="1" stroke="black" strokeWidth="0.5"/>
        </svg>
       );
    }
  };

  return (
    <div className="relative w-full h-full bg-[#3b82f6] overflow-hidden rounded-lg shadow-inner select-none font-sans">
      
      {/* 1. Realistic Pale Blue Sea Background */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#60a5fa] via-[#3b82f6] to-[#1e40af]">
          <div className="absolute inset-0 opacity-20 mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.2) 1px, transparent 1px)', backgroundSize: '80px 80px' }}></div>
      </div>

      {/* 2. 潮汐波浪特效 - 使用多层波浪动画 */}
      <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
        {/* 第一层波浪 - 慢速大波浪 */}
        <svg className="absolute bottom-0 w-full h-1/3 animate-tide-wave-1" preserveAspectRatio="none" viewBox="0 0 1200 200">
          <defs>
            <linearGradient id="waveGradient1" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.2)" />
              <stop offset="50%" stopColor="rgba(255,255,255,0.1)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
          </defs>
          <path 
            d="M0,150 Q300,120 600,150 T1200,150 L1200,200 L0,200 Z" 
            fill="url(#waveGradient1)"
          />
        </svg>
        
        {/* 第二层波浪 - 中速中波浪 */}
        <svg className="absolute bottom-0 w-full h-1/4 animate-tide-wave-2" preserveAspectRatio="none" viewBox="0 0 1200 200">
          <defs>
            <linearGradient id="waveGradient2" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
              <stop offset="50%" stopColor="rgba(255,255,255,0.08)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
          </defs>
          <path 
            d="M0,160 Q400,130 800,160 T1600,160 L1600,200 L0,200 Z" 
            fill="url(#waveGradient2)"
          />
        </svg>
        
        {/* 第三层波浪 - 快速小波浪 */}
        <svg className="absolute bottom-0 w-full h-1/5 animate-tide-wave-3" preserveAspectRatio="none" viewBox="0 0 1200 200">
          <defs>
            <linearGradient id="waveGradient3" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
              <stop offset="50%" stopColor="rgba(255,255,255,0.06)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
          </defs>
          <path 
            d="M0,170 Q200,150 400,170 T800,170 T1200,170 L1200,200 L0,200 Z" 
            fill="url(#waveGradient3)"
          />
        </svg>
      </div>

      {/* 3. 风速特效 - 流动的线条和粒子 */}
      <div className="absolute inset-0 z-[1] pointer-events-none opacity-40">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="windGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(255,255,255,0)" />
              <stop offset="30%" stopColor="rgba(255,255,255,0.4)" />
              <stop offset="70%" stopColor="rgba(255,255,255,0.4)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
            <filter id="windBlur">
              <feGaussianBlur in="SourceGraphic" stdDeviation="0.5"/>
            </filter>
          </defs>
          
          {/* 多条风速线 - 不同高度和速度 */}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <g key={`wind-group-${i}`}>
              <line
                x1="0"
                y1={15 + i * 12}
                x2="100"
                y2={12 + i * 12}
                stroke="url(#windGradient)"
                strokeWidth="0.3"
                className="animate-wind-flow"
                filter="url(#windBlur)"
                style={{ 
                  animationDelay: `${i * 0.4}s`,
                  animationDuration: `${6 + i * 1.5}s`
                }}
              />
              {/* 添加小粒子 */}
              {[0, 1, 2].map((j) => (
                <circle
                  key={`particle-${i}-${j}`}
                  cx={30 + j * 20}
                  cy={13.5 + i * 12}
                  r="0.2"
                  fill="rgba(255,255,255,0.6)"
                  className="animate-wind-flow"
                  style={{ 
                    animationDelay: `${i * 0.4 + j * 0.2}s`,
                    animationDuration: `${6 + i * 1.5}s`
                  }}
                />
              ))}
            </g>
          ))}
        </svg>
      </div>
      
      {/* 2. Physical Zones */}
      <div className="absolute top-0 right-0 w-[140px] h-full bg-[#cbd5e1] border-l-4 border-slate-400 z-10 shadow-2xl">
         <div className="absolute top-4 right-2 text-slate-500 font-black text-sm rotate-90 origin-right tracking-widest">PORT TERMINAL</div>
      </div>

      <div className="absolute border-2 border-dashed border-white/30 rounded-xl bg-white/5 z-0"
           style={{ 
             left: `${MAP_CONFIG.ANCHORAGE_X - 20}px`,
             bottom: '30px',
             width: `${MAP_CONFIG.ANCHORAGE_WIDTH}px`, 
             height: `${MAP_CONFIG.ANCHORAGE_HEIGHT}px` 
           }}>
         <span className="absolute top-2 left-2 text-xs text-white/80 font-bold tracking-widest bg-blue-900/30 px-2 py-0.5 rounded backdrop-blur-sm">锚地 (ANCHORAGE)</span>
      </div>

      <div className="absolute top-[280px] left-[200px] w-[500px] h-[120px] bg-gradient-to-r from-transparent via-blue-900/20 to-transparent transform -rotate-3 pointer-events-none border-y border-dashed border-white/20">
         <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-white/60 font-bold">深水主航道 (DEEP CHANNEL)</div>
      </div>

      {/* 3. Trajectory Lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
         <defs>
           <marker id="arrowHead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
             <path d="M0,0 L0,6 L6,3 z" fill="#e0f2fe" />
           </marker>
         </defs>
         
         {ships.map((ship, idx) => {
           if ((ship.status === 'navigating' || ship.status === 'docking') && ship.assignedBerthId) {
             const startPos = { x: MAP_CONFIG.ANCHORAGE_X + 60, y: MAP_CONFIG.ANCHORAGE_Y + 50 };
             const midPos = { x: MAP_CONFIG.CHANNEL_WAYPOINT_X, y: MAP_CONFIG.CHANNEL_WAYPOINT_Y };
             const endPos = getBerthCenterPosition(ship.assignedBerthId);
             
             if (endPos) {
                // Polyline path: Start -> Mid -> End with rounded joins
                return (
                  <path 
                    key={`path-${ship.id}`}
                    d={`M ${startPos.x} ${startPos.y} Q ${250} ${startPos.y} ${midPos.x} ${midPos.y} T ${endPos.x} ${endPos.y}`}
                    fill="none"
                    stroke="#e0f2fe"
                    strokeWidth="2"
                    strokeDasharray="6,4"
                    markerEnd="url(#arrowHead)"
                    className="animate-dash opacity-60"
                  >
                     <animate attributeName="stroke-dashoffset" from="100" to="0" dur="1.5s" repeatCount="indefinite" />
                  </path>
                );
             }
           }
           return null;
         })}
      </svg>

      {/* 4. Berths */}
      <div className="absolute right-0 w-[160px] flex flex-col z-20" style={{ top: MAP_CONFIG.BERTH_START_Y }}>
        {berths.map((berth, idx) => {
          const dockedShip = ships.find(s => s.assignedBerthId === berth.id && s.status === 'docked');
          return (
          <div 
             key={berth.id} 
             className={`relative w-full group transition-all duration-300 ${berth.isOccupied ? 'cursor-pointer' : ''}`}
             style={{ height: MAP_CONFIG.BERTH_SPACING }}
             onClick={(e) => { 
               // 如果点击的不是船只本身，才触发泊位点击
               if (berth.isOccupied && !(e.target as HTMLElement).closest('.ship-container')) {
                 onBerthClick && onBerthClick(berth.id);
               }
             }}
          >
              {/* Tooltip for Occupied Berth */}
              {berth.isOccupied && !dockedShip && (
                  <div className="absolute -left-20 top-2 bg-red-500 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-lg">
                      点击释放
                  </div>
              )}
              
              <div 
                className={`absolute right-[0px] w-[150px] border-y border-l border-slate-400 shadow-[inset_2px_2px_10px_rgba(0,0,0,0.2)] transition-colors
                    ${berth.isOccupied ? 'bg-slate-300' : 'bg-gradient-to-r from-[#60a5fa] to-[#cbd5e1]'}`}
                style={{ height: MAP_CONFIG.BERTH_HEIGHT, top: 0 }}
              >
                 {/* Zone Label */}
                 <div className="absolute top-1 left-2 text-xs font-bold text-slate-700 font-mono">{berth.id.split(' ')[0]}</div>
                 
                 {/* Berth Stats - ADDED */}
                 <div className="absolute bottom-1 left-2 text-xs text-slate-600 font-mono leading-none">
                     <span className="mr-1">L:{berth.length}m</span>
                     <span>D:{berth.depth}m</span>
                 </div>

                 {/* Zone Indicator Color */}
                 <div className={`absolute bottom-0 left-0 w-1.5 h-full ${berth.zone === 'A' ? 'bg-blue-600' : berth.zone === 'B' ? 'bg-amber-500' : 'bg-purple-500'}`}></div>
              </div>
          </div>
          );
        })}
      </div>

      {/* 5. Ships Render */}
      {(() => {
        // 只显示正在处理中的waiting船只，或者已经进入流程的船只
        const visibleShips = ships.filter(s => 
          s.status !== 'waiting' || // 非waiting状态的都显示
          (s.status === 'waiting' && processingShipIds && processingShipIds.includes(s.id)) // waiting状态但正在处理中的才显示
        );
        const waitingShips = visibleShips.filter(s => s.status === 'waiting');
        
        return visibleShips.map((ship, idx) => {
          const pos = getShipPosition(ship, idx, waitingShips);
        
        // Docked Ship Logic (Snap to center of berth)
        if (ship.status === 'docked' && ship.assignedBerthId) {
            const berthIndex = berths.findIndex(b => b.id === ship.assignedBerthId);
            if (berthIndex !== -1) {
                const topVal = MAP_CONFIG.BERTH_START_Y + berthIndex * MAP_CONFIG.BERTH_SPACING + (MAP_CONFIG.BERTH_HEIGHT / 2);
                return (
                    <div key={ship.id} className="absolute z-30 transition-all duration-[2000ms] ease-out ship-container"
                        style={{ right: '40px', top: `${topVal}px`, transform: 'translateY(-50%)' }}>
                        <div className="relative group cursor-pointer" onClick={(e) => {
                            e.stopPropagation(); // 阻止事件冒泡
                            onBerthClick && onBerthClick(ship.assignedBerthId!);
                        }}>
                            {/* 船只标签 */}
                            <div className="mb-1 text-xs font-bold px-2 py-1 rounded-sm border whitespace-nowrap z-40 scale-90 origin-bottom shadow-lg transition-colors bg-slate-800 text-white border-slate-600 group-hover:bg-red-600">
                                {ship.name.split(' ')[0]}
                            </div>
                            {/* 悬停提示 */}
                            <div className="absolute -left-24 top-1/2 -translate-y-1/2 bg-red-500 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-lg">
                                点击释放船只
                            </div>
                            {renderShipSvg(ship)}
                        </div>
                    </div>
                )
            }
        }

        const isMoving = ship.status === 'navigating' || ship.status === 'docking';
        
        return (
          <div key={ship.id}
            className="absolute transition-all duration-[2500ms] ease-in-out flex flex-col items-center group z-30"
            style={{ 
                left: `${pos.x}px`, 
                top: `${pos.y}px`,
                transform: `rotate(${isMoving ? '-5deg' : '0deg'}) translate(-50%, -50%)`,
            }}
          >
            <div className={`mb-1 text-xs font-bold px-2 py-1 rounded-sm border whitespace-nowrap z-40 scale-90 origin-bottom shadow-lg transition-colors ${isMoving ? 'bg-white text-blue-600 border-blue-400' : 'bg-slate-800 text-white border-slate-600 group-hover:bg-blue-600'}`}>
                {ship.name.split(' ')[0]}
            </div>
            <div className="relative drop-shadow-2xl">{renderShipSvg(ship)}</div>
            {isMoving && <div className="absolute top-1/2 -left-10 w-20 h-4 bg-white/40 blur-[4px] rounded-full"></div>}
          </div>
        );
        });
      })()}
    </div>
  );
};

export default PortMap;