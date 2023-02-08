"use strict";

// ISS location tracker

/*
 * APIs used:
 * Where the ISS at?
 * OpenWeather
 * OpenCage
 */

// Global vars
const openweatherKey = "f2ac3bcb078fdfa4423ad86f0e434739";
const opencageKey = "c3ea0f9d48bb420fad5b29b32ef6529f";
let trackISS = false; // to be toggled to lock on and follow ISS movement
let lastKnownLand = "Verifying..."; // Helps handle when water body returns undefined (in a transitionary coordinate between sea & land that the api doesn't know)

// Fetches countries.json on page load
const codes__json = new Promise((res, rej) => {
  fetch("../../assets/countries.json").then((data) => {
    res(data.json());
  });
});
console.log(codes__json);

// DOM nodes
const locationTxt = document.querySelector(".locationTxt");
const mvmntTxt = document.querySelector(".mvmnt");
const distanceTxt = document.querySelector(".distance");

// Initializes the map
const map = L.map("map");
L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
  {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 20,
  }
).addTo(map);

// Initializes Map View
const initializeMap = async (map) => {
  const res = await fetch("https://api.wheretheiss.at/v1/satellites/25544");
  const data = await res.json();
  map.setView([data.latitude, data.longitude], 6);
  initialLat = data.latitude;
  initialLon = data.longitude;
};

// Recenters Map View
const recenterMap = async (map) => {
  const res = await fetch("https://api.wheretheiss.at/v1/satellites/25544");
  const data = await res.json();
  map.setView([data.latitude, data.longitude], map.getZoom());
};

// ISS icon
const ISSicon = L.icon({
  iconUrl: "../assets/img/iss.png",
  iconSize: [50, 50],
});

let initialLat;
let initialLon;

// Calculates distance between coordinates
const distance = function (lat1, lat2, lon1, lon2) {
  lon1 = (lon1 * Math.PI) / 180;
  lon2 = (lon2 * Math.PI) / 180;
  lat1 = (lat1 * Math.PI) / 180;
  lat2 = (lat2 * Math.PI) / 180;

  // Haversine formula
  let dlon = lon2 - lon1;
  let dlat = lat2 - lat1;
  let a =
    Math.pow(Math.sin(dlat / 2), 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin(dlon / 2), 2);

  let c = 2 * Math.asin(Math.sqrt(a));

  // Radius of earth in kilometers. Use 3956
  // for miles
  let r = 6371;
  return Math.floor(c * r);
};

// || FUNCTION || Makes api calls and updates ISS position on map
const ISSlocation = async () => {
  // Request Handling
  const res = await fetch("https://api.wheretheiss.at/v1/satellites/25544"); // returns a Response object
  const data = await res.json(); // turns Response object's 'body' into a JSON object
  const coordinates = [data.latitude, data.longitude];
  const locationRes = await fetch(
    `https://api.openweathermap.org/geo/1.0/reverse?lat=${data.latitude}&lon=${data.longitude}&limit=5&appid=${openweatherKey}`
  );
  const geodata = await locationRes.json();

  // Calculate distance
  distanceTxt.innerText = `~ ${distance(
    initialLat,
    data.latitude,
    initialLon,
    data.longitude
  )} km `;

  // Visual components
  const currentMarker = L.marker(coordinates, { icon: ISSicon });
  const circle = L.circle(coordinates, {
    color: "rgb(194, 44, 44)",
    fillColor: "rgb(194, 44, 44)",
    radius: 10000,
  });

  // Popup messages + marker update functions
  let water;
  let hasState_msg;
  let msg;
  let markerMsg;

  // receives global countries.json object
  const countryCodes = await codes__json;

  // returns country name after matching its code
  const findCountry = (codes, countryCode) => codes[countryCode];

  if (geodata.length != 0) {
    const countryName = findCountry(countryCodes, geodata[0].country);
    if (geodata[0].state) {
      if (geodata[0].state === geodata[0].name) {
        hasState_msg = `${geodata[0].state}, ${countryName}`;
        markerMsg = `${geodata[0].state}, ${countryName}`;
        lastKnownLand = hasState_msg.slice();
      } else {
        if (`${geodata[0].name} ${geodata[0].state}`.length > 20) {
          hasState_msg = `${geodata[0].name}, <br>${geodata[0].state}, ${countryName}`;
        } else {
          hasState_msg = `${geodata[0].name}, ${geodata[0].state}, <br>${countryName}`;
        }
        markerMsg = `${geodata[0].name}, ${geodata[0].state}, ${countryName}`;
        lastKnownLand = hasState_msg.slice();
      }
    }
    msg = `${geodata[0].name}, ${countryName}`;
    lastKnownLand = msg.slice();
  }
  const placeMarker = (popup) => {
    currentMarker.addTo(map).bindPopup(popup);
  };
  const replaceWithCircle = (popup) => {
    circle.addTo(map).bindPopup(popup);
    map.removeLayer(currentMarker);
  };

  // Helpful debug console logs
  // console.log(geodata.length, geodata);
  // console.log("Last known land: ", lastKnownLand);

  // Marker updates on location changes
  // handler for when above water
  if (geodata.length === 0) {
    const waterRes = await fetch(
      `https://api.opencagedata.com/geocode/v1/json?q=${data.latitude}+${data.longitude}&key=${opencageKey}`
    );
    const waterData = await waterRes.json();
    try {
      water = waterData.results[0].components.body_of_water;
    } catch {
      water = lastKnownLand;
    }
    locationTxt.innerText = water;
    placeMarker(water);
    setTimeout(() => {
      replaceWithCircle(water);
    }, 7000);
    // handler for when above United States
  } else if (geodata[0].state) {
    locationTxt.innerHTML = hasState_msg;
    placeMarker(markerMsg);
    setTimeout(() => {
      replaceWithCircle(markerMsg);
    }, 7000);
    // handler for when above everything else
  } else {
    locationTxt.innerText = msg;
    placeMarker(msg);
    setTimeout(() => {
      replaceWithCircle(msg);
    }, 7000);
  }

  // console logs
  try {
    const location = `${geodata[0].name}, ${countryName}`;
    console.log(location, coordinates);
  } catch (err) {
    if (water === undefined) {
      console.log(`ISS is above ${lastKnownLand}!`);
    } else {
      console.log(`ISS is above the ${water}! 🌊 `, coordinates);
    }
  }
  return [data.latitude, data.longitude];
};
// || FUNCTION END ||

// Event Handlers
const recenter__BTN = document.querySelector(".recenterBTN");
recenter__BTN.addEventListener("click", () => {
  recenterMap(map);
});

const toggleTracking__BTN = document.querySelector(".trackingBTN");
toggleTracking__BTN.addEventListener("click", () => {
  trackISS = true ? !trackISS : (trackISS = false);
  if (trackISS) {
    toggleTracking__BTN.style.backgroundColor = "#078343";
    mvmntTxt.innerText = "On";
  } else {
    toggleTracking__BTN.style.backgroundColor = "#141414";
    mvmntTxt.innerText = "Off";
  }
  console.log(toggleTracking__BTN.style.backgroundColor);
});

// Program Loop
initializeMap(map);
ISSlocation();
setInterval(() => {
  if (trackISS) {
    recenterMap(map);
  }
  ISSlocation();
}, 7000);
