import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { make } from '../packages/cli/dist/index.js';

test('frontend types preserve the Mongo JSON contract and input optionality', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'tilcayo-types-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(path.join(root, 'package.json'), '{}');
  const args = ['make:types', 'Book', 'title:string', 'year:number?', 'active:boolean', 'publishedAt:date', 'author:ref:Author', 'tags:refs:Tag?'];
  await make(args, root);
  const source = await readFile(path.join(root, 'src/features/books/books.types.ts'), 'utf8');
  for (const property of ['_id: string', 'year?: number', 'active: boolean', 'publishedAt: string', 'author: string', 'tags?: string[]', 'createdAt: string', 'updatedAt: string']) assert.ok(source.includes(property), property);
  assert.match(source, /UpdateBookInput = Partial<CreateBookInput>/);
  const input = source.split('export interface CreateBookInput')[1];
  assert.ok(!input.includes('_id:') && !input.includes('createdAt:'));
  await assert.rejects(make(args, root), /already exists/);
  await assert.rejects(make(['make:types', 'Bad', 'thing:unknown'], root), /Invalid field/);
});
