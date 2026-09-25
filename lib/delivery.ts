import {createHash} from 'node:crypto';
import {z} from 'zod';
import {OrderError,deliveryAmount} from './order';
import {shopConfig} from './config';

export const addressSchema=z.object({
 street:z.string().trim().min(4).max(200).regex(/\d/),
 postcode:z.string().trim().regex(/^\d{4}\s?[a-zA-Z]{2}$/),
 city:z.string().trim().max(80).refine(v=>v.toLowerCase()==='amsterdam'),
}).strict();

const featureSchema=z.object({
 geometry:z.object({coordinates:z.tuple([z.number().min(-180).max(180),z.number().min(-90).max(90)])}),
 properties:z.object({
  feature_type:z.string(),
  context:z.object({
   country:z.object({country_code:z.string()}),
   place:z.object({name:z.string()}),
   postcode:z.object({name:z.string()}).optional(),
   address:z.object({address_number:z.string(),street_name:z.string()}).optional(),
  }),
  match_code:z.object({address_number:z.string(),street:z.string(),confidence:z.string()}).optional(),
 }),
});

async function mapboxJson(url:URL){
 try{
  const response=await fetch(url,{signal:AbortSignal.timeout(10000),cache:'no-store'});
  if(!response.ok)throw new OrderError('deliveryUnavailable');
  return await response.json();
 }catch{throw new OrderError('deliveryUnavailable');}
}

async function geocode(street:string,postcode:string|undefined,key:string){
 const url=new URL('https://api.mapbox.com/search/geocode/v6/forward');
 url.search=new URLSearchParams({access_token:key,address_line1:street,place:'Amsterdam',country:'nl',types:'address',autocomplete:'false',limit:'1',language:'nl',...(postcode?{postcode}:{} )}).toString();
 const data=await mapboxJson(url);
 const parsed=featureSchema.safeParse(data.features?.[0]);
 if(!parsed.success)throw new OrderError('addressNotFound');
 const {properties,geometry}=parsed.data;
 const context=properties.context;
 if(context.country.country_code.toLowerCase()!=='nl'||context.place.name.toLowerCase()!=='amsterdam')throw new OrderError('invalidArea');
 const normalize=(s:string)=>s.replace(/[^\p{L}\p{N}]/gu,'').toLowerCase();
 if(properties.feature_type!=='address'||!context.address||
    normalize(context.address.street_name+context.address.address_number)!==normalize(street)||
    (postcode&&normalize(context.postcode?.name||'')!==normalize(postcode))||
    ['unmatched','plausible'].includes(properties.match_code?.address_number||'')||
    properties.match_code?.street==='unmatched'||
    properties.match_code?.confidence==='low')throw new OrderError('addressNotFound');
 return geometry.coordinates;
}

export async function deliveryQuote(address:z.infer<typeof addressSchema>){
 const key=process.env.MAPBOX_ACCESS_TOKEN;
 if(!key)throw new OrderError('deliveryUnavailable');
 // Geocode both ends on the server. Never substitute a guessed origin or straight-line distance.
 const destination=await geocode(address.street,address.postcode,key);
 let origin:[number,number];
 try{origin=await geocode('Helicopterstraat 20',undefined,key);}catch{throw new OrderError('deliveryUnavailable');}
 const url=new URL(`https://api.mapbox.com/directions/v5/mapbox/driving/${origin.join(',')};${destination.join(',')}`);
 url.search=new URLSearchParams({access_token:key,alternatives:'false',overview:'false',steps:'false'}).toString();
 const route=await mapboxJson(url);
 if(route.code==='NoRoute'||route.code==='NoSegment')throw new OrderError('routeUnavailable');
 const distance=route.routes?.[0]?.distance;
 if(route.code!=='Ok'||typeof distance!=='number'||!Number.isFinite(distance)||distance<0||distance>1_000_000)throw new OrderError('deliveryUnavailable');
 const meters=distance;
 return {distanceMeters:meters,deliveryFee:deliveryAmount(meters,shopConfig().deliveryCentsPerKm)};
}

export function addressHash(address:{street:string;postcode:string;city:string}){
 return createHash('sha256').update([address.street.trim().toLowerCase(),address.postcode.replace(/\s/g,'').toUpperCase(),address.city.trim().toLowerCase()].join('|')).digest('hex');
}
