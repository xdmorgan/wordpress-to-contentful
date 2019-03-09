const execa = require("execa");
const Listr = require("listr");
const config = require("./setup/config");
const clean = require("./setup/clean");

require("dotenv").config();

const tasks = new Listr([
  {
    title: "Test Environment Config",
    task: () => config()
  },
  {
    title: "Clean Destination Folder",
    task: () => clean()
  }
]);

tasks.run().catch(err => {
  console.error(err);
});
