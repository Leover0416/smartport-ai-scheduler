import React from 'react';
import { Ship } from '../types';

interface BottomVisProps {
  ships: Ship[];
}

const BottomVis: React.FC<BottomVisProps> = ({ ships }) => {
  const timeSlots = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'];

  // 计算航道密度 - 根据实际船舶的gantt数据
  const calculateChannelDensity = () => {
    const shipsWithGantt = ships.filter(s => s.gantt);
    if (shipsWithGantt.length === 0) {
      // 如果没有gantt数据，返回默认值
      return {
        row1: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        row2: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      };
    }

    // 将时间轴分成10个时段
    const densityRow1 = new Array(10).fill(0);
    const densityRow2 = new Array(10).fill(0);

    shipsWithGantt.forEach(ship => {
      if (!ship.gantt) return;
      const startSlot = Math.floor((ship.gantt.startTime / 20) * 10);
      const endSlot = Math.floor(((ship.gantt.startTime + ship.gantt.duration) / 20) * 10);
      const slot = ship.gantt.channelSlot === 'Deep' ? 0 : 1; // Deep用第一行，Feeder用第二行
      
      for (let i = Math.max(0, startSlot); i < Math.min(10, endSlot + 1); i++) {
        if (slot === 0) {
          densityRow1[i] = Math.min(3, densityRow1[i] + 1); // 最大密度为3
        } else {
          densityRow2[i] = Math.min(3, densityRow2[i] + 1);
        }
      }
    });

    return {
      row1: densityRow1,
      row2: densityRow2
    };
  };

  const channelDensity = calculateChannelDensity();

  return (
    <div className="flex flex-col gap-2 h-full">
      
      {/* 1. Gantt Chart */}
      <div className="bg-gradient-to-br from-slate-900/95 to-slate-800/95 border border-slate-700/50 rounded-xl p-2.5 flex flex-col flex-1 shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-sm">
        <h4 className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider flex justify-between shrink-0">
            调度甘特图 (Gantt)
            <span className="text-emerald-500 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span></span>
        </h4>
        <div className="flex-1 relative mt-1 min-h-0 flex flex-col">
            <div className="flex justify-between border-b border-slate-700 pb-1 mb-1 shrink-0">
                {timeSlots.map(t => <span key={t} className="text-xs text-slate-600 font-mono">{t}</span>)}
            </div>
            
            <div className="space-y-1 overflow-y-auto custom-scrollbar flex-1 pr-1">
                {ships.filter(s => s.gantt).map(s => {
                    if (!s.gantt) return null;
                    const leftPct = (s.gantt.startTime / 20) * 100; // Simplified scale
                    const widthPct = (s.gantt.duration / 20) * 100;
                    
                    return (
                        <div key={s.id} className="relative h-4 bg-slate-800/50 rounded-sm flex items-center group">
                            <span className="absolute left-1 text-xs text-slate-500 font-mono w-6">{s.id}</span>
                            <div 
                                className="absolute h-2.5 rounded-[1px] shadow-sm flex items-center justify-center overflow-hidden transition-all duration-1000 border border-white/10 group-hover:border-white/40"
                                style={{ 
                                    left: `${leftPct}%`, 
                                    width: `${widthPct}%`,
                                    backgroundColor: s.color,
                                    opacity: 0.9
                                }}
                            >
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      </div>

      {/* 2. Channel Density (Small Compact) */}
      <div className="bg-gradient-to-br from-slate-900/95 to-slate-800/95 border border-slate-700/50 rounded-xl p-2.5 shrink-0 h-[60px] shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-slate-500 font-bold uppercase">航道密度</span>
            <div className="flex gap-1">
                 <div className="w-1.5 h-1.5 bg-blue-900/50 rounded"></div>
                 <div className="w-1.5 h-1.5 bg-amber-500 rounded"></div>
                 <div className="w-1.5 h-1.5 bg-red-500 rounded"></div>
            </div>
        </div>
        <div className="flex flex-col gap-1">
             <div className="flex gap-0.5 h-2 w-full">
                 {channelDensity.row1.map((density, i) => (
                     <div key={i} className={`flex-1 rounded-[1px] ${
                         density === 0 ? 'bg-blue-900/40' : 
                         density === 1 ? 'bg-blue-500/60' : 
                         density === 2 ? 'bg-amber-500' : 
                         'bg-red-500'
                     }`}></div>
                 ))}
             </div>
             <div className="flex gap-0.5 h-2 w-full">
                 {channelDensity.row2.map((density, i) => (
                     <div key={i} className={`flex-1 rounded-[1px] ${
                         density === 0 ? 'bg-blue-900/40' : 
                         density === 1 ? 'bg-blue-500/60' : 
                         density === 2 ? 'bg-amber-500' : 
                         'bg-red-500'
                     }`}></div>
                 ))}
             </div>
        </div>
      </div>

    </div>
  );
};

export default BottomVis;