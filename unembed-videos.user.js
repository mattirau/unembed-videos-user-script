// ==UserScript==
// @name         Unembed Videos
// @namespace    https://github.com/mattirau/unembed-videos-user-script
// @version      1.1.0
// @description  Replace embedded videos with a button linking to the original video page
// @author       mattirau
// @match        *://*/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const PROVIDERS = [
    {
      name: 'YouTube',
      // matches youtube.com/embed/ID and youtu.be/ID iframes
      pattern: /(?:youtube\.com\/embed\/|youtu\.be\/)([A-Za-z0-9_-]{11})/,
      url: (id) => `https://www.youtube.com/watch?v=${id}`,
      color: '#FF0000',
    },
    {
      name: 'Vimeo',
      pattern: /vimeo\.com\/(?:video\/)?(\d+)/,
      url: (id) => `https://vimeo.com/${id}`,
      color: '#1AB7EA',
    },
    {
      name: 'Dailymotion',
      pattern: /dailymotion\.com\/(?:embed\/video\/|video\/)([A-Za-z0-9]+)/,
      url: (id) => `https://www.dailymotion.com/video/${id}`,
      color: '#0066DC',
    },
    {
      name: 'Twitch clip',
      pattern: /clips\.twitch\.tv\/([A-Za-z0-9_-]+)|player\.twitch\.tv\/.*clip=([A-Za-z0-9_-]+)/,
      url: (id) => `https://clips.twitch.tv/${id}`,
      color: '#9146FF',
    },
    {
      name: 'Twitch channel',
      pattern: /player\.twitch\.tv\/.*channel=([A-Za-z0-9_]+)/,
      url: (id) => `https://www.twitch.tv/${id}`,
      color: '#9146FF',
    },
    {
      name: 'TikTok',
      pattern: /tiktok\.com\/(?:embed\/v2\/|@[^/]+\/video\/)(\d+)/,
      url: (id) => `https://www.tiktok.com/video/${id}`,
      color: '#010101',
    },
    {
      name: 'Twitter / X',
      pattern: /(?:twitter|x)\.com\/i\/(?:tweet\/embed|videos\/tweet)\/(\d+)/,
      url: (id) => `https://x.com/i/web/status/${id}`,
      color: '#000000',
    },
    {
      name: 'Rumble',
      pattern: /rumble\.com\/embed\/([A-Za-z0-9]+)/,
      url: (id) => `https://rumble.com/embed/${id}`,
      color: '#85C742',
    },
    {
      name: 'Odysee / LBRY',
      pattern: /odysee\.com\/\$\/embed\/([^/?#]+)/,
      url: (id) => `https://odysee.com/@${id}`,
      color: '#EF1970',
    },
    {
      name: 'Wistia',
      pattern: /(?:fast\.)?wistia\.(?:com|net)\/(?:embed\/iframe\/|medias\/)([A-Za-z0-9]+)/,
      url: (id) => `https://fast.wistia.com/medias/${id}`,
      color: '#54BBFF',
    },
    {
      name: 'Loom',
      pattern: /loom\.com\/(?:embed\/|share\/)([A-Za-z0-9]+)/,
      url: (id) => `https://www.loom.com/share/${id}`,
      color: '#625DF5',
    },
    {
      name: 'Spotify',
      pattern: /open\.spotify\.com\/embed\/([^?#]+)/,
      url: (id) => `https://open.spotify.com/${id}`,
      color: '#1DB954',
    },
    {
      name: 'SoundCloud',
      pattern: /w\.soundcloud\.com\/player\/\?.*url=([^&]+)/,
      url: (encodedUrl) => decodeURIComponent(encodedUrl),
      color: '#FF5500',
    },
    {
      name: 'Bilibili',
      pattern: /player\.bilibili\.com\/player\.html\?(?:.*&)?(?:aid|bvid)=([A-Za-z0-9]+)/,
      url: (id) => `https://www.bilibili.com/video/${id}`,
      color: '#00A1D6',
    },
    {
      name: 'Facebook',
      pattern: /facebook\.com\/plugins\/video\.php\?.*href=([^&]+)/,
      url: (encodedUrl) => decodeURIComponent(encodedUrl),
      color: '#1877F2',
    },
    {
      name: 'Instagram',
      pattern: /instagram\.com\/p\/([A-Za-z0-9_-]+)\/embed/,
      url: (id) => `https://www.instagram.com/p/${id}/`,
      color: '#E1306C',
    },
  ];

  const STYLE = `
    .unembed-btn-wrap {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      width: 100%;
      height: 100%;
      min-width: 200px;
      min-height: 80px;
      background: #111;
      border-radius: 6px;
      padding: 12px;
      gap: 8px;
      font-family: system-ui, sans-serif;
    }
    .unembed-label {
      color: #aaa;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .unembed-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      color: #fff;
      text-decoration: none;
      transition: filter 0.15s;
    }
    .unembed-btn:hover { filter: brightness(1.15); }
    .unembed-newtab {
      background: transparent;
      border: 1px solid #555;
      color: #ccc;
      font-size: 11px;
      padding: 4px 10px;
      border-radius: 4px;
      cursor: pointer;
      font-family: system-ui, sans-serif;
    }
    .unembed-newtab:hover { border-color: #aaa; color: #fff; }
  `;

  function resolve(src) {
    for (const provider of PROVIDERS) {
      const m = src.match(provider.pattern);
      if (m) {
        const id = m[1] || m[2];
        return { name: provider.name, href: provider.url(id), color: provider.color };
      }
    }
    return null;
  }

  function makeReplacement(iframe, info) {
    const width = iframe.width || iframe.offsetWidth || iframe.style.width || '100%';
    const height = iframe.height || iframe.offsetHeight || iframe.style.height || '180px';

    const wrap = document.createElement('div');
    wrap.className = 'unembed-btn-wrap';
    wrap.style.width = typeof width === 'number' ? `${width}px` : width;
    wrap.style.height = typeof height === 'number' ? `${height}px` : height;

    const label = document.createElement('div');
    label.className = 'unembed-label';
    label.textContent = info.name;

    const link = document.createElement('a');
    link.className = 'unembed-btn';
    link.href = info.href;
    link.target = '_self';
    link.rel = 'noopener noreferrer';
    link.style.background = info.color;
    link.textContent = 'Open video';

    const newTabBtn = document.createElement('button');
    newTabBtn.className = 'unembed-newtab';
    newTabBtn.textContent = 'Open in new tab';
    newTabBtn.addEventListener('click', () => {
      window.open(info.href, '_blank', 'noopener,noreferrer');
    });

    wrap.appendChild(label);
    wrap.appendChild(link);
    wrap.appendChild(newTabBtn);
    return wrap;
  }

  function injectStyle() {
    if (document.getElementById('unembed-style')) return;
    const el = document.createElement('style');
    el.id = 'unembed-style';
    el.textContent = STYLE;
    document.head.appendChild(el);
  }

  function processIframe(iframe) {
    if (iframe.dataset.unembedDone) return;
    const src = iframe.src || iframe.getAttribute('data-src') || '';
    if (!src) return;
    const info = resolve(src);
    if (!info) return;

    iframe.dataset.unembedDone = '1';
    injectStyle();
    const replacement = makeReplacement(iframe, info);
    iframe.replaceWith(replacement);
  }

  // Reddit uses <shreddit-player> custom element instead of iframes
  function processShredditPlayer(el) {
    if (el.dataset.unembedDone) return;
    el.dataset.unembedDone = '1';

    // Find the permalink from the nearest post article
    const article = el.closest('article, shreddit-post, [data-testid="post-container"]');
    let href = null;
    if (article) {
      const link = article.querySelector('a[href*="/r/"][href*="/comments/"]');
      href = link?.href;
    }
    // Fall back to the v.redd.it src attribute
    if (!href) href = el.getAttribute('src') || 'https://www.reddit.com';

    const info = {
      name: 'Reddit video',
      href,
      color: '#FF4500',
    };

    injectStyle();
    const replacement = makeReplacement(el, info);
    // Copy dimensions from the player element
    const w = el.offsetWidth || el.getAttribute('width') || '100%';
    const h = el.offsetHeight || el.getAttribute('height') || '180px';
    replacement.style.width = typeof w === 'number' ? `${w}px` : w;
    replacement.style.height = typeof h === 'number' ? `${h}px` : h;
    el.replaceWith(replacement);
  }

  function scanAll() {
    document.querySelectorAll('iframe').forEach(processIframe);
    document.querySelectorAll('shreddit-player').forEach(processShredditPlayer);
  }

  // Initial scan after DOM is ready
  scanAll();

  // Watch for dynamically injected iframes AND late src assignments
  // (TikTok's SDK adds the iframe first, then sets src via setAttribute)
  const observer = new MutationObserver((mutations) => {
    for (const mut of mutations) {
      if (mut.type === 'attributes') {
        if (mut.target.tagName === 'IFRAME') processIframe(mut.target);
        if (mut.target.tagName === 'SHREDDIT-PLAYER') processShredditPlayer(mut.target);
        continue;
      }
      for (const node of mut.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.tagName === 'IFRAME') processIframe(node);
        if (node.tagName === 'SHREDDIT-PLAYER') processShredditPlayer(node);
        node.querySelectorAll?.('iframe').forEach(processIframe);
        node.querySelectorAll?.('shreddit-player').forEach(processShredditPlayer);
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src', 'data-src', 'packaged-media-json'],
  });
})();
