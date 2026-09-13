'use client';
import {createContext,useContext,useState,useEffect,type ReactNode} from 'react';
import {products,type Locale} from '@/lib/catalog';
import {copy} from '@/lib/copy';
import type {ShopConfig} from '@/lib/config';
type CartItem={productId:number;quantity:number};
type Context={locale:Locale;setLocale:(l:Locale)=>void;t:ReturnType<typeof copy>;cart:CartItem[];add:(id:number)=>void;change:(id:number,delta:number)=>void;remove:(id:number)=>void;clear:()=>void;count:number;subtotal:number;rolls:number;cartOpen:boolean;setCartOpen:(v:boolean)=>void;config:ShopConfig;ready:boolean};
const ShopContext=createContext<Context|null>(null);
export function ShopProvider({children,config}:{children:ReactNode;config:ShopConfig}){
 const [locale,setLocale]=useState<Locale>('nl');const [cart,setCart]=useState<CartItem[]>([]);const [ready,setReady]=useState(false);const [cartOpen,setCartOpen]=useState(false);
 useEffect(()=>{try{const l=localStorage.getItem('watta-language');if(l==='nl'||l==='en'||l==='uk')setLocale(l);const raw=JSON.parse(localStorage.getItem('watta-cart')||'[]');if(Array.isArray(raw)){const map=new Map<number,number>();for(const i of raw){if(i&&products.some(p=>p.id===i.productId)&&Number.isInteger(i.quantity)&&i.quantity>0)map.set(i.productId,Math.min(30,(map.get(i.productId)||0)+i.quantity));}setCart([...map].map(([productId,quantity])=>({productId,quantity})));}}catch{}setReady(true);},[]);
 useEffect(()=>{if(ready){try{localStorage.setItem('watta-cart',JSON.stringify(cart));localStorage.setItem('watta-language',locale);}catch{}document.documentElement.lang=locale;}},[cart,locale,ready]);
 useEffect(()=>{const root=document.documentElement;const keyboard=()=>{root.dataset.input='keyboard';};const pointer=()=>{root.dataset.input='pointer';};document.addEventListener('keydown',keyboard,true);document.addEventListener('pointerdown',pointer,true);return()=>{document.removeEventListener('keydown',keyboard,true);document.removeEventListener('pointerdown',pointer,true);};},[]);
 const change=(id:number,delta:number)=>setCart(prev=>prev.map(i=>i.productId===id?{...i,quantity:Math.min(30,i.quantity+delta)}:i).filter(i=>i.quantity>0));
 const add=(id:number)=>setCart(prev=>prev.some(i=>i.productId===id)?prev.map(i=>i.productId===id?{...i,quantity:Math.min(30,i.quantity+1)}:i):[...prev,{productId:id,quantity:1}]);
 const subtotal=cart.reduce((s,i)=>s+(products.find(p=>p.id===i.productId)?.price||0)*i.quantity,0);
 const rolls=cart.reduce((s,i)=>s+(products.find(p=>p.id===i.productId)?.rollUnits||0)*i.quantity,0);
 return <ShopContext.Provider value={{locale,setLocale,t:copy(locale),cart,add,change,remove:id=>setCart(p=>p.filter(i=>i.productId!==id)),clear:()=>setCart([]),count:cart.reduce((s,i)=>s+i.quantity,0),subtotal,rolls,cartOpen,setCartOpen,config,ready}}>{children}</ShopContext.Provider>;
}
export function useShop(){const context=useContext(ShopContext);if(!context)throw new Error('ShopProvider missing');return context;}
