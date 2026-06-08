本项目为comfyui的外部流程控制系统

项目中有如下概念：
- 工作流(workflow):ComfyUI的API Json流，用户需要选择工作流的输入输出字段
- 应用(app):用户编排的多工作流流程
- 节点(node):主要是逻辑节点，比如用户输入节点、条件分支节点、人工卡点节点等（这个概念在侧边栏不可见，只在编排应用时可见）
- 任务(task):app每次运行即为一个任务

支持如下功能：
- 用户定义应用的输入变量清单
- 多工作流编排，调整运行顺序
- 支持流程控制，支持人工卡点、条件分支
- 支持多任务排队（comfyui并发有限，通常只有1）
- 任务任意节点重试（先前节点不再运行）

须知：
- 已经准备好了一个实例前端页面（demo.vue）供参考，开发时不要改这个页面

代码规范：
- 前端应遵循组件拆分“应拆尽拆”
- Nuxt组件放在子目录下会带目录前缀自动导入，例如`components/layout/AppNavigationMenu.vue`应使用`<LayoutAppNavigationMenu />`；如果不确定自动导入名，必须显式`import`后再使用，禁止凭文件名猜组件标签
- 后端遵循Controller-Service-Repository三层架构，Controller只处理请求和响应，Service处理业务逻辑，Repository负责数据持久化

设计规范：
- 扁平化，避免使用`shadow-*`
- 不要自己手搓shadcn-vue组件，而是使用命令拉取
- 不要把加载中、处理中等字眼放在组件里展示，应该用sonner等全局提示组件展示
