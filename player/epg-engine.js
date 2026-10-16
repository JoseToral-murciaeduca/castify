/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  Castify · epg-engine.js                                         ║
 * ║  Motor de Guía Electrónica de Programación (EPG / XMLTV)        ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

'use strict';

const EPGEngine = {
    _epgData: new Map(), // Map<tvgId, Array<Programme>>
    _isLoading: false,
    _loadedUrl: '',

    /**
     * Carga y procesa un archivo XMLTV desde una URL.
     */
    async loadEPG(url) {
        if (!url || url === this._loadedUrl) return;
        this._isLoading = true;
        this._loadedUrl = url;

        try {
            // Intentar descarga directa o mediante proxy CORS si falla
            let text = '';
            try {
                const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
                if (res.ok) text = await res.text();
            } catch (_) {
                const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
                const resProxy = await fetch(proxyUrl, { signal: AbortSignal.timeout(20000) });
                if (resProxy.ok) text = await resProxy.text();
            }

            if (!text) throw new Error('No se pudo obtener el XMLTV');

            this._parseXMLTV(text);
            console.info(`[EPGEngine] ✓ EPG cargada correctamente (${this._epgData.size} canales con guía).`);
            Utils.showToast('Guía de programación (EPG) cargada', 'success');
        } catch (err) {
            console.warn('[EPGEngine] Error al cargar la EPG:', err);
        } finally {
            this._isLoading = false;
        }
    },

    /**
     * Parsea la estructura XML de XMLTV.
     */
    _parseXMLTV(xmlText) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        const programmes = xmlDoc.querySelectorAll('programme');

        this._epgData.clear();

        programmes.forEach(prog => {
            const channelId = prog.getAttribute('channel');
            const startStr = prog.getAttribute('start');
            const stopStr = prog.getAttribute('stop');
            const title = prog.querySelector('title')?.textContent || 'Sin título';
            const desc = prog.querySelector('desc')?.textContent || '';
            const category = prog.querySelector('category')?.textContent || '';

            if (!channelId || !startStr || !stopStr) return;

            const start = this._parseXMLDate(startStr);
            const stop = this._parseXMLDate(stopStr);

            const item = { title, desc, category, start, stop };

            if (!this._epgData.has(channelId)) {
                this._epgData.set(channelId, []);
            }
            this._epgData.get(channelId).push(item);
        });
    },

    /**
     * Convierte fechas en formato XMLTV (ej: 20261016200000 +0200) a objetos Date de JS.
     */
    _parseXMLDate(str) {
        if (!str) return new Date();
        const cleanStr = str.trim().split(' ')[0];
        const y = parseInt(cleanStr.slice(0, 4), 10);
        const m = parseInt(cleanStr.slice(4, 6), 10) - 1;
        const d = parseInt(cleanStr.slice(6, 8), 10);
        const h = parseInt(cleanStr.slice(8, 10), 10);
        const min = parseInt(cleanStr.slice(10, 12), 10);
        const s = parseInt(cleanStr.slice(12, 14), 10) || 0;
        return new Date(Date.UTC(y, m, d, h, min, s));
    },

    /**
     * Obtiene el programa que se está emitiendo en este momento para un canal.
     */
    getNowPlaying(tvgId, tvgName) {
        const id = tvgId || tvgName;
        if (!id || !this._epgData.has(id)) return null;

        const now = new Date();
        const list = this._epgData.get(id);

        return list.find(p => now >= p.start && now <= p.stop) || null;
    },

    /**
     * Obtiene el siguiente programa en la parrilla.
     */
    getNextProgram(tvgId, tvgName) {
        const id = tvgId || tvgName;
        if (!id || !this._epgData.has(id)) return null;

        const now = new Date();
        const list = this._epgData.get(id);

        return list.find(p => p.start > now) || null;
    }
};