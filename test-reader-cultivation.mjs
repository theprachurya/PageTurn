import { chromium } from 'playwright';

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true }); 
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('Navigating to dev-login...');
  await page.goto('http://localhost:3000/dev-login');
  
  console.log('Waiting for library redirect...');
  await page.waitForURL('**/library', { timeout: 10000 });
  
  // Count books before upload
  const initialBooks = await page.locator('a[href^="/read/"]').count();
  
  console.log('Clicking "Upload Book" button...');
  await page.click('button:has-text("Upload Book")');
  
  console.log('Uploading EPUB...');
  await page.setInputFiles('input[type="file"]', "A Regressor's Tale of Cultivation - Tremendous Ver_1.epub");

  console.log('Waiting for Upload confirmation button...');
  await page.waitForTimeout(3000); 
  const confirmUploadBtn = await page.waitForSelector('button:has-text("Upload"):not([disabled])', { timeout: 15000 }).catch(e => null);
  if (confirmUploadBtn) {
     console.log('Confirming upload...');
     await confirmUploadBtn.click({ force: true });
  } else {
     console.log('Upload button not found or disabled.');
  }

  console.log('Waiting for new book to appear...');
  // Wait until book count increases
  await page.waitForFunction((initialCount) => {
    return document.querySelectorAll('a[href^="/read/"]').length > initialCount;
  }, initialBooks, { timeout: 120000 });
  
  console.log('Clicking the newly uploaded book...');
  const bookLinks = await page.locator('a[href^="/read/"]').all();
  if (bookLinks.length > 0) {
    // the newest book is usually first in the grid if sorted by last_read_at (no wait, upload doesn't set last_read_at immediately, but it's sorted by something)
    // let's click the first one
    await bookLinks[0].click({ force: true });
    console.log('Navigated to reader. Waiting for epub to load...');
    
    await page.waitForSelector('iframe', { timeout: 15000 });
    await page.waitForTimeout(10000); 
    
    console.log('Taking screenshot of initial reader state...');
    await page.screenshot({ path: 'debug_reader_1.png' });
    
    console.log('Clicking center to open menu...');
    await page.mouse.click(720, 450); 
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'debug_reader_2_menu.png' });
    
    console.log('Scrolling down...');
    const iframeElement = await page.$('iframe');
    const frame = await iframeElement.contentFrame();
    
    if (frame) {
      await frame.evaluate(() => window.scrollBy(0, 1000));
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'debug_reader_3_scrolled.png' });
      
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(5000);
      await page.screenshot({ path: 'debug_reader_4_next_chapter.png' });
    }
  } else {
    console.log("No book link found.");
  }

  await browser.close();
  console.log('Done.');
})();
