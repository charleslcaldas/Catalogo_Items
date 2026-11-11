// Candidate number only. Check live migration ledger again before installation.
migrate(
  (app) => {
    app
      .db()
      .newQuery(
        'CREATE TABLE mei_quote_nonces_v1 (nonce TEXT PRIMARY KEY NOT NULL, expires INTEGER NOT NULL)',
      )
      .execute()
  },
  (app) => {
    app.db().newQuery('DROP TABLE mei_quote_nonces_v1').execute()
  },
)
