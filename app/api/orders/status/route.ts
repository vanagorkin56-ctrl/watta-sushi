import {NextResponse} from 'next/server';
import {getOrderBySession} from '@/lib/db';
import {checkRateLimit} from '@/lib/security';
export const runtime='nodejs';
export async function GET(request:Request){
 const limit=checkRateLimit(request,'order-status',{limit:60,globalLimit:600,windowMs:60000});
 if(!limit.allowed)return NextResponse.json({error:'rateLimited'},{status:429,headers:{'Retry-After':String(limit.retryAfter),'Cache-Control':'no-store'}});
 const session=new URL(request.url).searchParams.get('session_id');
 if(!session||!/^cs_(test_|live_)?[a-zA-Z0-9]{16,240}$/.test(session))return NextResponse.json({error:'notFound'},{status:400});
 const order=getOrderBySession(session);if(!order)return NextResponse.json({error:'notFound'},{status:404});
 const pricing=JSON.parse(order.pricing);
 return NextResponse.json({number:order.id.slice(0,8).toUpperCase(),status:order.status,total:pricing.total},{headers:{'Cache-Control':'no-store'}});
}
