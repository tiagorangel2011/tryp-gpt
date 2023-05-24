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
  const loc_country = req.query.startCountry;
  const loc_city = req.query.startCity;

  const locodes = require(__dirname + "/public/assets/locodes.json");
  const locode = locodes.find(
    (item) =>
      item.country_name.toLowerCase() == loc_country.toLowerCase() &&
      item.name.toLowerCase() == loc_city.toLowerCase()
  );

  const params = Object.entries(req.query)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");
  params["initialLocation"] = locode;

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
app.get("/api/weather", async function (req, res) {
  const lat = encodeURIComponent(req.query.lat);
  const lon = encodeURIComponent(req.query.lon);
  
  const result = await (
    await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_sum,rain_sum&past_days=7&forecast_days=16&timezone=auto`,
      {
        method: "GET",
        headers: {
          "content-type": "application/json"
        },
      }
    )
  ).json();

  res.send(result);
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
