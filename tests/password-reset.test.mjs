import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHmac, randomBytes } from 'node:crypto';
import { createAuth, verifyPassword } from '../packages/auth/dist/index.js';
import { User } from '../packages/auth/dist/models/User.js';
import { RefreshToken } from '../packages/auth/dist/models/RefreshToken.js';
import { PasswordReset } from '../packages/auth/dist/models/PasswordReset.js';
import { createAccessToken, createRefreshToken } from '../packages/auth/dist/tokens.js';
import { resolveConfig } from '../packages/auth/dist/types.js';
import nodemailer from 'nodemailer';
import { createSmtpPasswordResetSender } from '../packages/auth/dist/index.js';

const id = '1234567890abcdef12345678';
const config = () => resolveConfig({ accessTokenSecret: randomBytes(32).toString('hex'),
  refreshTokenSecret: randomBytes(32).toString('hex'), passwordRounds: 10 });
const ctx = body => ({ body, response: { success: (data, message) => ({ data, message }) } });
const hash = (c, kind, value) => createHmac('sha256', c.refreshTokenSecret)
  .update(`password-reset:${kind}:${value}`).digest('hex');
const invalid = { statusCode: 400, code: 'INVALID_RESET' };

test('SMTP sender supports Gmail and another provider without leaking credentials into the message', async t => {
  const transports = [];
  const messages = [];
  t.mock.method(nodemailer, 'createTransport', options => {
    transports.push(options);
    return { sendMail: async message => { messages.push(message); } };
  });
  const gmail = createSmtpPasswordResetSender({ user: 'sender@example.test', password: 'test-only-password' });
  await gmail({ email: 'reader@example.test', code: '012345', expiresAt: new Date() });
  assert.equal(transports[0].host, 'smtp.gmail.com');
  assert.equal(transports[0].port, 465);
  assert.equal(transports[0].secure, true);
  assert.equal(messages[0].from, 'sender@example.test');
  assert.equal(messages[0].to, 'reader@example.test');
  assert.match(messages[0].text, /012345/);
  assert.ok(!JSON.stringify(messages[0]).includes('test-only-password'));
  createSmtpPasswordResetSender({ user: 'other@example.test', password: 'test-only-password',
    host: 'smtp.other.test', port: 587, from: 'App <other@example.test>' });
  assert.equal(transports[1].host, 'smtp.other.test');
  assert.equal(transports[1].secure, false);
  assert.equal(transports[1].requireTLS, true);
  for (const port of [0, NaN, 65536]) assert.throws(() => createSmtpPasswordResetSender({
    user: 'sender@example.test', password: 'test-only-password', port,
  }), /Invalid SMTP configuration/);
});

test('recovery is explicitly unavailable without mail configuration', async () => {
  const auth = createAuth(config());
  await assert.rejects(auth.controllers.forgotPassword(ctx({ email: 'reader@example.test' })),
    { statusCode: 503, code: 'RESET_UNAVAILABLE' });
});

test('request responses hide existence, store keyed hashes, enforce cooldown and do not await delivery', async t => {
  const c = config();
  const sent = [];
  const auth = createAuth({ ...c, sendPasswordResetCode: async input => {
    sent.push(input);
    await new Promise(() => {}); // Provider latency must not delay the public response.
  } });
  const email = 'reader@example.test';
  const writes = [];
  let cooling = false;
  t.mock.method(User, 'first', async query => query.email === email ? { _id: id, sessionVersion: 2 } : null);
  t.mock.method(PasswordReset.raw, 'init', async () => {});
  t.mock.method(PasswordReset.raw, 'findOneAndUpdate', async (filter, update, options) => {
    assert.equal(options.upsert, true);
    assert.ok(filter.sentAt.$lte instanceof Date);
    if (cooling) throw Object.assign(new Error('duplicate'), { code: 11000 });
    writes.push(update.$set);
    return update.$set;
  });
  const known = await auth.controllers.forgotPassword(ctx({ email }));
  const unknown = await auth.controllers.forgotPassword(ctx({ email: 'unknown@example.test' }));
  cooling = true;
  assert.deepEqual(await auth.controllers.forgotPassword(ctx({ email })), known);
  assert.deepEqual(known, unknown);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(sent.length, 1);
  assert.match(sent[0].code, /^\d{6}$/);
  assert.equal(writes[0].codeHash, hash(c, 'code', `${email}:${sent[0].code}`));
  assert.equal(writes[0].expiresAt - writes[0].sentAt, 600_000);
  assert.equal(writes[0].sessionVersion, 2);
  assert.equal(writes[1].userId, null);
  assert.ok(!JSON.stringify(known).includes(sent[0].code));
});

test('verification rejects wrong, expired and exhausted codes and consumes the correct code once', async t => {
  const c = config();
  const auth = createAuth(c);
  const email = 'reader@example.test';
  const code = '012345';
  const stored = { _id: id, attempts: 0, expiresAt: new Date(Date.now() + 600_000),
    codeHash: hash(c, 'code', `${email}:${code}`), resetTokenHash: null };
  t.mock.method(PasswordReset.raw, 'findOneAndUpdate', async (filter, update) => {
    assert.ok(filter.expiresAt.$gt instanceof Date);
    if (stored.expiresAt <= filter.expiresAt.$gt || stored.resetTokenHash) return null;
    if (update.$inc) {
      assert.equal(filter.attempts.$lt, 5);
      assert.equal(filter.emailHash, hash(c, 'email', email));
      if (stored.attempts >= 5) return null;
      stored.attempts++;
      return { ...stored };
    }
    assert.equal(filter.attempts.$lte, 5);
    assert.deepEqual(filter.userId, { $ne: null });
    if (filter.codeHash !== stored.codeHash) return null;
    stored.resetTokenHash = update.$set.resetTokenHash;
    return { ...stored };
  });
  await assert.rejects(auth.controllers.verifyResetCode(ctx({ email, code: '999999' })), invalid);
  const result = await auth.controllers.verifyResetCode(ctx({ email, code }));
  assert.match(result.data.resetToken, /^[a-f0-9]{64}$/);
  assert.equal(stored.resetTokenHash, hash(c, 'token', result.data.resetToken));
  await assert.rejects(auth.controllers.verifyResetCode(ctx({ email, code })), invalid);
  stored.resetTokenHash = null;
  stored.expiresAt = new Date(0);
  await assert.rejects(auth.controllers.verifyResetCode(ctx({ email, code })), invalid);
  stored.expiresAt = new Date(Date.now() + 600_000);
  stored.attempts = 0;
  for (let i = 0; i < 5; i++) {
    await assert.rejects(auth.controllers.verifyResetCode(ctx({ email, code: '999999' })), invalid);
  }
  await assert.rejects(auth.controllers.verifyResetCode(ctx({ email, code })), invalid);
  assert.equal(stored.attempts, 5);
});

test('password reset is single-use, hashes the password and invalidates both existing token types', async t => {
  const c = config();
  const auth = createAuth(c);
  const resetToken = randomBytes(32).toString('hex');
  let available = true;
  const user = new User.raw({ _id: id, name: 'Reader', email: 'reader@example.test' });
  const access = await createAccessToken(id, c);
  const refreshToken = await createRefreshToken(id, c);
  t.mock.method(PasswordReset.raw, 'findOneAndDelete', async filter => {
    assert.equal(filter.resetTokenHash, hash(c, 'token', resetToken));
    assert.ok(filter.expiresAt.$gt instanceof Date);
    if (!available) return null;
    available = false;
    return { userId: id, sessionVersion: 0 };
  });
  t.mock.method(User.raw, 'findOneAndUpdate', async (filter, update) => {
    assert.equal(filter._id, id);
    assert.deepEqual(filter.$or, [{ sessionVersion: 0 }, { sessionVersion: { $exists: false } }]);
    assert.equal(update.$inc.sessionVersion, 1);
    assert.equal(await verifyPassword('new-password123', update.$set.passwordHash), true);
    user.sessionVersion = 1;
    return user;
  });
  const revoked = t.mock.method(RefreshToken.raw, 'updateMany', async () => {});
  t.mock.method(User, 'find', async () => user);
  await auth.controllers.resetPassword(ctx({ resetToken, password: 'new-password123' }));
  assert.equal(revoked.mock.callCount(), 1);
  assert.equal(revoked.mock.calls[0].arguments[0].userId, id);
  await assert.rejects(auth.controllers.resetPassword(ctx({ resetToken, password: 'another-password' })), invalid);
  await assert.rejects(auth.controllers.refresh(ctx({ refreshToken })), { statusCode: 401 });
  await assert.rejects(auth.guard(() => 'protected')({ headers: { authorization: `Bearer ${access}` } }), { statusCode: 401 });
  const current = await createAccessToken(id, c, 1);
  assert.equal(await auth.guard(() => 'protected')({ headers: { authorization: `Bearer ${current}` } }), 'protected');
});
