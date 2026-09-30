// Static data for the simulation. All attacks are randomly generated - none of this is live traffic.

const ATTACK_TYPES = [
  { id: "ddos", name: "DDoS", color: "#ff3b5c", ports: [80, 443, 53, 123], weight: 30 },
  { id: "malware", name: "Malware", color: "#ffb020", ports: [445, 135, 4444, 8080], weight: 20 },
  { id: "phishing", name: "Phishing", color: "#39d0ff", ports: [25, 587, 443], weight: 18 },
  { id: "bruteforce", name: "Brute Force", color: "#a970ff", ports: [22, 3389, 21, 23], weight: 17 },
  { id: "ransomware", name: "Ransomware", color: "#ff6ad5", ports: [445, 3389, 139], weight: 8 },
  { id: "sqli", name: "SQL Injection", color: "#3dffa2", ports: [80, 443, 3306, 1433], weight: 7 },
];

// `map` is the country name used in the world-atlas TopoJSON, so hits can color the right shape.
// `src` / `dst` are relative weights for how often a city launches / receives an attack.
const LOCATIONS = [
  { city: "Washington", country: "USA", map: "United States of America", lat: 38.9, lon: -77.04, src: 8, dst: 20 },
  { city: "San Francisco", country: "USA", map: "United States of America", lat: 37.77, lon: -122.42, src: 5, dst: 14 },
  { city: "New York", country: "USA", map: "United States of America", lat: 40.71, lon: -74.01, src: 5, dst: 16 },
  { city: "Toronto", country: "Canada", map: "Canada", lat: 43.65, lon: -79.38, src: 2, dst: 6 },
  { city: "Mexico City", country: "Mexico", map: "Mexico", lat: 19.43, lon: -99.13, src: 3, dst: 4 },
  { city: "São Paulo", country: "Brazil", map: "Brazil", lat: -23.55, lon: -46.63, src: 7, dst: 6 },
  { city: "Buenos Aires", country: "Argentina", map: "Argentina", lat: -34.6, lon: -58.38, src: 2, dst: 3 },
  { city: "London", country: "UK", map: "United Kingdom", lat: 51.51, lon: -0.13, src: 4, dst: 12 },
  { city: "Paris", country: "France", map: "France", lat: 48.86, lon: 2.35, src: 3, dst: 8 },
  { city: "Frankfurt", country: "Germany", map: "Germany", lat: 50.11, lon: 8.68, src: 5, dst: 10 },
  { city: "Amsterdam", country: "Netherlands", map: "Netherlands", lat: 52.37, lon: 4.9, src: 6, dst: 6 },
  { city: "Madrid", country: "Spain", map: "Spain", lat: 40.42, lon: -3.7, src: 2, dst: 4 },
  { city: "Rome", country: "Italy", map: "Italy", lat: 41.9, lon: 12.5, src: 2, dst: 4 },
  { city: "Stockholm", country: "Sweden", map: "Sweden", lat: 59.33, lon: 18.07, src: 1, dst: 3 },
  { city: "Warsaw", country: "Poland", map: "Poland", lat: 52.23, lon: 21.01, src: 2, dst: 4 },
  { city: "Bucharest", country: "Romania", map: "Romania", lat: 44.43, lon: 26.1, src: 5, dst: 2 },
  { city: "Kyiv", country: "Ukraine", map: "Ukraine", lat: 50.45, lon: 30.52, src: 4, dst: 7 },
  { city: "Moscow", country: "Russia", map: "Russia", lat: 55.76, lon: 37.62, src: 16, dst: 5 },
  { city: "Istanbul", country: "Turkey", map: "Turkey", lat: 41.01, lon: 28.98, src: 4, dst: 5 },
  { city: "Ankara", country: "Turkey", map: "Turkey", lat: 39.93, lon: 32.86, src: 2, dst: 4 },
  { city: "Tel Aviv", country: "Israel", map: "Israel", lat: 32.09, lon: 34.78, src: 3, dst: 5 },
  { city: "Tehran", country: "Iran", map: "Iran", lat: 35.69, lon: 51.39, src: 7, dst: 3 },
  { city: "Riyadh", country: "Saudi Arabia", map: "Saudi Arabia", lat: 24.71, lon: 46.68, src: 1, dst: 5 },
  { city: "Dubai", country: "UAE", map: "United Arab Emirates", lat: 25.2, lon: 55.27, src: 1, dst: 5 },
  { city: "Cairo", country: "Egypt", map: "Egypt", lat: 30.04, lon: 31.24, src: 2, dst: 2 },
  { city: "Lagos", country: "Nigeria", map: "Nigeria", lat: 6.52, lon: 3.38, src: 5, dst: 2 },
  { city: "Johannesburg", country: "South Africa", map: "South Africa", lat: -26.2, lon: 28.05, src: 2, dst: 3 },
  { city: "Karachi", country: "Pakistan", map: "Pakistan", lat: 24.86, lon: 67.0, src: 3, dst: 2 },
  { city: "Mumbai", country: "India", map: "India", lat: 19.08, lon: 72.88, src: 6, dst: 8 },
  { city: "Beijing", country: "China", map: "China", lat: 39.9, lon: 116.41, src: 15, dst: 7 },
  { city: "Shanghai", country: "China", map: "China", lat: 31.23, lon: 121.47, src: 9, dst: 5 },
  { city: "Pyongyang", country: "North Korea", map: "North Korea", lat: 39.04, lon: 125.76, src: 6, dst: 1 },
  { city: "Seoul", country: "South Korea", map: "South Korea", lat: 37.57, lon: 126.98, src: 2, dst: 7 },
  { city: "Tokyo", country: "Japan", map: "Japan", lat: 35.68, lon: 139.69, src: 2, dst: 9 },
  { city: "Hanoi", country: "Vietnam", map: "Vietnam", lat: 21.03, lon: 105.85, src: 5, dst: 2 },
  { city: "Singapore", country: "Singapore", map: null, lat: 1.35, lon: 103.82, src: 2, dst: 6 },
  { city: "Jakarta", country: "Indonesia", map: "Indonesia", lat: -6.21, lon: 106.85, src: 4, dst: 3 },
  { city: "Sydney", country: "Australia", map: "Australia", lat: -33.87, lon: 151.21, src: 1, dst: 6 },
];

if (typeof module !== "undefined") module.exports = { ATTACK_TYPES, LOCATIONS };
