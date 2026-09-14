import {NextResponse} from 'next/server';
import {createHash} from 'node:crypto';
import {checkoutSchema,priceOrder,OrderError} from '@/lib/order';
import {addressHash,addressSchema} from '@/lib/delivery';
import {shopConfig} from '@/lib/config';
import {createOrder,db,readDeliveryQuote} from '@/lib/db';
import {stripeClient,appUrl} from '@/lib/stripe';
import {checkRateLimit,isJsonRequest,readLimitedText,RequestBodyTooLargeError} from '@/lib/security';
export const runtime='nodejs';
export async function POST(request:Request){
 try{
  const origin=appUrl();
  if(request.headers.get('origin')!==origin)return NextResponse.json({error:'invalidOrigin'},{status:403});
  const limit=checkRateLimit(request,'checkout',{limit:6,globalLimit:60,windowMs:60000});
  if(!limit.allowed)return NextResponse.json({error:'rateLimited'},{status:429,headers:{'Retry-After':String(limit.retryAfter),'Cache-Control':'no-store'}});
  if(!isJsonRequest(request))return NextResponse.json({error:'invalidInput'},{status:415});
  const raw=await readLimitedText(request,20000);
  let json;try{json=JSON.parse(raw);}catch{return NextResponse.json({error:'invalidInput'},{status:400});}
  const parsed=checkoutSchema.safeParse(json);if(!parsed.success)return NextResponse.json({error:'invalidInput'},{status:400});
  const config=shopConfig();if(!config.checkoutReady)return NextResponse.json({error:'unavailable'},{status:503});
  const input=parsed.data;
  let distance:number|undefined;
  if(input.customer.fulfillment==='delivery'){
   const address=addressSchema.safeParse({street:input.customer.street,postcode:input.customer.postcode,city:input.customer.city});
   if(!address.success)throw new OrderError('invalidArea');
   const quote=input.quoteId?readDeliveryQuote(input.quoteId):undefined;
   if(!quote||quote.expires_at<Date.now()||quote.address_hash!==addressHash(address.data))throw new OrderError('quoteRequired');
   distance=quote.distance_meters;
  }
  const pricing=priceOrder(input,config,distance);
  const hash=createHash('sha256').update(JSON.stringify({...input,items:pricing.items})).digest('hex');
  const order=createOrder(input,pricing,hash);
  if(order.request_hash!==hash)return NextResponse.json({error:'requestConflict'},{status:409});
  const stripe=stripeClient();
  if(order.session_id){
   const session=await stripe.checkout.sessions.retrieve(order.session_id);
   if(session.status==='expired')return NextResponse.json({error:'sessionExpired'},{status:409});
   return NextResponse.json({url:session.url||`${origin}/success?session_id=${session.id}`},{headers:{'Cache-Control':'no-store'}});
  }
  const session=await stripe.checkout.sessions.create({mode:'payment',customer_email:input.customer.email,client_reference_id:order.id,metadata:{orderId:order.id},locale:input.locale==='uk'?'auto':input.locale,
   line_items:[...pricing.items.map(i=>({quantity:i.quantity,price_data:{currency:'eur',unit_amount:i.unitAmount,product_data:{name:i.name}}})),...(pricing.deliveryFee>0?[{quantity:1,price_data:{currency:'eur',unit_amount:pricing.deliveryFee,product_data:{name:input.locale==='nl'?'Bezorging':input.locale==='uk'?'Доставка':'Delivery'}}}]:[])],
   success_url:`${origin}/success?session_id={CHECKOUT_SESSION_ID}`,cancel_url:`${origin}/checkout?cancelled=1`,expires_at:Math.floor(Date.now()/1000)+1800,
  },{idempotencyKey:`checkout-${order.id}`});
  db().prepare('UPDATE orders SET session_id=? WHERE id=?').run(session.id,order.id);
  return NextResponse.json({url:session.url},{headers:{'Cache-Control':'no-store'}});
 }catch(e){if(e instanceof RequestBodyTooLargeError)return NextResponse.json({error:'invalidInput'},{status:413});if(e instanceof OrderError)return NextResponse.json({error:e.code},{status:400});console.error('Checkout failed:',e instanceof Error?e.name:'Unknown');return NextResponse.json({error:'genericError'},{status:500});}
}
