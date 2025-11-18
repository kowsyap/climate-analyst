const { app } = require('@azure/functions')
const { CloudClient } = require('chromadb')

let client = null
function getClient() {
  if (!client) {
    client = new CloudClient({
      apiKey: process.env.CHROMA_API_KEY,
      tenant: process.env.CHROMA_TENANT,
      database: process.env.CHROMA_DATABASE,
      baseUrl: process.env.CHROMA_BASE_URL || 'https://api.trychroma.com',
    })
  }
  return client
}

async function getCollection() {
  const noopEmbeddingFn = {
    generate: async () => {
      throw new Error('Embedding is required for this collection')
    },
  }

  const timeoutMs = Number(process.env.CHROMA_TIMEOUT_MS) || 15000
  const collPromise = getClient().getOrCreateCollection({
    name: 'analyst-memory-climate',
    embeddingFunction: noopEmbeddingFn,
  })
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Chroma getOrCreateCollection timed out after ${timeoutMs}ms`)), timeoutMs)
  )
  return Promise.race([collPromise, timeoutPromise])
}

app.http('chroma-search-record', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    context.log('Chroma search-record function invoked')

    if (!process.env.CHROMA_API_KEY || !process.env.CHROMA_TENANT || !process.env.CHROMA_DATABASE) {
      return { status: 500, jsonBody: { error: 'Missing CHROMA_* env vars' } }
    }

    let body
    try {
      body = await request.json()
    } catch {
      return { status: 400, jsonBody: { error: 'Invalid JSON body' } }
    }

    const { embedding, k = 5 } = body || {}
    if (!Array.isArray(embedding)) {
      return { status: 400, jsonBody: { error: 'Missing embedding array' } }
    }

    try {
      context.log('Connecting to Chroma for similarity search...')
      const coll = await getCollection()
      const results = await coll.query({
        queryEmbeddings: [embedding],
        nResults: k,
        include: ['metadatas', 'documents', 'distances', 'uris'],
      })

      return {
        status: 200,
        jsonBody: {
          ids: results.ids?.[0] || [],
          metadatas: results.metadatas?.[0] || [],
          documents: results.documents?.[0] || [],
          distances: results.distances?.[0] || [],
          uris: results.uris?.[0] || [],
        },
      }
    } catch (error) {
      if (context?.log?.error) {
        context.log.error('Search failed', error)
      } else if (context?.log) {
        context.log('Search failed', error)
      }
      return { status: 500, jsonBody: { error: error.message } }
    }
  },
})
