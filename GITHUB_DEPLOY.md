# GitHub 部署指南

## 📋 将项目推送到 GitHub

### 方法一：通过 GitHub 网页创建仓库（推荐）

#### 步骤 1：在 GitHub 上创建新仓库

1. 访问 https://github.com
2. 登录你的账号
3. 点击右上角的 **"+"** 按钮 → **"New repository"**
4. 填写仓库信息：
   - **Repository name:** `smartport-ai-scheduler`（或你喜欢的名字）
   - **Description:** `智能港口多智能体调度系统`
   - **Visibility:** 选择 Public（公开）或 Private（私有）
   - **不要**勾选 "Initialize this repository with a README"（因为本地已有代码）
5. 点击 **"Create repository"**

#### 步骤 2：推送本地代码到 GitHub

GitHub 会显示推送命令，在终端中执行：

```bash
cd /Users/liuzememory/Downloads/smartport-ai-scheduler

# 添加远程仓库（替换 YOUR_USERNAME 为你的 GitHub 用户名）
git remote add origin https://github.com/YOUR_USERNAME/smartport-ai-scheduler.git

# 或者使用 SSH（如果你配置了 SSH key）
# git remote add origin git@github.com:YOUR_USERNAME/smartport-ai-scheduler.git

# 推送代码到 GitHub
git branch -M main
git push -u origin main
```

**注意：** 如果提示需要认证，GitHub 现在使用 Personal Access Token（PAT）而不是密码。

---

### 方法二：通过 GitHub CLI（gh）

#### 步骤 1：安装 GitHub CLI

```bash
# macOS
brew install gh

# 或访问 https://cli.github.com/
```

#### 步骤 2：登录 GitHub

```bash
gh auth login
```

#### 步骤 3：创建并推送仓库

```bash
cd /Users/liuzememory/Downloads/smartport-ai-scheduler

# 创建 GitHub 仓库并推送
gh repo create smartport-ai-scheduler --public --source=. --remote=origin --push
```

---

### 方法三：通过 GitHub Desktop（图形界面）

1. 下载安装 GitHub Desktop：https://desktop.github.com/
2. 打开 GitHub Desktop
3. 点击 **"File"** → **"Add Local Repository"**
4. 选择项目目录：`/Users/liuzememory/Downloads/smartport-ai-scheduler`
5. 点击 **"Publish repository"**
6. 填写仓库名称和描述
7. 选择 Public 或 Private
8. 点击 **"Publish Repository"**

---

## 🔐 GitHub 认证设置

### 使用 Personal Access Token（PAT）

GitHub 不再支持密码认证，需要使用 Personal Access Token：

1. 访问 https://github.com/settings/tokens
2. 点击 **"Generate new token"** → **"Generate new token (classic)"**
3. 填写信息：
   - **Note:** `Netlify Deployment`
   - **Expiration:** 选择过期时间
   - **Scopes:** 勾选 `repo`（完整仓库访问权限）
4. 点击 **"Generate token"**
5. **重要：** 复制生成的 token（只显示一次！）

### 使用 Token 推送代码

```bash
# 当提示输入密码时，使用 Personal Access Token
git push origin main

# Username: 你的 GitHub 用户名
# Password: 粘贴你的 Personal Access Token
```

### 配置 Git 凭据存储（避免每次都输入）

```bash
# macOS - 使用钥匙串存储
git config --global credential.helper osxkeychain

# 或使用缓存（15分钟）
git config --global credential.helper cache
```

---

## 📝 检查当前状态

### 检查 Git 状态

```bash
# 查看当前分支和状态
git status

# 查看远程仓库
git remote -v

# 查看提交历史
git log --oneline -10
```

### 如果已有远程仓库，更新它

```bash
# 添加所有更改
git add .

# 提交更改
git commit -m "更新项目配置和文档"

# 推送到 GitHub
git push origin main
```

---

## ⚠️ 重要提示

### 不要提交敏感信息

确保 `.gitignore` 文件包含：

```
# 环境变量文件
.env
.env.local
.env.*.local

# 依赖
node_modules/
dist/

# 日志
*.log
npm-debug.log*

# 系统文件
.DS_Store
Thumbs.db
```

### 如果已经提交了敏感信息

```bash
# 从 Git 历史中移除敏感文件
git rm --cached .env.local
git commit -m "移除敏感文件"
git push origin main
```

---

## 🔗 后续步骤

推送代码到 GitHub 后：

1. **配置 Netlify 自动部署**
   - 在 Netlify Dashboard 中连接 GitHub 仓库
   - 每次推送代码会自动触发部署

2. **添加 README 和文档**
   - 更新 `README.md` 文件
   - 添加项目截图和说明

3. **设置 GitHub Pages（可选）**
   - 在仓库 Settings → Pages
   - 选择 Source: `main` branch, `/dist` folder

---

## 🆘 常见问题

### 1. 推送被拒绝（Push rejected）

**问题：** `error: failed to push some refs`

**解决方案：**
```bash
# 先拉取远程更改
git pull origin main --rebase

# 然后再推送
git push origin main
```

### 2. 认证失败

**问题：** `remote: Support for password authentication was removed`

**解决方案：**
- 使用 Personal Access Token（见上方说明）
- 或配置 SSH key

### 3. 远程仓库已存在

**问题：** `remote origin already exists`

**解决方案：**
```bash
# 查看现有远程仓库
git remote -v

# 更新远程仓库 URL
git remote set-url origin https://github.com/YOUR_USERNAME/smartport-ai-scheduler.git

# 或删除后重新添加
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/smartport-ai-scheduler.git
```

---

## 📚 相关资源

- [GitHub 官方文档](https://docs.github.com/)
- [Git 官方文档](https://git-scm.com/doc)
- [GitHub CLI 文档](https://cli.github.com/)

