'use client';

import { Select } from '@base-ui/react/select';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { useShop } from './shop-provider';
import type { Locale } from '@/lib/catalog';

const languages: { value: Locale; label: string; short: string }[] = [
  { value: 'nl', label: 'Nederlands', short: 'NL' },
  { value: 'en', label: 'English', short: 'EN' },
  { value: 'uk', label: 'Українська', short: 'UA' },
];

export function LanguageSwitcher() {
  const { locale, setLocale } = useShop();
  const current = languages.find(language => language.value === locale)!;

  return (
    <Select.Root
      value={locale}
      items={languages}
      onValueChange={value => { if (value) setLocale(value); }}
    >
      <Select.Trigger className="language-trigger" aria-label="Language / Taal / Мова">
        <Globe size={17} aria-hidden="true" />
        <Select.Value>{() => current.short}</Select.Value>
        <Select.Icon className="language-chevron"><ChevronDown size={14} /></Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner className="language-positioner" side="bottom" align="end" sideOffset={10} collisionPadding={12} alignItemWithTrigger={false}>
          <Select.Popup className="language-popup">
            <div className="language-heading">Taal / Language / Мова</div>
            <Select.List className="language-list">
              {languages.map(language => (
                <Select.Item key={language.value} value={language.value} className="language-option">
                  <span className="language-code" aria-hidden="true">{language.short}</span>
                  <Select.ItemText lang={language.value}>{language.label}</Select.ItemText>
                  <Select.ItemIndicator className="language-check"><Check size={16} /></Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
