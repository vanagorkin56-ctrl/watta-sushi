import { DatabaseSync } from 'node:sqlite';
import { chmodSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { CheckoutInput, PricedOrder } from './order';
let database: DatabaseSync | undefined;
export function db() {
 if(database) return database;
 const path=resolve(/* turbopackIgnore: true */ process.env.DATABASE_PATH||'data/watta.sqlite'); mkdirSync(dirname(path),{recursive:true,mode:0o700});
 database=new DatabaseSync(path);
 try{chmodSync(path,0o600);}catch{}
 database.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, request_id TEXT NOT NULL UNIQUE, request_hash TEXT NOT NULL, locale TEXT NOT NULL, customer TEXT NOT NULL, pricing TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', session_id TEXT UNIQUE, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, paid_at TEXT);
 CREATE TABLE IF NOT EXISTS stripe_events (id TEXT PRIMARY KEY, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
 CREATE TABLE IF NOT EXISTS email_jobs (id TEXT PRIMARY KEY, order_id TEXT NOT NULL, recipient TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0, locked_at INTEGER, last_error TEXT, UNIQUE(order_id,recipient));`);
 return database;
}
export type OrderRecord = {id:string;request_id:string;request_hash:string;locale:CheckoutInput['locale'];customer:string;pricing:string;status:'pending'|'paid'|'expired'|'failed';session_id:string|null;created_at:string;paid_at:string|null};
export const getOrder = (id:string) => db().prepare('SELECT * FROM orders WHERE id=?').get(id) as OrderRecord|undefined;
export const getOrderByRequest = (id:string) => db().prepare('SELECT * FROM orders WHERE request_id=?').get(id) as OrderRecord|undefined;
export const getOrderBySession = (id:string) => db().prepare('SELECT * FROM orders WHERE session_id=?').get(id) as OrderRecord|undefined;
export function createOrder(input:CheckoutInput, pricing:PricedOrder, hash:string) {
 const id=randomUUID();
 db().prepare('INSERT OR IGNORE INTO orders (id,request_id,request_hash,locale,customer,pricing) VALUES (?,?,?,?,?,?)').run(id,input.requestId,hash,input.locale,JSON.stringify(input.customer),JSON.stringify(pricing));
 return getOrderByRequest(input.requestId)!;
}
export function createDeliveryQuote(addressHash:string,distanceMeters:number){
 db().exec('CREATE TABLE IF NOT EXISTS delivery_quotes (id TEXT PRIMARY KEY, address_hash TEXT NOT NULL, distance_meters INTEGER NOT NULL, expires_at INTEGER NOT NULL)');
 const id=randomUUID(); const expires=Date.now()+15*60*1000;
 db().prepare('DELETE FROM delivery_quotes WHERE expires_at<?').run(Date.now());
 db().prepare('INSERT INTO delivery_quotes VALUES (?,?,?,?)').run(id,addressHash,distanceMeters,expires);
 return {id,expires};
}
export function readDeliveryQuote(id:string){
 db().exec('CREATE TABLE IF NOT EXISTS delivery_quotes (id TEXT PRIMARY KEY, address_hash TEXT NOT NULL, distance_meters INTEGER NOT NULL, expires_at INTEGER NOT NULL)');
 return db().prepare('SELECT * FROM delivery_quotes WHERE id=?').get(id) as {id:string;address_hash:string;distance_meters:number;expires_at:number}|undefined;
}
