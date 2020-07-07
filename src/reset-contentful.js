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
} = require("./util");
const { exit } = require("process");

const PRESS_RELEASE_CATEGORY_ID = "l2Kds91EDCKqvkGCVmmcX";
const ABOUT_MODULE_ID = "42zZNGsISO9MLVYc98PM6f";
const NOTES_TO_EDITORS_ID = "1QQxMQdQJ0IbT6CFRvlFhS";
const CATEGORIES = [
  "V77xnUcL3G6lYv7gvfNoj",
  "3ZJnp8nsNVmIXOUriPNr2u",
  "6Eh7buvg1VZ4fCMWrdBdk",
  "5QN3uZU3XB8AuXS6sN8vTt",
  "6D76manLMljkSwKuiHJ28f",
  "30k8mVsVt5NgkvCDaVvhDo",
  "7pW4qGddSZt42T4KasgolA",
  "160BCbuyE9dbEIeVJXdJKH",
  "17k6yrJfK3tWSuxCsloi39",
  "6K9sOKaYoVGCQCqK1M48oQ",
];

async function resetContentful(client, observer = MOCK_OBSERVER, skip = 0) {
  const entries = await client
    .getEntries({
      content_type: "url",
      links_to_entry: PRESS_RELEASE_CATEGORY_ID,
      skip,
    })
    .catch(console.log);

  entries.items.forEach(async (entry) => {
    try {
      // const modularPage = await client.getEntry(
      //   entry.fields.link[CONTENTFUL_LOCALE].sys.id
      // );

      // if (modularPage) {
      //   const modules = modularPage.fields.modules[CONTENTFUL_LOCALE];

      //   modules.forEach(async (reference) => {
      //     if (reference.sys.id !== ABOUT_MODULE_ID) {
      //       const module = await client.getEntry(reference.sys.id);

      //       if (module) {
      //         if (await module.isPublished()) {
      //           await module.unpublish();
      //         }
      //         await module.delete();
      //       }
      //     }
      //   });
      //   if (await modularPage.isPublished()) {
      //     await modularPage.unpublish();
      //   }
      //   await modularPage.delete().catch(console.log);
      // }

      if (await entry.isPublished()) {
        await entry.unpublish();
      }
      await entry.delete().catch(console.log);
    } catch (error) {
      console.log(error);
    }
  });

  if (entries.skip + entries.limit < entries.total) {
    resetContentful(client, observer, skip + entries.limit);
  }
}

async function deleteRTM(client, observer = MOCK_OBSERVER, skip = 0) {
  // const notes = await client.getEntry("2g4CbGq8VMTHKSpltEMvw2");
  // const arr = notes.fields.modules[CONTENTFUL_LOCALE].map(
  //   (note) => note.link[CONTENTFUL_LOCALE].sys.id
  // );
  // console.log(arr);
  // exit(1);

  const entries = await client
    .getEntries({
      content_type: "richTextModule",
      "sys.createdBy.sys.id": CONTENTFUL_FALLBACK_USER_ID,
      skip,
      // links_to_entry: "2g4CbGq8VMTHKSpltEMvw2",
    })
    .catch(console.log);

  // console.log(entries.items);
  // exit(1);

  entries.items.forEach(async (entry) => {
    if (
      entry.sys.id !== NOTES_TO_EDITORS_ID &&
      !CATEGORIES.includes(entry.sys.id)
    ) {
      if (await entry.isPublished()) {
        await entry.unpublish();
      }
      await entry.delete();
    }
  });

  if (entries.skip + entries.limit < entries.total) {
    deleteRTM(client, observer, skip + entries.limit);
  }
}

(async () => {
  const client = await require("./contentful/create-client")();
  deleteRTM(client).then(console.log);
})();
