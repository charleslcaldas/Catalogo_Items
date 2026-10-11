routerAdd('GET', '/backend/v1/mei-maintenance/download/{name}', (e) => {
  let reader = null
  try {
    const secret = $os.getenv('MEI_SKIP_MAINTENANCE_KEY')
    const expiry = /^m1\.[0-9]{10}\.[0-9a-f]{64}$/.test(secret) ? Number(secret.split('.')[1]) : 0
    const ts = e.request.header.get('X-Mei-Timestamp'),
      nonce = e.request.header.get('X-Mei-Nonce'),
      mac = e.request.header.get('X-Mei-Signature')
    const now = Math.floor(Date.now() / 1000),
      name = e.request.pathValue('name')
    if (
      secret.length < 32 ||
      !Number.isFinite(expiry) ||
      now > expiry ||
      !/^[0-9]{10}$/.test(ts) ||
      Math.abs(now - Number(ts)) > 60 ||
      !/^[0-9a-f]{32}$/.test(nonce) ||
      !/^[0-9a-f]{64}$/.test(mac) ||
      !/^mei-prewrite-[0-9]{10}-[0-9a-f]{32}\.zip$/.test(name)
    )
      throw new Error('Denied')
    const signed = ['mei-skip-v1', 'GET', e.request.url.path, ts, nonce, $security.sha256('')].join(
      '\n',
    )
    if (!$security.equal(mac, $security.hs256(signed, secret))) throw new Error('Denied')
    const fs = $app.newBackupsFilesystem()
    try {
      reader = fs.getReader(name)
      return e.stream(200, 'application/zip', reader)
    } finally {
      if (reader) reader.close()
      fs.close()
    }
  } catch (_) {
    return e.json(403, { error: 'MAINTENANCE_DENIED_OR_BACKUP_UNAVAILABLE' })
  }
})
