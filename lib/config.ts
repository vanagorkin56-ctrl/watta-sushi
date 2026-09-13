export function shopConfig() {
 return {name:'Watta Sushi',phone:'+31649326549',email:'Info@wattaholding.nl',currency:'EUR',deliveryCity:'Amsterdam',hours:'14:00–21:00',
  deliveryCentsPerKm:80,minimumRolls:2,pickupAddress:'Helicopterstraat 20, Amsterdam, Netherlands',
  deliveryReady:Boolean(process.env.GOOGLE_MAPS_API_KEY),
  checkoutReady:Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET && process.env.SMTP_HOST && process.env.SMTP_FROM),
 };
}
export type ShopConfig=ReturnType<typeof shopConfig>;
