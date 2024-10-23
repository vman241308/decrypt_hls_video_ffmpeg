// m3u8Parser.js
const fs = require('fs');
const config = require('./config');

let m3u8FileDir = config.m3u8FileDir;

const parseM3U8 = async () => {
    const m3u8Content = fs.readFileSync(`${m3u8FileDir}/ios_60-1152-ios_private.m3u8`, 'utf8');
    const lines = m3u8Content.split('\n');

    let keyURI = '';
    const tsFiles = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.startsWith('#EXT-X-KEY')) {
            const uriMatch = line.match(/URI="([^"]+)"/);
            if (uriMatch) {
                keyURI = uriMatch[1];
            }
        }

        if (line.startsWith('#EXTINF')) {
            const tsFile = lines[i + 1].trim();
            if (tsFile && tsFile.endsWith('.enc.ts')) {
                tsFiles.push(tsFile);
            }
        }
    }

    console.log("===========================> Parse M3U8");
    return { keyURI, tsFiles };
};

module.exports = { parseM3U8 };