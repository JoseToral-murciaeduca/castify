/**
 * Castify — app.js
 * Arquitectura modular: cada módulo es un objeto de configuración
 * con responsabilidad única. No depende de frameworks externos.
 */

/* ══════════════════════════════════════════════════════════
   1. DATOS DE EJEMPLO (Data Layer)
══════════════════════════════════════════════════════════ */
const DATA = {

  tvChannels: [
    {
      id: 'tv1', title: 'Noticias 24', category: 'Noticias',
      logo: 'https://placehold.co/80x80/1A1620/F5A623?text=N24',
      thumb: 'https://placehold.co/480x270/1A1620/F5A623?text=Noticias+24',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      type: 'video', live: true, viewers: '12.4K',
    },
    {
      id: 'tv2', title: 'Deportes Total', category: 'Deportes',
      logo: 'https://placehold.co/80x80/1A1620/F5A623?text=DT',
      thumb: 'https://placehold.co/480x270/1A1620/F5A623?text=Deportes+Total',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      type: 'video', live: true, viewers: '8.1K',
    },
    {
      id: 'tv3', title: 'Cine Clásico', category: 'Entretenimiento',
      logo: 'https://placehold.co/80x80/1A1620/F5A623?text=CC',
      thumb: 'https://placehold.co/480x270/1A1620/F5A623?text=Cine+Clásico',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      type: 'video', live: true, viewers: '3.7K',
    },
    {
      id: 'tv4', title: 'Documental HD', category: 'Documentales',
      logo: 'https://placehold.co/80x80/1A1620/F5A623?text=DC',
      thumb: 'https://placehold.co/480x270/1A1620/F5A623?text=Documental+HD',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      type: 'video', live: true, viewers: '2.2K',
    },
    {
      id: 'tv5', title: 'Internacional TV', category: 'Internacional',
      logo: 'https://placehold.co/80x80/1A1620/F5A623?text=INT',
      thumb: 'https://placehold.co/480x270/1A1620/F5A623?text=Internacional+TV',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
      type: 'video', live: true, viewers: '5.9K',
    },
    {
      id: 'tv6', title: 'Entretenimiento Plus', category: 'Entretenimiento',
      logo: 'https://placehold.co/80x80/1A1620/F5A623?text=E+',
      thumb: 'https://placehold.co/480x270/1A1620/F5A623?text=Entretenimiento+Plus',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
      type: 'video', live: true, viewers: '6.8K',
    },
  ],

  radioStations: [
    {
      id: 'r1', title: 'Radio Ámbar', genre: 'Pop',
      logo: 'https://placehold.co/80x80/221D2B/F5A623?text=RA',
      url: 'https://streams.ilovemusic.de/iloveradio2.mp3',
      type: 'audio', bitrate: '320kbps', country: 'España',
    },
    {
      id: 'r2', title: 'Jazz Noir', genre: 'Jazz',
      logo: 'https://placehold.co/80x80/221D2B/D4A843?text=JN',
      url: 'https://streams.ilovemusic.de/iloveradio1.mp3',
      type: 'audio', bitrate: '192kbps', country: 'Francia',
    },
    {
      id: 'r3', title: 'Rock Clásico FM', genre: 'Rock',
      logo: 'https://placehold.co/80x80/221D2B/F5A623?text=RF',
      url: 'https://streams.ilovemusic.de/iloveradio6.mp3',
      type: 'audio', bitrate: '256kbps', country: 'UK',
    },
    {
      id: 'r4', title: 'Symphonic Gold', genre: 'Clásica',
      logo: 'https://placehold.co/80x80/221D2B/E8C87A?text=SG',
      url: 'https://streams.ilovemusic.de/iloveradio17.mp3',
      type: 'audio', bitrate: '192kbps', country: 'Alemania',
    },
    {
      id: 'r5', title: 'Electro Pulse', genre: 'Electrónica',
      logo: 'https://placehold.co/80x80/221D2B/C9773A?text=EP',
      url: 'https://streams.ilovemusic.de/iloveradio9.mp3',
      type: 'audio', bitrate: '320kbps', country: 'Países Bajos',
    },
    {
      id: 'r6', title: 'Chill Vibes', genre: 'Pop',
      logo: 'https://placehold.co/80x80/221D2B/F5A623?text=CV',
      url: 'https://streams.ilovemusic.de/iloveradio15.mp3',
      type: 'audio', bitrate: '128kbps', country: 'España',
    },
  ],

  podcasts: [
    {
      id: 'p1', title: 'El Futuro de la IA', show: 'TechTalks',
      artwork: 'https://placehold.co/60x60/221D2B/F5A623?text=TT',
      url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      type: 'audio', duration: '42:18', category: 'Tecnología', date: 'Hace 2 días',
    },
    {
      id: 'p2', title: 'Los Misterios del Cosmos', show: 'Ciencia Viva',
      artwork: 'https://placehold.co/60x60/221D2B/D4A843?text=CV',
      url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
      type: 'audio', duration: '58:44', category: 'Ciencia', date: 'Hace 1 semana',
    },
    {
      id: 'p3', title: 'Cine Independiente Hoy', show: 'Fotograma',
      artwork: 'https://placehold.co/60x60/221D2B/E8C87A?text=FG',
      url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
      type: 'audio', duration: '1:12:03', category: 'Cultura', date: 'Ayer',
    },
    {
      id: 'p4', title: 'Startups que Cambian el Mundo', show: 'Capital Digital',
      artwork: 'https://placehold.co/60x60/221D2B/C9773A?text=CD',
      url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
      type: 'audio', duration: '34:21', category: 'Negocios', date: 'Hace 3 días',
    },
    {
      id: 'p5', title: 'Idiomas Sin Fronteras', show: 'Políglota',
      artwork: 'https://placehold.co/60x60/221D2B/F5A623?text=PG',
      url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
      type: 'audio', duration: '27:55', category: 'Cultura', date: 'Hace 5 días',
    },
    {
      id: 'p6', title: 'Ciberseguridad para Todos', show: 'HackerSpace',
      artwork: 'https://placehold.co/60x60/221D2B/F5A623?text=HS',
      url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
      type: 'audio', duration: '49:11', category: 'Tecnología', date: 'Hace 4 días',
    },
  ],
};

/* ══════════════════════════════════════════════════════════
   2. UTILIDADES
══════════════════════════════════════════════════════════ */
const Utils = {

  /** Muestra un toast de notificación */
  showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    const icons = {
      info:    `<svg class="w-4 h-4 text-cinema-amber flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>`,
      success: `<svg class="w-4 h-4 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`,
      error:   `<svg class="w-4 h-4 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`,
    };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  /** Formatea segundos → mm:ss */
  formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) return '–:––';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  },

  /** Escapa HTML para evitar XSS */
  escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
  },

  /** Determina si una URL es de tipo video */
  isVideoUrl(url) {
    const videoExts = ['.mp4', '.webm', '.mkv', '.avi', '.m4v', '.mov', '.ts'];
    const u = url.toLowerCase().split('?')[0];
    return videoExts.some(ext => u.endsWith(ext));
  },

  /** Detecta si una URL es un stream HLS */
  isHLSUrl(url) {
    return url.toLowerCase().includes('.m3u8');
  },
};

/* ══════════════════════════════════════════════════════════
   3. MOTOR DE REPRODUCCIÓN (Player Engine)
══════════════════════════════════════════════════════════ */
const PlayerEngine = {
  _hls: null,
  _currentItem: null,
  _playlist: [],
  _currentIndex: -1,
  _volume: 0.8,
  _muted: false,

  get audioEl() { return document.getElementById('audio-player'); },
  get videoEl() { return document.getElementById('video-player'); },

  /** Reproduce un ítem { title, subtitle, url, type, thumb? } */
  play(item, playlist = [], index = 0) {
    this._currentItem = item;
    this._playlist    = playlist;
    this._currentIndex = index;

    const isVideo   = item.type === 'video' || Utils.isVideoUrl(item.url);
    const isHLS     = Utils.isHLSUrl(item.url);
    const activeEl  = isVideo ? this.videoEl : this.audioEl;
    const inactiveEl = isVideo ? this.audioEl : this.videoEl;

    // Stop inactive
    inactiveEl.pause();
    inactiveEl.src = '';

    // Destroy previous HLS instance
    if (this._hls) { this._hls.destroy(); this._hls = null; }

    if (isHLS && Hls.isSupported()) {
      this._hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      this._hls.loadSource(item.url);
      this._hls.attachMedia(activeEl);
      this._hls.on(Hls.Events.MANIFEST_PARSED, () => activeEl.play().catch(console.warn));
    } else if (isHLS && activeEl.canPlayType('application/vnd.apple.mpegurl')) {
      activeEl.src = item.url;
      activeEl.play().catch(console.warn);
    } else {
      activeEl.src = item.url;
      activeEl.play().catch(e => {
        Utils.showToast('No se pudo reproducir este stream. Verifica la URL.', 'error');
        console.warn('Playback error:', e);
      });
    }

    activeEl.volume = this._volume;
    activeEl.muted  = this._muted;

    this._bindEvents(activeEl);
    this._updateUI(item);
    CinemaEffects.activatePlayback();
  },

  _bindEvents(el) {
    ['timeupdate', 'ended', 'pause', 'play', 'error'].forEach(evt =>
        el.removeEventListener(evt, this._handlers?.[evt])
    );

    this._handlers = {
      timeupdate: () => this._onTimeUpdate(el),
      ended:      () => this._onEnded(),
      pause:      () => this._setPlayIcon(false),
      play:       () => this._setPlayIcon(true),
      error:      () => Utils.showToast('Error de reproducción. Comprueba el stream.', 'error'),
    };

    Object.entries(this._handlers).forEach(([evt, fn]) => el.addEventListener(evt, fn));
  },

  _onTimeUpdate(el) {
    if (!el.duration || !isFinite(el.duration)) return;
    const pct = (el.currentTime / el.duration) * 100;
    document.getElementById('progress-bar-fill').style.width = `${pct}%`;
    document.getElementById('progress-thumb').style.left     = `${pct}%`;
    document.getElementById('progress-bar-container')?.setAttribute('aria-valuenow', Math.round(pct));
  },

  _onEnded() {
    this._setPlayIcon(false);
    // Auto-advance playlist
    if (this._currentIndex < this._playlist.length - 1) {
      this.next();
    } else {
      CinemaEffects.deactivatePlayback();
    }
  },

  _setPlayIcon(playing) {
    document.getElementById('icon-play')?.classList.toggle('hidden', playing);
    document.getElementById('icon-pause')?.classList.toggle('hidden', !playing);
    document.getElementById('btn-play-pause')?.setAttribute('aria-label', playing ? 'Pausar' : 'Reproducir');
  },

  _updateUI(item) {
    // Player bar
    document.getElementById('player-bar')?.classList.remove('translate-y-full');
    document.getElementById('player-title').textContent    = item.title;
    document.getElementById('player-subtitle').textContent = item.subtitle || item.show || item.category || '';

    // Thumbnail
    const thumbWrap = document.getElementById('player-thumb-wrap');
    const thumbImg  = document.getElementById('player-thumb');
    const defIcon   = document.getElementById('player-default-icon');
    const currentProg = EPGEngine.getNowPlaying(item.tvgId, item.title);

    if (item.thumb || item.logo || item.artwork) {
      thumbImg.src = item.thumb || item.logo || item.artwork;
      thumbImg.alt = item.title;
      thumbImg.classList.remove('hidden');
      defIcon.classList.add('hidden');
    } else {
      thumbImg.classList.add('hidden');
      defIcon.classList.remove('hidden');
    }
    
    // Update EPG info if available
    if (currentProg) {
      document.getElementById('player-subtitle').textContent = 
          `AHORA: ${currentProg.title} (${Utils.formatTime((currentProg.stop - new Date()) / 1000)} restantes)`;
    } else {
      document.getElementById('player-subtitle').textContent = 
          item.subtitle || item.group || '';
    }

    // Now playing pill in header
    const pill = document.getElementById('now-playing-pill');
    document.getElementById('now-playing-title').textContent = item.title;
    pill.classList.remove('hidden');
    pill.classList.add('flex');

    // Mark currently playing card
    document.querySelectorAll('.content-card, .podcast-item, .m3u-item').forEach(el => {
      el.classList.toggle('playing', el.dataset.id === item.id);
    });

    this._setPlayIcon(true);
  },

  togglePlay() {
    const el = this._getActiveElement();
    if (!el?.src && !this._hls) return;
    el.paused ? el.play().catch(console.warn) : el.pause();
  },

  toggleMute() {
    this._muted = !this._muted;
    const el = this._getActiveElement();
    if (el) el.muted = this._muted;
    document.getElementById('icon-volume')?.classList.toggle('hidden', this._muted);
    document.getElementById('icon-muted')?.classList.toggle('hidden', !this._muted);
    document.getElementById('btn-mute')?.setAttribute('aria-label', this._muted ? 'Activar sonido' : 'Silenciar');
  },

  setVolume(val) {
    this._volume = Math.min(1, Math.max(0, val / 100));
    const el = this._getActiveElement();
    if (el) el.volume = this._volume;
  },

  next() {
    if (this._currentIndex < this._playlist.length - 1) {
      this._currentIndex++;
      this.play(this._playlist[this._currentIndex], this._playlist, this._currentIndex);
    }
  },

  prev() {
    const el = this._getActiveElement();
    // If more than 3 secs played → restart; else go previous
    if (el && el.currentTime > 3) {
      el.currentTime = 0;
    } else if (this._currentIndex > 0) {
      this._currentIndex--;
      this.play(this._playlist[this._currentIndex], this._playlist, this._currentIndex);
    }
  },

  requestFullscreen() {
    const el = this.videoEl;
    if (el && !this.videoEl.classList.contains('hidden')) {
      (el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen)?.call(el);
    }
  },

  seekTo(pct) {
    const el = this._getActiveElement();
    if (el?.duration) el.currentTime = (pct / 100) * el.duration;
  },

  _getActiveElement() {
    if (!this.audioEl.paused || this.audioEl.src) return this.audioEl;
    if (!this.videoEl.paused || this.videoEl.src)  return this.videoEl;
    return this.audioEl;
  },
};

/* ══════════════════════════════════════════════════════════
   4. EFECTOS CINEMATOGRÁFICOS
══════════════════════════════════════════════════════════ */
const CinemaEffects = {
  _dimmerEnabled: true,
  _grainEnabled:  true,

  activatePlayback() {
    document.body.classList.add('is-playing');
    if (this._dimmerEnabled) {
      document.getElementById('cinematic-dimmer')?.classList.add('active');
    }
  },

  deactivatePlayback() {
    document.body.classList.remove('is-playing');
    document.getElementById('cinematic-dimmer')?.classList.remove('active');
  },

  setDimmer(enabled) {
    this._dimmerEnabled = enabled;
    if (!enabled) document.getElementById('cinematic-dimmer')?.classList.remove('active');
    else if (document.body.classList.contains('is-playing'))
      document.getElementById('cinematic-dimmer')?.classList.add('active');
  },

  setGrain(enabled) {
    this._grainEnabled = enabled;
    const el = document.getElementById('film-grain');
    if (el) el.style.display = enabled ? '' : 'none';
  },
};

/* ══════════════════════════════════════════════════════════
   5. PARSER M3U
══════════════════════════════════════════════════════════ */
const M3UParser = {

  parse(text) {
    const lines   = text.split(/\r?\n/);
    const entries = [];
    let currentMeta = {};

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line === '#EXTM3U') continue;

      if (line.startsWith('#EXTINF')) {
        currentMeta = this._parseMeta(line);
      } else if (!line.startsWith('#')) {
        // URL line
        if (line.length > 0) {
          entries.push({
            id:       `m3u_${i}`,
            title:    currentMeta.title    || `Canal ${entries.length + 1}`,
            logo:     currentMeta.tvgLogo  || '',
            group:    currentMeta.group    || 'Sin grupo',
            url:      line,
            type:     Utils.isVideoUrl(line) || Utils.isHLSUrl(line) ? 'video' : 'audio',
          });
          currentMeta = {};
        }
      }
    }
    return entries;
  },

  _parseMeta(line) {
    const meta   = {};
    const tvgLog = line.match(/tvg-logo="([^"]*)"/i)?.[1] || '';
    const group  = line.match(/group-title="([^"]*)"/i)?.[1] || '';
    const name   = line.match(/tvg-name="([^"]*)"/i)?.[1]   || '';

    // Title: after the comma at the end of #EXTINF line
    const commaIdx = line.lastIndexOf(',');
    const title    = commaIdx >= 0 ? line.slice(commaIdx + 1).trim() : name;

    return { title: title || name, tvgLogo: tvgLog, group };
  },

  async fetchFromUrl(url) {
    const proxyFallbacks = [
      url,
      `https://corsproxy.io/?${encodeURIComponent(url)}`,
    ];

    for (const target of proxyFallbacks) {
      try {
        const res = await fetch(target, { signal: AbortSignal.timeout(10_000) });
        if (!res.ok) continue;
        const text = await res.text();
        if (text.includes('#EXTM3U') || text.includes('#EXTINF')) {
          return this.parse(text);
        }
        // Single-stream URL
        return [{ id: 'm3u_0', title: 'Stream', url, type: Utils.isVideoUrl(url) ? 'video' : 'audio', group: '' }];
      } catch (_) { /* try next */ }
    }
    throw new Error('No se pudo cargar la lista. Verifica la URL o los permisos CORS.');
  },

  async readFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = e => { try { resolve(this.parse(e.target.result)); } catch(err) { reject(err); } };
      reader.onerror = () => reject(new Error('Error al leer el archivo.'));
      reader.readAsText(file, 'UTF-8');
    });
  },
};

/* ══════════════════════════════════════════════════════════
   6. RENDERIZADORES DE SECCIONES
══════════════════════════════════════════════════════════ */
const Renderer = {

  /** Tarjeta de canal (TV / Radio) */
  contentCard(item, playlist) {
    const isLive = item.live;
    return `
      <article class="content-card" data-id="${item.id}"
               role="button" tabindex="0"
               aria-label="Reproducir ${Utils.escapeHtml(item.title)}"
               onclick="CinemaStream.playItem('${item.id}', '${item.type}')"
               onkeydown="if(event.key==='Enter'||event.key===' ')CinemaStream.playItem('${item.id}','${item.type}')">
        <div class="content-card-thumb">
          <img src="${Utils.escapeHtml(item.thumb || item.logo)}"
               alt="${Utils.escapeHtml(item.title)}"
               loading="lazy"
               onerror="this.src='https://placehold.co/480x270/1A1620/F5A623?text=${encodeURIComponent(item.title)}'" />
          <div class="play-overlay" aria-hidden="true">
            <div class="play-overlay-btn">
              <svg class="w-5 h-5 text-cinema-bg ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            </div>
          </div>
          ${isLive ? `<span class="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded">
            <span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>EN VIVO
          </span>` : ''}
        </div>
        <div class="content-card-body">
          <p class="content-card-title">${Utils.escapeHtml(item.title)}</p>
          <div class="content-card-meta">
            ${item.category || item.genre || item.country ? `<span>${Utils.escapeHtml(item.category || item.genre || item.country)}</span>` : ''}
            ${item.viewers  ? `<span>·</span><svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg><span>${item.viewers}</span>` : ''}
            ${item.bitrate  ? `<span>${Utils.escapeHtml(item.bitrate)}</span>` : ''}
          </div>
        </div>
      </article>`;
  },

  /** Item de podcast */
  podcastItem(item, playlist) {
    return `
      <article class="podcast-item" data-id="${item.id}"
               role="button" tabindex="0"
               aria-label="Reproducir ${Utils.escapeHtml(item.title)}"
               onclick="CinemaStream.playItem('${item.id}', 'podcast')"
               onkeydown="if(event.key==='Enter'||event.key===' ')CinemaStream.playItem('${item.id}','podcast')">
        <div class="podcast-artwork">
          <img src="${Utils.escapeHtml(item.artwork)}"
               alt="${Utils.escapeHtml(item.show)}"
               loading="lazy"
               onerror="this.src='https://placehold.co/60x60/221D2B/F5A623?text=POD'" />
        </div>
        <div class="podcast-info">
          <p class="podcast-title">${Utils.escapeHtml(item.title)}</p>
          <p class="podcast-show">${Utils.escapeHtml(item.show)}</p>
          <p class="podcast-meta">${Utils.escapeHtml(item.duration)} · ${Utils.escapeHtml(item.date)}</p>
        </div>
        <button class="podcast-play-btn" aria-label="Reproducir ${Utils.escapeHtml(item.title)}">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        </button>
      </article>`;
  },

  /** Item de lista M3U */
  m3uItem(item, index, playlist) {
    const typeLabel = item.type === 'video' ? 'VIDEO' : 'AUDIO';
    return `
      <div class="m3u-item" data-id="${item.id}"
           role="button" tabindex="0"
           aria-label="Reproducir ${Utils.escapeHtml(item.title)}"
           onclick="CinemaStream.playM3UItem(${index})"
           onkeydown="if(event.key==='Enter'||event.key===' ')CinemaStream.playM3UItem(${index})">
        <span class="m3u-item-index">${index + 1}</span>
        ${item.logo ? `<img src="${Utils.escapeHtml(item.logo)}" alt="" class="w-8 h-8 rounded object-cover flex-shrink-0" loading="lazy" onerror="this.style.display='none'" />` : `<div class="w-8 h-8 rounded bg-cinema-surface border border-cinema-border flex-shrink-0 flex items-center justify-center"><svg class="w-4 h-4 text-cinema-muted" fill="currentColor" viewBox="0 0 24 24"><path d="M18 3v2h-2V3H8v2H6V3H4v18h2v-2h2v2h8v-2h2v2h2V3h-2z"/></svg></div>`}
        <span class="m3u-item-title">${Utils.escapeHtml(item.title)}</span>
        ${item.group ? `<span class="text-xs text-cinema-muted truncate max-w-20 hidden sm:block">${Utils.escapeHtml(item.group)}</span>` : ''}
        <span class="m3u-item-type ${item.type}">${typeLabel}</span>
      </div>`;
  },
};

/* ══════════════════════════════════════════════════════════
   7. NAVEGACIÓN SPA
══════════════════════════════════════════════════════════ */
const Navigation = {
  _currentSection: 'home',

  init() {
    document.querySelectorAll('.nav-item[data-section]').forEach(btn => {
      btn.addEventListener('click', () => this.navigateTo(btn.dataset.section));
    });

    // Hero banner play
    document.getElementById('hero-banner')?.addEventListener('click', () => this.navigateTo('live-tv'));
    document.getElementById('hero-banner')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') this.navigateTo('live-tv');
    });

    // Mobile sidebar toggle
    const toggle   = document.getElementById('sidebar-toggle');
    const sidebar  = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');

    toggle?.addEventListener('click', () => this._toggleMobileSidebar());
    backdrop?.addEventListener('click', () => this._closeMobileSidebar());
  },

  navigateTo(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section-panel').forEach(el => el.classList.add('hidden'));
    // Show target
    const target = document.getElementById(`section-${sectionId}`);
    if (target) {
      target.classList.remove('hidden');
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Update nav state
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.section === sectionId);
    });

    this._currentSection = sectionId;
    this._closeMobileSidebar();
  },

  _toggleMobileSidebar() {
    const sidebar  = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    const btn      = document.getElementById('sidebar-toggle');
    const isOpen   = !sidebar.classList.contains('-translate-x-full');

    sidebar.classList.toggle('-translate-x-full', isOpen);
    sidebar.classList.toggle('translate-x-0',     !isOpen);
    backdrop.classList.toggle('hidden', isOpen);
    btn.setAttribute('aria-expanded', String(!isOpen));
  },

  _closeMobileSidebar() {
    document.getElementById('sidebar')?.classList.add('-translate-x-full');
    document.getElementById('sidebar')?.classList.remove('translate-x-0');
    document.getElementById('sidebar-backdrop')?.classList.add('hidden');
    document.getElementById('sidebar-toggle')?.setAttribute('aria-expanded', 'false');
  },
};

/* ══════════════════════════════════════════════════════════
   8. MÓDULO M3U
══════════════════════════════════════════════════════════ */
const M3UModule = {
  _playlist: [],

  init() {
    // Tab switching
    document.querySelectorAll('.m3u-tab').forEach(tab => {
      tab.addEventListener('click', () => this._switchTab(tab.dataset.target));
    });

    // File input
    const fileInput = document.getElementById('m3u-file-input');
    fileInput?.addEventListener('change', e => this._handleFileSelect(e.target.files[0]));

    // Drag & drop
    const dropZone = document.getElementById('file-drop-zone');
    dropZone?.addEventListener('dragover',  e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone?.addEventListener('dragleave', ()  => dropZone.classList.remove('drag-over'));
    dropZone?.addEventListener('drop',      e  => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) this._handleFileSelect(file);
    });

    // URL enter key
    document.getElementById('m3u-url-input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') CinemaStream.loadM3UFromUrl();
    });
  },

  _switchTab(target) {
    document.querySelectorAll('.m3u-tab').forEach(t => t.classList.toggle('active', t.dataset.target === target));
    document.getElementById('m3u-url-panel')?.classList.toggle('hidden',  target !== 'url');
    document.getElementById('m3u-file-panel')?.classList.toggle('hidden', target !== 'file');
  },

  async loadFromUrl(url) {
    if (!url) { Utils.showToast('Introduce una URL válida', 'error'); return; }
    const btn = document.getElementById('btn-load-url');
    btn.disabled = true;
    btn.textContent = 'Cargando…';

    try {
      this._playlist = await M3UParser.fetchFromUrl(url);
      this._renderPlaylist(`Lista desde URL (${this._playlist.length} elementos)`);
      Utils.showToast(`✓ ${this._playlist.length} canales cargados`, 'success');
    } catch (err) {
      Utils.showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg> Cargar URL`;
    }
  },

  async _handleFileSelect(file) {
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { Utils.showToast('El archivo supera 50 MB', 'error'); return; }

    try {
      this._playlist = await M3UParser.readFromFile(file);
      this._renderPlaylist(`${file.name} (${this._playlist.length} elementos)`);
      Utils.showToast(`✓ ${this._playlist.length} canales importados`, 'success');
    } catch (err) {
      Utils.showToast(err.message, 'error');
    }
  },

  _renderPlaylist(title) {
    document.getElementById('m3u-playlist-title').textContent = title;
    const container = document.getElementById('m3u-playlist-items');
    container.innerHTML = this._playlist
        .map((item, i) => Renderer.m3uItem(item, i, this._playlist))
        .join('');
    document.getElementById('m3u-playlist-container')?.classList.remove('hidden');
  },

  playItem(index) {
    const item = this._playlist[index];
    if (!item) return;
    PlayerEngine.play({ ...item, subtitle: item.group }, this._playlist.map((it, i) => ({ ...it, subtitle: it.group })), index);
  },

  clearPlaylist() {
    this._playlist = [];
    document.getElementById('m3u-playlist-container')?.classList.add('hidden');
    document.getElementById('m3u-url-input').value = '';
    document.getElementById('m3u-file-input').value = '';
    Utils.showToast('Lista borrada', 'info');
  },
};

/* ══════════════════════════════════════════════════════════
   9. MÓDULO DE AJUSTES
══════════════════════════════════════════════════════════ */
const SettingsModule = {
  init() {
    // Dimmer toggle
    document.getElementById('toggle-dimmer')?.addEventListener('click', (e) => {
      const active = this._toggleSwitch(e.currentTarget);
      CinemaEffects.setDimmer(active);
    });

    // Grain toggle
    document.getElementById('toggle-grain')?.addEventListener('click', (e) => {
      const active = this._toggleSwitch(e.currentTarget);
      CinemaEffects.setGrain(active);
    });

    // Animations toggle
    document.getElementById('toggle-animations')?.addEventListener('click', (e) => {
      const active = this._toggleSwitch(e.currentTarget);
      document.documentElement.style.setProperty('--transition-speed', active ? '' : '0s');
      document.getElementById('film-grain').style.animationPlayState = active ? 'running' : 'paused';
    });

    // Volume slider
    const volSlider = document.getElementById('volume-control');
    volSlider?.addEventListener('input', () => {
      document.getElementById('volume-value').textContent = `${volSlider.value}%`;
    });

    // Player volume
    const playerVol = document.getElementById('player-volume');
    playerVol?.addEventListener('input', () => PlayerEngine.setVolume(Number(playerVol.value)));
  },

  _toggleSwitch(el) {
    const isActive = el.classList.toggle('active');
    el.setAttribute('aria-checked', String(isActive));
    return isActive;
  },
};

/* ══════════════════════════════════════════════════════════
   10. BÚSQUEDA GLOBAL
══════════════════════════════════════════════════════════ */
const SearchModule = {
  _allItems: [],

  init() {
    this._allItems = [
      ...DATA.tvChannels,
      ...DATA.radioStations,
      ...DATA.podcasts,
    ];

    const input = document.getElementById('global-search');
    let debounce;
    input?.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => this._search(input.value.trim()), 250);
    });
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { input.value = ''; this._clearSearch(); }
    });
  },

  _search(query) {
    if (!query) { this._clearSearch(); return; }
    const q = query.toLowerCase();
    const results = this._allItems.filter(item =>
        (item.title && item.title.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.genre && item.genre.toLowerCase().includes(q)) ||
        (item.show && item.show.toLowerCase().includes(q))
    );
    this._renderResults(results);
  },

  _renderResults(results) {
    let container = document.getElementById('search-results-dropdown');
    if (!container) {
      container = document.createElement('div');
      container.id = 'search-results-dropdown';
      container.className = 'absolute top-full left-0 right-0 mt-2 bg-cinema-surface border border-cinema-border rounded-xl shadow-2xl max-h-96 overflow-y-auto z-50 p-2 divide-y divide-cinema-border/50';
      document.getElementById('global-search')?.parentElement?.appendChild(container);
    }
    if (results.length === 0) {
      container.innerHTML = `<div class="p-4 text-center text-sm text-cinema-muted">No se encontraron resultados</div>`;
      container.classList.remove('hidden');
      return;
    }
    container.innerHTML = results.slice(0, 8).map(item => `
      <div class="flex items-center gap-3 p-2.5 rounded-lg hover:bg-cinema-card cursor-pointer transition-colors"
           onclick="SearchModule._selectResult('${item.id}', '${item.type || 'audio'}')">
        <img src="${item.thumb || item.logo || item.artwork || 'https://placehold.co/40x40'}" alt="" class="w-10 h-10 rounded object-cover flex-shrink-0" />
        <div class="overflow-hidden">
          <p class="text-sm font-medium text-cinema-text truncate">${Utils.escapeHtml(item.title)}</p>
          <p class="text-xs text-cinema-muted truncate">${Utils.escapeHtml(item.category || item.genre || item.show || '')}</p>
        </div>
      </div>
    `).join('');
    container.classList.remove('hidden');
  },

  _selectResult(id, type) {
    const item = this._allItems.find(i => i.id === id);
    if (!item) return;
    PlayerEngine.play(item, this._allItems, this._allItems.indexOf(item));
    this._clearSearch();
  },

  _clearSearch() {
    const container = document.getElementById('search-results-dropdown');
    if (container) container.classList.add('hidden');
    const input = document.getElementById('global-search');
    if (input) input.value = '';
  },
};

/* ══════════════════════════════════════════════════════════
   11. CONTROLADOR PRINCIPAL (CinemaStream)
══════════════════════════════════════════════════════════ */
const CinemaStream = {
  init() {
    Navigation.init();
    M3UModule.init();
    SettingsModule.init();
    SearchModule.init();
    this._renderHome();
    this._renderLiveTV();
    this._renderRadio();
    this._renderPodcasts();
    console.info('[CinemaStream] ✓ Aplicación inicializada correctamente.');
  },

  _renderHome() {
    // Render featured or home sections if needed
  },

  _renderLiveTV() {
    const container = document.getElementById('tv-grid');
    if (container) {
      container.innerHTML = DATA.tvChannels.map(ch => Renderer.contentCard(ch, DATA.tvChannels)).join('');
    }
  },

  _renderRadio() {
    const container = document.getElementById('radio-grid');
    if (container) {
      container.innerHTML = DATA.radioStations.map(st => Renderer.contentCard(st, DATA.radioStations)).join('');
    }
  },

  _renderPodcasts() {
    const container = document.getElementById('podcast-list');
    if (container) {
      container.innerHTML = DATA.podcasts.map(pod => Renderer.podcastItem(pod, DATA.podcasts)).join('');
    }
  },

  playItem(id, type) {
    let list = [];
    if (type === 'video' || DATA.tvChannels.some(c => c.id === id)) list = DATA.tvChannels;
    else if (DATA.radioStations.some(r => r.id === id)) list = DATA.radioStations;
    else if (DATA.podcasts.some(p => p.id === id)) list = DATA.podcasts;

    const index = list.findIndex(i => i.id === id);
    if (index !== -1) {
      PlayerEngine.play(list[index], list, index);
    }
  },

  playM3UItem(index) {
    M3UModule.playItem(index);
  },

  loadM3UFromUrl() {
    const url = document.getElementById('m3u-url-input')?.value.trim();
    M3UModule.loadFromUrl(url);
    if (result.epgUrl) {
      EPGEngine.loadEPG(result.epgUrl);
    }
  }
};

// Inicializar al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
  CinemaStream.init();
});