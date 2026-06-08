import ComfyService from '#services/comfy_service'
import { test } from '@japa/runner'

test.group('ComfyService', () => {
  test('caches lora lists for ten minutes', async ({ assert }) => {
    resetLoraCache()
    const originalFetch = globalThis.fetch
    let calls = 0
    globalThis.fetch = (async () => {
      calls += 1
      return new Response(JSON.stringify(['z.safetensors', 'a.safetensors', 'a.safetensors']), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }) as typeof fetch

    try {
      const service = new ComfyService()
      const first = await service.listLoras({ refresh: true })
      const second = await service.listLoras()

      assert.equal(calls, 1)
      assert.equal(first.cached, false)
      assert.equal(second.cached, true)
      assert.deepEqual(first.items, ['a.safetensors', 'z.safetensors'])
      assert.deepEqual(second.items, first.items)
    } finally {
      globalThis.fetch = originalFetch
      resetLoraCache()
    }
  })
})

function resetLoraCache() {
  ;(ComfyService as unknown as { loraCache: unknown }).loraCache = null
}
