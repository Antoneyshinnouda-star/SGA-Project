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
        player.src = storage + '/public/' + SGHA_BUCKET + '/' + folder + '/' + encodeURIComponent(file.name);
        seen++;
      }
      if (items.length < 100) break;
    }
    status.textContent = seen ? '' : 'No recordings in this section yet.';
  } catch {
    status.textContent = 'Could not load recordings. Check the connection and refresh.';
  }
}
