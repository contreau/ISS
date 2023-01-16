// ISS location tracker

/*
 * APIs used:
 * Open Notify
 * OpenWeather ()
 * OpenCage
 */

// Ask user for API key
// *
// *
// My API key: f2ac3bcb078fdfa4423ad86f0e434739
// const api_key = prompt(
//   "Enter a valid OpenWeather API key:"
// );

const openweatherKey = "f2ac3bcb078fdfa4423ad86f0e434739";
const opencageKey = "c3ea0f9d48bb420fad5b29b32ef6529f";

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

  if (geodata.length != 0) {
    if (geodata[0].state) {
      US_msg = `${geodata[0].state}, ${geodata[0].country}\n${geodata[0].name}`;
    }
    msg = `${geodata[0].name}, ${geodata[0].country}`;
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
    const location = `${geodata[0].name}, ${geodata[0].country}`;
    console.log(location, coordinates);
  } catch {
    console.log(`ISS is above the ${water}! 🌊 `, coordinates);
  }
  return [data.iss_position.latitude, data.iss_position.longitude];
};
// || FUNCTION END ||

// map.on("zoomstart", () => {
//   console.log("zooming!");
// });

// Program Loop
initializeMap(map);
ISSlocation();
setInterval(() => {
  ISSlocation();
}, 10000);
