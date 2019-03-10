const path = require("path");
const glob = require("glob");

// when task is ran as singular node process and not as Listr task
const MOCK_OBSERVER = { next: console.log, complete: console.success };

// dirs references in various places
const BUILD_DIR = path.join(process.cwd(), "dist");
const POST_DIR_ORIGINALS = path.join(BUILD_DIR, "posts-original-by-page");
const POST_DIR_TRANSFORMED = path.join(BUILD_DIR, "posts-transformed");
const USER_DIR_ORIGINALS = path.join(BUILD_DIR, "users-original");
const ASSET_DIR_LIST = path.join(BUILD_DIR, "list-of-assets");

// Awaitable globz
const findByGlob = (pattern = "", opts = {}) =>
  new Promise((resolve, reject) => {
    glob(pattern, opts, (err, files) => (err ? reject(err) : resolve(files)));
  });

// exportz
module.exports = {
  MOCK_OBSERVER,
  BUILD_DIR,
  POST_DIR_ORIGINALS,
  POST_DIR_TRANSFORMED,
  USER_DIR_ORIGINALS,
  ASSET_DIR_LIST,
  findByGlob
};
