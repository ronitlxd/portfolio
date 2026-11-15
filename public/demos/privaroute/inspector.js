/* Block details. Text only (no HTML parsing). */
let inspectorRenderVersion = 0;
const ROUTE_NAMES = {local_slm: 'Local SLM', privacy_layer: 'Privacy Layer → Larger Model'};
const SOURCE_NAMES = {private_db: 'Private DB', session: 'Session Store', user: 'Your request', none: 'Your request', uncertain: 'Uncertain'};
function readableLabel(value) {
  return String(value).replace(/_/g, ' ').replace(/\bslm\b/gi,'SLM').replace(/\bllm\b/gi,'LLM').replace(/^./,c=>c.toUpperCase());
}
function detailElement(tag, text, className) {
  const el=document.createElement(tag);
  if(text!==undefined)el.textContent=String(text);
  if(className)el.className=className;
  return el;
}
function readableValue(value) {
  if(value===null || value===undefined)return detailElement('span','Not available');
  if(typeof value==='boolean')return detailElement('span',value?'Yes':'No');
  if(typeof value!=='object')return detailElement('span',value===''?'Not supplied':value);
  const entries=Array.isArray(value)?value.map((v,i)=>[`Item ${i+1}`,v]):Object.entries(value);
  if(!entries.length)return detailElement('p',Array.isArray(value)?'No entries.':'No values recorded.','detail-muted');
  const list=detailElement('dl',undefined,'detail-values');
  for(const [key,v] of entries){
    list.append(detailElement('dt',readableLabel(key)));
    const cell=detailElement('dd');
    cell.append(readableValue(v));
    list.append(cell);
  }
  return list;
}
function detailSection(root,title,value){
  const section=detailElement('section',undefined,'detail-section');
  section.append(detailElement('h3',title),readableValue(value));root.append(section);
}
// Flat text for one value: lists and records become short readable strings.
function shortText(value){
  if(value===null||value===undefined||value==='')return '—';
  if(typeof value==='boolean')return value?'Yes':'No';
  if(Array.isArray(value))return value.length?value.map(shortText).join('; '):'None';
  if(typeof value==='object'){
    const name=value.label??value.name??value.value;
    if(name!==undefined&&typeof name!=='object')return String(name);
    return Object.entries(value).map(([k,v])=>`${readableLabel(k)}: ${shortText(v)}`).join(', ');
  }
  return String(value);
}
// One titled list of key → value pairs.
function pairSection(root,title,pairs,empty='None.'){
  const section=detailElement('section',undefined,'detail-section');
  section.append(detailElement('h3',title));
  if(!pairs.length){section.append(detailElement('p',empty,'detail-muted'));root.append(section);return section;}
  const list=detailElement('dl',undefined,'detail-values');
  for(const [key,value] of pairs)list.append(detailElement('dt',key),detailElement('dd',shortText(value)));
  section.append(list);root.append(section);return section;
}
function note(root,text){root.append(detailElement('p',text,'detail-muted'));}
function renderStages(root,stages){
  if(!stages.length){note(root,'Not reached for this request.');return;}
  for(const stage of stages){
    const section=detailElement('section',undefined,'detail-section');
    section.append(detailElement('h3',stage.label||readableLabel(stage.id)));
    section.append(readableValue({status:readableLabel(stage.status||'waiting'),input:stage.input??{},output:stage.output??{}}));
    root.append(section);
  }
}
function stageOutput(block,id){return (block.stages||[]).find(stage=>stage.id===id)?.output||{};}

function renderDriverPrompt(root,block,options){
  const original=options.result?.prompt ?? block.input?.prompt ?? options.prompt ?? '';
  pairSection(root,'Entered prompt',[['Exactly as typed',original]]);
  note(root,'The next block, Prompt Cleanup, fixes spelling and format before the router reads it.');
}
const CHANGE_KINDS={format:'Spacing and punctuation',spelling:'Spelling',name:'Place or brand name'};
function renderCleanup(root,options){
  const result=options.result;
  if(!result?.cleaned_prompt){note(root,'No prompt has been cleaned yet.');return;}
  pairSection(root,'Prompt',[['As typed',result.prompt],['After cleanup (used from here on)',result.cleaned_prompt]]);
  const changes=(result.prompt_cleanup?.changes||[]).filter(c=>c.kind!=='format');
  pairSection(root,'Corrections',changes.map(c=>[`“${c.from}” → “${c.to}”`,CHANGE_KINDS[c.kind]||c.kind]),'No spelling corrections were needed.');
  if((result.prompt_cleanup?.changes||[]).some(c=>c.kind==='format'))note(root,'Spacing, capital letters and repeated punctuation were also tidied.');
  pairSection(root,'How it works',[['Runs','On this server, before the router; no model or online service is called'],
    ['Corrects towards','Driving commands and place types, common brands, sensitive health/finance/legal terms, and your saved names'],
    ['Never changes','Common words, numbers, codes and PINs, e-mail addresses, quoted text and message wording']]);
}
function renderRouter(root,options){
  const result=options.result;
  if(!result?.next_route&&!result?.routing){note(root,'No request has been routed yet.');return;}
  pairSection(root,'Route selected',[['Destination',ROUTE_NAMES[result.next_route]||result.next_route||'None'],['Reason',result.reason||result.routing?.reason]]);
  const policy=result.privacy_routing;
  if(policy){
    const COMPLEXITY={suitable:'Simple',uncertain:'Uncertain',needs_stronger_model:'Needs stronger reasoning'};
    pairSection(root,'How the route was decided',[['1. Complexity (router model)',COMPLEXITY[policy.decision.complexity]||policy.decision.complexity||'—'],
      ['2. Privacy tier',`${policy.tier} · ${policy.tier_name}`],['3. Decision',ROUTE_NAMES[policy.decision.next_route]||policy.decision.next_route],['Policy',policy.policy_version]]);
    pairSection(root,'Sensitive items found',policy.items.map(i=>[`“${i.text}”`,`${i.tier} · ${readableLabel(i.category)} · ${i.maskable?'can be masked':'cannot be masked'} · ${i.detector==='router'?'flagged by the router':i.detector==='context'?'saved data':i.detector==='pattern'?'pattern match':'sensitive-topic match'}`]),'None: the request is public.');
  }
  // Personal words come from the router model and from saved-name matching in Context Resolution.
  const flagged=new Map();
  for(const ref of result.routing?.references||[])flagged.set(ref.text.toLowerCase(),[`“${ref.text}”`,`${readableLabel(ref.type||'reference')} · flagged by the router`]);
  for(const f of result.context?.findings||[]){
    if(flagged.has(f.text.toLowerCase())||!['database_alias','session_binding'].includes(f.detector))continue;
    flagged.set(f.text.toLowerCase(),[`“${f.text}”`,`${readableLabel(f.type||'reference')} · matched a saved name`]);
  }
  pairSection(root,'Personal or context-dependent words',[...flagged.values()],'No personal or context-dependent words were found.');
  const masked=result.privacy?.masked_words||[];
  if(result.next_route==='privacy_layer')pairSection(root,'Masked before the larger model',masked.map(m=>[`“${m.original}”`,m.placeholder]),'No words needed masking.');
  else note(root,'Local route: nothing is masked because the request never leaves the local model.');
}
function renderContext(root,options){
  const context=options.result?.context;
  if(!context){note(root,'No context has been resolved yet.');return;}
  const findings=context.findings||[];
  const resolved=findings.filter(f=>f.status==='resolved');
  pairSection(root,'Resolved',resolved.map(f=>[`“${f.text}”`,`${f.label||'—'} (from ${SOURCE_NAMES[f.source]||readableLabel(f.source||'unknown')})`]),
    'Nothing personal needed resolving in this request.');
  const unresolved=(context.missing||[]).map(f=>[`“${f.text}”`,f.status==='ambiguous'?`Ambiguous: ${(f.candidates||[]).map(c=>c.label).join(', ')}`:'Not found in saved data']);
  if(unresolved.length)pairSection(root,'Needs clarification',unresolved);
  if(options.result?.clarification?.question)pairSection(root,'Question asked',[['Question',options.result.clarification.question]]);
  const ignored=findings.filter(f=>f.status==='not_required');
  if(ignored.length)pairSection(root,'Checked but not needed',ignored.map(f=>[`“${f.text}”`,readableLabel(f.type||'reference')]));
}
function renderPrivacy(root,options){
  const privacy=options.result?.privacy;
  if(!privacy){note(root,'Not used for this request: it stayed on the local path, so nothing was masked.');return;}
  pairSection(root,'Words masked',(privacy.masked_words||[]).map(m=>[`“${m.original}”`,`→ ${m.placeholder}`]),'No words from the request were masked.');
  if(privacy.hidden_saved_values)note(root,`${privacy.hidden_saved_values} saved private value(s) from context were also masked; they are not shown here.`);
  pairSection(root,'Text sent to the larger model',[['Masked request',privacy.sanitized_prompt]]);
  const legend=Object.entries(privacy.placeholders||{});
  if(legend.length)pairSection(root,'What the larger model is told about each placeholder',legend.map(([token,role])=>[token,role]));
  const trips=options.result?.task_facts?.driving_times||[];
  if(trips.length)pairSection(root,'Facts computed on the vehicle (sent instead of locations)',trips.map(t=>[`${t.from} → ${t.to}`,`${t.minutes} min${t.km!=null?` · ${t.km} km`:''}`]));
  const trip=options.result?.task_facts?.trip_options;
  if(trip)pairSection(root,'Trip options computed on the vehicle (fastest first)',trip.options.map(o=>[o.route.join(' → '),
    `${o.driving_minutes} min driving${o.total_with_stops_minutes!=null?` · ${o.total_with_stops_minutes} min with stops · ${o.fits_budget?'fits':'does not fit'} ${trip.time_budget_minutes} min`:''}`]));
  const restored=(options.result?.trace||[]).some(event=>event.id==='placeholder_restore'&&event.status==='complete');
  pairSection(root,'Restoration',[['Placeholders put back after the larger model',restored?'Yes':'Not reached']]);
}
function renderPrivateDatabase(root,data){
  const database=data.database||{};
  if(data.profile)pairSection(root,'Profile',[['Signed in as',data.profile.name],['Storage',data.profile.protected?"Encrypted with this profile's password":data.profile.id==='guest'?'Guest: no private data':'Sample database']]);
  for(const [table,records] of Object.entries(database)){
    if(table==='v2_metadata')continue;
    if(table==='entity_aliases'){
      pairSection(root,'Alternative names (aliases)',records.map(r=>[`“${r.alias}”`,`${r.entity_key} (${r.kind})`]));continue;
    }
    if(records.every(r=>'key' in r&&'value' in r)){pairSection(root,readableLabel(table),records.map(r=>[readableLabel(r.key),r.value]),'No entries.');continue;}
    if(!records.length){pairSection(root,readableLabel(table),[],'No entries.');continue;}
    records.forEach((record,index)=>{
      const title=record.label||record.alias||record.sender||`${readableLabel(table)} ${index+1}`;
      pairSection(root,`${readableLabel(table)} · ${title}`,Object.entries(record).map(([k,v])=>[readableLabel(k),table==='messages'&&k==='created'?new Date(v*1000).toLocaleString():v]));
    });
  }
}
function renderSession(root,data){
  const session=data.session||{};
  pairSection(root,'Session',[['Session ID',session.session_id],['Turns kept',`${(session.turns||[]).length} of ${session.retained_turn_limit}`],['Idle expiry',`${session.idle_expiry_minutes} minutes`]]);
  const state=session.application_state||{};
  pairSection(root,'Current state',Object.entries(state).map(([k,v])=>[readableLabel(k),v]));
  pairSection(root,'Remembered answers',(session.clarified_references||[]).map(r=>[`“${r.phrase}”`,`${shortText(r.value)} (${r.type})`]),'No answers remembered yet.');
  pairSection(root,'Recent references',Object.entries(session.references||{}).map(([k,v])=>[readableLabel(k),v]),'None yet.');
  pairSection(root,'Turns',(session.turns||[]).map((turn,i)=>[`${i+1}. “${turn.prompt}”`,`${readableLabel(turn.status)}${turn.answer?' · '+String(turn.answer).slice(0,140):''}`]),'No turns yet.');
  if(session.pending_request)pairSection(root,'Waiting on you',[['Request',session.pending_request.prompt],['Status',readableLabel(session.pending_request.status)]]);
}
function renderModel(live,block,data){
  pairSection(live,'Configured model',[['Model',data.models?.[block.id]]]);
}
function renderTools(root,block){
  const used=(block.stages||[]).filter(stage=>stage.id!=='tool_gateway');
  pairSection(root,'Used in this request',used.map(stage=>[stage.label,shortText(stage.output?.nearest?.name?`${stage.output.nearest.name}, ${stage.output.nearest.distance_m} m`:stage.output?.distance_m?`${(stage.output.distance_m/1000).toFixed(1)} km`:stage.input)]),'No tools were used for this request.');
  pairSection(root,'Services',[['Place search','OpenStreetMap Nominatim (exact names), Photon (spelling-tolerant fallback)'],['Driving routes','OSRM'],['Sent to services','Public search text, typed public addresses, coordinates only']]);
}
// Privacy receipt: what happened to the driver's data in this request (built on the server, no content).
function renderReceipt(root,receipt){
  if(!receipt){note(root,'No privacy receipt for this request yet.');return;}
  const a=receipt.answered_by||{};
  const link=place=>place.encrypted_link?'encrypted link':'UNENCRYPTED link';
  const rows=[['Answered by',`${readableLabel(a.by||'—')}${a.model?` (${a.model})`:''} · ${a.where==='this server'?'on this server':`at ${a.where}, ${link(a)}`}`]];
  if(receipt.router)rows.push(['Router',receipt.router.where==='this server'?'on this server':`at ${receipt.router.where}, ${link(receipt.router)}`]);
  if(receipt.tier)rows.push(['Privacy tier',`${receipt.tier} · ${receipt.tier_name}`]);
  if(receipt.kept_local_because)rows.push(['Kept on this server because',receipt.kept_local_because]);
  const sent=receipt.sent_to_larger_model;
  rows.push(['Sent to the larger model',sent?`Masked request: ${sent.placeholders} placeholder(s), ${sent.roles_described} role(s) described`
    +(sent.driving_times_shared?`, ${sent.driving_times_shared} driving time(s)`:'')+(sent.trip_options_shared?`, ${sent.trip_options_shared} trip option(s)`:''):'Nothing']);
  if(sent)rows.push(['Private values sent',`${sent.private_values_sent} (checked before sending)`]);
  rows.push(['Outside services',(receipt.outside_services||[]).length?receipt.outside_services.map(s=>`${s.service}: ${s.received}`).join('; '):'None']);
  for(const w of receipt.warnings||[])rows.push(['Warning',w]);
  pairSection(root,'Privacy receipt',rows);
}
async function renderBlockDetails(root,block,options){
  const version=++inspectorRenderVersion;
  root.replaceChildren();
  pairSection(root,'Status',[['This request',readableLabel(block.status)]]);
  if(block.id==='driver_prompt')return renderDriverPrompt(root,block,options);
  if(block.id==='cleanup_group')return renderCleanup(root,options);
  if(block.id==='router_group')return renderRouter(root,options);
  if(block.id==='context_group')return renderContext(root,options);
  if(block.id==='privacy_group')return renderPrivacy(root,options);
  if(block.id==='tools_group')return renderTools(root,block);
  if(block.id==='response'){
    renderReceipt(root,options.result?.privacy_receipt);
    if(Array.isArray(block.stages)){note(root,'From this request');renderStages(root,block.stages);}
    else{detailSection(root,'Input',block.input);detailSection(root,'Output',block.output);}
    return;
  }
  const live=['private_database','session_store','local_worker','larger_worker'].includes(block.id);
  if(!live){
    if(Array.isArray(block.stages)){note(root,'From this request');renderStages(root,block.stages);}
    else{detailSection(root,'Input',block.input);detailSection(root,'Output',block.output);}
    return;
  }
  if(block.id==='local_worker'||block.id==='larger_worker'){
    const output=stageOutput(block,block.id);
    pairSection(root,'This request',output.kind?[['Produced',readableLabel(output.kind)],['Model used',output.model]]:[],'Not used for this request.');
  }
  const panel=detailElement('section',undefined,'detail-section');root.append(panel);
  panel.append(detailElement('p','Loading current information…'));
  try{
    const data=await options.loadSnapshot();
    if(version!==inspectorRenderVersion)return;
    panel.replaceChildren();
    if(block.id==='private_database'||block.id==='session_store'){
      note(panel,'Live, read-only contents—not a snapshot from the selected history entry.');
      if(block.id==='private_database')renderPrivateDatabase(panel,data);else renderSession(panel,data);
    }else renderModel(panel,block,data);
  }catch(error){if(version===inspectorRenderVersion)panel.replaceChildren(detailElement('p',error.message));}
}
