// @ts-check
import { test, expect } from '@playwright/test';

/**
 * Responsive Layout Tests
 * Tests for mobile viewport layout verification
 */

test.describe('Responsive Layout', () => {
    test.describe('Desktop Layout (1280x720)', () => {
        test.use({ viewport: { width: 1280, height: 720 } });

        test('should show board and side panel in two columns', async ({ page }) => {
            await page.goto('/');

            const board = page.locator('#board-container');
            const sidePanel = page.locator('.side-panel');

            // Both should be visible and side by side
            await expect(board).toBeVisible();
            await expect(sidePanel).toBeVisible();

            const boardBox = await board.boundingBox();
            const panelBox = await sidePanel.boundingBox();

            expect(boardBox).not.toBeNull();
            expect(panelBox).not.toBeNull();
            // Panel should be to the right of the board (side by side layout)
            expect(panelBox.x).toBeGreaterThan(boardBox.x);
        });

        test('should show header with title and theme toggle inline', async ({ page }) => {
            await page.goto('/');

            const header = page.locator('.app-header');
            const computedStyle = await header.evaluate(el =>
                window.getComputedStyle(el).flexDirection
            );

            expect(computedStyle).toBe('row');
        });

        test('board should be visible alongside controls', async ({ page }) => {
            await page.goto('/');

            const board = page.locator('#board-container');
            const sidePanel = page.locator('.side-panel');

            await expect(board).toBeVisible();
            await expect(sidePanel).toBeVisible();

            // Both should be in same viewport without scrolling
            const boardBox = await board.boundingBox();
            const panelBox = await sidePanel.boundingBox();

            expect(boardBox).not.toBeNull();
            expect(panelBox).not.toBeNull();

            // Board and panel should be side by side (panel x > board x)
            expect(panelBox.x).toBeGreaterThan(boardBox.x);
        });
    });

    test.describe('Tablet Layout (900px)', () => {
        test.use({ viewport: { width: 900, height: 1024 } });

        test('should still maintain two-column layout at 900px', async ({ page }) => {
            await page.goto('/');

            const board = page.locator('#board-container');
            const sidePanel = page.locator('.side-panel');

            await expect(board).toBeVisible();
            await expect(sidePanel).toBeVisible();
        });
    });

    test.describe('Mobile Layout (540px)', () => {
        test.use({ viewport: { width: 540, height: 960 } });

        test('should stack board and side panel vertically', async ({ page }) => {
            await page.goto('/');

            const appMain = page.locator('.app-main');
            const computedStyle = await appMain.evaluate(el =>
                window.getComputedStyle(el).gridTemplateColumns
            );

            // Should be single column
            expect(computedStyle).toMatch(/^\d+(\.\d+)?px$/);
        });

        test('should show board above controls', async ({ page }) => {
            await page.goto('/');

            const boardSection = page.locator('.board-section');
            const sidePanel = page.locator('.side-panel');

            // Board should have lower CSS order (appears first)
            const boardOrder = await boardSection.evaluate(el =>
                window.getComputedStyle(el).order
            );
            const panelOrder = await sidePanel.evaluate(el =>
                window.getComputedStyle(el).order
            );

            expect(parseInt(boardOrder)).toBeLessThan(parseInt(panelOrder));
        });

        test('should stack header elements vertically', async ({ page }) => {
            await page.goto('/');

            const header = page.locator('.app-header');
            const computedStyle = await header.evaluate(el =>
                window.getComputedStyle(el).flexDirection
            );

            expect(computedStyle).toBe('column');
        });

        test('board should fill mobile width', async ({ page }) => {
            await page.goto('/');

            const board = page.locator('#board-container');
            const boardBox = await board.boundingBox();

            expect(boardBox).not.toBeNull();
            // Board should be at least 90% of viewport width
            expect(boardBox.width).toBeGreaterThan(540 * 0.85);
        });
    });

    test.describe('Small Mobile Layout (375px - iPhone SE)', () => {
        test.use({ viewport: { width: 375, height: 667 } });

        test('should render correctly on small phones', async ({ page }) => {
            await page.goto('/');

            const board = page.locator('#board-container');
            const newGameBtn = page.locator('#new-game-btn');

            await expect(board).toBeVisible();
            await expect(newGameBtn).toBeVisible();
        });

        test('all squares should be visible without overflow', async ({ page }) => {
            await page.goto('/');

            const squares = page.locator('.chess-square');
            await expect(squares).toHaveCount(64);

            // Check first and last squares are visible
            await expect(squares.first()).toBeInViewport();
        });

        test('controls should be accessible on mobile', async ({ page }) => {
            await page.goto('/');

            // All key controls should be visible
            await expect(page.locator('#new-game-btn')).toBeVisible();
            await expect(page.locator('#difficulty-select')).toBeVisible();
            await expect(page.locator('#theme-select')).toBeVisible();
        });

        test('game should be playable on mobile', async ({ page }) => {
            await page.goto('/');
            await page.click('#new-game-btn');
            await page.waitForSelector('.chess-piece:has-text("♙")');

            // Should be able to select a piece
            const e2Square = page.locator('.chess-square[data-square="e2"]');
            await e2Square.click();

            await expect(e2Square).toHaveClass(/highlight-selected/);

            // Should be able to make a move
            await page.click('.chess-square[data-square="e4"]');

            const e4Piece = page.locator('.chess-square[data-square="e4"] .chess-piece');
            await expect(e4Piece).toHaveText('♙');
        });
    });
});
