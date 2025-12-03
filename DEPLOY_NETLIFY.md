# Netlify 部署指南

## 📋 部署前准备

1. **确保代码已推送到 Git 仓库**（GitHub/GitLab/Bitbucket）
2. **准备好 Gemini API Key**

## 🚀 方法一：通过 Netlify Dashboard 部署（推荐）

### 步骤 1：登录 Netlify

1. 访问 https://app.netlify.com
2. 使用 GitHub/GitLab/Bitbucket 账号登录（推荐使用 GitHub）

### 步骤 2：创建新站点

1. 点击右上角 **"Add new site"** 按钮
2. 选择 **"Import an existing project"**
3. 选择你的 Git 提供商（GitHub/GitLab/Bitbucket）
4. 授权 Netlify 访问你的仓库
5. 选择 `smartport-ai-scheduler` 仓库

### 步骤 3：配置构建设置

Netlify 会自动检测到 `netlify.toml` 配置文件，但请确认以下设置：

- **Build command:** `npm run build`
- **Publish directory:** `dist`
- **Node version:** 18（在 Environment variables 中设置 `NODE_VERSION = 18`）

如果自动检测失败，手动设置：
- 点击 **"Show advanced"**
- 在 **"Build settings"** 中：
  - Build command: `npm run build`
  - Publish directory: `dist`

### 步骤 4：配置环境变量（重要！）

1. 在部署配置页面，点击 **"Show advanced"**
2. 展开 **"Environment variables"** 部分
3. 点击 **"New variable"**，添加：
   - **Key:** `GEMINI_API_KEY`
   - **Value:** 你的 Gemini API Key
4. 点击 **"Add variable"**
5. 点击 **"Deploy site"**

### 步骤 5：等待部署完成

- 构建过程通常需要 2-3 分钟
- 可以在构建日志中查看进度
- 构建成功后，会显示部署 URL

### 步骤 6：访问你的站点

部署完成后，你会得到一个类似 `your-site-name.netlify.app` 的 URL

---

## 🔧 方法二：通过 Netlify CLI 部署

### 步骤 1：使用 npx 运行 Netlify CLI（无需全局安装）

无需安装，直接使用 `npx` 运行：

### 步骤 2：登录 Netlify

```bash
npx netlify-cli login
```

这会打开浏览器，完成登录授权。

### 步骤 3：初始化项目

```bash
cd /Users/liuzememory/Downloads/smartport-ai-scheduler
npx netlify-cli init
```

按照提示选择：
- **Create & configure a new site**
- 选择你的团队
- 设置站点名称（或使用默认）
- **Build command:** `npm run build`（直接回车使用默认）
- **Directory to deploy:** `dist`（直接回车使用默认）

### 步骤 4：配置环境变量

```bash
npx netlify-cli env:set GEMINI_API_KEY "your_gemini_api_key_here"
```

### 步骤 5：部署到生产环境

```bash
npx netlify-cli deploy --prod
```

### 或者：本地安装 Netlify CLI（可选）

如果你想本地安装（不需要全局权限）：

```bash
# 在项目目录中安装为开发依赖
npm install --save-dev netlify-cli

# 然后使用 npx 运行
npx netlify-cli login
npx netlify-cli init
npx netlify-cli deploy --prod
```

或者在 `package.json` 中添加脚本：

```json
{
  "scripts": {
    "netlify": "netlify"
  }
}
```

然后使用：
```bash
npm run netlify login
npm run netlify init
npm run netlify deploy --prod
```

---

## 🔄 自动部署设置

### 启用自动部署

1. 在 Netlify Dashboard 中，进入你的站点
2. 进入 **"Site settings"** → **"Build & deploy"**
3. 在 **"Continuous Deployment"** 部分：
   - 确保 **"Build hooks"** 已启用
   - 设置 **"Production branch"** 为 `main` 或 `master`

### 自动部署触发条件

- 每次推送到主分支（main/master）会自动触发部署
- 每次合并 Pull Request 会触发预览部署

---

## ⚙️ 环境变量配置

### 必需的环境变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `GEMINI_API_KEY` | Google Gemini API Key | `AIzaSy...` |

### 在 Netlify Dashboard 中配置

1. 进入站点 → **"Site settings"** → **"Environment variables"**
2. 点击 **"Add a variable"**
3. 添加变量并保存

### 在 Netlify CLI 中配置

```bash
# 使用 npx 运行（无需全局安装）
# 设置生产环境变量
npx netlify-cli env:set GEMINI_API_KEY "your_key" --context production

# 设置预览环境变量
npx netlify-cli env:set GEMINI_API_KEY "your_key" --context deploy-preview

# 查看所有环境变量
npx netlify-cli env:list
```

---

## 🐛 常见问题排查

### 1. 构建失败

**问题：** 构建过程中出现错误

**解决方案：**
- 检查构建日志，查看具体错误信息
- 确保 Node.js 版本为 18+
- 确保所有依赖都已正确安装
- 检查 `package.json` 中的脚本是否正确

### 2. API Key 未生效

**问题：** 部署后 AI 功能不工作

**解决方案：**
- 确认环境变量名称正确：`GEMINI_API_KEY`
- 确认环境变量已添加到 Netlify
- 重新部署站点（环境变量更改后需要重新部署）
- 检查浏览器控制台是否有错误

### 3. 页面刷新 404

**问题：** 刷新页面后显示 404

**解决方案：**
- 确认 `public/_redirects` 文件存在
- 确认 `netlify.toml` 中的重定向规则正确
- 重新部署站点

### 4. 构建时间过长

**问题：** 构建超过 5 分钟

**解决方案：**
- 检查是否有大量未使用的依赖
- 优化构建配置
- 考虑使用 Netlify 的构建缓存

---

## 📝 部署检查清单

部署前请确认：

- [ ] 代码已推送到 Git 仓库
- [ ] `netlify.toml` 文件已创建
- [ ] `public/_redirects` 文件已创建
- [ ] 环境变量 `GEMINI_API_KEY` 已配置
- [ ] 本地测试通过：`npm run build` 成功
- [ ] 本地预览正常：`npm run preview` 可以访问

---

## 🔗 相关链接

- [Netlify 官方文档](https://docs.netlify.com/)
- [Vite 部署指南](https://vitejs.dev/guide/static-deploy.html#netlify)
- [Netlify 环境变量文档](https://docs.netlify.com/environment-variables/overview/)

---

## 💡 提示

1. **首次部署**：建议先在预览环境测试，确认无误后再部署到生产环境
2. **自定义域名**：可以在 Netlify Dashboard 中配置自定义域名
3. **HTTPS**：Netlify 自动提供 HTTPS 证书
4. **性能优化**：Netlify 会自动优化静态资源，包括 CDN 加速

