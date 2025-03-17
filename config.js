// Configuración del sistema
const CONFIG = {
    GITHUB: {
        owner: 'lekysitoo',
        repo: 'hostlokotest',
        token: process.env.GITHUB_TOKEN || 'YOUR_TOKEN_HERE', // Solo esto queda en .env
        path: 'admins.json',
        uniformsPath: 'uniforms.json',
        mapsPath: 'maps.json',
        branch: 'main',
        apiBaseUrl: 'https://api.github.com'
    },
    ROOM: {
        name: "TESTIANDO RONALDO",
        adminPassword: "lisensiado",     // Volvemos al valor original
        roomPassword: "12",              // Volvemos al valor original
        maxPlayers: 22,
        geo: {
            code: "ar",
            lat: -34.6374,
            lon: -58.4058
        },
        defaultColors: {
            red: 0xED6A5A,
            blue: 0x5995ED
        }
    },
    CACHE: {
        MESSAGE_HISTORY_LIMIT: 100,
        PLAYER_HISTORY_LIMIT: 50,
        CLEANUP_INTERVAL: 300000,
        INACTIVE_TIMEOUT: 3600000
    }
};

// Exportar la configuración
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} 