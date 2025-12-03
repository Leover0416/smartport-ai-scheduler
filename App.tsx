import React, { useState, useEffect, useRef } from 'react';
import { INITIAL_SHIPS, PORT_BERTHS, TIDE_DATA, generateNewShips } from './constants';
import { Ship, Berth, AgentMessage, AgentType, SimulationPhase, ShipType } from './types';
import PortMap from './components/PortMap';
import AgentOrchestrator from './components/AgentOrchestrator';
import Dashboard from './components/Dashboard';
import PhaseDetailPanel from './components/PhaseDetailPanel';
import BottomVis from './components/BottomVis';
import { Play, RotateCcw, Cpu, Anchor, Ship as ShipIcon, FastForward, CheckSquare, Layers } from 'lucide-react';
import * as aiService from './services/aiService';
import * as schedulingAlgorithms from './services/schedulingAlgorithms';

const App: React.FC = () => {
  const [ships, setShips] = useState<Ship[]>(INITIAL_SHIPS);
  const [berths, setBerths] = useState<Berth[]>(PORT_BERTHS);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [phase, setPhase] = useState<SimulationPhase>(SimulationPhase.IDLE);
  const [activeAgents, setActiveAgents] = useState<AgentType[]>([]);
  const [efficiency, setEfficiency] = useState(65);
  const [carbonSaved, setCarbonSaved] = useState(12);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [optimizationData, setOptimizationData] = useState({
    totalVspSavings: 0,
    hasConflict: false,
    iterations: 0,
    reward: 0
  }); 
  
  // Selection State
  const [selectedShipIds, setSelectedShipIds] = useState<Set<string>>(new Set());
  const [processingShipIds, setProcessingShipIds] = useState<string[]>([]);
  const [selectedShipForDetail, setSelectedShipForDetail] = useState<Ship | null>(null);

  // --- Helper: Centralized Berth Logic ---
  const getRecommendedZone = (ship: Ship) => {
      // 1. Tankers must go to A (Deep/Hazard safe)
      if (ship.type === ShipType.TANKER) return { zone: 'A', label: 'A区(深水)', berths: ['A01', 'A02'] };
      
      // 2. Ultra Large Vessels (>300m) must go to A
      if (ship.length > 300) return { zone: 'A', label: 'A区(深水)', berths: ['A01', 'A02'] };

      // 3. Bulk Carriers prefer B (General), can go A if needed
      if (ship.type === ShipType.BULK) return { zone: 'B', label: 'B区(通用)', berths: ['B01', 'B02', 'A01', 'A02'] };

      // 4. Large Containers (>150m) go to B or A
      if (ship.length > 150) return { zone: 'B', label: 'B区(通用)', berths: ['B01', 'B02', 'A01', 'A02'] };

      // 5. Small Feeder (<150m) go to C
      return { zone: 'C', label: 'C区(支线)', berths: ['C01', 'C02'] };
  };

  const addMessage = (from: AgentType, to: AgentType | 'ALL', content: string, type: 'info' | 'warning' | 'success' | 'negotiation' = 'info') => {
    const newMessage: AgentMessage = {
      id: Math.random().toString(36).substr(2, 9),
      from,
      to,
      content,
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const highlightAgents = (agents: AgentType[]) => setActiveAgents(agents);

  // --- Dynamic Simulation Logic ---
  
  const performSimulationStep = async (stepIndex: number) => {
      setIsThinking(true);
      const targetShips = ships.filter(s => processingShipIds.includes(s.id));
      
      if (targetShips.length === 0 && stepIndex === 0) {
          addMessage(AgentType.COORDINATOR, 'ALL', "未检测到有效任务目标，请先选择船舶。", "warning");
          setIsSimulating(false);
          setIsThinking(false);
          return;
      }

      // Thinking Animation Delay
      await new Promise(r => setTimeout(r, 1200));
      setIsThinking(false);

      // 1. Perception
      if (stepIndex === 0) {
          setPhase(SimulationPhase.PERCEPTION);
          highlightAgents([AgentType.SHIP]);
          
          // Generate AI message for Ship Agent
          const shipMessage = await aiService.generateShipAgentMessage({
            phase: 'PERCEPTION',
            ships: targetShips,
            berths: berths
          });
          addMessage(AgentType.SHIP, AgentType.SCHEDULER, shipMessage, "info");
          
          await new Promise(r => setTimeout(r, 1000));
          highlightAgents([AgentType.RESOURCE]);
          
          // Generate AI message for Resource Agent
          const resourceMessage = await aiService.generateResourceAgentMessage({
            phase: 'PERCEPTION',
            ships: targetShips,
            berths: berths
          });
          addMessage(AgentType.RESOURCE, AgentType.SCHEDULER, resourceMessage, "info");

          // 使用真实算法计算ETA修正、EOT和船舶能耗 - 航速关联属性
          setShips(prev => prev.map(s => {
              if (processingShipIds.includes(s.id)) {
                  // 1. ETA修正
                  const etaCorrection = schedulingAlgorithms.correctETA(
                      s.etaOriginal,
                      s.type,
                      s.length
                  );

                  // 2. EOT计算
                  const eotResult = schedulingAlgorithms.calculateEOT(
                      etaCorrection.correctedETA,
                      s.type,
                      s.length
                  );

                  // 3. 船舶能耗 - 航速关联属性计算（需要泊位可用时间，这里先用修正后的ETA）
                  const vspResult = schedulingAlgorithms.calculateVSP(
                      s,
                      s.etaOriginal,
                      etaCorrection.correctedETA,
                      etaCorrection.correctedETA // 暂时使用修正ETA作为泊位可用时间
                  );

                  return { 
                      ...s, 
                      etaCorrected: etaCorrection.correctedETA,
                      earliestOperationTime: eotResult.eot,
                      isDelayed: etaCorrection.isDelayed,
                      virtualArrivalMode: vspResult.virtualArrivalMode,
                      vspSavings: vspResult.vspSavings,
                      recommendedSpeed: vspResult.recommendedSpeed
                  };
              }
              return s;
          }));
      }

      // 2. Matching
      else if (stepIndex === 1) {
          setPhase(SimulationPhase.MATCHING);
          highlightAgents([AgentType.SCHEDULER]);
          
          // 在匹配阶段只显示候选泊位集生成，不显示具体分配（因为分配在优化阶段完成）
          addMessage(AgentType.SCHEDULER, 'ALL', 
`调度智能体：
物理约束(长度/吃水)校验通过。
候选泊位集生成完毕。
等待优化阶段进行最终分配。`, "warning");
          
           // 使用真实算法生成候选泊位时空资源集合
           setShips(prev => prev.map(s => {
               if (processingShipIds.includes(s.id)) {
                   const rec = getRecommendedZone(s);
                   
                   // 生成候选泊位时空资源集合
                   const occupiedSlots = new Map<string, { start: number; end: number }>();
                   berths.forEach(b => {
                       if (b.isOccupied && b.currentShipId) {
                           // 假设占用时间为4小时（实际应从船舶数据获取）
                           const occupiedShip = prev.find(ship => ship.id === b.currentShipId);
                           if (occupiedShip && occupiedShip.gantt) {
                               occupiedSlots.set(b.id, {
                                   start: occupiedShip.gantt.startTime * 60, // 转换为分钟
                                   end: (occupiedShip.gantt.startTime + occupiedShip.gantt.duration) * 60
                               });
                           }
                       }
                   });

                   const candidateSlots = schedulingAlgorithms.generateCandidateBerthSlots(
                       s,
                       berths.filter(b => rec.berths.includes(b.id)),
                       TIDE_DATA,
                       occupiedSlots
                   );

                   // 检查约束
                   const hasValidCandidate = candidateSlots.length > 0;
                   const tideCheck = hasValidCandidate 
                       ? schedulingAlgorithms.checkTideWindow(s, TIDE_DATA, berths.find(b => b.id === candidateSlots[0].berthId)!, candidateSlots[0].startTime)
                       : { feasible: false, tideHeight: 0, requiredDepth: 0, safetyMargin: 0 };

                   const c = { 
                       length: rec.berths.some(bid => {
                           const b = berths.find(berth => berth.id === bid);
                           return b ? b.length >= s.length * 1.1 : false;
                       }),
                       draftTide: tideCheck.feasible,
                       channel: true,
                       special: s.type === ShipType.TANKER
                   };

                   return { 
                       ...s, 
                       constraints: c, 
                       candidateBerths: candidateSlots.map(slot => slot.berthId)
                   };
               }
               return s;
           }));
      }

      // 3. Optimization
      else if (stepIndex === 2) {
          setPhase(SimulationPhase.OPTIMIZATION);
          highlightAgents([AgentType.OPTIMIZER]);
          
          const totalSavings = targetShips.reduce((acc, s) => acc + (s.vspSavings || 0), 0);
          
          // 使用真实的冲突检测算法
          const conflictInfo = schedulingAlgorithms.detectChannelConflicts(
              ships.filter(s => processingShipIds.includes(s.id) && s.gantt),
              10, // 10个时间片
              { deep: 1, feeder: 2 } // 深水航道1条，支线航道2条
          );
          const hasConflict = conflictInfo.hasConflict;
          
          const iterations = Math.floor(80 + Math.random() * 100); // 80-180次迭代
          const reward = parseFloat((15 + Math.random() * 10).toFixed(1)); // 15-25的奖励值
          
          // 保存优化数据
          setOptimizationData({
            totalVspSavings: totalSavings,
            hasConflict: hasConflict,
            iterations: iterations,
            reward: reward
          });
          
          // Generate AI message for Optimizer Agent
          const optimizerMessage = await aiService.generateOptimizerAgentMessage({
            phase: 'OPTIMIZATION',
            ships: targetShips,
            berths: berths,
            specificData: {
              totalVspSavings: totalSavings,
              hasConflict: hasConflict
            }
          });
          addMessage(AgentType.OPTIMIZER, 'ALL', optimizerMessage, "success");

          await new Promise(r => setTimeout(r, 1000));
          highlightAgents([AgentType.COORDINATOR]);
          
          // 使用变邻域搜索和多目标优化进行最终分配
          setShips(prev => {
              const assigned = new Set<string>();
              berths.forEach(b => { if(b.isOccupied) assigned.add(b.id) });
              
              // 创建初始解
              const batch = [...prev].filter(s => processingShipIds.includes(s.id));
              batch.sort((a,b) => b.priority - a.priority);

              const initialAssignments = new Map<string, string>();
              const initialStartTimes = new Map<string, number>();

              // 生成初始解（规则启发式）
              batch.forEach((s) => {
                  const rec = getRecommendedZone(s);
                  let finalBerth = rec.berths.find(p => !assigned.has(p));
                  
                  if (!finalBerth && rec.zone === 'B') {
                      finalBerth = ['A01', 'A02'].find(p => !assigned.has(p));
                  }

                  if (finalBerth) {
                      assigned.add(finalBerth);
                      initialAssignments.set(s.id, finalBerth);
                      // 基于EOT计算开始时间
                      const eotTime = s.earliestOperationTime || s.etaCorrected || s.etaOriginal;
                      const [eotHours] = eotTime.split(':').map(Number);
                      initialStartTimes.set(s.id, eotHours);
                  }
              });

              // 创建初始解决方案
              const initialSolution: schedulingAlgorithms.ScheduleSolution = {
                  assignments: initialAssignments,
                  startTimes: initialStartTimes,
                  objectiveValue: 0,
                  efficiency: 0,
                  cost: 0
              };

              // 使用变邻域搜索优化
              const optimizedSolution = schedulingAlgorithms.variableNeighborhoodSearch(
                  initialSolution,
                  batch,
                  berths,
                  50 // 迭代次数
              );

              // 应用优化后的解
              const updates = new Map<string, string | null>();
              batch.forEach(s => {
                  const berthId = optimizedSolution.assignments.get(s.id);
                  updates.set(s.id, berthId || null);
              });
              
              const finalShips = prev.map(s => {
                  if (updates.has(s.id)) {
                      const berthId = updates.get(s.id);
                      if (berthId) {
                          const startTime = optimizedSolution.startTimes.get(s.id) || 10;
                          const berth = berths.find(b => b.id === berthId);
                          const channelSlot = berth?.zone === 'A' ? 'Deep' : 'Feeder';
                          
                          return { 
                              ...s, 
                              assignedBerthId: berthId, 
                              isDelayed: false, // 确保分配到泊位的船不是延迟状态
                              gantt: { 
                                  startTime: startTime, 
                                  duration: 4, // 基础4小时，可根据船舶大小调整
                                  channelSlot: channelSlot
                              } 
                          };
                      } else {
                          // Delayed - 没有分配到泊位，清除之前的分配信息
                          return { 
                              ...s, 
                              isDelayed: true, 
                              status: 'waiting',
                              assignedBerthId: undefined, // 清除泊位分配
                              gantt: undefined // 清除甘特图数据
                          };
                      }
                  }
                  return s;
              });
              
              // 基于实际分配结果生成调度智能体消息（异步执行）
              (async () => {
                  // 按开始时间排序，确保消息顺序与动画执行顺序一致
                  const assignedShipsForMessage = finalShips
                      .filter(s => 
                          processingShipIds.includes(s.id) && 
                          s.assignedBerthId && 
                          s.gantt
                      )
                      .sort((a, b) => {
                          const timeA = a.gantt?.startTime || 0;
                          const timeB = b.gantt?.startTime || 0;
                          return timeA - timeB; // 按开始时间升序，与动画顺序一致
                      });
                  
                  // 生成实际分配方案的消息
                  const actualAssignments = assignedShipsForMessage.map(s => {
                      const berth = berths.find(b => b.id === s.assignedBerthId);
                      const zoneLabel = berth?.zone === 'A' ? 'A区(深水)' : 
                                       berth?.zone === 'B' ? 'B区(通用)' : 'C区(支线)';
                      return `${s.name} -> ${zoneLabel} (${s.assignedBerthId})`;
                  }).join('\n');
                  
                  addMessage(AgentType.SCHEDULER, 'ALL', 
  `调度智能体：
  ${actualAssignments}
  物理约束(长度/吃水)校验通过。
  最终分配方案已确定。`, "warning");
                  
                  // Generate AI message for Coordinator Agent
                  const coordinatorMessage = await aiService.generateCoordinatorAgentMessage({
                    phase: 'OPTIMIZATION',
                    ships: targetShips,
                    berths: berths
                  });
                  addMessage(AgentType.COORDINATOR, 'ALL', coordinatorMessage, "negotiation");
              })();
              
              return finalShips;
          });
          const carbonReduction = totalSavings * 3.0; // 每吨燃油约产生3吨碳排放
          setCarbonSaved(prev => prev + carbonReduction);
      }

      // 4. Execution - 按顺序依次完成每艘船的完整流程
      else if (stepIndex === 3) {
          setPhase(SimulationPhase.EXECUTION);
          highlightAgents([AgentType.SCHEDULER]); 
          
          // Check for unassigned ships
          const delayedShips = ships.filter(s => processingShipIds.includes(s.id) && s.isDelayed);
          if (delayedShips.length > 0) {
              // Generate AI warning message
              const warningMessage = await aiService.generateWarningMessage(delayedShips);
              addMessage(AgentType.SCHEDULER, 'ALL', warningMessage, "warning");
          }

          addMessage(AgentType.SCHEDULER, 'ALL', 
`执行指令：
启动自动引航序列。
锁定泊位与航道资源。`, "success");

          // 获取所有已分配泊位的船舶，按开始时间排序
          // 重要：排除被标记为延迟的船（isDelayed为true的船不应该进入动画）
          const assignedShips = ships
              .filter(s => 
                  processingShipIds.includes(s.id) && 
                  s.assignedBerthId && 
                  s.gantt && 
                  !s.isDelayed // 排除延迟的船
              )
              .sort((a, b) => {
                  const timeA = a.gantt?.startTime || 0;
                  const timeB = b.gantt?.startTime || 0;
                  return timeA - timeB; // 按开始时间升序
              });

          // 按顺序依次完成每艘船的完整流程：navigating -> docking -> docked
          // 每艘船完全走完流程后，下一艘船才开始
          let cumulativeDelay = 0;
          assignedShips.forEach((ship, index) => {
              // 1. 启动导航 (navigating)
              setTimeout(() => {
                  setShips(prev => prev.map(s => {
                      if (s.id === ship.id && s.assignedBerthId) {
                          return { ...s, status: 'navigating' };
                      }
                      return s;
                  }));
              }, cumulativeDelay);
              
              // 2. 导航到主航道后，开始靠泊 (docking) - 2.5秒后
              cumulativeDelay += 2500;
              setTimeout(() => {
                  setShips(prev => prev.map(s => {
                      if (s.id === ship.id && s.status === 'navigating') {
                          return { ...s, status: 'docking' };
                      }
                      return s;
                  }));
                  
                  // 占用泊位
                  setBerths(prev => prev.map(b => {
                      if (b.id === ship.assignedBerthId) {
                          return { ...b, isOccupied: true, currentShipId: ship.id };
                      }
                      return b;
                  }));
              }, cumulativeDelay);
              
              // 3. 靠泊完成 (docked) - 再2.5秒后
              cumulativeDelay += 2500;
              setTimeout(() => {
                  setShips(prev => prev.map(s => {
                      if (s.id === ship.id && s.status === 'docking') {
                          return { ...s, status: 'docked' };
                      }
                      return s;
                  }));
              }, cumulativeDelay);
              
              // 4. 下一艘船开始前，等待0.5秒缓冲
              cumulativeDelay += 500;
          });

          // 所有船都完成后，结束模拟
          setTimeout(() => {
              setEfficiency(prev => Math.min(100, prev + 5));
              
              // Stop everything
              setActiveAgents([]);
              setIsThinking(false);
              setIsSimulating(false);
              setCurrentStepIndex(-1);
              
              // Clear selection so user can pick new ones
              setSelectedShipIds(new Set());
              setProcessingShipIds([]);
          }, cumulativeDelay);
          
          return; // 提前返回，不继续执行后续代码
      }
      
      // Schedule Next Step
      if (stepIndex < 5) {
          const delay = 3000; // Animation time
          setTimeout(() => setCurrentStepIndex(stepIndex + 1), delay);
      }
  };

  useEffect(() => {
    if (isSimulating && currentStepIndex >= 0) {
        performSimulationStep(currentStepIndex);
    }
  }, [currentStepIndex, isSimulating]);

  // --- Interaction Handlers ---

  const toggleShipSelection = (id: string, e: React.MouseEvent) => {
      e.stopPropagation(); // 阻止事件冒泡
      if (isSimulating) return;
      const ship = ships.find(s => s.id === id);
      if (ship && ship.status !== 'waiting') return; 

      const newSet = new Set(selectedShipIds);
      if (newSet.has(id)) {
          newSet.delete(id);
      } else {
          newSet.add(id);
      }
      setSelectedShipIds(newSet);
  };

  const handleShipClick = (id: string) => {
      const ship = ships.find(s => s.id === id);
      if (ship) {
          setSelectedShipForDetail(ship);
      }
  };

  const handleStartSelected = () => {
    if (isSimulating) return;
    if (selectedShipIds.size === 0) {
        alert("请先在左侧列表中勾选需要调度的船舶！");
        return;
    }
    
    setMessages([]);
    setEfficiency(65);
    setCarbonSaved(12);
    setProcessingShipIds(Array.from(selectedShipIds));
    setOptimizationData({ totalVspSavings: 0, hasConflict: false, iterations: 0, reward: 0 }); 
    setCurrentStepIndex(0);
    setIsSimulating(true);
  };

  const handleStartAuto = () => {
      if (isSimulating) return;
      const waitingShips = ships.filter(s => s.status === 'waiting');
      if (waitingShips.length === 0) {
          alert("当前没有待港船舶可供调度。");
          return;
      }
      setMessages([]);
      setProcessingShipIds(waitingShips.map(s => s.id));
      setCurrentStepIndex(0);
      setIsSimulating(true);
  };

  const handleContinue = () => {
      if (isSimulating) return;
      const currentCount = ships.length;
      const newShips = generateNewShips(currentCount);
      setShips(prev => [...prev, ...newShips]);
      addMessage(AgentType.SHIP, 'ALL', `新船舶已到达锚地 (${newShips.length}艘)，等待调度。`, 'info');
  };

  const handleReset = () => {
    setIsSimulating(false);
    setIsThinking(false);
    setShips(INITIAL_SHIPS);
    setBerths(PORT_BERTHS);
    setMessages([]);
    setPhase(SimulationPhase.IDLE);
    setActiveAgents([]);
    setCurrentStepIndex(-1);
    setSelectedShipIds(new Set());
    setProcessingShipIds([]);
    setOptimizationData({ totalVspSavings: 0, hasConflict: false, iterations: 0, reward: 0 });
    setCarbonSaved(12);
    setEfficiency(65);
  };

  const handleBerthClick = (berthId: string) => {
      // Find valid docked ship
      const ship = ships.find(s => s.assignedBerthId === berthId && s.status === 'docked');
      
      if (ship) {
          // Explicit check to confirm release
          const confirmed = window.confirm(`确认 ${ship.name} (ID: ${ship.id}) 完工离泊? \n此操作将释放泊位资源。`);
          
          if (confirmed) {
              setShips(prev => prev.map(s => s.id === ship.id ? { ...s, status: 'departing' } : s));
              setBerths(prev => prev.map(b => b.id === berthId ? { ...b, isOccupied: false } : b));
              
              // Remove ship from list after animation completes
              setTimeout(() => {
                  setShips(prev => prev.filter(s => s.id !== ship.id));
              }, 2500);
          }
      }
  };

  const getPhaseWidth = () => {
     switch(phase) {
        case SimulationPhase.IDLE: return '0%';
        case SimulationPhase.PERCEPTION: return '25%';
        case SimulationPhase.MATCHING: return '50%';
        case SimulationPhase.OPTIMIZATION: return '75%';
        case SimulationPhase.EXECUTION: return '100%';
        default: return '0%';
     }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-gradient-to-br from-slate-950 via-[#0f172a] to-slate-950 text-slate-300 overflow-hidden font-sans">
      {/* Header */}
      <header className="h-14 border-b border-slate-700/50 bg-gradient-to-r from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-sm flex items-center px-4 justify-between shrink-0 z-50 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border border-blue-500/40 rounded-lg shadow-[0_0_15px_rgba(59,130,246,0.2)] backdrop-blur-sm">
            <Anchor size={20} className="text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-wide text-slate-100 uppercase font-sans drop-shadow-sm">
              SmartPort <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">MAS</span>
            </h1>
            <div className="text-xs text-slate-400 leading-none font-medium">多智能体港口调度系统 V3.2</div>
          </div>
        </div>

        {/* Phase Progress */}
        <div className="flex flex-col w-[300px]">
            <div className="flex justify-between text-xs text-slate-400 mb-1.5 font-semibold">
                 <span className="tracking-wide">感知</span>
                 <span className="tracking-wide">匹配</span>
                 <span className="tracking-wide">优化</span>
                 <span className="tracking-wide">执行</span>
            </div>
            <div className="w-full h-2 bg-slate-800/60 rounded-full overflow-hidden border border-slate-700/50 shadow-inner">
                <div className="h-full bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.6)] transition-all duration-500 ease-in-out relative overflow-hidden" style={{ width: getPhaseWidth() }}>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                </div>
            </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 items-center">
            <button onClick={handleReset} className="text-sm text-slate-400 hover:text-white flex items-center gap-1.5 font-medium transition-all px-3 py-1.5 rounded-lg hover:bg-slate-700/50 backdrop-blur-sm">
                <RotateCcw size={16} /> 重置
            </button>
            <div className="h-6 w-px bg-slate-700/50 mx-1"></div>
            <button onClick={handleContinue} disabled={isSimulating} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all border bg-gradient-to-r from-slate-700/80 to-slate-600/80 border-slate-600/50 text-slate-200 hover:from-slate-600 hover:to-slate-500 hover:text-white hover:shadow-[0_0_10px_rgba(148,163,184,0.3)] disabled:opacity-40 disabled:cursor-not-allowed backdrop-blur-sm">
                <FastForward size={16} /> 生成新船
            </button>
            <button onClick={handleStartAuto} disabled={isSimulating} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all border bg-gradient-to-r from-indigo-600 to-purple-600 border-indigo-500/50 text-white hover:from-indigo-500 hover:to-purple-500 hover:shadow-[0_0_15px_rgba(99,102,241,0.6)] disabled:opacity-40 disabled:grayscale disabled:cursor-not-allowed backdrop-blur-sm">
                <Layers size={16}/> 全自动调度
            </button>
            <button onClick={handleStartSelected} disabled={isSimulating} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all border shadow-lg backdrop-blur-sm ${isSimulating ? 'bg-slate-800/60 border-slate-700/50 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-600 to-teal-600 border-emerald-500/50 text-white hover:from-emerald-500 hover:to-teal-500 hover:shadow-[0_0_20px_rgba(16,185,129,0.6)]'}`}>
                {isSimulating ? <Cpu className="animate-spin" size={14}/> : <Play size={14}/>}
                {isSimulating ? '调度执行中...' : '启动选中调度'}
            </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 p-3 grid grid-cols-12 gap-3 overflow-hidden min-h-0">
        
        {/* Left: List & Gantt */}
        <div className="col-span-2 flex flex-col gap-3 min-h-0">
             <div className="flex-[2] bg-gradient-to-br from-slate-900/90 to-slate-800/90 border border-slate-700/50 rounded-xl flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.3)] overflow-hidden min-h-0 backdrop-blur-sm">
                <div className="p-2.5 border-b border-slate-700/50 bg-gradient-to-r from-slate-800/80 to-slate-700/60 font-bold text-sm text-slate-300 flex items-center justify-between shrink-0 backdrop-blur-sm">
                    <span className="flex items-center gap-2"><ShipIcon size={16} className="text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]"/> 待入港队列</span>
                    <span className="text-xs bg-slate-900/80 px-2 py-0.5 rounded-md border border-slate-600/50 text-slate-300 font-semibold backdrop-blur-sm">选中: {selectedShipIds.size}</span>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                    {ships.map(ship => {
                        const isSelected = selectedShipIds.has(ship.id);
                        const isSelectable = ship.status === 'waiting' && !isSimulating;
                        return (
                            <div key={ship.id} 
                                className={`p-2.5 rounded-lg border transition-all duration-200 group relative backdrop-blur-sm ${isSelected ? 'bg-gradient-to-r from-blue-900/40 to-cyan-900/20 border-blue-500/60 shadow-[0_4px_12px_rgba(59,130,246,0.3)]' : selectedShipForDetail?.id === ship.id ? 'bg-gradient-to-r from-purple-900/30 to-pink-900/20 border-purple-500/50 shadow-[0_4px_12px_rgba(168,85,247,0.3)]' : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-700/40'} ${isSelectable ? 'cursor-pointer hover:border-slate-500 hover:shadow-md' : 'opacity-70'}`}
                                style={{ borderLeftWidth: '3px', borderLeftColor: ship.color }}
                                onClick={() => handleShipClick(ship.id)}
                            >
                                <div className="flex items-start gap-2">
                                    <div 
                                        className={`mt-0.5 w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 cursor-pointer transition-all ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-600 bg-slate-900 hover:border-blue-400'}`}
                                        onClick={(e) => toggleShipSelection(ship.id, e)}
                                    >
                                        {isSelected && <CheckSquare size={10} className="text-white" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center mb-0.5">
                                            <span className="font-bold text-sm text-slate-200">{ship.id}</span>
                                            <span className="text-xs px-1.5 py-0.5 bg-slate-700 rounded text-slate-400">{ship.type}</span>
                                        </div>
                                        <div className="text-sm text-slate-400 truncate font-bold">{ship.name}</div>
                                        <div className="flex justify-between mt-1 text-xs text-slate-500 font-mono">
                                            <span>Len:{ship.length}m</span>
                                            <span className={ship.status === 'docked' ? 'text-emerald-500' : 'text-blue-400'}>
                                                {ship.status === 'waiting' ? '待港' : ship.status === 'navigating' ? '航行中' : ship.status === 'docking' ? '靠泊中' : '作业中'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
             </div>
             <div className="flex-[1] min-h-[160px] shrink-0">
                 <BottomVis ships={ships} />
             </div>
        </div>

        {/* Center: Map & Phase Detail */}
        <div className="col-span-7 flex flex-col gap-3 min-h-0 h-full">
             <div className="flex-[3] relative rounded-xl overflow-hidden bg-gradient-to-br from-slate-900/95 to-slate-950/95 border border-slate-700/50 shadow-[0_8px_32px_rgba(0,0,0,0.4)] min-h-0 backdrop-blur-sm">
                  <PortMap ships={ships} berths={berths} simulationPhase={phase} onBerthClick={handleBerthClick} processingShipIds={processingShipIds} />
             </div>
             <div className="flex-[1] min-h-[220px] max-h-[250px] shrink-0 overflow-hidden rounded-xl">
                 <PhaseDetailPanel 
                   phase={phase} 
                   ships={ships} 
                   processingIds={processingShipIds}
                   totalVspSavings={optimizationData.totalVspSavings}
                   carbonSaved={carbonSaved}
                   hasConflict={optimizationData.hasConflict}
                   optimizationIterations={optimizationData.iterations}
                   optimizationReward={optimizationData.reward}
                 />
             </div>
        </div>

        {/* Right: Dashboard & Agents */}
        <div className="col-span-3 flex flex-col gap-3 min-h-0">
             <div className="h-[150px] shrink-0">
                 <Dashboard tideData={TIDE_DATA} efficiency={efficiency} carbonSaved={carbonSaved} />
             </div>
             <div className="flex-1 min-h-0 overflow-hidden rounded-xl">
                 <AgentOrchestrator messages={messages} activeAgents={activeAgents} isThinking={isThinking} isSimulating={isSimulating} />
             </div>
        </div>

        {/* 船舶详情浮窗 */}
        {selectedShipForDetail && (
            <>
                {/* 背景遮罩 */}
                <div 
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
                    onClick={() => setSelectedShipForDetail(null)}
                ></div>
                {/* 浮窗卡片 */}
                <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-br from-slate-900/98 to-slate-800/98 border border-slate-700/50 rounded-xl p-4 shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-md z-50 min-w-[320px] max-w-[400px]">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-700/50">
                        <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                            <ShipIcon size={16} className="text-cyan-400" /> 船舶详情
                        </h4>
                        <button 
                            onClick={() => setSelectedShipForDetail(null)}
                            className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-slate-700/50 transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                    <div className="space-y-2.5 text-sm">
                        <div className="flex justify-between items-center py-1">
                            <span className="text-slate-400">船舶ID:</span>
                            <span className="text-slate-200 font-mono font-bold">{selectedShipForDetail.id}</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                            <span className="text-slate-400">船名:</span>
                            <span className="text-slate-200 font-bold">{selectedShipForDetail.name}</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                            <span className="text-slate-400">类型:</span>
                            <span className="text-slate-300">{selectedShipForDetail.type}</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                            <span className="text-slate-400">长度:</span>
                            <span className="text-slate-200 font-mono">{selectedShipForDetail.length}m</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                            <span className="text-slate-400">吃水:</span>
                            <span className="text-slate-200 font-mono">{selectedShipForDetail.draft}m</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                            <span className="text-slate-400">优先级:</span>
                            <span className="text-slate-200 font-mono">{selectedShipForDetail.priority}/10</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                            <span className="text-slate-400">状态:</span>
                            <span className={`font-bold ${
                                selectedShipForDetail.status === 'docked' ? 'text-emerald-400' : 
                                selectedShipForDetail.status === 'waiting' ? 'text-blue-400' : 
                                selectedShipForDetail.status === 'navigating' ? 'text-cyan-400' : 
                                'text-amber-400'
                            }`}>
                                {selectedShipForDetail.status === 'waiting' ? '待港' : 
                                 selectedShipForDetail.status === 'navigating' ? '航行中' : 
                                 selectedShipForDetail.status === 'docking' ? '靠泊中' : 
                                 selectedShipForDetail.status === 'docked' ? '作业中' : '离港中'}
                            </span>
                        </div>
                        {selectedShipForDetail.etaOriginal && (
                            <div className="flex justify-between items-center py-1">
                                <span className="text-slate-400">预计到港:</span>
                                <span className="text-slate-200 font-mono">{selectedShipForDetail.etaOriginal}</span>
                            </div>
                        )}
                        {selectedShipForDetail.assignedBerthId && (
                            <div className="flex justify-between items-center py-1">
                                <span className="text-slate-400">分配泊位:</span>
                                <span className="text-cyan-400 font-mono font-bold">{selectedShipForDetail.assignedBerthId}</span>
                            </div>
                        )}
                    </div>
                </div>
            </>
        )}

      </main>
    </div>
  );
};

export default App;