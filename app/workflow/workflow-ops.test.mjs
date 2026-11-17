import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOp, applyOp, replay, replayLegacy, HistoryError } from './workflow-ops.ts';
import { createModel } from './workflow-model.ts';

const at = '2026-11-16T10:00:00Z';
const contractor = { role: 'Contractor', by: 'Casey (contractor)', at };
const consultant = { role: 'Consultant', by: 'Morgan (consultant)', at };
const get = (m, id) => m.elements.find(e => e.id === id);

test('parseOp keeps only known fields and ignores a role sent by the browser', () => {
  const op = parseOp({ op: 'transition', type: 'pass', id: 'GY-192', text: 'ok', role: 'Consultant', at: '1999-01-01' });
  assert.deepEqual(op, { op: 'transition', type: 'pass', id: 'GY-192', text: 'ok' });
});

test('parseOp rejects unknown operations, actions and oversized text', () => {
  assert.throws(() => parseOp({ op: 'deleteEverything' }), /Unknown operation/);
  assert.throws(() => parseOp({ op: 'transition', type: 'approve-all', id: 'GY-192', text: 'x' }), /Unknown action/);
  assert.throws(() => parseOp({ op: 'transition', type: 'comment', id: 'GY-192', text: 'x'.repeat(2001) }), /max 2000/);
  assert.throws(() => parseOp({ op: 'revisePlan', plan: [{ rule: 'Skip all', hours: 8 }], reason: 'x' }), /rule/);
  assert.throws(() => parseOp(null), /JSON object/);
});

test('the signed-in role decides what is allowed: a contractor cannot release a consultant hold', () => {
  const op = parseOp({ op: 'transition', type: 'pass', id: 'GY-192', text: 'Release please' });
  assert.throws(() => applyOp(createModel(), op, contractor), /cannot release/);
  const m = applyOp(createModel(), op, consultant);
  assert.equal(get(m, 'GY-192').light, 'green');
});

test('every event records the person who acted', () => {
  const m = applyOp(createModel(), parseOp({ op: 'transition', type: 'pass', id: 'GY-192', text: 'Released' }), consultant);
  const last = get(m, 'GY-192').events.at(-1);
  assert.equal(last.by, 'Morgan (consultant)');
  assert.equal(last.role, 'Consultant');
});

test('plan changes and decisions record who made them', () => {
  let m = applyOp(createModel(), parseOp({ op: 'proposePlan', plan: createModel().plan, reason: 'Trial' }), contractor);
  assert.equal(m.proposals[0].by, 'Casey (contractor)');
  m = applyOp(m, parseOp({ op: 'decideProposal', id: m.proposals[0].id, approve: false, reason: 'Not yet' }), consultant);
  assert.equal(m.proposals[0].decidedBy, 'Morgan (consultant)');
  m = applyOp(m, parseOp({ op: 'revisePlan', plan: m.plan, reason: 'Tighten' }), consultant);
  assert.match(m.planHistory[0], /by Morgan \(consultant\)/);
});

test('a role can only mark its own notifications as read', () => {
  const m0 = createModel();
  const all = m0.notices.map(n => n.id);
  const m = applyOp(m0, parseOp({ op: 'markRead', ids: all }), contractor);
  for (const n of m.notices) assert.equal(n.read, n.recipient === 'Contractor');
});

test('replaying saved history rebuilds the same state', () => {
  const history = [
    { ...consultant, op: parseOp({ op: 'transition', type: 'pass', id: 'GY-192', text: 'Released' }) },
    { ...contractor, op: parseOp({ op: 'transition', type: 'advance', id: 'GY-192', text: '', location: 'Crate 7' }) },
  ];
  const step = history.reduce((m, { op, ...actor }) => applyOp(m, op, actor), createModel());
  assert.deepEqual(replay(history), step);
  assert.equal(get(replay(history), 'GY-192').stage, 2);
});

test('replayLegacy rebuilds valid history and names the problem when the rules now forbid a saved change', () => {
  const ok = [{ ...contractor, op: { op: 'transition', type: 'comment', id: 'HY-142', text: 'Noted on site.' } }];
  assert.deepEqual(replayLegacy(ok), replay(ok));
  const broken = [{ ...contractor, op: { op: 'transition', type: 'comment', id: 'NO-SUCH', text: 'x' } }];
  assert.throws(() => replayLegacy(broken), (e) => e instanceof HistoryError && /could not be rebuilt: Element not found/.test(e.message));
});
