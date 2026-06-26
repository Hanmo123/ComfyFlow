# AGENTS.md

ComfyFlow wraps ComfyUI API JSON workflows into configurable apps with graph orchestration, queued task execution, manual gates, retries, and localized media assets. Prefer small, scoped changes after tracing the data flow.

## Repo Shape

- Root is a `pnpm` workspace (`packages/*`). Root `pnpm test` is intentionally invalid; run package scripts with `pnpm --filter ...`.
- `packages/frontend`: Nuxt 4/Vue 3 SPA. Entry `app/app.vue`; pages `app/pages`; components `app/components`; composables `app/composables`; domain types `app/lib`.
- `packages/backend`: AdonisJS 7. Routes are centralized in `start/routes.ts`; business code is under `app`; migrations are under `database/migrations`.
- Local SQLite is `packages/backend/tmp/db.sqlite3`; localized images are under `packages/backend/storage/images`. Do not commit local DBs, uploaded images, temp files, or build outputs.
- Generated files include `packages/backend/.adonisjs/*`, `packages/backend/database/schema.ts`, `packages/backend/build`, `packages/frontend/.nuxt`, and `packages/frontend/.output`. Do not hand-edit them; migrations/codegen may regenerate tracked schema/registry files.

## Commands

- Install: `pnpm install`.
- Frontend dev/build: `pnpm --filter frontend dev`, `pnpm --filter frontend build`.
- Backend dev/build: `pnpm --filter backend dev`, `pnpm --filter backend build`.
- Backend checks: `pnpm --filter backend typecheck`, `pnpm --filter backend test`, `pnpm --filter backend lint`.
- Run migrations from root: `pnpm --filter backend exec node ace migration:run`. This may regenerate Lucid schema/Adonis registry files.
- ComfyUI defaults to `COMFY_BASE_URL` or `http://127.0.0.1:8188`; frontend APIs are hardcoded to `http://localhost:3333/api/v1` in composables.

## Frontend Notes

- Nuxt has `routeRules: { "/**": { ssr: false } }`; treat it as a client SPA.
- shadcn-vue is configured with no prefix and components in `app/components/ui`, so existing usage is `<Button>`, `<DropdownMenu>`, etc. Generate new base UI components through shadcn-vue rather than hand-rolling them.
- Nuxt auto-import names include directory prefixes, e.g. `components/layout/AppNavigationMenu.vue` becomes `<LayoutAppNavigationMenu />`; explicitly import when unsure.
- Do not modify `app/pages/demo.vue` for feature work; it is a reference page.
- Use `vue-sonner` for async success/failure feedback. Keep the tool UI flat and canvas-first; avoid wrapping Vue Flow canvases in decorative cards.
- If API response shapes or app/workflow types change, update `useWorkflowApi.ts`, `useAppApi.ts`, `app/lib/workflow.ts`, and/or `app/lib/app.ts` together.

## Backend Notes

- Follow the existing Controller-Service-Repository split: controllers validate/respond, services own workflows, repositories persist Lucid models.
- Validators live in `app/validators` and use VineJS. Avoid scattering request validation inside controllers.
- Use Adonis import aliases from `packages/backend/package.json` (`#services/*`, `#repositories/*`, etc.). Relative TS imports that compile to ESM use `.js` suffix.
- Schema changes require a migration plus synchronized model/repository/service/validator/frontend type/UI updates when affected.
- `AppTaskService` owns queueing, node execution, manual gates, retry, deletion cleanup, and ComfyUI calls. Changing task semantics must preserve `queued`, `running`, `waiting`, `completed`, `failed`, `nodeRuns`, and snapshot behavior.
- Tasks execute from `appSnapshot`; retry/continue/restore logic must not read the current app definition unless explicitly syncing snapshots.
- ComfyUI node definitions live in `app/comfy_nodes/defs`; parser/registration code is under `app/comfy_nodes` and `app/services/comfy_parser.ts`.

## Media And Images

- `media_assets.proxy_for_id` links derived media to an original. `proxy_kind = 'compressed'` is for AVIF compression proxies; old compressed proxies may have `proxy_kind = null`. `proxy_kind = 'thumbnail'` is for upload thumbnails used by the task list sidebar.
- Uploading an image creates a local original and a `256x256` AVIF thumbnail. The thumbnail is not uploaded to ComfyUI and should only be used for sidebar display.
- Sidebar thumbnail priority is dedicated thumbnail, then proxy image for old tasks, then original image. Output/input image panels should not use thumbnail proxies as generic compressed proxies.
- `image_compress` mutates the IMAGE value by adding `image.proxy`; ComfyUI workflow inputs should still prefer the original image when available for quality.
- `deleteOriginalFile` on compression deletes the local original file only; it must not delete the `media_assets` row. Deleting a task, even with `force=true`, must not delete images still referenced by other tasks or library assets.
- Current media reference detection scans task JSON with `LIKE '%hash%'` across `inputs`, `variables`, `outputs`, and `node_runs`. It is acceptable for small local data but not an indexed reference model.

## Verification

- Backend business/model/route/migration changes: at least `pnpm --filter backend typecheck`; run `pnpm --filter backend test` for behavior changes.
- Frontend page/component/type changes: `pnpm --filter frontend build`.
- Broad backend style changes: also run `pnpm --filter backend lint`.
- Do not use root `pnpm test` as a verification result.

## TODO

- Replace JSON `LIKE '%hash%'` media reference checks with a maintained `media_asset_references` table or equivalent indexed reference model. Update references when tasks are created/updated/deleted so media cleanup can be accurate and fast at scale.
