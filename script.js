const $ = id => document.getElementById(id);
const CODES = {
  0: ['Clear sky', '☀️', 'clear'], 1: ['Mostly clear', '🌤️', 'clear'], 2: ['Partly cloudy', '⛅', 'cloud'], 3: ['Overcast', '☁️', 'cloud'],
  45: ['Fog', '🌫️', 'cloud'], 48: ['Fog', '🌫️', 'cloud'], 51: ['Light drizzle', '🌦️', 'rain'], 53: ['Drizzle', '🌦️', 'rain'], 55: ['Heavy drizzle', '🌧️', 'rain'],
  61: ['Light rain', '🌧️', 'rain'], 63: ['Rain', '🌧️', 'rain'], 65: ['Heavy rain', '🌧️', 'rain'], 71: ['Light snow', '🌨️', 'snow'], 73: ['Snow', '🌨️', 'snow'],
  75: ['Heavy snow', '❄️', 'snow'], 80: ['Rain showers', '🌦️', 'rain'], 81: ['Rain showers', '🌧️', 'rain'], 82: ['Violent showers', '⛈️', 'rain'],
  95: ['Thunderstorm', '⛈️', 'storm'], 96: ['Thunderstorm, hail', '⛈️', 'storm'], 99: ['Thunderstorm, hail', '⛈️', 'storm']
};
const info = c => CODES[c] || CODES[Object.keys(CODES).filter(k => k <= c).pop()] || CODES[0];
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
let unit = store.get('unit', 'c'), data = null, recent = store.get('recent', []);

const conv = c => unit === 'c' ? Math.round(c) : Math.round(c * 9 / 5 + 32);
const deg = c => conv(c) + '°';

function status(msg, err) { $('status').textContent = msg; $('status').style.color = err ? '#fecaca' : '#fff'; }

async function getJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('Network error (' + r.status + ')');
  return r.json();
}

async function searchCity(name) {
  status('Searching…');
  try {
    const g = await getJSON('https://geocoding-api.open-meteo.com/v1/search?count=1&name=' + encodeURIComponent(name));
    if (!g.results) { status('No city found for "' + name + '". Check the spelling.', true); return; }
    const c = g.results[0];
    await load(c.latitude, c.longitude, c.name + (c.country ? ', ' + c.country : ''));
    addRecent(c.name);
  } catch (e) { status('Could not reach the weather service. Check your internet and try again.', true); }
}

async function load(lat, lon, label) {
  status('Loading weather…');
  $('now').hidden = true; $('days').hidden = true;
  try {
    const w = await getJSON('https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon +
      '&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5');
    data = { w, label };
    render(); status('');
  } catch (e) { status('Could not load weather. Please try again.', true); }
}

function render() {
  if (!data) return;
  const { w, label } = data, cur = w.current, [txt, ico, mood] = info(cur.weather_code);
  document.body.dataset.mood = mood;
  $('place').textContent = label; $('cond').textContent = txt; $('icon').textContent = ico;
  $('temp').textContent = deg(cur.temperature_2m);
  $('feel').textContent = deg(cur.apparent_temperature);
  $('hum').textContent = cur.relative_humidity_2m + '%';
  $('wind').textContent = Math.round(cur.wind_speed_10m) + ' km/h';
  $('days').innerHTML = w.daily.time.map((d, i) => {
    const day = new Date(d + 'T00:00').toLocaleDateString(undefined, { weekday: 'short' });
    return `<div class="day"><b>${i ? day : 'Today'}</b><span>${info(w.daily.weather_code[i])[1]}</span>${deg(w.daily.temperature_2m_max[i])} / ${deg(w.daily.temperature_2m_min[i])}</div>`;
  }).join('');
  $('now').hidden = false; $('days').hidden = false;
}

function addRecent(n) {
  recent = [n, ...recent.filter(x => x.toLowerCase() !== n.toLowerCase())].slice(0, 5);
  store.set('recent', recent); drawRecent();
}
function drawRecent() {
  $('recent').innerHTML = '';
  recent.forEach(n => {
    const b = document.createElement('button'); b.textContent = n;
    b.onclick = () => { $('q').value = n; searchCity(n); };
    $('recent').appendChild(b);
  });
}

function setUnit(u) {
  unit = u; store.set('unit', u);
  $('c').classList.toggle('on', u === 'c'); $('f').classList.toggle('on', u === 'f');
  render();
}
$('c').onclick = () => setUnit('c'); $('f').onclick = () => setUnit('f');
$('form').onsubmit = e => { e.preventDefault(); const q = $('q').value.trim(); if (q) searchCity(q); };
$('geo').onclick = () => {
  if (!navigator.geolocation) { status('Location is not supported in this browser.', true); return; }
  status('Finding your location…');
  navigator.geolocation.getCurrentPosition(
    p => load(p.coords.latitude, p.coords.longitude, 'Your location'),
    () => status('Location permission denied. Search for a city instead.', true)
  );
};

setUnit(unit); drawRecent();
searchCity(recent[0] || 'Agra');
