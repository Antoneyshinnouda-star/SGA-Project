// Copy the two browser-safe values from your Supabase project here.
const SGHA_PROJECT_URL = 'https://antoneyshinnouda-star.github.io/SGA-Project/';
const SGHA_PUBLISHABLE_KEY = 'sb_publishable_wtAWg6c6znRF6LmuwF_LGg_wEqWnCjW';
const SGHA_BUCKET = 'sgha-public-hymns';

async function recordings(course, offering, section, base) {
  link('‹ ' + course.title, base, main, 'back');
  el('h2', section === 'sources' ? 'Source Recordings' : 'Lectures', main);
  const status = el('p', 'Loading recordings…', main);
  status.setAttribute('role', 'status');
  const list = el('section', '', main);
  if (!SGHA_PROJECT_URL || !SGHA_PUBLISHABLE_KEY) {
    status.textContent = 'The shared recordings library has not been connected yet.';
    return;
  }
  const storage = SGHA_PROJECT_URL.replace(/\/+$/, '') + '/storage/v1/object';
  const folder = offering.id + '/' + section;
  let seen = 0;
  try {
    for (let offset = 0; ; offset += 100) {
      const response = await fetch(storage + '/list/' + SGHA_BUCKET, {
        method: 'POST',
        headers: { apikey: SGHA_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({prefix: folder, limit: 100, offset, sortBy: {column: 'name', order: 'asc'}})
      });
      if (!response.ok) throw Error('Listing failed');
      const items = await response.json();
      if (!list.isConnected) return;
      for (const file of items) {
        if (!file.id || !/\.(mp3|m4a|wav)$/i.test(file.name)) continue;
        const title = file.name.replace(/\.[^.]+$/, '').replace(/_/g, ' ');
        el('h3', title, list);
        const player = el('audio', '', list);
        player.controls = true;
        player.preload = 'none';
        player.setAttribute('aria-label', title);
        player.src = storage + '/public/' + SGHA_BUCKET + '/' + folder + '/' + encodeURIComponent(file.name);addHymnPlayer(player);
        seen++;
      }
      if (items.length < 100) break;
    }
    status.textContent = seen ? '' : 'No recordings in this section yet.';
  } catch {
    status.textContent = 'Could not load recordings. Check the connection and refresh.';
  }
}
function addHymnPlayer(audio) {
  const name = audio.getAttribute('aria-label')
    || audio.previousElementSibling?.textContent
    || 'recording';

  const controls = document.createElement('div');
  controls.className = 'sgha-player';
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', name);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'sgha-play';

  const seek = document.createElement('input');
  seek.type = 'range';
  seek.min = '0';
  seek.max = '0';
  seek.step = '1';
  seek.value = '0';
  seek.disabled = true;
  seek.setAttribute('aria-label', `Seek in ${name}`);

  const time = document.createElement('span');
  time.className = 'sgha-time';

  function clock(seconds) {
    const whole = Math.floor(seconds);
    return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
  }

  function updateButton() {
    const playing = !audio.paused && !audio.ended;
    button.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} ${name}`);
    button.title = playing ? 'Pause' : 'Play';
    button.innerHTML = playing
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5v17L21 12z"/></svg>';
  }

  function updateTime() {
    const known = Number.isFinite(audio.duration) && audio.duration > 0;
    const elapsed = clock(audio.currentTime || 0);
    seek.disabled = !known;
    seek.max = known ? String(audio.duration) : '0';
    seek.value = String(audio.currentTime || 0);
    seek.setAttribute('aria-valuetext', elapsed);
    time.textContent = `${elapsed} / ${known ? clock(audio.duration) : '–:––'}`;
  }

  function showNativePlayer() {
    controls.remove();
    audio.controls = true;
  }

  button.addEventListener('click', async () => {
    if (!audio.paused) {
      audio.pause();
      return;
    }
    try {
      await audio.play();
    } catch {
      showNativePlayer();
    }
  });

  seek.addEventListener('input', () => {
    if (!seek.disabled) audio.currentTime = Number(seek.value);
  });

  for (const event of ['play', 'pause', 'ended']) {
    audio.addEventListener(event, updateButton);
  }
  for (const event of ['loadedmetadata', 'durationchange', 'timeupdate']) {
    audio.addEventListener(event, updateTime);
  }
  audio.addEventListener('error', showNativePlayer, { once: true });

  controls.append(button, seek, time);
  audio.after(controls);
  audio.controls = false;
  updateButton();
  updateTime();
}