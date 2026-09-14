'use client';

import {Select} from '@base-ui/react/select';
import {Check,ChevronDown} from 'lucide-react';
import {useId,useState} from 'react';
import type {Locale} from '@/lib/catalog';

const countries=[
 ['NL','🇳🇱','+31','06 1234 5678','0'],['AT','🇦🇹','+43','0664 1234567','0'],['BE','🇧🇪','+32','0470 12 34 56','0'],
 ['BG','🇧🇬','+359','088 123 4567','0'],['HR','🇭🇷','+385','091 234 5678','0'],['CY','🇨🇾','+357','96 123456',''],
 ['CZ','🇨🇿','+420','601 123 456',''],['DK','🇩🇰','+45','20 12 34 56',''],['EE','🇪🇪','+372','5123 4567',''],
 ['FI','🇫🇮','+358','040 123 4567','0'],['FR','🇫🇷','+33','06 12 34 56 78','0'],['DE','🇩🇪','+49','0151 23456789','0'],
 ['GR','🇬🇷','+30','0691 234 5678','0'],['HU','🇭🇺','+36','06 20 123 4567','06'],['IE','🇮🇪','+353','087 123 4567','0'],
 ['IT','🇮🇹','+39','312 345 6789',''],['LV','🇱🇻','+371','21 234 567',''],['LT','🇱🇹','+370','0612 34567','0'],
 ['LU','🇱🇺','+352','621 123 456',''],['MT','🇲🇹','+356','9912 3456',''],['PL','🇵🇱','+48','512 345 678',''],
 ['PT','🇵🇹','+351','912 345 678',''],['RO','🇷🇴','+40','0721 234 567','0'],['SK','🇸🇰','+421','0901 234 567','0'],
 ['SI','🇸🇮','+386','041 234 567','0'],['ES','🇪🇸','+34','612 345 678',''],['SE','🇸🇪','+46','070 123 45 67','0'],
 ['UA','🇺🇦','+380','098 534 21 36','0'],
] as const;
type Country=(typeof countries)[number];

export function PhoneInput({locale,label}:{locale:Locale;label:string}){
 const labelId=useId();
 const [iso,setIso]=useState<Country[0]>('NL');
 const [local,setLocal]=useState('');
 const country=countries.find(item=>item[0]===iso)!;
 const displayNames=new Intl.DisplayNames([locale==='uk'?'uk-UA':locale],{type:'region'});
 const digits=local.replace(/\D/g,'');
 const national=country[4]&&digits.startsWith(country[4])?digits.slice(country[4].length):digits;
 const complete=`${country[2]}${national}`;
 const exampleLabel=locale==='uk'?'Приклад':locale==='nl'?'Voorbeeld':'Example';
 return <div className="field phone-field">
  <span id={labelId}>{label}</span>
  <div className="phone-control">
   <Select.Root value={iso} onValueChange={value=>{if(value)setIso(value as Country[0]);}}>
    <Select.Trigger className="phone-country-trigger" aria-label={`${label}: country code`}>
     <span aria-hidden="true">{country[1]}</span><Select.Value>{()=>country[2]}</Select.Value>
     <Select.Icon className="language-chevron"><ChevronDown size={14}/></Select.Icon>
    </Select.Trigger>
    <Select.Portal><Select.Positioner className="phone-country-positioner" side="bottom" align="start" sideOffset={8} collisionPadding={12} alignItemWithTrigger={false}>
     <Select.Popup className="phone-country-popup"><div className="phone-country-heading">EU + Ukraine</div><Select.List className="phone-country-list">
      {countries.map(item=><Select.Item key={item[0]} value={item[0]} className="phone-country-option">
       <span className="country-flag" aria-hidden="true">{item[1]}</span><Select.ItemText>{displayNames.of(item[0])}</Select.ItemText><span className="country-dial">{item[2]}</span><Select.ItemIndicator className="language-check"><Check size={15}/></Select.ItemIndicator>
      </Select.Item>)}
     </Select.List></Select.Popup>
    </Select.Positioner></Select.Portal>
   </Select.Root>
   <input aria-labelledby={labelId} type="tel" inputMode="tel" autoComplete="tel-national" required minLength={6} maxLength={20} pattern="[0-9 ()-]{6,20}" value={local} onChange={event=>setLocal(event.target.value)} placeholder={country[3]}/>
   <input type="hidden" name="phone" value={complete}/>
  </div>
  <small className="phone-example">{exampleLabel}: {country[2]} {country[3]}</small>
 </div>;
}
