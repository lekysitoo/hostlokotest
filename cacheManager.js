const CONFIG = require('./config.js');

class CacheManager {
    constructor() {
        this.cache = {
            messages: new Map(),
            players: new Map(),
            stats: new Map(),
            lastCleanup: Date.now()
        };

        // Límites de caché
        this.LIMITS = {
            MESSAGES: 100,
            PLAYERS: 500,
            STATS_TTL: 5 * 60 * 1000, // 5 minutos
            CLEANUP_INTERVAL: 10 * 60 * 1000 // 10 minutos
        };

        // Iniciar limpieza automática
        this.startAutoCleanup();
    }

    // Método para guardar en caché con TTL
    set(key, value, category = 'stats') {
        const entry = {
            value,
            timestamp: Date.now(),
            accessCount: 0
        };

        switch(category) {
            case 'messages':
                this.cache.messages.set(key, entry);
                this.trimCache(this.cache.messages, this.LIMITS.MESSAGES);
                break;
            case 'players':
                this.cache.players.set(key, entry);
                this.trimCache(this.cache.players, this.LIMITS.PLAYERS);
                break;
            case 'stats':
                this.cache.stats.set(key, entry);
                break;
        }
    }

    // Obtener valor del caché
    get(key, category = 'stats') {
        const cache = this.cache[category];
        const entry = cache.get(key);

        if (!entry) return null;

        // Actualizar contador de accesos y timestamp
        entry.accessCount++;
        entry.timestamp = Date.now();
        cache.set(key, entry);

        return entry.value;
    }

    // Limpiar entradas viejas
    cleanup() {
        const now = Date.now();
        
        // Limpiar stats viejos
        for (const [key, entry] of this.cache.stats.entries()) {
            if (now - entry.timestamp > this.LIMITS.STATS_TTL) {
                this.cache.stats.delete(key);
            }
        }

        // Limpiar mensajes y jugadores basado en uso
        this.trimCache(this.cache.messages, this.LIMITS.MESSAGES);
        this.trimCache(this.cache.players, this.LIMITS.PLAYERS);

        this.cache.lastCleanup = now;
    }

    // Recortar caché basado en uso y tiempo
    trimCache(cache, limit) {
        if (cache.size <= limit) return;

        // Ordenar por último acceso y frecuencia
        const entries = Array.from(cache.entries())
            .sort((a, b) => {
                const scoreA = a[1].accessCount / (Date.now() - a[1].timestamp);
                const scoreB = b[1].accessCount / (Date.now() - b[1].timestamp);
                return scoreA - scoreB;
            });

        // Eliminar las entradas menos usadas
        const toDelete = entries.slice(0, entries.length - limit);
        toDelete.forEach(([key]) => cache.delete(key));
    }

    // Iniciar limpieza automática
    startAutoCleanup() {
        setInterval(() => {
            try {
                this.cleanup();
            } catch (error) {
                console.error('Error en limpieza de caché:', error);
            }
        }, this.LIMITS.CLEANUP_INTERVAL);
    }

    // Obtener estadísticas del caché
    getStats() {
        return {
            messages: this.cache.messages.size,
            players: this.cache.players.size,
            stats: this.cache.stats.size,
            lastCleanup: this.cache.lastCleanup
        };
    }

    // Limpiar todo el caché
    clear() {
        this.cache.messages.clear();
        this.cache.players.clear();
        this.cache.stats.clear();
        this.cache.lastCleanup = Date.now();
    }
}

module.exports = new CacheManager(); 