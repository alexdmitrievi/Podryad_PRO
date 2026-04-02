Quick task 260402-vfx: Landing page visual polish

## Description
Enhanced page.tsx visual design without changing structure or logic.

## Changes (single file: page.tsx)
1. **Hero**: Added noise-overlay + hero-pattern CSS classes, backdrop-blur stats card with count-up animation (500+ orders, 200+ contractors), staggered fade-in animations
2. **Service cards**: rounded-[16px], shadow-card → shadow-card-hover on hover, hover:scale-[1.02] transition, SVG icon badges
3. **Sections**: Light (#f8f9fc) / dark (#0f1129) alternating backgrounds (preserved)
4. **Form**: shadow-2xl, min-h-[48px] touch targets on all buttons/inputs, focus:ring-2, shadow-glow on active selectors
5. **Counters**: useCountUp hook with IntersectionObserver trigger and easeOutCubic
6. **Sticky CTA**: Fixed bottom bar on mobile (md:hidden), backdrop-blur, safe-area-pb
7. **Scroll-reveal**: useReveal hook with IntersectionObserver for sections

## Dependencies
Uses existing CSS classes from globals.css: noise-overlay, hero-pattern, reveal/visible, shadow-card/card-hover, shadow-elevated, shadow-glow, safe-area-pb, tabular-nums
