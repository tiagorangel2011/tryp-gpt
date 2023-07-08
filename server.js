const fetch = require("node-fetch");
const express = require("express");
const HOST_URL = "tryp-gpt.glitch.me";
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
          "user-id": getUserID(),
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
  try {
    var result = await (
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
  } catch {
    const ddg = require("duck-duck-scrape");
    var result = await ddg.forecast(`${lat}, ${lon}`);
  }

  res.send(result);
});
app.get("/api/currency", async function (req, res) {
  telemetryPush("get_currency");

  const result = await (
    await fetch(`https://api.frankfurter.app/latest`, {
      method: "GET",
      headers: {
        "content-type": "application/json",
      },
    })
  ).json();

  res.send(result);
});
app.get("/api/web", async function (req, res) {
  telemetryPush("web");

  const ddg = require("duck-duck-scrape");
  var request = req.query.type;
  var query = req.query.q;
  if (
    !(request == "search") &&
    !(request == "news") &&
    !(request == "forecast") &&
    !(request == "time")
  ) {
    res.send(
      "Error: Request must be either 'search', 'news', 'forecast' or 'time'"
    );
  }
  if (!query) {
    res.send("Error: Invalid query parameter");
  }

  if (request == "search") {
    var result = await ddg.search(query, {
      safeSearch: ddg.SafeSearchType.STRICT,
    });
  }
  if (request == "news") {
    var result = await ddg.searchNews(query, {
      safeSearch: ddg.SafeSearchType.STRICT,
    });
  }
  if (request == "forecast") {
    var result = await ddg.forecast(query);
  }
  if (request == "time") {
    var result = await ddg.time(query);
  }
  result["DISCLAIMER"] =
    "This results are search results from the web. Tryp.com is not responsable for anything inside them.";
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
app.get("/api/map", async function (req, res) {
  const spn = encodeURIComponent(req.query.spn);
  const center = encodeURIComponent(req.query.center);
  var annotations = encodeURIComponent(req.query.annotations);
  if (!annotations || annotations == "null" || annotations == "undefined") {
    annotations = "[]";
  }
  telemetryPush("create-map");
  res.send({
    status: "OK",
    map: {
      markdown: `![Map](https://${HOST_URL}/api/map.png?spn=${spn}&center=${center}&annotations=${annotations})`,
      url: `https://${HOST_URL}/api/map.png?spn=${spn}&center=${center}&annotations=${annotations}`,
    },
    details: {
      spn: spn,
      center: center,
      annotations: annotations,
    },
  });
});
app.get("/api/map.png", async function (req, res) {
  const spn = encodeURIComponent(req.query.spn);
  const center = encodeURIComponent(req.query.center);
  var annotations = encodeURIComponent(req.query.annotations);
  if (!annotations || annotations == "null" || annotations == "undefined") {
    annotations = "[]";
  }

  const response = await fetch(
    `https://external-content.duckduckgo.com/ssv2/?scale=2&lang=en&colorScheme=light&format=png&size=400x300&spn=${spn}&center=${center}&annotations=${annotations}`
  );
  if (!response.ok) {
    return res.send("Error: Failed to fetch image. Please check parameters.");
  }

  const contentType = response.headers.get("content-type");
  res.set("Content-Type", contentType);
  response.body.pipe(res);
  telemetryPush("view_map");
});
app.get("/api/subscribe", async function (req, res) {
  const email = req.query.email.trim();

  if (!email || !email.includes("@") || !email.includes(".")) {
    res.send({ status: "err", message: "Invalid or missing email" });
    return;
  }

  fetch(
    `https://0sc7coilmb.execute-api.eu-central-1.amazonaws.com/prod?email=${email}&event_type=subscribe&user_currency=EUR&location=CHATGPT`,
    {
      method: "POST",
      headers: {
        "x-api-key": process.env.TOKEN,
        "user-id": getUserID(),
      },
    }
  );

  res.send({
    status: "ok",
    message:
      "Done! You have been successfully subscribed to the Tryp.com newsletter. Thank you for subscribing.",
  });
});
app.get("/api/manage_booking", async function (req, res) {
  const id = req.query.id;
  const email = req.query.email;
  if (!id || !email) {
    return res.send({
      status: "error",
      message: "Invalid booking ID or email",
    });
  }
  telemetryPush("manage_booking");
  const options = {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.TOKEN,
      "user-id": getUserID(),
    },
    body: JSON.stringify({ purchase_id: id, email: email }),
  };
  

  var data = await (
    await fetch(
      "https://juuwx2ncp1.execute-api.eu-central-1.amazonaws.com/prod/get_booking",
      options
    )
  ).json();

  data = { PACKAGE: data };

  data.VIEW_MORE_LINK = `https://www.tryp.com/en/manage-booking?email=${encodeURIComponent(
    email
  )}&bid=${id}`;
  data.WARNING_FOR_USER = `Do NOT share your email/booking ID pair with anyone, as it allows access to your package.`;
  data.INSTRUCTIONS_FOR_AI = [
    "1. Present the info above in a detailed but organized format",
    "2. Use markdown and it's elements to format the data",
    "3. Do not provide excessive data, except when asked",
  ];

  res.send(data);
});
app.get("/about", function (request, response) {
  telemetryPush("about_tryp");
  response.sendFile(__dirname + "/public/assets/about/general.txt");
});

const telemetryPush = function (event) {
  const qjson = require("qjson-db");
  const db = new qjson(__dirname + "/.data/telemetry.json");

  db.set(event, (db.get(event) || 0) + 1);
  return db.JSON();
};
const getUserID = function () {
  function makeid(length) {
   var result           = '';
   var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
   var charactersLength = characters.length;
   for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return result;
}
  return `CHATGPT-PLUGIN-${makeid(4)}-${makeid(4)}-${makeid(11)}`
}

app.get("/.well-known/ai-plugin.json", function (request, response) {
  telemetryPush("manifest-fetched");
  response.sendFile(__dirname + "/public/ai-plugin.json");
});

const listener = app.listen(process.env.PORT, function () {
  console.log("Your app is listening on port " + listener.address().port);
});
