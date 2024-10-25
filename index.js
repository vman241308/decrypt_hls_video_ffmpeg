// index.js
const fs = require("fs");
const { downloadM3U8AndTS } = require("./m3u8Downloader");
const { decryptTSFiles, mergeTSFiles } = require("./tsHandler");
const config = require("./config");

let tsFilesDir = config.tsFilesDir;
let decryptedDir = config.decryptedDir;
let m3u8FileDir = config.m3u8FileDir;
let outputDir = config.outputDir;

const main = async () => {
  fs.rmSync(tsFilesDir, { recursive: true, force: true });
  fs.rmSync(decryptedDir, { recursive: true, force: true });
  fs.rmSync(m3u8FileDir, { recursive: true, force: true });
  fs.rmSync(outputDir, { recursive: true, force: true });

  const keyURIAndFileNames = await downloadM3U8AndTS();

  await decryptTSFiles(keyURIAndFileNames);

  let date = Date.now().toString();
  let outputFileName = `output_${date}.mp4`;
  await mergeTSFiles(keyURIAndFileNames, outputFileName);
};

main();
