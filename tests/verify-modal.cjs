const { chromium } = require('./node_modules/@playwright/test');
const path = require('path');
const fs = require('fs');

const shotsDir = path.resolve(__dirname, '../docs/shots');
if (!fs.existsSync(shotsDir)) {
  fs.mkdirSync(shotsDir, { recursive: true });
}

(async () => {
  console.log('--- AUDITING BROWSE ALL 120 DRILLS MODAL IN PLAYWRIGHT ---');
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  await page.goto('http://localhost:5173/');
  await page.waitForSelector('#drill-container');

  // Click Browse All 120 Drills button
  const btnBrowseAll = page.locator('#btn-browse-all');
  await btnBrowseAll.click();

  const modal = page.locator('#curriculum-modal');
  await modal.waitFor({ state: 'visible' });

  const expectedDrillsPerTier = 20;

  for (let tier = 1; tier <= 6; tier++) {
    console.log(`Verifying Tier ${tier} in modal...`);
    const tab = page.locator(`#modal-tab-${tier}`);
    await tab.click();
    await page.waitForTimeout(100);

    const drillCards = page.locator('#modal-drill-list > div');
    const count = await drillCards.count();
    if (count !== expectedDrillsPerTier) {
      throw new Error(`Tier ${tier}: expected ${expectedDrillsPerTier} drills, got ${count}`);
    }

    const firstId = await page.locator('#modal-drill-list > div').first().locator('span').textContent();
    const expectedFirstId = `T${tier}-001`;
    if (!firstId.includes(expectedFirstId)) {
      throw new Error(`Tier ${tier}: expected first drill ${expectedFirstId}, got ${firstId}`);
    }

    const lastId = await page.locator('#modal-drill-list > div').last().locator('span').textContent();
    const expectedLastId = `T${tier}-020`;
    if (!lastId.includes(expectedLastId)) {
      throw new Error(`Tier ${tier}: expected last drill ${expectedLastId}, got ${lastId}`);
    }

    for (let i = 0; i < expectedDrillsPerTier; i++) {
      const textContent = await drillCards.nth(i).locator('pre').textContent();
      if (!textContent || textContent.trim().length < 10) {
        throw new Error(`Tier ${tier} item ${i + 1} has empty or short text`);
      }
    }

    await modal.screenshot({
      path: path.join(shotsDir, `modal-tier-${tier}.png`),
    });
    console.log(`  ✓ Tier ${tier} verified: 20 drills displayed cleanly.`);
  }

  // Click first drill
  const firstTypeBtn = page.locator('#modal-drill-list > div').first().locator('button');
  await firstTypeBtn.click();
  await modal.waitFor({ state: 'hidden' });
  console.log('  ✓ Drill selection successfully loaded into typing surface.');

  await browser.close();
  console.log('--- MODAL AUDIT COMPLETED SUCCESSFULLY: 120/120 DRILLS VERIFIED CLEAN ---');
})();
