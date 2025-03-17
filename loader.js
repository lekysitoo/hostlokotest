// Configuración del sistema
window.CONFIG = {
    GITHUB: {
        owner: 'lekysitoo',
        repo: 'hostlokotest',
        token: '', // Se llenará desde la UI
        path: 'admins.json',
        uniformsPath: 'uniforms.json',
        mapsPath: 'maps.json',
        branch: 'main',
        apiBaseUrl: 'https://api.github.com'
    },
    ROOM: {
        name: "TESTIANDO RONALDO",
        adminPassword: "lisensiado",
        roomPassword: "12",
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
    }
};

// Función para cargar el token desde la UI
window.loadConfig = function(token) {
    window.CONFIG.GITHUB.token = token;
    return window.CONFIG;
}; 