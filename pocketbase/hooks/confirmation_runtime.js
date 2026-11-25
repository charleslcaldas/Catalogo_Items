// Runtime-only signing key; never a per-record global suppression flag.
// This marker stays on the server Record through deferred after-commit hooks.
onBootstrap((e) => {
  e.next()
  $app.store().set('c2_confirmation_signing_key', $security.randomString(64))
})
