// utils.js
const fs = require("fs");
const path = require("path");

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const makeDirectory = async (decryptedDir) => {
  if (!fs.existsSync(decryptedDir)) {
    fs.mkdirSync(decryptedDir);
  }

  return true;
};

const makeSubDirectory = async (rootDir, subDir) => {
  if (!fs.existsSync(`${rootDir}/${subDir}`)) {
    fs.mkdirSync(path.join(rootDir, subDir), {
      recursive: true,
    });
  }

  return true;
};

module.exports = {
  delay,
  makeDirectory,
  makeSubDirectory,
};
