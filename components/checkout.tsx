'use client';
import {useState,useRef,useEffect,type FormEvent} from 'react';
import Link from 'next/link';
import {ArrowRight,ArrowLeft,Bike,Store,LockKeyhole,MapPin} from 'lucide-react';
import {useShop} from './shop-provider';
import {CartLines} from './shell';
import {PhoneInput} from './phone-input';
import {money} from '@/lib/catalog';

export function Checkout(){
 const {t,locale,cart,count,subtotal,rolls,config,ready}=useShop();
 const [fulfillment,setFulfillment]=useState<'delivery'|'pickup'>('delivery');
 const [street,setStreet]=useState('');const [postcode,setPostcode]=useState('');const [city,setCity]=useState('Amsterdam');
 const [quote,setQuote]=useState<{deliveryFee:number;distanceMeters:number;quoteId:string}|null>(null);
 const [addressError,setAddressError]=useState('');
 const [quoting,setQuoting]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [cancelled,setCancelled]=useState(false);
 const lastRequest=useRef<{payload:string;id:string}|null>(null);const addressVersion=useRef(0);
 useEffect(()=>{setCancelled(new URLSearchParams(window.location.search).has('cancelled'));},[]);
 function message(code:string){return code in t?t[code as keyof typeof t]:t.genericError;}
 function changeAddress(setter:(s:string)=>void,value:string){setter(value);setQuote(null);setAddressError('');addressVersion.current++;}
 async function calculate(){setQuoting(true);setAddressError('');setQuote(null);const version=addressVersion.current;try{const r=await fetch('/api/delivery-quote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({street,postcode,city})});const data=await r.json();if(!r.ok)throw new Error(data.error);if(version===addressVersion.current)setQuote(data);}catch(e){if(version===addressVersion.current)setAddressError(e instanceof Error?e.message:'deliveryUnavailable');}finally{setQuoting(false);}}
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setError('');if(rolls<config.minimumRolls){setError('minimumError');return;}if(fulfillment==='delivery'&&!quote){setError('quoteRequired');return;}setBusy(true);
  const f=new FormData(event.currentTarget);const payload={locale,acceptedTerms:f.get('acceptedTerms')==='on',...(fulfillment==='delivery'&&quote?{quoteId:quote.quoteId}:{}),items:cart,customer:{name:String(f.get('name')),email:String(f.get('email')),phone:String(f.get('phone')),fulfillment,street,postcode,city,comment:String(f.get('comment')||'')}};
  const serialized=JSON.stringify(payload);if(lastRequest.current?.payload!==serialized)lastRequest.current={payload:serialized,id:crypto.randomUUID()};
  try{const response=await fetch('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,requestId:lastRequest.current!.id})});const data=await response.json();if(!response.ok){if(['requestConflict','sessionExpired'].includes(data.error))lastRequest.current=null;if(['quoteRequired','deliveryChanged'].includes(data.error)){setQuote(null);setAddressError(data.error);}throw new Error(data.error);}if(!data.url)throw new Error('genericError');window.location.assign(data.url);}catch(e){setError(e instanceof Error?e.message:'genericError');setBusy(false);}
 }
 const deliveryFee=fulfillment==='pickup'?0:quote?.deliveryFee;
 if(!ready)return <div className="page-wrap container" aria-busy="true">…</div>;
 if(!count)return <div className="page-wrap container"><div className="empty-cart"><h1>{t.empty}</h1><p>{t.emptyText}</p><Link className="button" href="/menu">{t.browse}<ArrowRight size={18}/></Link></div></div>;
 return <div className="page-wrap container">
  <div className="page-heading"><Link href="/menu" className="eyebrow"><ArrowLeft size={13}/>{t.back}</Link><h1>{t.checkoutTitle}</h1><p>{t.checkoutText}</p></div>{cancelled&&<p className="notice">{t.cancelled}</p>}
  <div className="checkout-grid"><form className="form-panel" onSubmit={submit}>
   <h2>01 / {t.details}</h2>
   <label className="field">{t.name}<input name="name" autoComplete="name" required minLength={2} maxLength={120}/></label>
   <div className="form-row"><label className="field">{t.email}<input name="email" type="email" autoComplete="email" required maxLength={254}/></label><PhoneInput locale={locale} label={t.phone}/></div>
   <h2>02 / {t.receive}</h2>
   <div className="fulfillment"><button type="button" aria-pressed={fulfillment==='delivery'} className={fulfillment==='delivery'?'selected':''} onClick={()=>setFulfillment('delivery')}><Bike size={19}/>{t.deliver}</button><button type="button" aria-pressed={fulfillment==='pickup'} className={fulfillment==='pickup'?'selected':''} onClick={()=>setFulfillment('pickup')}><Store size={19}/>{t.pickup}</button></div>
   {fulfillment==='delivery'?<>
    <label className="field">{t.street}<input autoComplete="street-address" required value={street} onChange={e=>changeAddress(setStreet,e.target.value)} minLength={4} maxLength={200}/></label>
    <div className="form-row"><label className="field">{t.postcode}<input autoComplete="postal-code" required value={postcode} onChange={e=>changeAddress(setPostcode,e.target.value)} placeholder="1012 AB" pattern="[0-9]{4}[ ]?[a-zA-Z]{2}" maxLength={7}/></label><label className="field">{t.town}<input autoComplete="address-level2" required value={city} onChange={e=>changeAddress(setCity,e.target.value)} maxLength={80}/></label></div>
    <button type="button" className="button outline" disabled={quoting||!street||!postcode} onClick={calculate}><MapPin size={16}/>{quoting?t.calculating:t.calculate}</button><p className="small-muted">{t.routeTerms}</p>
    {quote&&<p className="notice">{t.distance}: {(quote.distanceMeters/1000).toFixed(2)} km · {money(quote.deliveryFee,locale)}<br/><small>Mapbox</small></p>}
    {addressError&&<p className="notice" role="alert">{message(addressError)}</p>}
   </>:<p className="notice">{t.pickupFree}<br/><strong>Helicopterstraat 20</strong><br/>Amsterdam, Netherlands<br/>{t.daily} 14:00–21:00</p>}
   <label className="field" style={{marginTop:24}}>{t.comment}<textarea name="comment" placeholder={t.commentPlaceholder} maxLength={1000}/></label><p className="small-muted">{t.allergyText}</p>
   <label className="form-terms"><input type="checkbox" name="acceptedTerms" required/><span>{t.policy} <Link href="/delivery">{t.delivery}</Link> · <Link href="/privacy">{t.privacy}</Link></span></label>
   {!config.checkoutReady&&<p className="notice">{t.paymentUnavailable} <Link href="/contacts">{t.contactUs}</Link></p>}{error&&<p className="notice" role="alert">{message(error)}</p>}
   <button className="button full" type="submit" disabled={busy||!config.checkoutReady||rolls<config.minimumRolls||(fulfillment==='delivery'&&!quote)}>{busy?t.placing:t.pay}<ArrowRight size={18}/></button><p className="secure"><LockKeyhole size={13}/>{t.secure}</p>
  </form><aside className="summary-panel"><h2>{t.summary} <span className="small-muted">({count})</span></h2><CartLines/><div className="sum-row"><span>{t.subtotal}</span><strong>{money(subtotal,locale)}</strong></div><div className="sum-row"><span>{t.deliveryFee}</span><strong>{deliveryFee!==undefined?money(deliveryFee,locale):'€0,80 / km'}</strong></div><div className="sum-row total"><span>{deliveryFee===undefined?t.subtotal:t.total}</span><strong>{money(subtotal+(deliveryFee||0),locale)}</strong></div><p className={rolls<config.minimumRolls?'notice':'small-muted'}>{t.minimumRolls} · {rolls}/{config.minimumRolls}</p></aside></div>
 </div>;
}
