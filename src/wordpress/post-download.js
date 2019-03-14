const fetch = require("node-fetch");
const fs = require("fs-extra");
const path = require("path");
const { Observable } = require("rxjs");
const { POST_DIR_ORIGINALS, MOCK_OBSERVER, WP_API_URL } = require("../util");

const urlForPage = (url, page) => `${url}/posts?page=${page}`;

const posts = async (url, observer = MOCK_OBSERVER) => {
  await fs.ensureDir(POST_DIR_ORIGINALS);

  const postsByPage = async (page = 1) => {
    observer.next(`Getting posts by page (${page})`);
    const response = await fetch(urlForPage(url, page));
    const { status } = response;
    // Save data and move on to the next page
    if (status === 200) {
      const json = await response.json();
      const dest = path.join(POST_DIR_ORIGINALS, `posts-${page}.json`);
      await fs.writeJson(dest, json);
      return postsByPage(page + 1);
    }
    // if it was working before, but it isn't anymore
    // we've reached the end of the paginated list
    if (status === 400) return observer.complete();
    // badness
    throw new Error(response);
  };
  // kick of recursive requests
  postsByPage();
};

module.exports = () => new Observable(observer => posts(WP_API_URL, observer));
