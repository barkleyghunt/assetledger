import test from 'node:test';
import assert from 'node:assert/strict';
import { createModel, transition, revisePlan, proposePlan, decideProposal, needsConsultant, nextReviewer } from './workflow-model.ts';
const at='2026-11-01T14:00:00Z';
const act=(id,type,role='Contractor',text='Synthetic check',location='Crate 12')=>({id,type,role,text,location,at});
const lightPlan=m=>m.plan.map(g=>({...g,rule:'Record only'}));
const get=(m,id)=>m.elements.find(e=>e.id===id);
test('contractor internal pass cannot release a consultant hold, even after resubmission',()=>{
 let m=createModel();
 assert.throws(()=>transition(m,act('GY-192','pass')),/cannot release/);
 m=transition(m,act('GY-192','hold','Contractor','Internal concern'));
 m=transition(m,act('GY-192','evidence'));
 m=transition(m,act('GY-192','submit'));
 assert.throws(()=>transition(m,act('GY-192','pass','Consultant')),/internal check/);
 m=transition(m,act('GY-192','pass'));
 assert.equal(get(m,'GY-192').contractorPassed,true);
 assert.equal(get(m,'GY-192').consultantHold,true);
 assert.equal(get(m,'GY-192').light,'red');
 assert.equal(nextReviewer(get(m,'GY-192')),'Consultant');
 assert.throws(()=>transition(m,act('GY-192','advance')),/required checks/);
 m=transition(m,act('GY-192','pass','Consultant'));
 assert.equal(get(m,'GY-192').light,'green');
 assert.equal(m.notices[0].recipient,'Contractor');
});
test('consultant cannot substitute for contractor internal verification',()=>{
 let m=createModel();m=transition(m,act('HY-142','evidence'));m=transition(m,act('HY-142','submit'));
 assert.throws(()=>transition(m,act('HY-142','pass','Consultant')),/internal check/);
 m=transition(m,act('HY-142','pass'));
 assert.equal(get(m,'HY-142').light,'green');
 assert.throws(()=>transition(m,act('HY-142','pass','Consultant')),/no consultant approval/);
});
test('contractor change request cannot authorize a plan or approve its own request',()=>{
 let m=createModel();
 assert.throws(()=>revisePlan(m,lightPlan(m),'Accepted trials','Contractor',at),/Only the consultant/);
 m=proposePlan(m,lightPlan(m),'Accepted trials','Contractor',at);
 assert.equal(m.version,1);assert.equal(m.plan[1].rule,'Hold point');
 assert.equal(m.proposals[0].status,'Pending');assert.equal(m.notices[0].recipient,'Consultant');
 assert.throws(()=>decideProposal(m,m.proposals[0].id,true,'Approved','Contractor',at),/Only the consultant/);
 assert.throws(()=>proposePlan(m,m.plan,'Another request','Contractor',at),/already awaiting/);
 m=decideProposal(m,m.proposals[0].id,true,'Accepted packing trials','Consultant',at);
 assert.equal(m.version,2);assert.equal(m.plan[1].rule,'Record only');assert.equal(m.proposals[0].status,'Approved');
 assert.equal(get(m,'GY-192').gate.version,1);assert.equal(get(m,'GY-192').light,'red');assert.equal(get(m,'GY-192').consultantHold,true);
});
test('rejection leaves the plan intact and records the consultant reason',()=>{
 let m=createModel();m=proposePlan(m,lightPlan(m),'Simplify','Contractor',at);
 m=decideProposal(m,m.proposals[0].id,false,'Further trial evidence required','Consultant',at);
 assert.equal(m.version,1);assert.equal(m.proposals[0].status,'Rejected');assert.equal(m.proposals[0].decision,'Further trial evidence required');
 assert.equal(m.notices[0].recipient,'Contractor');
});
test('stale and already-decided proposals cannot overwrite a newer plan',()=>{
 let m=createModel();m=proposePlan(m,lightPlan(m),'Simplify','Contractor',at);
 m=revisePlan(m,m.plan,'Separate revision','Consultant',at);
 assert.throws(()=>decideProposal(m,m.proposals[0].id,true,'Accept','Consultant',at),/plan changed/);
 m=decideProposal(m,m.proposals[0].id,false,'Please resubmit','Consultant',at);
 assert.throws(()=>decideProposal(m,m.proposals[0].id,true,'Accept','Consultant',at),/no longer pending/);
});
test('new stages use the new plan while retaining original stage decisions',()=>{
 let m=createModel();m=revisePlan(m,lightPlan(m),'Future stages only','Consultant',at);
 m=transition(m,act('GY-192','pass','Consultant'));m=transition(m,act('GY-192','advance'));
 const e=get(m,'GY-192');assert.equal(e.stage,2);assert.equal(e.gate.version,2);assert.equal(e.light,'amber');assert.equal(e.contractorPassed,false);assert.equal(e.consultantPassed,false);assert.equal(e.evidence,'');
 assert.ok(e.events.some(event=>event.text.includes('Consultant approval')));
 m=transition(m,act('GY-192','evidence'));m=transition(m,act('GY-192','submit'));
 assert.equal(get(m,'GY-192').light,'green');
});
test('consultant questions require a consultant resolution even on team-check stages',()=>{
 let m=createModel();m=transition(m,act('UB-038','question','Consultant','Label unclear'));
 assert.equal(get(m,'UB-038').light,'amber');assert.equal(needsConsultant(get(m,'UB-038')),true);
 assert.throws(()=>transition(m,act('UB-038','pass')),/cannot release/);
 m=transition(m,act('UB-038','comment','Contractor','It looks fine'));
 assert.equal(get(m,'UB-038').light,'amber');
 m=transition(m,act('UB-038','pass','Consultant','Label evidence accepted'));
 assert.equal(get(m,'UB-038').light,'green');assert.equal(get(m,'UB-038').question,false);
});
test('new evidence invalidates both decisions and preserves consultant hold',()=>{
 let m=createModel();m=transition(m,act('GY-192','pass','Consultant'));
 assert.throws(()=>transition(m,act('GY-192','evidence')),/frozen/);
 m=transition(m,act('GY-192','hold','Consultant','Revised packing needs review'));
 m=transition(m,act('GY-192','evidence'));
 assert.equal(get(m,'GY-192').contractorPassed,false);assert.equal(get(m,'GY-192').consultantPassed,false);assert.equal(get(m,'GY-192').consultantHold,true);
 m=transition(m,act('GY-192','submit'));m=transition(m,act('GY-192','pass'));
 assert.equal(get(m,'GY-192').light,'red');
});
test('field roles, evidence, reasons and target validation',()=>{
 const m=createModel();assert.throws(()=>transition(m,act('HY-142','submit')),/summary first/);
 assert.throws(()=>transition(m,act('HY-142','evidence','Consultant')),/contractor simulation/);
 assert.throws(()=>revisePlan(m,m.plan,'','Consultant',at),/reason/);
 assert.throws(()=>revisePlan(m,m.plan.map(g=>({...g,hours:0})),'Invalid','Consultant',at),/targets/);
 assert.throws(()=>transition(m,act('GY-192','pass','Consultant','')),/note/);
});
test('full eight-stage journey requires separate consultant passes at hold points',()=>{
 let m=createModel();
 for(let i=0;i<8;i++){
  m=transition(m,act('HY-142','evidence'));m=transition(m,act('HY-142','submit'));m=transition(m,act('HY-142','pass'));
  if(needsConsultant(get(m,'HY-142'))){assert.notEqual(get(m,'HY-142').light,'green');m=transition(m,act('HY-142','pass','Consultant'));}
  assert.equal(get(m,'HY-142').light,'green');if(i<7)m=transition(m,act('HY-142','advance'));
 }
 assert.equal(get(m,'HY-142').stage,7);assert.equal(get(m,'HY-142').events.filter(e=>e.kind==='Decision').length,10);
 assert.throws(()=>transition(m,act('HY-142','advance')),/complete/);
});

import { canContinue, decideReview } from './workflow-model.ts';
test('routine completion records evidence and check then advances atomically',()=>{
 let m=createModel();
 assert.throws(()=>transition(m,{...act('HY-142','complete'),confirmed:false}),/checklist/);
 assert.throws(()=>transition(m,{...act('HY-142','complete'),confirmed:true,location:''}),/location/);
 assert.equal(get(m,'HY-142').submitted,false);
 m=transition(m,{...act('HY-142','complete'),confirmed:true});
 assert.equal(get(m,'HY-142').stage,1);
 assert.equal(get(m,'HY-142').light,'amber');
 assert.ok(get(m,'HY-142').events.some(e=>e.kind==='Evidence'));
 assert.ok(get(m,'HY-142').events.some(e=>e.kind==='Decision'));
});
test('hold point completion prepares evidence without bypassing consultant release',()=>{
 let m=createModel();m=transition(m,{...act('HY-142','complete'),confirmed:true});
 m=transition(m,{...act('HY-142','complete'),confirmed:true});
 assert.equal(get(m,'HY-142').stage,1);assert.equal(get(m,'HY-142').light,'red');
 assert.equal(get(m,'HY-142').contractorPassed,true);assert.equal(canContinue(get(m,'HY-142')),false);
 m=transition(m,act('HY-142','pass','Consultant'));
 m=transition(m,{...act('HY-142','complete'),confirmed:true});
 assert.equal(get(m,'HY-142').stage,2);
});
test('consultant can require approval for current labelling without discarding internal check',()=>{
 let m=createModel();
 assert.throws(()=>transition(m,act('UB-038','require-review','Contractor')),/Only the consultant/);
 m=transition(m,act('UB-038','require-review','Consultant','Verify the label before dispatch'));
 assert.equal(get(m,'UB-038').light,'red');assert.equal(get(m,'UB-038').contractorPassed,true);
 assert.equal(get(m,'UB-038').gate.rule,'Hold point');
 assert.throws(()=>transition(m,act('UB-038','advance')),/required checks/);
 m=transition(m,act('UB-038','pass','Consultant'));
 assert.equal(get(m,'UB-038').light,'green');
});
test('non-blocking review retains evidence after advancement and acceptance never approves later work',()=>{
 let m=createModel();
 m={...m,elements:m.elements.map(e=>e.id==='HY-142'?{...e,gate:{...e.gate,rule:'Consultant review'}}:e)};
 m=transition(m,{...act('HY-142','complete'),confirmed:true});
 assert.equal(get(m,'HY-142').stage,1);assert.equal(m.reviews.length,1);assert.equal(m.reviews[0].stage,0);
 assert.equal(m.reviews[0].status,'Pending');assert.equal(m.reviews[0].evidence,'Synthetic check');
 assert.throws(()=>decideReview(m,m.reviews[0].id,true,'Accept','Contractor',at),/Only the consultant/);
 m=decideReview(m,m.reviews[0].id,true,'Evidence accepted','Consultant',at);
 assert.equal(m.reviews[0].status,'Accepted');assert.equal(get(m,'HY-142').consultantPassed,false);
 assert.equal(get(m,'HY-142').stage,1);
});
test('issue from a background review stops current work and cannot auto-release',()=>{
 let m=createModel();m={...m,elements:m.elements.map(e=>e.id==='HY-142'?{...e,gate:{...e.gate,rule:'Consultant review'}}:e)};
 m=transition(m,{...act('HY-142','complete'),confirmed:true});
 m=decideReview(m,m.reviews[0].id,false,'Evidence mismatch','Consultant',at);
 assert.equal(get(m,'HY-142').consultantHold,true);assert.equal(get(m,'HY-142').light,'red');
 assert.equal(m.reviews[0].status,'Full-Stop');
 assert.throws(()=>transition(m,act('HY-142','advance')),/required checks/);
});


test('accepting an older review cannot clear a later explicit consultant hold',()=>{
 let m=createModel();m={...m,elements:m.elements.map(e=>e.id==='HY-142'?{...e,gate:{...e.gate,rule:'Consultant review'}}:e)};
 m=transition(m,act('HY-142','evidence'));m=transition(m,act('HY-142','submit'));m=transition(m,act('HY-142','pass'));
 const review=m.reviews[0];
 m=transition(m,act('HY-142','require-review','Consultant','Additional release needed'));
 m=decideReview(m,review.id,true,'Original evidence accepted','Consultant',at);
 assert.equal(get(m,'HY-142').consultantHold,true);assert.equal(get(m,'HY-142').light,'red');
 assert.equal(get(m,'HY-142').consultantPassed,false);
});
