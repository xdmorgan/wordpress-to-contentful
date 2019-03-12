const { MOCK_OBSERVER } = require("../util");
const PARALELLIZE_IT = 3;

const uploadAssets = (assets, observer = MOCK_OBSERVER) =>
  new Promise(complete => {
    const queue = [].concat(assets);
    const processing = new Set();
    const done = [];
    const failed = [];

    observer.next(`Preparing to upload ${queue.length} assets`);

    const upload = asset =>
      new Promise((resolve, reject) => {
        processing.add(asset.id);
        setTimeout(
          Math.random() > 0.75 ? reject : resolve,
          Math.random() * 2000 + 1000
        );
      })
        .then(() => {
          observer.next(`Asset ${asset.id} succeeded`);
          done.push({
            asset,
            response: { id: "123-4567-7-38204u" }
          });
        })
        .catch(error => {
          observer.next(`Asset ${asset.id} failed`);
          // the item that failed
          failed.push({ asset, error });
        })
        .finally(() => {
          processing.delete(asset.id);
          // more in queue case
          if (queue.length) upload(queue.shift());
          // no more in queue, but at lesat one parallel
          // process is in progress
          else if (processing.size) return;
          else {
            const msgs = [
              "Processing complete!",
              `${done.length} succeeded`,
              `${failed.length} failed.`
            ];
            observer.next(msgs.join("\n"));
            complete({ done, failed });
          }
        });

    // safely handle cases where there are less total
    // items than the amount of parallel processes
    let count = 0;
    while (queue.length && count < PARALELLIZE_IT) {
      upload(queue.shift());
      count += 1;
    }
  });

const mocks = Array.from({ length: 12 }).map((_, id) => ({ id }));
uploadAssets(mocks).then(console.log);
