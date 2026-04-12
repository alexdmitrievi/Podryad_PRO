import { readFileSync, writeFileSync } from 'fs';

// Revert status/page.tsx: brand-600 -> [#2d35a8], brand-900 -> [#1a1f5c]
const statusFile = 'src/app/order/[id]/status/page.tsx';
let s = readFileSync(statusFile, 'utf-8');
s = s.replaceAll('text-brand-600', 'text-[#2d35a8]');
s = s.replaceAll('bg-brand-600', 'bg-[#2d35a8]');
s = s.replaceAll('border-brand-600', 'border-[#2d35a8]');
s = s.replaceAll('hover:bg-brand-600', 'hover:bg-[#2d35a8]');
s = s.replaceAll('hover:bg-brand-900', 'hover:bg-[#1a1f5c]');
s = s.replaceAll('text-brand-900', 'text-[#1a1f5c]');
s = s.replaceAll('focus:ring-brand-600', 'focus:ring-[#2d35a8]');
writeFileSync(statusFile, s);
console.log('Reverted:', statusFile);

// Revert confirm/page.tsx
const confirmFile = 'src/app/order/[id]/confirm/page.tsx';
let c = readFileSync(confirmFile, 'utf-8');
c = c.replaceAll('text-brand-600', 'text-[#2d35a8]');
c = c.replaceAll('bg-brand-600', 'bg-[#2d35a8]');
c = c.replaceAll('border-brand-600', 'border-[#2d35a8]');
c = c.replaceAll('hover:bg-brand-600', 'hover:bg-[#2d35a8]');
c = c.replaceAll('hover:bg-brand-900', 'hover:bg-[#1a1f5c]');
c = c.replaceAll('text-brand-900', 'text-[#1a1f5c]');
c = c.replaceAll('focus:ring-brand-600', 'focus:ring-[#2d35a8]');
writeFileSync(confirmFile, c);
console.log('Reverted:', confirmFile);

// Revert dashboard/page.tsx: only lines 70 and 84 (brand-500 -> [#2F5BFF])
const dashFile = 'src/app/dashboard/page.tsx';
let d = readFileSync(dashFile, 'utf-8');
d = d.replaceAll('bg-brand-500 text-white', 'bg-[#2F5BFF] text-white');
d = d.replaceAll('border-brand-500 border-t-transparent', 'border-[#2F5BFF] border-t-transparent');
writeFileSync(dashFile, d);
console.log('Reverted:', dashFile);

console.log('All brand colors reverted to original hex values.');
