// Copy the two browser-safe values from your Supabase project here.
const SGHA_PROJECT_URL = 'https://htjmnkdgjqujcqpjslvs.supabase.co';
const SGHA_PUBLISHABLE_KEY = 'sb_publishable_wtAWg6c6znRF6LmuwF_LGg_wEqWnCjW';
const SGHA_BUCKET = 'sgha-public-hymns';

async function recordings(course, offering, section, base) {
  link('‹ ' + course.title, base, main, 'back');
  const titles = {
    sources: 'Source Recordings',
    lectures: 'Lectures',
    'praises-lectures': 'Praises · Lectures',
    'praises-sources': 'Praises · Source Recordings',
    'doxologies-lectures': 'Doxologies · Lectures',
    'doxologies-sources': 'Doxologies · Source Recordings'
  };
  el('h2', titles[section], main);
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

function addHymnPlayer(audio, queueActions = null) {
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
  if (queueActions) {
    buildCompactBar(audio, controls, queueActions);
  } else {
    addRecordingActions(audio, controls);
  }
  audio.controls = false;
  updateButton();
  updateTime();
  return controls;
}

function setRecordingIcon(button, label) {
  const icons = {
    '−10s': '↶', '+10s': '↷', 'Loop': '⇄',
    'Add to queue': '☰+', 'Added ✓': '✓',
    'Couldn’t add · Retry': '↻', 'Play queue': '▶', 'Next in queue': '▶▏'
  };
  const names = {
    '−10s': 'Back 10 seconds', '+10s': 'Forward 10 seconds',
    'Loop': 'Repeat recording', 'Added ✓': 'Added to queue'
  };
  button.classList.add('hymn-icon');
  button.title = names[label] || label;
  button.setAttribute('aria-label', button.title);
  button.textContent = icons[label] || label;
  if (label.endsWith('10s')) {
    const seconds = document.createElement('small');
    seconds.textContent = '10';
    button.append(seconds);
  }
}

function recordingButton(label, action) {
  const button = document.createElement('button');
  button.type = 'button';
  setRecordingIcon(button, label);
  button.addEventListener('click', action);
  return button;
}function addTransportButtons(audio, bar) {
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
      setRecordingIcon(add, 'Added ✓');
    } catch {
      setRecordingIcon(add, 'Couldn’t add · Retry');
    } finally {
      add.disabled = false;
    }
  });

  bar.append(add);
  buildCompactBar(audio, controls, bar);
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
  const loopButton = actions.querySelector('[aria-pressed]');
  const skipTrack = recordingButton('Next in queue', playNext);
  actions.append(skipTrack);
  player.setAttribute('aria-label', 'queue recording');
  panel.append(heading, status, player, next, list);
  const queueBar = addHymnPlayer(player, actions);

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
    queueBar.hidden = !current;
    skipTrack.disabled = pending.length === 0;
    next.disabled = pending.length === 0;
    setRecordingIcon(next, current ? 'Next in queue' : 'Play queue');
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
    loopButton.setAttribute('aria-pressed', 'false');
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


function buildCompactBar(audio, controls, actions) {
  const play = controls.querySelector('.sgha-play');
  const seek = controls.querySelector('input[type="range"]');
  const [back, forward, loop, queue] = actions.querySelectorAll('button');

  // Keep the original controls usable if the recording template changes.
  if (!play || !seek || !back || !forward || !loop || !queue) {
    controls.after(actions);
    return;
  }

  function icon(contents) {
    return `<svg viewBox="0 0 28 28" aria-hidden="true" fill="none"
      stroke="currentColor" stroke-width="1.9" stroke-linecap="round"
      stroke-linejoin="round">${contents}</svg>`;
  }

  function skipIcon(forwardDirection) {
    const arrow = '<path d="M13.5 4.5a10 10 0 1 1-7.2 3.1"/>' +
      '<path d="m14 1-4 3.5L14 8" fill="currentColor" stroke-width="1"/>';
    const drawing = forwardDirection
      ? `<g transform="translate(28 0) scale(-1 1)">${arrow}</g>`
      : arrow;

    return icon(drawing +
      '<text x="14" y="19.2" text-anchor="middle" fill="currentColor" ' +
      'stroke="none" font-family="system-ui,sans-serif" font-size="10" ' +
      'font-weight="700">10</text>');
  }

  back.innerHTML = skipIcon(false);
  forward.innerHTML = skipIcon(true);
  back.title = 'Back 10 seconds';
  forward.title = 'Forward 10 seconds';

  loop.innerHTML = icon(
    '<path d="M4 12a5 5 0 0 1 5-5h13m-4-4 4 4-4 4' +
    'M24 16a5 5 0 0 1-5 5H6m4-4-4 4 4 4"/>'
  );

  const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
  const speed = document.createElement('button');
  speed.type = 'button';
  speed.className = 'compact-speed';

  function updateSpeed() {
    speed.textContent = `${audio.playbackRate}×`;
    speed.title = `Playback speed ${audio.playbackRate}×. Tap to change`;
    speed.setAttribute('aria-label', speed.title);
  }

  speed.addEventListener('click', () => {
    const index = rates.indexOf(audio.playbackRate);
    audio.playbackRate = rates[(index + 1) % rates.length];
  });
  audio.addEventListener('ratechange', updateSpeed);
  updateSpeed();

  const mute = document.createElement('button');
  mute.type = 'button';

  function updateMute() {
    const speaker = '<path d="M4 11h5l6-5v16l-6-5H4z" fill="currentColor"/>';
    const sound = audio.muted
      ? '<path d="m19 11 6 6m0-6-6 6"/>'
      : '<path d="M19 10a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>';
    mute.innerHTML = icon(speaker + sound);
    mute.title = audio.muted ? 'Unmute' : 'Mute';
    mute.setAttribute('aria-label', mute.title);
  }

  mute.addEventListener('click', () => { audio.muted = !audio.muted; });
  audio.addEventListener('volumechange', updateMute);
  updateMute();

  const timeline = document.createElement('div');
  timeline.className = 'compact-timeline';
  const elapsed = document.createElement('span');
  const duration = document.createElement('span');
  seek.setAttribute('aria-label', 'Recording position');
  timeline.append(elapsed, seek, duration);

  function clock(seconds) {
    if (!Number.isFinite(seconds)) return '–:––';
    const whole = Math.floor(seconds);
    return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
  }

  function updateClock() {
    elapsed.textContent = clock(audio.currentTime);
    duration.textContent = clock(audio.duration);
  }

  for (const event of ['timeupdate', 'loadedmetadata', 'durationchange', 'emptied']) {
    audio.addEventListener(event, updateClock);
  }
  updateClock();

  controls.classList.add('compact-player');
  controls.replaceChildren(back, play, forward, speed, loop, timeline, mute, queue);
}
