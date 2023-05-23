const fetch = require("node-fetch");
const express = require("express");
const app = express();

app.use(express.static("public"));

app.get("/trip/:trip", async function (req, res) {
  const result = await (
    await fetch(
      "https://5hulox4yxh.execute-api.eu-central-1.amazonaws.com/prod/trip?tripID=" +
        req.params.trip,
      {
        credentials: "omit",
        headers: {
          "user-id": process.env.USER,
          "x-api-key": process.env.TOKEN,
          source: "",
        },
        method: "GET",
      }
    )
  ).json();
  var newResult = JSON.stringify(result);
  newResult = newResult.replace(
    /https:\/\/pictures.tryp.com\/locations\/(\d+)/gm,
    function (a, b, c) {
      return a + "/188160.png#";
    }
  );
  newResult = JSON.parse(newResult);
  res.send(newResult);
});

app.get("/api/search", async function (req, res) {
  const params = Object.entries(req.query)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");

  const result = await (
    await fetch(
      "https://88ziu4wklh.execute-api.eu-central-1.amazonaws.com/prod/trip_suggestions?" +
        params,
      {
        method: "GET",
        headers: {
          "content-type": "application/json",
          "x-api-key": process.env.TOKEN,
        },
      }
    )
  ).json();

  var newSearch = JSON.stringify(result);
  newSearch = newSearch.replace(
    /https:\/\/pictures.tryp.com\/locations\/(\d+)/gm,
    function (a, b, c) {
      return a + "/188160.png#";
    }
  );
  newSearch = JSON.parse(newSearch);

  res.send(newSearch);
});

app.get("/api/locode/", async function (req, res) {
  // get locode
  const country = req.query.country;
  const name = req.query.name;
  const locodes = require(__dirname + "/public/assets/locodes.json");
  console.log(country.toLowerCase(), name.toLowerCase());
  const locode = locodes.find(
    (item) =>
      item.country_name.toLowerCase() == country.toLowerCase() &&
      item.name.toLowerCase() == name.toLowerCase()
  );
  if (!locode) {
    return res.send("Can't find locode. Make sure the country name is in English and the city name is in the country's language.");
  }

  res.send(locode.locode);
});

app.get("/about", function (request, response) {
  response.sendFile(__dirname + "/public/assets/about/general.txt");
});

app.get("/.well-known/ai-plugin.json", function (request, response) {
  response.sendFile(__dirname + "/public/ai-plugin.json");
});

const listener = app.listen(process.env.PORT, function () {
  console.log("Your app is listening on port " + listener.address().port);
});
