
function summarize(text = '', maxLength = 160) {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return 'Tap through to read the full discussion.'
  if (clean.length <= maxLength) return clean
  return `${clean.slice(0, maxLength).trim()}…`
}

export async function fetchClimateNews(limit = 3) {
  const proxyUrl =
    typeof import.meta !== 'undefined'
      ? import.meta.env.VITE_NEWS_PROXY_URL || 'https://climate-intelligence-api.azurewebsites.net/api/news-api'
      : 'https://climate-intelligence-api.azurewebsites.net/api/news-api'

  const params =
    'q=climate%20OR%20renewable&language=en&sortBy=publishedAt&pageSize=20&domains=apnews.com,bbc.co.uk,guardian.co.uk,reuters.com,nytimes.com'
  const url = proxyUrl || `https://newsapi.org/v2/everything?${params}`

  const response = await fetch(url, {})
  if (!response.ok) {
    throw new Error('Unable to load climate news')
  }

  const payload = await response.json()
  const items = payload?.articles ?? []
  if (!items.length) {
    throw new Error('Climate news payload empty')
  }

  const shuffled = [...items].sort(() => Math.random() - 0.5)

  return shuffled
    .slice(0, limit)
    .map((article, index) => ({
      id: article.url ?? `news-${index}`,
      title: article.title,
      summary: summarize(article.description || article.content || ''),
      link: article.url,
      source: article.source?.name ?? 'newsapi.org',
      publishedAt: article.publishedAt ?? new Date().toISOString(),
    }))
}
