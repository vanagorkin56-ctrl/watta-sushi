import nodemailer from 'nodemailer';
import { db, getOrder } from './db';
import type { CheckoutInput, PricedOrder } from './order';
import { shopConfig } from './config';
import { translations } from './i18n';
import { money } from './catalog';
export async function processEmails(limit=10) {
 if(!process.env.SMTP_HOST||!process.env.SMTP_FROM) return {sent:0,pending:true};
 const transport=nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||587),secure:process.env.SMTP_PORT==='465',
  auth:process.env.SMTP_USER?{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}:undefined,connectionTimeout:10000,socketTimeout:15000});
 const jobs=db().prepare("SELECT id,order_id,recipient FROM email_jobs WHERE status='pending' OR (status='sending' AND locked_at<?) LIMIT ?").all(Date.now()-120000,limit) as {id:string;order_id:string;recipient:string}[];
 let sent=0;
 for(const job of jobs){
  const claim=db().prepare("UPDATE email_jobs SET status='sending',locked_at=?,attempts=attempts+1 WHERE id=? AND (status='pending' OR (status='sending' AND locked_at<?))").run(Date.now(),job.id,Date.now()-120000);
  if(!claim.changes)continue;
  try{
   const order=getOrder(job.order_id)!;const customer=JSON.parse(order.customer) as CheckoutInput['customer'];const pricing=JSON.parse(order.pricing) as PricedOrder; const t=translations[order.locale];
   await transport.sendMail({from:process.env.SMTP_FROM,to:job.recipient,messageId:`<${job.id}@watta-order.local>`,subject:`Watta Sushi — ${t.orderNumber} ${order.id.slice(0,8).toUpperCase()}`,
    text:[t.successTitle,`${t.orderNumber}: ${order.id.slice(0,8).toUpperCase()}`,'',...pricing.items.map(i=>`${i.quantity} × ${i.name}: ${money(i.unitAmount*i.quantity,order.locale)}`),`${t.deliveryFee}: ${money(pricing.deliveryFee,order.locale)}`,`${t.total}: ${money(pricing.total,order.locale)}`,'',`${t.name}: ${customer.name}`,`${t.phone}: ${customer.phone}`,customer.fulfillment==='delivery'?`${t.deliver}: ${customer.street}, ${customer.postcode} ${customer.city}`:`${t.pickup}: ${shopConfig().pickupAddress}`,customer.comment?`${t.comment}: ${customer.comment}`:'','+31649326549',t.timingText].filter(Boolean).join('\n')});
   db().prepare("UPDATE email_jobs SET status='sent',last_error=NULL WHERE id=?").run(job.id);sent++;
  }catch{db().prepare("UPDATE email_jobs SET status='pending',last_error='SMTP delivery failed' WHERE id=?").run(job.id);}
 }
 transport.close();return {sent};
}
