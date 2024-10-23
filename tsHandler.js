// tsHandler.js
const fs = require('fs');
const crypto = require('crypto');
const { spawn } = require('child_process');
const path = require('path');

const config = require('./config');

let tsFilesDir = config.tsFilesDir;
let decryptedDir = config.decryptedDir;
let m3u8FileDir = config.m3u8FileDir;
let outputDir = config.outputDir;

const downloadTSFiles = async (tsFiles) => {
    for (const tsFile of tsFiles) {
        const response = await fetch(config.frontTSFiles + tsFile);

        if (!response.ok) {
            throw new Error(`Failed to download ${tsFile}: ${response.status} ${response.statusText}`);
        }

        const buffer = await response.arrayBuffer();
        fs.writeFileSync(`${tsFilesDir}`, Buffer.from(buffer));
    }
    console.log("===========================> Downloaded TS Files");
};

const decryptTSFiles = async (keyURI) => {
    const keyResponse = await fetch(keyURI);

    const key = await keyResponse.arrayBuffer();

    // Create ts_files directory if it doesn't exist
    if (!fs.existsSync(tsFilesDir)) {
        fs.mkdirSync(tsFilesDir);
    }

    // Remove existing decrypted directory if it exists
    if (fs.existsSync(decryptedDir)) {
        fs.rmSync(decryptedDir, { recursive: true, force: true });
    }
    fs.mkdirSync(decryptedDir);

    const files = fs.readdirSync(tsFilesDir);

    for (const file of files) {
        if (file.endsWith('.enc.ts')) {
            const filePath = `${tsFilesDir}/${file}`;
            const encryptedData = fs.readFileSync(filePath);
            const decipher = crypto.createDecipheriv('aes-128-cbc', Buffer.from(key), Buffer.alloc(16));
            const decryptedData = Buffer.concat([decipher.update(encryptedData), decipher.final()]);

            const outputFile = file.replace('.enc.ts', '.ts');
            fs.writeFileSync(`${decryptedDir}/${outputFile}`, decryptedData);
        }
    }
    console.log("===========================> Decrypted TS Files");
};

const mergeTSFiles = async (outputFileName) => {
    const files = fs.readdirSync(decryptedDir)
        .filter(file => file.endsWith('.ts'))
        .sort((a, b) => {
            // Extract numbers from filenames for proper sorting
            const numA = parseInt(a.match(/\d+/)[0]);
            const numB = parseInt(b.match(/\d+/)[0]);
            return numA - numB;
        });

    if (files.length === 0) {
        throw new Error('No .ts files found in decrypted_ts_files directory');
    }

    const fileList = files.map(file => `file '${file}'`).join('\n');

    // Create a concat file listing all ts files
    let concatFilePath = path.join(decryptedDir, 'concat.txt');

    fs.writeFileSync(concatFilePath, fileList);

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }
    return new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', [
            '-f', 'concat',
            '-safe', '0',
            '-i', concatFilePath,
            '-c', 'copy',
            '-bsf:a', 'aac_adtstoasc',
            `${outputDir}/${outputFileName}`
        ]);

        ffmpeg.stdout.on('data', (data) => {
            console.log(`FFmpeg stdout: ${data}`);
        });

        ffmpeg.stderr.on('data', (data) => {
            console.log(`FFmpeg stderr: ${data}`);
        });

        ffmpeg.on('close', (code) => {
            // Clean up concat file
            fs.unlinkSync(concatFilePath);

            if (code === 0) {
                // Remove ts_files and decrypted_ts_files directories
                fs.rmSync(tsFilesDir, { recursive: true, force: true });
                fs.rmSync(decryptedDir, { recursive: true, force: true });
                fs.rmSync(m3u8FileDir, { recursive: true, force: true });

                console.log('===========================> Merged TS Files into MP4');
                resolve();
            } else {
                reject(new Error(`FFmpeg process exited with code ${code}`));
            }
        });

        ffmpeg.on('error', (err) => {
            reject(new Error(`Failed to start FFmpeg process: ${err.message}`));
        });
    });
};

module.exports = {
    downloadTSFiles,
    decryptTSFiles,
    mergeTSFiles
};