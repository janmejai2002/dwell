const { chromium } = require('./node_modules/@playwright/test');
const fs = require('fs');
const path = require('path');

const SHOTS_DIR = path.resolve(__dirname, 'ui-verification-shots');
if (!fs.existsSync(SHOTS_DIR)) {
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
}

(async () => {
  console.log('--- STARTING DWELL UI & USER EXPERIENCE AUDIT ---');
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`[Console Error] ${msg.text()}`);
  });
  page.on('pageerror', err => {
    errors.push(`[Page Error] ${err.message}`);
  });

  await page.goto('http://localhost:5173/');
  await page.waitForSelector('#drill-container');
  await page.waitForTimeout(500);

  // 1. VERIFY ALL 4 THEMES
  console.log('\n[1] Verifying Themes...');
  const themes = ['dark', 'light', 'hc-dark', 'hc-light'];
  for (const theme of themes) {
    await page.click(`#btn-theme-${theme}`);
    await page.waitForTimeout(200);

    const themeColors = await page.evaluate(() => {
      const root = document.getElementById('dwell-root');
      const drill = document.getElementById('drill-container');
      const caret = document.getElementById('caret');
      const glyph = document.querySelector('.glyph');
      const csRoot = window.getComputedStyle(root);
      const csCaret = window.getComputedStyle(caret);
      const csGlyph = window.getComputedStyle(glyph);
      return {
        bg: csRoot.backgroundColor,
        caretColor: csCaret.backgroundColor,
        untypedGlyphColor: csGlyph.color,
      };
    });
    console.log(`  Theme "${theme}":`, themeColors);

    await page.screenshot({
      path: path.join(SHOTS_DIR, `theme-${theme}.png`),
      fullPage: false
    });
  }

  // Switch back to dark
  await page.click('#btn-theme-dark');
  await page.waitForTimeout(100);

  // 2. VERIFY ALL 6 TIERS
  console.log('\n[2] Verifying Curriculum Tiers (1 to 6)...');
  for (let tier = 1; tier <= 6; tier++) {
    await page.click(`#btn-tier-${tier}`);
    await page.waitForTimeout(250);

    const tierInfo = await page.evaluate(() => {
      const status = document.getElementById('panel-status')?.textContent;
      const glyphs = Array.from(document.querySelectorAll('.glyph'));
      const text = glyphs.map(g => g.getAttribute('data-char')).join('');
      const hasCaret = !!document.getElementById('caret');
      return { status, textPreview: text.replace(/\n/g, ' ↵ ').slice(0, 45) + '...', glyphCount: glyphs.length, hasCaret };
    });
    console.log(`  Tier ${tier}:`, tierInfo);

    await page.screenshot({
      path: path.join(SHOTS_DIR, `tier-${tier}.png`)
    });
  }

  // 3. VERIFY KEYSTROKE INTERACTION & ILLUMINATION (TIER 1)
  console.log('\n[3] Verifying Interactive Typing Hot Path...');
  await page.click('#btn-tier-1');
  await page.waitForTimeout(200);
  await page.click('#webview-frame');

  // Check initial caret blink animation
  const initialCaretStyle = await page.evaluate(() => {
    const caret = document.getElementById('caret');
    const cs = window.getComputedStyle(caret);
    return {
      animationName: cs.animationName,
      isBlinking: cs.animationName.includes('caret-blink'),
      transform: caret.style.transform
    };
  });
  console.log('  Initial Caret Status:', initialCaretStyle);

  // Type correct word 'refactor'
  for (const ch of 'refactor ') {
    await page.keyboard.press(ch === ' ' ? 'Space' : ch);
    await page.waitForTimeout(40);
  }

  const struckState = await page.evaluate(() => {
    const struckGlyphs = Array.from(document.querySelectorAll('.glyph.struck')).map(g => g.textContent).join('');
    const caret = document.getElementById('caret');
    const metrics = document.getElementById('metrics-strip')?.textContent;
    return { struckGlyphs, caretTransform: caret.style.transform, metrics };
  });
  console.log('  After typing "refactor ":', struckState);

  // Type mistake 'xyz'
  for (const ch of 'xyz') {
    await page.keyboard.press(ch);
    await page.waitForTimeout(40);
  }

  const missedState = await page.evaluate(() => {
    const missedGlyphs = Array.from(document.querySelectorAll('.glyph.missed')).map(g => g.textContent).join('');
    return { missedCount: document.querySelectorAll('.glyph.missed').length, missedGlyphs };
  });
  console.log('  After typing 3 errors:', missedState);

  // Test Backspace correction
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(40);
  }

  const correctedState = await page.evaluate(() => {
    return {
      correctedCount: document.querySelectorAll('.glyph.corrected').length,
      missedCount: document.querySelectorAll('.glyph.missed').length
    };
  });
  console.log('  After Backspace correction:', correctedState);

  await page.screenshot({
    path: path.join(SHOTS_DIR, 'mid-typing-experience.png')
  });

  // 4. VERIFY MULTI-LINE TYPING & ENTER KEY (TIER 2)
  console.log('\n[4] Verifying Tier 2 Multi-line & Enter Key...');
  await page.click('#btn-tier-2');
  await page.waitForTimeout(200);
  await page.click('#webview-frame');

  // First line is 'split the controller into service and router'
  const firstLine = 'split the controller into service and router';
  for (const ch of firstLine) {
    await page.keyboard.press(ch === ' ' ? 'Space' : ch);
  }
  // Now press Enter
  await page.keyboard.press('Enter');
  await page.waitForTimeout(100);

  // Next line is 'use '
  for (const ch of 'use ') {
    await page.keyboard.press(ch === ' ' ? 'Space' : ch);
  }
  await page.waitForTimeout(200);

  const multiLineState = await page.evaluate(() => {
    const caret = document.getElementById('caret');
    const struck = document.querySelectorAll('.glyph.struck').length;
    return {
      caretTransform: caret.style.transform,
      struckCount: struck,
    };
  });
  console.log('  Multi-line Enter status:', multiLineState);

  await page.screenshot({
    path: path.join(SHOTS_DIR, 'tier-2-multiline-typing.png')
  });

  // 5. VERIFY WICK TIMING, FLAME ANIMATION & RETRACTION
  console.log('\n[5] Verifying Wick Lifecycle...');
  await page.click('#btn-agent-start');
  await page.waitForTimeout(200);

  const wickArmed = await page.evaluate(() => {
    const wick = document.getElementById('wick-container');
    const flame = document.querySelector('.wick-flame');
    const line = document.querySelector('.wick-line');
    return {
      active: wick.classList.contains('wick--active'),
      flameOut: flame.classList.contains('wick-flame--out'),
      lineHeight: line.style.height
    };
  });
  console.log('  Wick Armed:', wickArmed);

  await page.screenshot({
    path: path.join(SHOTS_DIR, 'wick-armed.png')
  });

  // Extinguish
  await page.click('#btn-agent-end');
  await page.waitForTimeout(350);

  const wickExtinguished = await page.evaluate(() => {
    const wick = document.getElementById('wick-container');
    const flame = document.querySelector('.wick-flame');
    return {
      active: wick.classList.contains('wick--active'),
      flameOut: flame.classList.contains('wick-flame--out')
    };
  });
  console.log('  Wick Extinguished:', wickExtinguished);

  // 6. VERIFY RESPONSIVE WIDTHS (500px and 320px)
  console.log('\n[6] Verifying Responsive Widths...');
  const slider = page.locator('#width-slider');
  await page.evaluate(() => {
    const sl = document.getElementById('width-slider');
    sl.value = '320';
    sl.dispatchEvent(new Event('input'));
  });
  await page.waitForTimeout(200);

  const narrowWidth = await page.evaluate(() => {
    return document.getElementById('sidebar-wrapper').getBoundingClientRect().width;
  });
  console.log(`  Narrow width set: ${narrowWidth}px (Target: 320px)`);

  await page.screenshot({
    path: path.join(SHOTS_DIR, 'narrow-320px.png')
  });

  console.log('\n--- AUDIT SUMMARY ---');
  console.log('Errors logged during session:', errors.length === 0 ? '0 (CLEAN)' : errors);
  await browser.close();
})();
