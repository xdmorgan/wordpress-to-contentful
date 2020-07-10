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
const EXCLUDE = [
  "2cShHVm7dhQorPilV9qV9O",
  "7iy8cJNoK3AbpBw6uCkLTR",
  "2fY9YPxh6vv9eKpuKYtrUM",
  "19RCEV83OmQciGz6hWVVxG",
  "5pmugijyL0R2fxT6hlRo6j",
  "1PeQ4Qzgvm31k8CtnLC6C1",
  "5lWnB6HGDS3OpMZD4ZHudZ",
  "1elHBq8OtoJXywShn9JiuP",
  "7uklC2wo7HKFWA9yZoLjVH",
  "5MBeUIHSYoGK06dhLoBJRU",
  "5QiQ9FjqDEFWSJIvYUgg2A",
  "jPNKDWwuasZtPZ1IknQIx",
  "7MTzSRfrzIYnhh5nPrthMt",
  "4jOQXDPYd6mtFbyTRHAHxS",
  "3cEIb7QodY78AwN696704I",
  "2oYOqAHj60kWA3hQ73TkMz",
  "5yhtfvL41IvGS0oZ0irhAo",
  "4XLO4rp3AhpsWV19cOQYex",
  "5xJUnE93Hh5C8Ntcf0WIe9",
  "5d3nuWFsheS8mBbqszXNwY",
  "6gSdrc67tRZH2gkQZFGNg7",
  "2Gtimrp3yz032HfZwsj7Hb",
  "r2Bc79zH5kd8PyYSOQ4AU",
  "6IeM40dl9XPzv9PCtQKm5d",
  "2uj4dIve1kt4aKN54zUJgC",
  "3hNGSr2IfVCJkaFB5gj9eW",
  "2LbE3bptpiidEIosQ26QwI",
  "4RBYyNa35sPSqfvtrjWLYd",
  "2tE2hXKRZVrXQgBj3HNXcw",
  "bji3UcPpCU74Ds1ZvfngD",
  "41ssTbD1vaFcBbWL6pE8Ss",
  "1enwLBkBzU5rdfysoDfqhE",
  "1deiG25NfZlcPctoCOZKSA",
  "7MBvUQRwdu5ztdjBHjRCgX",
  "3u3u9uYsnt3VUQMdAVIhx5",
  "4TVRtzzsGszojrf4d1rUmh",
  "4Xuygq9JmLXtAcknEKPgdZ",
  "34vKlvCzLuYlwCZc8S5TzG",
  "363oeD4yAJjJ3oSB3riIu6",
  "39lSZuR2yKqaky0wYcTyez",
  "2yZ9jifTP3T7eN88hOyEaJ",
  "dkPHwaXKH1DHJrDbLQLQS",
  "3Iv02vUF4QVz0z25OWGhkh",
  "2wbdwacYt1kHNJwwZwPsr0",
  "6cMqxWigkr0R4gpIVxQGGx",
  "55DHdhGJY7tZP0W0M03mrT",
  "2SI7vQxGUbMOiRNKjgII3X",
  "57nf2nIf4bXQWSuMpzWtsi",
  "4xrx0KetECga5RZ6NNlIDE",
  "7tqLZ7oYyFDhLlsMEKAUc",
  "PsVxpVUpbNvnsb596gOQD",
  "4jXzYTv8kj64PCPLUgfcxy",
  "55OdMrMfwSaIWG1LGLVsTA",
  "2g4CbGq8VMTHKSpltEMvw2",
  "30k8mVsVt5NgkvCDaVvhDo",
  "6D76manLMljkSwKuiHJ28f",
  "5QN3uZU3XB8AuXS6sN8vTt",
  "17k6yrJfK3tWSuxCsloi39",
  "160BCbuyE9dbEIeVJXdJKH",
  "7pW4qGddSZt42T4KasgolA",
  "6Eh7buvg1VZ4fCMWrdBdk",
  "V77xnUcL3G6lYv7gvfNoj",
  "3ZJnp8nsNVmIXOUriPNr2u",
  "6K9sOKaYoVGCQCqK1M48oQ",
  "4aVNaI4QYhb2XnDx9QGUAd",
  "7iy8cJNoK3AbpBw6uCkLTR",
  "6tXMxDtBevjpNl4JqsUGwG",
  "5Oci7iBcGQ2aCaOXlBNpIX",
  "1QQxMQdQJ0IbT6CFRvlFhS",
];

async function resetContentful(client, observer = MOCK_OBSERVER, skip = 0) {
  // console.log(await client.getEntry("1hxS49bHBpswRzqQWe67Cl"));
  // exit(1);
  const entries = await client
    .getEntries({
      "sys.createdBy.sys.id": CONTENTFUL_FALLBACK_USER_ID,
      skip,
    })
    .catch(console.log);

  entries.items.forEach(async (entry) => {
    if (!EXCLUDE.includes(entry.sys.id)) {
      try {
        if (await entry.isPublished()) {
          await entry.unpublish();
        }
        await entry.delete().catch(console.log);
      } catch (error) {
        console.log(error);
      }
    }
  });

  if (entries.skip + entries.limit < entries.total) {
    resetContentful(client, observer, skip + entries.limit);
  }
}

async function deleteAssets(client, observer = MOCK_OBSERVER, skip = 0) {
  // const notes = await client.getEntry("2VHezxDOBx5LL9g6Z3Pntc");
  // // const arr = notes.fields.modules[CONTENTFUL_LOCALE].map(
  // //   (note) => note.link[CONTENTFUL_LOCALE].sys.id
  // // );
  // console.log(notes.fields.contents[CONTENTFUL_LOCALE]);
  // console.log(notes);
  // exit(1);

  const entries = await client
    .getAssets({
      "sys.createdBy.sys.id": CONTENTFUL_FALLBACK_USER_ID,
      skip,
      // links_to_entry: "2g4CbGq8VMTHKSpltEMvw2",
    })
    .catch(console.log);

  // console.log(entries.items);
  // exit(1);

  entries.items.forEach(async (entry) => {
    if (await entry.isPublished()) {
      await entry.unpublish();
    }
    await entry.delete();
  });

  if (entries.skip + entries.limit < entries.total) {
    deleteAssets(client, observer, skip + entries.limit);
  }
}

(async () => {
  const client = await require("./contentful/create-client")();
  resetContentful(client).then(console.log);
})();
