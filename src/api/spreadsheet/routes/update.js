const multer = require("@koa/multer");
const os = require("os");

const upload = multer();

module.exports = {
  routes: [
    {
      method: "POST",
      path: "/sheet/add",
      handler: "update.index",
      config: {
        auth: false,
      },
    },
    {
      method: "POST",
      path: "/drive/upload",
      handler: "update.upload",
      config: {
        auth: false,
        // middlewares: [
        //   upload.single("file")
        // ],
      },
    },
  ],
};
