const path = require("path");
const fs = require("fs-extra");
const { richTextFromMarkdown } = require("@contentful/rich-text-from-markdown");
const { Observable } = require("rxjs");
const {
  MOCK_OBSERVER,
  CONTENTFUL_LOCALE,
  POST_DIR_TRANSFORMED,
  POST_DIR_CREATED,
  USER_DIR_TRANSFORMED,
  CONTENTFUL_FALLBACK_USER_ID,
  ASSET_DIR_LIST,
  findByGlob,
  htmlToRichText,
} = require("../util");

// Do not exceed ten, delay is an important factor too
// 8 processes and 1s delay seem to make sense, for 10p/s
const PROCESSES = 8;
// add delays to try and avoid API request limits in
// the parallel processes
const API_DELAY_DUR = 1000;
const UPLOAD_TIMEOUT = 60000;

const CONTENT_TYPE = "modularPage";
const HERO_TYPE = "contentHeroModule";
const BODY_TYPE = "richTextModule";
const PRESS_RELEASE_TYPE = "richTextModule";
const NOTES_TYPE = "richTextModule";
const AUTHOR_TYPE = "author";
const DONE_FILE_PATH = path.join(ASSET_DIR_LIST, "done.json");
const AUTHOR_FILE_PATH = path.join(USER_DIR_TRANSFORMED, "authors.json");
const RESULTS_PATH = path.join(POST_DIR_CREATED, "posts.json");

const delay = (dur = API_DELAY_DUR) =>
  new Promise((resolve) => setTimeout(resolve, dur));

const createBlogPosts = (posts, assets, authors, client, observer) => {
  const [inlineMap, heroMap] = createMapsFromAssets(assets);
  const authorMap = createMapFromAuthors(authors);

  return new Promise((complete) => {
    const queue = [].concat(posts);
    const processing = new Set();
    const done = [];
    const failed = [];
    let hero,
      body,
      pressRelease,
      notesToEditors = {};

    const logProgress = () => {
      observer.next(
        `Remaining: ${queue.length} (${processing.size} uploading, ${
          done.length
        } done, ${failed.length} failed)`
      );
    };

    const createHero = (post) => {
      return Promise.race([
        new Promise((_, reject) => setTimeout(reject, UPLOAD_TIMEOUT)),
        new Promise(async (resolve, reject) => {
          await delay();

          const exists = await client.getEntries({
            content_type: HERO_TYPE,
            "fields.name[in]": post.title,
          });

          if (exists && exists.total > 0) {
            return reject({
              error: "Hero Module already exists",
              hero: exists,
            });
          }

          await delay();

          const created = await client.createEntry(HERO_TYPE, {
            fields: {
              name: { [CONTENTFUL_LOCALE]: post.title },
              header: { [CONTENTFUL_LOCALE]: post.title },
              layout: { [CONTENTFUL_LOCALE]: "Header out of form" },
            },
          });
          await delay();
          const published = await created.publish();
          await delay();
          resolve(published);
        }),
      ]).catch((error) => {
        // TODO: retry failed
        if (error.hero.items.length) return error.hero.items[0];
        else failed.push({ post, error });
      });
    };

    const createBody = async (post) => {
      return Promise.race([
        new Promise((_, reject) => setTimeout(reject, UPLOAD_TIMEOUT)),
        new Promise(async (resolve, reject) => {
          const created = await client.createEntry(BODY_TYPE, {
            fields: {
              name: { [CONTENTFUL_LOCALE]: post.title },
              content: {
                [CONTENTFUL_LOCALE]: await htmlToRichText(
                  replaceInlineImageUrls(post.body, inlineMap)
                ),
              },
            },
          });

          await delay();
          const published = await created.publish();
          await delay();
          resolve(published);
        }),
      ]).catch((error) => {
        // TODO: retry failed
        failed.push({ post, error });
      });
    };

    const createPressRelease = async (post) => {
      return Promise.race([
        new Promise((_, reject) => setTimeout(reject, UPLOAD_TIMEOUT)),
        new Promise(async (resolve, reject) => {
          const dump = await fs.readJSON(
            path.join(process.cwd(), "src/db-convert/dump.json"),
            "utf8"
          );

          const single = dump[post.id];
          const {
            press_contact,
            phone_number,
            mobile_number,
            email_address,
            twitter,
          } = single;

          const content = await htmlToRichText(`
            <h3>FOR MORE INFORMATION</h3>
            ${press_contact && `<p>${press_contact}</p>`}
            ${phone_number && `<p>Phone: ${phone_number}</p>`}
            ${mobile_number && `<p>Mobile: ${mobile_number}</p>`}
            ${email_address && `<p>Email: ${email_address}</p>`}
            ${twitter &&
              `<p>Twitter: <a href="@${twitter}" target="_blank">@${
                single.twitter
              }</a></p>`}
          `);

          const exists = await client.getEntries({
            content_type: PRESS_RELEASE_TYPE,
            "fields.name[in]": `Press release - ${press_contact}`,
          });

          if (exists && exists.total) {
            return resolve(exists.items[0]);
          } else {
            const created = await client.createEntry(PRESS_RELEASE_TYPE, {
              fields: {
                name: {
                  [CONTENTFUL_LOCALE]: `Press release - ${press_contact}`,
                },
                content: {
                  [CONTENTFUL_LOCALE]: content,
                },
              },
            });

            await delay();
            const published = await created.publish();
            await delay();
            resolve(published);
          }
        }),
      ]).catch((error) => {
        // TODO: retry failed
        // failed.push({ post, error });
        console.log(error);
      });
    };

    const createNotesToEditors = async (post) => {
      return Promise.race([
        new Promise((_, reject) => setTimeout(reject, UPLOAD_TIMEOUT)),
        new Promise(async (resolve, reject) => {
          const notes = await fs.readJSON(
            path.join(process.cwd(), "src/db-convert/notestoeditors.json"),
            "utf8"
          );

          const single = notes[post.id];
          const { notes_to_editors } = single;

          if (!notes_to_editors) {
            reject({ error: "No notes for this post" });
          } else {
            const content = await htmlToRichText(`
              <h3>Notes to editors</h3>
              ${notesToEditors}
            `);

            const created = await client.createEntry(NOTES_TYPE, {
              fields: {
                name: {
                  [CONTENTFUL_LOCALE]: `Notes to editors`,
                },
                content: {
                  [CONTENTFUL_LOCALE]: content,
                },
              },
            });

            await delay();
            const published = await created.publish();
            await delay();
            resolve(published);
          }
        }),
      ]).catch(console.log);
    };

    const createBlogPost = async (post) => {
      const identifier = post.slug;
      processing.add(identifier);
      logProgress();

      hero = await createHero(post);
      body = await createBody(post);
      pressRelease = await createPressRelease(post);
      notesToEditors = await createNotesToEditors(post);
      const about = await client.getEntries({
        content_type: "richTextModule",
        "fields.name[in]": "About Uswitch - media centre example",
      });

      const modules = {
        ...(hero !== undefined && { hero }),
        ...(body !== undefined && { body }),
        ...(pressRelease !== undefined && { pressRelease }),
        ...(notesToEditors !== undefined && { notesToEditors }),
        ...(about && about.total > 0 && { about: about.items[0] }),
      };

      return (
        Promise.race([
          new Promise((_, reject) => setTimeout(reject, UPLOAD_TIMEOUT)),
          new Promise(async (resolve, reject) => {
            await delay();

            const exists = await client.getEntries({
              content_type: CONTENT_TYPE,
              "fields.title[in]": post.slug,
            });

            if (exists && exists.total > 0) {
              return reject({ error: "Post already exists", post: exists });
            }

            await delay();

            const created = await client.createEntry(
              CONTENT_TYPE,
              transform(post, inlineMap, heroMap, authorMap, modules)
            );
            await delay();
            const published = await created.publish();
            await delay();
            resolve(published);
          }),
        ])

          // happy path
          .then((published) => {
            done.push(post);
          })
          // badness
          .catch((error) => {
            // TODO: retry failed
            failed.push({ post, error });
          })
          // either
          .finally(() => {
            processing.delete(identifier);
            logProgress();
            // more in queue case
            if (queue.length) createBlogPost(queue.shift());
            // no more in queue, but at lesat one parallel
            // process is in progress
            else if (processing.size) return;
            else complete({ done, failed });
          })
      );
    };
    // safely handle cases where there are less total
    // items than the amount of parallel processes
    let count = 0;
    while (queue.length && count < PROCESSES) {
      createBlogPost(queue.shift());
      count += 1;
    }
  });
};

function transform(post, inlineMap, heroMap, authorMap, modules) {
  const { hero, body, pressRelease, notesToEditors, about } = modules;

  return {
    fields: {
      name: {
        [CONTENTFUL_LOCALE]: post.title,
      },
      title: {
        [CONTENTFUL_LOCALE]: post.title,
      },
      metaDescription: {
        [CONTENTFUL_LOCALE]: post.description,
      },
      modules: {
        [CONTENTFUL_LOCALE]: [
          ...(hero !== undefined
            ? [
                {
                  sys: { type: "Link", linkType: "Entry", id: hero.sys.id },
                },
              ]
            : []),
          ...(body !== undefined
            ? [
                {
                  sys: { type: "Link", linkType: "Entry", id: body.sys.id },
                },
              ]
            : []),
          {
            sys: {
              type: "Link",
              linkType: "Entry",
              id: authorMap.has(post.author)
                ? authorMap.get(post.author)
                : CONTENTFUL_FALLBACK_USER_ID,
            },
          },
          ...(pressRelease !== undefined
            ? [
                {
                  sys: {
                    type: "Link",
                    linkType: "Entry",
                    id: pressRelease.sys.id,
                  },
                },
              ]
            : []),
          ...(notesToEditors !== undefined
            ? [
                {
                  sys: {
                    type: "Link",
                    linkType: "Entry",
                    id: notesToEditors.sys.id,
                  },
                },
              ]
            : []),
          ...(about !== undefined
            ? [
                {
                  sys: { type: "Link", linkType: "Entry", id: about.sys.id },
                },
              ]
            : []),
        ],
      },
      container: {
        [CONTENTFUL_LOCALE]: true,
      },
    },
  };
}

function replaceInlineImageUrls(text, map) {
  let replacedText = text;
  map.forEach((newUrl, oldUrl) => {
    replacedText = replacedText.replace(oldUrl, newUrl);
  });
  return replacedText;
}

function createMapsFromAssets(assets) {
  const links = new Map();
  const heros = new Map();
  assets.forEach((asset) =>
    links.set(asset.wordpress.link, asset.contentful.url)
  );
  assets.forEach(
    (asset) =>
      asset.wordpress.mediaNumber &&
      heros.set(asset.wordpress.mediaNumber, asset.contentful.id)
  );
  return [links, heros];
}

function createMapFromAuthors(authors) {
  const map = new Map();
  authors.forEach((author) => {
    if (author.contentful) map.set(author.wordpress.id, author.contentful.id);
  });
  return map;
}

async function processBlogPosts(client) {
  const files = await findByGlob("*.json", { cwd: POST_DIR_TRANSFORMED });
  const queue = [...files].sort();
  const posts = [];

  while (queue.length) {
    const file = queue.shift();
    const post = await fs.readJson(path.join(POST_DIR_TRANSFORMED, file));
    posts.push(post);
  }

  const assets = await fs.readJson(DONE_FILE_PATH);
  const authors = await fs.readJson(AUTHOR_FILE_PATH);

  const result = await createBlogPosts(posts, assets, authors, client);

  await fs.ensureDir(POST_DIR_CREATED);
  await fs.writeJson(RESULTS_PATH, result, { spaces: 2 });
  return result;
}

module.exports = (client) => {
  new Observable((observer) =>
    processBlogPosts(client, observer).then(() => observer.complete())
  );
};

// debug
// (async () => {
//   const client = await require("./create-client")();
//   processBlogPosts(client).then(console.log);
// })();
