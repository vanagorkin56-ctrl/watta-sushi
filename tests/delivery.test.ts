import test,{type TestContext} from 'node:test';
function env(t:TestContext,key:string,value:string){const before=process.env[key];process.env[key]=value;t.after(()=>{if(before===undefined)delete process.env[key];else process.env[key]=before;});}
import assert from 'node:assert/strict';
import {randomUUID,createHmac} from 'node:crypto';
import {deliveryQuote,addressHash} from '../lib/delivery';
import {signDeliveryQuote,verifyDeliveryQuote} from '../lib/delivery-token';
import {shopConfig} from '../lib/config';
import {POST as calculate} from '../app/api/delivery-quote/route';
import {POST as checkout} from '../app/api/checkout/route';
import {resetRateLimitsForTests} from '../lib/security';
import {checkoutSchema} from '../lib/order';

process.env.APP_URL='http://localhost:3000';
process.env.MAPBOX_ACCESS_TOKEN='test-mapbox-not-a-real-token';
process.env.DELIVERY_QUOTE_SECRET='test-quote-secret-with-at-least-32-characters';
const address={street:'Damrak 1',postcode:'1012 LG',city:'Amsterdam'};
function feature(origin=false){
 return {geometry:{coordinates:origin?[4.85,52.34]:[4.89,52.37]},properties:{
  feature_type:'address',context:{country:{country_code:'NL'},place:{name:'Amsterdam'},postcode:{name:'1012 LG'},address:{address_number:origin?'20':'1',street_name:origin?'Helicopterstraat':'Damrak'}},
  match_code:{address_number:'matched',street:'matched',confidence:'exact'},
 }};
}
const headers={origin:'http://localhost:3000','content-type':'application/json','x-real-ip':'203.0.113.50'};
const request=(path:string,data:unknown)=>new Request('http://localhost:3000'+path,{method:'POST',headers,body:JSON.stringify(data)});

test('Mapbox uses structured geocoding, fixed restaurant and driving metres',async t=>{
 const urls:URL[]=[];
 t.mock.method(globalThis,'fetch',async(input:URL)=>{
  const url=new URL(String(input));urls.push(url);
  return Response.json(url.pathname.includes('/directions/')?{code:'Ok',routes:[{distance:6250.4}]}:{features:[feature(url.searchParams.get('address_line1')==='Helicopterstraat 20')]});
 });
 const quote=await deliveryQuote(address);
 assert.equal(quote.distanceMeters,6250.4);assert.equal(quote.deliveryFee,500);
 assert.equal(urls.length,3);
 assert.equal(urls[0].searchParams.get('postcode'),'1012 LG');
 assert.equal(urls[0].searchParams.get('country'),'nl');
 assert.match(urls[2].pathname,/mapbox\/driving\/4.85,52.34;4.89,52.37/);
});

test('unknown, mismatched and out-of-area addresses never produce a cheap quote',async t=>{
 for(const variant of ['missing','postcode','house','place']){
  const value=feature();
  if(variant==='postcode')value.properties.context.postcode.name='1029 GL';
  if(variant==='house')value.properties.context.address.address_number='2';
  if(variant==='place')value.properties.context.place.name='Rotterdam';
  const mock=t.mock.method(globalThis,'fetch',async()=>Response.json({features:variant==='missing'?[]:[value]}));
  await assert.rejects(()=>deliveryQuote(address),new RegExp(variant==='place'?'outsideDeliveryArea':'addressNotFound'));
  assert.equal(mock.mock.callCount(),1);mock.mock.restore();
 }
});

test('API distinguishes a recognized Haarlem address from an unknown street in either city',async t=>{
 resetRateLimitsForTests();
 for(const city of ['Haarlem','Amsterdam']){
  for(const found of [true,false]){
   const value=feature();
   value.properties.context.place.name=city;
   value.properties.context.address={street_name:'Grote Markt',address_number:'2'};
   value.properties.context.postcode.name='2011 RD';
   const mock=t.mock.method(globalThis,'fetch',async(input:URL)=>{
    assert.equal(new URL(String(input)).searchParams.get('place'),city);
    return Response.json({features:found?[value]:[]});
   });
   // The recognized out-of-area address must not request a route or sign a quote.
   if(city==='Haarlem'||!found){
    const response=await calculate(request('/api/delivery-quote',{street:'Grote Markt 2',postcode:'2011 RD',city}));
    assert.equal(response.status,400);
    assert.deepEqual(await response.json(),{error:found?'outsideDeliveryArea':'addressNotFound'});
    assert.equal(mock.mock.callCount(),1);
   }
   mock.mock.restore();
  }
 }
});

test('Mapbox authentication, timeout and unroutable address have safe errors',async t=>{
 let mock=t.mock.method(globalThis,'fetch',async()=>new Response('',{status:401}));
 await assert.rejects(()=>deliveryQuote(address),/deliveryUnavailable/);mock.mock.restore();
 mock=t.mock.method(globalThis,'fetch',async()=>{throw new Error('network timeout');});
 await assert.rejects(()=>deliveryQuote(address),/deliveryUnavailable/);mock.mock.restore();
 t.mock.method(globalThis,'fetch',async(input:URL)=>{
  const url=new URL(String(input));
  return Response.json(url.pathname.includes('/directions/')?{code:'NoRoute',routes:[]}:{features:[feature(url.searchParams.get('address_line1')==='Helicopterstraat 20')]});
 });
 await assert.rejects(()=>deliveryQuote(address),/routeUnavailable/);
});

test('quote works without local database; signature rejects tampering, expiry and different address',async t=>{
 resetRateLimitsForTests();
 t.mock.method(globalThis,'fetch',async(input:URL)=>{
  const url=new URL(String(input));
  return Response.json(url.pathname.includes('/directions/')?{code:'Ok',routes:[{distance:4200}]}:{features:[feature(url.searchParams.get('address_line1')==='Helicopterstraat 20')]});
 });
 const response=await calculate(request('/api/delivery-quote',address));
 assert.equal(response.status,200);
 const quote=await response.json();
 assert.equal(quote.deliveryFee,336);
 const hash=addressHash(address);
 assert.equal(verifyDeliveryQuote(quote.quoteId,hash).distance_meters,4200);
 assert.throws(()=>verifyDeliveryQuote(quote.quoteId+'x',hash),/quoteRequired/);
 assert.throws(()=>verifyDeliveryQuote(quote.quoteId,addressHash({...address,street:'Damrak 2'})),/quoteRequired/);
 const payload=Buffer.from(JSON.stringify({v:1,address_hash:hash,distance_meters:4200,expires_at:Date.now()-1})).toString('base64url');
 const expired=payload+'.'+createHmac('sha256',process.env.DELIVERY_QUOTE_SECRET!).update('watta-delivery-v1:'+payload).digest('base64url');
 assert.throws(()=>verifyDeliveryQuote(expired,hash),/quoteRequired/);
});

test('checkout refuses changed Mapbox fee before creating an order or Stripe session',async t=>{
 resetRateLimitsForTests();
 env(t,'STRIPE_SECRET_KEY','sk_test_fixture');
 env(t,'STRIPE_WEBHOOK_SECRET','whsec_fixture');
 env(t,'VERCEL','');
 t.mock.method(globalThis,'fetch',async(input:URL)=>{
  const url=new URL(String(input));
  return Response.json(url.pathname.includes('/directions/')?{code:'Ok',routes:[{distance:5000}]}:{features:[feature(url.searchParams.get('address_line1')==='Helicopterstraat 20')]});
 });
 const quote=signDeliveryQuote(addressHash(address),4200);
 const payload={acceptedTerms:true,requestId:randomUUID(),quoteId:quote.id,locale:'en',items:[{productId:21,quantity:2}],customer:{...address,name:'Test Customer',email:'customer@example.test',phone:'+31612345678',fulfillment:'delivery',comment:''}};
 const response=await checkout(request('/api/checkout',payload));
 assert.equal(response.status,400);
 assert.deepEqual(await response.json(),{error:'deliveryChanged'});
 assert.equal(checkoutSchema.safeParse({...payload,acceptedTerms:false}).success,false);
});

test('SMTP does not block Stripe readiness, missing keys and unsupported serverless storage do',t=>{
 env(t,'STRIPE_SECRET_KEY','sk_test_fixture');env(t,'STRIPE_WEBHOOK_SECRET','whsec_fixture');
 env(t,'SMTP_HOST','');env(t,'SMTP_FROM','');env(t,'VERCEL','');
 assert.equal(shopConfig().checkoutReady,true);
 env(t,'STRIPE_SECRET_KEY','');assert.equal(shopConfig().checkoutReady,false);
 env(t,'STRIPE_SECRET_KEY','sk_test_fixture');env(t,'VERCEL','1');
 assert.equal(shopConfig().checkoutReady,false);
});
