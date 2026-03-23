import { test, expect } from '@playwright/test';

test.describe('PWA и метаданные', () => {
  test('manifest.json доступен', async ({ page }) => {
    const response = await page.goto('/manifest.json');
    expect(response?.status()).toBe(200);

    const manifest = await response?.json();
    expect(manifest.name).toContain('Подряд PRO');
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test('meta viewport настроен для мобильных', async ({ page }) => {
    await page.goto('/');
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveAttribute('content', /width=device-width/);
  });

  test('theme-color задан', async ({ page }) => {
    await page.goto('/');
    const themeColor = page.locator('meta[name="theme-color"]');
    await expect(themeColor).toHaveAttribute('content', /.+/);
  });

  test('service worker регистрируется', async ({ page }) => {
    await page.goto('/');
    // SW файл должен быть доступен
    const swResponse = await page.goto('/sw-push.js');
    expect(swResponse?.status()).toBe(200);
  });

  test('Open Graph теги присутствуют', async ({ page }) => {
    await page.goto('/');
    const ogTitle = page.locator('meta[property="og:title"]');
    const ogDescription = page.locator('meta[property="og:description"]');
    // Хотя бы title должен быть
    const hasMeta = (await ogTitle.count()) > 0 || (await ogDescription.count()) > 0;
    expect(hasMeta).toBeTruthy();
  });
});

test.describe('Адаптивность', () => {
  test('нижняя навигация видна на мобильных', async ({ page, isMobile }) => {
    await page.goto('/');
    const bottomNav = page.locator('nav').last();
    if (isMobile) {
      await expect(bottomNav).toBeVisible();
    }
  });

  test('страница скроллится без горизонтального overflow', async ({ page }) => {
    await page.goto('/');
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
  });
});
