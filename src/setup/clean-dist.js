const fs = require("fs-extra");
const path = require("path");

const OUT_DIR = "dist";

const clean = async () => {
  const out = path.join(process.cwd(), OUT_DIR);
  return fs.emptyDir(out);
};

module.exports = clean;
