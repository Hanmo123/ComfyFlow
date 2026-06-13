# ComfyFlow

> 将 ComfyUI 工作流封装为可配置、可编排、可排队执行的应用流程管理系统

## 项目简介

ComfyFlow 是一个 ComfyUI 的外部流程控制系统，调用 ComfyUI API 来实现多工作流编排、参数配置、人工卡点和任务队列管理。

## 核心功能

- **工作流管理**：上传 ComfyUI API JSON 工作流，配置可暴露的参数和输出结果
- **应用编排**：通过可视化画布编排多个工作流，定义执行顺序和数据流转
- **任务队列**：自动队列化执行任务，支持并发控制和任务状态追踪
- **人工卡点**：在关键节点设置人工审核，任务进入等待状态需显式继续
- **重试机制**：支持从指定节点重新运行，保留上游节点的执行结果
- **变量系统**：统一的变量抽象用于应用输入、工作流输出和节点间数据传递

## 技术栈

### 前端
- **框架**：Nuxt 4 / Vue 3
- **UI 组件**：shadcn-vue + Tailwind CSS v4
- **流程编排**：Vue Flow（可视化流程图）
- **图标**：Lucide Icons
- **提示通知**：vue-sonner

### 后端
- **框架**：AdonisJS 7
- **数据库**：SQLite（Lucid ORM）
- **校验**：VineJS
- **架构**：Controller-Service-Repository 三层结构

### 开发工具
- **包管理器**：pnpm（workspace 模式）
- **语言**：TypeScript

## 快速开始

### 环境要求

- Node.js 18+
- pnpm 8+
- ComfyUI 实例（假设运行在 `http://127.0.0.1:8188`，可使用 `COMFY_BASE_URL` 环境变量进行配置）

### 安装

```bash
# 克隆项目
git clone https://github.com/Hanmo123/comfyui-tools.git
cd comfyui-tools

# 安装依赖
pnpm install

# 运行数据库迁移
pnpm --filter backend exec node ace migration:run
```

### 开发

```bash
# 启动后端开发服务器（默认端口 3333）
pnpm --filter backend dev

# 启动前端开发服务器（默认端口 3000）
pnpm --filter frontend dev
```

访问 `http://localhost:3000` 开始使用。

### 构建

```bash
# 构建后端
pnpm --filter backend build

# 构建前端
pnpm --filter frontend build
```

## 项目结构

```
comfyui-tools/
├── packages/
│   ├── backend/              # AdonisJS 后端
│   │   ├── app/
│   │   │   ├── controllers/  # 请求控制器
│   │   │   ├── services/     # 业务逻辑
│   │   │   ├── repositories/ # 数据持久化
│   │   │   ├── models/       # 数据模型
│   │   │   └── validators/   # 请求校验
│   │   ├── database/         # 数据库迁移
│   │   ├── start/            # 路由定义
│   │   └── tmp/              # SQLite 数据库
│   └── frontend/             # Nuxt 前端
│       ├── app/
│       │   ├── pages/        # 页面路由
│       │   ├── components/   # Vue 组件
│       │   ├── composables/  # 组合式 API
│       │   └── lib/          # 类型定义
│       └── nuxt.config.ts
├── pnpm-workspace.yaml
└── package.json
```

## 核心概念

### 工作流（Workflow）
ComfyUI 的 API JSON 格式工作流。上传后可以选择需要暴露的输入参数和输出结果。

### 应用（App）
用户编排的多工作流流程，包含应用变量和可视化流程图。支持以下节点类型：
- `input_collect`：收集用户输入
- `workflow_run`：执行 ComfyUI 工作流
- `manual_gate`：人工审核卡点
- `output_text`：文本输出
- `output_image`：图片输出

### 任务（Task）
应用的一次运行实例。任务保存应用快照，确保执行过程不受后续编辑影响。

支持的任务状态：
- `queued`：排队中
- `running`：执行中
- `waiting`：等待人工操作
- `completed`：已完成
- `failed`：失败

### 变量（Variable）
应用输入、工作流输出和节点间传递数据的统一抽象。

## 配置

### 后端环境变量

在 `packages/backend/.env` 中配置：

```env
# ComfyUI 服务地址
COMFY_BASE_URL=http://127.0.0.1:8188

# 数据库配置（默认使用 SQLite）
DB_CONNECTION=sqlite

# 应用端口
PORT=3333
```

### 前端配置

前端默认请求 `http://localhost:3333/api/v1`，可在 `packages/frontend/app/composables/useWorkflowApi.ts` 和 `useAppApi.ts` 中修改。

## 常用命令

```bash
# 安装依赖
pnpm install

# 前端开发
pnpm --filter frontend dev

# 前端构建
pnpm --filter frontend build

# 后端开发
pnpm --filter backend dev

# 后端构建
pnpm --filter backend build

# 后端测试
pnpm --filter backend test

# 后端类型检查
pnpm --filter backend typecheck

# 后端代码检查
pnpm --filter backend lint

# 数据库迁移
pnpm --filter backend exec node ace migration:run
```

## 开发指南

详细的开发规范和约定请参考 [AGENTS.md](./AGENTS.md)。

主要开发原则：
- 前后端类型定义需保持同步
- 遵循 Controller-Service-Repository 分层架构
- 组件按职责拆分，页面仅负责编排和数据装配
- 优先使用现有 UI 组件，避免重复造轮子
- 提交前运行类型检查和构建验证

## 贡献

欢迎提交 Issue 和 Pull Request。

## 许可证

MIT
