// O salvamento simples de precos/cotacoes_itens nao deve marcar a cotacao como finalizada.
// O status 'finalizada' e o congelamento sao reservados para o fluxo de aceitar cotacoes vencedoras.
// Este hook foi desativado para evitar congelar prematuramente a interface de cotacao.
onRecordAfterUpdateSuccess((e) => {
  return e.next()
}, 'cotacoes_itens')

onRecordAfterCreateSuccess((e) => {
  return e.next()
}, 'cotacoes_itens')
