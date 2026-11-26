const main = document.querySelector('main');

function el(tag, text, parent, cls) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (cls) node.className = cls;
  parent.append(node);
  return node;
}

function link(text, path, parent, cls) {
  const anchor = el('a', text, parent, cls);
  anchor.href = '#' + path;
  return anchor;
}

function row(title, path, detail, parent = main) {
  const anchor = link('', path, parent, 'row');
  const label = el('span', title, anchor);
  el('small', detail, label);
  el('i', '›', anchor).setAttribute('aria-hidden', 'true');
}

function praisesDropdown(title, base, prefix) {
  const details = el('details', '', main, 'praises-group');
  const summary = el('summary', '', details, 'row');
  el('span', title, summary);
  el('i', '›', summary).setAttribute('aria-hidden', 'true');
  row('Lectures', base + '/' + prefix + '-lectures', '', details);
  row('Source Recordings', base + '/' + prefix + '-sources', '', details);
}

function albumCard(grid, path, title, subtitle) {
  const anchor = link('', path, grid, 'card');
  const cover = el('div', '', anchor, 'cover');
  const image = el('img', '', cover);
  image.src = 'academy.png';
  image.alt = '';
  el('strong', title, anchor);
  el('small', subtitle, anchor);
}

function showResources(ids, path) {
  for (const id of ids) {
    const resource = catalog.resources.find(item => item.id === id);
    row(resource.title, path + '/' + id, resource.kind);
  }
}

function showLibrary(section) {
  el('p', 'Choose an album to listen to', main);
  for (const group of new Set(catalog.albums.map(album => album.group))) {
    el('h2', group, main);
    const grid = el('div', '', main, 'grid');
    for (const album of catalog.albums.filter(item => item.group === group)) {
      albumCard(grid, section.id + '/' + album.id, album.title, '');
    }
  }
  if (catalog.hymnLibraryIDs.length) el('h2', 'Related resources', main);
  showResources(catalog.hymnLibraryIDs, section.id);
}

const homeSubjects = ['Hymns', 'Praises', 'Deacon Responses'];

function courseOrder(title) {
  const match = title.match(/^(.*) (\d+)$/);
  if (!match) return [Infinity, homeSubjects.length];
  const subject = homeSubjects.indexOf(match[1]);
  return [Number(match[2]), subject < 0 ? homeSubjects.length : subject];
}

function showCurriculum(section) {
  const years = catalog.years.filter(year => year.section === section.id);
  el('p', years.length ? 'Choose a course to see its lessons.' :
    'Courses will appear here when materials are added.', main);

  for (const year of years) {
    el('h2', year.title, main);
    const grid = el('div', '', main, 'grid');
    const groups = catalog.classes.filter(group => group.year === year.id);
    const cards = groups.flatMap(group => catalog.courses
      .filter(course => course.group === group.id)
      .map(course => ({ course, group })));

    if (section.id === 'home') {
      grid.classList.add('home-course-grid');
      cards.sort((a, b) => {
        const [levelA, subjectA] = courseOrder(a.course.title);
        const [levelB, subjectB] = courseOrder(b.course.title);
        return levelA - levelB || subjectA - subjectB;
      });
    }
    for (const { course, group } of cards) {
      albumCard(grid, section.id + '/' + course.id, course.title, group.title);
    }
  }
}

function showCourse(course, offering, part, base) {
  const isPraises = course.id.startsWith('praises');
  const grouped = isPraises && /^(praises|doxologies)-(lectures|sources)$/.test(part);
  if (part === 'lectures' || part === 'sources' || grouped) {
    recordings(course, offering, part, base);
    return;
  }
  if (isPraises) {
    praisesDropdown('Praises', base, 'praises');
    praisesDropdown('Doxologies', base, 'doxologies');
  } else {
    row('Lectures', base + '/lectures', 'Class lectures and instruction');
    row('Source Recordings', base + '/sources', 'Reference audio for practice');
  }
  const lessons = catalog.lessons.filter(lesson => lesson.course === course.id);
  if (lessons.length) el('h2', 'Lessons', main);
  for (const lesson of lessons) row(lesson.title, base + '/' + lesson.id, 'View resources');
}

function render() {
  const [tab, courseId, offeringId, lessonId, resourceId] = location.hash.slice(1).split('/');
  const section = catalog.sections.find(item => item.id === tab) || catalog.sections[0];
  main.replaceChildren();
  const nav = document.querySelector('nav');
  nav.replaceChildren();
  for (const item of catalog.sections) {
    const anchor = link(item.tab, item.id, nav);
    if (item.id === section.id) anchor.setAttribute('aria-current', 'page');
  }

  const course = catalog.courses.find(item => item.id === courseId);
  const offerings = catalog.offerings.filter(item => item.course === courseId);
  const offering = offerings.find(item => item.id === offeringId) || offerings[0];
  const lesson = catalog.lessons.find(item => item.id === lessonId && item.course === courseId);
  const base = course && offering ? [section.id, courseId, offering.id].join('/') : '';
  const library = section.kind === 'library';
  const ids = library ? catalog.hymnLibraryIDs : catalog.placements
    .filter(item => item.lesson === lessonId && (!item.offering || item.offering === offering?.id))
    .map(item => item.resource);
  const resource = catalog.resources.find(item =>
    item.id === (library ? courseId : resourceId) && ids.includes(item.id));
  const album = library && catalog.albums.find(item => item.id === courseId);

  if (album) {
    const path = 'library/' + album.id;
    link('‹ Hymns Library', section.id, main, 'back');
    el('h1', album.title, main);
    if (offeringId === 'lectures' || offeringId === 'sources') {
      recordings(album, { id: 'album-' + album.id }, offeringId, path);
    } else {
      row('Lectures', path + '/lectures', 'Instructional recordings');
      row('Source Recordings', path + '/sources', 'Hymn recordings for practice');
    }
  } else if (resource) {
    link('‹ ' + (lesson?.title || section.tab), lesson ? base + '/' + lessonId : section.id, main, 'back');
    el('h1', resource.title, main);
    el('small', resource.kind, main);
    el('p', resource.detail, main);
  } else if (lesson && base) {
    link('‹ ' + course.title, base, main, 'back');
    el('h1', lesson.title, main);
    el('p', course.title, main);
    el('h2', 'Lesson resources', main);
    showResources(ids, base + '/' + lessonId);
  } else if (course && base) {
    link('‹ ' + section.tab, section.id, main, 'back');
    el('h1', course.title, main);
    showCourse(course, offering, lessonId, base);
  } else {
    el('h1', section.title, main);
    if (library) showLibrary(section);
    else showCurriculum(section);
  }

  el('footer', 'SGHA Study Library', main);
  document.title = main.querySelector('h1').textContent + ' · SGHA';
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', render);
render();

function setupThemeMenu() {
  const header = document.querySelector('header');
  if (!header || header.querySelector('.sgha-theme-menu')) return;

  const storageKey = 'sgha-theme';
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  const choices = {
    system: 'System',
    light: 'Light',
    dark: 'Dark'
  };

  let preference = 'system';
  try {
    const saved = localStorage.getItem(storageKey);
    if (Object.hasOwn(choices, saved)) preference = saved;
  } catch {
    // The menu still works if browser storage is unavailable.
  }

  const label = document.createElement('label');
  label.className = 'sgha-theme-menu';
  label.append('Theme');

  const select = document.createElement('select');
  for (const [value, title] of Object.entries(choices)) {
    select.add(new Option(title, value));
  }
  select.value = preference;
  label.append(select);
  header.append(label);

  function applyTheme() {
    const deviceTheme = systemTheme.matches ? 'dark' : 'light';
    document.documentElement.dataset.theme =
      preference === 'system' ? deviceTheme : preference;
  }

  select.addEventListener('change', () => {
    preference = select.value;
    applyTheme();
    try {
      localStorage.setItem(storageKey, preference);
    } catch {
      // Keep the current choice for this visit.
    }
  });

  systemTheme.addEventListener('change', applyTheme);
  applyTheme();
}

setupThemeMenu();
