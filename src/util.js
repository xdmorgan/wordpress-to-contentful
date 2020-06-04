require("dotenv").config();

const path = require("path");
const glob = require("glob");
const remark = require("remark");
const TurndownService = require("turndown");
const { richTextFromMarkdown } = require("@contentful/rich-text-from-markdown");

// when task is ran as singular node process and not as Listr task
const MOCK_OBSERVER = { next: console.log, complete: console.success };

// dirs references in various places
const BUILD_DIR = path.join(process.cwd(), "dist");
const POST_DIR_ORIGINALS = path.join(BUILD_DIR, "posts-original-by-page");
const POST_DIR_TRANSFORMED = path.join(BUILD_DIR, "posts-transformed");
const POST_DIR_CREATED = path.join(BUILD_DIR, "posts-created");
const USER_DIR_ORIGINALS = path.join(BUILD_DIR, "users-original");
const USER_DIR_TRANSFORMED = path.join(BUILD_DIR, "users-transformed");
const ASSET_DIR_LIST = path.join(BUILD_DIR, "list-of-assets");
const REDIRECTS_DIR = path.join(BUILD_DIR, "redirects");
const {
  REDIRECT_BASE_URL,
  WP_API_URL,
  CONTENTFUL_CMA_TOKEN,
  CONTENTFUL_SPACE_ID,
  CONTENTFUL_ENV_NAME,
  CONTENTFUL_LOCALE,
  CONTENTFUL_FALLBACK_USER_ID,
} = process.env;

// Awaitable globz
const findByGlob = (pattern = "", opts = {}) =>
  new Promise((resolve, reject) => {
    glob(pattern, opts, (err, files) => (err ? reject(err) : resolve(files)));
  });

const MIME_TYPES = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
};

const urlToMimeType = (url) => {
  const type = url
    .split(".")
    .slice(-1)
    .join("");
  return MIME_TYPES[type] ? MIME_TYPES[type] : MIME_TYPES["jpg"];
};

const trimUrlToFilename = (url) =>
  url
    .split("/")
    .slice(-1)
    .join("");

const turndownService = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
  emDelimiter: "*",
  strongDelimiter: "__",
  // Convert YouTube and Vimeo iframes to Embedly cards
  blankReplacement(content, node) {
    const types = ["IFRAME"];
    const convertToAnchor = (iframe) => {
      const src = iframe.getAttribute("src").split("?")[0];

      // Use the same syntax as "Embed external content" button in Contentful
      return `<a href="${src}" class="embedly-card" data-card-width="100%" data-card-controls="0">Embedded content: ${src}</a>`;
    };

    // Handle <iframe></iframe>
    if (types.includes(node.nodeName)) {
      return `\n\n${convertToAnchor(node)}\n\n`;
    }

    // Handle <div><iframe></iframe></div>
    const output = [];
    node.childNodes.forEach((child) => {
      if (types.includes(child.nodeName)) {
        output.push(convertToAnchor(child));
      }
    });

    if (output.length) {
      return `\n\n${output.join("\n\n")}\n\n`;
    }

    // Default blankReplacement implementation
    return node.isBlock ? "\n\n" : "";
  },
})
  .keep("iframe")
  // Convert <cite> elements inside <blockquote> to <em>, so that they can be
  // easily targeted with CSS.
  .addRule("cite", {
    filter: "cite",
    replacement(content, node, options) {
      const text = content.replace("– ", "");
      return `${options.emDelimiter}${text}${options.emDelimiter}`;
    },
  });

const htmlToMarkdown = (content) => {
  return new Promise((resolve, reject) => {
    remark().process(turndownService.turndown(content), (err, file) => {
      if (err) {
        reject(err);
      } else {
        resolve(String(file));
      }
    });
  });
};

const htmlToRichText = async (content) =>
  await richTextFromMarkdown(await htmlToMarkdown(content));

// exportz
module.exports = {
  MOCK_OBSERVER,
  BUILD_DIR,
  POST_DIR_ORIGINALS,
  POST_DIR_TRANSFORMED,
  POST_DIR_CREATED,
  USER_DIR_ORIGINALS,
  ASSET_DIR_LIST,
  REDIRECTS_DIR,
  REDIRECT_BASE_URL,
  WP_API_URL,
  CONTENTFUL_CMA_TOKEN,
  CONTENTFUL_SPACE_ID,
  CONTENTFUL_ENV_NAME,
  CONTENTFUL_LOCALE,
  CONTENTFUL_FALLBACK_USER_ID,
  USER_DIR_TRANSFORMED,
  findByGlob,
  urlToMimeType,
  trimUrlToFilename,
  htmlToRichText,
};
