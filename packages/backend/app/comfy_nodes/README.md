# ComfyUI 节点规则扩展指南

本目录维护 ComfyUI API JSON 中 `class_type` 到输入/输出类型的映射。用户上传工作流后，后端只返回当前工作流中出现过的节点规则。

## 新增一个节点

1. 在 `app/comfy_nodes/defs/` 新建一个文件，例如 `ksampler.ts`。
2. 调用 `registerNode({...})` 注册节点规则。
3. 在 `app/comfy_nodes/index.ts` 中 import 这个文件，确保启动时注册生效。

示例：

```ts
import { registerNode } from '../registry.js'

registerNode({
  classType: 'KSampler',
  displayName: 'KSampler',
  category: 'sampler',
  color: '#db2777',
  inputs: {
    seed: { type: 'SEED', promotable: true },
    steps: { type: 'INT', promotable: true },
    model: { type: 'MODEL', promotable: false },
  },
  outputs: [{ name: 'LATENT', type: 'LATENT', exposable: true }],
})
```

## 字段规则

`inputs` 的 key 必须和 ComfyUI API JSON 中 `inputs` 对象的字段名一致。

`promotable` 表示这个字段是否可以被用户设置为工作流输入变量。纯连接字段通常设为 `false`，例如 `model`、`clip`、`positive`、`latent_image`。

`outputs` 的顺序必须和 ComfyUI 节点输出 slot 顺序一致。`exposable` 表示该输出是否可以被设置为工作流输出变量。

## 类型取值

支持的 `ComfyType`：`STRING`、`INT`、`FLOAT`、`BOOLEAN`、`SEED`、`COMBO`、`MODEL_NAME`、`IMAGE`、`LATENT`、`MASK`、`MODEL`、`CLIP`、`VAE`、`CONDITIONING`、`CONTROL_NET`、`UNKNOWN`。

如果新增节点需要新的类型，先在 `types.ts` 扩展 `ComfyType`，再补充前端展示逻辑。

## 未注册节点

未注册的 `class_type` 会走 fallback：字面量字段按 JS 类型推断为 `BOOLEAN`、`INT`、`FLOAT` 或 `STRING`；形如 `[nodeId, slotIndex]` 的值被识别为连接，不会成为可提升字段。
