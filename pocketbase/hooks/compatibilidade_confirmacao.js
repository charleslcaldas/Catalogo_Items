$app.store().set('c2_runtime_probe_registrars_v1', {
  onRecordUpdateRequest: typeof onRecordUpdateRequest === 'function',
  onRecordCreateRequest: typeof onRecordCreateRequest === 'function',
  onRecordDeleteRequest: typeof onRecordDeleteRequest === 'function',
})
routerAdd(
  'GET',
  '/backend/v1/cotacoes/compatibilidade',
  (e) => {
    const auth = e.requestInfo().auth
    if (!auth) return e.json(401, { error: 'nao_autenticado' })
    const isSuperuser = auth.collection().name === '_superusers'
    const isOwner =
      auth.collection().name === 'users' &&
      auth.getString('email') === 'charles@c2international.com.br'
    if (!isSuperuser && !isOwner) return e.json(403, { error: 'acesso_negado' })
    const loader = $app.store().get('c2_runtime_probe_registrars_v1')
    if (!loader)
      return e.json(200, { ok: false, check: 'loader_probe_missing', runtime_version: null })
    const capabilities = {
      canAccessRecord: typeof $app.canAccessRecord === 'function',
      runInTransaction: typeof $app.runInTransaction === 'function',
      onRecordUpdateRequest: loader.onRecordUpdateRequest === true,
      onRecordCreateRequest: loader.onRecordCreateRequest === true,
      onRecordDeleteRequest: loader.onRecordDeleteRequest === true,
      hasSuperuserAuth: typeof e.hasSuperuserAuth === 'function',
      randomString: typeof $security.randomString === 'function',
      hs256: typeof $security.hs256 === 'function',
      equal: typeof $security.equal === 'function',
    }
    const missing = Object.keys(capabilities).filter((k) => !capabilities[k])
    let ownRecordRuleCheck = false
    if (!missing.length) {
      try {
        $app.runInTransaction((tx) => {
          const fresh = tx.findRecordById(auth.collection().name, auth.id)
          const info = e.requestInfo()
          info.auth = fresh
          ownRecordRuleCheck = tx.canAccessRecord(fresh, info, fresh.collection().viewRule)
        })
      } catch (_) {
        return e.json(200, {
          ok: false,
          capabilities,
          check: 'read_transaction_failed',
          runtime_version: null,
        })
      }
    }
    return e.json(200, {
      ok: !missing.length && ownRecordRuleCheck,
      capabilities,
      own_record_rule_check: ownRecordRuleCheck,
      runtime_version: null,
    })
  },
  $apis.requireAuth(),
)
