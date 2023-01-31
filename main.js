"use strict";

// ISS location tracker

/*
 * APIs used:
 * Open Notify
 * OpenWeather
 * OpenCage
 */

// Ask user for API key
// *
// *
// My API key: f2ac3bcb078fdfa4423ad86f0e434739
// const api_key = prompt(
//   "Enter a valid OpenWeather API key:"
// );

// TODO
// Error to handle:
// Uncaught (in promise) TypeError: waterData.results[0] is undefined
// ISSlocation http://127.0.0.1:5500/ISS/main.js:93
// async* http://127.0.0.1:5500/ISS/main.js:159

const openweatherKey = "f2ac3bcb078fdfa4423ad86f0e434739";
const opencageKey = "c3ea0f9d48bb420fad5b29b32ef6529f";

let trackISS = false; // global var to be toggled to lock on and follow ISS movement

// Initializes the map
const map = L.map("map");
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

// Initializes Map View
const initializeMap = async (map) => {
  const res = await fetch("http://api.open-notify.org/iss-now.json");
  const data = await res.json();
  map.setView([data.iss_position.latitude, data.iss_position.longitude], 6);
};

// ISS icon
const ISSicon = L.icon({
  iconUrl: "./img/iss.png",
  iconSize: [50, 50],
});

// || FUNCTION || Makes api calls and updates ISS position on map
const ISSlocation = async () => {
  // Request Handling
  const res = await fetch("http://api.open-notify.org/iss-now.json"); // returns a Response object
  const data = await res.json(); // turns Response object's 'body' into a JSON object
  const coordinates = [data.iss_position.latitude, data.iss_position.longitude];
  const locationRes = await fetch(
    `http://api.openweathermap.org/geo/1.0/reverse?lat=${data.iss_position.latitude}&lon=${data.iss_position.longitude}&limit=5&appid=${openweatherKey}`
  );
  const geodata = await locationRes.json();

  // Visual components
  const currentMarker = L.marker(coordinates, { icon: ISSicon });
  const circle = L.circle(coordinates, {
    color: "blue",
    fillColor: "blue",
    radius: 10000,
  });

  // Popup messages + marker update functions
  let water;
  let US_msg;
  let msg;

  // fetches country codes from countries.json file
  const codes__res = await fetch("countries.json");
  const countryCodes = await codes__res.json();

  // returns country name after matching its code
  const findCountry = (arr, countryCode) => {
    console.log(arr);
    console.log(countryCode);
    for (let obj of arr) {
      if (obj.code === countryCode) {
        return obj.name;
      } else {
        continue;
      }
    }
  };

  if (geodata.length != 0) {
    const countryName = findCountry(countryCodes, geodata[0].country);
    if (geodata[0].state) {
      US_msg = `${geodata[0].state}, ${countryName}\n${geodata[0].name}`;
    }
    msg = `${geodata[0].name}, ${countryName}`;
  }
  const placeMarker = (popup) => {
    currentMarker.addTo(map).bindPopup(popup);
  };
  const replaceWithCircle = (popup) => {
    circle.addTo(map).bindPopup(popup);
    map.removeLayer(currentMarker);
  };

  // Marker updates on location changes
  // handler for when above water
  if (geodata.length === 0) {
    const waterRes = await fetch(
      `https://api.opencagedata.com/geocode/v1/json?q=${data.iss_position.latitude}+${data.iss_position.longitude}&key=${opencageKey}`
    );
    const waterData = await waterRes.json();
    water = waterData.results[0].components.body_of_water;
    placeMarker(water);
    setTimeout(() => {
      replaceWithCircle(water);
    }, 10000);
    // handler for when above United States
  } else if (geodata[0].state && geodata[0].country === "US") {
    placeMarker(US_msg);
    setTimeout(() => {
      replaceWithCircle(US_msg);
    }, 10000);
    // handler for when above everything else
  } else {
    placeMarker(msg);
    setTimeout(() => {
      replaceWithCircle(msg);
    }, 10000);
  }

  // Updates marker focus with each coordinate change
  // map.setView(coordinates, 6);

  // console logs
  // handles cases when ISS is over water
  try {
    const location = `${geodata[0].name}, ${countryName}`;
    console.log(location, coordinates);
  } catch {
    console.log(`ISS is above the ${water}! 🌊 `, coordinates);
  }
  return [data.iss_position.latitude, data.iss_position.longitude];
};
// || FUNCTION END ||

// Event Handlers
const recenter__BTN = document.querySelector(".recenterBTN");
recenter__BTN.addEventListener("click", () => {
  initializeMap(map);
});

const toggleTracking__BTN = document.querySelector(".trackingBTN");
toggleTracking__BTN.addEventListener("click", () => {
  trackISS = true ? !trackISS : (trackISS = false);
  if (trackISS) {
    toggleTracking__BTN.style.backgroundColor = "limegreen";
  } else {
    toggleTracking__BTN.style.backgroundColor = "#141414";
  }
  console.log(toggleTracking__BTN.style.backgroundColor);
});

toggleTracking__BTN.addEventListener("mouseover", () => {
  if (toggleTracking__BTN.style.backgroundColor == "#141414") {
    toggleTracking__BTN.style.backgroundColor = "#3d3d3d";
    console.log("mouseover!");
  }
});

toggleTracking__BTN.addEventListener("mouseout", () => {
  if (toggleTracking__BTN.style.backgroundColor != "limegreen") {
    toggleTracking__BTN.style.backgroundColor = "#141414";
  }
});

// Program Loop
initializeMap(map);
ISSlocation();
setInterval(() => {
  if (trackISS) {
    initializeMap(map);
  }
  ISSlocation();
}, 10000);
