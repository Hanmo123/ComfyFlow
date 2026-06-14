# AGENTS.md

本项目是 ComfyUI 的外部流程控制系统，用于把 ComfyUI API JSON 工作流包装成可配置、可编排、可排队执行的应用流程。开发时先理解现有目录和数据流，再做小范围修改。

## 项目结构

- 根目录是 `pnpm` workspace，工作区定义在 `pnpm-workspace.yaml`，当前包为 `packages/frontend` 和 `packages/backend`。
- `packages/frontend` 是 Nuxt 4/Vue 3 单页前端，入口在 `app/app.vue`，页面在 `app/pages`，组件在 `app/components`，组合式 API 在 `app/composables`，前端领域类型在 `app/lib`。
- `packages/backend` 是 AdonisJS 7 后端，HTTP 路由集中在 `start/routes.ts`，业务代码在 `app`，数据库迁移在 `database/migrations`。
- `packages/backend/tmp/db.sqlite3` 是本地 SQLite 开发库，`packages/backend/storage/images` 存放本地化后的 ComfyUI 图片资源。
- `node_modules`、`packages/backend/build`、`packages/frontend/.nuxt`、`packages/frontend/.output`、`packages/backend/.adonisjs`、`packages/backend/database/schema.ts` 都按生成物处理，除非明确需要调整生成配置，否则不要手改。

## 核心概念

- 工作流 `workflow`：ComfyUI 的 API JSON 流。用户上传后，从节点输入中选择可暴露参数，从节点输出中选择可暴露结果。
- 应用 `app`：用户编排出来的多工作流流程，包含应用变量和图结构。
- 节点 `node`：应用编排中的逻辑节点，目前包括 `input_collect`、`workflow_run`、`manual_gate`、`output_text`、`output_image`、`coalesce`、`conditional`、`image_compress`。节点概念主要存在于编排画布，不作为一级侧边栏入口。
- 任务 `task`：应用每运行一次生成一个任务。任务保存 `appSnapshot`，执行时基于快照推进，避免后续编辑影响已创建任务。
- 变量 `variable`：应用输入、工作流输出和节点间传递值的统一抽象，类型定义需要同时关注前端 `app/lib/app.ts` 和后端 `app/models/app.ts`。

## 当前功能边界

- 支持上传 ComfyUI API JSON，并配置工作流参数与结果。
- 支持应用输入变量定义、多工作流编排和运行顺序控制。
- 支持人工卡点，任务进入 `waiting` 后需要显式继续。
- 支持任务队列。后端 `AppTaskService` 使用内存 Promise 队列串行执行，符合 ComfyUI 通常并发为 1 的限制。
- 支持从指定工作流运行节点重试，重试时只清理该节点及下游节点运行记录，先前节点不重新运行。

## 常用命令

- 安装依赖：在根目录运行 `pnpm install`。
- 前端开发：`pnpm --filter frontend dev`。
- 前端构建：`pnpm --filter frontend build`。
- 后端开发：`pnpm --filter backend dev`。
- 后端构建：`pnpm --filter backend build`。
- 后端测试：`pnpm --filter backend test`。
- 后端类型检查：`pnpm --filter backend typecheck`。
- 后端 lint：`pnpm --filter backend lint`。
- 数据库迁移：在 `packages/backend` 中运行 `node ace migration:run`，或在根目录运行 `pnpm --filter backend exec node ace migration:run`。

## 前端开发约定

- 前端使用 Nuxt 4，`nuxt.config.ts` 中已设置 `routeRules: { "/**": { ssr: false } }`，按客户端单页应用思路开发。
- Tailwind CSS v4 和 shadcn-vue 已接入，shadcn 组件目录是 `app/components/ui`，前缀为空，因此现有 UI 组件以 `<Button>`、`<DropdownMenu>` 等方式使用。
- 不要手搓 shadcn-vue 基础组件；需要新增基础组件时使用 shadcn-vue 命令生成，再按项目风格微调。
- 图标优先使用 `lucide-vue-next`，按钮里的操作含义尽量用图标配合简短文本表达。
- 组件应按职责拆分，应拆尽拆；页面只保留编排和数据装配，复杂交互下沉到 `app/components` 或 `app/composables`。
- Nuxt 组件放在子目录下会带目录前缀自动导入，例如 `components/layout/AppNavigationMenu.vue` 使用 `<LayoutAppNavigationMenu />`。不确定自动导入名时必须显式 `import`，禁止凭文件名猜组件标签。
- `app/pages/demo.vue` 是参考页面，开发新功能时不要修改它。
- 异步成功、失败、处理中等反馈优先用 `vue-sonner` 的全局提示；不要在组件里堆叠“加载中”“处理中”等静态文案。
- 设计风格保持扁平、清爽、工具型，避免新增 `shadow-*` 作为主要层次手段，优先使用边框、间距、背景和状态色。
- 工作流图、应用编排图和任务图使用 Vue Flow 相关组件时，保持画布交互优先，避免把主要画布包进装饰性卡片。
- 前端 API 目前在 `useWorkflowApi.ts` 和 `useAppApi.ts` 中直接请求 `http://localhost:3333/api/v1`；改 API 路径或响应结构时要同步更新这些 composable 和 `app/lib` 类型。

## 后端开发约定

- 后端遵循 Controller-Service-Repository 三层结构。Controller 只处理请求、校验和响应；Service 处理业务流程；Repository 负责 Lucid 持久化。
- 路由统一挂在 `start/routes.ts`，业务 API 当前前缀是 `/api/v1`。
- 请求校验放在 `app/validators`，使用 VineJS；不要把复杂校验散落在 Controller 中。
- 模型放在 `app/models`，Repository 返回和保存 Lucid 模型；JSON 字段沿用模型里的 `prepare`/`consume` 处理。
- 使用 `package.json` 中配置的 Adonis import alias，例如 `#services/*`、`#repositories/*`、`#models/*`、`#validators/*`。相对导入本地 TS 文件时遵循现有 ESM 写法，使用 `.js` 后缀。
- 新增或修改数据库字段时，添加迁移并同步更新模型、Repository、Service、Validator、前端类型和相关 UI。
- `database/schema.ts` 是 Lucid schema generation 产物，不要手动维护；需要更新时通过迁移流程重新生成。
- `AppTaskService` 是任务队列、节点执行、人工卡点、重试和 ComfyUI 调用的核心位置。修改任务语义时必须考虑 `queued`、`running`、`waiting`、`completed`、`failed` 状态和 `nodeRuns` 的一致性。
- `ComfyService` 默认连接 `COMFY_BASE_URL`，未配置时为 `http://127.0.0.1:8188`。涉及 ComfyUI 调用时注意超时、图片引用、本地化资源和错误码。
- ComfyUI 节点定义在 `app/comfy_nodes/defs`，解析和注册逻辑在 `app/comfy_nodes` 与 `app/services/comfy_parser.ts`。支持新节点类型时应补齐定义、注册和解析结果。
- `providers/api_provider.ts` 扩展了 `HttpContext.serialize`，如需统一响应包装再使用它；不要在无需求时改全局序列化行为。

## 数据与类型同步

- 前端 `app/lib/workflow.ts` 与后端 `app/models/workflow.ts` 描述同一套工作流数据，修改字段时要同步。
- 前端 `app/lib/app.ts` 与后端 `app/models/app.ts`、`app/models/app_task.ts` 描述应用、图节点、任务状态和任务节点运行记录，修改字段时要同步。
- 工作流参数与结果的 `key`、`name`、`type` 是跨前后端、任务执行和 UI 绑定的关键字段，避免随意改名或改变含义。
- 任务执行保存的是应用快照。任何“重跑”“继续”“恢复”逻辑都应基于快照，而不是重新读取当前应用定义。

## 验证要求

- 修改后端业务、模型、路由或迁移时，至少运行 `pnpm --filter backend typecheck`；涉及行为变化时补充或运行 `pnpm --filter backend test`。
- 修改后端代码风格或大范围 TS 文件时运行 `pnpm --filter backend lint`。
- 修改前端页面、组件或类型时运行 `pnpm --filter frontend build`，并在必要时启动 `pnpm --filter frontend dev` 检查页面。
- 根目录 `package.json` 当前没有有效测试脚本，不要用根目录 `pnpm test` 作为验证结果。

## 工作准则

- 优先做最小正确修改，避免顺手重构无关代码。
- 保持已有目录边界，不要把业务逻辑塞进页面组件或 Controller。
- 不要提交真实本地数据、临时文件、上传图片或构建产物。
- 遇到用户已有改动时不要回滚；只在与当前任务直接冲突时询问。
- 注释只写必要的业务或复杂流程说明，避免解释显而易见的赋值和调用。

## 图片代理机制

- **代理定义**：图片压缩后生成的 AVIF 格式图片作为原图的"代理"，优化存储和展示性能。
- **数据库关系**：`media_assets.proxy_for_id` 字段指向原图的 `id`，形成一对多关系（一张原图可有多个不同参数的代理）。
- **节点类型**：`image_compress` 节点用于配置和执行图片压缩，支持调整质量、裁切模式（长边/短边/不裁切）、尺寸限制和是否删除原图本地文件。
- **处理方式**：压缩节点原地更新 IMAGE 变量，为图片对象添加 `proxy` 字段，原图信息保留在原对象中。
- **展示规则**：前端展示时优先使用代理图片（`image.proxy.localUrl` > `image.proxy.url` > `image.localUrl` > `image.url`），降低带宽消耗。
- **流转规则**：ComfyUI 工作流执行时优先使用原图（确保生成质量），压缩节点处理后的变量同时包含原图和代理信息。
- **原图删除**：`image_compress` 节点可配置删除原图本地文件（`deleteOriginalFile: true`），仅保留数据库记录和代理文件，适用于输入图过大场景。删除后原图 `localPath` 指向的文件不存在，但数据库记录保留 `comfyUrl` 可作为回退。
- **未来扩展**：系统设计支持"仅代理无原图"场景，此时 `proxy_for_id` 可为空，表示该资源本身就是最终态。
