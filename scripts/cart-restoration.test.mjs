import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { createServer } from 'vite';
const server = await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom',optimizeDeps:{noDiscovery:true,include:[]}});
after(() => server.close());
const { cartReducer, readStoredCart } = await server.ssrLoadModule('/src/utils/cartState.ts');
const initial = () => ({lines:[{productId:'saved',quantity:2}],products:{},failed:[],basketOpen:false,lastAdded:null});
const product = id => ({id,inStock:true,stockQuantity:10,price:50});

test('a restoration failure preserves the saved basket and supports retry', () => {
  const failed = cartReducer(initial(),{type:'loaded',results:[{id:'saved',failed:true}]});
  assert.deepEqual(failed.lines,initial().lines);
  assert.deepEqual(failed.failed,['saved']);
  const retried = cartReducer(failed,{type:'retry'});
  const restored = cartReducer(retried,{type:'loaded',results:[{id:'saved',product:product('saved')}]});
  assert.equal(restored.products.saved.id,'saved');
  assert.deepEqual(restored.failed,[]);
});

test('adding a product while restoration is in flight does not get overwritten', () => {
  const added = cartReducer(initial(),{type:'add',product:product('new'),quantity:1,open:true});
  const restored = cartReducer(added,{type:'loaded',results:[{id:'saved',product:product('saved')}]});
  assert.deepEqual(restored.lines,[{productId:'saved',quantity:2},{productId:'new',quantity:1}]);
});

test('clearing or removing during restoration cannot resurrect items', () => {
  for(const action of [{type:'clear'},{type:'remove',id:'saved'}]) {
    const changed=cartReducer(initial(),action);
    const restored=cartReducer(changed,{type:'loaded',results:[{id:'saved',product:product('saved')}]});
    assert.deepEqual(restored.lines,[]);
  }
});

test('confirmed missing products are removed, temporary errors are retained', () => {
  const restored=cartReducer(initial(),{type:'loaded',results:[{id:'saved'}]});
  assert.deepEqual(restored.lines,[]);
});

test('stock limits and invalid quantities are enforced', () => {
  const state=initial();
  for(const quantity of [NaN,Infinity,1.5,-2]) assert.equal(cartReducer(state,{type:'add',product:product('new'),quantity,open:true}),state);
  const added=cartReducer(state,{type:'add',product:product('saved'),quantity:100,open:true});
  assert.equal(added.lines[0].quantity,10);
});

test('stored IDs are normalized and storage failures do not crash startup', () => {
  const old=globalThis.localStorage;
  try {
    globalThis.localStorage={getItem:()=>JSON.stringify([{productId:'a',quantity:2},{productId:'a',quantity:3},{productId:'b',quantity:1.5}])};
    assert.deepEqual(readStoredCart(),[{productId:'a',quantity:5}]);
    globalThis.localStorage={getItem:()=>{throw new Error('blocked');}};
    assert.deepEqual(readStoredCart(),[]);
  }finally{globalThis.localStorage=old;}
});
