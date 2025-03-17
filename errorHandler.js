// Tipos de errores
const ErrorTypes = {
    GITHUB: 'GITHUB_ERROR',
    COMMAND: 'COMMAND_ERROR',
    AUTH: 'AUTH_ERROR',
    GAME: 'GAME_ERROR',
    NETWORK: 'NETWORK_ERROR'
};

// Mensajes de error personalizados
const ErrorMessages = {
    [ErrorTypes.GITHUB]: {
        LOAD_FAILED: '❌ Error al cargar datos de GitHub',
        SAVE_FAILED: '❌ Error al guardar datos en GitHub',
        TOKEN_INVALID: '❌ Token de GitHub inválido'
    },
    [ErrorTypes.COMMAND]: {
        INVALID_ARGS: '❌ Argumentos inválidos',
        NO_PERMISSION: '❌ No tenés permisos para este comando',
        EXECUTION_FAILED: '❌ Error al ejecutar el comando'
    },
    [ErrorTypes.AUTH]: {
        LOGIN_FAILED: '❌ Error de login',
        INVALID_PASSWORD: '❌ Contraseña incorrecta',
        SESSION_EXPIRED: '❌ Sesión expirada'
    },
    [ErrorTypes.GAME]: {
        START_FAILED: '❌ Error al iniciar el juego',
        PLAYER_ACTION_FAILED: '❌ Error en acción del jugador',
        MAP_LOAD_FAILED: '❌ Error al cargar el mapa'
    },
    [ErrorTypes.NETWORK]: {
        CONNECTION_LOST: '❌ Conexión perdida',
        TIMEOUT: '❌ Tiempo de espera agotado',
        API_ERROR: '❌ Error en la API'
    }
};

// Clase para manejar errores
class BotError extends Error {
    constructor(type, specificError, details = null) {
        const message = ErrorMessages[type][specificError] || 'Error desconocido';
        super(message);
        this.type = type;
        this.specificError = specificError;
        this.details = details;
        this.timestamp = new Date();
    }

    // Loguear error con detalles
    log() {
        console.error(`[${this.timestamp.toISOString()}] ${this.type}: ${this.message}`);
        if (this.details) {
            console.error('Detalles:', this.details);
        }
    }

    // Obtener mensaje para el usuario
    getUserMessage() {
        return this.message;
    }

    // Obtener mensaje para admin
    getAdminMessage() {
        return `${this.message}\nTipo: ${this.type}\nError: ${this.specificError}\nTimestamp: ${this.timestamp.toISOString()}`;
    }
}

// Función para manejar errores
function handleError(error, room, player = null) {
    // Si es nuestro tipo de error personalizado
    if (error instanceof BotError) {
        error.log();
        
        // Enviar mensaje al jugador si existe
        if (player) {
            room.sendAnnouncement(error.getUserMessage(), player.id, 0xFF0000);
        }
        
        // Si es error crítico, notificar a todos los admins
        if (error.type === ErrorTypes.GITHUB || error.type === ErrorTypes.NETWORK) {
            room.getPlayerList().forEach(p => {
                if (p.admin) {
                    room.sendAnnouncement(error.getAdminMessage(), p.id, 0xFF0000);
                }
            });
        }
    } else {
        // Para errores no manejados
        console.error('Error no manejado:', error);
        if (player) {
            room.sendAnnouncement('❌ Ocurrió un error inesperado', player.id, 0xFF0000);
        }
    }
}

// Exportar todo lo necesario
module.exports = {
    ErrorTypes,
    ErrorMessages,
    BotError,
    handleError
}; 