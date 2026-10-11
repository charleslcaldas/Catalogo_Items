// TEMPORARY operator maintenance only. Never attach this secret to Mei or quote broker.
// No restore, SQL, commands, arbitrary filenames, settings edits or user records API.
routerAdd('POST', '/backend/v1/mei-maintenance/backup', (e) => {
  let authenticated = false
  let stage = 'authentication'
  try {
    const secret = $os.getenv('MEI_SKIP_MAINTENANCE_KEY')
    const expiry = /^m1\.[0-9]{10}\.[0-9a-f]{64}$/.test(secret) ? Number(secret.split('.')[1]) : 0
    const ts = e.request.header.get('X-Mei-Timestamp')
    const nonce = e.request.header.get('X-Mei-Nonce')
    const mac = e.request.header.get('X-Mei-Signature')
    const now = Math.floor(Date.now() / 1000)
    if (
      secret.length < 32 ||
      !Number.isFinite(expiry) ||
      now > expiry ||
      !/^[0-9]{10}$/.test(ts) ||
      Math.abs(now - Number(ts)) > 60 ||
      !/^[0-9a-f]{32}$/.test(nonce) ||
      !/^[0-9a-f]{64}$/.test(mac)
    )
      throw new Error('Denied')
    const raw = toString(e.request.body, 1025)
    if (raw !== '{}') throw new Error('Denied')
    const signed = [
      'mei-skip-v1',
      'POST',
      '/backend/v1/mei-maintenance/backup',
      ts,
      nonce,
      $security.sha256(raw),
    ].join('\n')
    if (!$security.equal(mac, $security.hs256(signed, secret))) throw new Error('Denied')
    authenticated = true
    stage = 'external-storage-check'
    if ($app.settings().s3.enabled)
      throw new Error('External uploaded files require separate export')
    const name = 'mei-prewrite-' + ts + '-' + nonce + '.zip'
    // Keep schema/rule inventory and all available supplier sources in the backup.
    // Missing source blocks later writer activation, never invent replacement hooks.
    stage = 'inventory'
    const names = [
      'on_supplier_redflag_create',
      'on_supplier_redflag_update',
      'on_supplier_assessment_create',
      'on_supplier_assessment_update',
    ]
    const source = {}
    names.forEach((name) => {
      let text = null
      for (const suffix of ['.js', '.pb.js']) {
        try {
          text = toString($os.readFile(__hooks + '/' + name + suffix))
          break
        } catch (_) {}
      }
      if (text !== null) source[name] = text
    })
    const collections = $app.findAllCollections().map((c) => ({
      name: c.name,
      type: c.type,
      listRule: c.listRule,
      viewRule: c.viewRule,
      createRule: c.createRule,
      updateRule: c.updateRule,
      deleteRule: c.deleteRule,
      manageRule: c.manageRule,
      fields: c.fields,
      indexes: c.indexes,
    }))
    const missing = names.filter((name) => !Object.prototype.hasOwnProperty.call(source, name))
    const inventory = {
      collections: collections,
      supplier_hooks: source,
      missing_supplier_hooks: missing,
    }
    // User/account data is only inside protected backup; never in the JSON receipt.
    $os.writeFile(
      $app.dataDir() + '/mei-prewrite-inventory.json',
      toBytes(JSON.stringify(inventory)),
      384,
    )
    stage = 'backup-filesystem'
    const backupFs = $app.newBackupsFilesystem()
    let previous = null
    try {
      try {
        previous = backupFs.getReader(name)
      } catch (_) {}
      if (previous) throw new Error('Backup already exists')
    } finally {
      if (previous) previous.close()
      backupFs.close()
    }
    stage = 'backup-create'
    $app.createBackup(e.request.context(), name)
    stage = 'receipt'
    return e.json(200, {
      created: name,
      inventory_sha256: $security.sha256(JSON.stringify(inventory)),
      supplier_hooks: Object.keys(source),
      missing_supplier_hooks: missing,
      download_path: '/backend/v1/mei-maintenance/download/' + name,
    })
  } catch (_) {
    return e.json(403, {
      error: 'MAINTENANCE_DENIED_OR_BACKUP_UNAVAILABLE',
      stage: authenticated ? stage : 'authentication',
    })
  }
})
