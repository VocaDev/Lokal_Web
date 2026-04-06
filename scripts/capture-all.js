import fs from 'fs';
import { chromium } from '@playwright/test';

const outDir = 'public/screenshots';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

(async () => {
  console.log("Starting browser...");
  let browser;
  try {
    // Përpiqemi të përdorim Edge që është i instaluar zakonisht në Windows
    browser = await chromium.launch({ channel: 'msedge' });
    console.log("Using Microsoft Edge for captures...");
  } catch (e) {
    try {
      browser = await chromium.launch({ channel: 'chrome' });
      console.log("Using Google Chrome for captures...");
    } catch (e2) {
      console.log("Using default Playwright chromium...");
      browser = await chromium.launch();
    }
  }

  const page = await browser.newPage();
  
  // Rregullojmë madhësinë e dritares për screenshot-e të plota
  await page.setViewportSize({ width: 1440, height: 900 });

  console.log("Navigating to http://localhost:3000/temp-gallery ...");
  await page.goto('http://localhost:3000/temp-gallery', { waitUntil: 'load', timeout: 60000 });
  
  // Presim pak që të ngarkohen fontet dhe imazhet e mundshme
  await page.waitForTimeout(2000);

  const variations = [
    'barbershop-bold', 'barbershop-minimal', 'barbershop-modern',
    'restaurant-elegant', 'restaurant-casual', 'restaurant-bistro',
    'clinic-clean', 'clinic-modern', 'clinic-premium',
    'beauty-salon-luxury', 'beauty-salon-minimal'
  ];

  for (const id of variations) {
    console.log(`Checking ${id}...`);
    const element = await page.locator(`#${id}`).first();
    const count = await element.count();
    
    if (count > 0) {
      console.log(`Capturing ${id}...`);
      await element.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500); // Prit pak pas scroll-it
      await element.screenshot({ path: `${outDir}/${id}.png` });
      console.log(`Saved: ${outDir}/${id}.png`);
    } else {
      console.log(`Element #${id} not found.`);
    }
  }

  await browser.close();
  console.log("Done! Qofsh me fat me dizajnet e reja!");
})();
