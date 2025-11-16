import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../index'

describe('Basic API endpoints', () => {
  it('GET /api returns platform info', async () => {
    const res = await request(app).get('/api')
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      message: expect.any(String),
      version: expect.any(String),
      endpoints: expect.any(Object)
    })
  })

  it('GET /api/frontend-health returns ok status', async () => {
    const res = await request(app).get('/api/frontend-health')
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ status: 'ok' })
  })

  it('GET /api/service-status returns online', async () => {
    const res = await request(app).get('/api/service-status')
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ status: 'online' })
  })
})
