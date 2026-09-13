import {NextResponse} from 'next/server';
import {getOrderBySession} from '@/lib/db';
export const runtime='nodejs';
export async function GET(request:Request){
 const session=new URL(request.url).searchParams.get('session_id');
 if(!session||!/^cs_(test_|live_)?[a-zA-Z0-9]{16,240}$/.test(session))return NextResponse.json({error:'notFound'},{status:400});
 const order=getOrderBySession(session);if(!order)return NextResponse.json({error:'notFound'},{status:404});
 const pricing=JSON.parse(order.pricing);
 return NextResponse.json({number:order.id.slice(0,8).toUpperCase(),status:order.status,total:pricing.total},{headers:{'Cache-Control':'no-store'}});
}
