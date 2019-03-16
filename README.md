# WordPress to Contentful

Migrate WordPress posts to Contentful using the WP REST API and the Contentful JS SDK.

- **Markdown**: Post bodies are converted to Markdown to strip out inline styles and image dimensions.
- **Assets**: Featured and inline images will be transferred and their references in content replaced.
- **Authors**: Script looks for CF Person names that match WP User and reassign author attribution.
- **Date Published**: Preserved

---

## 🚀 Usage

1. Prerequisites
1. `yarn install`
1. `yarn start`

---

## ⚠️ Prerequisites

### Webhooks

Make sure to temporarily disable any publish webhooks (e.g. Netlify) because this is gonna do a lot of publishing.

### Globally installed

- [Yarn](https://yarnpkg.com)
- [Contentful CLI](https://github.com/contentful/contentful-cli) (Logged in)

### Contentful Content Types

Assumes the following content types are already created in Contentful:

#### Person: `person`

For best results, create Persons with matching names so posts authors in the two systems can be matched up and attributions preserved. Otherwise, the fallback Person ID will be used.

#### Blog Post: `blogPost`

See fields in source

### Contentful Content Management API

Contentful CMA tokens have access to all environments for migration purposes so make sure to double-check the relevant config var to see which is being targeted.

- [Personal Access Token](https://www.contentful.com/developers/docs/references/content-management-api/#/reference/personal-access-tokens)

### WP Users API route

The `/wp-json/wp/v2/users` should return a paginated list of users, if it does not and returns an error like the one below (via Wordfence) it will need to be enabled before the author tasks can run effectively:

```json
{
  "code": "rest_user_cannot_view",
  "message": "Sorry, you are not allowed to list users.",
  "data": {
    "status": 401
  }
}
```

---

## ⚙️ Config

Values required for all of the variables below, or the test config (first) task will throw.

```sh
# Base URL for API requests
WP_API_URL="https://website.com/wp-json/wp/v2"

# WP returns absolute URLS, we use relative
REDIRECT_BASE_URL="https://website.com"

# Generated in web app interface
CONTENTFUL_CMA_TOKEN="[token]"

# Go to Project's Settings > General Settings
CONTENTFUL_SPACE_ID="[space-id]"

# Sandbox environment name, or master
CONTENTFUL_ENV_NAME="[staging]"

# Default locale (in my case "en-US")
CONTENTFUL_LOCALE="[locale]"

# "Person" ID used when a match cant be found
# comparing WP User to CF Person names (post
# author attribution)
CONTENTFUL_FALLBACK_USER_ID="[id]"
```

---

## 🙏 Cite

Lots of inspiration from [this article](https://hoverbaum.net/2018/03/22/wordpress-to-contentful-migration/) and linked gists, it inspired the general approach and some of the of code is used directly.

---

## ☑️ Goals

- [ ] Replace Listr with Ink static & dynamic logging
- [ ] Optional, incremental steps
- [ ] Multi-phase approach
  1. Migrate content to sandbox env
  1. Export structure/content using CF Migration CLI
  1. Use CF tooling to migrate content into master
