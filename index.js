const express = require("express");
const { MongoClient } = require("mongodb");
const { DB_LOGIN, DB_PASSWORD } = process.env;

const dbRef = MongoClient.connect(
  `mongodb://${DB_LOGIN}:${DB_PASSWORD}@ds127190.mlab.com:27190/shortenerdb`
).catch(err => {
  console.err(err);
});

const app = express();

// home page
app.get("/", (req, res) => {
  const host = `${req.protocol}://${req.hostname}`;
  const page = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="ie=edge">
      <link href="https://fonts.googleapis.com/css?family=Open+Sans" rel="stylesheet">
      <title>Free Code Camp :: URL Shortener Microservice</title>
      <style>body {font: 1em "Open Sans"; margin: 40px}</style>
    </head>
    <body>
      <h2>Free Code Camp :: URL Shortener Microservice</h2>
      <hr>
      <h3>How to use:</h3>
      <ul>
        <li>To create a new shortened url pass a url as a parameter: <a href="${
          host
        }/https://www.google.com"><pre>${
    host
  }/https://www.google.com</pre></a></li>
        <li>Pass the shortened url hash as a parameter to go to the url: <a href="${
          host
        }/7owcm"><pre>${host}/7owcm</pre></a></li>
      </ul>
      <h3>Output example:</h3>
      <pre>
      {
        "original": "https://www.google.com",
        "short": "${host}/7owcm"
      }
      </pre>
    </body>
    </html>
  `;
  res.send(page);
});

// shortener
app.get("/*", (req, res) => {
  const url = req.params[0];

  if (isValidUrl(url)) {
    const uid = genUID();

    dbRef.then(db => {
      db
        .collection("links")
        .insertOne({ original: url, short: uid })
        .then(commandResult => {
          const doc = commandResult.ops[0];
          console.log(`The document ${JSON.stringify(doc)} has been created`);
          delete doc._id;
          doc.short = `${req.protocol}://${req.hostname}/${doc.short}`;
          res.send(doc);
        })
        .catch(err => {
          console.error(err);
        });
    });
  } else if (/^\w{5}$/.test(url)) {
    dbRef.then(db => {
      db
        .collection("links")
        .findOne({ short: url }, { original: true, _id: false })
        .then(doc => {
          let { original } = doc;
          if (original.indexOf("http") === -1) original = `http://${original}`;
          res.redirect(original);
        })
        .catch(err => {
          res.send({ error: "There is no such short url in the database" });
        });
    });
  } else {
    return res.send({ error: "The url you provided is not valid" });
  }
});

// url validator
function isValidUrl(url) {
  return (
    typeof url === "string" &&
    /^(?:(?:(?:https?|ftp):)\/\/)?(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})).?)(?::\d{2,5})?(?:[/?#]\S*)?$/.test(
      url
    )
  );
}

// generate unique ID
function genUID() {
  return Math.random()
    .toString(36)
    .slice(2, 7);
}

app.listen(process.env.PORT || 3000);
