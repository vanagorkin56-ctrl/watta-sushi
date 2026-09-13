'use client';
import {useEffect,useState,useRef} from 'react';
import Link from 'next/link';
import {Check,Clock3,ArrowRight,AlertCircle} from 'lucide-react';
import {useShop} from './shop-provider';
import {money} from '@/lib/catalog';
export function Success(){const {t,locale,clear,ready}=useShop();const [order,setOrder]=useState<{number:string;status:string;total:number}|null>(null);const [error,setError]=useState('');const [retry,setRetry]=useState(0);const cleared=useRef(false);const clearRef=useRef(clear);clearRef.current=clear;
 useEffect(()=>{if(!ready)return;const session=new URLSearchParams(window.location.search).get('session_id');if(!session){setError('missingSession');return;}let stopped=false;let timer:ReturnType<typeof setTimeout>;let attempts=0;
 async function check(){try{const r=await fetch(`/api/orders/status?session_id=${encodeURIComponent(session!)}`,{cache:'no-store'});const data=await r.json();if(stopped)return;if(!r.ok)throw new Error(data.error);setOrder(data);setError('');if(data.status==='paid'){if(!cleared.current){clearRef.current();cleared.current=true;}}else if(data.status==='pending'&&attempts++<30)timer=setTimeout(check,2500);}catch(e){if(!stopped)setError(e instanceof Error?e.message:'genericError');}}
 check();return()=>{stopped=true;clearTimeout(timer);};},[retry,ready]);
 const paid=order?.status==='paid';const failed=order?.status==='failed'||order?.status==='expired';return <div className="container page-wrap"><div className="success-panel"><div className="status-icon">{paid?<Check size={33}/>:error||failed?<AlertCircle size={30}/>:<Clock3 size={33}/>}</div><h1>{paid?t.successTitle:failed?t.paymentFailed:t.waitingTitle}</h1><p>{error?(error in t?t[error as keyof typeof t]:t.genericError):paid?t.successText:failed?'':t.waitingText}</p>{order&&<><div className="sum-row"><span>{t.orderNumber}</span><strong>{order.number}</strong></div><div className="sum-row"><span>{t.total}</span><strong>{money(order.total,locale)}</strong></div></>}{!paid&&<button className="button outline" onClick={()=>setRetry(r=>r+1)}>{t.refresh}</button>}<div><Link className="button" href="/menu">{t.back}<ArrowRight size={17}/></Link></div></div></div>;
}
