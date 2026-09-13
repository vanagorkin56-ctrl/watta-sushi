import type Stripe from 'stripe';
import {randomUUID} from 'node:crypto';
import {db,getOrder} from './db';
import type {PricedOrder,CheckoutInput} from './order';
export function fulfillSession(session:Stripe.Checkout.Session,eventId:string){
 const d=db();d.exec('BEGIN IMMEDIATE');
 try{
  if(d.prepare('SELECT id FROM stripe_events WHERE id=?').get(eventId)){d.exec('COMMIT');return;}
  const orderId=session.metadata?.orderId;
  if(!orderId){d.exec('COMMIT');return;}
  const order=getOrder(orderId);
  if(!order)throw new Error('Unknown order');
  const pricing=JSON.parse(order.pricing) as PricedOrder;
  if(session.amount_total!==pricing.total || session.currency!==pricing.currency || (order.session_id && session.id!==order.session_id) || session.client_reference_id!==order.id) throw new Error('Payment does not match order');
  if(session.payment_status==='paid' && order.status!=='paid'){
   d.prepare("UPDATE orders SET status='paid',session_id=?,paid_at=CURRENT_TIMESTAMP WHERE id=?").run(session.id,order.id);
   const customer=JSON.parse(order.customer) as CheckoutInput['customer'];
   const recipients=new Set([customer.email,...(process.env.OWNER_EMAIL?[process.env.OWNER_EMAIL]:[])]);
   for(const recipient of recipients)d.prepare('INSERT OR IGNORE INTO email_jobs (id,order_id,recipient) VALUES (?,?,?)').run(randomUUID(),order.id,recipient);
  }
  d.prepare('INSERT INTO stripe_events (id) VALUES (?)').run(eventId);d.exec('COMMIT');
 }catch(e){d.exec('ROLLBACK');throw e;}
}
