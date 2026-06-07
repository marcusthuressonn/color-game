import { describe, expect, it } from 'vitest'

import { HttpRouter } from 'effect/unstable/http'

import { AppLayer } from './http.ts'

describe('AppLayer', () => {
  it('GET /health returns 200 OK', async () => {
    const { handler, dispose } = HttpRouter.toWebHandler(AppLayer)
    try {
      const response = await handler(
        new Request('http://localhost/health', { method: 'GET' }),
      )
      expect(response.status).toBe(200)
      expect(await response.text()).toBe('OK')
    } finally {
      await dispose()
    }
  })

  it('unknown routes return 404', async () => {
    const { handler, dispose } = HttpRouter.toWebHandler(AppLayer)
    try {
      const response = await handler(
        new Request('http://localhost/nope', { method: 'GET' }),
      )
      expect(response.status).toBe(404)
    } finally {
      await dispose()
    }
  })
})
