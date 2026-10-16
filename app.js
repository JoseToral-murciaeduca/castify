/**
 * Castify — app.js
 * Arquitectura modular limpia, optimizada y sin errores de ejecución.
 */

const DATA = {
  tvChannels: [
    { id: 'tv1', title: 'La 1', category: 'Noticias', logo: 'https://scontent.frmu1-1.fna.fbcdn.net/v/t39.30808-1/768537402_1611952793634767_3240080017570276969_n.jpg?stp=c569.554.910.909a_dst-jpg_s200x200_tt6&_nc_cat=1&ccb=1-7&_nc_sid=08baa4&_nc_ohc=-QW0K3Zc2vEQ7kNvwGTqFdc&_nc_oc=AdqRfZc80zJitwAxnoWcmEc3uBqY1bIuAcEHLwn73rfiwqRPV2soyEmLBnVYIHjfxW8&_nc_zt=24&_nc_ht=scontent.frmu1-1.fna&edm=AKsJ254EAAAA&_nc_gid=ozw0bgsDtZ9Kk1StnRBnaA&oh=00_AQPZElQN-1YnIIe30aCS2VRQhPdo_pycJpVw4AT9BMMibQ&oe=6AD85531', thumb: 'https://placehold.co/480x270/1A1620/F5A623?text=Noticias+24', url: 'https://rtvelivestream.rtve.es/rtvesec/la1/la1_main_dvr.m3u8', type: 'video', live: true, viewers: '12.4K' },
    { id: 'tv2', title: 'Deportes Total', category: 'Deportes', logo: 'https://placehold.co/80x80/1A1620/F5A623?text=DT', thumb: 'https://placehold.co/480x270/1A1620/F5A623?text=Deportes+Total', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', type: 'video', live: true, viewers: '8.1K' },
    { id: 'tv3', title: 'Cine Clásico', category: 'Entretenimiento', logo: 'https://placehold.co/80x80/1A1620/F5A623?text=CC', thumb: 'https://placehold.co/480x270/1A1620/F5A623?text=Cine+Clásico', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', type: 'video', live: true, viewers: '3.7K' }
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
  showToast(msg, type = 'info') {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `px-4 py-2 rounded-lg text-sm text-white bg-cinema-card border border-cinema-border shadow-lg transition-all`;
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3000);
  },
  escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  },
  isVideoUrl(url) {
    return ['.mp4', '.webm', '.mkv', '.m3u8'].some(ext => (url || '').toLowerCase().includes(ext));
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

  play(item, playlist = [], index = 0) {
    this._currentItem = item;
    this._playlist = playlist;
    this._currentIndex = index;

    const isVideo = item.type === 'video' || Utils.isVideoUrl(item.url);
    const activeEl = isVideo ? this.videoEl : this.audioEl;
    const inactiveEl = isVideo ? this.audioEl : this.videoEl;

    inactiveEl.pause();
    inactiveEl.src = '';

    if (this._hls) { this._hls.destroy(); this._hls = null; }

    if (item.url.includes('.m3u8') && Hls.isSupported()) {
      this._hls = new Hls();
      this._hls.loadSource(item.url);
      this._hls.attachMedia(activeEl);
      this._hls.on(Hls.Events.MANIFEST_PARSED, () => activeEl.play().catch(console.warn));
    } else {
      activeEl.src = item.url;
      activeEl.play().catch(e => Utils.showToast('Error de reproducción', 'error'));
    }

    activeEl.volume = this._volume;
    activeEl.muted = this._muted;
    this._bindEvents(activeEl);
    this._updateUI(item);
    CinemaEffects.activatePlayback(isVideo);
  },

  _bindEvents(el) {
    el.ontimeupdate = () => {
      if (!el.duration) return;
      const pct = (el.currentTime / el.duration) * 100;
      document.getElementById('progress-bar-fill').style.width = `${pct}%`;
    };
    el.onended = () => this.next();
    el.onplay = () => this._setPlayIcon(true);
    el.onpause = () => this._setPlayIcon(false);
  },

  _setPlayIcon(playing) {
    document.getElementById('icon-play')?.classList.toggle('hidden', playing);
    document.getElementById('icon-pause')?.classList.toggle('hidden', !playing);
  },

  _updateUI(item) {
    document.getElementById('player-bar')?.classList.remove('translate-y-full');
    document.getElementById('player-title').textContent = item.title;
    document.getElementById('player-subtitle').textContent = item.subtitle || item.category || item.genre || 'Castify Stream';

    const thumbImg = document.getElementById('player-thumb');
    const defIcon = document.getElementById('player-default-icon');

    if (item.thumb || item.logo || item.artwork) {
      thumbImg.src = item.thumb || item.logo || item.artwork;
      thumbImg.classList.remove('hidden');
      defIcon.classList.add('hidden');
    } else {
      thumbImg.classList.add('hidden');
      defIcon.classList.remove('hidden');
    }

    document.getElementById('now-playing-title').textContent = item.title;
    document.getElementById('now-playing-pill').classList.remove('hidden');
    document.getElementById('now-playing-pill').classList.add('flex');
  },

  togglePlay() {
    const el = this._getActiveElement();
    if (!el.src && !this._hls) return;
    el.paused ? el.play().catch(console.warn) : el.pause();
  },

  toggleMute() {
    this._muted = !this._muted;
    const el = this._getActiveElement();
    if (el) el.muted = this._muted;
    document.getElementById('icon-volume')?.classList.toggle('hidden', this._muted);
    document.getElementById('icon-muted')?.classList.toggle('hidden', !this._muted);
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
    if (this._currentIndex > 0) {
      this._currentIndex--;
      this.play(this._playlist[this._currentIndex], this._playlist, this._currentIndex);
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
    if (isVideo) document.getElementById('cinematic-dimmer')?.classList.add('active');
  },
  deactivatePlayback() {
    document.getElementById('cinematic-dimmer')?.classList.remove('active');
  }
};

const Navigation = {
  init() {
    document.querySelectorAll('.nav-item[data-section]').forEach(btn => {
      btn.addEventListener('click', () => this.navigateTo(btn.dataset.section));
    });
  },
  navigateTo(sectionId) {
    document.querySelectorAll('.section-panel').forEach(el => el.classList.add('hidden'));
    document.getElementById(`section-${sectionId}`)?.classList.remove('hidden');
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.section === sectionId);
    });
  }
};

const M3UModule = {
  _playlist: [],
  init() {
    document.querySelectorAll('.m3u-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.target;
        document.querySelectorAll('.m3u-tab').forEach(t => t.classList.remove('bg-cinema-card', 'text-cinema-amber'));
        tab.classList.add('bg-cinema-card', 'text-cinema-amber');
        document.getElementById('m3u-url-panel').classList.toggle('hidden', target !== 'url');
        document.getElementById('m3u-file-panel').classList.toggle('hidden', target !== 'file');
      });
    });

    document.getElementById('m3u-file-input')?.addEventListener('change', e => this._readFromFile(e.target.files[0]));
    const dropZone = document.getElementById('file-drop-zone');
    dropZone?.addEventListener('click', () => document.getElementById('m3u-file-input').click());
  },

  async loadFromUrl(url) {
    if (!url) return Utils.showToast('Introduce una URL válida');
    try {
      const res = await fetch(url);
      const text = await res.text();
      this._parseAndRender(text, 'Lista desde URL');
    } catch (_) {
      Utils.showToast('Error al descargar la lista M3U', 'error');
    }
  },

  _readFromFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => this._parseAndRender(e.target.result, file.name);
    reader.readAsText(file);
  },

  _parseAndRender(text, name) {
    const lines = text.split(/\r?\n/);
    this._playlist = [];
    let currentTitle = '';

    lines.forEach((line, i) => {
      line = line.trim();
      if (line.startsWith('#EXTINF:')) {
        currentTitle = line.split(',')[1] || `Canal ${this._playlist.length + 1}`;
      } else if (line && !line.startsWith('#')) {
        this._playlist.push({
          id: `m3u_${i}`,
          title: currentTitle || `Canal ${this._playlist.length + 1}`,
          url: line,
          type: Utils.isVideoUrl(line) ? 'video' : 'audio'
        });
        currentTitle = '';
      }
    });

    const itemsContainer = document.getElementById('m3u-playlist-items');
    itemsContainer.innerHTML = this._playlist.map((item, idx) => `
      <div class="p-3 bg-cinema-card rounded-lg flex items-center justify-between cursor-pointer hover:border hover:border-cinema-amber" onclick="M3UModule.play(${idx})">
        <span class="text-sm font-medium text-cinema-text">${Utils.escapeHtml(item.title)}</span>
        <span class="text-xs text-cinema-amber uppercase">${item.type}</span>
      </div>
    `).join('');

    document.getElementById('m3u-playlist-container').classList.remove('hidden');
    document.getElementById('m3u-playlist-title').textContent = `${name} (${this._playlist.length} elementos)`;
    Utils.showToast(`Cargados ${this._playlist.length} canales`);
  },

  play(index) {
    const item = this._playlist[index];
    if (item) PlayerEngine.play(item, this._playlist, index);
  },

  clearPlaylist() {
    this._playlist = [];
    document.getElementById('m3u-playlist-container').classList.add('hidden');
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
    Navigation.init();
    M3UModule.init();

    document.getElementById('featured-channels').innerHTML = DATA.tvChannels.map(Renderer.renderCard).join('');
    document.getElementById('tv-grid').innerHTML = DATA.tvChannels.map(Renderer.renderCard).join('');
    document.getElementById('radio-grid').innerHTML = DATA.radioStations.map(Renderer.renderCard).join('');
    document.getElementById('podcast-list').innerHTML = DATA.podcasts.map(Renderer.renderCard).join('');
  },

  playItem(id) {
    const all = [...DATA.tvChannels, ...DATA.radioStations, ...DATA.podcasts];
    const item = all.find(i => i.id === id);
    if (item) PlayerEngine.play(item, all, all.indexOf(item));
  },

  loadM3UFromUrl() {
    const url = document.getElementById('m3u-url-input')?.value.trim();
    M3UModule.loadFromUrl(url);
  }
};

document.addEventListener('DOMContentLoaded', () => CinemaStream.init());