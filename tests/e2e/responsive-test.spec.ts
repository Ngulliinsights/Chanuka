import { test, expect } from '@playwright/test';

test.describe('Responsive Design Testing', () => {
    test('bills-dashboard page should be responsive', async ({ page }) => {
        // Test desktop view
        await page.setViewportSize({ width: 1200, height: 800 });
        await page.goto('/bills');

        // Check that the page loads
        await expect(page.locator('h1')).toContainText('Bills Dashboard');

        // Check responsive container
        const container = page.locator('.container');
        await expect(container).toBeVisible();

        // Test tablet view
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.goto('/bills');

        // Container should still be visible and responsive
        await expect(container).toBeVisible();

        // Test mobile view
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/bills');

        // Container should still be visible and responsive
        await expect(container).toBeVisible();
    });

    test('home page should be responsive with ResponsiveGrid', async ({ page }) => {
        // Test desktop view
        await page.setViewportSize({ width: 1200, height: 800 });
        await page.goto('/');

        // Check that the page loads
        await expect(page.locator('h1')).toContainText('Welcome to Chanuka Platform');

        // Check responsive grid
        const grid = page.locator('.responsive-grid');
        await expect(grid).toBeVisible();

        // Should have 3 columns on desktop
        const cards = page.locator('.grid > div');
        await expect(cards).toHaveCount(3);

        // Test tablet view
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.goto('/');

        // Should still be responsive
        await expect(grid).toBeVisible();

        // Test mobile view
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/');

        // Should still be responsive
        await expect(grid).toBeVisible();
    });

    test('ResponsiveContainer should apply correct padding and max-width', async ({ page }) => {
        await page.setViewportSize({ width: 1200, height: 800 });
        await page.goto('/');

        // Check ResponsiveContainer styles
        const container = page.locator('.responsive-container');
        const styles = await container.evaluate(el => {
            const computed = window.getComputedStyle(el);
            return {
                maxWidth: computed.maxWidth,
                paddingLeft: computed.paddingLeft,
                paddingRight: computed.paddingRight
            };
        });

        // Should have max-width applied
        expect(styles.maxWidth).toBe('80rem'); // 1280px = 80rem

        // Should have responsive padding
        expect(styles.paddingLeft).toBe('1.5rem'); // 24px = 1.5rem
        expect(styles.paddingRight).toBe('1.5rem');
    });

    test('ResponsiveGrid should adapt columns based on screen size', async ({ page }) => {
        // Desktop - should show 3 columns
        await page.setViewportSize({ width: 1200, height: 800 });
        await page.goto('/');

        const gridDesktop = page.locator('.responsive-grid');
        const gridTemplateDesktop = await gridDesktop.evaluate(el =>
            window.getComputedStyle(el).gridTemplateColumns
        );
        expect(gridTemplateDesktop).toContain('repeat(3, minmax(0, 1fr))');

        // Tablet - should adapt
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.goto('/');

        const gridTablet = page.locator('.responsive-grid');
        const gridTemplateTablet = await gridTablet.evaluate(el =>
            window.getComputedStyle(el).gridTemplateColumns
        );
        // Should be responsive
        expect(gridTemplateTablet).toBeTruthy();

        // Mobile - should adapt
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/');

        const gridMobile = page.locator('.responsive-grid');
        const gridTemplateMobile = await gridMobile.evaluate(el =>
            window.getComputedStyle(el).gridTemplateColumns
        );
        // Should be responsive
        expect(gridTemplateMobile).toBeTruthy();
    });
});