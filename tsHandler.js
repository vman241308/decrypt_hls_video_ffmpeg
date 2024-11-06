// tsHandler.js
const fs = require("fs");
const crypto = require("crypto");
const { spawn } = require("child_process");
const path = require("path");

const { makeDirectory, makeSubDirectory } = require("./utils");
const config = require("./config");

let tsFilesDir = config.tsFilesDir;
let decryptedDir = config.decryptedDir;
let m3u8FileDir = config.m3u8FileDir;
let outputDir = config.outputDir;

const decryptTSFiles = async (keyURIAndFileNames) => {
  const keyResponse = await fetch(keyURIAndFileNames[0].keyURI);

  const key = await keyResponse.arrayBuffer();

  for (let i = 0; i < keyURIAndFileNames.length; i++) {
    const keyURIAndFileName = keyURIAndFileNames[i];

    const files = fs.readdirSync(`${tsFilesDir}/${keyURIAndFileName.dirName}`);

    try {
      for (const file of files) {
        if (file.endsWith(".enc.ts")) {
          const filePath = `${tsFilesDir}/${keyURIAndFileName.dirName}/${file}`;
          const encryptedData = fs.readFileSync(filePath);
          const decipher = crypto.createDecipheriv(
            "aes-128-cbc",
            Buffer.from(key),
            Buffer.alloc(16)
          );
          const decryptedData = Buffer.concat([
            decipher.update(encryptedData),
            decipher.final(),
          ]);

          const outputFile = file.replace(".enc.ts", ".dec.ts");
          fs.writeFileSync(
            `${decryptedDir}/${keyURIAndFileName.dirName}/${outputFile}`,
            decryptedData
          );
        }
      }
    } catch (error) {
      console.error(
        `Error decrypting files for directory ${keyURIAndFileName.dirName}:`,
        error
      );

      continue;
    }
  }
};

const mergeTSFiles = async (keyURIAndFileNames, outputFileName) => {
  await makeDirectory(outputDir);

  for (let i = 0; i < keyURIAndFileNames.length; i++) {
    const keyURIAndFileName = keyURIAndFileNames[i];

    await makeSubDirectory(outputDir, keyURIAndFileName.dirName);

    try {
      let concatFilePath = `${decryptedDir}/${keyURIAndFileName.dirName}/concat.txt`

      await new Promise((resolve, reject) => {
        const ffmpeg = spawn("ffmpeg", [
          "-f",
          "concat",
          "-safe",
          "0",
          "-i",
          concatFilePath,
          "-c",
          "copy",
          "-bsf:a",
          "aac_adtstoasc",
          `${outputDir}/${keyURIAndFileName.dirName}/${outputFileName}`,
        ]);

        ffmpeg.stdout.on("data", (data) => {
          console.log(`FFmpeg stdout: ${data}`);
        });

        ffmpeg.stderr.on("data", (data) => {
          console.log(`FFmpeg stderr: ${data}`);
        });

        ffmpeg.on("close", (code) => {
          if (code === 0) {
            // Remove ts_files and decrypted_ts_files directories
            fs.rmSync(tsFilesDir, { recursive: true, force: true });
            fs.rmSync(decryptedDir, { recursive: true, force: true });
            fs.rmSync(m3u8FileDir, { recursive: true, force: true });

            resolve();
          } else {
            reject(new Error(`FFmpeg process exited with code ${code}`));
          }
        });

        ffmpeg.on("error", (err) => {
          reject(new Error(`Failed to start FFmpeg process: ${err.message}`));
        });
      });
    } catch (error) {
      console.error(
        `Error downloading files for directory ${keyURIAndFileName.dirName}:`,
        error
      );

      return;
    }
  }
};
module.exports = {
  decryptTSFiles,
  mergeTSFiles,
};
