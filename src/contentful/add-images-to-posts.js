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
  REDIRECT_BASE_URL,
  urlToMimeType,
  trimUrlToFilename,
  findByGlob,
  htmlToRichText,
  htmlToMarkdown,
} = require("../util");
const { exit } = require("process");

const CONTENT_TYPE = "modularPage";
const PRESS_RELEASE_CATEGORY_ID = "l2Kds91EDCKqvkGCVmmcX";
const API_DELAY_DUR = 1000;
const LIMIT = 200;

const delay = (dur = API_DELAY_DUR) =>
  new Promise((resolve) => setTimeout(resolve, dur));

async function processBlogPosts(client, observer = MOCK_OBSERVER, skip = 0) {
  const pressReleases = await client.getEntries({
    content_type: "url",
    links_to_entry: PRESS_RELEASE_CATEGORY_ID,
    skip,
    limit: LIMIT,
  });

  pressReleases.items.forEach(async (release) => {
    await delay();
    const page = await client.getEntry(
      release.fields.link[CONTENTFUL_LOCALE].sys.id
    );
    await delay();

    const dump = await fs.readJSON(
      path.join(process.cwd(), "dist/list-of-assets/done.json"),
      "utf8"
    );
    const posts = await fs.readJSON(
      path.join(process.cwd(), "dist/posts-created/posts copy.json"),
      "utf8"
    );
    await delay();

    const post = posts.done.find((post) => {
      return post.title === page.fields.title[CONTENTFUL_LOCALE];
    });

    if (post && post.featured_media) {
      const { featured_media } = post;
      const image = await dump.find(
        (element) => element.wordpress.mediaNumber === featured_media
      );
      await delay();

      if (image) {
        page.fields.metaImage = {
          [CONTENTFUL_LOCALE]: {
            sys: {
              type: "Link",
              linkType: "Asset",
              id: image.contentful.id,
            },
          },
        };

        page
          .update()
          .then((updatedContentType) => {
            console.log("Update was successful");
          })
          .catch(console.log);
      }
    } else if (post && !post.featured_media) {
      await delay();

      page.fields.metaImage = null;

      page
        .update()
        .then((updatedContentType) => {
          console.log("Edit was successful", post);
        })
        .catch(console.log);
    } else console.log("unsuccesfull", post);
  });
  // console.log(pressReleases);

  const { total, limit } = pressReleases;
  if (skip + limit < total) {
    processBlogPosts(client, observer, skip + limit);
  }
}

module.exports = (client) => {
  new Observable((observer) =>
    processBlogPosts(client, observer).then(() => observer.complete())
  );
};

// debug
(async () => {
  const client = await require("./create-client")();
  processBlogPosts(client)
    .then(console.log)
    .catch(console.log);
})();
