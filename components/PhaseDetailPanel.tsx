import React from 'react';
import { Ship, SimulationPhase } from '../types';
import { Activity, ShieldCheck, Zap, TrendingUp, AlertTriangle, Search } from 'lucide-react';

interface PhaseDetailPanelProps {
  phase: SimulationPhase;
  ships: Ship[];
  processingIds?: string[];
  totalVspSavings?: number; // 总船舶能耗 - 航速关联属性节省
  carbonSaved?: number; // 减碳量
  hasConflict?: boolean; // 是否有冲突
  optimizationIterations?: number; // 优化迭代次数
  optimizationReward?: number; // 优化奖励值
}

const PhaseDetailPanel: React.FC<PhaseDetailPanelProps> = ({ 
  phase, 
  ships, 
  processingIds = [],
  totalVspSavings = 0,
  carbonSaved = 0,
  hasConflict = false,
  optimizationIterations = 0,
  optimizationReward = 0
}) => {

  const ContainerClass = "h-full bg-gradient-to-br from-slate-900/95 to-slate-800/95 border border-slate-700/50 rounded-xl p-3 shadow-[0_8px_32px_rgba(0,0,0,0.3)] flex flex-col gap-3 overflow-hidden backdrop-blur-sm";

  // Filter helper: If we are simulating (processingIds has content), show those. 
  // Otherwise show waiting ships for preview.
  const displayShips = processingIds.length > 0 
      ? ships.filter(s => processingIds.includes(s.id))
      : ships.filter(s => s.status === 'waiting');

  // --- 1. Perception Phase View ---
  if (phase === SimulationPhase.PERCEPTION) {
    return (
      <div className={ContainerClass}>
        <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2 border-b border-slate-800 pb-2 shrink-0">
            <Activity size={16} /> 智能感知 & ETA修正
        </h3>
        
        {/* ETA Table */}
        <div className="bg-slate-800/50 rounded border border-slate-700 overflow-hidden shrink-0">
            <table className="w-full text-xs text-left">
                <thead className="bg-slate-800 text-slate-400">
                    <tr>
                        <th className="py-1.5 pl-2">船名</th>
                        <th className="py-1.5">申报</th>
                        <th className="py-1.5">修正</th>
                        <th className="py-1.5">状态</th>
                    </tr>
                </thead>
                <tbody className="font-mono text-slate-300">
                    {displayShips.map(s => (
                        <tr key={s.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                            <td className="py-1.5 pl-2 font-bold text-slate-200 truncate max-w-[80px]">{s.name}</td>
                            <td className="text-slate-500">{s.etaOriginal}</td>
                            <td className="text-cyan-400 font-bold">{s.etaCorrected || '-'}</td>
                            <td>
                                {s.isDelayed ? 
                                    <span className="bg-red-900/50 text-red-400 px-1.5 py-0.5 rounded text-xs border border-red-800">延误</span> : 
                                    <span className="text-emerald-500">正常</span>
                                }
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {/* 船舶能耗 - 航速关联属性 Dashboard */}
        <div className="flex-1 flex flex-col min-h-0">
            <h4 className="text-xs font-bold text-emerald-500 mb-2 uppercase flex justify-between border-b border-slate-800 pb-1 shrink-0">
                船舶能耗 - 航速关联属性
                <Zap size={14} />
            </h4>
            <div className="space-y-2 overflow-y-auto custom-scrollbar flex-1 pr-1">
                {displayShips.filter(s => s.virtualArrivalMode).map(s => (
                    <div key={s.id} className="bg-emerald-900/20 border border-emerald-500/30 p-2 rounded">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-emerald-400 font-bold text-sm">{s.name.split(' ')[0]}</span>
                            <span className="text-emerald-300 font-mono text-xs font-bold">-{s.vspSavings}T 燃油</span>
                        </div>
                        <div className="flex gap-2 text-xs text-slate-400">
                            <span>建议航速: <span className="text-slate-200 font-bold font-mono">{s.recommendedSpeed} kn</span></span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    );
  }

  // --- 2. Matching Phase View ---
  if (phase === SimulationPhase.MATCHING) {
    return (
      <div className={ContainerClass}>
        <h3 className="text-sm font-bold text-amber-500 flex items-center gap-2 border-b border-slate-800 pb-2 shrink-0">
            <ShieldCheck size={16} /> 物理约束校验矩阵
        </h3>

        {/* Scrollable Constraint List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2 min-h-0">
            {displayShips.map(s => (
                <div key={s.id} className="bg-slate-800/50 rounded border border-slate-700 p-2.5">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-bold text-slate-300">{s.name.split(' ')[0]}</span>
                        <span className="text-xs bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded border border-slate-600">{s.type}</span>
                    </div>
                    
                    {/* Constraints Grid */}
                    <div className="grid grid-cols-4 gap-1.5 mb-2">
                        <div className={`text-center py-1 rounded text-xs border ${s.constraints?.length ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800' : 'bg-red-900/30 text-red-400 border-red-800'}`}>长度</div>
                        <div className={`text-center py-1 rounded text-xs border ${s.constraints?.draftTide ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800' : 'bg-red-900/30 text-red-400 border-red-800'}`}>潮汐</div>
                        <div className={`text-center py-1 rounded text-xs border ${s.constraints?.channel ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800' : 'bg-red-900/30 text-red-400 border-red-800'}`}>航道</div>
                        <div className={`text-center py-1 rounded text-xs border ${s.constraints?.special !== false ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800' : 'bg-slate-800 border-slate-700 text-slate-600'}`}>
                           {s.type === '油轮' ? '特种' : '-'}
                        </div>
                    </div>

                    {/* Candidate Set */}
                    <div className="text-xs flex gap-1 items-center bg-slate-900 border border-slate-800 p-1.5 rounded">
                        <span className="text-slate-500">候选:</span>
                        {s.candidateBerths && s.candidateBerths.length > 0 ? (
                            s.candidateBerths.map(b => (
                                <span key={b} className="text-cyan-400 font-bold font-mono px-1.5 py-0.5 bg-cyan-900/30 rounded border border-cyan-900">{b}</span>
                            ))
                        ) : (
                            <span className="text-slate-600 italic">校验中...</span>
                        )}
                    </div>
                </div>
            ))}
        </div>
      </div>
    );
  }

  // --- 3. Optimization/Execution View ---
  return (
    <div className={ContainerClass}>
      <h3 className="text-sm font-bold text-purple-400 flex items-center gap-2 border-b border-slate-800 pb-2 shrink-0">
          <TrendingUp size={16} /> 优化博弈与决策日志
      </h3>
      
      <div className="flex-1 bg-black/20 border border-slate-800 rounded p-2 overflow-y-auto custom-scrollbar font-mono text-xs text-slate-400">
          {(phase === SimulationPhase.OPTIMIZATION || phase === SimulationPhase.EXECUTION) ? (
            <div className="grid grid-cols-2 gap-2">
                {/* 左列 */}
                <div className="space-y-2">
                    <div className="border-l-2 border-slate-600 pl-2.5 py-1.5">
                        <div className="text-slate-500 mb-0.5 text-xs">Step 1: 初始解生成</div>
                        <div className="text-slate-300 text-xs">规则启发式方案... 生成基准泊位分配</div>
                        <div className="text-xs text-slate-500 mt-0.5">目标函数值: {processingIds.length > 0 ? (0.75 + Math.random() * 0.15).toFixed(2) : '0.82'}</div>
                </div>

                    <div className="border-l-2 border-emerald-500 pl-2.5 py-1.5 bg-emerald-900/10 rounded-r-sm">
                        <div className="text-emerald-400 font-bold mb-0.5 text-xs">Step 2: 绿色调度 (船舶能耗 - 航速关联属性)</div>
                        <div className="text-slate-300 text-xs">应用 "虚拟到港" 策略</div>
                        <div className="space-y-0.5 mt-1 bg-black/20 p-1.5 rounded">
                             <div className="text-xs">总燃油节省: <span className="text-emerald-400">{totalVspSavings > 0 ? totalVspSavings.toFixed(1) : '4.2'} T</span></div>
                             <div className="text-xs">碳排放减少: <span className="text-emerald-400">{carbonSaved > 0 ? carbonSaved.toFixed(1) : '12.5'} T</span></div>
                </div>
                    </div>

                    {phase === SimulationPhase.EXECUTION && (
                        <div className="border-l-2 border-blue-500 pl-2.5 py-1.5">
                            <div className="text-blue-400 font-bold text-xs">Step 4: 执行指令</div>
                            <div className="text-slate-300 text-xs">向引航站发送作业计划</div>
                            <div className="text-slate-300 text-xs">锁定相关泊位资源</div>
                            <div className="text-emerald-400 text-xs mt-0.5">Status: EXEC_IN_PROGRESS</div>
                        </div>
                    )}
                </div>

                {/* 右列 */}
                <div className="space-y-2">
                    {hasConflict && (
                        <div className="border-l-2 border-amber-500 pl-2.5 py-1.5 bg-amber-900/10 rounded-r-sm">
                            <div className="text-amber-500 font-bold mb-0.5 text-xs flex items-center gap-1"><AlertTriangle size={12}/> 冲突检测</div>
                            <div className="text-slate-300 text-xs">检测到航道会遇冲突</div>
                            <div className="text-slate-500 mt-0.5 text-xs">{'>>'} 触发多智能体协商</div>
                        </div>
                    )}

                    <div className="border-l-2 border-purple-500 pl-2.5 py-1.5 bg-purple-900/10 rounded-r-sm">
                        <div className="text-purple-400 font-bold mb-0.5 text-xs">Step 3: 全局迭代 (MARL)</div>
                        <div className="flex justify-between text-xs text-slate-500 mb-0.5">
                            <span>Reward: {optimizationReward > 0 ? `+${optimizationReward.toFixed(1)}` : '+18.4'}</span>
                            <span>Iter: {optimizationIterations > 0 ? optimizationIterations : 128}</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded overflow-hidden">
                            <div className="bg-purple-500 h-full animate-pulse" style={{ width: optimizationIterations > 0 ? `${Math.min(95, (optimizationIterations / 150) * 100)}%` : '95%' }}></div>
                    </div>
                        <div className="text-blue-400 mt-0.5 font-bold text-xs">{'>>'} 全局最优解已确认</div>
                    </div>
                </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full opacity-30 gap-2">
                <Search size={24} />
                <span>等待进入优化阶段...</span>
            </div>
          )}
      </div>
    </div>
  );
};

export default PhaseDetailPanel;