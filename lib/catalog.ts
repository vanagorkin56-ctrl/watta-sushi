import source from '@/content/source/products.json';
import ingredients from '@/content/source/ingredients.json';
import { curatedProducts } from './curated-products';
export type Locale = 'nl' | 'en' | 'uk';
export const locales: Locale[] = ['nl', 'en', 'uk'];
export const categoryNames = {
  1: { nl: 'Rollen', en: 'Rolls', uk: 'Роли' }, 2: { nl: 'Sushi', en: 'Sushi', uk: 'Суші' },
  3: { nl: 'Sets', en: 'Sets', uk: 'Сети' }, 4: { nl: 'Soepen', en: 'Soups', uk: 'Супи' },
  5: { nl: 'Poké bowls', en: 'Poké bowls', uk: 'Боули' }, 6: { nl: 'Bijgerechten', en: 'Sides', uk: 'Закуски' },
  35: { nl: 'Desserts', en: 'Desserts', uk: 'Десерти' }, 7: { nl: 'Dranken', en: 'Drinks', uk: 'Напої' },
  8: { nl: 'Sauzen', en: 'Sauces', uk: 'Соуси' },
} satisfies Record<number, Record<Locale, string>>;
export const categories = Object.entries(categoryNames).map(([id, names]) => ({id: Number(id), names}));
export type Product = {
  id: number;
  name: Record<Locale, string>;
  description: Record<Locale, string>;
  meta?: Record<Locale, string>;
  price: number;
  image: string;
  images?: string[];
  categoryId: number;
  rollUnits: number;
  popular: boolean;
  isNew: boolean;
};
const sourceProducts: Product[] = source.filter(p => !p.isArchived && p.category.isActive).map(p => {
  const description = (lang: 'en' | 'nl' | 'ua') => p[`description_${lang}`] || p.ingredientIds.map(id => ingredients.find(i => i.id === id)?.[`name_${lang}`]).filter(Boolean).join(', ');
  return { id: p.id, name: { nl: p.name_nl || p.name_en, en: p.name_en, uk: p.name_ua || p.name_en },
    description: { nl: description('nl'), en: description('en'), uk: description('ua') },
    price: Math.round(p.price * 100), image: `/menu/${p.id}.jpg`, categoryId: p.categoryId,
    rollUnits: p.categoryId === 1 ? 1 : 0, popular: p.isPopular, isNew: p.isMenuNew };
});
export const products: Product[] = [...sourceProducts, ...curatedProducts];
export const money = (cents: number, locale: Locale = 'nl') => new Intl.NumberFormat(locale === 'uk' ? 'uk-UA' : locale === 'nl' ? 'nl-NL' : 'en-IE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
