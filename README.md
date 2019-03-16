# WordPress to Contentful

## 🚀 Usage

1. Read Prerequisites section
1. `yarn start`

---

## ⚠️ Prerequisites

### Globally installed

- [Yarn](https://yarnpkg.com)
- [Contentful CLI](https://github.com/contentful/contentful-cli) (Logged in)

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

## ☑️ Goals

- [ ] Replace Listr progress with Ink
- [ ] Optional, incremental steps
