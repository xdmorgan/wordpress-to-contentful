const fetch = require("node-fetch");
const fs = require("fs-extra");
const path = require("path");
const { Observable } = require("rxjs");
const { USER_DIR_ORIGINALS, MOCK_OBSERVER } = require("../util");

const users = async (url, observer = MOCK_OBSERVER) => {
  await fs.ensureDir(USER_DIR_ORIGINALS);
  const response = await fetch(`${url}/users`);
  const { status } = response;
  // Save data and move on to the next page
  if (status === 200) {
    const json = await response.json();
    const dest = path.join(USER_DIR_ORIGINALS, `users.json`);
    await fs.writeJson(dest, json, { spaces: 2 });
    return observer.complete();
  }
  throw new Error(response);
};

module.exports = () =>
  new Observable(observer => users(process.env.API_URL, observer));
