import React, { useRef, useEffect } from 'react';
import { AgentMessage, AgentType } from '../types';
import { Bot, Ship, Anchor, BrainCircuit, Activity, MoreHorizontal, User } from 'lucide-react';

interface AgentOrchestratorProps {
  messages: AgentMessage[];
  activeAgents: AgentType[];
  isThinking?: boolean;
  isSimulating?: boolean; // 是否正在模拟中
}

interface AgentCardProps {
  type: AgentType;
  isActive: boolean;
  isSender: boolean;
  isReceiver: boolean;
  isThinking: boolean;
  icon: React.ReactNode;
  label: string;
  isSimulating: boolean; // 是否正在模拟中
}

const AgentCard: React.FC<AgentCardProps> = ({ type, isActive, isSender, isReceiver, isThinking, icon, label, isSimulating }) => {
  // Dark Tech Theme Styles
  let containerClasses = "bg-slate-800/40 border-slate-700 text-slate-500 opacity-60 scale-90";
  let iconClasses = "text-slate-600";
  
  if (isActive) {
      containerClasses = "bg-slate-800 border-blue-500/30 opacity-100 text-blue-400 shadow-[0_0_5px_rgba(59,130,246,0.1)] scale-100";
      iconClasses = "text-blue-500";
  }
  
  if (isActive && isThinking && isSender) {
      containerClasses = "bg-amber-900/20 border-amber-500/50 text-amber-400 animate-pulse scale-105";
      iconClasses = "text-amber-500 animate-bounce";
  }
  
  if (isSender && !isThinking) {
      // 如果模拟已完成，不显示闪烁效果
      if (isSimulating) {
      containerClasses = "bg-blue-600 text-white border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.4)] z-10 scale-105 ring-1 ring-white/50";
      } else {
          // 已完成状态，使用静态样式，不闪烁
          containerClasses = "bg-emerald-600/80 text-white border-emerald-400/50 shadow-[0_0_10px_rgba(16,185,129,0.3)] z-10 scale-100 ring-1 ring-emerald-500/30";
      }
      iconClasses = "text-white";
  }

  if (isReceiver && !isSender) {
     containerClasses = "bg-emerald-900/30 border-emerald-500/50 text-emerald-400 opacity-100 scale-100";
     iconClasses = "text-emerald-500";
  }

  return (
    <div className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border transition-all duration-300 relative ${containerClasses}`}>
      
      {isSender && !isThinking && isSimulating && (
        <span className="absolute -inset-1 flex rounded-lg pointer-events-none">
           <span className="animate-ping absolute inline-flex h-full w-full rounded-lg bg-blue-400 opacity-20"></span>
        </span>
      )}
      
      {isActive && isThinking && isSender && (
         <div className="absolute -top-2 -right-1 bg-amber-500 text-black text-[8px] px-1 rounded-full animate-bounce">
            ...
         </div>
      )}

      <div className={`${iconClasses} mb-1 transition-colors duration-300`}>
        {icon}
      </div>
      <span className="text-xs font-bold text-center leading-tight tracking-wider">
        {label}
      </span>
    </div>
  );
};

const AgentOrchestrator: React.FC<AgentOrchestratorProps> = ({ messages, activeAgents, isThinking = false, isSimulating = false }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  const latestMsg = messages.length > 0 ? messages[messages.length - 1] : null;
  const currentActor = activeAgents.length > 0 ? activeAgents[0] : null;

  const renderAgent = (type: AgentType, icon: React.ReactNode, label: string) => {
    const isActive = activeAgents.includes(type);
    let isSender = false;
    if (isThinking) {
        isSender = type === currentActor;
    } else {
        isSender = latestMsg?.from === type;
    }

    let isReceiver = false;
    if (!isThinking && latestMsg) {
        if (latestMsg.to === type) {
            isReceiver = true;
        } else if (latestMsg.to === 'ALL' && isActive && !isSender) {
            isReceiver = true;
        }
    }

    return (
        <AgentCard 
            key={type}
            type={type} 
            isActive={isActive} 
            isSender={isSender}
            isReceiver={isReceiver}
            isThinking={isThinking}
            icon={icon} 
            label={label} 
            isSimulating={isSimulating}
        />
    );
  };

  // Agent Name Mapping for Display
  const agentNames = {
      [AgentType.SHIP]: "船舶智能体",
      [AgentType.RESOURCE]: "资源智能体",
      [AgentType.SCHEDULER]: "调度智能体",
      [AgentType.OPTIMIZER]: "优化智能体",
      [AgentType.COORDINATOR]: "协调智能体"
  };

  const getAgentDisplayName = (typeString: string) => {
     // Handle fallback
     if (typeString === AgentType.SHIP) return "船舶智能体";
     if (typeString === AgentType.RESOURCE) return "资源智能体";
     if (typeString === AgentType.SCHEDULER) return "调度智能体";
     if (typeString === AgentType.OPTIMIZER) return "优化智能体";
     if (typeString === AgentType.COORDINATOR) return "协调智能体";
     return typeString.split('_')[0];
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-900/95 to-slate-800/95 rounded-xl border border-slate-700/50 shadow-[0_8px_32px_rgba(0,0,0,0.3)] overflow-hidden backdrop-blur-sm">
      {/* Header */}
      <div className="p-2.5 border-b border-slate-700/50 bg-gradient-to-r from-slate-800/90 to-slate-700/70 flex justify-between items-center shrink-0 backdrop-blur-sm">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <BrainCircuit size={16} className="text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]" /> 多智能体协同中心 (MAS Core)
        </h3>
        <div className="flex gap-1.5 items-center bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-700/50 backdrop-blur-sm shadow-sm">
             <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
             <span className="text-xs text-slate-300 font-mono font-semibold">ONLINE</span>
        </div>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-5 gap-1.5 p-2.5 bg-slate-900/40 border-b border-slate-800/50 shrink-0 backdrop-blur-sm">
        {renderAgent(AgentType.SHIP, <Ship size={16} />, "船舶智能体")}
        {renderAgent(AgentType.RESOURCE, <Anchor size={16} />, "资源智能体")}
        {renderAgent(AgentType.SCHEDULER, <Activity size={16} />, "调度智能体")}
        {renderAgent(AgentType.OPTIMIZER, <BrainCircuit size={16} />, "优化智能体")}
        {renderAgent(AgentType.COORDINATOR, <Bot size={16} />, "协调智能体")}
      </div>

      {/* Scrollable Log Area - FIXED HEIGHT in Parent, overflow-y-auto here */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 font-mono bg-gradient-to-b from-[#0b1120] to-[#020617] min-h-0 custom-scrollbar">
        {messages.length === 0 && !isThinking && (
            <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-1 opacity-50">
                <span className="italic text-sm">系统就绪，请选择船舶启动调度...</span>
            </div>
        )}
        
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.from === AgentType.SHIP || msg.from === AgentType.RESOURCE ? 'items-start' : 'items-end'} animate-in slide-in-from-bottom-2 fade-in duration-300`}>
             <div className="flex items-center gap-2 mb-0.5 px-1 opacity-70">
                <span className="text-xs font-bold text-slate-400">{getAgentDisplayName(msg.from)}</span>
                <span className="text-xs text-slate-600">{msg.timestamp}</span>
             </div>
             <div className={`px-3 py-1.5 rounded-lg w-[95%] text-sm leading-relaxed border shadow-lg whitespace-pre-line backdrop-blur-sm
                ${msg.type === 'negotiation' ? 'bg-gradient-to-br from-blue-900/30 to-cyan-900/20 border-blue-800/50 text-blue-200 shadow-[0_4px_12px_rgba(59,130,246,0.2)]' : 
                  msg.type === 'warning' ? 'bg-gradient-to-br from-amber-900/30 to-orange-900/20 border-amber-800/50 text-amber-200 shadow-[0_4px_12px_rgba(245,158,11,0.2)]' :
                  msg.type === 'success' ? 'bg-gradient-to-br from-emerald-900/30 to-teal-900/20 border-emerald-800/50 text-emerald-200 shadow-[0_4px_12px_rgba(16,185,129,0.2)]' :
                  'bg-gradient-to-br from-slate-800/60 to-slate-700/40 border-slate-700/50 text-slate-300'}`}>
                {msg.content}
             </div>
          </div>
        ))}

        {/* Thinking Indicator */}
        {isThinking && (
            <div className="flex items-center gap-2 px-2 opacity-50 pt-2">
                <div className="bg-slate-800 p-2 rounded-lg rounded-tl-none border border-slate-700">
                    <MoreHorizontal size={12} className="text-slate-400 animate-pulse" />
                </div>
                <span className="text-xs text-slate-500 italic">智能体计算中...</span>
            </div>
        )}
      </div>
    </div>
  );
};

export default AgentOrchestrator;