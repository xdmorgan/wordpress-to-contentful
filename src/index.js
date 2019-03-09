require("dotenv").config();

const execa = require("execa");
const Listr = require("listr");

const testConfig = require("./setup/test-config");
const cleanDist = require("./setup/clean-dist");
const downloadPosts = require("./wordpress/download-posts");
const transformPosts = require("./wordpress/transform-posts");

const tasks = new Listr([
  {
    title: "Test Environment Config",
    task: () => testConfig()
  },
  {
    title: "Clean Destination Folder",
    task: () => cleanDist()
  },
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
  }
]);

tasks.run().catch(err => console.error(err));
