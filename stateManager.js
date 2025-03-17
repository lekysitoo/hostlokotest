const { ErrorTypes, BotError } = require('./errorHandler.js');

class StateManager {
    constructor() {
        this.state = {
            // Admins y moderación
            permanentAdmins: new Map(),
            adminPassword: null,
            adminList: [],
            banList: [],
            mutedList: [],
            mutedPlayers: new Map(),
            spies: new Set(),

            // Jugadores
            playerNames: new Map(),
            playerAuth: new Map(),
            history: new Map(),

            // Estado de carga
            isLoadingAdmins: false,
            lastLoadAttempt: 0,

            // Configuración de equipos
            teamColors: {
                1: null,
                2: null
            },

            // Características especiales
            discoMode: false,
            discoInterval: null,
            waitingHoroscope: new Set(),

            // Sistema de carreras
            race: {
                isActive: false,
                participants: new Map(),
                positions: new Map(),
                animalEmojis: ["🐎", "🦊", "🐅", "🦘", "🦬", "🦏", "🦒", "🐪", "🦙", "🦘", "🐘", "🦛"],
                trackLength: 20
            },

            // Sistema de sustituciones
            substitution: {
                active: false,
                step: 0,
                team: null,
                playerToChange: null,
                playerPosition: null,
                initiator: null,
                teamPlayers: null
            }
        };
    }

    // Métodos para admins
    setAdminPassword(password) {
        if (!password) {
            throw new BotError(ErrorTypes.AUTH, 'INVALID_PASSWORD', 'Password cannot be empty');
        }
        this.state.adminPassword = password;
    }

    addAdmin(playerId) {
        if (!this.state.adminList.includes(playerId)) {
            this.state.adminList.push(playerId);
        }
    }

    removeAdmin(playerId) {
        this.state.adminList = this.state.adminList.filter(id => id !== playerId);
    }

    isAdmin(playerId) {
        return this.state.adminList.includes(playerId);
    }

    // Métodos para jugadores
    addPlayer(id, name, auth) {
        this.state.playerNames.set(id, name);
        if (auth) this.state.playerAuth.set(id, auth);
    }

    removePlayer(id) {
        this.state.playerNames.delete(id);
        this.state.playerAuth.delete(id);
    }

    getPlayerName(id) {
        return this.state.playerNames.get(id);
    }

    // Métodos para moderación
    banPlayer(id) {
        if (!this.state.banList.includes(id)) {
            this.state.banList.push(id);
        }
    }

    unbanPlayer(id) {
        this.state.banList = this.state.banList.filter(bannedId => bannedId !== id);
    }

    isBanned(id) {
        return this.state.banList.includes(id);
    }

    mutePlayer(id, duration) {
        this.state.mutedList.push(id);
        this.state.mutedPlayers.set(id, {
            until: Date.now() + duration,
            warnings: 0
        });
    }

    unmutePlayer(id) {
        this.state.mutedList = this.state.mutedList.filter(mutedId => mutedId !== id);
        this.state.mutedPlayers.delete(id);
    }

    isMuted(id) {
        if (!this.state.mutedPlayers.has(id)) return false;
        const muteInfo = this.state.mutedPlayers.get(id);
        if (Date.now() > muteInfo.until) {
            this.unmutePlayer(id);
            return false;
        }
        return true;
    }

    // Métodos para características especiales
    toggleDiscoMode() {
        this.state.discoMode = !this.state.discoMode;
        return this.state.discoMode;
    }

    setTeamColor(team, color) {
        if (team !== 1 && team !== 2) {
            throw new BotError(ErrorTypes.GAME, 'INVALID_TEAM', `Invalid team number: ${team}`);
        }
        this.state.teamColors[team] = color;
    }

    // Getters generales
    getState() {
        return this.state;
    }

    // Métodos para carreras
    startRace() {
        if (this.state.race.isActive) {
            throw new BotError(ErrorTypes.GAME, 'RACE_ALREADY_ACTIVE', 'There is already an active race');
        }
        this.state.race.isActive = true;
        this.state.race.participants.clear();
        this.state.race.positions.clear();
    }

    endRace() {
        this.state.race.isActive = false;
        this.state.race.participants.clear();
        this.state.race.positions.clear();
    }
}

module.exports = new StateManager(); 