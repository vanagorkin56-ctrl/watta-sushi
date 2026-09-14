import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import Stripe from 'stripe';
import {checkoutSchema,priceOrder,deliveryAmount,type CheckoutInput} from '../lib/order';
import {shopConfig} from '../lib/config';
import {db,createOrder,getOrder,createDeliveryQuote,readDeliveryQuote} from '../lib/db';
import {fulfillSession} from '../lib/fulfillment';
import {deliveryQuote,addressHash} from '../lib/delivery';
import {checkRateLimit,readLimitedText,RequestBodyTooLargeError,resetRateLimitsForTests} from '../lib/security';
process.env.DATABASE_PATH=join(mkdtempSync(join(tmpdir(),'watta-test-')),'orders.sqlite');
const input=():CheckoutInput=>({requestId:randomUUID(),locale:'en',items:[{productId:21,quantity:2}],customer:{name:'Test Customer',email:'customer@example.test',phone:'+31600000000',fulfillment:'pickup',street:'',postcode:'',city:'Amsterdam',comment:''}});
test('calculates canonical EUR price and free pickup',()=>{const p=priceOrder(input(),shopConfig());assert.equal(p.total,3200);assert.equal(p.deliveryFee,0);assert.equal(p.currency,'eur');});
test('minimum counts rolls, including two portions of the same roll',()=>{const i=input();i.items=[{productId:21,quantity:1},{productId:183,quantity:3}];assert.throws(()=>priceOrder(i,shopConfig()),/minimumError/);i.items=[{productId:21,quantity:1},{productId:113,quantity:1}];assert.equal(priceOrder(i,shopConfig()).total,3100);});
test('a set satisfies the roll minimum while drinks alone do not',()=>{const i=input();i.items=[{productId:301,quantity:1}];assert.equal(priceOrder(i,shopConfig()).total,4000);i.items=[{productId:701,quantity:2}];assert.throws(()=>priceOrder(i,shopConfig()),/minimumError/);});
test('rejects client prices, malformed phones, noninteger amounts, unavailable products and aggregate quantity attacks',()=>{const i=input();assert.equal(checkoutSchema.safeParse({...i,items:[{productId:21,quantity:2,price:1}]}).success,false);assert.equal(checkoutSchema.safeParse({...i,customer:{...i.customer,phone:'06 1234 5678'}}).success,false);assert.equal(checkoutSchema.safeParse({...i,items:[{productId:21,quantity:1.1}]}).success,false);assert.throws(()=>priceOrder({...i,items:[{productId:999999,quantity:2}]},shopConfig()),/invalidItems/);assert.throws(()=>priceOrder({...i,items:[{productId:21,quantity:30},{productId:21,quantity:1}]},shopConfig()),/invalidItems/);});
test('charges 80 cents per km with cents rounding, rejects missing quote and outside city',()=>{assert.equal(deliveryAmount(5000),400);assert.equal(deliveryAmount(5123),410);const i=input();i.customer={...i.customer,fulfillment:'delivery',street:'Damrak 1',postcode:'1012 LG'};assert.equal(priceOrder(i,shopConfig(),5000).total,3600);assert.throws(()=>priceOrder(i,shopConfig()),/quoteRequired/);i.customer.city='Rotterdam';assert.throws(()=>priceOrder(i,shopConfig(),5000),/invalidArea/);});
test('request IDs deduplicate persisted orders',()=>{const i=input();const p=priceOrder(i,shopConfig());const a=createOrder(i,p,'same');const b=createOrder(i,p,'same');assert.equal(a.id,b.id);});
test('order database is readable and writable by its owner only',()=>{db();assert.equal(statSync(process.env.DATABASE_PATH!).mode&0o777,0o600);});
test('paid webhook verifies totals and fulfills exactly once, queues a single customer email',()=>{const i=input();const p=priceOrder(i,shopConfig());const order=createOrder(i,p,'hash');const s={id:'cs_test_'+randomUUID().replaceAll('-',''),metadata:{orderId:order.id},client_reference_id:order.id,amount_total:p.total,currency:'eur',payment_status:'paid'} as unknown as Stripe.Checkout.Session;
 assert.throws(()=>fulfillSession({...s,amount_total:1},'evt_bad'),/does not match/);assert.equal(getOrder(order.id)?.status,'pending');fulfillSession(s,'evt_ok');fulfillSession(s,'evt_ok');fulfillSession(s,'evt_another');assert.equal(getOrder(order.id)?.status,'paid');assert.equal((db().prepare('SELECT COUNT(*) AS n FROM email_jobs WHERE order_id=?').get(order.id) as {n:number}).n,1);
});
test('pending async payment never marks order paid',()=>{const i=input();const p=priceOrder(i,shopConfig());const order=createOrder(i,p,'hash');const s={id:'cs_test_pending',metadata:{orderId:order.id},client_reference_id:order.id,amount_total:p.total,currency:'eur',payment_status:'unpaid'} as unknown as Stripe.Checkout.Session;fulfillSession(s,'evt_pending');assert.equal(getOrder(order.id)?.status,'pending');fulfillSession({...s,payment_status:'paid'},'evt_async_paid');assert.equal(getOrder(order.id)?.status,'paid');});
test('quote stores server distance and normalizes address identity',()=>{const a={street:'Damrak 1',postcode:'1012 LG',city:'Amsterdam'};const hash=addressHash(a);assert.equal(hash,addressHash({...a,postcode:'1012lg',city:'amsterdam'}));const q=createDeliveryQuote(hash,5000);assert.equal(readDeliveryQuote(q.id)?.distance_meters,5000);assert.notEqual(hash,addressHash({...a,street:'Damrak 2'}));});
test('Google route adapter accepts exact Amsterdam address and uses road metres',async()=>{
 const previous=globalThis.fetch;const previousKey=process.env.GOOGLE_MAPS_API_KEY;process.env.GOOGLE_MAPS_API_KEY='test';let calls=0;
 globalThis.fetch=async()=>{calls++;return Response.json(calls===1?{status:'OK',results:[{address_components:[{types:['locality'],long_name:'Amsterdam'},{types:['postal_code'],long_name:'1012 LG'},{types:['street_number'],long_name:'1'}],geometry:{location:{lat:52.37,lng:4.89}},formatted_address:'Damrak 1, Amsterdam'}]}:{routes:[{distanceMeters:6250}]});};
 try{const q=await deliveryQuote({street:'Damrak 1',postcode:'1012 LG',city:'Amsterdam'});assert.equal(q.deliveryFee,500);assert.equal(calls,2);}finally{globalThis.fetch=previous;if(previousKey===undefined)delete process.env.GOOGLE_MAPS_API_KEY;else process.env.GOOGLE_MAPS_API_KEY=previousKey;}
});
test('Stripe signature rejects tampered payload',()=>{const stripe=new Stripe('sk_test_placeholder');const payload=JSON.stringify({id:'evt_test',type:'checkout.session.completed'});const header=stripe.webhooks.generateTestHeaderString({payload,secret:'whsec_test'});assert.equal(stripe.webhooks.constructEvent(payload,header,'whsec_test').id,'evt_test');assert.throws(()=>stripe.webhooks.constructEvent(payload+' ',header,'whsec_test'));});
test('bounded body reader rejects declared and streamed oversized payloads',async()=>{
 await assert.rejects(()=>readLimitedText(new Request('http://localhost',{method:'POST',headers:{'content-length':'999'},body:'small'}),10),RequestBodyTooLargeError);
 await assert.rejects(()=>readLimitedText(new Request('http://localhost',{method:'POST',body:'01234567890'}),10),RequestBodyTooLargeError);
 assert.equal(await readLimitedText(new Request('http://localhost',{method:'POST',body:'sushi'}),10),'sushi');
});
test('rate limiter enforces per-client and global request ceilings',()=>{
 resetRateLimitsForTests();
 const first=new Request('http://localhost',{headers:{'x-real-ip':'203.0.113.10'}});
 assert.equal(checkRateLimit(first,'test',{limit:2,globalLimit:4,windowMs:60000}).allowed,true);
 assert.equal(checkRateLimit(first,'test',{limit:2,globalLimit:4,windowMs:60000}).allowed,true);
 assert.equal(checkRateLimit(first,'test',{limit:2,globalLimit:4,windowMs:60000}).allowed,false);
 assert.equal(checkRateLimit(new Request('http://localhost',{headers:{'x-real-ip':'203.0.113.11'}}),'test',{limit:2,globalLimit:4,windowMs:60000}).allowed,true);
 assert.equal(checkRateLimit(new Request('http://localhost',{headers:{'x-real-ip':'203.0.113.12'}}),'test',{limit:2,globalLimit:4,windowMs:60000}).allowed,true);
 assert.equal(checkRateLimit(new Request('http://localhost',{headers:{'x-real-ip':'203.0.113.13'}}),'test',{limit:2,globalLimit:4,windowMs:60000}).allowed,false);
 resetRateLimitsForTests();
});
