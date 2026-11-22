import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function actions(auth, origin = 'http://localhost:3000') {
  const source = readFileSync(new URL('../app/actions/password.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, URL, require(name) {
    if (name === 'next/headers') return { headers: async () => new Headers(origin ? { origin } : {}) };
    if (name === '@/lib/auth/server') return { auth };
    throw new Error(`Unexpected import: ${name}`);
  } });
  return exports;
}
function form(values) {
  const result = new FormData();
  for (const [key, value] of Object.entries(values)) result.set(key, value);
  return result;
}

test('password requests reject invalid email and missing origin before calling Neon', async () => {
  const a = actions({});
  assert.match((await a.requestPassword(null, form({ email: 'invalid' }))).error, /valid email/);
  assert.match((await actions({}, null).requestPassword(null, form({ email: 'user@example.com' }))).error, /browser/);
});
test('password request uses the app origin, never a submitted redirect', async () => {
  let sent;
  const a = actions({ requestPasswordReset: async (body) => { sent = body; return {}; } });
  const result = await a.requestPassword(null, form({ email: 'user@example.com', redirectTo: 'https://other.example' }));
  assert.equal(result.success, true);
  assert.equal(sent.redirectTo, 'http://localhost:3000/auth/reset-password');
});
test('reset rejects missing tokens, weak passwords and mismatched confirmation', async () => {
  const a = actions({});
  assert.match((await a.resetPassword(null, form({}))).error, /invalid/);
  assert.match((await a.resetPassword(null, form({ token: 'token', password: 'short' }))).error, /8 and 128/);
  assert.match((await a.resetPassword(null, form({ token: 'token', password: 'long-password', confirm: 'different' }))).error, /do not match/);
});
test('reset sends the token and password to Neon and handles rejected tokens', async () => {
  let sent;
  const data = form({ token: 'token', password: 'long-password', confirm: 'long-password' });
  const a = actions({ resetPassword: async (body) => { sent = body; return {}; } });
  assert.equal((await a.resetPassword(null, data)).success, true);
  assert.equal(sent.token, 'token');
  assert.equal(sent.newPassword, 'long-password');
  assert.match((await actions({ resetPassword: async () => ({ error: { message: 'private detail' } }) }).resetPassword(null, data)).error, /expired/);
});
