export function shopConfig() {
 // Local SQLite cannot durably fulfill payments on Vercel's ephemeral filesystem.
 // Enable serverless checkout only after a shared order store is connected.
 return {name:'Watta Sushi',phone:'+31649326549',email:'Info@wattaholding.nl',currency:'EUR',deliveryCity:'Amsterdam',hours:'14:00–21:00',
  deliveryCentsPerKm:80,minimumRolls:2,pickupAddress:'Helicopterstraat 20, Amsterdam, Netherlands',
  deliveryReady:Boolean(process.env.MAPBOX_ACCESS_TOKEN && (process.env.DELIVERY_QUOTE_SECRET||process.env.STRIPE_WEBHOOK_SECRET||'').length>=24),
  checkoutReady:Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET && (process.env.STRIPE_SECRET_KEY.startsWith('sk_test_')||process.env.STRIPE_LIVE_APPROVED==='true') && !process.env.VERCEL),
 };
}
export type ShopConfig=ReturnType<typeof shopConfig>;
