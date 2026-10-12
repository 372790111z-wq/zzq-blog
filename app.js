(() => {
  'use strict';
  const data = window.ARTICLE_SITE_DATA || { articles: [], profiles: [], olderWorks: [] };
  const ownerProgress = window.OWNER_PROGRESS || null;
  const $ = id => document.getElementById(id);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeUrl = url => /^https:\/\/[^\s"'<>]+$/i.test(url || '') ? url : null;
  const safeImage = url => /^media\/[a-z0-9_-]+\.(?:png|jpe?g|webp|mp4)$/i.test(url || '') ? url : null;
  const displayDate = date => String(date || '').replace(/-/g, '.');
  const state = { article: 0, version: 0 };
  if (ownerProgress) document.body.classList.add('owner-mode');
  function progressHtml(articleId) {
    if (!ownerProgress) return '';
    const rows = ownerProgress[articleId] || [];
    if (!rows.length) return '';
    const published = rows.filter(row => row.status === 'published').length;
    return '<section class="article-progress" aria-label="发布进度">' +
      '<div class="article-progress__head"><div><h3>发布进度</h3></div><span>' + published + ' / ' + rows.length + ' 已发布</span></div>' +
      '<div class="article-progress__rows">' + rows.map(row => {
        const values = Object.entries(row.values || {}).filter(([,v]) => v !== null && v !== undefined);
        return '<div class="article-progress__row"><strong>' + escape(row.platform) + '</strong><span class="progress-status">' + escape(row.label) + '</span>' +
          (row.metricLabel ? '<small>' + escape(row.metricLabel) + '</small>' : '') +
          (values.length ? '<small>' + values.map(([key,v]) => escape(key) + ' ' + escape(v)).join(' · ') + '</small>' : '') +
          (safeUrl(row.public_url) ? '<a href="' + escape(row.public_url) + '" target="_blank" rel="noopener noreferrer">公开页 ↗</a>' : '') +
          '</div>';
      }).join('') + '</div></section>';
  }
  function inline(text) {
    let value = escape(text);
    value = value.replace(/\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g, (_, label, url) =>
      '<a href="' + escape(url) + '" target="_blank" rel="noopener noreferrer">' + label + '</a>');
    value = value.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    value = value.replace(/`([^`]+)`/g, '<code>$1</code>');
    return value;
  }
  function markdown(text) {
    const lines = String(text || '').split(/\r?\n/);
    let html = '', list = '', code = false;
    function closeList() { if (list) { html += '</' + list + '>'; list = ''; } }
    for (const line of lines) {
      if (/^```/.test(line.trim())) {
        closeList();
        html += code ? '</code></pre>' : '<pre><code>';
        code = !code; continue;
      }
      if (code) { html += escape(line) + '\n'; continue; }
      const image = line.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*$/);
      if (image) {
        closeList(); const url = safeImage(image[2]);
        if (url) html += '<figure><img loading="lazy" src="' + url + '" alt="' + escape(image[1]) + '"><figcaption>' + escape(image[1]) + '</figcaption></figure>';
        continue;
      }
      const heading = line.match(/^(#{1,4})\s+(.+)$/);
      if (heading) { closeList(); const level = Math.min(heading[1].length + 1, 5); html += '<h' + level + '>' + inline(heading[2]) + '</h' + level + '>'; continue; }
      const ul = line.match(/^\s*[-*]\s+(.+)$/), ol = line.match(/^\s*\d+[.)]\s+(.+)$/);
      if (ul || ol) { const next = ul ? 'ul' : 'ol'; if (list !== next) { closeList(); html += '<' + next + '>'; list = next; } html += '<li>' + inline((ul || ol)[1]) + '</li>'; continue; }
      closeList();
      if (/^>\s?/.test(line)) { html += '<blockquote>' + inline(line.replace(/^>\s?/, '')) + '</blockquote>'; continue; }
      if (/^\s*---+\s*$/.test(line)) { html += '<hr>'; continue; }
      if (line.trim()) html += '<p>' + inline(line) + '</p>';
    }
    closeList(); if (code) html += '</code></pre>';
    return html;
  }
  function renderList() {
    $('count').textContent = data.articles.length;
    $('list').innerHTML = data.articles.map((a, index) =>
      '<button class="item' + (index === state.article ? ' active' : '') + '" type="button" data-article="' + index + '" role="listitem"><small class="item-date"><time datetime="' + escape(a.date) + '">' + escape(displayDate(a.date)) + '</time><em>' + String(index + 1).padStart(2,'0') + '</em></small><strong>' + escape(a.title) + '</strong><span>' + a.versions.length + ' 个版本 · ' + a.media.gallery.length + ' 张图' + (a.media.video ? ' · 视频' : '') + '</span></button>').join('');
  }
  function renderReader() {
    const a = data.articles[state.article], v = a.versions[state.version];
    if (!a || !v) return;
    const tabs = a.versions.map((item, index) =>
      '<button class="tab" type="button" role="tab" aria-selected="' + (index === state.version) + '" data-version="' + index + '">' + escape(item.platform || item.title) + '</button>').join('');
    const gallery = a.media.gallery.map((url, index) =>
      '<figure><img loading="lazy" src="' + escape(url) + '" alt="' + escape(a.title) + ' 配图 ' + (index + 1) + '"><figcaption>' + String(index + 1).padStart(2,'0') + ' / ' + escape(a.title) + '</figcaption></figure>').join('');
    const video = a.media.video && safeImage(a.media.video) ?
      '<h3>相关视频</h3><video controls preload="metadata" playsinline src="' + escape(a.media.video) + '">浏览器不支持视频播放。</video>' : '';
    $('reader').innerHTML = '<span class="reader-label">ARTICLE / ' + String(state.article + 1).padStart(2,'0') +
      '</span><h2>' + escape(a.title) + '</h2><time class="reader-date" datetime="' + escape(a.date) + '">' + escape(displayDate(a.date)) +
      '</time><div class="tabs" role="tablist" aria-label="文章版本">' + tabs + '</div>' +
      progressHtml(a.id) +
      (safeUrl(v.public_url) ? '<a class="read-link" target="_blank" rel="noopener noreferrer" href="' + escape(v.public_url) + '">阅读已公开平台版本 ↗</a>' : '') +
      '<div class="article-body">' + markdown(v.content) + '</div>' +
      (gallery || video ? '<section class="media-section"><h3>文章影像</h3>' + (gallery ? '<div class="gallery">' + gallery + '</div>' : '') + video + '</section>' : '');
  }
  $('list').addEventListener('click', event => {
    const button = event.target.closest('[data-article]');
    if (!button) return;
    state.article = Number(button.dataset.article); state.version = 0;
    renderList(); renderReader();
    if (window.innerWidth < 851) $('reader').scrollIntoView({ behavior: 'smooth' });
  });
  $('reader').addEventListener('click', event => {
    const button = event.target.closest('[data-version]');
    if (!button) return;
    state.version = Number(button.dataset.version); renderReader();
  });
  $('links').innerHTML = [...data.profiles, ...data.olderWorks].filter(x => safeUrl(x.url)).map(x =>
    '<a target="_blank" rel="noopener noreferrer" href="' + escape(x.url) + '">' + escape(x.label || x.title || '阅读链接') + ' ↗</a>').join('');
  renderList(); renderReader();
})();
