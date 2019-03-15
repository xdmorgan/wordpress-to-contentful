const fetch = require("node-fetch");
const fs = require("fs-extra");
const path = require("path");
const { Observable } = require("rxjs");
const {
  ASSET_DIR_LIST,
  POST_DIR_TRANSFORMED,
  MOCK_OBSERVER,
  WP_API_URL,
  findByGlob
} = require("../util");

const urlById = (url, id) => `${url}/media/${id}`;

const listOfImagesByPost = async (post, url) => {
  const images = [];
  if (post.featured_media) {
    const postId = post.id;
    const mediaNumber = post.featured_media;
    const response = await fetch(urlById(url, mediaNumber));
    const { status } = response;
    // Save data and move on to the next page
    if (status === 200) {
      const json = await response.json();
      images.push({
        mediaNumber,
        link: json.guid.rendered,
        title: json.title.rendered || "",
        description: json.alt_text || "",
        postId
      });
    }
  }
  return images.concat(post.bodyImages ? post.bodyImages : []);
};

const assets = async (url, observer = MOCK_OBSERVER) => {
  await fs.ensureDir(ASSET_DIR_LIST);
  const files = await findByGlob("*.json", { cwd: POST_DIR_TRANSFORMED });
  observer.next(`Processing ${files.length} posts`);
  const queue = [...files].sort();
  let list = [];
  while (queue.length) {
    const file = queue.shift();
    const post = await fs.readJson(path.join(POST_DIR_TRANSFORMED, file));
    const images = await listOfImagesByPost(post, url);
    list = list.concat(images);
    observer.next(
      `Processed ${list.length} images. (${files.length - queue.length} / ${
        files.length
      } posts)`
    );
  }

  await fs.writeJson(path.join(ASSET_DIR_LIST, "assets.json"), list, {
    spaces: 2
  });
  observer.complete();
};

module.exports = () => new Observable(observer => assets(WP_API_URL, observer));
