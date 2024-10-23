// utils.js
const delay = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds));

module.exports = {
    delay
};