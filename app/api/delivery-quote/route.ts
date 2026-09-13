import {createDeliveryQuote} from '@/lib/db';
import {NextResponse} from 'next/server';
import {addressSchema,deliveryQuote,addressHash} from '@/lib/delivery';
import {appUrl} from '@/lib/stripe';
import {OrderError} from '@/lib/order';
export async function POST(request:Request){
 try{
  if(request.headers.get('origin')!==appUrl())return NextResponse.json({error:'invalidOrigin'},{status:403});
  const raw=await request.text();if(raw.length>2000)return NextResponse.json({error:'invalidArea'},{status:400});
  const parsed=addressSchema.safeParse(JSON.parse(raw));if(!parsed.success)return NextResponse.json({error:'invalidArea'},{status:400});
  const quote=await deliveryQuote(parsed.data);const saved=createDeliveryQuote(addressHash(parsed.data),quote.distanceMeters);
  return NextResponse.json({...quote,quoteId:saved.id,expiresAt:saved.expires});
 }catch(e){return NextResponse.json({error:e instanceof OrderError?e.code:'deliveryUnavailable'},{status:400});}
}
