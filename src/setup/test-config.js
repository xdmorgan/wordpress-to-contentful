const fetch = require("node-fetch");

const {
  WP_API_URL,
  REDIRECT_BASE_URL,
  CONTENTFUL_CMA_TOKEN,
  CONTENTFUL_ENV_NAME,
  CONTENTFUL_SPACE_ID,
  CONTENTFUL_LOCALE,
  CONTENTFUL_FALLBACK_USER_ID
} = require("../util");

const WP_ERR_MSG = `WordPress unreachable at ${WP_API_URL}, check env config and internet connection`;
const REDIRECT_ERR_MSG = `Redirect base URL looks misconfigured: ${REDIRECT_BASE_URL}`;
const CFUL_ERR_BASE = `No value given for required Contentful config var: `;

async function config() {
  // Ping WP API
  const response = await fetch(WP_API_URL);
  if (response.status !== 200) throw new Error(WP_ERR_MSG);
  // We want to strip the base url from the absolute 'from' url's
  // we get back from wordpress and use /relative to /relative as from->to
  if (!REDIRECT_BASE_URL) throw new Error(REDIRECT_ERR_MSG);
  // We're gonna need these to create a Contentful client
  if (!CONTENTFUL_CMA_TOKEN) {
    throw new Error(CFUL_ERR_BASE + "CONTENTFUL_CMA_TOKEN");
  }
  if (!CONTENTFUL_SPACE_ID) {
    throw new Error(CFUL_ERR_BASE + "CONTENTFUL_SPACE_ID");
  }
  if (!CONTENTFUL_ENV_NAME) {
    throw new Error(CFUL_ERR_BASE + "CONTENTFUL_ENV_NAME");
  }
  if (!CONTENTFUL_LOCALE) {
    throw new Error(CFUL_ERR_BASE + "CONTENTFUL_LOCALE");
  }
  if (!CONTENTFUL_FALLBACK_USER_ID) {
    throw new Error(CFUL_ERR_BASE + "CONTENTFUL_FALLBACK_USER_ID");
  }
}

module.exports = config;
