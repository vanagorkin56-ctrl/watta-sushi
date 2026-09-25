import {createHmac,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import {OrderError} from './order';

const payloadSchema=z.object({v:z.literal(1),address_hash:z.string().length(64),distance_meters:z.number().min(0).max(1_000_000),expires_at:z.number().int().positive()}).strict();
function secret(){
 const value=process.env.DELIVERY_QUOTE_SECRET||process.env.STRIPE_WEBHOOK_SECRET;
 if(!value||value.length<24)throw new OrderError('deliveryUnavailable');
 return value;
}
function signature(payload:string){return createHmac('sha256',secret()).update('watta-delivery-v1:'+payload).digest('base64url');}
export function signDeliveryQuote(hash:string,meters:number){
 const expires=Date.now()+15*60*1000;
 const data=payloadSchema.parse({v:1,address_hash:hash,distance_meters:meters,expires_at:expires});
 const payload=Buffer.from(JSON.stringify(data)).toString('base64url');
 return {id:payload+'.'+signature(payload),expires};
}
export function verifyDeliveryQuote(token:string,hash:string){
 if(token.length>1024)throw new OrderError('quoteRequired');
 const parts=token.split('.');
 if(parts.length!==2)throw new OrderError('quoteRequired');
 const [payload,signed]=parts;
 const expected=Buffer.from(signature(payload));
 const received=Buffer.from(signed);
 if(expected.length!==received.length||!timingSafeEqual(expected,received))throw new OrderError('quoteRequired');
 let data;
 try{data=payloadSchema.parse(JSON.parse(Buffer.from(payload,'base64url').toString('utf8')));}catch{throw new OrderError('quoteRequired');}
 if(data.address_hash!==hash||data.expires_at<=Date.now())throw new OrderError('quoteRequired');
 return data;
}
