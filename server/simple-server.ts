import express from 'express'
import cors from 'cors'

const app = express()
app.use(cors({ origin: '*', credentials: true }))
app.use(express.json())

app.get('/api', (_req, res) => {
  res.json({ message: 'Chanuka API (simple)', version: '1.0.0', endpoints: { externalApi: '/external-api', bills: '/bills' } })
})

app.get('/api/service-status', (_req, res) => {
  res.json({ status: 'online', timestamp: new Date().toISOString(), uptime: process.uptime(), version: '1.0.0' })
})

app.get('/external-api/analytics', (req, res) => {
  const source = typeof req.query.source === 'string' ? req.query.source : undefined
  const timeWindow = req.query.timeWindow ? Number(req.query.timeWindow) : undefined
  const isFallback = req.query.fallback === 'true'

  const sources = source ? [{ source, requestCount: 10, successRate: 0.98, averageResponseTime: 120, totalCost: 1.5, cacheHitRate: 0.75 }] : [
    { source: 'parliament-ca', requestCount: 120, successRate: 0.97, averageResponseTime: 110, totalCost: 12.3, cacheHitRate: 0.70 },
    { source: 'senate-us', requestCount: 90, successRate: 0.96, averageResponseTime: 130, totalCost: 9.1, cacheHitRate: 0.68 }
  ]

  const effectiveSources = source && source === 'non-existent-source' ? [] : sources

  const data = {
    sources: effectiveSources,
    totalRequests: effectiveSources.reduce((a, b) => a + b.requestCount, 0),
    totalCost: effectiveSources.reduce((a, b) => a + b.totalCost, 0),
    averageResponseTime: effectiveSources.length ? Math.round(effectiveSources.reduce((a, b) => a + b.averageResponseTime, 0) / effectiveSources.length) : 0,
    overallSuccessRate: effectiveSources.length ? Math.round((effectiveSources.reduce((a, b) => a + b.successRate, 0) / effectiveSources.length) * 100) / 100 : 0,
    cacheHitRate: effectiveSources.length ? Math.round((effectiveSources.reduce((a, b) => a + b.cacheHitRate, 0) / effectiveSources.length) * 100) / 100 : 0,
    topPerformingSources: sources.slice(0, 1),
    costBreakdown: sources.map(s => ({ source: s.source, cost: s.totalCost })),
    timeWindow: timeWindow,
    isFallback,
    fallbackReason: isFallback ? 'external source unavailable' : undefined
  }

  res.setHeader('Cache-Control', 'public, max-age=60')
  res.json({ success: true, data })
})

app.get('/external-api/health', (req, res) => {
  const detailed = req.query.detailed === 'true'
  const services = [
    {
      name: 'parliament-ca', status: 'healthy', responseTime: 110, last_checked: new Date().toISOString(),
      endpoint: detailed ? 'https://api.parliament.ca' : undefined,
      errorCount: detailed ? 0 : undefined,
      successRate: detailed ? 0.98 : undefined
    }
  ]
  res.json({ success: true, data: { sources: ['parliament-ca', 'senate-us'], timestamp: new Date().toISOString(), overallStatus: 'healthy', services } })
})

app.post('/external-api/cache/invalidate', (_req, res) => {
  res.json({ success: true, data: { invalidated: true } })
})

app.get('/external-api/config/cache', (_req, res) => {
  res.json({ success: true, data: { ttl: 300 } })
})

app.get('/external-api/metrics/performance', (_req, res) => {
  res.json({ success: true, data: { averageResponseTime: 120, requestCount: 1000, errorRate: 0.02, throughput: 50 } })
})

app.get('/external-api/metrics/cost', (_req, res) => {
  res.json({ success: true, data: { totalCost: 21.4, costBySource: [{ source: 'parliament-ca', cost: 12.3 }], projectedMonthlyCost: 87.6 } })
})

app.get('/external-api/test-failure', (_req, res) => {
  res.status(503).json({ success: false, error: 'External API unavailable' })
})

app.get('/external-api/slow-endpoint', (_req, res) => {
  res.json({ success: true, data: { message: 'ok' } })
})

app.get('/bills', (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 5
  const bills = Array.from({ length: limit }).map((_, i) => ({ id: i + 1, title: `Bill ${i + 1}` }))
  res.json({ success: true, data: bills })
})

const PORT = Number(process.env.PORT || 4200)
app.listen(PORT, '::', () => {})
