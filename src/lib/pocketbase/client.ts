import PocketBase from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)
// Compatibility only: server authorization and purchase containment remain independent.
pb.beforeSend = (url, options) => {
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes((options.method || 'GET').toUpperCase())) {
    options.headers = { ...options.headers, 'X-C2-Quote-Flow': 'v2' }
  }
  return { url, options }
}

export default pb
