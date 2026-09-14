import { z } from 'zod';
import { products } from './catalog';
import type { ShopConfig } from './config';
export const checkoutSchema = z.object({
 requestId: z.string().uuid(), quoteId: z.string().uuid().optional(), locale: z.enum(['nl','en','uk']),
 items: z.array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().min(1).max(30) }).strict()).min(1).max(products.length),
 customer: z.object({ name: z.string().trim().min(2).max(120), email: z.email().max(254), phone: z.string().trim().regex(/^\+[1-9]\d{6,14}$/),
  fulfillment: z.enum(['delivery','pickup']), street: z.string().trim().max(200), postcode: z.string().trim().max(10), city: z.string().trim().max(80), comment: z.string().trim().max(1000),
 }).strict(),
}).strict();
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export class OrderError extends Error { constructor(public code: string) { super(code); } }
export function priceOrder(input: CheckoutInput, config: ShopConfig, distanceMeters?: number) {
 const quantities = new Map<number,number>();
 for (const item of input.items) quantities.set(item.productId,(quantities.get(item.productId)||0)+item.quantity);
 const items = [...quantities].sort(([a],[b])=>a-b).map(([id,quantity])=>{
  const p=products.find(p=>p.id===id);
  if (!p || quantity>30) throw new OrderError('invalidItems');
  return {productId:id, quantity, name:p.name[input.locale], unitAmount:p.price};
 });
 const subtotal=items.reduce((sum,p)=>sum+p.quantity*p.unitAmount,0);
 const rollCount=items.reduce((n,i)=>n+(products.find(p=>p.id===i.productId)?.rollUnits||0)*i.quantity,0);
 if(rollCount<config.minimumRolls) throw new OrderError('minimumError');
 const c=input.customer;
 if(c.fulfillment==='pickup') { if(!config.pickupAddress) throw new OrderError('unavailable'); }
 else {
  const postcode=c.postcode.toUpperCase().replace(/\s/g,'');
  if(c.city.toLowerCase()!=='amsterdam' || c.street.length<4 || !/\d/.test(c.street) || !/^\d{4}[A-Z]{2}$/.test(postcode)) throw new OrderError('invalidArea');
 }
 if(c.fulfillment==='delivery' && (!Number.isSafeInteger(distanceMeters) || distanceMeters! < 0)) throw new OrderError('quoteRequired');
 const deliveryFee=c.fulfillment==='delivery'?deliveryAmount(distanceMeters!,config.deliveryCentsPerKm):0;
 return {items,subtotal,deliveryFee,distanceMeters:c.fulfillment==='delivery'?distanceMeters:undefined,total:subtotal+deliveryFee,currency:'eur' as const};
}
export type PricedOrder = ReturnType<typeof priceOrder>;

export function deliveryAmount(meters:number,centsPerKm=80){return Math.round(meters*centsPerKm/1000);}
