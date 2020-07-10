const fs = require("fs-extra");
const path = require("path");
const { Observable } = require("rxjs");
const {
  MOCK_OBSERVER,
  USER_DIR_ORIGINALS,
  USER_DIR_TRANSFORMED,
  CONTENTFUL_LOCALE,
  findByGlob,
  htmlToRichText,
  htmlToMarkdown,
} = require("../util");
const OUTPUT_DATA_PATH = path.join(USER_DIR_TRANSFORMED, "authors.json");
const CF_USER_TYPE = "author";

const sanitizeName = (s) => s.toLowerCase().replace(/\ /gi, "");

async function findUserInContentful(wpUser, cfUsers, client) {
  const found = cfUsers
    .map(transformCfUser)
    .find(({ name = "" }) => sanitizeName(wpUser.name) === sanitizeName(name));

  if (!found) {
    const author = await client.createEntry(CF_USER_TYPE, {
      fields: {
        title: { [CONTENTFUL_LOCALE]: wpUser.name },
        slug: { [CONTENTFUL_LOCALE]: wpUser.slug },
        name: { [CONTENTFUL_LOCALE]: wpUser.name },
        bio: { [CONTENTFUL_LOCALE]: await htmlToMarkdown(wpUser.description) },
      },
    });

    return {
      wordpress: {
        id: wpUser.id,
        name: wpUser.name,
      },
      contentful: {
        id: author.sys.id,
        name: author.fields.name[CONTENTFUL_LOCALE],
      },
    };
  }

  return {
    wordpress: {
      id: wpUser.id,
      name: wpUser.name,
    },
    contentful: found || null,
  };
}

function transformCfUser(cfUser) {
  return {
    id: cfUser.sys.id,
    name: cfUser.fields.name ? cfUser.fields.name[CONTENTFUL_LOCALE] : "",
  };
}

async function processSavedUsers(client, observer = MOCK_OBSERVER) {
  const files = await findByGlob("*.json", { cwd: USER_DIR_ORIGINALS });
  const users = [];
  const queue = [...files];
  const output = [];

  while (queue.length) {
    const file = queue.shift();
    const page = await fs.readJson(path.join(USER_DIR_ORIGINALS, file));
    page.forEach((user) => users.push(user));
  }

  const { items: cfUsers } = await client.getEntries({
    content_type: CF_USER_TYPE,
  });

  while (users.length) {
    const user = users.shift();
    const result = await findUserInContentful(user, cfUsers, client);
    output.push(result);
  }

  await fs.ensureDir(USER_DIR_TRANSFORMED);
  await fs.writeJson(OUTPUT_DATA_PATH, output, { spaces: 2 });
  return output;
}

module.exports = (client) =>
  new Observable((observer) =>
    processSavedUsers(client, observer).then(() => observer.complete())
  );

// (async () => {
//   const client = await require("./create-client")();
//   processSavedUsers(client).then((fin) => console.log(fin.length));
// })();
