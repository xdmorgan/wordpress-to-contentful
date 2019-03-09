const fs = require("fs-extra");
const path = require("path");
const { Observable } = require("rxjs");
const glob = require("glob");

const INPUT_DIR = path.join(process.cwd(), "dist", "raw-json-by-page");
const OUTPUT_DIR = path.join(process.cwd(), "dist", "posts-as-json");

const find = (pattern = "", opts = {}) =>
  new Promise((resolve, reject) => {
    glob(pattern, opts, (err, files) => (err ? reject(err) : resolve(files)));
  });

const extractBodyImages = post => {
  const regex = /<img.*?src="(.*?)"[\s\S]*?alt="(.*?)"/g;
  post.bodyImages = [];
  while ((foundImage = regex.exec(post.body))) {
    const alt = foundImage[2] ? foundImage[2].replace(/_/g, " ") : "";
    post.bodyImages.push({
      link: foundImage[1],
      description: alt,
      title: alt,
      postId: post.id
    });
  }
  return post;
};

const transform = post => {
  delete post._links;
  delete post.guid;
  delete post.excerpt;
  delete post.author; // TODO: Get authors, pull name, look for match in Contentful — Else fallback.
  delete post.comment_status;
  delete post.ping_status;
  delete post.template;
  delete post.format;
  delete post.meta;
  delete post.status;
  delete post.type;
  post.publishDate = post.date_gmt + "+00:00";
  delete post.date_gmt;
  delete post.date;
  delete post.modified;
  delete post.modified_gmt;
  delete post.tags;
  delete post.sticky;
  post.body = `<div>${post.content.rendered}</div>`;
  delete post.content;
  post.title = post.title.rendered;
  post.slug = post.slug;
  post.category = post.categories[0];
  delete post.categories;
  return [post.slug, extractBodyImages(post)];
};

const write = (name, data) =>
  fs.writeJson(path.join(OUTPUT_DIR, `${name}.json`), data, { spaces: 2 });

const postsByPage = () =>
  new Observable(async observer => {
    // get paginated raw posts from directory created in previous step
    await fs.ensureDir(OUTPUT_DIR);
    const files = await find("*.json", { cwd: INPUT_DIR });
    observer.next(`Found ${files.length} pages of posts`);
    // create a queue to process
    const queue = [...files];
    let count = 0;
    while (queue.length) {
      const file = queue.shift();
      const page = await fs.readJson(path.join(INPUT_DIR, file));
      while (page.length) {
        const post = page.shift();
        // transform the wordpress post into the expected format
        const [name, data] = transform(post);
        observer.next(`Processing: ${name}`);
        // save processed post by slug for later
        await write(name, data);
        count += 1;
      }
    }
    observer.complete(`Successfully tranfsormed ${count} posts`);
  });

module.exports = postsByPage;
