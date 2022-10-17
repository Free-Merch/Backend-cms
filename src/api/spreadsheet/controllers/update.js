// path: ./src/api/hello/controllers/hello.js
const { GoogleSpreadsheet } = require("google-spreadsheet");
const { google } = require("googleapis");
resolve = require("path").resolve;
const fs = require("fs");
const { title } = require("process");

const scopes = ["https://www.googleapis.com/auth/drive"];
const auth = new google.auth.JWT(
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  null,
  process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  scopes
);
const drive = google.drive({ version: "v3", auth });

module.exports = {
  async index(ctx, next) {
    console.log(ctx.origin);
    // if(process.env.NODE_ENV !== "development" && 
    //   (ctx.origin !== "https://freemerch.io" || ctx.origin !== "https://freemerch.vercel.app")){
    //   ctx.throw(401)
    //   return;
    // }

    
    const { id, title } = ctx.request.query;
    const row = ctx.request.body;
    const doc = new GoogleSpreadsheet(id);
    await doc.useServiceAccountAuth({
      // env var values are copied from service account credentials generated by google
      // see "Authentication" section in docs for more info
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    });

    try{
      await doc.loadInfo(); // loads document properties and worksheets
      const sheet = doc.sheetsByTitle[title];
      if(!sheet) throw(Error("Invalid sheet title"))

      await sheet.loadHeaderRow();
      sheet.headerValues.forEach(header => {
        if(!row[header]){
          ctx.throw(400, "Missing "+header)
          return
        }
      })

      await sheet.addRow(row);
      ctx.status = 200;
      ctx.message= "campaign entry saved";
    }catch(err){
      console.log("error occured")
      ctx.throw(400, err.message)
    }
  },

  async upload(ctx, next) {
    console.log(ctx.origin, ctx.request.origin, ctx.req?.origin);
    // if (
    //   process.env.NODE_ENV !== "development" &&
    //   ( ctx.origin !== "https://freemerch.io" ||
    //    ctx.origin !== "https://freemerch.vercel.app" )
    // ) {
    //   ctx.throw(401);
    //   return;
    // }

    const { id, name } = ctx.request.query;

    list = await drive.files.list({
      q: "mimeType=\'application/vnd.google-apps.folder\'",
    });
    let present = false;
    const driveFolders = list.data.files;

    for(let i = 0; i < driveFolders.length; i++ ){
      if (id === driveFolders[i].id) {
        present = true;
        break;
      }
    }
    if(!present){
      ctx.throw(400, "Invalid id")
      return;
    }

    const fileMetadata = {
      name: name,
      parents: [id],
    };

    // const media = ctx.request.files.file.path;
    // console.log(ctx.request.files.file.path);
    const media = {
      mimeType: ctx.request.files.file.type,
      body: fs.createReadStream(resolve(ctx.request.files.file.path)),
    };

    try {
      const uploaded = await drive.files.create({
        resource: fileMetadata,
        media: media,
      });

      ctx.status = 200;
      ctx.body = `https://drive.google.com/file/d/${uploaded.data.id}/view?usp=sharing`;
    } catch (err) {
      ctx.throw(400, err.message);
      return;
    }
  }
};
