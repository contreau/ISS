// ISS location tracker

/*
 * APIs used:
 * Open Notify
 * OpenWeather
 *
 */

// Ask user for API key
// *
// *
// My API key: f2ac3bcb078fdfa4423ad86f0e434739
// const api_key = prompt(
//   "Enter a valid OpenWeather API key:"
// );

const api_key = "f2ac3bcb078fdfa4423ad86f0e434739";

// Initializes the map
let map = L.map("map").setView([0, 0], 2);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

// || FUNCTION || Makes api calls and updates ISS position on map
const ISSlocation = async () => {
  const res = await fetch("http://api.open-notify.org/iss-now.json"); // returns a Response object
  const data = await res.json(); // turns Response object's 'body' into a JSON object
  const locationRes = await fetch(
    `http://api.openweathermap.org/geo/1.0/reverse?lat=${data.iss_position.latitude}&lon=${data.iss_position.longitude}&limit=5&appid=${api_key}`
  );
  const geodata = await locationRes.json();

  // leaflet marker
  if (geodata.length === 0) {
    L.marker([data.iss_position.latitude, data.iss_position.longitude])
      .addTo(map)
      .bindPopup("🌊🌊🌊🌊🌊")
      .openPopup();
    // handler for United States
  } else if (geodata[0].state && geodata[0].country === "US") {
    L.marker([data.iss_position.latitude, data.iss_position.longitude])
      .addTo(map)
      .bindPopup(
        `${geodata[0].state}, ${geodata[0].country}\n${geodata[0].name}`
      )
      .openPopup();
  } else {
    L.marker([data.iss_position.latitude, data.iss_position.longitude])
      .addTo(map)
      .bindPopup(`${geodata[0].name}, ${geodata[0].country}`)
      .openPopup();
  }
  // console logs
  // handles cases when ISS is over the ocean (not in a known country's coordinates)
  try {
    const location = `${geodata[0].name}, ${geodata[0].country}`;
    console.log(location);
  } catch {
    console.log("ISS is over the ocean!");
  }
  return [data.iss_position.latitude, data.iss_position.longitude];
};

// Updates Map focus with each
const trackView = async (map) => {
  const coords = await ISSlocation();
  console.log(coords);
  map.setView([coords[0], coords[1]], 5);
};

// Program Loop
ISSlocation();
setInterval(() => {
  ISSlocation();
  trackView(map);
}, 10000);
