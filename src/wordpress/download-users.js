const fetch = require("node-fetch");
const fs = require("fs-extra");
const path = require("path");
const { Observable } = require("rxjs");

const MOCK_OBSERVER = { next: console.log, complete: console.success };
const DEST_DIR = path.join(process.cwd(), "dist", "users-raw-by-page");

const users = async (url, observer = MOCK_OBSERVER) => {
  await fs.ensureDir(DEST_DIR);
  const response = await fetch(`${url}/users`);
  const { status } = response;
  // Save data and move on to the next page
  if (status === 200) {
    const json = await response.json();
    const dest = path.join(DEST_DIR, `users.json`);
    await fs.writeJson(dest, json);
    return observer.complete();
  }
  throw new Error(response);
};

module.exports = () =>
  new Observable(observer => users(process.env.API_URL, observer));
