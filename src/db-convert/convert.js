const fs = require("fs-extra");
const path = require("path");

const { findByGlob } = require("../util");

const DIR = path.join(process.cwd(), "src/db-convert");

const writeDump = (data) =>
  fs.writeJson(path.join(DIR, `dump.json`), data, {
    spaces: 2,
  });

const transform = (row) => {
  const values = row.split(/\r?\n?\t/);
  const result = {};

  if (!isNaN(values[0])) {
    for (let i = 0; i < values.length; i++) {
      const value = values[i];

      switch (i) {
        case 0:
          result.post_id = value;
          break;

        case 1:
          result[value] = values[values.length - 1];
          break;
      }
    }
  }
  return result;
};

const convert = async () => {
  const files = await findByGlob("dump.db", { cwd: DIR });
  const queue = [...files].sort(); // create a queue to process

  const result = {};

  while (queue.length) {
    const file = queue.shift();
    const page = await fs.readFile(path.join(DIR, file), "utf8");
    const rows = page.split(/\r?\n/);

    let count = 0; // progress indicator
    while (rows.length) {
      // grab post off the page stack
      const row = rows.shift();
      // increment progress and show update
      count += 1;
      // transform the wordpress post into the expected format
      const data = transform(row);

      result[data.post_id] = { ...result[data.post_id], ...data };
      // // save relevant information for redirects
      // const { link, slug } = data;
      // redirects.push({ link, slug });
      // // save processed post by slug for later
      // await writePost(name, data);

      await writeDump(result);
    }
  }

  console.log(result);
};

convert();
