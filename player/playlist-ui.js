/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  CinemaStream · player/playlist-ui.js                           ║
 * ║  Interfaz de la Playlist y el Importador M3U                    ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  Responsabilidades:                                              ║
 * ║   1. Importador M3U: URL + Archivo + Drag & Drop                 ║
 * ║   2. Renderizado de la lista de canales con grupos               ║
 * ║   3. Búsqueda en tiempo real dentro de la playlist               ║
 * ║   4. Filtro por grupo/categoría                                  ║
 * ║   5. Comunicación con CinemaPlayer para iniciar reproducción     ║
 * ║   6. Indicador visual del canal activo                           ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

'use strict';

/* ─────────────────────────────────────────────────────────────────
   SECCIÓN 1 · CLASE PRINCIPAL PlaylistUI
───────────────────────────────────────────────────────────────── */

class PlaylistUI {

  constructor() {
    /* ── Estado del módulo ─────────────────────────────────── */
    this._allChannels   = [];    // Todos los canales sin filtrar
    this._filtered      = [];    // Canales tras aplicar filtros
    this._activeId      = null;  // ID del canal actualmente en reproducción
    this._activeGroup   = 'all'; // Grupo seleccionado ('all' = todos)
    this._searchQuery   = '';    // Texto de búsqueda actual
    this._isLoading     = false; // ¿Está cargando una lista?

    /* ── Referencias DOM ──────────────────────────────────── */
    this._dom = {};
  }

  /* ── init(): Enlazar con DOM y eventos ─────────────────── */
  init() {
    this._dom = {
      /* ── Importador ───────────────────────────────────── */
      // Campo de URL
      urlInput:          document.getElementById('m3u-url-input'),
      btnLoadUrl:        document.getElementById('m3u-btn-load-url'),

      // Tabs (URL / Archivo)
      tabs:              document.querySelectorAll('.m3u-import-tab'),
      panelUrl:          document.getElementById('m3u-panel-url'),
      panelFile:         document.getElementById('m3u-panel-file'),

      // Área de soltar archivos (drag & drop)
      dropZone:          document.getElementById('m3u-drop-zone'),
      fileInput:         document.getElementById('m3u-file-input'),

      // Feedback de estado de carga
      statusBar:         document.getElementById('m3u-status-bar'),
      statusText:        document.getElementById('m3u-status-text'),
      progressBar:       document.getElementById('m3u-import-progress'),
      btnClearPlaylist:  document.getElementById('m3u-btn-clear'),

      /* ── Playlist ─────────────────────────────────────── */
      playlistWrap:      document.getElementById('m3u-playlist-wrap'),
      playlistContainer: document.getElementById('m3u-playlist-container'),
      channelList:       document.getElementById('m3u-channel-list'),
      channelCount:      document.getElementById('m3u-channel-count'),

      // Búsqueda y filtros
      searchInput:       document.getElementById('m3u-search'),
      groupFilter:       document.getElementById('m3u-group-filter'),
      btnSortAlpha:      document.getElementById('m3u-sort-alpha'),

      /* ── Player embebido (definido en HTML) ────────────── */
      playerSection:     document.getElementById('m3u-player-section'),
    };

    this._bindImportEvents();
    this._bindPlaylistEvents();
    this._bindPlayerEvents();

    console.info('[PlaylistUI] ✓ Inicializada.');
    return this;
  }


  /* ══════════════════════════════════════════════════════════
     SECCIÓN 2 · IMPORTADOR (URL, ARCHIVO, DRAG & DROP)
  ══════════════════════════════════════════════════════════ */

  _bindImportEvents() {

    /* ── Tabs de importación ─────────────────────────────── */
    this._dom.tabs?.forEach(tab => {
      tab.addEventListener('click', () => this._switchImportTab(tab.dataset.target));
    });

    /* ── Cargar por URL ─────────────────────────────────── */
    this._dom.btnLoadUrl?.addEventListener('click', () => {
      const url = this._dom.urlInput?.value.trim();
      this._importFromUrl(url);
    });

    // También activar al pulsar Enter en el campo
    this._dom.urlInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const url = this._dom.urlInput.value.trim();
        this._importFromUrl(url);
      }
    });

    /* ── Selección de archivo mediante <input type="file"> ─ */
    this._dom.fileInput?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this._importFromFile(file);
    });

    /* ── Drag & Drop ─────────────────────────────────────── */
    const dz = this._dom.dropZone;
    if (dz) {
      // Prevenir comportamiento por defecto del navegador (abrir el archivo)
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
        dz.addEventListener(evt, (e) => { e.preventDefault(); e.stopPropagation(); });
      });

      // Resaltar la zona mientras el archivo está sobre ella
      dz.addEventListener('dragenter', () => dz.classList.add('drag-over'));
      dz.addEventListener('dragover',  () => dz.classList.add('drag-over'));
      dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));

      // Soltar el archivo → iniciar importación
      dz.addEventListener('drop', (e) => {
        dz.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) {
          this._importFromFile(file);
        } else {
          // ¿Se arrastró una URL? (ej. desde la barra de direcciones)
          const url = e.dataTransfer.getData('text/uri-list')
                   || e.dataTransfer.getData('text/plain');
          if (url && url.startsWith('http')) {
            if (this._dom.urlInput) this._dom.urlInput.value = url;
            this._importFromUrl(url);
          }
        }
      });

      // Clic en el drop-zone → disparar el input de archivo
      dz.addEventListener('click', () => this._dom.fileInput?.click());
      dz.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') this._dom.fileInput?.click();
      });
    }

    /* ── Botón de limpiar ─────────────────────────────────── */
    this._dom.btnClearPlaylist?.addEventListener('click', () => this._clearPlaylist());
  }

  /**
   * Alterna entre los paneles de importación (URL / Archivo).
   * @param {'url'|'file'} target
   */
  _switchImportTab(target) {
    // Actualizar estado visual de los tabs
    this._dom.tabs?.forEach(t => {
      const isActive = t.dataset.target === target;
      t.classList.toggle('active', isActive);
      t.setAttribute('aria-selected', String(isActive));
    });

    // Mostrar/ocultar paneles
    this._dom.panelUrl?.classList.toggle('hidden',  target !== 'url');
    this._dom.panelFile?.classList.toggle('hidden', target !== 'file');
  }

  /* ── Importar desde URL ─────────────────────────────────── */
  async _importFromUrl(url) {
    if (!url) {
      this._showStatus('error', '⚠ Introduce una URL válida (http:// o https://)');
      return;
    }

    this._setLoadingState(true, 'Conectando al servidor…');

    try {
      /* Llama al M3UParser global (definido en m3u-parser.js) */
      const channels = await window.M3UParser.fromUrl(url, (msg) => {
        this._showStatus('loading', msg);
      });

      this._loadChannels(channels, `Lista desde URL (${channels.length} canales)`);

    } catch (err) {
      this._showStatus('error', `✗ ${err.message}`);
      console.error('[PlaylistUI] Error al cargar URL:', err);
    } finally {
      this._setLoadingState(false);
    }
  }

  /* ── Importar desde archivo local ───────────────────────── */
  async _importFromFile(file) {
    this._setLoadingState(true, `Leyendo "${file.name}"…`);

    try {
      const channels = await window.M3UParser.fromFile(file, (msg) => {
        this._showStatus('loading', msg);
      });

      this._loadChannels(channels, `${file.name} · ${channels.length} canales`);

    } catch (err) {
      this._showStatus('error', `✗ ${err.message}`);
      console.error('[PlaylistUI] Error al leer archivo:', err);
    } finally {
      this._setLoadingState(false);
      // Resetear el input para poder cargar el mismo archivo de nuevo
      if (this._dom.fileInput) this._dom.fileInput.value = '';
    }
  }


  /* ══════════════════════════════════════════════════════════
     SECCIÓN 3 · GESTIÓN DE LA PLAYLIST
  ══════════════════════════════════════════════════════════ */

  /**
   * Carga los canales parseados en la UI.
   * Punto de entrada común para carga por URL y por archivo.
   *
   * @param {Array}  channels - Array de objetos M3UChannel
   * @param {string} label    - Texto a mostrar como título de la lista
   */
  _loadChannels(channels, label) {
    this._allChannels = channels;
    this._filtered    = [...channels];
    this._activeGroup = 'all';
    this._searchQuery = '';

    // Mostrar la sección de playlist (estaba oculta)
    this._dom.playlistWrap?.classList.remove('hidden');

    // Limpiar filtro de búsqueda
    if (this._dom.searchInput) this._dom.searchInput.value = '';

    // Poblar el desplegable de grupos
    this._buildGroupFilter(channels);

    // Renderizar la lista
    this._renderChannelList(channels);

    // Actualizar contador
    this._updateChannelCount(channels.length, channels.length);

    this._showStatus('success', `✓ ${label}`);
    console.info(`[PlaylistUI] Cargados ${channels.length} canales.`);

    // Mostrar la sección del reproductor
    this._dom.playerSection?.classList.remove('hidden');
  }

  /**
   * Limpia toda la playlist y resetea el estado.
   */
  _clearPlaylist() {
    this._allChannels = [];
    this._filtered    = [];

    // Detener reproducción
    window.cinemaPlayer?._stopCurrentPlayback?.();

    // Ocultar secciones
    this._dom.playlistWrap?.classList.add('hidden');
    this._dom.playerSection?.classList.add('hidden');

    // Limpiar inputs
    if (this._dom.urlInput)  this._dom.urlInput.value  = '';
    if (this._dom.searchInput) this._dom.searchInput.value = '';

    this._showStatus('info', 'Lista borrada. Carga una nueva lista M3U.');
    document.title = 'CinemaStream';
  }

  /**
   * Construye el menú desplegable de filtro por grupo.
   * @param {Array} channels
   */
  _buildGroupFilter(channels) {
    if (!this._dom.groupFilter) return;

    // Obtener grupos únicos ordenados
    const groups = [...new Set(channels.map(c => c.group).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));

    // Reconstruir las opciones del select
    this._dom.groupFilter.innerHTML = `
      <option value="all">Todos los grupos (${channels.length})</option>
      ${groups.map(g => {
        const count = channels.filter(c => c.group === g).length;
        return `<option value="${this._escapeAttr(g)}">${this._escapeHtml(g)} (${count})</option>`;
      }).join('')}
    `;
  }


  /* ══════════════════════════════════════════════════════════
     SECCIÓN 4 · BÚSQUEDA Y FILTROS
  ══════════════════════════════════════════════════════════ */

  _bindPlaylistEvents() {

    /* ── Búsqueda en tiempo real ─────────────────────────── */
    let debounceTimer;
    this._dom.searchInput?.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      // Esperar 200ms después de que el usuario deje de escribir
      debounceTimer = setTimeout(() => {
        this._searchQuery = this._dom.searchInput.value.trim();
        this._applyFilters();
      }, 200);
    });

    // Limpiar búsqueda con Escape
    this._dom.searchInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this._dom.searchInput.value = '';
        this._searchQuery = '';
        this._applyFilters();
      }
    });

    /* ── Filtro por grupo ─────────────────────────────────── */
    this._dom.groupFilter?.addEventListener('change', () => {
      this._activeGroup = this._dom.groupFilter.value;
      this._applyFilters();
    });

    /* ── Ordenar alfabéticamente ─────────────────────────── */
    let isSorted = false;
    this._dom.btnSortAlpha?.addEventListener('click', () => {
      isSorted = !isSorted;
      if (isSorted) {
        this._filtered = [...this._filtered].sort((a, b) =>
          a.title.localeCompare(b.title, 'es')
        );
      } else {
        // Restaurar orden original
        this._applyFilters(false); // false = no re-renderizar el filtro, solo restaurar orden
        return;
      }
      this._renderChannelList(this._filtered);
      this._dom.btnSortAlpha?.classList.toggle('active', isSorted);
    });
  }

  /**
   * Aplica los filtros activos (búsqueda + grupo) a la lista completa.
   */
  _applyFilters() {
    /* ── Usar el parser para filtrar ─────────────────────── */
    this._filtered = window.M3UParser.filter(this._allChannels, {
      query: this._searchQuery,
      group: this._activeGroup === 'all' ? '' : this._activeGroup,
    });

    this._renderChannelList(this._filtered);
    this._updateChannelCount(this._filtered.length, this._allChannels.length);
  }


  /* ══════════════════════════════════════════════════════════
     SECCIÓN 5 · RENDERIZADO DE LA LISTA
  ══════════════════════════════════════════════════════════ */

  /**
   * Renderiza la lista de canales en el DOM.
   * Agrupa los canales por categoría con encabezados colapsables.
   *
   * Estrategia de renderizado:
   *  - DocumentFragment para una sola inserción en el DOM
   *    (evitar reflows en cada elemento)
   *
   * @param {Array} channels - Canales filtrados a mostrar
   */
  _renderChannelList(channels) {
    if (!this._dom.channelList) return;

    /* ── Sin resultados ──────────────────────────────────── */
    if (channels.length === 0) {
      this._dom.channelList.innerHTML = `
        <div class="flex flex-col items-center gap-3 py-12 text-cinema-muted">
          <svg class="w-12 h-12 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <p class="text-sm">No se encontraron canales</p>
          <p class="text-xs">Prueba con otro término de búsqueda</p>
        </div>`;
      return;
    }

    /* ── Agrupar los canales por group-title ─────────────── */
    const grouped = window.M3UParser.groupBy(channels);

    /* ── Usar DocumentFragment para inserción eficiente ──── */
    const fragment = document.createDocumentFragment();

    grouped.forEach((groupChannels, groupName) => {
      // ── Encabezado del grupo ──────────────────────────────
      const groupHeader = document.createElement('div');
      groupHeader.className = 'playlist-group-header';
      groupHeader.innerHTML = `
        <button class="playlist-group-btn w-full flex items-center justify-between px-3 py-2
                       text-xs font-bold text-cinema-muted uppercase tracking-widest
                       hover:text-cinema-amber transition-colors duration-200 group"
                aria-expanded="true"
                aria-controls="group-${this._sanitizeId(groupName)}">
          <div class="flex items-center gap-2">
            <svg class="w-3 h-3 transition-transform duration-200 group-aria-[expanded=false]:rotate-180"
                 fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/>
            </svg>
            <span>${this._escapeHtml(groupName)}</span>
          </div>
          <span class="text-cinema-border">${groupChannels.length}</span>
        </button>`;

      // Hacer colapsable el grupo al hacer clic
      groupHeader.querySelector('.playlist-group-btn').addEventListener('click', (e) => {
        const btn      = e.currentTarget;
        const isOpen   = btn.getAttribute('aria-expanded') === 'true';
        const listEl   = document.getElementById(`group-${this._sanitizeId(groupName)}`);
        btn.setAttribute('aria-expanded', String(!isOpen));
        listEl?.classList.toggle('hidden', isOpen);
      });

      fragment.appendChild(groupHeader);

      // ── Lista de canales del grupo ─────────────────────
      const groupList = document.createElement('ul');
      groupList.id = `group-${this._sanitizeId(groupName)}`;
      groupList.className = 'playlist-group-list space-y-0.5 pb-1';
      groupList.setAttribute('role', 'list');

      groupChannels.forEach(channel => {
        const item = this._buildChannelItem(channel);
        groupList.appendChild(item);
      });

      fragment.appendChild(groupList);
    });

    /* ── Insertar todo el fragmento de una vez ───────────── */
    this._dom.channelList.innerHTML = '';
    this._dom.channelList.appendChild(fragment);

    /* ── Resaltar canal activo si existe ─────────────────── */
    if (this._activeId) {
      this._highlightActiveChannel(this._activeId);
    }
  }

  /**
   * Construye el elemento <li> de un canal individual.
   * Se usa createElement en lugar de innerHTML para mayor seguridad (XSS).
   *
   * @param {Object} channel - Objeto M3UChannel
   * @returns {HTMLElement}
   */
  _buildChannelItem(channel) {
    const li = document.createElement('li');
    li.className = 'playlist-item';
    li.dataset.channelId = channel.id;
    li.setAttribute('role', 'listitem');
    li.setAttribute('tabindex', '0');
    li.setAttribute('aria-label', `Reproducir ${channel.title}`);

    /* ── Icono/Logo ─────────────────────────────────────── */
    const logoEl = document.createElement('div');
    logoEl.className = 'playlist-item-logo';
    if (channel.logo) {
      const img = document.createElement('img');
      img.src     = channel.logo;
      img.alt     = '';
      img.loading = 'lazy';
      img.onerror = () => { img.remove(); logoEl.appendChild(this._buildDefaultIcon(channel.streamType)); };
      logoEl.appendChild(img);
    } else {
      logoEl.appendChild(this._buildDefaultIcon(channel.streamType));
    }

    /* ── Información ────────────────────────────────────── */
    const infoEl = document.createElement('div');
    infoEl.className = 'playlist-item-info';

    const titleEl = document.createElement('p');
    titleEl.className    = 'playlist-item-title';
    titleEl.textContent  = channel.title;
    titleEl.title        = channel.title; // tooltip

    infoEl.appendChild(titleEl);

    /* ── Badge de tipo ──────────────────────────────────── */
    const badgeEl = document.createElement('span');
    badgeEl.className = `playlist-item-badge ${channel.streamType}`;
    const badgeText = { hls: 'HLS', video: 'VID', audio: 'AUD', unknown: '?' };
    badgeEl.textContent = badgeText[channel.streamType] ?? '?';

    /* ── Botón de play ──────────────────────────────────── */
    const playBtn = document.createElement('button');
    playBtn.className = 'playlist-item-play-btn';
    playBtn.innerHTML = `
      <svg fill="currentColor" viewBox="0 0 24 24">
        <path d="M8 5v14l11-7z"/>
      </svg>`;
    playBtn.setAttribute('aria-label', `Reproducir ${channel.title}`);

    /* ── Ensamblar el elemento ──────────────────────────── */
    li.append(logoEl, infoEl, badgeEl, playBtn);

    /* ── Eventos de reproducción ────────────────────────── */
    const playFn = () => this._playChannel(channel);
    li.addEventListener('click',   playFn);
    li.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); playFn(); }
    });

    return li;
  }

  /**
   * Construye un icono SVG por defecto según el tipo de stream.
   * @param {string} type - 'hls' | 'video' | 'audio' | 'unknown'
   * @returns {SVGElement}
   */
  _buildDefaultIcon(type) {
    const paths = {
      video:   'M18 3v2h-2V3H8v2H6V3H4v18h2v-2h2v2h8v-2h2v2h2V3h-2z',
      hls:     'M15 10l4.553-2.069A1 1 0 0121 8.868v6.264a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z',
      audio:   'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
      unknown: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    };
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', type === 'hls' || type === 'audio' ? 'none' : 'currentColor');
    svg.setAttribute('stroke', type === 'hls' || type === 'audio' ? 'currentColor' : 'none');
    if (type === 'hls' || type === 'audio') {
      svg.setAttribute('stroke-width', '1.5');
      svg.setAttribute('stroke-linecap', 'round');
      svg.setAttribute('stroke-linejoin', 'round');
    }
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', paths[type] ?? paths.unknown);
    svg.appendChild(path);
    return svg;
  }


  /* ══════════════════════════════════════════════════════════
     SECCIÓN 6 · REPRODUCCIÓN DESDE LA PLAYLIST
  ══════════════════════════════════════════════════════════ */

  /**
   * Inicia la reproducción de un canal.
   * Pasa la playlist completa (sin filtrar) al reproductor para poder
   * navegar con prev/next sin limitarse al filtro activo.
   *
   * @param {Object} channel
   */
  _playChannel(channel) {
    this._activeId = channel.id;

    // El índice en la playlist completa (no en la filtrada)
    const idx = this._allChannels.findIndex(c => c.id === channel.id);

    /* ── Delegar al motor de reproducción global ─────────── */
    if (window.cinemaPlayer) {
      window.cinemaPlayer.playChannel(channel, this._allChannels, idx);
    } else {
      console.error('[PlaylistUI] cinemaPlayer no está inicializado.');
    }

    /* ── Actualizar indicador visual ─────────────────────── */
    this._highlightActiveChannel(channel.id);

    /* ── Hacer scroll hasta el ítem activo ──────────────── */
    const activeEl = this._dom.channelList?.querySelector(`[data-channel-id="${channel.id}"]`);
    activeEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /**
   * Marca visualmente el canal activo en la lista.
   * @param {string} channelId
   */
  _highlightActiveChannel(channelId) {
    // Quitar clase activa de todos
    this._dom.channelList?.querySelectorAll('.playlist-item').forEach(el => {
      el.classList.remove('active');
      el.removeAttribute('aria-current');
    });

    // Añadir al canal activo
    const activeEl = this._dom.channelList?.querySelector(`[data-channel-id="${channelId}"]`);
    if (activeEl) {
      activeEl.classList.add('active');
      activeEl.setAttribute('aria-current', 'true');
    }
  }


  /* ══════════════════════════════════════════════════════════
     SECCIÓN 7 · SINCRONIZACIÓN CON EL REPRODUCTOR
  ══════════════════════════════════════════════════════════ */

  /**
   * Suscribe esta UI a los eventos del CinemaPlayer para mantenerse
   * sincronizada cuando se cambia de canal desde los controles del player.
   */
  _bindPlayerEvents() {
    // Esperamos a que cinemaPlayer esté disponible
    const bindWhenReady = () => {
      if (!window.cinemaPlayer) {
        setTimeout(bindWhenReady, 100);
        return;
      }

      /* ── Canal cambiado (desde controles del player) ────── */
      window.cinemaPlayer.on('channelChange', (channel) => {
        if (channel?.id && channel.id !== this._activeId) {
          this._activeId = channel.id;
          this._highlightActiveChannel(channel.id);
        }
      });

      /* ── Canal siguiente/anterior ─────────────────────── */
      window.cinemaPlayer.on('channelNext', (ch) => { if (ch) this._highlightActiveChannel(ch.id); });
      window.cinemaPlayer.on('channelPrev', (ch) => { if (ch) this._highlightActiveChannel(ch.id); });

      /* ── Actualizar la barra inferior de la app ─────────── */
      window.cinemaPlayer.on('uiUpdate', (channel) => {
        this._syncGlobalPlayerBar(channel);
      });
    };

    bindWhenReady();
  }

  /**
   * Sincroniza la barra de reproducción inferior de la app
   * con el canal que está sonando en el player embebido.
   * @param {Object} channel
   */
  _syncGlobalPlayerBar(channel) {
    const titleEl    = document.getElementById('player-title');
    const subtitleEl = document.getElementById('player-subtitle');
    const thumbImg   = document.getElementById('player-thumb');
    const defIcon    = document.getElementById('player-default-icon');
    const pill       = document.getElementById('now-playing-pill');
    const pillTitle  = document.getElementById('now-playing-title');

    if (titleEl)    titleEl.textContent    = channel.title || '';
    if (subtitleEl) subtitleEl.textContent = channel.group || '';
    if (pillTitle)  pillTitle.textContent  = channel.title || '';

    if (thumbImg && channel.logo) {
      thumbImg.src = channel.logo;
      thumbImg.classList.remove('hidden');
      defIcon?.classList.add('hidden');
    }

    // Mostrar la pill y el player bar
    pill?.classList.remove('hidden');
    pill?.classList.add('flex');
    document.getElementById('player-bar')?.classList.remove('translate-y-full');
  }


  /* ══════════════════════════════════════════════════════════
     SECCIÓN 8 · FEEDBACK DE ESTADO
  ══════════════════════════════════════════════════════════ */

  /**
   * Muestra un mensaje de estado en la barra de importación.
   * @param {'loading'|'success'|'error'|'info'} type
   * @param {string} message
   */
  _showStatus(type, message) {
    if (!this._dom.statusBar || !this._dom.statusText) return;

    this._dom.statusBar.classList.remove('hidden');
    this._dom.statusText.textContent = message;

    // Colores por tipo de estado
    const colors = {
      loading: 'text-cinema-amber',
      success: 'text-green-400',
      error:   'text-red-400',
      info:    'text-cinema-muted',
    };
    this._dom.statusText.className = `text-sm ${colors[type] ?? colors.info}`;

    // Auto-ocultar mensajes de éxito después de 5 segundos
    if (type === 'success') {
      setTimeout(() => this._dom.statusBar?.classList.add('hidden'), 5000);
    }
  }

  /**
   * Activa o desactiva el estado de "cargando" en el botón de importación.
   * @param {boolean} loading
   * @param {string}  [msg] - Mensaje a mostrar mientras carga
   */
  _setLoadingState(loading, msg = '') {
    this._isLoading = loading;

    if (this._dom.btnLoadUrl) {
      this._dom.btnLoadUrl.disabled = loading;
      this._dom.btnLoadUrl.innerHTML = loading
        ? `<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
             <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
             <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
           </svg> Cargando…`
        : `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
               d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
           </svg> Cargar`;
    }

    if (msg) this._showStatus('loading', msg);
  }

  /**
   * Actualiza el contador de canales mostrados vs total.
   * @param {number} shown - Canales visibles tras filtros
   * @param {number} total - Total de canales en la lista
   */
  _updateChannelCount(shown, total) {
    if (!this._dom.channelCount) return;
    this._dom.channelCount.textContent = shown === total
      ? `${total} canales`
      : `${shown} de ${total} canales`;
  }


  /* ══════════════════════════════════════════════════════════
     SECCIÓN 9 · UTILIDADES PRIVADAS
  ══════════════════════════════════════════════════════════ */

  /** Escapa HTML para evitar XSS al usar innerHTML */
  _escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** Escapa para usar en atributos HTML */
  _escapeAttr(str) {
    return String(str).replace(/"/g, '&quot;');
  }

  /** Crea un ID de elemento DOM válido a partir de un texto de grupo */
  _sanitizeId(str) {
    return String(str).toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 40);
  }
}


/* ─────────────────────────────────────────────────────────────────
   EXPORTAR INSTANCIA GLOBAL
───────────────────────────────────────────────────────────────── */
window.playlistUI = new PlaylistUI();
