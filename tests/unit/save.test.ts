import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultSave, parseSave, SAVE_NAMESPACE, persistSave, loadSave } from '../../src/game/persistence/save.ts';
test('save namespace is unique to this project', () => assert.equal(SAVE_NAMESPACE, 'project-crownflare:save:v1'));
test('missing, corrupt and wrong-version data produce safe defaults', () => { assert.deepEqual(parseSave(null),defaultSave()); assert.deepEqual(parseSave('{oops'),defaultSave()); assert.deepEqual(parseSave('{"version":88}'),defaultSave()); });
test('valid save roundtrip without external DB', () => {const store=new Map<string,string>(); const st={getItem:(x:string)=>store.get(x)??null,setItem:(x:string,v:string)=>{store.set(x,v);}}; assert.equal(persistSave(st,defaultSave()),true); assert.deepEqual(loadSave(st),defaultSave()); });
test('storage permission failures fall back and report writes safely', () => {
  assert.deepEqual(loadSave({ getItem: () => { throw new Error('blocked'); } }), defaultSave());
  assert.equal(persistSave({ setItem: () => { throw new Error('blocked'); } }, defaultSave()), false);
});
