<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 智能港口调度系统 (Smart Port AI Scheduler)

一个基于多智能体系统的港口船舶调度可视化系统，使用 React + TypeScript + Vite 构建。

## 本地运行

**前置要求：** Node.js 18+

1. 安装依赖：
   ```bash
   npm install
   ```

2. 配置环境变量：
   创建 `.env.local` 文件，添加你的 Gemini API Key：
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. 启动开发服务器：
   ```bash
   npm run dev
   ```

4. 在浏览器中打开：http://localhost:3000

## 部署到 Netlify

### 方法一：通过 Netlify Dashboard（推荐）

1. **准备代码**
   - 确保代码已推送到 GitHub/GitLab/Bitbucket

2. **登录 Netlify**
   - 访问 https://app.netlify.com
   - 使用 GitHub/GitLab/Bitbucket 账号登录

3. **创建新站点**
   - 点击 "Add new site" → "Import an existing project"
   - 选择你的代码仓库

4. **配置构建设置**
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Node version:** 18（在 Environment variables 中设置）

5. **配置环境变量**
   - 在 "Site settings" → "Environment variables" 中添加：
     - Key: `GEMINI_API_KEY`
     - Value: 你的 Gemini API Key
   - 点击 "Save"

6. **部署**
   - 点击 "Deploy site"
   - 等待构建完成

7. **访问站点**
   - 部署完成后，Netlify 会提供一个 URL（如：`your-site.netlify.app`）
   - 可以自定义域名

### 方法二：通过 Netlify CLI

1. **安装 Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **登录 Netlify**
   ```bash
   netlify login
   ```

3. **初始化项目**
   ```bash
   netlify init
   ```
   按照提示选择：
   - Create & configure a new site
   - 选择你的团队
   - 设置站点名称

4. **配置环境变量**
   ```bash
   netlify env:set GEMINI_API_KEY "your_gemini_api_key_here"
   ```

5. **部署**
   ```bash
   netlify deploy --prod
   ```

### 重要提示

- **环境变量安全**：不要在代码中硬编码 API Key，始终使用环境变量
- **API Key 限制**：确保你的 Gemini API Key 有足够的配额
- **构建时间**：首次构建可能需要 2-3 分钟
- **自动部署**：每次推送到主分支会自动触发部署

## 项目结构

```
smartport-ai-scheduler/
├── components/          # React 组件
│   ├── AgentOrchestrator.tsx
│   ├── BottomVis.tsx
│   ├── Dashboard.tsx
│   ├── PhaseDetailPanel.tsx
│   └── PortMap.tsx
├── services/            # 业务逻辑服务
│   ├── aiService.ts           # AI 服务（Gemini API）
│   └── schedulingAlgorithms.ts # 调度算法
├── App.tsx             # 主应用组件
├── constants.ts        # 常量定义
├── types.ts           # TypeScript 类型定义
├── vite.config.ts     # Vite 配置
└── netlify.toml       # Netlify 部署配置
```

## 技术栈

- **React 19** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **Tailwind CSS** - 样式框架
- **Recharts** - 图表库
- **Lucide React** - 图标库
- **Google Gemini API** - AI 服务

## 功能特性

- ✅ 多智能体协同调度系统
- ✅ 实时船舶状态可视化
- ✅ ETA 修正与 EOT 计算
- ✅ 船舶能耗 - 航速关联属性（虚拟到港策略）
- ✅ 航道冲突检测
- ✅ 变邻域搜索优化算法
- ✅ 动态甘特图与航道密度可视化
