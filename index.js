// index.js
const { downloadM3U8 } = require('./m3u8Downloader');
const { parseM3U8 } = require('./m3u8Parser');
const { decryptTSFiles, mergeTSFiles } = require('./tsHandler');
const config = require('./config');

const main = async () => {
  await downloadM3U8();

  const { keyURI, tsFiles } = await parseM3U8();
  await decryptTSFiles(keyURI);
  let date = Date.now().toString();

  let outputFileName = `output_${date}.mp4`
  await mergeTSFiles(outputFileName);
}

main();