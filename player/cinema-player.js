/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  Castify · player/cinema-player.js                               ║
 * ║  Motor de Reproducción Cinematográfico — JavaScript Puro         ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  Responsabilidades:                                              ║
 * ║   1. Gestionar la reproducción de vídeo y audio                  ║
 * ║   2. Soporte HLS nativo mediante hls.js                          ║
 * ║   3. Controles personalizados: play/pausa, barra de progreso,    ║
 * ║      volumen, silencio, pantalla completa, velocidad             ║
 * ║   4. Activar/desactivar el modo cine cinematográfico             ║
 * ║   5. Emitir eventos al sistema para sincronizar la UI global     ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Dependencias externas:
 *   - hls.js (window.Hls)  → https://cdn.jsdelivr.net/npm/hls.js@latest
 *
 * NO depende de ningún framework (Vanilla JS puro, ES2020+).
 */

'use strict';

/* ─────────────────────────────────────────────────────────────────
   SECCIÓN 1 · CONFIGURACIÓN DEL REPRODUCTOR
───────────────────────────────────────────────────────────────── */

/** Opciones por defecto del reproductor */
const PLAYER_DEFAULTS = {
  volume:            0.8,          // Volumen inicial (0.0 – 1.0)
  muted:             false,        // ¿Iniciar silenciado?
  autoplay:          true,         // ¿Reproducir al cargar?
  dimmerOpacity:     0.55,         // Opacidad del cinematic dimmer
  dimmerTransition:  700,          // Duración (ms) de la transición del dimmer
  seekStep:          10,           // Segundos que avanza/retrocede la tecla de flecha
  volumeStep:        0.05,         // Paso de incremento del volumen con teclado
};

/** Opciones de HLS.js para optimizar streams en vivo */
const HLS_CONFIG = {
  enableWorker:           true,    // Worker separado para no bloquear el hilo principal
  lowLatencyMode:         true,    // Minimizar latencia en streams en vivo
  maxBufferLength:        30,      // Segundos de buffer máximo
  maxMaxBufferLength:     60,
  liveSyncDurationCount:  3,       // Segmentos a sincronizar en streams en vivo
  liveMaxLatencyDurationCount: 10,
  // Reintentos automáticos ante errores de red
  manifestLoadingMaxRetry: 3,
  levelLoadingMaxRetry:    3,
  fragLoadingMaxRetry:     3,
};


/* ─────────────────────────────────────────────────────────────────
   SECCIÓN 2 · CLASE PRINCIPAL DEL REPRODUCTOR
───────────────────────────────────────────────────────────────── */

class CinemaPlayer {

  /* ── Constructor ─────────────────────────────────────────────
     Recibe el objeto de opciones y referencias a elementos DOM.
     Se separa la lógica de inicialización del DOM para poder
     crear la instancia antes de que el DOM esté completamente cargado.
  ────────────────────────────────────────────────────────────── */
  constructor(options = {}) {

    // Combinar opciones del usuario con los valores por defecto
    this._opts = { ...PLAYER_DEFAULTS, ...options };

    /* ── Estado interno ───────────────────────────────────────
       Toda la información sobre el estado actual se centraliza
       aquí para facilitar la depuración.
    ────────────────────────────────────────────────────────── */
    this._state = {
      currentChannel:  null,   // Objeto M3UChannel actualmente en reproducción
      playlist:        [],     // Lista completa de canales cargada
      playlistIndex:   -1,     // Índice del canal actual en la playlist
      isPlaying:       false,  // ¿Está reproduciendo?
      isMuted:         false,  // ¿Está silenciado?
      volume:          this._opts.volume,
      isDimmerActive:  false,  // ¿Está activo el modo cine?
      isCinemaMode:    false,  // ¿Pantalla completa de cine (expansión del player)?
      hlsInstance:     null,   // Instancia activa de Hls.js
      updateTimer:     null,   // setInterval para actualizar la barra de progreso
    };

    // Referencias a elementos DOM (se asignan en init())
    this._dom = {};

    // Sistema de eventos interno (permite que otros módulos se suscriban)
    this._listeners = new Map();
  }

  /* ── MÉTODO PÚBLICO: init() ────────────────────────────────
     Enlaza el reproductor con los elementos DOM de la página.
     Se debe llamar después de que el DOM esté disponible.
     Separar la construcción del enlace DOM sigue el principio
     de inversión de dependencias.
  ────────────────────────────────────────────────────────────── */
  init() {

    /* ── Paso 1: Recoger todas las referencias DOM ──────────── */
    this._dom = {
      // Elementos multimedia nativos
      videoEl:          this._q('#cp-video'),
      audioEl:          this._q('#cp-audio'),

      // Contenedor del player completo
      playerWrap:       this._q('#cinema-player-wrap'),

      // Pantalla de video / estado
      screenWrap:       this._q('#cp-screen-wrap'),
      loadingOverlay:   this._q('#cp-loading'),
      errorOverlay:     this._q('#cp-error'),
      errorMsg:         this._q('#cp-error-msg'),
      noSourceOverlay:  this._q('#cp-no-source'),

      // Información del canal
      channelTitle:     this._q('#cp-channel-title'),
      channelGroup:     this._q('#cp-channel-group'),
      channelLogo:      this._q('#cp-channel-logo'),
      liveBadge:        this._q('#cp-live-badge'),
      streamType:       this._q('#cp-stream-type'),

      // Controles
      btnPlayPause:     this._q('#cp-btn-play-pause'),
      btnPrev:          this._q('#cp-btn-prev'),
      btnNext:          this._q('#cp-btn-next'),
      btnMute:          this._q('#cp-btn-mute'),
      btnFullscreen:    this._q('#cp-btn-fullscreen'),
      btnCinemaMode:    this._q('#cp-btn-cinema'),
      btnSpeed:         this._q('#cp-btn-speed'),

      // Iconos de play/pausa
      iconPlay:         this._q('#cp-icon-play'),
      iconPause:        this._q('#cp-icon-pause'),
      iconVolume:       this._q('#cp-icon-volume'),
      iconMuted:        this._q('#cp-icon-muted'),

      // Progreso y tiempo
      progressContainer: this._q('#cp-progress-container'),
      progressFill:      this._q('#cp-progress-fill'),
      progressBuffer:    this._q('#cp-progress-buffer'),
      progressThumb:     this._q('#cp-progress-thumb'),
      timeCurrentEl:     this._q('#cp-time-current'),
      timeTotalEl:       this._q('#cp-time-total'),

      // Volumen
      volumeSlider:     this._q('#cp-volume-slider'),
      volumeBar:        this._q('#cp-volume-bar'),

      // Dimmer cinematográfico
      dimmerEl:         this._q('#cinematic-dimmer'),
    };

    /* ── Paso 2: Inicializar valores de UI ──────────────────── */
    if (this._dom.volumeSlider) {
      this._dom.volumeSlider.value = this._state.volume * 100;
    }
    this._updateVolumeBar(this._state.volume);

    /* ── Paso 3: Registrar todos los listeners de eventos ────── */
    this._bindEvents();

    /* ── Paso 4: Registrar atajos de teclado globales ─────────── */
    this._bindKeyboard();

    console.info('[CinemaPlayer] ✓ Inicializado y listo.');
    return this; // Permite encadenamiento: player.init().loadPlaylist(…)
  }


  /* ══════════════════════════════════════════════════════════
     SECCIÓN 3 · REPRODUCCIÓN
  ══════════════════════════════════════════════════════════ */

  /**
   * Reproduce un canal específico.
   *
   * Flujo:
   *  ① Detener reproducción actual y liberar recursos HLS
   *  ② Determinar el elemento multimedia correcto (video vs audio)
   *  ③ Configurar la fuente según el tipo de stream
   *  ④ Actualizar la UI con info del canal
   *  ⑤ Activar modo cine
   *  ⑥ Emitir evento 'play' para sincronizar el resto de la app
   *
   * @param {Object} channel   - Objeto M3UChannel a reproducir
   * @param {Array}  [playlist] - Lista completa (para navegación prev/next)
   * @param {number} [index]   - Índice del canal en la playlist
   */
  playChannel(channel, playlist = [], index = -1) {

    /* ── ① Limpiar estado anterior ────────────────────────── */
    this._stopCurrentPlayback();

    /* ── Actualizar estado ────────────────────────────────── */
    this._state.currentChannel = channel;
    this._state.playlist       = playlist;
    this._state.playlistIndex  = index;

    /* ── ② Seleccionar elemento multimedia ─────────────────
       Para streams de audio puro usamos <audio>.
       Para vídeo y HLS usamos <video>.
    ────────────────────────────────────────────────────── */
    const isAudioOnly = channel.streamType === 'audio';
    const activeEl    = isAudioOnly ? this._dom.audioEl : this._dom.videoEl;
    const inactiveEl  = isAudioOnly ? this._dom.videoEl : this._dom.audioEl;

    // Ocultar/mostrar los contenedores apropiados
    this._dom.videoEl?.parentElement?.classList.toggle('hidden', isAudioOnly);

    // Detener el elemento inactivo completamente
    inactiveEl.pause();
    inactiveEl.removeAttribute('src');
    inactiveEl.load();

    /* ── ③ Mostrar overlay de carga ─────────────────────── */
    this._showLoading(true);
    this._showError(false);

    /* ── ④ Configurar la fuente según el tipo de stream ──── */
    if (channel.streamType === 'hls') {
      this._setupHLSStream(channel.url, activeEl);
    } else {
      this._setupDirectStream(channel.url, activeEl);
    }

    /* ── Aplicar volumen y silencio ─────────────────────── */
    activeEl.volume = this._state.volume;
    activeEl.muted  = this._state.isMuted;

    /* ── ⑤ Actualizar información en la UI ─────────────── */
    this._updateChannelInfo(channel);

    /* ── ⑥ Activar modo cine ────────────────────────────── */
    this._activateCinemaMode();

    /* ── ⑦ Emitir evento para sincronizar la app ────────── */
    this._emit('channelChange', channel);

    /* ── ⑧ Registrar eventos del elemento multimedia ────── */
    this._bindMediaEvents(activeEl);
  }

  /**
   * Configura un stream HLS usando hls.js.
   *
   * HLS (HTTP Live Streaming) es el formato de Apple para streaming adaptativo.
   * Los archivos .m3u8 contienen referencias a segmentos .ts que se descargan
   * progresivamente. hls.js implementa esto en navegadores que no tienen
   * soporte nativo (principalmente Chrome/Firefox).
   *
   * @param {string}          url     - URL del manifiesto .m3u8
   * @param {HTMLVideoElement} videoEl - Elemento de vídeo a usar
   */
  _setupHLSStream(url, videoEl) {

    /* ── Soporte HLS nativo (Safari, iOS) ───────────────────
       Safari tiene soporte nativo para HLS vía MSE.
       En ese caso NO usamos hls.js para evitar conflictos.
    ─────────────────────────────────────────────────────── */
    if (typeof Hls === 'undefined') {
      console.warn('[CinemaPlayer] hls.js no está cargado. Intentando reproducción nativa.');
      this._setupDirectStream(url, videoEl);
      return;
    }

    if (Hls.isSupported()) {
      /* ── Crear instancia de HLS.js ──────────────────────── */
      const hls = new Hls(HLS_CONFIG);
      this._state.hlsInstance = hls;

      /* ── Cargar el manifiesto M3U8 ──────────────────────── */
      hls.loadSource(url);
      hls.attachMedia(videoEl); // Enlazar con el elemento <video>

      /* ── Evento: manifiesto parseado → iniciar reproducción */
      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        console.info(`[CinemaPlayer] HLS: ${data.levels.length} calidades disponibles`);
        this._startPlayback(videoEl);
      });

      /* ── Evento: error de HLS ──────────────────────────── */
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          console.error('[CinemaPlayer] Error fatal HLS:', data.type, data.details);
          this._handlePlaybackError(data.details);
        } else {
          // Errores no fatales (red): hls.js los recupera automáticamente
          console.warn('[CinemaPlayer] Error HLS no fatal:', data.details);
        }
      });

      /* ── Evento: nivel de calidad cambiado ─────────────── */
      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        console.info(`[CinemaPlayer] HLS: calidad cambiada a nivel ${data.level}`);
      });

    } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
      /* ── Soporte nativo (Safari) ────────────────────────── */
      console.info('[CinemaPlayer] Usando soporte HLS nativo del navegador.');
      videoEl.src = url;
      this._startPlayback(videoEl);

    } else {
      /* ── Sin soporte de ningún tipo ─────────────────────── */
      this._handlePlaybackError('HLS no está soportado en este navegador.');
    }
  }

  /**
   * Configura un stream directo (MP4, MP3, WebM, etc.)
   * sin necesidad de hls.js.
   *
   * @param {string}     url     - URL del recurso
   * @param {HTMLElement} mediaEl - Elemento <video> o <audio>
   */
  _setupDirectStream(url, mediaEl) {
    mediaEl.src = url;
    mediaEl.load(); // Forzar recarga del elemento
    this._startPlayback(mediaEl);
  }

  /**
   * Inicia la reproducción del elemento multimedia.
   * Gestiona la Promise que devuelve play() para capturar errores
   * de política de autoplay del navegador.
   *
   * @param {HTMLMediaElement} mediaEl
   */
  _startPlayback(mediaEl) {
    const playPromise = mediaEl.play();

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          // Reproducción iniciada correctamente
          console.info('[CinemaPlayer] Reproducción iniciada.');
        })
        .catch(err => {
          // Los navegadores modernos bloquean autoplay sin interacción del usuario
          if (err.name === 'NotAllowedError') {
            console.warn('[CinemaPlayer] Autoplay bloqueado. El usuario debe interactuar primero.');
            this._setPlayingState(false);
            // Mostrar indicación visual de "Haz clic para reproducir"
            this._dom.noSourceOverlay?.classList.remove('hidden');
            this._dom.noSourceOverlay.querySelector?.('#cp-click-to-play')?.classList.remove('hidden');
          } else {
            this._handlePlaybackError(err.message);
          }
        });
    }
  }

  /**
   * Detiene la reproducción actual y libera todos los recursos.
   * Es crítico llamar a hls.destroy() para evitar memory leaks.
   */
  _stopCurrentPlayback() {

    /* ── Limpiar intervalo de actualización de progreso ───── */
    if (this._state.updateTimer) {
      clearInterval(this._state.updateTimer);
      this._state.updateTimer = null;
    }

    /* ── Destruir instancia HLS ────────────────────────────
       hls.destroy() libera Workers, objetos URL y event listeners.
       SIEMPRE llamar antes de crear una nueva instancia.
    ─────────────────────────────────────────────────────── */
    if (this._state.hlsInstance) {
      this._state.hlsInstance.destroy();
      this._state.hlsInstance = null;
    }

    /* ── Detener elementos multimedia ───────────────────── */
    [this._dom.videoEl, this._dom.audioEl].forEach(el => {
      if (!el) return;
      el.pause();
      el.removeAttribute('src');
      el.load(); // Liberar el buffer de red
    });

    this._setPlayingState(false);
  }


  /* ══════════════════════════════════════════════════════════
     SECCIÓN 4 · CONTROLES DEL REPRODUCTOR
  ══════════════════════════════════════════════════════════ */

  /**
   * Alterna entre play y pausa.
   * Detecta automáticamente el elemento activo.
   */
  togglePlay() {
    const el = this._getActiveMediaElement();
    if (!el) return;

    if (el.paused) {
      el.play().catch(err => console.warn('[CinemaPlayer] Error al reanudar:', err));
    } else {
      el.pause();
    }
  }

  /** Silencia o activa el sonido */
  toggleMute() {
    this._state.isMuted = !this._state.isMuted;
    const el = this._getActiveMediaElement();
    if (el) el.muted = this._state.isMuted;

    // Actualizar iconos
    this._dom.iconVolume?.classList.toggle('hidden', this._state.isMuted);
    this._dom.iconMuted?.classList.toggle('hidden',  !this._state.isMuted);
    this._dom.btnMute?.setAttribute('aria-label', this._state.isMuted ? 'Activar sonido' : 'Silenciar');

    this._emit('muteChange', this._state.isMuted);
  }

  /**
   * Ajusta el volumen (0.0 – 1.0).
   * @param {number} value - Valor entre 0 y 1
   */
  setVolume(value) {
    const clamped = Math.min(1, Math.max(0, value));
    this._state.volume = clamped;

    const el = this._getActiveMediaElement();
    if (el) el.volume = clamped;

    this._updateVolumeBar(clamped);
    this._emit('volumeChange', clamped);
  }

  /**
   * Avanza o retrocede N segundos en el stream.
   * No tiene efecto en streams en vivo (sin duración definida).
   *
   * @param {number} seconds - Positivo = avanzar, negativo = retroceder
   */
  seek(seconds) {
    const el = this._getActiveMediaElement();
    if (!el || !isFinite(el.duration)) return; // Streams en vivo no permiten seek

    const newTime = Math.min(el.duration, Math.max(0, el.currentTime + seconds));
    el.currentTime = newTime;
    this._emit('seek', newTime);
  }

  /**
   * Navega al siguiente canal de la playlist.
   */
  nextChannel() {
    const { playlist, playlistIndex } = this._state;
    if (playlistIndex < playlist.length - 1) {
      const next = playlistIndex + 1;
      this.playChannel(playlist[next], playlist, next);
      this._emit('channelNext', playlist[next]);
    }
  }

  /**
   * Navega al canal anterior de la playlist.
   * Si el stream lleva más de 3 segundos → reinicia en lugar de ir atrás.
   */
  prevChannel() {
    const el  = this._getActiveMediaElement();
    const { playlist, playlistIndex } = this._state;

    // Si lleva más de 3 segundos reproduciendo → reiniciar el stream
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

  /**
   * Cambia la velocidad de reproducción.
   * Cicla entre: 0.5x → 1x → 1.5x → 2x → 0.5x
   */
  cycleSpeed() {
    const el     = this._getActiveMediaElement();
    if (!el) return;

    const speeds  = [0.5, 1, 1.25, 1.5, 2];
    const current = el.playbackRate;
    const idx     = speeds.findIndex(s => Math.abs(s - current) < 0.01);
    const next    = speeds[(idx + 1) % speeds.length];

    el.playbackRate = next;
    if (this._dom.btnSpeed) this._dom.btnSpeed.textContent = `${next}x`;
    this._emit('speedChange', next);
  }

  /**
   * Solicita pantalla completa del elemento de vídeo.
   * Tiene en cuenta los prefijos de los diferentes navegadores.
   */
  requestFullscreen() {
    const el = this._dom.videoEl;
    if (!el) return;

    const requestFn = el.requestFullscreen
      ?? el.webkitRequestFullscreen
      ?? el.mozRequestFullScreen
      ?? el.msRequestFullscreen;

    requestFn?.call(el).catch(err => {
      console.warn('[CinemaPlayer] Error al entrar en pantalla completa:', err.message);
    });
  }

  /**
   * Activa/desactiva el modo cine expandido (ocupa más espacio en pantalla).
   * Diferente de la pantalla completa nativa del navegador.
   */
  toggleCinemaMode() {
    this._state.isCinemaMode = !this._state.isCinemaMode;
    this._dom.playerWrap?.classList.toggle('cinema-mode-expanded', this._state.isCinemaMode);
    this._dom.btnCinemaMode?.setAttribute('aria-pressed', String(this._state.isCinemaMode));
    this._emit('cinemaModeChange', this._state.isCinemaMode);
  }


  /* ══════════════════════════════════════════════════════════
     SECCIÓN 5 · MODO CINE (DIMMER)
  ══════════════════════════════════════════════════════════ */

  /**
   * Activa el efecto de oscurecimiento cinematográfico.
   *
   * El "cinematic dimmer" simula las luces del cine que se apagan
   * cuando empieza la película. Se aplica a través de:
   *  1. Un overlay semitransparente sobre la UI (#cinematic-dimmer)
   *  2. Clase CSS en <body> que activa estilos de navegación iluminada
   */
  _activateCinemaMode() {
    this._state.isDimmerActive = true;

    /* ── Oscurecer la UI ────────────────────────────────────
       El overlay usa CSS transition para que la transición
       sea suave (efecto de luces que se apagan lentamente).
    ─────────────────────────────────────────────────────── */
    if (this._dom.dimmerEl) {
      this._dom.dimmerEl.classList.add('active');
    }

    /* ── Añadir clase al body ────────────────────────────────
       La clase 'is-playing' activa el glow en los menús de
       navegación a través de las reglas CSS en styles.css.
    ─────────────────────────────────────────────────────── */
    document.body.classList.add('is-playing');

    this._emit('dimmerActivated');
  }

  /**
   * Desactiva el modo cine y restaura la iluminación normal.
   */
  _deactivateCinemaMode() {
    this._state.isDimmerActive = false;
    this._dom.dimmerEl?.classList.remove('active');
    document.body.classList.remove('is-playing');
    this._emit('dimmerDeactivated');
  }

  /**
   * Permite al usuario controlar si el dimmer está habilitado.
   * @param {boolean} enabled
   */
  setDimmerEnabled(enabled) {
    this._opts.dimmerEnabled = enabled;
    if (!enabled) {
      this._deactivateCinemaMode();
    } else if (this._state.isPlaying) {
      this._activateCinemaMode();
    }
  }


  /* ══════════════════════════════════════════════════════════
     SECCIÓN 6 · EVENTOS DOM
  ══════════════════════════════════════════════════════════ */

  /**
   * Registra todos los event listeners de los controles del reproductor.
   * Se centraliza aquí para facilitar la gestión y evitar duplicados.
   */
  _bindEvents() {

    /* ── Botones de control ───────────────────────────────── */
    this._dom.btnPlayPause?.addEventListener('click', () => this.togglePlay());
    this._dom.btnPrev?.addEventListener('click',      () => this.prevChannel());
    this._dom.btnNext?.addEventListener('click',      () => this.nextChannel());
    this._dom.btnMute?.addEventListener('click',      () => this.toggleMute());
    this._dom.btnFullscreen?.addEventListener('click',() => this.requestFullscreen());
    this._dom.btnCinemaMode?.addEventListener('click',() => this.toggleCinemaMode());
    this._dom.btnSpeed?.addEventListener('click',     () => this.cycleSpeed());

    /* ── Barra de progreso (click para buscar posición) ───── */
    this._dom.progressContainer?.addEventListener('click', (e) => {
      const rect = this._dom.progressContainer.getBoundingClientRect();
      const pct  = (e.clientX - rect.left) / rect.width;
      const el   = this._getActiveMediaElement();
      if (el?.duration && isFinite(el.duration)) {
        el.currentTime = pct * el.duration;
      }
    });

    /* ── Barra de progreso (arrastre) ───────────────────────
       Permite al usuario arrastrar el thumb para cambiar la posición.
    ─────────────────────────────────────────────────────── */
    let isDragging = false;
    this._dom.progressContainer?.addEventListener('mousedown', () => { isDragging = true; });
    document.addEventListener('mouseup',   () => { isDragging = false; });
    document.addEventListener('mousemove', (e) => {
      if (!isDragging || !this._dom.progressContainer) return;
      const rect = this._dom.progressContainer.getBoundingClientRect();
      const pct  = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      const el   = this._getActiveMediaElement();
      if (el?.duration && isFinite(el.duration)) {
        el.currentTime = pct * el.duration;
      }
    });

    /* ── Control deslizante de volumen ──────────────────── */
    this._dom.volumeSlider?.addEventListener('input', (e) => {
      this.setVolume(Number(e.target.value) / 100);
    });

    /* ── Click en el overlay del reproductor (play/pausa) ── */
    this._dom.screenWrap?.addEventListener('click', () => this.togglePlay());

    /* ── Doble clic → pantalla completa ──────────────────── */
    this._dom.screenWrap?.addEventListener('dblclick', () => this.requestFullscreen());

    /* ── Evento de pantalla completa ─────────────────────── */
    document.addEventListener('fullscreenchange',       () => this._onFullscreenChange());
    document.addEventListener('webkitfullscreenchange', () => this._onFullscreenChange());
  }

  /**
   * Registra los eventos del elemento multimedia activo.
   * Se llama cada vez que se cambia de canal.
   *
   * @param {HTMLMediaElement} el
   */
  _bindMediaEvents(el) {

    /* ── Remover listeners previos para evitar duplicados ─── */
    // Usamos un AbortController para desregistrar fácilmente todos
    if (this._mediaAbortCtrl) {
      this._mediaAbortCtrl.abort();
    }
    this._mediaAbortCtrl = new AbortController();
    const { signal } = this._mediaAbortCtrl;

    /* ── Eventos de estado ────────────────────────────────── */

    // Reproducción iniciada / reanudada
    el.addEventListener('play', () => {
      this._setPlayingState(true);
      this._showLoading(false);
      this._startProgressUpdater(el);
    }, { signal });

    // Reproducción pausada
    el.addEventListener('pause', () => {
      this._setPlayingState(false);
      this._stopProgressUpdater();
    }, { signal });

    // Stream finalizado (no ocurre en streams en vivo)
    el.addEventListener('ended', () => {
      this._setPlayingState(false);
      this._deactivateCinemaMode();
      this._stopProgressUpdater();
      // Auto-siguiente
      if (this._opts.autoNext !== false) this.nextChannel();
    }, { signal });

    // Buffering / cargando datos
    el.addEventListener('waiting', () => this._showLoading(true),  { signal });
    el.addEventListener('playing', () => this._showLoading(false), { signal });
    el.addEventListener('canplay', () => this._showLoading(false), { signal });

    // Metadatos cargados (duración disponible)
    el.addEventListener('loadedmetadata', () => {
      this._updateDuration(el.duration);
    }, { signal });

    // Buffer de red actualizado (para mostrar barra de buffer)
    el.addEventListener('progress', () => {
      this._updateBufferBar(el);
    }, { signal });

    // Error de reproducción
    el.addEventListener('error', (e) => {
      const errMsg = this._getMediaErrorMessage(el.error);
      this._handlePlaybackError(errMsg);
    }, { signal });

    // Cambio de volumen externo
    el.addEventListener('volumechange', () => {
      this._state.volume = el.volume;
      this._state.isMuted = el.muted;
      this._updateVolumeBar(el.volume);
    }, { signal });
  }

  /**
   * Registra los atajos de teclado globales para el reproductor.
   * Solo actúan cuando el foco NO está en un campo de texto.
   */
  _bindKeyboard() {
    document.addEventListener('keydown', (e) => {

      // No capturar si el usuario está escribiendo en un input
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
          // Con Alt: canal siguiente; sin Alt: avanzar N segundos
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

        case ',':
          this.seek(-this._opts.seekStep * 0.5); // Retroceso fino
          break;

        case '.':
          this.seek(this._opts.seekStep * 0.5); // Avance fino
          break;
      }
    });
  }


  /* ══════════════════════════════════════════════════════════
     SECCIÓN 7 · ACTUALIZACIÓN DE LA UI
  ══════════════════════════════════════════════════════════ */

  /**
   * Actualiza el estado visual de play/pausa (botón e iconos).
   * @param {boolean} playing
   */
  _setPlayingState(playing) {
    this._state.isPlaying = playing;
    this._dom.iconPlay?.classList.toggle('hidden',  playing);
    this._dom.iconPause?.classList.toggle('hidden', !playing);
    this._dom.btnPlayPause?.setAttribute('aria-label', playing ? 'Pausar' : 'Reproducir');
  }

  /**
   * Muestra u oculta el overlay de "Cargando…".
   * @param {boolean} show
   */
  _showLoading(show) {
    this._dom.loadingOverlay?.classList.toggle('hidden', !show);
    this._dom.noSourceOverlay?.classList.toggle('hidden', show || !!this._state.currentChannel);
  }

  /**
   * Muestra u oculta el overlay de error con un mensaje.
   * @param {boolean} show
   * @param {string}  [msg]
   */
  _showError(show, msg = '') {
    this._dom.errorOverlay?.classList.toggle('hidden',   !show);
    this._dom.loadingOverlay?.classList.toggle('hidden', true);
    if (this._dom.errorMsg && msg) this._dom.errorMsg.textContent = msg;
  }

  /**
   * Gestiona un error de reproducción: muestra el mensaje, desactiva el dimmer.
   * @param {string} message
   */
  _handlePlaybackError(message) {
    console.error('[CinemaPlayer] Error de reproducción:', message);
    this._showError(true, `Error: ${message}`);
    this._setPlayingState(false);
    this._deactivateCinemaMode();
    this._emit('error', message);
  }

  /**
   * Actualiza la información del canal en la UI (nombre, grupo, logo, badges).
   * @param {Object} channel
   */
  _updateChannelInfo(channel) {
    if (this._dom.channelTitle)  this._dom.channelTitle.textContent = channel.title  || '';
    if (this._dom.channelGroup)  this._dom.channelGroup.textContent = channel.group  || '';

    // Logo del canal
    if (this._dom.channelLogo) {
      if (channel.logo) {
        this._dom.channelLogo.src = channel.logo;
        this._dom.channelLogo.classList.remove('hidden');
        this._dom.channelLogo.onerror = () => this._dom.channelLogo.classList.add('hidden');
      } else {
        this._dom.channelLogo.classList.add('hidden');
      }
    }

    // Badge EN VIVO
    if (this._dom.liveBadge) {
      this._dom.liveBadge.classList.toggle('hidden', !channel.isLive);
    }

    // Badge de tipo de stream
    if (this._dom.streamType) {
      const labels = { hls: 'HLS', video: 'VIDEO', audio: 'AUDIO', unknown: '' };
      this._dom.streamType.textContent = labels[channel.streamType] ?? '';
    }

    // Actualizar el título de la pestaña del navegador
    document.title = `▶ ${channel.title} — CinemaStream`;

    // También actualizar la barra inferior de la app
    this._emit('uiUpdate', channel);
  }

  /**
   * Inicia el intervalo que actualiza la barra de progreso.
   * Usa requestAnimationFrame si la precisión no es crítica.
   * @param {HTMLMediaElement} el
   */
  _startProgressUpdater(el) {
    this._stopProgressUpdater();

    // Actualizar cada 500ms (suficiente para una barra de progreso fluida)
    this._state.updateTimer = setInterval(() => {
      if (!el.duration || !isFinite(el.duration)) return;

      const pct = (el.currentTime / el.duration) * 100;
      if (this._dom.progressFill)  this._dom.progressFill.style.width = `${pct}%`;
      if (this._dom.progressThumb) this._dom.progressThumb.style.left = `${pct}%`;

      // Actualizar tiempos
      if (this._dom.timeCurrentEl)
        this._dom.timeCurrentEl.textContent = this._formatTime(el.currentTime);

    }, 500);
  }

  /** Detiene el intervalo de actualización de progreso. */
  _stopProgressUpdater() {
    if (this._state.updateTimer) {
      clearInterval(this._state.updateTimer);
      this._state.updateTimer = null;
    }
  }

  /**
   * Actualiza la visualización de la duración total.
   * @param {number} duration - Segundos
   */
  _updateDuration(duration) {
    if (this._dom.timeTotalEl) {
      this._dom.timeTotalEl.textContent = isFinite(duration)
        ? this._formatTime(duration)
        : '∞'; // Streams en vivo no tienen duración
    }
  }

  /**
   * Actualiza la barra de buffer (porción descargada en caché).
   * @param {HTMLMediaElement} el
   */
  _updateBufferBar(el) {
    if (!el.buffered.length || !el.duration || !this._dom.progressBuffer) return;

    try {
      // buffered.end(último índice) = cuánto se ha descargado hasta el final
      const bufferedEnd = el.buffered.end(el.buffered.length - 1);
      const pct         = (bufferedEnd / el.duration) * 100;
      this._dom.progressBuffer.style.width = `${Math.min(100, pct)}%`;
    } catch (_) { /* buffered puede lanzar si el índice ya no existe */ }
  }

  /**
   * Actualiza la barra visual de volumen.
   * @param {number} value - 0.0 a 1.0
   */
  _updateVolumeBar(value) {
    if (this._dom.volumeBar) {
      this._dom.volumeBar.style.width = `${value * 100}%`;
    }
    if (this._dom.volumeSlider) {
      this._dom.volumeSlider.value = value * 100;
    }
  }

  /** Maneja el evento de cambio de pantalla completa del navegador. */
  _onFullscreenChange() {
    const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
    this._dom.playerWrap?.classList.toggle('is-fullscreen', isFs);
    this._emit('fullscreenChange', isFs);
  }


  /* ══════════════════════════════════════════════════════════
     SECCIÓN 8 · SISTEMA DE EVENTOS INTERNO
  ══════════════════════════════════════════════════════════ */

  /**
   * Suscribe una función a un evento interno del reproductor.
   *
   * Eventos disponibles:
   *   'channelChange', 'channelNext', 'channelPrev',
   *   'play', 'pause', 'ended', 'error',
   *   'volumeChange', 'muteChange', 'speedChange', 'seek',
   *   'dimmerActivated', 'dimmerDeactivated',
   *   'cinemaModeChange', 'fullscreenChange', 'uiUpdate'
   *
   * @param {string}   event    - Nombre del evento
   * @param {Function} callback - Función a ejecutar
   * @returns {Function} Función para desuscribirse
   */
  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);

    // Retornar función de limpieza (patrón moderno)
    return () => this._listeners.get(event)?.delete(callback);
  }

  /**
   * Emite un evento interno notificando a todos los suscriptores.
   * @param {string} event - Nombre del evento
   * @param {*}      data  - Datos a pasar al callback
   */
  _emit(event, data) {
    this._listeners.get(event)?.forEach(cb => {
      try {
        cb(data);
      } catch (err) {
        console.error(`[CinemaPlayer] Error en listener de "${event}":`, err);
      }
    });
  }


  /* ══════════════════════════════════════════════════════════
     SECCIÓN 9 · UTILIDADES PRIVADAS
  ══════════════════════════════════════════════════════════ */

  /**
   * Devuelve el elemento multimedia que está activo actualmente.
   * @returns {HTMLMediaElement|null}
   */
  _getActiveMediaElement() {
    // Si el audio tiene fuente o está reproduciendo → es el activo
    if (this._dom.audioEl?.src || !this._dom.audioEl?.paused) {
      return this._dom.audioEl;
    }
    return this._dom.videoEl ?? null;
  }

  /**
   * Convierte segundos a formato mm:ss o hh:mm:ss.
   * @param {number} seconds
   * @returns {string}
   */
  _formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s}` : `${m}:${s}`;
  }

  /**
   * Traduce el código de error de HTMLMediaError a un mensaje legible.
   * @param {MediaError|null} error
   * @returns {string}
   */
  _getMediaErrorMessage(error) {
    if (!error) return 'Error desconocido.';
    const messages = {
      [MediaError.MEDIA_ERR_ABORTED]:    'Reproducción cancelada por el usuario.',
      [MediaError.MEDIA_ERR_NETWORK]:    'Error de red. Comprueba tu conexión a Internet.',
      [MediaError.MEDIA_ERR_DECODE]:     'El formato del stream no es compatible.',
      [MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED]: 'La URL del stream no es válida o no está disponible.',
    };
    return messages[error.code] ?? `Error de reproducción (código ${error.code}).`;
  }

  /**
   * Atajo para querySelector con mensaje de error claro si no encuentra el elemento.
   * @param {string} selector
   * @returns {Element|null}
   */
  _q(selector) {
    const el = document.querySelector(selector);
    if (!el) console.warn(`[CinemaPlayer] Elemento no encontrado: "${selector}"`);
    return el;
  }

  /* ── API de solo lectura ─────────────────────────────── */
  get currentChannel()  { return this._state.currentChannel; }
  get isPlaying()       { return this._state.isPlaying; }
  get volume()          { return this._state.volume; }
  get playlist()        { return [...this._state.playlist]; }
  get currentIndex()    { return this._state.playlistIndex; }
}


/* ─────────────────────────────────────────────────────────────────
   EXPORTAR INSTANCIA GLOBAL
   Se crea una única instancia compartida (patrón Singleton).
───────────────────────────────────────────────────────────────── */
window.cinemaPlayer = new CinemaPlayer();
