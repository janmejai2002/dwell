import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const shotsDir = path.resolve(__dirname, '../../docs/shots');

test.beforeAll(() => {
  if (!fs.existsSync(shotsDir)) {
    fs.mkdirSync(shotsDir, { recursive: true });
  }
});

test.describe('visual captures from harness', () => {
  const themes = ['dark', 'light', 'hc-dark', 'hc-light'] as const;

  for (const theme of themes) {
    test(`capture idle screen: ${theme} (full & narrow)`, async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('#drill-container');

      // Set theme
      await page.click(`#btn-theme-${theme}`);
      await page.waitForTimeout(100);

      // Full width (500px)
      const frame = page.locator('#webview-frame');
      await frame.screenshot({ path: path.join(shotsDir, `idle-${theme}-full.png`), animations: 'disabled' });

      // Narrow width (320px)
      await page.evaluate(() => {
        const slider = document.getElementById('width-slider') as HTMLInputElement | null;
        if (slider) {
          slider.value = '320';
          slider.dispatchEvent(new Event('input'));
        }
      });
      await page.waitForTimeout(100);
      await frame.screenshot({ path: path.join(shotsDir, `idle-${theme}-narrow.png`), animations: 'disabled' });

      // Reset width to 500px
      await page.evaluate(() => {
        const slider = document.getElementById('width-slider') as HTMLInputElement | null;
        if (slider) {
          slider.value = '500';
          slider.dispatchEvent(new Event('input'));
        }
      });
    });

    test(`capture mid-drill state: ${theme} (full & narrow)`, async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('#drill-container');

      // Set theme
      await page.click(`#btn-theme-${theme}`);
      await page.click('#btn-reveal');
      await page.waitForTimeout(100);

      // Type some characters (with one error)
      await page.keyboard.type('refactor the endpxint');
      await page.waitForTimeout(100);

      const frame = page.locator('#webview-frame');
      await frame.screenshot({ path: path.join(shotsDir, `middrill-${theme}-full.png`), animations: 'disabled' });

      // Narrow width (320px)
      await page.evaluate(() => {
        const slider = document.getElementById('width-slider') as HTMLInputElement | null;
        if (slider) {
          slider.value = '320';
          slider.dispatchEvent(new Event('input'));
        }
      });
      await page.waitForTimeout(100);
      await frame.screenshot({ path: path.join(shotsDir, `middrill-${theme}-narrow.png`), animations: 'disabled' });
    });
  }
});
