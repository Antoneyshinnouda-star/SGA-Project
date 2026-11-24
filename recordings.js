// Copy the two browser-safe values from your Supabase project here.
const SGHA_PROJECT_URL = 'https://htjmnkdgjqujcqpjslvs.supabase.co';
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
        headers: {
          apikey: SGHA_PUBLISHABLE_KEY,
          Authorization: 'Bearer ' + SGHA_PUBLISHABLE_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prefix: folder,
          limit: 100,
          offset,
          sortBy: { column: 'name', order: 'asc' }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Listing failed (${response.status}): ${errText}`);
      }

      const items = await response.json();
      if (!list.isConnected) return;

      for (const file of items) {
        if (!file.id || !/\.(mp3|m4a|wav)$/i.test(file.name)) continue;
        const title = file.name.replace(/\.[^.]+$/, '').replace(/_/g, ' ');
        el('h3', title, list);
        const player = el('audio', '', list);
        player.controls = true;
        player.preload = 'metadata';
        player.setAttribute('aria-label', title);
        player.src = storage + '/public/' + SGHA_BUCKET + '/' + folder + '/' + encodeURIComponent(file.name);
        addHymnPlayer(player);
        seen++;
      }

      if (items.length < 100) break;
    }

    status.textContent = seen ? '' : `No recordings in this section yet. (Looked in: ${folder})`;
  } catch (err) {
    console.error('SGHA recordings error:', err);
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
  audio.after(controls);addRecordingActions(audio, controls);
  audio.controls = false;
  updateButton();
  updateTime();
}function recordingButton(label, action) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.addEventListener('click', action);
  return button;
}

function addTransportButtons(audio, bar) {
  function skip(seconds) {
    if (!Number.isFinite(audio.duration)) return;
    audio.currentTime = Math.max(
      0,
      Math.min(audio.duration, audio.currentTime + seconds)
    );
  }

  const back = recordingButton('−10s', () => skip(-10));
  const forward = recordingButton('+10s', () => skip(10));
  back.setAttribute('aria-label', 'Skip backward 10 seconds');
  forward.setAttribute('aria-label', 'Skip forward 10 seconds');

  function updateSkipButtons() {
    back.disabled = forward.disabled = !Number.isFinite(audio.duration);
  }

  for (const event of ['loadedmetadata', 'durationchange', 'emptied']) {
    audio.addEventListener(event, updateSkipButtons);
  }
  updateSkipButtons();

  const loop = recordingButton('Loop', () => {
    audio.loop = !audio.loop;
    loop.setAttribute('aria-pressed', String(audio.loop));
  });
  loop.setAttribute('aria-pressed', String(audio.loop));
  bar.append(back, forward, loop);
}

function addRecordingActions(audio, controls) {
  const bar = document.createElement('div');
  bar.className = 'recording-actions';
  addTransportButtons(audio, bar);

  // The recording list places each title immediately before its audio element.
  const heading = audio.previousElementSibling;
  const title = heading?.matches('h3') ? heading.textContent : 'Recording';

  const add = recordingButton('Add to queue', async () => {
    add.disabled = true;
    try {
      await getRecordingQueue().add(title, audio.currentSrc || audio.src);
      add.textContent = 'Added ✓';
    } catch {
      add.textContent = 'Couldn’t add · Retry';
    } finally {
      add.disabled = false;
    }
  });

  bar.append(add);
  controls.after(bar);
}

let recordingQueueInstance;

function getRecordingQueue() {
  if (recordingQueueInstance) return recordingQueueInstance;

  const pending = [];
  let current = null;

  const panel = document.createElement('section');
  panel.className = 'recording-queue';
  panel.setAttribute('aria-label', 'Recording queue');

  const heading = document.createElement('h2');
  heading.textContent = 'Queue';
  const status = document.createElement('p');
  status.setAttribute('aria-live', 'polite');

  const player = document.createElement('audio');
  player.controls = true;
  player.preload = 'metadata';
  player.hidden = true;

  const actions = document.createElement('div');
  actions.className = 'recording-actions';
  addTransportButtons(player, actions);

  const list = document.createElement('ol');
  const next = recordingButton('Play queue', playNext);
  panel.append(heading, status, player, actions, next, list);

  // Keep the queue outside <main>, which the app replaces during navigation.
  document.body.append(panel);

  function render() {
    list.replaceChildren();
    for (const track of pending) {
      const row = document.createElement('li');
      row.textContent = track.title;
      list.append(row);
    }

    player.hidden = !current;
    actions.hidden = !current;
    next.disabled = pending.length === 0;
    next.textContent = current ? 'Next in queue' : 'Play queue';
    status.textContent = current
      ? `Current recording: ${current.title}`
      : 'Choose Play queue to begin.';
    panel.hidden = !current && pending.length === 0;
  }

  function releaseCurrent() {
    player.pause();
    player.removeAttribute('src');
    player.load();
    if (current?.ownsURL) URL.revokeObjectURL(current.url);
    current = null;
  }

  async function playNext() {
    releaseCurrent();
    current = pending.shift() || null;
    player.loop = false;
    actions.querySelector('[aria-pressed]').setAttribute('aria-pressed', 'false');
    render();
    if (!current) return;

    const track = current;
    player.src = track.url;
    try {
      await player.play();
    } catch {
      if (current === track) {
        status.textContent = `Press play to retry ${track.title}.`;
      }
    }
  }

  player.addEventListener('ended', playNext);

  // Playing a hymn in an album pauses the queue, and vice versa.
  document.addEventListener('play', event => {
    if (!(event.target instanceof HTMLAudioElement)) return;
    for (const other of document.querySelectorAll('audio')) {
      if (other !== event.target && !other.paused) other.pause();
    }
  }, true);

  render();

  recordingQueueInstance = {
    async add(title, source) {
      if (!source) throw new Error('Missing recording source');
      const track = { title, url: source, ownsURL: false };

      // Local uploads need their own URL so leaving the album doesn't
      // invalidate the queued copy. Hosted recordings can use their URL.
      if (source.startsWith('blob:')) {
        const response = await fetch(source);
        if (!response.ok) throw new Error('Recording unavailable');
        track.url = URL.createObjectURL(await response.blob());
        track.ownsURL = true;
      }

      pending.push(track);
      render();
      panel.scrollIntoView({ block: 'nearest' });
    }
  };

  return recordingQueueInstance;
}
