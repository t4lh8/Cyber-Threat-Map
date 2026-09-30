// Renders the world map (SVG), animates attacks (canvas) and updates the dashboard panels.

const WORLD_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const IMPACT_MS = 900;
const FEED_LIMIT = 14;
const PANEL_REFRESH_MS = 400;

const wrap = document.getElementById("map-wrap");
const svg = d3.select("#map");
const canvas = document.getElementById("fx");
const ctx = canvas.getContext("2d");
const tooltip = document.getElementById("tooltip");

const projection = d3.geoNaturalEarth1();
const pathGen = d3.geoPath(projection);
const heatColor = d3.interpolateRgb("#0f1c2e", "#6b1530");

let countries = [];
let width = 0;
let height = 0;

const state = {
  attacks: [],
  nextId: 1,
  total: 0,
  simTime: 0,
  nextSpawn: 300,
  paused: false,
  speed: 1,
  hiddenTypes: new Set(),
  launchTimes: [],
  byType: {},
  bySource: {},
  byTarget: {},
  hitsByMap: {},
  launchedByMap: {},
};

// ---------- Map ----------

async function loadMap() {
  try {
    const topo = await d3.json(WORLD_URL);
    countries = topojson.feature(topo, topo.objects.countries).features
      .filter((f) => f.properties.name !== "Antarctica");
  } catch (err) {
    document.getElementById("map-error").hidden = false;
  }
  resize();
}

function resize() {
  width = wrap.clientWidth;
  height = wrap.clientHeight;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const fitTarget = countries.length
    ? { type: "FeatureCollection", features: countries }
    : { type: "Sphere" };
  projection.fitExtent([[12, 12], [width - 12, height - 12]], fitTarget);
  svg.attr("viewBox", `0 0 ${width} ${height}`);
  drawMap();
}

function drawMap() {
  svg.selectAll("path.graticule")
    .data([d3.geoGraticule10()])
    .join("path")
    .attr("class", "graticule")
    .attr("d", pathGen);

  svg.selectAll("path.country")
    .data(countries)
    .join("path")
    .attr("class", "country")
    .attr("d", pathGen)
    .on("mousemove", showTooltip)
    .on("mouseleave", () => (tooltip.hidden = true));

  svg.selectAll("circle.city")
    .data(LOCATIONS)
    .join("circle")
    .attr("class", "city")
    .attr("r", 1.8)
    .attr("cx", (d) => projection([d.lon, d.lat])[0])
    .attr("cy", (d) => projection([d.lon, d.lat])[1]);

  updateHeat();
}

function updateHeat() {
  const max = Math.max(1, ...Object.values(state.hitsByMap));
  svg.selectAll("path.country").style("fill", (d) => {
    const hits = state.hitsByMap[d.properties.name];
    return hits ? heatColor(0.25 + 0.75 * (hits / max)) : null;
  });
}

function showTooltip(event, d) {
  const name = d.properties.name;
  const [x, y] = d3.pointer(event, wrap);
  tooltip.innerHTML = "";
  const title = document.createElement("strong");
  title.textContent = name;
  tooltip.append(title,
    document.createElement("br"), `Attacks received: ${state.hitsByMap[name] || 0}`,
    document.createElement("br"), `Attacks launched: ${state.launchedByMap[name] || 0}`);
  tooltip.hidden = false;
  const flip = x > width - 200;
  tooltip.style.left = `${flip ? x - tooltip.offsetWidth - 14 : x + 14}px`;
  tooltip.style.top = `${y + 14}px`;
}

// ---------- Simulation ----------

function launch() {
  const types = ATTACK_TYPES.filter((t) => !state.hiddenTypes.has(t.id));
  if (!types.length) return;
  const attack = createAttack(types, LOCATIONS, state.nextId++);
  attack.start = state.simTime;
  attack.flight = 1300 + Math.random() * 900;
  attack.hit = false;
  state.attacks.push(attack);

  state.total++;
  state.launchTimes.push(state.simTime);
  state.byType[attack.type.id] = (state.byType[attack.type.id] || 0) + 1;
  state.bySource[attack.src.country] = (state.bySource[attack.src.country] || 0) + 1;
  state.byTarget[attack.dst.country] = (state.byTarget[attack.dst.country] || 0) + 1;
  if (attack.src.map) state.launchedByMap[attack.src.map] = (state.launchedByMap[attack.src.map] || 0) + 1;
  addFeedRow(attack);
}

function onHit(attack) {
  attack.hit = true;
  if (attack.dst.map) {
    state.hitsByMap[attack.dst.map] = (state.hitsByMap[attack.dst.map] || 0) + 1;
    updateHeat();
  }
}

// Point on a quadratic Bezier curve that bows upward between source and target.
function arcPoint(s, d, t) {
  const dist = Math.hypot(d[0] - s[0], d[1] - s[1]);
  const cx = (s[0] + d[0]) / 2;
  const cy = (s[1] + d[1]) / 2 - dist * 0.35;
  const u = 1 - t;
  return [u * u * s[0] + 2 * u * t * cx + t * t * d[0], u * u * s[1] + 2 * u * t * cy + t * t * d[1]];
}

function ring(x, y, radius, color, alpha, lineWidth = 1.5) {
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
}

function render() {
  ctx.clearRect(0, 0, width, height);
  ctx.lineCap = "round";

  for (const a of state.attacks) {
    const color = a.type.color;
    const s = projection([a.src.lon, a.src.lat]);
    const d = projection([a.dst.lon, a.dst.lat]);
    const age = state.simTime - a.start;
    const p = age / a.flight;

    ctx.shadowColor = color;
    ctx.shadowBlur = 10;

    if (p < 1) {
      // Launch pulse at the source.
      ring(s[0], s[1], 2 + p * 10, color, 1 - p);

      // Fading tail behind the projectile.
      const tailStart = Math.max(0, p - 0.35);
      const steps = 16;
      for (let i = 0; i < steps; i++) {
        const t0 = tailStart + ((p - tailStart) * i) / steps;
        const t1 = tailStart + ((p - tailStart) * (i + 1)) / steps;
        const [x0, y0] = arcPoint(s, d, t0);
        const [x1, y1] = arcPoint(s, d, t1);
        ctx.globalAlpha = (i + 1) / steps;
        ctx.strokeStyle = color;
        ctx.lineWidth = 0.5 + (2 * (i + 1)) / steps;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }

      const [hx, hy] = arcPoint(s, d, p);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(hx, hy, 2.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      if (!a.hit) onHit(a);
      const ip = (age - a.flight) / IMPACT_MS;
      ring(d[0], d[1], 3 + ip * 24, color, 1 - ip, 2);
      ring(d[0], d[1], 2 + ip * 12, color, (1 - ip) * 0.7);
      a.done = ip >= 1;
    }
  }

  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  state.attacks = state.attacks.filter((a) => !a.done);
}

// ---------- Panels ----------

function addFeedRow(attack) {
  const feed = document.getElementById("feed");
  const li = document.createElement("li");

  const row1 = document.createElement("div");
  row1.className = "row1";
  const type = document.createElement("span");
  type.className = "type";
  type.style.color = attack.type.color;
  type.textContent = `■ ${attack.type.name}`;
  const time = document.createElement("span");
  time.className = "time";
  time.textContent = new Date().toLocaleTimeString("en-GB");
  row1.append(type, time);

  const route = document.createElement("div");
  route.className = "route";
  route.textContent = `${attack.src.city}, ${attack.src.country} → ${attack.dst.city}, ${attack.dst.country}`;

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = `src ${attack.ip}  ·  port ${attack.port}`;

  li.append(row1, route, meta);
  feed.prepend(li);
  while (feed.children.length > FEED_LIMIT) feed.lastChild.remove();
}

function renderBars(listId, rows, maxValue) {
  const list = document.getElementById(listId);
  list.replaceChildren(...rows.map(({ label, value, color, key, off }) => {
    const li = document.createElement("li");
    if (key) li.dataset.key = key;
    if (off) li.className = "off";
    const name = document.createElement("span");
    name.className = "label";
    name.textContent = label;
    const track = document.createElement("span");
    track.className = "track";
    const fill = document.createElement("span");
    fill.className = "fill";
    fill.style.display = "block";
    fill.style.width = `${maxValue ? (value / maxValue) * 100 : 0}%`;
    fill.style.background = color;
    track.append(fill);
    const num = document.createElement("span");
    num.className = "num";
    num.textContent = value.toLocaleString();
    li.append(name, track, num);
    return li;
  }));
}

function updatePanels() {
  // Attacks per minute over the last 60 simulated seconds. During the first minute the count is
  // extrapolated, but never from less than 10 seconds of data so early numbers don't spike.
  const windowMs = 60000;
  state.launchTimes = state.launchTimes.filter((t) => t > state.simTime - windowMs);
  const elapsed = Math.min(windowMs, Math.max(10000, state.simTime));
  const rate = Math.round((state.launchTimes.length * windowMs) / elapsed);

  document.getElementById("total").textContent = state.total.toLocaleString();
  document.getElementById("rate").textContent = rate.toLocaleString();
  document.getElementById("active").textContent = state.attacks.filter((a) => !a.hit).length;

  const typeMax = Math.max(0, ...Object.values(state.byType));
  renderBars("types", ATTACK_TYPES.map((t) => ({
    label: t.name, value: state.byType[t.id] || 0, color: t.color, key: t.id, off: state.hiddenTypes.has(t.id),
  })), typeMax);

  const sources = topEntries(state.bySource);
  renderBars("sources", sources.map(([label, value]) => ({ label, value, color: "var(--danger)" })), sources[0]?.[1]);

  const targets = topEntries(state.byTarget);
  renderBars("targets", targets.map(([label, value]) => ({ label, value, color: "var(--accent)" })), targets[0]?.[1]);
}

// ---------- Controls ----------

function togglePause() {
  state.paused = !state.paused;
  document.getElementById("pause").textContent = state.paused ? "▶ Play" : "❚❚ Pause";
}

document.getElementById("pause").addEventListener("click", togglePause);

document.addEventListener("keydown", (e) => {
  if (e.code === "Space" && e.target === document.body) {
    e.preventDefault();
    togglePause();
  }
});

document.querySelectorAll(".speed button").forEach((btn) => {
  btn.addEventListener("click", () => {
    state.speed = Number(btn.dataset.speed);
    document.querySelectorAll(".speed button").forEach((b) => b.classList.toggle("active", b === btn));
  });
});

document.getElementById("types").addEventListener("click", (e) => {
  const key = e.target.closest("li")?.dataset.key;
  if (!key) return;
  if (state.hiddenTypes.has(key)) state.hiddenTypes.delete(key);
  else state.hiddenTypes.add(key);
  updatePanels();
});

window.addEventListener("resize", resize);

// ---------- Main loop ----------

let lastFrame = performance.now();
let lastPanelUpdate = 0;

function frame(now) {
  // Clamp the step so returning to a background tab doesn't fire a burst of attacks.
  const dt = Math.min(100, now - lastFrame);
  lastFrame = now;

  if (!state.paused) {
    state.simTime += dt * state.speed;
    while (state.simTime >= state.nextSpawn) {
      launch();
      state.nextSpawn += 200 + Math.random() * 500;
    }
  }

  render();
  if (now - lastPanelUpdate > PANEL_REFRESH_MS) {
    updatePanels();
    lastPanelUpdate = now;
  }
  requestAnimationFrame(frame);
}

loadMap();
updatePanels();
requestAnimationFrame(frame);
