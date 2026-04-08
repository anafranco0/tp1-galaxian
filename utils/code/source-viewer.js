// ES module that creates a source code viewer on the right half of the page.
// Default export: async function createSourceViewer(sources, options)
// Each source: { language: 'javascript', name: 'main.js', path: 'files/main.js' } or { language, name, code }

async function ensureCssInjected() {
  if (window.__sv_css_injected) return;
  const cssUrl = new URL('../styling/source-viewer.css', import.meta.url).href;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = cssUrl;
  document.head.appendChild(link);
  window.__sv_css_injected = true;
}

async function ensureHighlightJs() {
  if (window.hljs) return;
  // Inject highlight.js CSS theme
  if (!window.__sv_hljs_css) {
    const hlCss = document.createElement('link');
    hlCss.rel = 'stylesheet';
    hlCss.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/panda-syntax-light.min.css';
    document.head.appendChild(hlCss);
    window.__sv_hljs_css = true;
  }
  // Load highlight.js script
  if (!window.__sv_hljs_script_loading) {
    window.__sv_hljs_script_loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/highlight.min.js';
      s.async = true;
      s.onload = () => resolve(window.hljs);
      s.onerror = () => reject(new Error('Failed to load highlight.js'));
      document.head.appendChild(s);
    });
  }
  return window.__sv_hljs_script_loading;
}

async function ensureHighlightLanguages(langs = []) {
  if (!langs || langs.length === 0) return;
  await ensureHighlightJs();
  window.__sv_hljs_langs_loaded = window.__sv_hljs_langs_loaded || {};
  window.__sv_hljs_langs_loading = window.__sv_hljs_langs_loading || {};

  const promises = langs.map((lang) => {
    if (window.hljs && typeof window.hljs.getLanguage === 'function' && window.hljs.getLanguage(lang)) {
      window.__sv_hljs_langs_loaded[lang] = true;
      return Promise.resolve();
    }
    if (window.__sv_hljs_langs_loading[lang]) return window.__sv_hljs_langs_loading[lang];

    const p = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/languages/${lang}.min.js`;
      s.async = true;
      s.onload = () => {
        // language scripts typically self-register with hljs
        window.__sv_hljs_langs_loaded[lang] = true;
        resolve();
      };
      s.onerror = () => reject(new Error(`Failed to load hljs language ${lang}`));
      document.head.appendChild(s);
    });

    window.__sv_hljs_langs_loading[lang] = p;
    return p;
  });

  return Promise.all(promises);
}

async function loadSource(src) {
  if (src.path) {
    try {
      const res = await fetch(src.path);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const text = await res.text();
      return text;
    } catch (err) {
      return `/* Error fetching ${src.path}: ${err.message} */`;
    }
  }
  return src.code ?? '';
}

/**
 * Remove common leading indentation from a block of text.
 * Counts leading spaces/tabs on non-empty lines and removes the minimum from all lines.
 */
function normalizeIndent(text) {
  if (!text) return text;
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const indents = [];
  for (const line of lines) {
    if (line.trim() === '') continue;
    const m = line.match(/^[ \t]*/);
    indents.push(m ? m[0].length : 0);
  }
  if (indents.length === 0) return text;
  const minIndent = Math.min(...indents);
  if (minIndent === 0) return text;
  return lines.map((line) => {
    if (line.trim() === '') return '';
    // remove up to minIndent leading spaces/tabs
    return line.replace(new RegExp('^[ \t]{0,' + minIndent + '}'), '');
  }).join('\n');
}

function ensureOpenerButton() {
  let btn = document.getElementById('sv-opener');
  if (btn) return btn;
  btn = document.createElement('button');
  btn.id = 'sv-opener';
  btn.className = 'sv-opener';
  btn.title = 'Open source viewer';
  btn.textContent = '</>';
  btn.addEventListener('click', () => {
    const lastSources = window.__sv_last_sources || [];
    const lastOptions = window.__sv_last_options || {};
    btn.style.display = 'none';
    localStorage.setItem('sv-opened-before', 'true');
    // recreate viewer with last known sources/options
    createSourceViewer(lastSources, lastOptions).catch(() => {});
  });
  document.body.appendChild(btn);
  return btn;
}

function createTabsElement(sources, onSelect) {
  const tabs = document.createElement('div');
  tabs.className = 'sv-tabs';
  sources.forEach((s, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sv-tab' + (i === 0 ? ' active' : '');
    btn.textContent = s.name || `Source ${i+1}`;
    btn.addEventListener('click', () => {
      const prev = tabs.querySelector('.sv-tab.active');
      if (prev) prev.classList.remove('active');
      btn.classList.add('active');
      onSelect(i);
    });
    tabs.appendChild(btn);
  });
  return tabs;
}

function ensureContainer() {
  let container = document.getElementById('sv-container');
  if (container) return container;
  container = document.createElement('div');
  container.id = 'sv-container';
  container.className = 'sv-container';
  document.body.appendChild(container);
  return container;
}

export default async function createSourceViewer(sources = [], options = {}) {
  const wasOpenBefore = localStorage.getItem('sv-opened-before') || 'true';
  // remember last used sources/options for the opener button
  window.__sv_last_sources = sources;
  window.__sv_last_options = options;
  await ensureCssInjected();
  await ensureHighlightJs();
  // load requested highlight.js languages (default to ['glsl'])
  const langs = Array.isArray(options.languages) ? options.languages : ['glsl'];
  try { await ensureHighlightLanguages(langs); } catch (e) { /* ignore language load errors */ }

  const container = ensureContainer();
  // start closed to avoid flashing; we'll remove the closed class to animate open
  container.classList.add('sv-closed');
  container.innerHTML = '';

  // ensure opener exists and hide it while viewer is visible
  const opener = ensureOpenerButton();
  if (opener && wasOpenBefore === 'true') opener.style.display = 'none';

  const header = document.createElement('div');
  header.className = 'sv-header';

  const tabs = createTabsElement(sources, (index) => showSource(index));
  header.appendChild(tabs);

  const controls = document.createElement('div');
  controls.className = 'sv-controls';
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.textContent = '×';
  closeBtn.title = 'Close viewer';
  closeBtn.className = 'sv-close';
  closeBtn.addEventListener('click', () => {
    // animate closed, then remove
    container.classList.add('sv-closed');
    localStorage.setItem('sv-opened-before', 'false');
    const onEnd = (e) => {
      if (e.propertyName !== 'transform') return;
      container.removeEventListener('transitionend', onEnd);
      container.remove();
    };
    container.addEventListener('transitionend', onEnd);
    const opener = ensureOpenerButton();
    if (opener) opener.style.display = '';
  });
  controls.appendChild(closeBtn);
  header.appendChild(controls);

  const content = document.createElement('div');
  content.className = 'sv-content';
  const pre = document.createElement('pre');
  pre.className = 'sv-pre';
  const code = document.createElement('code');
  code.className = '';
  pre.appendChild(code);
  content.appendChild(pre);

  container.appendChild(header);
  container.appendChild(content);

  if (wasOpenBefore === 'true') {
    // trigger open animation on next frame
    requestAnimationFrame(() => {
      container.classList.remove('sv-closed');
    });
  }

  // load all sources (fetch if necessary)
  const loaded = await Promise.all(sources.map(async (s) => {
    const raw = await loadSource(s);
    const text = normalizeIndent(raw);
    return Object.assign({}, s, { text });
  }));

  function showSource(index) {
    const src = loaded[index];
    code.textContent = src.text || '';
    // set language class for highlight.js
    code.className = src.language ? `language-${src.language}` : '';
    if (window.hljs && typeof window.hljs.highlightElement === 'function') {
      try { window.hljs.highlightElement(code); } catch (e) { /* ignore */ }
    }
  }

  // show first source by default
  if (loaded.length > 0) showSource(0);

  return {
    destroy() {
      return new Promise((resolve) => {
        container.classList.add('sv-closed');
        const onEnd = (e) => {
          if (e.propertyName !== 'transform') return;
          container.removeEventListener('transitionend', onEnd);
          if (container.parentElement) container.remove();
          const opener = ensureOpenerButton();
          if (opener) opener.style.display = '';
          resolve();
        };
        container.addEventListener('transitionend', onEnd);
      });
    },
    setSources(newSources) { /* reload with new sources */
      return createSourceViewer(newSources, options);
    }
  };
}
