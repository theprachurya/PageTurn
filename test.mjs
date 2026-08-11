import { chromium } from 'playwright';

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 2000 } // Taller viewport to see more
  });
  const page = await context.newPage();
  
  console.log('Navigating to http://localhost:3000...');
  const response = await page.goto('http://localhost:3000');
  
  if (response.ok()) {
    console.log('Page loaded successfully! (Status:', response.status(), ')');
    
    // Wait for animations to finish (2 seconds)
    await page.waitForTimeout(2000);
    
    // Take a full page screenshot
    await page.screenshot({ path: 'landing_page_full.png', fullPage: true });
    console.log('Full screenshot saved to landing_page_full.png');
  } else {
    console.error('Failed to load page. Status:', response.status());
  }

  await browser.close();
})();
