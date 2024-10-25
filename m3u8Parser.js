// m3u8Parser.js
const fs = require("fs");
const config = require("./config");

let m3u8FileDir = config.m3u8FileDir;

let keyAndFileNamesformat = {
  m3u8DirName: "",
  dirName: "",
  keyURI: "",
  tsFiles: [],
};

let m3u8DirAndNameFormat = {
  dirName: "",
  m3u8FileName: "",
};

const getkeyURIAndFileNames = async (m3u8ContentLinks) => {
  try {
    let m3u8DirAndNames = [];

    m3u8ContentLinks.forEach((link) => {
      let parts = link.split("/");
      let dirName = parts[0];
      let m3u8FileName = parts[1];
      let format = {
        dirName: dirName,
        m3u8FileName: m3u8FileName,
      };
      m3u8DirAndNames.push(format);
    });

    const files = fs.readdirSync(m3u8FileDir);

    let keyURIAndFileNames = [];
    const originalM3u8DirAndNames = [...m3u8DirAndNames];

    for (const file of files) {
      keyAndFileNamesformat = [];
      let tsFiles = [];

      for (const m3u8DirAndName of originalM3u8DirAndNames) {
        if (m3u8DirAndName.m3u8FileName === file) {
          keyAndFileNamesformat.m3u8DirName = m3u8DirAndName.dirName;
        }
      }

      if (file.endsWith(".m3u8")) {
        const content = fs.readFileSync(`${m3u8FileDir}/${file}`, "utf8");
        const lines = content.split("\n");

        // Skip if content doesn't contain #EXTINF
        if (!content.includes("#EXTINF")) {
          continue;
        }

        keyAndFileNamesformat.dirName = file.replace(".m3u8", "");

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();

          if (line.startsWith("#EXT-X-KEY")) {
            const uriMatch = line.match(/URI="([^"]+)"/);
            if (uriMatch) {
              keyAndFileNamesformat.keyURI = uriMatch[1];
            }
          }

          if (line.startsWith("#EXTINF")) {
            const individualtsFile = lines[i + 1].trim();
            if (individualtsFile && individualtsFile.endsWith(".ts")) {
              tsFiles.push(individualtsFile);
            }
          }
        }
      }
      keyAndFileNamesformat.tsFiles = tsFiles;
      keyURIAndFileNames.push(keyAndFileNamesformat);
    }

    return keyURIAndFileNames;
  } catch (error) {
    console.error("Error reading m3u8 files:", error);
    return [];
  }
};
const getM3U8Content = async () => {
  try {
    const files = fs.readdirSync(m3u8FileDir);
    const m3u8ContentLinks = [];

    for (const file of files) {
      if (file.endsWith(".m3u8")) {
        const content = fs.readFileSync(`${m3u8FileDir}/${file}`, "utf8");
        const lines = content.split("\n");

        if (!content.includes("#EXT-X-STREAM-INF")) {
          continue;
        }

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.startsWith("#EXT-X-STREAM-INF")) {
            const individualM3U8 = lines[i + 1].trim();
            if (individualM3U8 && individualM3U8.endsWith(".m3u8")) {
              m3u8ContentLinks.push(individualM3U8);
            }
          }
        }
      }
    }

    return m3u8ContentLinks;
  } catch (error) {
    console.error("Error reading m3u8 files:", error);
    return [];
  }
};
module.exports = { getkeyURIAndFileNames, getM3U8Content };
