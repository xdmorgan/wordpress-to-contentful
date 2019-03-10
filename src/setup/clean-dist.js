const fs = require("fs-extra");
const { BUILD_DIR } = require("../util");

const clean = async () => fs.emptyDir(BUILD_DIR);

module.exports = clean;
