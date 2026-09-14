import type {Metadata} from 'next';
import {ShopProvider} from '@/components/shop-provider';
import {Header,Footer,CartDrawer,MobileCart,InstagramButton} from '@/components/shell';
import {shopConfig} from '@/lib/config';
import localFont from 'next/font/local';
import './globals.css';
import './design.css';
const onest = localFont({src:'./fonts/Onest.ttf',variable:'--font-body',weight:'100 900',display:'swap'});
const manrope = localFont({src:'./fonts/Manrope.ttf',variable:'--font-display',weight:'200 800',display:'swap'});
export const metadata:Metadata={title:{default:'Watta Sushi — Fresh sushi in Amsterdam',template:'%s | Watta Sushi'},description:'Fresh sushi and rolls delivered throughout Amsterdam. Order online or pick up at Helicopterstraat 20. Every day 14:00–21:00.',icons:{icon:'/brand/mascot.png',apple:'/brand/mascot.png'}};
export const dynamic='force-dynamic';
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="nl" className={`${onest.variable} ${manrope.variable}`}><body><ShopProvider config={shopConfig()}><Header/><main id="main">{children}</main><Footer/><InstagramButton/><CartDrawer/><MobileCart/></ShopProvider></body></html>;}
