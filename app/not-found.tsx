'use client';
import Link from 'next/link';
import {useShop} from '@/components/shop-provider';

export default function NotFound(){
 const {t}=useShop();
 return <div className="container page-wrap"><div className="page-heading"><span className="eyebrow">404</span><h1>{t.pageNotFound}</h1><p>{t.pageNotFoundText}</p><Link className="button" href="/menu">{t.viewMenu}</Link></div></div>;
}
