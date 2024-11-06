// m3u8Downloader.js
// Handles downloading m3u8 playlists and ts segments into appropriate directories
const fs = require("fs");
const path = require("path");
const { getkeyURIAndFileNames, getM3U8Content } = require("./m3u8Parser");
const pt = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

const { delay, makeDirectory, makeSubDirectory } = require("./utils");
const config = require("./config");

let tsFilesDir = config.tsFilesDir;
let m3u8FileDir = config.m3u8FileDir;
let decryptedDir = config.decryptedDir;

pt.use(StealthPlugin());

const downloadM3U8AndTS = async () => {
  const browser = await pt.launch();

  const page = await browser.newPage();
  await page.setRequestInterception(true);

  let originalM3U8Link = "";
  page.on("request", (request) => {
    if (request.url().includes(".m3u8")) {
      originalM3U8Link = request.url();
    }
    request.continue();
  });

  await page.goto(config.siteURL, {
    timeout: 0,
    waitUntil: "domcontentloaded",
  });

  await delay(3000);

  const client = await page.target().createCDPSession();

  await makeDirectory(tsFilesDir);
  await makeDirectory(m3u8FileDir);
  await makeDirectory(decryptedDir);

  await client.send("Page.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: m3u8FileDir,
  });

  await page.evaluate((m3u8URL) => {
    const link = document.createElement("a");
    link.href = m3u8URL;
    link.download = "video.m3u8";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, originalM3U8Link);

  await delay(2000);

  const m3u8ContentLinks = await getM3U8Content();
  const subLink = originalM3U8Link.substring(
    0,
    originalM3U8Link.lastIndexOf("/") + 1
  );

  for (const link of m3u8ContentLinks) {
    let newLink = subLink + link;
    await page.evaluate((link) => {
      const linkElement = document.createElement("a");
      linkElement.href = link;
      linkElement.download = "video.m3u8";
      document.body.appendChild(linkElement);
      linkElement.click();
      document.body.removeChild(linkElement);
    }, newLink);

    await delay(2000);
  }

  const keyURIAndFileNames = await getkeyURIAndFileNames(m3u8ContentLinks);

  try {
    for (let i = 0; i < keyURIAndFileNames.length; i++) {
      const keyURIAndFileName = keyURIAndFileNames[i];

      await makeSubDirectory(tsFilesDir, keyURIAndFileName.dirName);
      await makeSubDirectory(decryptedDir, keyURIAndFileName.dirName);

      let concatFilePath = path.join(
        `${decryptedDir}/${keyURIAndFileName.dirName}`,
        "concat.txt"
      );

      const clientTS = await page.target().createCDPSession();
      await clientTS.send("Page.setDownloadBehavior", {
        behavior: "allow",
        downloadPath: `${tsFilesDir}/${keyURIAndFileName.dirName}`,
      });

      try {
        for (const tsFile of keyURIAndFileName.tsFiles) {
          let tsURL = subLink + keyURIAndFileName.m3u8DirName + "/" + tsFile;

          await fs.appendFile(`${decryptedDir}/${keyURIAndFileName.dirName}/concat.txt`, `\nfile '${tsFile.replace(".enc.ts", ".dec.ts")}'`, function (err) {
            if (err) throw err;
          })

          await page.evaluate(
            (tsURL, tsFile) => {
              const link = document.createElement("a");
              link.href = tsURL;
              link.download = tsFile;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            },
            tsURL,
            tsFile
          );
        }
        await delay(2000);
      } catch (error) {
        console.error(
          `Error downloading files for directory ${keyURIAndFileName.dirName}:`,
          error
        );
        // Create a new page if the context was destroyed
        await page.close();
        page = await browser.newPage();
        await page.setRequestInterception(true);
        continue;
      }
    }
  } catch (error) {
    console.error("Error downloading TS file:", error);
  }

  await browser.close();

  return keyURIAndFileNames;
};
module.exports = { downloadM3U8AndTS };
