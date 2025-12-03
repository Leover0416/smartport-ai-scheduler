import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TidePoint } from '../types';
import { Wind, Droplets, Clock } from 'lucide-react';

interface DashboardProps {
  tideData: TidePoint[];
  efficiency: number;
  carbonSaved: number;
}

const Dashboard: React.FC<DashboardProps> = ({ tideData, efficiency, carbonSaved }) => {
  return (
    <div className="flex flex-col gap-2 h-full text-slate-300 bg-gradient-to-br from-slate-900/95 to-slate-800/95 border border-slate-700/50 rounded-xl p-3 shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-sm">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5 flex items-center gap-2">
            <Clock size={14} /> 环境监控 & KPI
        </h4>

        {/* Environment Status */}
        <div className="grid grid-cols-3 gap-2">
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-700/60 border border-slate-700/50 p-1.5 rounded-lg flex flex-col items-center backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
                <Wind size={14} className="text-blue-400 mb-0.5 drop-shadow-[0_0_6px_rgba(59,130,246,0.5)]" />
                <span className="text-xs text-slate-400">风速</span>
                <span className="text-sm font-bold text-slate-200 font-mono">4.2</span>
            </div>
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-700/60 border border-slate-700/50 p-1.5 rounded-lg flex flex-col items-center backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
                <Droplets size={14} className="text-cyan-400 mb-0.5 drop-shadow-[0_0_6px_rgba(6,182,212,0.5)]" />
                <span className="text-xs text-slate-400">能见度</span>
                <span className="text-sm font-bold text-slate-200 font-mono">12km</span>
            </div>
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-700/60 border border-slate-700/50 p-1.5 rounded-lg flex flex-col items-center backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
                <div className="text-sm font-bold text-emerald-400 font-mono drop-shadow-[0_0_6px_rgba(16,185,129,0.5)]">OPEN</div>
                <span className="text-xs text-slate-400">潮汐窗</span>
            </div>
        </div>

      {/* Tide Chart (Small) */}
      <div className="h-[60px] border border-slate-800/50 rounded-lg bg-slate-900/40 p-1 backdrop-blur-sm">
        <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={tideData}>
            <defs>
            <linearGradient id="colorHeightDark" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
            </linearGradient>
            </defs>
            <YAxis hide domain={[0, 6]} />
            <Area type="monotone" dataKey="height" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#colorHeightDark)" />
        </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* KPI Stats */}
      <div className="space-y-2 pt-1 border-t border-slate-800/50">
            <div>
                <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-400 font-medium">资源利用率</span>
                    <span className="text-emerald-400 font-mono font-bold drop-shadow-[0_0_6px_rgba(16,185,129,0.5)]">{efficiency}%</span>
                </div>
                <div className="w-full bg-slate-800/60 rounded-full h-1.5 overflow-hidden border border-slate-700/30 shadow-inner">
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-1.5 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.6)] transition-all duration-500" style={{ width: `${efficiency}%` }}></div>
                </div>
            </div>

            <div>
                <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-400 font-medium">减碳量 (Tons)</span>
                    <span className="text-blue-400 font-mono font-bold drop-shadow-[0_0_6px_rgba(59,130,246,0.5)]">{carbonSaved}</span>
                </div>
                <div className="w-full bg-slate-800/60 rounded-full h-1.5 overflow-hidden border border-slate-700/30 shadow-inner">
                    <div className="bg-gradient-to-r from-blue-500 to-cyan-500 h-1.5 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)] transition-all duration-500" style={{ width: `${(carbonSaved / 50) * 100}%` }}></div>
                </div>
            </div>
      </div>
    </div>
  );
};

export default Dashboard;