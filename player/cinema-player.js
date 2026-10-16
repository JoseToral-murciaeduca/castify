/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║ Castify · player/cinema-player.js                                ║
 * ║ Motor de Reproducción Cinematográfico — JavaScript Puro          ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║ Responsabilidades:                                               ║
 * ║ 1. Gestionar la reproducción de vídeo y audio                    ║
 * ║ 2. Soporte HLS nativo mediante hls.js                            ║
 * ║ 3. Controles personalizados: play/pausa, barra de progreso,      ║
 * ║    volumen, silencio, pantalla completa, velocidad               ║
 * ║ 4. Activar/desactivar el modo cine cinematográfico               ║
 * ║ 5. Emitir eventos al sistema para sincronizar la UI global       ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Dependencias externas:
 *   - hls.js (window.Hls) → https://cdn.jsdelivr.net/npm/hls.js@latest
 *
 * NO depende de ningún framework (Vanilla JS puro, ES2020+).
 */

'use strict';

/* ─────────────────────────────────────────────────────────────────
   SECCIÓN 1 · CONFIGURACIÓN DEL REPRODUCTOR
───────────────────────────────────────────────────────────────── */

/** Opciones por defecto del reproductor */
const PLAYER_DEFAULTS = {
  volume: 0.8,            // Volumen inicial (0.0 – 1.0)
  muted: false,           // ¿Iniciar silenciado?
  autoplay: true,         // ¿Reproducir al cargar?
  dimmerOpacity: 0.55,    // Opacidad del cinematic dimmer
  dimmerTransition: 700,  // Duración (ms) de la transición del dimmer
  seekStep: 10,           // Segundos que avanza/retrocede la tecla de flecha
  volumeStep: 0.05,       // Paso de incremento del volumen con teclado
};

/** Opciones de HLS.js para optimizar streams en vivo */
const HLS_CONFIG = {
  enableWorker: true,
  lowLatencyMode: true,
  maxBufferLength: 30,
  maxMaxBufferLength: 60,
  liveSyncDurationCount: 3,
  liveMaxLatencyDurationCount: 10,
  manifestLoadingMaxRetry: 3,
  levelLoadingMaxRetry: 3,
  fragLoadingMaxRetry: 3,
};


/* ─────────────────────────────────────────────────────────────────
   SECCIÓN 2 · CLASE PRINCIPAL DEL REPRODUCTOR
───────────────────────────────────────────────────────────────── */

class CinemaPlayer {

  constructor(options = {}) {
    this._opts = { ...PLAYER_DEFAULTS, ...options };
    this._state = {
      currentChannel: null,
      playlist: [],
      playlistIndex: -1,
      isPlaying: false,
      isMuted: false,
      volume: this._opts.volume,
      isDimmerActive: false,
      isCinemaMode: false,
      hlsInstance: null,
      updateTimer: null,
    };
    this._dom = {};
    this._listeners = new Map();
  }

  init() {
    this._dom = {
      // Elementos multimedia nativos
      videoEl: this._q('#cp-video') || this._q('#video-player'),
      audioEl: this._q('#cp-audio') || this._q('#audio-player'),
      playerWrap: this._q('#cinema-player-wrap'),
      screenWrap: this._q('#cp-screen-wrap'),
      loadingOverlay: this._q('#cp-loading'),
      errorOverlay: this._q('#cp-error'),
      errorMsg: this._q('#cp-error-msg'),
      noSourceOverlay: this._q('#cp-no-source'),

      // Información del canal
      channelTitle: this._q('#cp-channel-title'),
      channelGroup: this._q('#cp-channel-group'),
      channelLogo: this._q('#cp-channel-logo'),
      liveBadge: this._q('#cp-live-badge'),
      streamType: this._q('#cp-stream-type'),

      // Botones unificados (busca tanto el prefijo cp- como los globales de la barra inferior)
      btnPlayPause: this._q('#cp-btn-play-pause') || this._q('#btn-play-pause'),
      btnPrev: this._q('#cp-btn-prev') || this._q('#btn-prev'),
      btnNext: this._q('#cp-btn-next') || this._q('#btn-next'),
      btnMute: this._q('#cp-btn-mute') || this._q('#btn-mute'),
      btnFullscreen: this._q('#cp-btn-fullscreen') || this._q('#btn-fullscreen'),
      btnCinemaMode: this._q('#cp-btn-cinema'),
      btnSpeed: this._q('#cp-btn-speed'),

      // Iconos de estado
      iconPlay: this._q('#cp-icon-play') || this._q('#icon-play'),
      iconPause: this._q('#cp-icon-pause') || this._q('#icon-pause'),
      iconVolume: this._q('#cp-icon-volume') || this._q('#icon-volume'),
      iconMuted: this._q('#cp-icon-muted') || this._q('#icon-muted'),

      // Progreso y tiempos
      progressContainer: this._q('#cp-progress-container') || this._q('#progress-bar-container'),
      progressFill: this._q('#cp-progress-fill') || this._q('#progress-bar-fill'),
      progressBuffer: this._q('#cp-progress-buffer'),
      progressThumb: this._q('#cp-progress-thumb') || this._q('#progress-thumb'),
      timeCurrentEl: this._q('#cp-time-current'),
      timeTotalEl: this._q('#cp-time-total'),

      // Sliders de volumen
      volumeSlider: this._q('#cp-volume-slider') || this._q('#player-volume'),
      volumeBar: this._q('#cp-volume-bar'),

      dimmerEl: this._q('#cinematic-dimmer'),
    };

    if (this._dom.volumeSlider) {
      this._dom.volumeSlider.value = this._state.volume * 100;
    }
    this._updateVolumeBar(this._state.volume);

    this._bindEvents();
    this._bindKeyboard();

    console.info('[CinemaPlayer] ✓ Inicializado con selectores unificados.');
    return this;
  }


  /* ══════════════════════════════════════════════════════════
     SECCIÓN 3 · REPRODUCCIÓN
  ══════════════════════════════════════════════════════════ */

  playChannel(channel, playlist = [], index = -1) {
    this._stopCurrentPlayback();

    this._state.currentChannel = channel;
    this._state.playlist = playlist;
    this._state.playlistIndex = index;

    const isAudioOnly = channel.type === 'audio' || channel.streamType === 'audio';
    const activeEl = isAudioOnly ? this._dom.audioEl : this._dom.videoEl;
    const inactiveEl = isAudioOnly ? this._dom.videoEl : this._dom.audioEl;

    this._dom.videoEl?.parentElement?.classList.toggle('hidden', isAudioOnly);

    if (inactiveEl) {
      inactiveEl.pause();
      inactiveEl.removeAttribute('src');
      inactiveEl.load();
    }

    this._showLoading(true);
    this._showError(false);

    const isHLS = channel.url.includes('.m3u8') || channel.streamType === 'hls';
    if (isHLS) {
      this._setupHLSStream(channel.url, activeEl);
    } else {
      this._setupDirectStream(channel.url, activeEl);
    }

    if (activeEl) {
      activeEl.volume = this._state.volume;
      activeEl.muted = this._state.isMuted;
      this._bindMediaEvents(activeEl);
    }

    this._updateChannelInfo(channel);
    this._activateCinemaMode();
    this._emit('channelChange', channel);
  }

  _setupHLSStream(url, videoEl) {
    if (typeof Hls === 'undefined') {
      console.warn('[CinemaPlayer] hls.js no está cargado. Intentando reproducción nativa.');
      this._setupDirectStream(url, videoEl);
      return;
    }

    if (Hls.isSupported()) {
      const hls = new Hls(HLS_CONFIG);
      this._state.hlsInstance = hls;

      hls.loadSource(url);
      hls.attachMedia(videoEl);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        this._startPlayback(videoEl);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          console.error('[CinemaPlayer] Error fatal HLS:', data.type, data.details);
          this._handlePlaybackError(data.details);
        }
      });
    } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
      videoEl.src = url;
      this._startPlayback(videoEl);
    } else {
      this._handlePlaybackError('HLS no está soportado en este navegador.');
    }
  }

  _setupDirectStream(url, mediaEl) {
    if (!mediaEl) return;
    mediaEl.src = url;
    mediaEl.load();
    this._startPlayback(mediaEl);
  }

  _startPlayback(mediaEl) {
    const playPromise = mediaEl.play();
    if (playPromise !== undefined) {
      playPromise.catch(err => {
        if (err.name === 'NotAllowedError') {
          console.warn('[CinemaPlayer] Autoplay bloqueado.');
          this._setPlayingState(false);
          this._dom.noSourceOverlay?.classList.remove('hidden');
        } else {
          this._handlePlaybackError(err.message);
        }
      });
    }
  }

  _stopCurrentPlayback() {
    if (this._state.updateTimer) {
      clearInterval(this._state.updateTimer);
      this._state.updateTimer = null;
    }

    if (this._state.hlsInstance) {
      this._state.hlsInstance.destroy();
      this._state.hlsInstance = null;
    }

    [this._dom.videoEl, this._dom.audioEl].forEach(el => {
      if (!el) return;
      el.pause();
      el.removeAttribute('src');
      el.load();
    });

    this._setPlayingState(false);
  }


  /* ══════════════════════════════════════════════════════════
     SECCIÓN 4 · CONTROLES DEL REPRODUCTOR
  ══════════════════════════════════════════════════════════ */

  togglePlay() {
    const el = this._getActiveMediaElement();
    if (!el) return;
    if (el.paused) {
      el.play().catch(console.warn);
    } else {
      el.pause();
    }
  }

  toggleMute() {
    this._state.isMuted = !this._state.isMuted;
    const el = this._getActiveMediaElement();
    if (el) el.muted = this._state.isMuted;

    this._dom.iconVolume?.classList.toggle('hidden', this._state.isMuted);
    this._dom.iconMuted?.classList.toggle('hidden', !this._state.isMuted);
    this._emit('muteChange', this._state.isMuted);
  }

  setVolume(value) {
    const clamped = Math.min(1, Math.max(0, value));
    this._state.volume = clamped;
    const el = this._getActiveMediaElement();
    if (el) el.volume = clamped;

    this._updateVolumeBar(clamped);
    this._emit('volumeChange', clamped);
  }

  seek(seconds) {
    const el = this._getActiveMediaElement();
    if (!el || !isFinite(el.duration)) return;
    const newTime = Math.min(el.duration, Math.max(0, el.currentTime + seconds));
    el.currentTime = newTime;
    this._emit('seek', newTime);
  }

  nextChannel() {
    const { playlist, playlistIndex } = this._state;
    if (playlistIndex < playlist.length - 1) {
      const next = playlistIndex + 1;
      this.playChannel(playlist[next], playlist, next);
      this._emit('channelNext', playlist[next]);
    }
  }

  prevChannel() {
    const el = this._getActiveMediaElement();
    const { playlist, playlistIndex } = this._state;

    if (el?.currentTime > 3 && isFinite(el.duration)) {
      el.currentTime = 0;
      return;
    }

    if (playlistIndex > 0) {
      const prev = playlistIndex - 1;
      this.playChannel(playlist[prev], playlist, prev);
      this._emit('channelPrev', playlist[prev]);
    }
  }

  cycleSpeed() {
    const el = this._getActiveMediaElement();
    if (!el) return;

    const speeds = [0.5, 1, 1.25, 1.5, 2];
    const current = el.playbackRate;
    const idx = speeds.findIndex(s => Math.abs(s - current) < 0.01);
    const next = speeds[(idx + 1) % speeds.length];

    el.playbackRate = next;
    if (this._dom.btnSpeed) this._dom.btnSpeed.textContent = `${next}x`;
    this._emit('speedChange', next);
  }

  requestFullscreen() {
    const el = this._dom.videoEl;
    if (!el) return;
    const requestFn = el.requestFullscreen ?? el.webkitRequestFullscreen ?? el.mozRequestFullScreen;
    requestFn?.call(el).catch(console.warn);
  }

  toggleCinemaMode() {
    this._state.isCinemaMode = !this._state.isCinemaMode;
    this._dom.playerWrap?.classList.toggle('cinema-mode-expanded', this._state.isCinemaMode);
    this._emit('cinemaModeChange', this._state.isCinemaMode);
  }


  /* ══════════════════════════════════════════════════════════
     SECCIÓN 5 · MODO CINE (DIMMER)
  ══════════════════════════════════════════════════════════ */

  _activateCinemaMode() {
    this._state.isDimmerActive = true;
    this._dom.dimmerEl?.classList.add('active');
    document.body.classList.add('is-playing', 'cinema-active');
    this._emit('dimmerActivated');
  }

  _deactivateCinemaMode() {
    this._state.isDimmerActive = false;
    this._dom.dimmerEl?.classList.remove('active');
    document.body.classList.remove('is-playing', 'cinema-active');
    this._emit('dimmerDeactivated');
  }


  /* ══════════════════════════════════════════════════════════
     SECCIÓN 6 · EVENTOS DOM
  ══════════════════════════════════════════════════════════ */

  _bindEvents() {
    this._dom.btnPlayPause?.addEventListener('click', () => this.togglePlay());
    this._dom.btnPrev?.addEventListener('click', () => this.prevChannel());
    this._dom.btnNext?.addEventListener('click', () => this.nextChannel());
    this._dom.btnMute?.addEventListener('click', () => this.toggleMute());
    this._dom.btnFullscreen?.addEventListener('click', () => this.requestFullscreen());
    this._dom.btnCinemaMode?.addEventListener('click', () => this.toggleCinemaMode());
    this._dom.btnSpeed?.addEventListener('click', () => this.cycleSpeed());
    // Doble enlace para asegurar eventos globales y locales
    document.getElementById('btn-play-pause')?.addEventListener('click', () => this.togglePlay());
    document.getElementById('btn-mute')?.addEventListener('click', () => this.toggleMute());
    document.getElementById('btn-fullscreen')?.addEventListener('click', () => this.requestFullscreen());

    this._dom.progressContainer?.addEventListener('click', (e) => {
      const rect = this._dom.progressContainer.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      const el = this._getActiveMediaElement();
      if (el?.duration && isFinite(el.duration)) {
        el.currentTime = pct * el.duration;
      }
    });

    this._dom.volumeSlider?.addEventListener('input', (e) => {
      this.setVolume(Number(e.target.value) / 100);
    });

    this._dom.screenWrap?.addEventListener('click', () => this.togglePlay());
  }

  _bindMediaEvents(el) {
    if (this._mediaAbortCtrl) this._mediaAbortCtrl.abort();
    this._mediaAbortCtrl = new AbortController();
    const { signal } = this._mediaAbortCtrl;

    el.addEventListener('play', () => {
      this._setPlayingState(true);
      this._showLoading(false);
      this._startProgressUpdater(el);
    }, { signal });

    el.addEventListener('pause', () => {
      this._setPlayingState(false);
      this._stopProgressUpdater();
    }, { signal });

    el.addEventListener('ended', () => {
      this._setPlayingState(false);
      this._deactivateCinemaMode();
      this._stopProgressUpdater();
      this.nextChannel();
    }, { signal });

    el.addEventListener('waiting', () => this._showLoading(true), { signal });
    el.addEventListener('playing', () => this._showLoading(false), { signal });
    el.addEventListener('canplay', () => this._showLoading(false), { signal });

    el.addEventListener('loadedmetadata', () => {
      this._updateDuration(el.duration);
    }, { signal });

    el.addEventListener('progress', () => {
      this._updateBufferBar(el);
    }, { signal });

    el.addEventListener('error', () => {
      this._handlePlaybackError(this._getMediaErrorMessage(el.error));
    }, { signal });
  }

  _bindKeyboard() {
    document.addEventListener('keydown', (e) => {
      const tag = document.activeElement?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          this.togglePlay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          e.altKey ? this.nextChannel() : this.seek(this._opts.seekStep);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          e.altKey ? this.prevChannel() : this.seek(-this._opts.seekStep);
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.setVolume(this._state.volume + this._opts.volumeStep);
          break;
        case 'ArrowDown':
          e.preventDefault();
          this.setVolume(this._state.volume - this._opts.volumeStep);
          break;
        case 'm':
        case 'M':
          this.toggleMute();
          break;
        case 'f':
        case 'F':
          this.requestFullscreen();
          break;
        case 'c':
        case 'C':
          this.toggleCinemaMode();
          break;
      }
    });
  }


  /* ══════════════════════════════════════════════════════════
     SECCIÓN 7 · ACTUALIZACIÓN DE LA UI
  ══════════════════════════════════════════════════════════ */

  _setPlayingState(playing) {
    this._state.isPlaying = playing;
    this._dom.iconPlay?.classList.toggle('hidden', playing);
    this._dom.iconPause?.classList.toggle('hidden', !playing);
  }

  _showLoading(show) {
    this._dom.loadingOverlay?.classList.toggle('hidden', !show);
    this._dom.noSourceOverlay?.classList.toggle('hidden', show || !!this._state.currentChannel);
  }

  _showError(show, msg = '') {
    this._dom.errorOverlay?.classList.toggle('hidden', !show);
    this._dom.loadingOverlay?.classList.toggle('hidden', true);
    if (this._dom.errorMsg && msg) this._dom.errorMsg.textContent = msg;
  }

  _handlePlaybackError(message) {
    console.error('[CinemaPlayer] Error:', message);
    this._showError(true, message);
    this._setPlayingState(false);
    this._deactivateCinemaMode();
  }

  _updateChannelInfo(channel) {
    if (this._dom.channelTitle) this._dom.channelTitle.textContent = channel.title || '';
    if (this._dom.channelGroup) this._dom.channelGroup.textContent = channel.group || channel.category || '';

    if (this._dom.channelLogo) {
      if (channel.logo || channel.thumb) {
        this._dom.channelLogo.src = channel.logo || channel.thumb;
        this._dom.channelLogo.classList.remove('hidden');
      } else {
        this._dom.channelLogo.classList.add('hidden');
      }
    }

    document.title = `▶ ${channel.title} — Castify`;
  }

  _startProgressUpdater(el) {
    this._stopProgressUpdater();
    this._state.updateTimer = setInterval(() => {
      if (!el.duration || !isFinite(el.duration)) return;
      const pct = (el.currentTime / el.duration) * 100;
      if (this._dom.progressFill) this._dom.progressFill.style.width = `${pct}%`;
      if (this._dom.progressThumb) this._dom.progressThumb.style.left = `${pct}%`;
      if (this._dom.timeCurrentEl) this._dom.timeCurrentEl.textContent = this._formatTime(el.currentTime);
    }, 500);
  }

  _stopProgressUpdater() {
    if (this._state.updateTimer) {
      clearInterval(this._state.updateTimer);
      this._state.updateTimer = null;
    }
  }

  _updateDuration(duration) {
    if (this._dom.timeTotalEl) {
      this._dom.timeTotalEl.textContent = isFinite(duration) ? this._formatTime(duration) : '∞';
    }
  }

  _updateBufferBar(el) {
    if (!el.buffered.length || !el.duration || !this._dom.progressBuffer) return;
    try {
      const bufferedEnd = el.buffered.end(el.buffered.length - 1);
      const pct = (bufferedEnd / el.duration) * 100;
      this._dom.progressBuffer.style.width = `${Math.min(100, pct)}%`;
    } catch (_) {}
  }

  _updateVolumeBar(value) {
    if (this._dom.volumeBar) {
      this._dom.volumeBar.style.width = `${value * 100}%`;
    }
    if (this._dom.volumeSlider) {
      this._dom.volumeSlider.value = value * 100;
    }
  }


  /* ══════════════════════════════════════════════════════════
     SECCIÓN 8 · SISTEMA DE EVENTOS
  ══════════════════════════════════════════════════════════ */

  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);
    return () => this._listeners.get(event)?.delete(callback);
  }

  _emit(event, data) {
    this._listeners.get(event)?.forEach(cb => {
      try { cb(data); } catch (err) { console.error(err); }
    });
  }


  /* ══════════════════════════════════════════════════════════
     SECCIÓN 9 · UTILIDADES
  ══════════════════════════════════════════════════════════ */

  _getActiveMediaElement() {
    if (this._dom.audioEl?.src && !this._dom.audioEl?.paused) return this._dom.audioEl;
    if (this._dom.videoEl?.src) return this._dom.videoEl;
    return this._dom.audioEl || this._dom.videoEl || null;
  }

  _formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s}` : `${m}:${s}`;
  }

  _getMediaErrorMessage(error) {
    if (!error) return 'Error desconocido.';
    const messages = {
      [MediaError.MEDIA_ERR_ABORTED]: 'Reproducción cancelada.',
      [MediaError.MEDIA_ERR_NETWORK]: 'Error de red en el stream.',
      [MediaError.MEDIA_ERR_DECODE]: 'Error de decodificación.',
      [MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED]: 'Stream no soportado o caído.',
    };
    return messages[error.code] ?? 'Error de reproducción.';
  }

  _q(selector) {
    return document.querySelector(selector);
  }

  get currentChannel() { return this._state.currentChannel; }
  get isPlaying() { return this._state.isPlaying; }
  get volume() { return this._state.volume; }
  get playlist() { return [...this._state.playlist]; }
  get currentIndex() { return this._state.playlistIndex; }
}

/* ─────────────────────────────────────────────────────────────────
   EXPORTAR INSTANCIA GLOBAL
───────────────────────────────────────────────────────────────── */
window.cinemaPlayer = new CinemaPlayer();