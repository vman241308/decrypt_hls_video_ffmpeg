// m3u8Downloader.js
const fs = require('fs');
const { parseM3U8 } = require('./m3u8Parser');
const pt = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const { delay } = require('./utils');
const config = require('./config');

let tsFilesDir = config.tsFilesDir;
let m3u8FileDir = config.m3u8FileDir;
let decryptedDir = config.decryptedDir;

pt.use(StealthPlugin());

const downloadM3U8 = async (url) => {
    const start = performance.now();
    const browser = await pt.launch({
        executablePath: '/usr/bin/chromium-browser'
    });

    const page = await browser.newPage();
    await page.goto(config.siteURL, {
        timeout: 0,
        waitUntil: "domcontentloaded"
    });

    await delay(3000);

    const client = await page.target().createCDPSession();

    if (!fs.existsSync(m3u8FileDir)) {
        fs.mkdirSync(m3u8FileDir);
    }

    await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: `${m3u8FileDir}`
    });

    await page.evaluate((m3u8URL) => {
        const link = document.createElement('a');
        link.href = m3u8URL;
        link.download = 'video.m3u8';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, config.m3u8URL);

    await delay(2000);

    const { keyURI, tsFiles } = await parseM3U8();

    try {
        const fs = require('fs');
        if (!fs.existsSync(tsFilesDir)) {
            fs.mkdirSync(tsFilesDir);
        }

        const clientTS = await page.target().createCDPSession();
        await clientTS.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: tsFilesDir
        });

        for (const tsFile of tsFiles) {
            let tsURL = config.frontTSFiles + tsFile;

            await page.evaluate((tsURL, tsFile) => {
                const link = document.createElement('a');
                link.href = tsURL;
                link.download = tsFile;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }, tsURL, tsFile);
        }

        await delay(1000);
    } catch (error) {
        console.error('Error downloading TS file:', error);
    }

    await browser.close();
    console.log("===========================> Downloaded M3U8");
};

module.exports = { downloadM3U8 };
