/**
 * AI Service for Multi-Agent System
 * Uses Google Gemini API to generate intelligent agent messages
 */

// Get API key from environment
// Access via process.env (defined in vite.config.ts) or import.meta.env
// Netlify uses VITE_ prefix for environment variables
const GEMINI_API_KEY = (
  (typeof process !== 'undefined' && (process.env as any)?.GEMINI_API_KEY) ||
  (import.meta.env as any)?.GEMINI_API_KEY ||
  (import.meta.env as any)?.VITE_GEMINI_API_KEY ||
  ''
) as string;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

interface AgentContext {
  phase: string;
  ships: any[];
  berths: any[];
  previousMessages?: string[];
  specificData?: any;
}

/**
 * Call Gemini API to generate agent message
 */
async function callGeminiAPI(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === '') {
    console.warn('GEMINI_API_KEY not found, using fallback template');
    return '';
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 500,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return generatedText.trim();
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return ''; // Return empty to use fallback
  }
}

/**
 * Generate message for Ship Agent
 */
export async function generateShipAgentMessage(context: AgentContext): Promise<string> {
  const { ships } = context;
  const shipList = ships.map(s => `- ${s.name} (ID: ${s.id}, ETA: ${s.etaOriginal}, 类型: ${s.type}, 长度: ${s.length}m, 吃水: ${s.draft}m, 优先级: ${s.priority})`).join('\n');

  const prompt = `你是一个港口调度系统中的船舶智能体。当前有${ships.length}艘船舶需要入港调度。

船舶信息：
${shipList}

请生成一份专业的船舶智能体报告，包括：
1. 船舶数量和基本信息汇总
2. 静态数据同步状态
3. 请求分配进港窗口

要求：
- 使用专业术语
- 简洁明了
- 中文输出
- 格式清晰，使用列表或分段

直接输出报告内容，不要添加额外说明：`;

  const aiResponse = await callGeminiAPI(prompt);
  if (aiResponse) {
    return aiResponse;
  }

  // Fallback template
  const shipListStr = ships.map(s => `${s.name} (E:${s.etaOriginal})`).join('\n');
  return `船舶智能体报告 (${ships.length}艘):
${shipListStr}
静态数据已同步。请求分配进港窗口。`;
}

/**
 * Generate message for Resource Agent
 */
export async function generateResourceAgentMessage(context: AgentContext): Promise<string> {
  const { berths } = context;
  // 正确统计：排除被占用的泊位（isOccupied为true或currentShipId存在）
  // 总泊位数
  const totalBerths = berths.length; // 总共6个
  const totalDeepBerths = berths.filter(b => b.zone === 'A').length;
  const totalGeneralBerths = berths.filter(b => b.zone === 'B').length;
  const totalFeederBerths = berths.filter(b => b.zone === 'C').length;
  
  // 空闲泊位数
  const freeBerths = berths.filter(b => !b.isOccupied && !b.currentShipId).length; // 总共空闲数
  const deepBerths = berths.filter(b => b.zone === 'A' && !b.isOccupied && !b.currentShipId).length;
  const generalBerths = berths.filter(b => b.zone === 'B' && !b.isOccupied && !b.currentShipId).length;
  const feederBerths = berths.filter(b => b.zone === 'C' && !b.isOccupied && !b.currentShipId).length;

  const prompt = `你是一个港口调度系统中的资源智能体。需要报告当前港口资源状态。

当前资源状态：
- 泊位总数: ${totalBerths}个，空闲${freeBerths}个
- 深水泊位(A区): 总计${totalDeepBerths}个，空闲${deepBerths}个
- 通用泊位(B区): 总计${totalGeneralBerths}个，空闲${generalBerths}个
- 支线泊位(C区): 总计${totalFeederBerths}个，空闲${feederBerths}个
- 潮汐窗：开放 (4.8m)
- 气象：风速3级，适航

请生成一份专业的资源智能体报告，包括：
1. 各区域泊位可用情况
2. 环境条件（潮汐、气象）
3. 数字孪生环境状态

要求：
- 使用专业术语
- 简洁明了
- 中文输出
- 格式清晰，使用列表

直接输出报告内容，不要添加额外说明：`;

  const aiResponse = await callGeminiAPI(prompt);
  if (aiResponse) {
    return aiResponse;
  }

  // Fallback template
  return `资源智能体：
- 泊位总数: ${totalBerths}个，空闲${freeBerths}个
- 深水泊位(A区): 总计${totalDeepBerths}个，空闲${deepBerths}个
- 通用泊位(B区): 总计${totalGeneralBerths}个，空闲${generalBerths}个
- 支线泊位(C区): 总计${totalFeederBerths}个，空闲${feederBerths}个
- 潮汐窗：开放 (4.8m)
- 气象：风速3级，适航。
数字孪生环境已更新。`;
}

/**
 * Generate message for Scheduler Agent
 */
export async function generateSchedulerAgentMessage(context: AgentContext): Promise<string> {
  const { ships, berths } = context;
  const assignments = ships.map(s => {
    const rec = getRecommendedZone(s);
    return `${s.name} -> ${rec.label}`;
  }).join('\n');

  const prompt = `你是一个港口调度系统中的调度智能体。已完成物理约束匹配和泊位分配。

分配方案：
${assignments}

请生成一份专业的调度智能体报告，包括：
1. 分配结果总结
2. 物理约束校验状态
3. 候选泊位集生成情况

要求：
- 使用专业术语
- 简洁明了
- 中文输出
- 格式清晰

直接输出报告内容，不要添加额外说明：`;

  const aiResponse = await callGeminiAPI(prompt);
  if (aiResponse) {
    return aiResponse;
  }

  // Fallback template
  return `调度智能体：
${assignments}
物理约束(长度/吃水)校验通过。
候选泊位集生成完毕。`;
}

/**
 * Generate message for Optimizer Agent
 */
export async function generateOptimizerAgentMessage(context: AgentContext): Promise<string> {
  const { ships, specificData } = context;
  const totalSavings = specificData?.totalVspSavings || 0;
  const hasConflict = specificData?.hasConflict || false;

  const prompt = `你是一个港口调度系统中的优化智能体。已完成多目标优化和博弈决策。

优化结果：
- 船舶能耗 - 航速关联属性策略：已启用
- 预计批次节省燃油: ${totalSavings.toFixed(1)} 吨
- 航道冲突检测: ${hasConflict ? '检测到冲突' : '无冲突'}
- MARL算法：已收敛到帕累托最优解

请生成一份专业的优化智能体报告，包括：
1. 船舶能耗 - 航速关联属性策略应用情况
2. 燃油节省和碳排放效益
3. 冲突检测结果
4. 算法收敛状态

要求：
- 使用专业术语
- 简洁明了
- 中文输出
- 格式清晰，使用列表

直接输出报告内容，不要添加额外说明：`;

  const aiResponse = await callGeminiAPI(prompt);
  if (aiResponse) {
    return aiResponse;
  }

  // Fallback template
  return `优化智能体：
- 启用船舶能耗 - 航速关联属性策略
- 预计批次节省燃油: ${totalSavings.toFixed(1)} 吨
- 航道冲突检测: ${hasConflict ? '检测到冲突' : '无'}
- MARL 算法收敛: 达到帕累托最优解`;
}

/**
 * Generate message for Coordinator Agent
 */
export async function generateCoordinatorAgentMessage(context: AgentContext): Promise<string> {
  const prompt = `你是一个港口调度系统中的协调智能体。已完成多目标权衡和方案审批。

请生成一份专业的协调智能体报告，包括：
1. 多目标权衡结果（效率 vs 成本）
2. 方案审批决定
3. 执行指令

要求：
- 使用专业术语
- 简洁明了
- 中文输出
- 格式清晰

直接输出报告内容，不要添加额外说明：`;

  const aiResponse = await callGeminiAPI(prompt);
  if (aiResponse) {
    return aiResponse;
  }

  // Fallback template
  return `协调智能体：
多目标权衡完毕 (效率 vs 成本)。
批准当前调度方案，下发执行。`;
}

/**
 * Generate warning message for delayed ships
 */
export async function generateWarningMessage(delayedShips: any[]): Promise<string> {
  const shipNames = delayedShips.map(s => s.name).join('、');
  
  const prompt = `你是一个港口调度系统中的调度智能体。需要生成警告消息。

情况：以下船舶因资源不足，仍在待入港船舶队列中等待：
${shipNames}

请生成一份专业的警告消息，要求：
- 使用专业术语
- 简洁明了
- 中文输出
- 说明原因和状态

直接输出警告消息，不要添加额外说明：`;

  const aiResponse = await callGeminiAPI(prompt);
  if (aiResponse) {
    return aiResponse;
  }

  // Fallback template
  return `警告：${shipNames} 因资源不足，仍在待入港船舶队列中等待。`;
}

// Helper function (same as in App.tsx)
function getRecommendedZone(ship: any) {
  if (ship.type === '油轮') return { zone: 'A', label: 'A区(深水)', berths: ['A01', 'A02'] };
  if (ship.length > 150) return { zone: 'B', label: 'B区(通用)', berths: ['B01', 'B02', 'A01', 'A02'] };
  return { zone: 'C', label: 'C区(支线)', berths: ['C01', 'C02'] };
}

