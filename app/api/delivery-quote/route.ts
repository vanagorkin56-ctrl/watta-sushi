import {signDeliveryQuote} from '@/lib/delivery-token';
import {NextResponse} from 'next/server';
import {addressSchema,deliveryQuote,addressHash} from '@/lib/delivery';
import {appUrl} from '@/lib/stripe';
import {OrderError} from '@/lib/order';
import {checkRateLimit,isJsonRequest,readLimitedText,RequestBodyTooLargeError} from '@/lib/security';
export const runtime='nodejs';
export async function POST(request:Request){
 try{
  if(request.headers.get('origin')!==appUrl())return NextResponse.json({error:'invalidOrigin'},{status:403});
  const limit=checkRateLimit(request,'delivery-quote',{limit:10,globalLimit:120,windowMs:60000});
  if(!limit.allowed)return NextResponse.json({error:'rateLimited'},{status:429,headers:{'Retry-After':String(limit.retryAfter),'Cache-Control':'no-store'}});
  if(!isJsonRequest(request))return NextResponse.json({error:'invalidArea'},{status:415});
  const raw=await readLimitedText(request,2000);
  let input;try{input=JSON.parse(raw);}catch{return NextResponse.json({error:'addressNotFound'},{status:400});}
  const parsed=addressSchema.safeParse(input);if(!parsed.success)return NextResponse.json({error:'addressNotFound'},{status:400});
  const quote=await deliveryQuote(parsed.data);const saved=signDeliveryQuote(addressHash(parsed.data),quote.distanceMeters);
  return NextResponse.json({...quote,quoteId:saved.id,expiresAt:saved.expires},{headers:{'Cache-Control':'no-store'}});
 }catch(e){if(e instanceof RequestBodyTooLargeError)return NextResponse.json({error:'invalidArea'},{status:413});return NextResponse.json({error:e instanceof OrderError?e.code:'deliveryUnavailable'},{status:400});}
}
