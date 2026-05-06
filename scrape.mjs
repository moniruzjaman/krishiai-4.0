/* eslint-disable no-undef */
import puppeteer from 'puppeteer';

(async () => {
  try {
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.goto('https://chat.qwen.ai/s/t_dbe23e1a-cca6-404d-a758-52d031c4f914', { waitUntil: 'networkidle2' });
    const text = await page.evaluate(() => document.body.innerText);
    console.log(text);
    await browser.close();
  } catch (e) {
    console.error(e);
  }
})();
