/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const fornecedores = app.findCollectionByNameOrId('fornecedores')
    const linhas = app.findCollectionByNameOrId('linhas')

    if (!fornecedores.fields.getByName('cnpj')) {
      fornecedores.fields.add(new TextField({ name: 'cnpj' }))
    }
    if (!fornecedores.fields.getByName('telefone')) {
      fornecedores.fields.add(new TextField({ name: 'telefone' }))
    }
    if (!fornecedores.fields.getByName('website')) {
      fornecedores.fields.add(new TextField({ name: 'website' }))
    }
    if (!fornecedores.fields.getByName('endereco')) {
      fornecedores.fields.add(new TextField({ name: 'endereco' }))
    }
    if (!fornecedores.fields.getByName('cidade')) {
      fornecedores.fields.add(new TextField({ name: 'cidade' }))
    }
    if (!fornecedores.fields.getByName('estado')) {
      fornecedores.fields.add(new TextField({ name: 'estado' }))
    }
    if (!fornecedores.fields.getByName('pais')) {
      fornecedores.fields.add(new TextField({ name: 'pais' }))
    }
    if (!fornecedores.fields.getByName('cep')) {
      fornecedores.fields.add(new TextField({ name: 'cep' }))
    }
    if (!fornecedores.fields.getByName('itens_base_produz')) {
      fornecedores.fields.add(new TextField({ name: 'itens_base_produz' }))
    }
    if (!fornecedores.fields.getByName('linhas_ids')) {
      fornecedores.fields.add(
        new RelationField({
          name: 'linhas_ids',
          collectionId: linhas.id,
          cascadeDelete: false,
        }),
      )
    }
    if (!fornecedores.fields.getByName('observacoes')) {
      fornecedores.fields.add(new TextField({ name: 'observacoes' }))
    }

    app.save(fornecedores)
  },
  (app) => {
    const fornecedores = app.findCollectionByNameOrId('fornecedores')
    const fieldsToRemove = [
      'cnpj',
      'telefone',
      'website',
      'endereco',
      'cidade',
      'estado',
      'pais',
      'cep',
      'itens_base_produz',
      'linhas_ids',
      'observacoes',
    ]
    for (const f of fieldsToRemove) {
      try {
        fornecedores.fields.removeByName(f)
      } catch (_) {}
    }
    app.save(fornecedores)
  },
)
