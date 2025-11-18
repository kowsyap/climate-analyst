const { app } = require('@azure/functions')

const DEFAULT_PARAMS =
  'q=climate%20OR%20renewable&language=en&sortBy=publishedAt&pageSize=20&domains=apnews.com,bbc.co.uk,guardian.co.uk,reuters.com,nytimes.com'

function pickAllowed(originHeader, allowed) {
  if (!originHeader) return ''
  if (!allowed || allowed === '*') return '*'
  return allowed
    .split(',')
    .map((o) => o.trim())
    .find((o) => o === originHeader) || ''
}

app.http('news-api', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS || '*'
    const origin = pickAllowed(request.headers.get('origin'), allowedOrigins)

    // Preflight
    if (request.method === 'OPTIONS') {
      return {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin || 'null',
          'Access-Control-Allow-Methods': 'GET,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        },
      }
    }

    const params = request.query.get('params') || DEFAULT_PARAMS
    const target = `https://newsapi.org/v2/everything?${params}`

    try {
      const resp = await fetch(target, {
        headers: {
          Authorization: 'Bearer fc1754236e5e45f287de386f9c8285bd',
        },
      })
      const text = await resp.text()
      console.log(text)
      return {
        status: resp.status,
        body: text,
        headers: {
          'Access-Control-Allow-Origin': origin || 'null',
          'Content-Type': 'application/json',
        },
      }
    } catch (err) {
      return {
        status: 500,
        jsonBody: { error: 'Failed to fetch NewsAPI', detail: err.message },
        headers: {
          'Access-Control-Allow-Origin': origin || 'null',
          'Content-Type': 'application/json',
        },
      }
    }
  },
})
