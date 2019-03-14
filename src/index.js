const execa = require("execa");
const Listr = require("listr");

const testConfig = require("./setup/test-config");
const cleanDist = require("./setup/clean-dist");
const downloadUsers = require("./wordpress/user-download");
const downloadPosts = require("./wordpress/post-download");
const transformPosts = require("./wordpress/post-transform");
const createAssetList = require("./wordpress/create-asset-list");
const createClient = require("./contentful/create-client");
const uploadAssets = require("./contentful/upload-assets");
const matchAuthorTypes = require("./contentful/match-author-types");
const createBlogPosts = require("./contentful/create-blog-posts");

const tasks = new Listr([
  {
    title: "Setup & Pre-flight checks",
    task: () => {
      return new Listr([
        {
          title: "Check env config",
          task: () => testConfig()
        },
        {
          title: "Clean destination folder",
          task: () => cleanDist()
        }
      ]);
    }
  },
  {
    title: "WordPress export: Users",
    task: () => {
      return new Listr([
        {
          title: "Download raw JSON",
          task: () => downloadUsers()
        }
      ]);
    }
  },
  {
    title: "WordPress export: Posts",
    task: () => {
      return new Listr([
        {
          title: "Download raw JSON",
          task: () => downloadPosts()
        },
        {
          title: "Transform into Contentful format",
          task: () => transformPosts()
        },
        {
          title: "Create list of assets",
          task: () => createAssetList()
        }
      ]);
    }
  },
  {
    title: "Contentful import",
    task: () => {
      return new Listr([
        // {
        //   title: "Create Content Management API Client",
        //   task: () => createClient()
        // },
        {
          title: "Upload assets",
          task: () => createClient().then(uploadAssets)
        },
        {
          title: "Match WP 'User' to Contentful 'Person'",
          task: () => createClient().then(matchAuthorTypes)
        },
        {
          title: "Create Posts",
          task: () => createClient().then(createBlogPosts)
        }
      ]);
    }
  }
]);

tasks.run().catch(err => console.error(err));
