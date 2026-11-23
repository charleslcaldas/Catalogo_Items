if(typeof onRecordUpdateRequest==='function' && typeof onRecordCreateRequest==='function' && typeof onRecordDeleteRequest==='function'){
routerAdd('GET', '/backend/v1/cotacoes/compatibilidade', (e) => {
  const auth=e.requestInfo().auth
  if(!auth)return e.json(401,{error:'nao_autenticado'})
  const isSuperuser=auth.collection().name==='_superusers'
  const isOwner=auth.collection().name==='users'&&auth.getString('email')==='charles@c2international.com.br'
  if(!isSuperuser&&!isOwner)return e.json(403,{error:'acesso_negado'})
  const capabilities={
    canAccessRecord:typeof $app.canAccessRecord==='function',runInTransaction:typeof $app.runInTransaction==='function',
    onRecordUpdateRequest:true,onRecordCreateRequest:true,onRecordDeleteRequest:true,
    hasSuperuserAuth:typeof e.hasSuperuserAuth==='function',randomString:typeof $security.randomString==='function',
    hs256:typeof $security.hs256==='function',equal:typeof $security.equal==='function'
  }
  const missing=Object.keys(capabilities).filter(k=>!capabilities[k])
  let ownRecordRuleCheck=false
  if(!missing.length){
    try{
      $app.runInTransaction((tx)=>{
        const fresh=tx.findRecordById(auth.collection().name,auth.id)
        const info=e.requestInfo();info.auth=fresh
        ownRecordRuleCheck=tx.canAccessRecord(fresh,info,fresh.collection().viewRule)
      })
    }catch(_){return e.json(200,{ok:false,capabilities,check:'read_transaction_failed',runtime_version:null})}
  }
  return e.json(200,{ok:!missing.length&&ownRecordRuleCheck,capabilities,own_record_rule_check:ownRecordRuleCheck,runtime_version:null})
},$apis.requireAuth())
}else{
routerAdd('GET','/backend/v1/cotacoes/compatibilidade',(e)=>{
 const auth=e.requestInfo().auth
 if(!auth)return e.json(401,{error:'nao_autenticado'})
 if(auth.collection().name!=='_superusers' && !(auth.collection().name==='users'&&auth.getString('email')==='charles@c2international.com.br'))return e.json(403,{error:'acesso_negado'})
 return e.json(200,{ok:false,check:'request_hook_registrars_unavailable_in_loader',runtime_version:null})
},$apis.requireAuth())
}
