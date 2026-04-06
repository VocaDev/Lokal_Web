import { test } from '@playwright/test';

test('capture-templates', async ({ page }) => {
  // Shko te faqja e galerisë se përkohshme
  await page.goto('http://localhost:3000/temp-gallery');
  
  // Prit deri sa të ngarkohet përmbajtja
  await page.waitForSelector('h1');
  
  const variations = [
    'barbershop-bold', 'barbershop-minimal', 'barbershop-modern',
    'restaurant-elegant', 'restaurant-casual', 'restaurant-bistro',
    'clinic-clean', 'clinic-modern', 'clinic-premium',
    'beauty-salon-luxury', 'beauty-salon-minimal'
  ];

  for (const id of variations) {
    const element = await page.$(`#${id}`);
    if (element) {
      console.log(`Capturing ${id}...`);
      await element.screenshot({ path: `public/screenshots/${id}.png` });
    }
  }
});
