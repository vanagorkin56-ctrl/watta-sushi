import {createHash} from 'node:crypto';
import {z} from 'zod';
import {OrderError,deliveryAmount} from './order';
import {shopConfig} from './config';
export const addressSchema=z.object({street:z.string().trim().min(4).max(200).regex(/\d/),postcode:z.string().trim().regex(/^\d{4}\s?[a-zA-Z]{2}$/),city:z.string().trim().refine(v=>v.toLowerCase()==='amsterdam')}).strict();
export async function deliveryQuote(address:z.infer<typeof addressSchema>){
 const key=process.env.GOOGLE_MAPS_API_KEY;if(!key)throw new OrderError('deliveryUnavailable');
 const config=shopConfig();
 const inputPostcode=address.postcode.replace(/\s/g,'').toUpperCase();
 const query=new URLSearchParams({address:`${address.street}, ${inputPostcode}, Amsterdam`,components:'country:NL',key});
 const geoResponse=await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${query}`,{signal:AbortSignal.timeout(10000),cache:'no-store'});
 if(!geoResponse.ok)throw new OrderError('deliveryUnavailable');
 const geo=await geoResponse.json();const result=geo.results?.[0];
 if(geo.status!=='OK'||!result)throw new OrderError(geo.status==='ZERO_RESULTS'?'invalidArea':'deliveryUnavailable');
 const part=(type:string)=>result.address_components?.find((c:{types:string[]})=>c.types.includes(type))?.long_name;
 if(result.partial_match || part('locality')?.toLowerCase()!=='amsterdam' || part('postal_code')?.replace(/\s/g,'').toUpperCase()!==inputPostcode || !part('street_number'))throw new OrderError('invalidArea');
 const destination=result.geometry.location;
 const routeResponse=await fetch('https://routes.googleapis.com/directions/v2:computeRoutes',{method:'POST',headers:{'Content-Type':'application/json','X-Goog-Api-Key':key,'X-Goog-FieldMask':'routes.distanceMeters'},body:JSON.stringify({origin:{address:config.pickupAddress},destination:{location:{latLng:{latitude:destination.lat,longitude:destination.lng}}},travelMode:'DRIVE',routingPreference:'TRAFFIC_UNAWARE',computeAlternativeRoutes:false}),signal:AbortSignal.timeout(10000),cache:'no-store'});
 if(!routeResponse.ok)throw new OrderError('deliveryUnavailable');
 const route=await routeResponse.json();const meters=route.routes?.[0]?.distanceMeters;
 if(!Number.isSafeInteger(meters)||meters<0)throw new OrderError('deliveryUnavailable');
 return {distanceMeters:meters,deliveryFee:deliveryAmount(meters,config.deliveryCentsPerKm),formattedAddress:result.formatted_address};
}

export function addressHash(address:{street:string;postcode:string;city:string}){return createHash('sha256').update([address.street.trim().toLowerCase(),address.postcode.replace(/\s/g,'').toUpperCase(),address.city.trim().toLowerCase()].join('|')).digest('hex');}
