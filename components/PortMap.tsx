import React, { useState, useRef, useEffect } from 'react';
import { Berth, Ship } from '../types';

interface PortMapProps {
  ships: Ship[];
  berths: Berth[];
  simulationPhase: string;
  onBerthClick?: (berthId: string) => void;
  processingShipIds?: string[]; // 正在处理中的船只ID列表
}

// Layout Constants
const MAP_CONFIG = {
  // 镇海锚地（绿色区域左上角“镇海锚地”文字附近）
  // ANCHORAGE_X/Y 为锚地中心
  ANCHORAGE_X: 60,
  ANCHORAGE_Y: 180,
  // 主航道中点（对应你现在框出来的主航道示意框中心）
  CHANNEL_WAYPOINT_X: 290,
  CHANNEL_WAYPOINT_Y: 300,
  // 锚地配置（用于等候船只排布的矩形范围）
  ANCHORAGE_WIDTH: 260,
  ANCHORAGE_HEIGHT: 80,
  // 间距调小，让船只更紧凑
  ANCHORAGE_SHIP_SPACING_X: 24,  // 减小横向间距，让船更集中
  ANCHORAGE_SHIP_SPACING_Y: 18,  // 减小纵向间距，让船更集中
};

// 泊位在地图背景上的实际位置（根据T型区域05/07/08等位置设置）
const BERTH_POSITIONS: Record<string, { x: number; y: number }> = {
  'A01': { x: 470, y: 161 },
  'A02': { x: 522, y: 162 },
  'B01': { x: 570, y: 162 },
  'B02': { x: 660, y: 161 },
  'C01': { x: 570, y: 400 },
  'C02': { x: 640, y: 385 },
};

// 每个泊位停靠后船的箭头朝向（度）
// 0度=朝上, 90度=朝右, 180度=朝下, 270度=朝左
const BERTH_DOCKED_ROTATION: Record<string, number> = {
  'A01': 88,   // 朝右
  'A02': 90,   // 朝右
  'B01': 85,   // 朝右
  'B02': 77,   // 朝右
  'C01': 72,   // 朝右
  'C02': 72,   // 朝右
};

// 地图原始尺寸
const MAP_ORIGINAL_WIDTH = 800;
const MAP_ORIGINAL_HEIGHT = 500;

const PortMap: React.FC<PortMapProps> = ({ ships, berths, simulationPhase, onBerthClick, processingShipIds = [] }) => {
  // 当前选中的泊位，用于显示信息弹窗
  const [selectedBerth, setSelectedBerth] = useState<Berth | null>(null);
  // 缩放比例
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // 计算缩放比例，使地图完全填充容器（不留黑边）
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const container = containerRef.current;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        // 计算缩放比例，使用较大值以完全填充容器（可能会稍微裁剪边缘）
        const scaleX = containerWidth / MAP_ORIGINAL_WIDTH;
        const scaleY = containerHeight / MAP_ORIGINAL_HEIGHT;
        const newScale = Math.max(scaleX, scaleY); // 取较大值以完全填充，不留黑边
        
        setScale(Math.max(0.1, Math.min(newScale, 3))); // 限制缩放范围在0.1到3之间
      }
    };

    // 初始计算
    updateScale();
    
    // 使用ResizeObserver监听容器尺寸变化
    const resizeObserver = new ResizeObserver(updateScale);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    window.addEventListener('resize', updateScale);
    return () => {
      window.removeEventListener('resize', updateScale);
      resizeObserver.disconnect();
    };
  }, []);
  
  const getBerthCenterPosition = (berthId: string) => {
    // 直接从地图背景上的泊位位置获取
    const position = BERTH_POSITIONS[berthId];
    if (!position) return null;
    return position;
  };

  const getShipPosition = (ship: Ship, index: number, waitingShips: Ship[]) => {
    // 1. Waiting - 确保所有船只都在锚地虚线框内（考虑船只尺寸和旋转）
    if (ship.status === 'waiting') {
      // 计算在waiting船只中的索引
      const waitingIndex = waitingShips.findIndex(s => s.id === ship.id);
      if (waitingIndex === -1) return { x: -9999, y: -9999 };
      
      // 锚地虚线框的实际边界（与渲染的虚线框完全一致）
      const anchorageLeft = MAP_CONFIG.ANCHORAGE_X - 40;
      const anchorageTop = MAP_CONFIG.ANCHORAGE_Y - MAP_CONFIG.ANCHORAGE_HEIGHT / 2;
      const anchorageRight = anchorageLeft + MAP_CONFIG.ANCHORAGE_WIDTH;
      const anchorageBottom = anchorageTop + MAP_CONFIG.ANCHORAGE_HEIGHT;
      
      // 船只尺寸（考虑旋转后可能的最大占用空间）
      const shipMaxSize = 20; // 减小尺寸，让船更集中
      const margin = shipMaxSize / 2 + 4; // 边距 = 船只半径 + 4px安全距离（减小边距）
      
      // 计算每行可以放多少艘船（根据锚地宽度，留出足够边距）
      const availableWidth = Math.max(10, MAP_CONFIG.ANCHORAGE_WIDTH - margin * 2);
      const shipsPerRow = Math.max(1, Math.floor(availableWidth / MAP_CONFIG.ANCHORAGE_SHIP_SPACING_X));
      const row = Math.floor(waitingIndex / shipsPerRow);
      const col = waitingIndex % shipsPerRow;
      
      // 居中排列，确保在虚线框内
      const totalInRow = Math.min(shipsPerRow, waitingShips.length - row * shipsPerRow);
      const rowWidth = Math.max(0, (totalInRow - 1) * MAP_CONFIG.ANCHORAGE_SHIP_SPACING_X);
      const startX = anchorageLeft + margin + (availableWidth - rowWidth) / 2;
      
      // 计算y坐标，确保在虚线框内
      const availableHeight = Math.max(10, MAP_CONFIG.ANCHORAGE_HEIGHT - margin * 2);
      const startY = anchorageTop + margin + (row * MAP_CONFIG.ANCHORAGE_SHIP_SPACING_Y);
      
      // 计算最终位置，确保不超出边界
      const x = Math.max(anchorageLeft + margin, Math.min(anchorageRight - margin, startX + (col * MAP_CONFIG.ANCHORAGE_SHIP_SPACING_X)));
      const y = Math.max(anchorageTop + margin, Math.min(anchorageBottom - margin, startY));
      
      return { x, y };
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

  /**
   * 船舶图标：使用用户提供的船.svg，并根据船长和旋转角度缩放/旋转
   * 注意：ship.svg 默认尖头朝上，这里所有 rotationDeg 都是围绕"尖头朝上"为 0 度来计算
   */
  const renderShipIcon = (ship: Ship, rotationDeg: number, isMoving: boolean = false) => {
    // 以 28 米船为基准进行缩放：
    // - 28 米船 ≈ 基准宽度 baseWidth
    // - 其他船只按长度比例缩放，并做合理的上下限裁剪
    const baseWidth = 22; // 28 米参考船的可视宽度（减小了，让船更小）
    const scale = ship.length / 28; // 相对 28 米的比例
    const width = Math.min(45, Math.max(16, baseWidth * scale)); // 减小上下限，让船整体更小

    // 移动时：船的边缘发光（使用 drop-shadow，只作用于船的形状边缘，不是矩形边缘）
    // 静止时：普通阴影
    const filterStyle = isMoving 
      ? 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.9)) drop-shadow(0 0 4px rgba(59, 130, 246, 0.6)) saturate(1.2) contrast(1.02)'
      : 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3)) saturate(1.2) contrast(1.02)';

    return (
      <img
        src="/船.svg"
        alt={ship.name}
        className="select-none"
        style={{
          width: `${width}px`,
          height: 'auto',
          // 先平移再旋转，让锚点接近船中心
          transform: `translateY(1px) rotate(${rotationDeg}deg)`,
          // 使用 drop-shadow 实现边缘发光，只作用于船的形状，不是整个矩形
          filter: filterStyle,
        }}
        draggable={false}
      />
    );
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-hidden rounded-lg shadow-inner select-none font-sans bg-slate-900" 
      style={{ position: 'relative' }}
    >
      {/* 地图背景层 - 直接填满容器，不留黑边 */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/地图背景.png" 
          alt="地图背景"
          className="w-full h-full"
          style={{ objectFit: 'cover', display: 'block' }}
        />
      </div>

      {/* 缩放容器 - 保持800x500的坐标系，通过transform scale适应容器 */}
      <div 
        className="absolute"
        style={{
          width: `${MAP_ORIGINAL_WIDTH}px`,
          height: `${MAP_ORIGINAL_HEIGHT}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          left: '50%',
          top: '50%',
          marginLeft: `-${MAP_ORIGINAL_WIDTH / 2}px`,
          marginTop: `-${MAP_ORIGINAL_HEIGHT / 2}px`,
        }}
      >


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
      
      {/* 镇海锚地（绿色区域上的等候区） */}
      <div className="absolute border-2 border-dashed border-white/30 rounded-xl bg-white/5 z-0"
           style={{ 
             left: `${MAP_CONFIG.ANCHORAGE_X - 40}px`,
             top: `${MAP_CONFIG.ANCHORAGE_Y - MAP_CONFIG.ANCHORAGE_HEIGHT / 2}px`,
             width: `${MAP_CONFIG.ANCHORAGE_WIDTH}px`, 
             height: `${MAP_CONFIG.ANCHORAGE_HEIGHT}px` 
           }}>
         <span className="absolute top-2 left-2 text-xs text-white/80 font-bold tracking-widest bg-blue-900/30 px-2 py-0.5 rounded backdrop-blur-sm">
           镇海锚地
         </span>
      </div>

      {/* 主航道示意框（大致标记中间海域，方便你后面微调位置） */}
      <div
        className="absolute left-[90px] top-[200px] w-[400px] h-[120px] border border-cyan-500/40 bg-cyan-900/8 rounded-xl pointer-events-none"
      >
        <span className="absolute top-1 left-2 text-[10px] text-cyan-200 font-bold bg-cyan-900/60 px-1.5 py-0.5 rounded">
          主航道（示意）
        </span>
      </div>

      {/* 3. Trajectory Lines - 每艘船从锚地实际位置到泊位的整条曲线路径 */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
         {(() => {
          // 只为正在移动的船（navigating 或 docking 状态）画轨迹线
          // 这样轨迹线会一艘船一艘船地出现，而不是一次性全部画出来
          const movingShips = ships.filter(s => 
            (s.status === 'navigating' || s.status === 'docking') && 
            s.assignedBerthId &&
            processingShipIds && processingShipIds.includes(s.id)
          );
          
          return movingShips.map((ship) => {
            if (ship.assignedBerthId) {
               // 获取航点位置
               const waypointPos = { 
                 x: MAP_CONFIG.CHANNEL_WAYPOINT_X, 
                 y: MAP_CONFIG.CHANNEL_WAYPOINT_Y 
               };
               
              // 获取泊位位置（终点）
               const berthPos = getBerthCenterPosition(ship.assignedBerthId);
               if (!berthPos) return null;
               
              // 计算起始位置（锚地实际位置）- 从每艘船在锚地的实际位置开始
              let startPos;
              if (processingShipIds && processingShipIds.includes(ship.id)) {
                // 在 processingShipIds 中的索引，代表它在锚地排队的顺序
                const processingIndex = processingShipIds.indexOf(ship.id);
                
                // 构造虚拟的 waiting 队列（基于 processingShipIds），用已有的锚地排布算法计算位置
                const virtualWaitingShips: Ship[] = (processingShipIds || [])
                  .map(id => {
                    const s = ships.find(ss => ss.id === id);
                    return s ? { ...s, status: 'waiting' as const } : null;
                  })
                  .filter((s): s is Ship => s !== null);
                
                const virtualWaitingShip: Ship = { ...ship, status: 'waiting' as const };
                startPos = getShipPosition(virtualWaitingShip, processingIndex, virtualWaitingShips);
              } else {
                // 兜底：锚地中心
                startPos = { x: MAP_CONFIG.ANCHORAGE_X, y: MAP_CONFIG.ANCHORAGE_Y };
              }
              
              // 使用两段二次贝塞尔曲线：
              // 1) 起点 -> 控制点1 -> 主航道中心
              // 2) 主航道中心 -> 控制点2 -> 泊位
              // 这样轨迹既保证经过主航道中心，又是带弧度的平滑曲线
              const control1 = {
                x: (startPos.x + waypointPos.x) / 2,
                y: startPos.y,
              };
              const control2 = {
                x: (waypointPos.x + berthPos.x) / 2,
                y: berthPos.y,
              };
              const pathData = `
                M ${startPos.x} ${startPos.y}
                Q ${control1.x} ${control1.y} ${waypointPos.x} ${waypointPos.y}
                Q ${control2.x} ${control2.y} ${berthPos.x} ${berthPos.y}
              `.trim().replace(/\s+/g, ' ');
              
              // 绘制轨迹线（完整曲线，无闪烁动画、无箭头）
               return (
                 <path 
                   key={`path-${ship.id}`}
                   d={pathData}
                   fill="none"
                   stroke="#38bdf8"
                   strokeWidth="2"
                   strokeDasharray="6,4"
                   className="opacity-80"
                 />
               );
             }
             return null;
           });
         })()}
      </svg>

      {/* 4. Berths - 直接在地图背景上定位 */}
      {berths.map((berth) => {
        const position = BERTH_POSITIONS[berth.id];
        if (!position) return null;
        
        // C 区（支线）泊位：绿色点在下方，文字/矩形在点下方；其他泊位：文字在上方，点在下方
        const isCZone = berth.id.startsWith('C');
        
        return (
          <div
            key={berth.id}
            className={`absolute z-20 group transition-all duration-300 ${berth.isOccupied ? 'cursor-pointer' : ''}`}
            style={{
              left: `${position.x}px`,
              top: `${position.y}px`,
              transform: 'translate(-50%, -50%)'
            }}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedBerth(berth);
            }}
          >
            {/* 泊位标记 */}
            <div className="flex flex-col items-center">
              {isCZone ? (
                // C 区：绿色点在下方，文字/矩形在点下方
                <>
                  {/* 绿色定位点 - 在上方 */}
                  <div className={`w-2 h-2 rounded-full border transition-colors ${
                    berth.isOccupied 
                      ? 'bg-red-500 border-red-700' 
                      : 'bg-green-500 border-green-700'
                  } shadow-md`}>
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-lg">
                      {berth.id} {berth.isOccupied ? '(已占用)' : '(空闲)'}
                    </div>
                  </div>
                  {/* 泊位ID文字标签 - 在下方 */}
                  <div className={`mt-0.5 text-[10px] font-bold px-1 py-0.5 rounded border shadow-sm ${
                    berth.isOccupied
                      ? 'bg-red-100 text-red-800 border-red-300'
                      : 'bg-green-100 text-green-800 border-green-300'
                  }`}>
                    {berth.id}
                  </div>
                </>
              ) : (
                // 其他区：文字在上方，点在下方
                <>
                  {/* 泊位ID文字标签 - 在上方 */}
                  <div className={`mb-0.5 text-[10px] font-bold px-1 py-0.5 rounded border shadow-sm ${
                    berth.isOccupied
                      ? 'bg-red-100 text-red-800 border-red-300'
                      : 'bg-green-100 text-green-800 border-green-300'
                  }`}>
                    {berth.id}
                  </div>
                  {/* 绿色定位点 - 在下方 */}
                  <div className={`w-2 h-2 rounded-full border transition-colors ${
                    berth.isOccupied 
                      ? 'bg-red-500 border-red-700' 
                      : 'bg-green-500 border-green-700'
                  } shadow-md`}>
                    {/* Tooltip */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-lg">
                      {berth.id} {berth.isOccupied ? '(已占用)' : '(空闲)'}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })}

      {/* 泊位信息小弹窗 */}
      {selectedBerth && BERTH_POSITIONS[selectedBerth.id] && (
        <div
          className="absolute z-30 bg-slate-900/95 text-slate-100 text-xs px-3 py-2 rounded-md border border-slate-600 shadow-xl pointer-events-auto"
          style={{
            left: `${BERTH_POSITIONS[selectedBerth.id].x}px`,
            top: `${BERTH_POSITIONS[selectedBerth.id].y - 40}px`,
            transform: 'translate(-50%, -100%)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="font-bold mb-1">
            泊位 {selectedBerth.id}{' '}
            <span className="text-[10px] text-slate-400">
              ({selectedBerth.zone === 'A' ? '深水区' : selectedBerth.zone === 'B' ? '通用区' : '支线区'})
            </span>
          </div>
          <div className="space-y-0.5 font-mono">
            <div>长度: {selectedBerth.length} m</div>
            <div>水深: {selectedBerth.depth} m</div>
            <div>状态: {selectedBerth.isOccupied ? '已占用' : '空闲'}</div>
          </div>
        </div>
      )}

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
        
        // Docked Ship Logic (直接定位到地图背景上的泊位位置，根据泊位类型决定在标记点上方/下方)
        if (ship.status === 'docked' && ship.assignedBerthId) {
            const berthPosition = BERTH_POSITIONS[ship.assignedBerthId];
            if (berthPosition) {
                // C 区（支线）泊位：船在绿色标记点上方；其他泊位：船在标记点下方
                const isCZone = ship.assignedBerthId.startsWith('C');
                const shipY = berthPosition.y + (isCZone ? -22 : 20); // C01/C02再远2px（从-20改为-22）
                return (
                    <div
                      key={ship.id}
                      className="absolute z-30 transition-all duration-[2000ms] ease-out ship-container"
                      style={{
                        left: `${berthPosition.x}px`,
                        top: `${shipY}px`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      <div
                        className="relative group cursor-pointer flex flex-col items-center"
                        onClick={(e) => {
                          e.stopPropagation(); // 阻止事件冒泡
                          onBerthClick && onBerthClick(ship.assignedBerthId!);
                        }}
                      >
                        {/* 船只标签：默认隐藏，悬停时仅显示专业编号（例如 MMSI） */}
                        <div className="absolute -top-5 text-xs font-bold px-2 py-1 rounded-sm border whitespace-nowrap z-40 shadow-lg bg-slate-800 text-white border-slate-600 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          {ship.id}
                        </div>
                        {/* 到达泊位后根据泊位配置设置箭头朝向 */}
                        {renderShipIcon(ship, BERTH_DOCKED_ROTATION[ship.assignedBerthId] || 90)}
                      </div>
                    </div>
                )
            }
        }

        const isMoving = ship.status === 'navigating' || ship.status === 'docking';
        
        // 计算船只旋转角度（数值，单位：度）
        let rotationDeg = 0;
        if (ship.status === 'waiting') {
          // 锚地时：五花八门的随机方向（0-360度），但不允许明显向左（避免视觉违和）
          const hash = ship.id.split('').reduce((acc, char, idx) => acc + char.charCodeAt(0) * (idx + 1), 0);
          let baseAngle = hash % 360; // 0-359度
          // 如果角度在左半边（>135 或 <45 视需要），将其折叠到右半边，让箭头大致朝下/右方向
          if (baseAngle > 200 && baseAngle < 340) {
            baseAngle = 200 - (baseAngle - 200); // 镜像到右半边
          }
          rotationDeg = baseAngle;
        } else if (ship.status === 'docked') {
          // 安全兜底：到泊位后根据泊位配置设置箭头朝向，不过 docked 情况上面已经单独处理
          rotationDeg = ship.assignedBerthId ? (BERTH_DOCKED_ROTATION[ship.assignedBerthId] || 90) : 90;
        } else if (ship.status === 'navigating') {
          // 到达主航道中心点时，船头朝下（从锚地进入主航道）
          // ship.svg 默认尖头朝上，因此朝下为 180 度
          rotationDeg = 180;
        } else if (ship.status === 'docking') {
          // 从主航道转向泊位前：逆时针旋转到水平向右，再驶向泊位
          // 这里简化为整个 docking 阶段统一朝右（90 度）
          rotationDeg = 90;
        } else if (isMoving) {
          // 兜底逻辑：根据当前位置和目标位置计算方向（一般不会走到这里）
          const currentPos = pos;
          let targetPos = null;

          if (ship.status === 'navigating') {
            targetPos = { x: MAP_CONFIG.CHANNEL_WAYPOINT_X, y: MAP_CONFIG.CHANNEL_WAYPOINT_Y };
          } else if (ship.status === 'docking' && ship.assignedBerthId) {
            targetPos = getBerthCenterPosition(ship.assignedBerthId);
          }

          if (targetPos) {
            const dx = targetPos.x - currentPos.x;
            const dy = targetPos.y - currentPos.y;
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);
            rotationDeg = angle - 90;
            if (rotationDeg < -135 || rotationDeg > 135) {
              rotationDeg = rotationDeg + 180;
            }
          }
        }
        
        return (
          <div
            key={ship.id}
            className="absolute transition-all duration-[2500ms] ease-in-out z-30"
            style={{
              left: `${pos.x}px`,
              top: `${pos.y}px`,
              transform: 'translate(-50%, -50%)',
            }}
          >
              <div className="relative group flex flex-col items-center">
              {/* 船只标签：默认隐藏，悬停时仅显示专业编号（例如 MMSI） */}
              <div className="absolute -top-5 text-xs font-bold px-2 py-1 rounded-sm border whitespace-nowrap z-40 shadow-lg bg-slate-800 text-white border-slate-600 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {ship.id}
              </div>
              <div className="relative">
                {renderShipIcon(ship, rotationDeg, isMoving)}
              </div>
            </div>
          </div>
        );
        });
      })()}
      </div>
      {/* 缩放容器结束 */}
    </div>
  );
};

export default PortMap;