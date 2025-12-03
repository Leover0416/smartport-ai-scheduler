/**
 * 核心调度算法实现
 * 包括：ETA修正、EOT计算、船舶能耗 - 航速关联属性计算、冲突检测等
 */

import { Ship, Berth, TidePoint } from '../types';

// ==================== 1. ETA修正算法 ====================

/**
 * 模拟AIS历史数据分析，修正ETA偏差
 * 实际应用中应使用LSTM/GRU模型和AIS历史数据
 */
export function correctETA(
  originalETA: string,
  shipType: string,
  shipLength: number,
  historicalBias: number = 0
): { correctedETA: string; bias: number; isDelayed: boolean } {
  // 解析原始ETA
  const [hours, minutes] = originalETA.split(':').map(Number);
  const originalTime = hours * 60 + minutes; // 转换为分钟

  // 基于船舶类型和尺度的经验偏差（模拟深度学习模型输出）
  // 大型船舶通常延迟更多，小型船舶更准时
  let typeBias = 0;
  if (shipType === '油轮') typeBias = 15; // 油轮平均延迟15分钟
  else if (shipType === '散货船') typeBias = 10;
  else typeBias = 5; // 集装箱船相对准时

  // 基于长度的偏差（大船更可能延迟）
  const lengthBias = Math.max(0, (shipLength - 150) / 10); // 每10米增加1分钟偏差

  // 随机波动（模拟实际航行中的不确定性）
  const randomBias = (Math.random() - 0.5) * 20; // -10到+10分钟

  // 总偏差
  const totalBias = typeBias + lengthBias + randomBias + historicalBias;

  // 计算修正后的ETA
  const correctedTime = originalTime + totalBias;
  const correctedHours = Math.floor(correctedTime / 60) % 24;
  const correctedMinutes = Math.floor(correctedTime % 60);
  const correctedETA = `${String(correctedHours).padStart(2, '0')}:${String(correctedMinutes).padStart(2, '0')}`;

  // 判断是否延误（偏差超过30分钟）
  const isDelayed = totalBias > 30;

  return {
    correctedETA,
    bias: Math.round(totalBias * 10) / 10,
    isDelayed
  };
}

// ==================== 2. EOT计算 ====================

/**
 * 计算最早可作业时间 (Earliest Operation Time)
 * EOT = 修正后的ETA + 联检时间 + 引航登轮准备时间
 */
export function calculateEOT(
  correctedETA: string,
  shipType: string,
  shipLength: number
): { eot: string; inspectionTime: number; pilotPrepTime: number } {
  // 解析修正后的ETA
  const [hours, minutes] = correctedETA.split(':').map(Number);
  const correctedTime = hours * 60 + minutes;

  // 联检时间（根据船舶类型和大小）
  let inspectionTime = 30; // 基础30分钟
  if (shipType === '油轮') inspectionTime = 60; // 危险品需要更长时间
  else if (shipLength > 300) inspectionTime = 45; // 大型船舶
  else if (shipLength < 150) inspectionTime = 20; // 小型船舶

  // 引航登轮准备时间
  let pilotPrepTime = 15; // 基础15分钟
  if (shipLength > 300) pilotPrepTime = 25; // 超大型船舶需要更长时间
  else if (shipLength < 150) pilotPrepTime = 10; // 小型船舶

  // 计算EOT
  const eotTime = correctedTime + inspectionTime + pilotPrepTime;
  const eotHours = Math.floor(eotTime / 60) % 24;
  const eotMinutes = Math.floor(eotTime % 60);
  const eot = `${String(eotHours).padStart(2, '0')}:${String(eotMinutes).padStart(2, '0')}`;

  return {
    eot,
    inspectionTime,
    pilotPrepTime
  };
}

// ==================== 3. 船舶能耗 - 航速关联属性计算 ====================

/**
 * 计算基于船舶能耗 - 航速关联属性的虚拟到港策略（Virtual Arrival）燃油节省
 * 基于船舶消耗曲线和最优经济航速区间
 */
export function calculateVSP(
  ship: Ship,
  originalETA: string,
  correctedETA: string,
  berthAvailableTime: string, // 泊位可用时间
  distanceToPort: number = 50 // 距离港口的距离（海里），默认50海里
): { 
  vspSavings: number; // 燃油节省（吨）
  recommendedSpeed: number; // 建议航速（节）
  virtualArrivalMode: boolean;
  fuelConsumptionCurve: { speed: number; consumption: number }[];
} {
  // 解析时间
  const parseTime = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const originalTime = parseTime(originalETA);
  const correctedTime = parseTime(correctedETA);
  const berthTime = parseTime(berthAvailableTime);

  // 计算时间差（分钟）
  const timeDiff = berthTime - correctedTime; // 可以提前或延迟的时间

  // 如果泊位可用时间早于修正ETA，可以减速节省燃油
  if (timeDiff > 0 && timeDiff <= 180) { // 最多提前3小时
    // 船舶消耗曲线（模拟）
    // 实际应用中应使用真实的船舶性能数据
    const baseSpeed = 14; // 基础航速（节）
    const optimalSpeed = 12; // 最优经济航速（节）
    const maxSpeed = 18; // 最大航速（节）

    // 燃油消耗率（吨/小时）与航速的关系（二次函数）
    const getFuelConsumption = (speed: number) => {
      // 消耗 = a * speed^2 + b * speed + c
      const a = 0.05;
      const b = -1.2;
      const c = 10;
      return Math.max(0, a * speed * speed + b * speed + c);
    };

    // 计算不同航速下的燃油消耗
    const fuelConsumptionCurve = [];
    for (let speed = 10; speed <= 18; speed += 0.5) {
      fuelConsumptionCurve.push({
        speed,
        consumption: getFuelConsumption(speed)
      });
    }

    // 计算所需航速以达到泊位可用时间
    const requiredSpeed = (distanceToPort * 60) / timeDiff; // 节

    // 如果所需航速在经济航速范围内，启用船舶能耗 - 航速关联属性策略
    if (requiredSpeed >= optimalSpeed && requiredSpeed <= baseSpeed) {
      const originalConsumption = getFuelConsumption(baseSpeed) * (distanceToPort / baseSpeed);
      const vspConsumption = getFuelConsumption(requiredSpeed) * (distanceToPort / requiredSpeed);
      const savings = originalConsumption - vspConsumption;

      return {
        vspSavings: Math.max(0, Math.round(savings * 10) / 10),
        recommendedSpeed: Math.round(requiredSpeed * 10) / 10,
        virtualArrivalMode: true,
        fuelConsumptionCurve
      };
    }
  }

  // 如果无法启用船舶能耗 - 航速关联属性策略，返回默认值
  return {
    vspSavings: 0,
    recommendedSpeed: 14, // 默认航速
    virtualArrivalMode: false,
    fuelConsumptionCurve: []
  };
}

// ==================== 4. 航道冲突检测 ====================

/**
 * 检测航道时空冲突
 * 返回冲突矩阵和冲突详情
 */
export interface ConflictInfo {
  hasConflict: boolean;
  conflicts: Array<{
    ship1: string;
    ship2: string;
    conflictType: 'time_overlap' | 'channel_collision' | 'berth_overlap';
    timeSlot: number;
    channel: 'Deep' | 'Feeder';
    severity: 'low' | 'medium' | 'high';
  }>;
  conflictMatrix: number[][]; // 时间片 x 航道槽位
}

export function detectChannelConflicts(
  ships: Ship[],
  timeSlots: number = 10, // 时间片数量（24小时分成10个时段）
  channels: { deep: number; feeder: number } = { deep: 1, feeder: 2 } // 深水航道1条，支线航道2条
): ConflictInfo {
  const conflicts: ConflictInfo['conflicts'] = [];
  const conflictMatrix: number[][] = Array(timeSlots)
    .fill(0)
    .map(() => Array(channels.deep + channels.feeder).fill(0));

  // 获取有甘特图数据的船舶
  const shipsWithSchedule = ships.filter(s => s.gantt && s.assignedBerthId);

  // 检测停泊时间重叠
  for (let i = 0; i < shipsWithSchedule.length; i++) {
    for (let j = i + 1; j < shipsWithSchedule.length; j++) {
      const ship1 = shipsWithSchedule[i];
      const ship2 = shipsWithSchedule[j];

      if (!ship1.gantt || !ship2.gantt) continue;

      // 检查是否使用同一泊位
      if (ship1.assignedBerthId === ship2.assignedBerthId) {
        const start1 = ship1.gantt.startTime;
        const end1 = start1 + ship1.gantt.duration;
        const start2 = ship2.gantt.startTime;
        const end2 = start2 + ship2.gantt.duration;

        // 检查时间重叠
        if (!(end1 <= start2 || end2 <= start1)) {
          conflicts.push({
            ship1: ship1.id,
            ship2: ship2.id,
            conflictType: 'berth_overlap',
            timeSlot: Math.floor((start1 + start2) / 2 / (24 / timeSlots)),
            channel: ship1.gantt.channelSlot,
            severity: 'high'
          });
        }
      }

      // 检查航道会遇冲突
      if (ship1.gantt.channelSlot === ship2.gantt.channelSlot) {
        const start1 = ship1.gantt.startTime;
        const end1 = start1 + ship1.gantt.duration;
        const start2 = ship2.gantt.startTime;
        const end2 = start2 + ship2.gantt.duration;

        // 检查时间重叠（航道冲突）
        if (!(end1 <= start2 || end2 <= start1)) {
          const channelIndex = ship1.gantt.channelSlot === 'Deep' ? 0 : 1;
          const timeSlot = Math.floor((start1 + start2) / 2 / (24 / timeSlots));

          // 更新冲突矩阵
          conflictMatrix[timeSlot][channelIndex]++;

          // 深水航道只能单向通行，支线航道可以双向
          const maxCapacity = ship1.gantt.channelSlot === 'Deep' ? 1 : 2;
          if (conflictMatrix[timeSlot][channelIndex] > maxCapacity) {
            conflicts.push({
              ship1: ship1.id,
              ship2: ship2.id,
              conflictType: 'channel_collision',
              timeSlot,
              channel: ship1.gantt.channelSlot,
              severity: ship1.gantt.channelSlot === 'Deep' ? 'high' : 'medium'
            });
          }
        }
      }
    }
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts,
    conflictMatrix
  };
}

// ==================== 5. 潮汐窗口匹配 ====================

/**
 * 检查船舶是否可以在特定时间通过潮汐窗口
 */
export function checkTideWindow(
  ship: Ship,
  tideData: TidePoint[],
  berth: Berth,
  targetTime: string
): { 
  feasible: boolean; 
  tideHeight: number; 
  requiredDepth: number;
  safetyMargin: number;
} {
  // 解析目标时间
  const [hours] = targetTime.split(':').map(Number);

  // 查找最接近的潮汐数据点
  let closestTide = tideData[0];
  let minDiff = Math.abs(parseInt(tideData[0].time.split(':')[0]) - hours);

  for (const tide of tideData) {
    const tideHour = parseInt(tide.time.split(':')[0]);
    const diff = Math.abs(tideHour - hours);
    if (diff < minDiff) {
      minDiff = diff;
      closestTide = tide;
    }
  }

  // 计算所需水深
  const requiredDepth = ship.draft + 1.0; // 吃水 + 1米安全余量（UKC）
  const availableDepth = berth.depth + closestTide.height;
  const safetyMargin = availableDepth - requiredDepth;

  return {
    feasible: availableDepth >= requiredDepth,
    tideHeight: closestTide.height,
    requiredDepth,
    safetyMargin: Math.round(safetyMargin * 10) / 10
  };
}

// ==================== 6. 候选泊位时空资源集合生成 ====================

/**
 * 为船舶生成候选泊位时空资源集合
 */
export interface CandidateBerthSlot {
  berthId: string;
  startTime: string;
  endTime: string;
  tideWindow: { feasible: boolean; height: number };
  channelSlot: 'Deep' | 'Feeder';
}

export function generateCandidateBerthSlots(
  ship: Ship,
  berths: Berth[],
  tideData: TidePoint[],
  occupiedSlots: Map<string, { start: number; end: number }> = new Map()
): CandidateBerthSlot[] {
  const candidates: CandidateBerthSlot[] = [];

  // 获取船舶的EOT（最早可作业时间）
  const eotTime = ship.earliestOperationTime || ship.etaCorrected || ship.etaOriginal;
  const [eotHours] = eotTime.split(':').map(Number);
  const eotMinutes = eotHours * 60;

  // 估算作业时长（小时）
  const estimatedDuration = Math.max(4, Math.ceil(ship.length / 50)); // 基础4小时，每50米增加1小时

  // 遍历所有泊位
  for (const berth of berths) {
    // 检查长度约束
    if (berth.length < ship.length * 1.1) continue; // 泊位长度需≥船舶长度×1.1

    // 检查吃水深度上限（15米）
    if (ship.draft > 15) continue;

    // 检查类型约束（油轮必须去A区）
    if (ship.type === '油轮' && berth.zone !== 'A') continue;

    // 检查泊位是否被占用
    const occupied = occupiedSlots.get(berth.id);
    if (occupied && berth.isOccupied) {
      // 如果被占用，检查占用结束时间后的时间窗
      const availableStart = occupied.end;
      const availableStartHours = Math.floor(availableStart / 60);
      const availableStartMinutes = availableStart % 60;
      const startTime = `${String(availableStartHours).padStart(2, '0')}:${String(availableStartMinutes).padStart(2, '0')}`;
      const endTimeHours = availableStartHours + estimatedDuration;
      const endTime = `${String(endTimeHours % 24).padStart(2, '0')}:00`;

      // 检查潮汐窗口
      const tideCheck = checkTideWindow(ship, tideData, berth, startTime);
      if (tideCheck.feasible) {
        candidates.push({
          berthId: berth.id,
          startTime,
          endTime,
          tideWindow: {
            feasible: true,
            height: tideCheck.tideHeight
          },
          channelSlot: berth.zone === 'A' ? 'Deep' : 'Feeder'
        });
      }
    } else {
      // 泊位空闲，从EOT开始
      const startTime = eotTime;
      const endTimeHours = eotHours + estimatedDuration;
      const endTime = `${String(endTimeHours % 24).padStart(2, '0')}:00`;

      // 检查潮汐窗口
      const tideCheck = checkTideWindow(ship, tideData, berth, startTime);
      if (tideCheck.feasible) {
        candidates.push({
          berthId: berth.id,
          startTime,
          endTime,
          tideWindow: {
            feasible: true,
            height: tideCheck.tideHeight
          },
          channelSlot: berth.zone === 'A' ? 'Deep' : 'Feeder'
        });
      }
    }
  }

  return candidates;
}

// ==================== 7. 变邻域搜索算法 ====================

/**
 * 变邻域搜索（Variable Neighborhood Search）算法
 * 用于优化调度方案
 */

export interface ScheduleSolution {
  assignments: Map<string, string>; // shipId -> berthId
  startTimes: Map<string, number>; // shipId -> startTime (0-24 scale)
  objectiveValue: number; // 目标函数值
  efficiency: number; // 效率得分
  cost: number; // 成本得分
}

/**
 * 交换算子：交换两艘船的泊位分配
 */
export function swapOperator(
  solution: ScheduleSolution,
  ship1: Ship,
  ship2: Ship,
  berths: Berth[]
): ScheduleSolution | null {
  const newAssignments = new Map(solution.assignments);
  const newStartTimes = new Map(solution.startTimes);

  const berth1 = newAssignments.get(ship1.id);
  const berth2 = newAssignments.get(ship2.id);

  if (!berth1 || !berth2) return null;

  // 检查交换后是否满足约束
  const berth1Obj = berths.find(b => b.id === berth1);
  const berth2Obj = berths.find(b => b.id === berth2);

  if (!berth1Obj || !berth2Obj) return null;

  // 检查长度约束
  if (berth1Obj.length < ship2.length * 1.1 || berth2Obj.length < ship1.length * 1.1) {
    return null;
  }

  // 检查吃水深度上限（15米）
  if (ship1.draft > 15 || ship2.draft > 15) {
    return null;
  }

  // 执行交换
  newAssignments.set(ship1.id, berth2);
  newAssignments.set(ship2.id, berth1);

  // 重新计算目标函数值
  const newSolution: ScheduleSolution = {
    assignments: newAssignments,
    startTimes: newStartTimes,
    objectiveValue: 0,
    efficiency: 0,
    cost: 0
  };

  return newSolution;
}

/**
 * 插入算子：将一艘船插入到另一个时间位置
 */
export function insertOperator(
  solution: ScheduleSolution,
  ship: Ship,
  newStartTime: number,
  berths: Berth[]
): ScheduleSolution | null {
  const newStartTimes = new Map(solution.startTimes);
  newStartTimes.set(ship.id, newStartTime);

  // 检查时间冲突
  const conflicts = detectTimeConflicts(solution.assignments, newStartTimes, [ship], berths);
  if (conflicts.length > 0) return null;

  const newSolution: ScheduleSolution = {
    assignments: solution.assignments,
    startTimes: newStartTimes,
    objectiveValue: 0,
    efficiency: 0,
    cost: 0
  };

  return newSolution;
}

/**
 * 逆序算子：反转一个时间段的船舶顺序
 */
export function reverseOperator(
  solution: ScheduleSolution,
  startTime: number,
  endTime: number,
  ships: Ship[]
): ScheduleSolution | null {
  const newStartTimes = new Map(solution.startTimes);
  const affectedShips = ships.filter(s => {
    const st = newStartTimes.get(s.id) || 0;
    return st >= startTime && st <= endTime;
  });

  if (affectedShips.length < 2) return null;

  // 反转时间顺序
  const times = affectedShips.map(s => newStartTimes.get(s.id) || 0).sort((a, b) => a - b);
  const reversedTimes = [...times].reverse();

  affectedShips.forEach((ship, index) => {
    newStartTimes.set(ship.id, reversedTimes[index]);
  });

  const newSolution: ScheduleSolution = {
    assignments: solution.assignments,
    startTimes: newStartTimes,
    objectiveValue: 0,
    efficiency: 0,
    cost: 0
  };

  return newSolution;
}

/**
 * 检测时间冲突
 */
function detectTimeConflicts(
  assignments: Map<string, string>,
  startTimes: Map<string, number>,
  ships: Ship[],
  berths: Berth[]
): Array<{ ship1: string; ship2: string; berth: string }> {
  const conflicts: Array<{ ship1: string; ship2: string; berth: string }> = [];

  for (let i = 0; i < ships.length; i++) {
    for (let j = i + 1; j < ships.length; j++) {
      const ship1 = ships[i];
      const ship2 = ships[j];

      const berth1 = assignments.get(ship1.id);
      const berth2 = assignments.get(ship2.id);

      if (berth1 && berth2 && berth1 === berth2) {
        const start1 = startTimes.get(ship1.id) || 0;
        const start2 = startTimes.get(ship2.id) || 0;
        const duration1 = 4; // 假设4小时
        const duration2 = 4;

        // 检查时间重叠
        if (!(start1 + duration1 <= start2 || start2 + duration2 <= start1)) {
          conflicts.push({ ship1: ship1.id, ship2: ship2.id, berth: berth1 });
        }
      }
    }
  }

  return conflicts;
}

/**
 * 变邻域搜索主算法
 */
export function variableNeighborhoodSearch(
  initialSolution: ScheduleSolution,
  ships: Ship[],
  berths: Berth[],
  maxIterations: number = 100
): ScheduleSolution {
  let currentSolution = initialSolution;
  let bestSolution = { ...currentSolution };

  for (let iter = 0; iter < maxIterations; iter++) {
    // 邻域1：交换算子
    for (let i = 0; i < ships.length; i++) {
      for (let j = i + 1; j < ships.length; j++) {
        const newSolution = swapOperator(currentSolution, ships[i], ships[j], berths);
        if (newSolution && evaluateSolution(newSolution, ships) > evaluateSolution(currentSolution, ships)) {
          currentSolution = newSolution;
          if (evaluateSolution(currentSolution, ships) > evaluateSolution(bestSolution, ships)) {
            bestSolution = { ...currentSolution };
          }
        }
      }
    }

    // 邻域2：插入算子（随机选择）
    if (Math.random() < 0.3) {
      const randomShip = ships[Math.floor(Math.random() * ships.length)];
      const newStartTime = Math.random() * 20; // 0-20小时
      const newSolution = insertOperator(currentSolution, randomShip, newStartTime, berths);
      if (newSolution && evaluateSolution(newSolution, ships) > evaluateSolution(currentSolution, ships)) {
        currentSolution = newSolution;
      }
    }
  }

  return bestSolution;
}

/**
 * 评估解决方案的目标函数值
 */
function evaluateSolution(solution: ScheduleSolution, ships: Ship[]): number {
  // 简化版目标函数：效率 - 成本
  // 实际应用中应包含更多因素
  let efficiency = 0;
  let cost = 0;

  ships.forEach(ship => {
    const startTime = solution.startTimes.get(ship.id) || 0;
    efficiency += ship.priority * (24 - startTime); // 优先级高的船早开始
    cost += startTime; // 开始时间越晚成本越高
  });

  solution.efficiency = efficiency;
  solution.cost = cost;
  solution.objectiveValue = efficiency - cost * 0.1; // 效率权重更高

  return solution.objectiveValue;
}

// ==================== 8. 多目标优化（帕累托前沿） ====================

/**
 * 帕累托前沿解
 */
export interface ParetoSolution {
  solution: ScheduleSolution;
  efficiency: number;
  cost: number;
  carbonEmission: number;
  isParetoOptimal: boolean;
}

/**
 * 计算帕累托前沿解集
 */
export function calculateParetoFront(
  solutions: ScheduleSolution[],
  ships: Ship[]
): ParetoSolution[] {
  const paretoSolutions: ParetoSolution[] = solutions.map(sol => ({
    solution: sol,
    efficiency: sol.efficiency,
    cost: sol.cost,
    carbonEmission: calculateCarbonEmission(sol, ships),
    isParetoOptimal: false
  }));

  // 检查每个解是否是帕累托最优
  for (let i = 0; i < paretoSolutions.length; i++) {
    let isDominated = false;

    for (let j = 0; j < paretoSolutions.length; j++) {
      if (i === j) continue;

      // 检查是否被j支配
      if (
        paretoSolutions[j].efficiency >= paretoSolutions[i].efficiency &&
        paretoSolutions[j].cost <= paretoSolutions[i].cost &&
        paretoSolutions[j].carbonEmission <= paretoSolutions[i].carbonEmission &&
        (paretoSolutions[j].efficiency > paretoSolutions[i].efficiency ||
         paretoSolutions[j].cost < paretoSolutions[i].cost ||
         paretoSolutions[j].carbonEmission < paretoSolutions[i].carbonEmission)
      ) {
        isDominated = true;
        break;
      }
    }

    paretoSolutions[i].isParetoOptimal = !isDominated;
  }

  return paretoSolutions.filter(s => s.isParetoOptimal);
}

/**
 * 计算碳排放
 */
function calculateCarbonEmission(solution: ScheduleSolution, ships: Ship[]): number {
  let totalEmission = 0;

  ships.forEach(ship => {
    const vspSavings = ship.vspSavings || 0;
    // 每吨燃油产生3吨碳排放
    totalEmission += (vspSavings * 3);
  });

  return totalEmission;
}

