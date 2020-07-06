const path = require("path");
const fs = require("fs-extra");
const { Observable } = require("rxjs");
const {
  MOCK_OBSERVER,
  CONTENTFUL_LOCALE,
  ASSET_DIR_LIST,
  urlToMimeType,
  trimUrlToFilename,
} = require("../util");
const createClient = require("./create-client");
const { create } = require("domain");

// Do not exceed ten, delay is an important factor too
// 8 processes and 1s delay seem to make sense, for 10p/s
const PROCESSES = 8;
// add delays to try and avoid API request limits in
// the parallel processes
const API_DELAY_DUR = 1000;
const UPLOAD_TIMEOUT = 60000;
// out dests
const DONE_FILE_PATH = path.join(ASSET_DIR_LIST, "done.json");
const FAILED_FILE_PATH = path.join(ASSET_DIR_LIST, "failed.json");

const delay = (dur = API_DELAY_DUR) =>
  new Promise((resolve) => setTimeout(resolve, dur));

const uploadAssets = (client, assets, observer = MOCK_OBSERVER) =>
  new Promise((complete) => {
    const queue = [].concat(assets);
    const processing = new Set();
    const done = [];
    const failed = [];

    observer.next(
      `Preparing to upload ${queue.length} assets to ${client.name}`
    );

    const proglog = () => {
      observer.next(
        `Remaining: ${queue.length} (${processing.size} uploading, ${
          done.length
        } done, ${failed.length} failed)`
      );
    };

    const upload = (asset) => {
      const identifier = asset.link;
      return (
        Promise.race([
          new Promise((_, reject) => setTimeout(reject, UPLOAD_TIMEOUT)),
          new Promise(async (resolve) => {
            processing.add(identifier);
            proglog();
            const exists = await client.getAssets({
              "fields.name[in]": asset.title,
            });
            await delay();
            if (!exists.total) {
              const created = await client.createAsset(
                transformForUpload(asset)
              );
              await delay();
              const processed = await created.processForAllLocales();
              await delay();
              const published = await processed.publish();
              await delay();
              resolve(published);
            } else {
              resolve(exists.items[0]);
            }
          }),
        ])
          // happy path
          .then((published) => {
            done.push(transformForSaving(asset, published));
          })
          // badness
          .catch((error) => {
            // TODO: retry failed
            failed.push({ asset, error });
          })
          // either
          .finally(() => {
            processing.delete(identifier);
            proglog();
            // more in queue case
            if (queue.length) upload(queue.shift());
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
      upload(queue.shift());
      count += 1;
    }
  });

function transformForUpload(asset) {
  return {
    fields: {
      title: {
        [CONTENTFUL_LOCALE]: asset.title,
      },
      description: {
        [CONTENTFUL_LOCALE]: asset.description,
      },
      file: {
        [CONTENTFUL_LOCALE]: {
          contentType: urlToMimeType(asset.link),
          fileName: trimUrlToFilename(asset.link),
          upload: encodeURI(asset.link),
        },
      },
    },
  };
}

function transformForSaving(wp, cf) {
  return {
    wordpress: wp,
    contentful: {
      id: cf.sys.id,
      title: cf.fields.title[CONTENTFUL_LOCALE],
      description: cf.fields.description[CONTENTFUL_LOCALE],
      url: cf.fields.file[CONTENTFUL_LOCALE].url,
      name: cf.fields.file[CONTENTFUL_LOCALE].fileName,
    },
  };
}

async function uploadListOfAssets(client, observer = MOCK_OBSERVER) {
  const loc = path.join(ASSET_DIR_LIST, "assets.json");
  const assets = await fs.readJson(loc);

  const loc2 = path.join(ASSET_DIR_LIST, "failed.json");
  const failedMedia = await fs.readJson(loc2);
  const filtered = assets.filter((asset) =>
    failedMedia.find((element) => {
      return element.asset.mediaNumber === asset.mediaNumber;
    })
  );

  const { done, failed } = await uploadAssets(client, filtered, observer);
  await Promise.all([
    fs.writeJson(DONE_FILE_PATH, done, { spaces: 2 }),
    fs.writeJson(FAILED_FILE_PATH, failed, { spaces: 2 }),
  ]);
}

module.exports = (client) =>
  new Observable((observer) =>
    uploadListOfAssets(client, observer).then(() => observer.complete())
  );
