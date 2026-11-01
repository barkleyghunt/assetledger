export type Role = "Contractor" | "Consultant";
export type Rule = "Record only" | "Team check" | "Consultant review" | "Hold point";
export type Light = "red" | "amber" | "green";
export type Gate = { rule: Rule; hours: number; version: number };
export type Event = { id: number; at: string; role: Role; stage: number; text: string; kind: "Comment" | "Question" | "Decision" | "Progress" | "Evidence" };
export type Element = { evidenceVersion: number; id: string; name: string; stage: number; gate: Gate; light: Light; submitted: boolean; question: boolean; questionBy?: Role; contractorPassed: boolean; consultantPassed: boolean; contractorHold: boolean; consultantHold: boolean; note: string; evidence: string; location: string; events: Event[]; due?: string };
export type Notice = { id: number; recipient: Role; element: string; text: string; at: string; read: boolean };
export type Proposal = { id: number; plan: Gate[]; baseVersion: number; reason: string; at: string; status: "Pending" | "Approved" | "Rejected"; decision?: string; decidedAt?: string };
export type Review = { evidenceVersion: number; id: number; element: string; stage: number; evidence: string; at: string; status: "Pending" | "Accepted" | "Full-Stop"; decision?: string };
export type Model = { reviews: Review[]; elements: Element[]; plan: Gate[]; version: number; planHistory: string[]; notices: Notice[]; sequence: number; proposals: Proposal[] };
export const stages = ["Identification", "Removal & salvage", "Piece labelling", "Crating", "Crate labelling", "Transportation", "Offsite receipt", "Storage placement"];
export const criteria = ["Confirm the original ID, condition and drawing location.", "Record the removal method, protection and post-removal condition.", "Confirm the piece label is readable and matches the original ID.", "Record crate ID, contents, packing and protection.", "Verify the external crate label against its contents manifest.", "Record carrier, dispatch condition, destination and custody transfer.", "Record receiving person, arrival condition and any discrepancies.", "Record the exact building, zone, rack/bay and position."];
export function needsConsultant(e: Element): boolean { return e.gate.rule === "Consultant review" || e.gate.rule === "Hold point" || e.consultantHold || e.question && e.questionBy === "Consultant"; }
export function nextReviewer(e: Element): Role { return !e.contractorPassed || e.contractorHold ? "Contractor" : needsConsultant(e) && !e.consultantPassed ? "Consultant" : "Contractor"; }
export function canContinue(e:Element):boolean { return e.submitted && e.contractorPassed && !e.contractorHold && !e.consultantHold && !e.question && (e.gate.rule !== "Hold point" || e.consultantPassed); }
function lightFor(e: Element): Light {
  if (e.contractorHold || e.consultantHold || e.gate.rule === "Hold point" && e.submitted && e.contractorPassed && !e.consultantPassed) return "red";
  return e.submitted && e.contractorPassed && (!needsConsultant(e) || e.consultantPassed) && !e.question ? "green" : "amber";
}
export function createModel(): Model {
 const plan: Gate[] = stages.map((_,i)=>({rule:i===1||i===5?"Hold point":"Team check",hours:8,version:1}));
 const blank={evidenceVersion:0,question:false,contractorPassed:false,consultantPassed:false,contractorHold:false,consultantHold:false};
 const elements: Element[]=[
  {...blank,id:"GY-192",name:"Carved limestone cornice",stage:1,gate:{...plan[1]},light:"red",submitted:true,contractorPassed:true,consultantHold:true,note:"Contractor internal check complete. Consultant release required for lifting support.",evidence:"Synthetic evidence summary: original ID verified; existing crack noted; padded lifting support proposed. No actual photographs attached.",location:"West elevation · Bay 04",events:[{id:1,at:"2026-11-01T13:00:00Z",role:"Contractor",stage:1,kind:"Decision",text:"Demo contractor internal check passed; submitted for consultant hold release."}],due:"2026-11-01T21:00:00Z"},
  {...blank,id:"JW-582",name:"Limestone window surround",stage:3,gate:{...plan[3]},light:"amber",submitted:false,question:true,questionBy:"Consultant",note:"Does this packing support the exposed corner?",evidence:"",location:"Repair Bay · Rack 03",events:[{id:2,at:"2026-11-01T13:10:00Z",role:"Consultant",stage:3,kind:"Question",text:"Please describe the proposed corner protection before crating."}]},
  {...blank,id:"UB-038",name:"Green marble entrance panel",stage:4,gate:{...plan[4]},light:"green",submitted:true,contractorPassed:true,note:"Demo contractor internal check: crate label and manifest match.",evidence:"Synthetic check: Crate 12 label matches UB-038 on the demo manifest.",location:"Crate 12 · Indoor store",events:[{id:3,at:"2026-11-01T13:15:00Z",role:"Contractor",stage:4,kind:"Decision",text:"Demo internal check passed: crate label verified; no consultant approval required by this stage plan."}]},
  {...blank,id:"HY-142",name:"Limestone parapet coping",stage:0,gate:{...plan[0]},light:"amber",submitted:false,note:"",evidence:"",location:"East elevation · Parapet E-12",events:[]},
 ];
 return {elements,plan,reviews:[],version:1,proposals:[],planHistory:["Version 1 · illustrative consultant oversight plan. No real delegated authority or contractual agreement is recorded."],notices:[{id:4,recipient:"Consultant",element:"GY-192",text:"Internal check complete; removal hold awaits your release.",at:"2026-11-01T13:00:00Z",read:false},{id:5,recipient:"Contractor",element:"JW-582",text:"New consultant question about corner protection.",at:"2026-11-01T13:10:00Z",read:false},{id:6,recipient:"Contractor",element:"UB-038",text:"Crate labelling passed. Start the next stage when ready.",at:"2026-11-01T13:15:00Z",read:false}],sequence:7};
}
export type Action = { confirmed?: boolean; type:"evidence"|"comment"|"question"|"submit"|"pass"|"hold"|"advance"|"complete"|"require-review"; id:string; role:Role; text:string; at:string; location?:string };
export function transition(model:Model, action:Action):Model {
 if(action.type==="complete") {
  if(action.role!=="Contractor")throw new Error("Only the contractor records field completion.");
  const original=model.elements.find(e=>e.id===action.id);
  if(!original)throw new Error("Element not found.");
  if(!action.confirmed)throw new Error("Confirm the stage checklist first.");
  if(!action.text.trim())throw new Error("Describe the evidence and completed check.");
  if(original.contractorHold || original.question)throw new Error("Resolve the open question or Full-Stop using the review actions before continuing.");
  let next=model;
  if(!original.submitted) {
   next=transition(next,{...action,type:"evidence"});
   next=transition(next,{...action,type:"submit"});
  }
  const prepared=next.elements.find(e=>e.id===action.id)!;
  if(!prepared.contractorPassed)next=transition(next,{...action,type:"pass"});
  const checked=next.elements.find(e=>e.id===action.id)!;
  if(canContinue(checked)&&checked.stage<7)next=transition(next,{...action,type:"advance"});
  return next;
 }
 const element=model.elements.find(e=>e.id===action.id);
 if(!element) throw new Error("Element not found.");
 const e:Element={...element,gate:{...element.gate},events:[...element.events]};
 const text=action.text.trim();
 let eventText=text,kind:Event["kind"]="Comment",recipient:Role=action.role==="Contractor"?"Consultant":"Contractor";
 if(["evidence","comment","question","pass","hold","require-review"].includes(action.type)&&!text)throw new Error("Add a note before continuing.");
 if(["evidence","submit","advance"].includes(action.type)&&action.role!=="Contractor")throw new Error("Switch to the contractor simulation for field actions.");
 if(action.type==="require-review") {
  if(action.role!=="Consultant")throw new Error("Only the consultant can add a current-stage approval requirement.");
  e.gate={...e.gate,rule:"Hold point"};e.consultantHold=true;e.consultantPassed=false;e.note=text;kind="Decision";recipient="Contractor";
  eventText=`Consultant added a current-stage hold point — ${text}. Existing contractor evidence/check retained.`;
 }
 if(action.type==="evidence") {
  if(e.submitted||e.light==="green")throw new Error("Submitted evidence is frozen. Place a Full-Stop before revising it.");
  e.evidence=text;e.evidenceVersion++;e.contractorPassed=false;e.consultantPassed=false;kind="Evidence";eventText=`Demo evidence summary recorded: ${text}`;
 }
 if(action.type==="question") {
  // A question from either party invalidates the green light; consultant questions require a consultant response.
  e.question=true;
  if(e.questionBy!=="Consultant"||action.role==="Consultant")e.questionBy=action.role;
  if(action.role==="Consultant")e.consultantPassed=false;else e.contractorPassed=false;
  e.note=text;kind="Question";
 }
 if(action.type==="submit") {
  if(!e.evidence.trim())throw new Error("Record a demonstration evidence summary first.");
  if(e.submitted||e.light==="green")throw new Error("This stage is already submitted or passed.");
  e.submitted=true;e.contractorPassed=e.gate.rule==="Record only"&&!e.contractorHold&&!e.question;
  e.due=new Date(Date.parse(action.at)+e.gate.hours*3600000).toISOString();kind="Progress";
  e.note=e.contractorPassed?"Record-only evidence submitted.":"Evidence submitted; contractor internal check required.";
  eventText=`Evidence submitted under plan v${e.gate.version}: ${e.gate.rule}.`;recipient=nextReviewer(e);
 }
 if(action.type==="pass") {
  if(!e.submitted||!e.evidence.trim())throw new Error("Evidence must be submitted before a pass.");
  if(action.role==="Contractor") {
   if(e.contractorPassed&&!e.contractorHold&&!(e.question&&e.questionBy==="Contractor"))throw new Error("Internal check already passed. A contractor cannot release consultant approval or holds.");
   e.contractorPassed=true;e.contractorHold=false;
   if(e.questionBy==="Contractor"){e.question=false;e.questionBy=undefined;}
   eventText=`Contractor internal check passed — ${text}`;
   recipient=needsConsultant(e)?"Consultant":"Contractor";
  } else {
   if(!e.contractorPassed||e.contractorHold)throw new Error("Contractor internal check must pass before consultant release.");
   if(!needsConsultant(e))throw new Error("This stage has no consultant approval requirement or consultant issue.");
   if(e.consultantPassed&&!e.consultantHold&&!e.question)throw new Error("Consultant approval already recorded.");
   e.consultantPassed=true;e.consultantHold=false;
   if(e.questionBy==="Consultant"){e.question=false;e.questionBy=undefined;}
   eventText=`Consultant approval / hold release — ${text}`;recipient="Contractor";
  }
  e.note=text;kind="Decision";
  if(nextReviewer(e)==="Consultant"&&action.role==="Contractor")e.due=new Date(Date.parse(action.at)+e.gate.hours*3600000).toISOString();
 }
 if(action.type==="hold") {
  if(action.role==="Consultant")e.consultantHold=true;else e.contractorHold=true;
  e.submitted=false;e.contractorPassed=false;e.consultantPassed=false;e.due=undefined;
  e.note=text;kind="Decision";recipient="Contractor";eventText=`${action.role} Full-Stop — ${text}. Evidence must be resubmitted and both required checks repeated.`;
 }
 if(action.type==="advance") {
  if(!canContinue(e))throw new Error("All required checks must pass and questions and holds must be resolved before advancing.");
  if(e.stage===stages.length-1)throw new Error("This demonstration journey is complete.");
  if(!action.location?.trim())throw new Error("Record the next working location before advancing.");
  e.stage++;e.gate={...model.plan[e.stage]};e.submitted=false;e.question=false;e.questionBy=undefined;e.contractorPassed=false;e.consultantPassed=false;e.contractorHold=false;e.consultantHold=false;e.evidence="";e.evidenceVersion=0;e.note="";e.due=undefined;e.location=action.location.trim();kind="Progress";recipient="Contractor";
  eventText=`Started ${stages[e.stage]} at ${e.location}; plan v${e.gate.version}. New evidence and checks required.`;
 }
 e.light=lightFor(e);
 e.events.push({id:model.sequence,at:action.at,role:action.role,stage:e.stage,kind,text:eventText});
 let reviews=model.reviews;
 if(action.type==="pass"&&action.role==="Contractor"&&e.gate.rule==="Consultant review") {
  reviews=[...reviews,{evidenceVersion:e.evidenceVersion,id:model.sequence,element:e.id,stage:e.stage,evidence:e.evidence,at:action.at,status:"Pending"}];
 }
 if(action.type==="pass"&&action.role==="Consultant")reviews=reviews.map(r=>r.element===e.id&&r.stage===e.stage&&r.status==="Pending"?{...r,status:"Accepted",decision:text}:r);
 return {...model,reviews,elements:model.elements.map(x=>x.id===e.id?e:x),sequence:model.sequence+2,notices:[{id:model.sequence+1,recipient,element:e.id,text:`${stages[e.stage]} · ${eventText}`,at:action.at,read:false},...model.notices]};
}
function validatePlan(plan:Gate[],reason:string) {
 if(!reason.trim())throw new Error("A reason is required.");
 if(plan.length!==stages.length||plan.some(g=>!["Record only","Team check","Consultant review","Hold point"].includes(g.rule)||!Number.isFinite(g.hours)||g.hours<1||g.hours>168))throw new Error("Use valid stage requirements and targets between 1 and 168 elapsed hours.");
}
export function revisePlan(model:Model,plan:Gate[],reason:string,role:Role,at:string):Model {
 if(role!=="Consultant")throw new Error("Only the consultant can authorize oversight changes on behalf of the client. Contractors submit change requests.");
 validatePlan(plan,reason);
 const version=model.version+1;
 return {...model,version,plan:plan.map(g=>({rule:g.rule,hours:g.hours,version})),planHistory:[`${at} · Version ${version} · Consultant authorization (demo): ${reason.trim()}. Subsequent stage starts only; existing checks and holds retained.`,...model.planHistory],sequence:model.sequence+1,notices:[{id:model.sequence,recipient:"Contractor",element:"",text:`Consultant published oversight plan v${version}: ${reason.trim()}. Current holds unchanged.`,at,read:false},...model.notices]};
}
export function proposePlan(model:Model,plan:Gate[],reason:string,role:Role,at:string):Model {
 if(role!=="Contractor")throw new Error("Change requests are submitted by the contractor.");
 validatePlan(plan,reason);
 if(model.proposals.some(p=>p.status==="Pending"))throw new Error("A change request is already awaiting consultant decision.");
 return {...model,sequence:model.sequence+2,proposals:[{id:model.sequence,plan:plan.map(g=>({...g})),baseVersion:model.version,reason:reason.trim(),at,status:"Pending"},...model.proposals],notices:[{id:model.sequence+1,recipient:"Consultant",element:"",text:`Contractor requests an oversight change: ${reason.trim()}`,at,read:false},...model.notices]};
}
export function decideProposal(model:Model,id:number,approve:boolean,reason:string,role:Role,at:string):Model {
 if(role!=="Consultant")throw new Error("Only the consultant can decide an oversight change request.");
 const proposal=model.proposals.find(p=>p.id===id);
 if(!proposal||proposal.status!=="Pending")throw new Error("This request is no longer pending.");
 if(!reason.trim())throw new Error("Record the consultant decision reason.");
 if(approve&&proposal.baseVersion!==model.version)throw new Error("The plan changed since this request. Reject it and ask for a new request against the current version.");
 const next=approve?revisePlan(model,proposal.plan,`Contractor request: ${proposal.reason}. Decision: ${reason}`,role,at):model;
 return {...next,sequence:next.sequence+1,proposals:next.proposals.map(p=>p.id===id?{...p,status:approve?"Approved":"Rejected",decision:reason.trim(),decidedAt:at}:p),notices:[{id:next.sequence,recipient:"Contractor",element:"",text:`Oversight change request ${approve?"approved":"rejected"}: ${reason.trim()}`,at,read:false},...next.notices]};
}

export function decideReview(model:Model,id:number,accept:boolean,reason:string,role:Role,at:string):Model {
 if(role!=="Consultant")throw new Error("Only the consultant can decide a review.");
 if(!reason.trim())throw new Error("Add a review decision reason.");
 const review=model.reviews.find(r=>r.id===id);
 if(!review||review.status!=="Pending")throw new Error("Review is no longer pending.");
 const current=model.elements.find(e=>e.id===review.element)!;
 let next=model;
 if(!accept)next=transition(model,{id:review.element,type:"hold",role,text:`Issue in ${stages[review.stage]} review: ${reason}`,at});
 else if(current.stage===review.stage&&current.evidenceVersion===review.evidenceVersion&&current.gate.rule==="Consultant review"&&!current.consultantHold&&!current.contractorHold&&current.submitted&&current.contractorPassed)next=transition(model,{id:review.element,type:"pass",role,text:reason,at});
 else {
  const event:Event={id:model.sequence,at,role,stage:review.stage,kind:"Decision",text:`Earlier-stage evidence review accepted — ${reason}. Current-stage approval unchanged.`};
  next={...model,elements:model.elements.map(e=>e.id===review.element?{...e,events:[...e.events,event]}:e),sequence:model.sequence+2,notices:[{id:model.sequence+1,element:review.element,recipient:"Contractor",at,read:false,text:`${stages[review.stage]} review accepted: ${reason}`},...model.notices]};
 }
 return {...next,reviews:next.reviews.map(r=>r.id===id?{...r,status:accept?"Accepted":"Full-Stop",decision:reason.trim()}:r)};
}
