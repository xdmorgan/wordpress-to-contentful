require("dotenv").config();

const execa = require("execa");
const Listr = require("listr");

const testConfig = require("./setup/test-config");
const cleanDist = require("./setup/clean-dist");
const downloadUsers = require("./wordpress/user-download");
const downloadPosts = require("./wordpress/post-download");
const transformPosts = require("./wordpress/post-transform");
const createAssetList = require("./wordpress/create-asset-list");

const tasks = new Listr([
  {
    title: "Test environment config",
    task: () => testConfig()
  },
  {
    title: "Clean destination folder",
    task: () => cleanDist()
  },
  // {
  //   title: "Get WordPress Users",
  //   task: () => {
  //     return new Listr([
  //       {
  //         title: "Download raw JSON",
  //         task: () => downloadUsers()
  //       }
  //     ]);
  //   }
  // },
  {
    title: "Get WordPress Posts",
    task: () => {
      return new Listr([
        {
          title: "Download raw JSON",
          task: () => downloadPosts()
        },
        {
          title: "Transform into Contentful format",
          task: () => transformPosts()
        }
      ]);
    }
  },
  {
    title: "Create list of assets",
    task: () => {
      return new Listr([
        {
          title: "Request featured image data and condense post assets",
          task: () => createAssetList()
        }
      ]);
    }
  }
]);

tasks.run().catch(err => console.error(err));
