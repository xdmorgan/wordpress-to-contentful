const fetch = require("node-fetch");
const fs = require("fs-extra");
const path = require("path");
const { Observable } = require("rxjs");
const { USER_DIR_ORIGINALS, MOCK_OBSERVER, WP_API_URL } = require("../util");

const urlForPage = (url, page) => `${url}/users?page=${page}`;

const users = async (url, observer = MOCK_OBSERVER) => {
  await fs.ensureDir(USER_DIR_ORIGINALS);

  const usersByPage = async (page = 1) => {
    observer.next(`Getting users by page (${page})`);
    const response = await fetch(urlForPage(url, page));
    const { status } = response;
    // Save data and move on to the next page
    if (status === 200) {
      const json = await response.json();
      if (json.length) {
        const dest = path.join(USER_DIR_ORIGINALS, `users-${page}.json`);
        await fs.writeJson(dest, json, { spaces: 2 });
        return usersByPage(page + 1);
      } else return observer.complete();
    }
    // if it was working before, but it isn't anymore
    // we've reached the end of the paginated list
    if (status === 400) return observer.complete();
    // badness
    throw new Error(response);
  };
  // kick of recursive requests
  usersByPage();
};

module.exports = () => new Observable(observer => users(WP_API_URL, observer));
