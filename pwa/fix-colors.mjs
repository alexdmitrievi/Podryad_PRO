import { readFileSync, writeFileSync } from 'fs';

const files = [
  'src/app/order/[id]/status/page.tsx',
  'src/app/order/[id]/confirm/page.tsx',
  'src/app/dashboard/page.tsx',
];

for (const f of files) {
  let c = readFileSync(f, 'utf-8');
  const before = c;
  c = c.replaceAll('text-[#2d35a8]', 'text-brand-600');
  c = c.replaceAll('bg-[#2d35a8]', 'bg-brand-600');
  c = c.replaceAll('border-[#2d35a8]', 'border-brand-600');
  c = c.replaceAll('hover:bg-[#2d35a8]', 'hover:bg-brand-600');
  c = c.replaceAll('hover:bg-[#1a1f5c]', 'hover:bg-brand-900');
  c = c.replaceAll('text-[#1a1f5c]', 'text-brand-900');
  c = c.replaceAll('focus:ring-[#2d35a8]', 'focus:ring-brand-600');
  c = c.replaceAll('stroke="#2F5BFF"', 'stroke="currentColor"');
  if (c !== before) {
    console.log('Fixed:', f);
  } else {
    console.log('No changes:', f);
  }
  writeFileSync(f, c);
}
