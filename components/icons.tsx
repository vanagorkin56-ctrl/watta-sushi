import type { ReactNode } from 'react';

/** A 24px, rounded outline family for the food categories. */
const foodPaths: Record<number, ReactNode> = {
  0: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
  1: <><ellipse cx="12" cy="8" rx="8" ry="4.5"/><ellipse cx="12" cy="8" rx="3" ry="1.7"/><path d="M4 8v8c0 2.5 3.6 4.5 8 4.5s8-2 8-4.5V8M8 12v7M16 12v7"/></>,
  2: <><path d="M3 11c0-4 4-7 9-7s9 3 9 7l-1 2H4l-1-2ZM5 13v4c0 2 3 3 7 3s7-1 7-3v-4M9 5l-3 5M15 5l-3 5M19 7l-2 3M10 13v7M14 13v7"/></>,
  3: <><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M12 3v18M3 12h18"/><circle cx="7.5" cy="7.5" r="1.5"/><circle cx="16.5" cy="16.5" r="1.5"/><path d="m6 16 3 1M15 7l3 1"/></>,
  4: <><path d="M3 11h18c0 5-4 8-9 8s-9-3-9-8ZM8 21h8M8 7c-2-2 2-2 0-4M13 7c-2-2 2-2 0-4M18 7c-2-2 2-2 0-4"/></>,
  5: <><path d="M3 12h18c-1 6-4 8-9 8s-8-2-9-8ZM5 12V9a3 3 0 0 1 6 0v3M11 10a4 4 0 0 1 8 0v2M13 6l3-3M17 6l4-1"/></>,
  6: <><path d="M5 6c2-2 5-3 8-2 4 1 7 5 7 9 0 4-3 7-7 7-2 0-4-1-5-3M5 6l3 3-3 3-3-3 3-3ZM8 9c3-1 6 1 6 4s-3 4-6 4M14 5l-1 4M18 8l-3 3M20 13h-6M18 18l-3-3"/></>,
  35: <><path d="m4 10 12-5 4 5v10H4V10ZM4 10h16M4 15c2 2 4-2 6 0s4-2 6 0 4 0 4 0M12 6V3"/><circle cx="12" cy="3" r="1"/></>,
  7: <><path d="M6 8h12l-1 13H7L6 8ZM13 8l2-5h5M5 8h14M8 13h8"/></>,
  8: <><path d="M4 12h16c0 5-3 8-8 8s-8-3-8-8ZM12 3s-3 3-3 5a3 3 0 0 0 6 0c0-2-3-5-3-5Z"/></>,
};
export function CategoryIcon({ id, title }: { id: number; title: string }) {
  return <svg className="food-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><title>{title}</title>{foodPaths[id] || foodPaths[0]}</svg>;
}
export function SocialIcon({ name }: { name: 'Instagram' | 'TikTok' | 'Telegram' }) {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><title>{name}</title>{name === 'Instagram' ? <><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none"/></> : name === 'Telegram' ? <><path d="m3 11 18-7-4 16-6-5-4 3v-6l10-5-9 7"/></> : <><path d="M14 3h3c0 3 2 5 4 5v3c-2 0-4-1-5-2v7a5 5 0 1 1-5-5v3a2 2 0 1 0 2 2V3Z"/></>}</svg>;
}
