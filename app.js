/**
 * — Castify — app.js
 * Arquitectura modular limpia, optimizada y conectada al index.html original.
 */

const DATA = {
  tvChannels: [
    { id: 'tv1', title: 'La 1', category: 'Nacional', logo: 'https://scontent.frmu1-1.fna.fbcdn.net/v/t39.30808-1/768537402_1611952793634767_3240080017570276969_n.jpg?stp=c569.554.910.909a_dst-jpg_s200x200_tt6&_nc_cat=1&ccb=1-7&_nc_sid=08baa4&_nc_ohc=-QW0K3Zc2vEQ7kNvwGTqFdc&_nc_oc=AdqRfZc80zJitwAxnoWcmEc3uBqY1bIuAcEHLwn73rfiwqRPV2soyEmLBnVYIHjfxW8&_nc_zt=24&_nc_ht=scontent.frmu1-1.fna&edm=AKsJ254EAAAA&_nc_gid=ozw0bgsDtZ9Kk1StnRBnaA&oh=00_AQPZElQN-1YnIIe30aCS2VRQhPdo_pycJpVw4AT9BMMibQ&oe=6AD85531', thumb: 'https://scontent.frmu1-1.fna.fbcdn.net/v/t39.30808-1/768537402_1611952793634767_3240080017570276969_n.jpg?stp=c569.554.910.909a_dst-jpg_s200x200_tt6&_nc_cat=1&ccb=1-7&_nc_sid=08baa4&_nc_ohc=-QW0K3Zc2vEQ7kNvwGTqFdc&_nc_oc=AdqRfZc80zJitwAxnoWcmEc3uBqY1bIuAcEHLwn73rfiwqRPV2soyEmLBnVYIHjfxW8&_nc_zt=24&_nc_ht=scontent.frmu1-1.fna&edm=AKsJ254EAAAA&_nc_gid=ozw0bgsDtZ9Kk1StnRBnaA&oh=00_AQPZElQN-1YnIIe30aCS2VRQhPdo_pycJpVw4AT9BMMibQ&oe=6AD85531', url: 'https://rtvelivestream.rtve.es/rtvesec/la1/la1_main_dvr.m3u8', type: 'video', live: true, viewers: '12.4K' },
    { id: 'tv2', title: 'Deportes Total', category: 'Deportes', logo: 'https://placehold.co/80x80/1A1620/F5A623?text=DT', thumb: 'https://placehold.co/480x270/1A1620/F5A623?text=Deportes+Total', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', type: 'video', live: true, viewers: '8.1K' },
    { id: 'tv3', title: 'Cine Clásico', category: 'Entretenimiento', logo: 'https://placehold.co/80x80/1A1620/F5A623?text=CC', thumb: 'https://placehold.co/480x270/1A1620/F5A623?text=Cine+Cl%C3%A1sico', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', type: 'video', live: true, viewers: '3.7K' },
    { id: 'tv4', title: 'Documental HD', category: 'Documentales', logo: 'https://placehold.co/80x80/1A1620/F5A623?text=DC', thumb: 'https://placehold.co/480x270/1A1620/F5A623?text=Documental+HD', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', type: 'video', live: true, viewers: '2.2K' }
  ],
  radioStations: [
    { id: 'r1', title: 'Radio Ámbar', genre: 'Pop', logo: 'https://placehold.co/80x80/221D2B/F5A623?text=RA', url: 'https://streams.ilovemusic.de/iloveradio2.mp3', type: 'audio', bitrate: '320kbps' },
    { id: 'r2', title: 'Jazz Noir', genre: 'Jazz', logo: 'https://placehold.co/80x80/221D2B/D4A843?text=JN', url: 'https://streams.ilovemusic.de/iloveradio1.mp3', type: 'audio', bitrate: '192kbps' }
  ],
  podcasts: [
    { id: 'p1', title: 'El Futuro de la IA', show: 'TechTalks', artwork: 'https://placehold.co/60x60/221D2B/F5A623?text=TT', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', type: 'audio', duration: '42:18', date: 'Hace 2 días' }
  ]
};

const Utils = {
  showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const icons = {
      info: `<svg class="w-4 h-4 text-cinema-amber flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>`,
      success: `<svg class="w-4 h-4 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`,
      error: `<svg class="w-4 h-4 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`,
    };
    const toast = document.createElement('div');
    toast.className = `px-4 py-3 rounded-xl text-sm text-white bg-cinema-card border border-cinema-border shadow-xl flex items-center gap-2 transition-all`;
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
  formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) return '–:––';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  },
  escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  },
  isVideoUrl(url) {
    const videoExts = ['.mp4', '.webm', '.mkv', '.avi', '.m4v', '.mov', '.ts', '.m3u8'];
    const u = (url || '').toLowerCase().split('?')[0];
    return videoExts.some(ext => u.includes(ext));
  }
};

const PlayerEngine = {
  _hls: null,
  _currentItem: null,
  _playlist: [],
  _currentIndex: -1,
  _volume: 0.8,
  _muted: false,

  get audioEl() { return document.getElementById('audio-player'); },
  get videoEl() { return document.getElementById('video-player'); },
  get cpVideoEl() { return document.getElementById('cp-video'); },
  get cpAudioEl() { return document.getElementById('cp-audio'); },

  play(item, playlist = [], index = 0) {
    this._currentItem = item;
    this._playlist = playlist;
    this._currentIndex = index;

    const isVideo = item.type === 'video' || Utils.isVideoUrl(item.url);
    const isHLS = item.url.includes('.m3u8');
    const activeEl = isVideo ? this.videoEl : this.audioEl;
    const inactiveEl = isVideo ? this.audioEl : this.videoEl;

    inactiveEl.pause();
    inactiveEl.src = '';

    this.videoEl.classList.toggle('hidden', !isVideo);

    if (this._hls) { this._hls.destroy(); this._hls = null; }

    if (isHLS && Hls.isSupported()) {
      this._hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      this._hls.loadSource(item.url);
      this._hls.attachMedia(activeEl);
      this._hls.on(Hls.Events.MANIFEST_PARSED, () => activeEl.play().catch(console.warn));
    } else {
      activeEl.src = item.url;
      activeEl.play().catch(e => {
        Utils.showToast('No se pudo reproducir este stream.', 'error');
        console.warn('Playback error:', e);
      });
    }

    activeEl.volume = this._volume;
    activeEl.muted = this._muted;

    this._bindEvents(activeEl);
    this._updateUI(item);
    CinemaEffects.activatePlayback(isVideo);
  },

  _bindEvents(el) {
    ['timeupdate', 'ended', 'pause', 'play', 'error'].forEach(evt =>
        el.removeEventListener(evt, this._handlers?.[evt])
    );

    this._handlers = {
      timeupdate: () => {
        if (!el.duration || !isFinite(el.duration)) return;
        const pct = (el.currentTime / el.duration) * 100;
        const fill = document.getElementById('progress-bar-fill');
        const thumb = document.getElementById('progress-thumb');
        if (fill) fill.style.width = `${pct}%`;
        if (thumb) thumb.style.left = `${pct}%`;

        const curTime = document.getElementById('cp-time-current');
        const totTime = document.getElementById('cp-time-total');
        if (curTime) curTime.textContent = Utils.formatTime(el.currentTime);
        if (totTime) totTime.textContent = Utils.formatTime(el.duration);
      },
      ended: () => this.next(),
      pause: () => this._setPlayIcon(false),
      play: () => this._setPlayIcon(true),
      error: () => Utils.showToast('Error de reproducción en el stream.', 'error'),
    };

    Object.entries(this._handlers).forEach(([evt, fn]) => el.addEventListener(evt, fn));
  },

  _setPlayIcon(playing) {
    document.getElementById('icon-play')?.classList.toggle('hidden', playing);
    document.getElementById('icon-pause')?.classList.toggle('hidden', !playing);
    document.getElementById('cp-icon-play')?.classList.toggle('hidden', playing);
    document.getElementById('cp-icon-pause')?.classList.toggle('hidden', !playing);
  },

  _updateUI(item) {
    document.getElementById('player-bar')?.classList.remove('translate-y-full');
    document.getElementById('player-title').textContent = item.title;
    document.getElementById('player-subtitle').textContent = item.subtitle || item.show || item.category || item.genre || '';

    const thumbImg = document.getElementById('player-thumb');
    const defIcon = document.getElementById('player-default-icon');

    if (item.thumb || item.logo || item.artwork) {
      thumbImg.src = item.thumb || item.logo || item.artwork;
      thumbImg.classList.remove('hidden');
      if (defIcon) defIcon.classList.add('hidden');
    } else {
      if (thumbImg) thumbImg.classList.add('hidden');
      if (defIcon) defIcon.classList.remove('hidden');
    }

    const pill = document.getElementById('now-playing-pill');
    const nowTitle = document.getElementById('now-playing-title');
    if (nowTitle) nowTitle.textContent = item.title;
    if (pill) {
      pill.classList.remove('hidden');
      pill.classList.add('flex');
    }

    const noSource = document.getElementById('cp-no-source');
    if (noSource) noSource.classList.add('hidden');
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
    document.getElementById('cp-icon-volume')?.classList.toggle('hidden', this._muted);
    document.getElementById('cp-icon-muted')?.classList.toggle('hidden', !this._muted);
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
    if (el && el.currentTime > 3) {
      el.currentTime = 0;
    } else if (this._currentIndex > 0) {
      this._currentIndex--;
      this.play(this._playlist[this._currentIndex], this._playlist, this._currentIndex);
    }
  },

  requestFullscreen() {
    const el = this.videoEl;
    if (el && !el.classList.contains('hidden')) {
      (el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen)?.call(el);
    }
  },

  seekTo(pct) {
    const el = this._getActiveElement();
    if (el?.duration) el.currentTime = (pct / 100) * el.duration;
  },

  _getActiveElement() {
    return (!this.videoEl.paused || this.videoEl.src) ? this.videoEl : this.audioEl;
  }
};

const CinemaEffects = {
  activatePlayback(isVideo) {
    document.body.classList.add('is-playing', 'cinema-active');
  },
  deactivatePlayback() {
    document.body.classList.remove('is-playing', 'cinema-active');
  }
};

const Navigation = {
  init() {
    document.querySelectorAll('.nav-item[data-section]').forEach(btn => {
      btn.addEventListener('click', () => this.navigateTo(btn.dataset.section));
    });

    const toggle = document.getElementById('sidebar-toggle');
    const backdrop = document.getElementById('sidebar-backdrop');

    toggle?.addEventListener('click', () => this._toggleMobileSidebar());
    backdrop?.addEventListener('click', () => this._closeMobileSidebar());
  },

  navigateTo(sectionId) {
    document.querySelectorAll('.section-panel').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById(`section-${sectionId}`);
    if (target) {
      target.classList.remove('hidden');
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.section === sectionId);
    });

    this._closeMobileSidebar();
  },

  _toggleMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    const isOpen = !sidebar.classList.contains('-translate-x-full');

    sidebar.classList.toggle('-translate-x-full', isOpen);
    sidebar.classList.toggle('translate-x-0', !isOpen);
    backdrop.classList.toggle('hidden', isOpen);
  },

  _closeMobileSidebar() {
    document.getElementById('sidebar')?.classList.add('-translate-x-full');
    document.getElementById('sidebar')?.classList.remove('translate-x-0');
    document.getElementById('sidebar-backdrop')?.classList.add('hidden');
  }
};

const M3UModule = {
  _playlist: [],

  init() {
    if (window.cinemaPlayer) {
      window.cinemaPlayer.init();
      this.player = window.cinemaPlayer;
    }

    document.querySelectorAll('.m3u-tab, .m3u-import-tab').forEach(tab => {
      tab.addEventListener('click', () => this._switchTab(tab.dataset.target));
    });

    const fileInput = document.getElementById('m3u-file-input');
    fileInput?.addEventListener('change', e => this._handleFileSelect(e.target.files[0]));

    const dropZone = document.getElementById('file-drop-zone') || document.getElementById('m3u-drop-zone');
    dropZone?.addEventListener('click', () => fileInput?.click());

    document.getElementById('btn-load-url')?.addEventListener('click', () => CinemaStream.loadM3UFromUrl());
    document.getElementById('m3u-btn-load-url')?.addEventListener('click', () => CinemaStream.loadM3UFromUrl());
  },

  _switchTab(target) {
    document.querySelectorAll('.m3u-tab, .m3u-import-tab').forEach(t => t.classList.toggle('active', t.dataset.target === target));
    document.getElementById('m3u-url-panel')?.classList.toggle('hidden', target !== 'url');
    document.getElementById('m3u-file-panel')?.classList.toggle('hidden', target !== 'file');
  },

  async loadFromUrl(url) {
    if (!url) { Utils.showToast('Introduce una URL válida', 'error'); return; }
    try {
      const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
      const text = await res.text();
      this._parseAndRender(text, 'Lista M3U por URL');
    } catch (_) {
      Utils.showToast('Error al descargar la lista M3U', 'error');
    }
  },

  _handleFileSelect(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => this._parseAndRender(e.target.result, file.name);
    reader.readAsText(file, 'UTF-8');
  },

  _parseAndRender(text, title) {
    const lines = text.split(/\r?\n/);
    this._playlist = [];
    let currentTitle = '';
    let currentLogo = '';

    lines.forEach((line, i) => {
      line = line.trim();
      if (line.startsWith('#EXTINF:')) {
        const commaIdx = line.lastIndexOf(',');
        currentTitle = commaIdx >= 0 ? line.slice(commaIdx + 1).trim() : `Canal ${this._playlist.length + 1}`;
        const logoMatch = line.match(/tvg-logo="([^"]*)"/i);
        currentLogo = logoMatch ? logoMatch[1] : '';
      } else if (line && !line.startsWith('#')) {
        this._playlist.push({
          id: `m3u_${i}`,
          title: currentTitle || `Canal ${this._playlist.length + 1}`,
          logo: currentLogo,
          url: line,
          type: Utils.isVideoUrl(line) ? 'video' : 'audio'
        });
        currentTitle = '';
        currentLogo = '';
      }
    });

    const container = document.getElementById('m3u-playlist-items') || document.getElementById('m3u-channel-list');
    if (container) {
      container.innerHTML = this._playlist.map((item, idx) => `
        <div class="p-3 bg-cinema-card rounded-lg flex items-center justify-between cursor-pointer hover:border hover:border-cinema-amber transition-colors" onclick="M3UModule.play(${idx})">
          <span class="text-sm font-medium text-cinema-text truncate">${Utils.escapeHtml(item.title)}</span>
          <span class="text-xs text-cinema-amber uppercase">${item.type}</span>
        </div>
      `).join('');
    }

    document.getElementById('m3u-playlist-container')?.classList.remove('hidden');
    document.getElementById('m3u-player-section')?.classList.remove('hidden');
    const titleEl = document.getElementById('m3u-playlist-title');
    if (titleEl) titleEl.textContent = `${title} (${this._playlist.length} elementos)`;
    Utils.showToast(`✓ ${this._playlist.length} elementos cargados`, 'success');
  },

  play(index) {
    const item = this._playlist[index];
    if (item) PlayerEngine.play(item, this._playlist, index);
  },

  clearPlaylist() {
    this._playlist = [];
    document.getElementById('m3u-playlist-container')?.classList.add('hidden');
    document.getElementById('m3u-player-section')?.classList.add('hidden');
    Utils.showToast('Lista borrada', 'info');
  }
};

const Renderer = {
  renderCard(item) {
    return `
      <div class="bg-cinema-card border border-cinema-border rounded-xl p-4 flex gap-4 items-center cursor-pointer hover:border-cinema-amber transition-colors" onclick="CinemaStream.playItem('${item.id}')">
        <img src="${item.thumb || item.logo || item.artwork}" class="w-16 h-16 rounded-lg object-cover flex-shrink-0" onerror="this.src='https://placehold.co/80x80/1A1620/F5A623?text=CS'" />
        <div class="min-w-0">
          <p class="font-semibold text-cinema-text truncate">${Utils.escapeHtml(item.title)}</p>
          <p class="text-xs text-cinema-muted truncate">${Utils.escapeHtml(item.category || item.genre || item.show || '')}</p>
        </div>
      </div>
    `;
  }
};

const CinemaStream = {
  init() {
    if (window.cinemaPlayer) {
      window.cinemaPlayer.init();
      this.player = window.cinemaPlayer;
    }

    Navigation.init();
    M3UModule.init();

    const feat = document.getElementById('featured-channels');
    const tvGrid = document.getElementById('tv-channels-grid') || document.getElementById('tv-grid');
    const radioGrid = document.getElementById('radio-grid');
    const podcastList = document.getElementById('podcasts-list') || document.getElementById('podcast-list');

    if (feat) feat.innerHTML = DATA.tvChannels.map(Renderer.renderCard).join('');
    if (tvGrid) tvGrid.innerHTML = DATA.tvChannels.map(Renderer.renderCard).join('');
    if (radioGrid) radioGrid.innerHTML = DATA.radioStations.map(Renderer.renderCard).join('');
    if (podcastList) podcastList.innerHTML = DATA.podcasts.map(Renderer.renderCard).join('');
  },
  
  navigateTo(sectionId) {
    Navigation.navigateTo(sectionId);
  },

  player: {
    togglePlay() {
      PlayerEngine.togglePlay();
    },
    next() {
      PlayerEngine.next();
    },
    prev() {
      PlayerEngine.prev();
    },
    toggleMute(){
      PlayerEngine.toggleMute();
    },
    requestFullscreen() {
      PlayerEngine.requestFullscreen();
    }
  },

  playItem(id) {
    const all = [...DATA.tvChannels, ...DATA.radioStations, ...DATA.podcasts];
    const item = all.find(i => i.id === id);
    if (item) {
      PlayerEngine.play(item, all, all.indexOf(item));
    }
  },

  loadM3UFromUrl() {
    const url = document.getElementById('m3u-url-input')?.value.trim();
    M3UModule.loadFromUrl(url);
  }
};

document.addEventListener('DOMContentLoaded', () => CinemaStream.init());