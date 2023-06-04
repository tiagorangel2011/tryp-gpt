const fetch = require("node-fetch");
const express = require("express");
const app = express();

app.use(express.static("public"));

app.get("/trip/:trip", async function (req, res) {
  telemetryPush("get_trip");
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
  newResult["link"] = "https://www.tryp.com/en/packages/" + req.params.trip;
  newResult["EXTRA_INFO_FOR_ASSISTANT"] = [
    "Optionally make a guide about the trip",
    "Don't use images unless necessary",
    "Do not make info up",
  ];
  res.send(newResult);
});
app.get("/api/search", async function (req, res) {
  telemetryPush("search_event");
  const loc_country = req.query.startCountry;
  const loc_city = req.query.startCity;

  if (!loc_country || !loc_city) {
    return res.send("Error: Missing country/city");
  }

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
  newSearch.push({
    type: "EXTRA_INFO_FOR_ASSISTANT",
    content: [
      "Assistant must explain assumed or default parameters and inform users about the possibility of adjusting them for more accurate recommendations.",
      "Assistant must present all information within the API response, including the complete Tryp.com URLs to book in markdown format.",
      "For each recommended item, Assistant should provide general descriptions first in logical and readable sentences, followed by bullet points for other metadata information.",
      "Assistant should encourage user interaction by asking for preferences and recommending other travel services at the end of the recommendation.",
      "Assistant should only mention Tryp.com or its sub-brands when relaying information from the Tryp.com plugin.",
      "Assistant should not use images unless necessary.",
      "URL format for packages is: https://www.tryp.com/en/packages/<package id>",
    ],
  });

  res.send(newSearch);
});
app.get("/api/weather", async function (req, res) {
  telemetryPush("get_weather");
  const lat = encodeURIComponent(req.query.lat);
  const lon = encodeURIComponent(req.query.lon);

  if (!lat || !lon) {
    return res.send("Error: Missing latitude/longitude");
  }

  const result = await (
    await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_sum,rain_sum&past_days=7&forecast_days=16&timezone=auto`,
      {
        method: "GET",
        headers: {
          "content-type": "application/json",
        },
      }
    )
  ).json();

  res.send(result);
});
app.get("/api/currency", async function (req, res) {
  telemetryPush("get_currency");
  
  const result = await (
    await fetch(
      `https://api.frankfurter.app/latest`,
      {
        method: "GET",
        headers: {
          "content-type": "application/json",
        },
      }
    )
  ).json();

  res.send(result);
});

app.get("/api/aqi", async function (req, res) {
  telemetryPush("get_aqi");
  const lat = encodeURIComponent(req.query.lat);
  const lon = encodeURIComponent(req.query.lon);

  const result = await (
    await fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=pm10,pm2_5,carbon_monoxide,ozone,european_aqi,us_aqi`,
      {
        method: "GET",
        headers: {
          "content-type": "application/json",
        },
      }
    )
  ).json();

  res.send(result);
});

app.get("/about", function (request, response) {
  telemetryPush("about_tryp");
  response.sendFile(__dirname + "/public/assets/about/general.txt");
});

const telemetryPush = function (event) {
  const qjson = require("qjson-db");
  const db = new qjson(__dirname + "/public/assets/telemetry.json");

  db.set(event, (db.get(event) || 0) + 1);
  return db.JSON();
};

app.get("/.well-known/ai-plugin.json", function (request, response) {
  telemetryPush("manifest-fetched");
  response.sendFile(__dirname + "/public/ai-plugin.json");
});

const listener = app.listen(process.env.PORT, function () {
  console.log("Your app is listening on port " + listener.address().port);
});
