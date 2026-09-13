import Stripe from 'stripe';
export function stripeClient() {
 const key=process.env.STRIPE_SECRET_KEY;
 if(!key) throw new Error('Stripe is not configured');
 if(!key.startsWith('sk_test_') && process.env.STRIPE_LIVE_APPROVED!=='true') throw new Error('Live payments require explicit approval');
 return new Stripe(key,{maxNetworkRetries:2,timeout:20000});
}
export function appUrl() {
 const url=new URL(process.env.APP_URL||'http://localhost:3000');
 if(process.env.NODE_ENV==='production' && url.protocol!=='https:') throw new Error('APP_URL must use HTTPS in production');
 return url.origin;
}
