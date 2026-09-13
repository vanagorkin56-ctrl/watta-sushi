import {NextResponse} from 'next/server';
import {after} from 'next/server';
import {stripeClient} from '@/lib/stripe';
import {fulfillSession} from '@/lib/fulfillment';
import {processEmails} from '@/lib/email';
import {db} from '@/lib/db';
export const runtime='nodejs';
export async function POST(request:Request){
 const secret=process.env.STRIPE_WEBHOOK_SECRET;
 if(!secret)return NextResponse.json({error:'Not configured'},{status:503});
 const signature=request.headers.get('stripe-signature');if(!signature)return NextResponse.json({error:'Missing signature'},{status:400});
 let event;try{event=stripeClient().webhooks.constructEvent(await request.text(),signature,secret);}catch{return NextResponse.json({error:'Invalid signature'},{status:400});}
 try{
  if(event.type==='checkout.session.completed'||event.type==='checkout.session.async_payment_succeeded'){
   fulfillSession(event.data.object,event.id);after(async()=>{await processEmails();});
  }else if(event.type==='checkout.session.expired'||event.type==='checkout.session.async_payment_failed'){
   const s=event.data.object;
   db().prepare("UPDATE orders SET status=? WHERE session_id=? AND status!='paid'").run(event.type==='checkout.session.expired'?'expired':'failed',s.id);
  }
  return NextResponse.json({received:true});
 }catch{console.error('Stripe event processing failed',event.id);return NextResponse.json({error:'Processing failed'},{status:500});}
}
