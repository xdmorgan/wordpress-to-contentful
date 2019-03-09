const fetch = require("node-fetch");

const { API_URL } = process.env;
const ERROR_MESSAGE = `WordPress unreachable at ${API_URL}, check env config and internet connection`;

async function config() {
  const response = await fetch(API_URL);
  if (response.status === 200) return true;
  else throw new Error(ERROR_MESSAGE);
}

module.exports = config;
