const contentful = require("contentful-management");
const {
  CONTENTFUL_CMA_TOKEN,
  CONTENTFUL_ENV_NAME,
  CONTENTFUL_SPACE_ID
} = require("../util");

const get = async ({ accessToken, spaceId, envName } = {}) => {
  const client = contentful.createClient({
    accessToken,
    logHandler: (level, data) => console.log(`${level} | ${data}`)
  });
  const space = await client.getSpace(spaceId);
  const env = await space.getEnvironment(envName);
  return env;
};

module.exports = () =>
  get({
    accessToken: CONTENTFUL_CMA_TOKEN,
    spaceId: CONTENTFUL_SPACE_ID,
    envName: CONTENTFUL_ENV_NAME
  });
