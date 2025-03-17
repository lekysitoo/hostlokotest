const { ErrorTypes, BotError } = require('./errorHandler.js');
const githubManager = require('./githubManager.js');
const cacheManager = require('./cacheManager.js');

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
            },

            // Sistema de estadísticas mejorado
            stats: {
                players: new Map(), // Estadísticas globales por jugador
                currentGame: new Map(), // Estadísticas del partido actual
                history: [], // Historial de partidos
                lastSync: 0, // Último sync con GitHub
                possession: {
                    red: 0,
                    blue: 0,
                    lastTouch: null,
                    startTime: null
                },
                teamStats: {
                    red: {
                        shots: 0,
                        shotsOnTarget: 0,
                        passes: 0,
                        possession: 0,
                        tackles: 0,
                        fouls: 0
                    },
                    blue: {
                        shots: 0,
                        shotsOnTarget: 0,
                        passes: 0,
                        possession: 0,
                        tackles: 0,
                        fouls: 0
                    }
                }
            },

            // Sistema de uniformes
            uniforms: {
                available: new Map(), // Uniformes disponibles
                current: {
                    red: null,
                    blue: null
                },
                custom: new Map() // Uniformes personalizados
            }
        };

        // Inicializar uniformes por defecto primero
        this.initializeUniforms();
        
        // Iniciar la carga asíncrona
        this._init();
    }

    // Método privado para inicialización asíncrona
    _init() {
        // Cargar datos
        this.loadAllData()
            .then(() => {
                // Configurar auto-save cada 5 minutos
                setInterval(() => this.saveAllData(), 5 * 60 * 1000);
                console.log('🚀 Estado inicializado correctamente');
            })
            .catch(error => {
                console.error('Error inicializando estado:', error);
            });
    }

    // Cargar todos los datos
    async loadAllData() {
        try {
            // Cargar admins
            const admins = await githubManager.loadData('admins.json');
            if (admins) {
                this.state.permanentAdmins = new Map(admins);
            }

            // Cargar uniformes
            const uniforms = await githubManager.loadData('uniforms.json');
            if (uniforms) {
                this.state.uniforms.available = new Map(Object.entries(uniforms));
            } else {
                this.initializeUniforms(); // Usar uniformes por defecto
            }

            // Cargar estadísticas
            const stats = await githubManager.loadData('stats.json');
            if (stats) {
                this.state.stats.players = new Map(stats.players);
                this.state.stats.history = stats.history || [];
            }

        } catch (error) {
            console.error('Error cargando datos:', error);
            throw new BotError(ErrorTypes.GITHUB, 'LOAD_FAILED', 'Error cargando datos iniciales');
        }
    }

    // Guardar todos los datos
    async saveAllData() {
        try {
            // Guardar admins
            await githubManager.saveData('admins.json', Array.from(this.state.permanentAdmins.entries()));

            // Guardar uniformes personalizados
            await githubManager.saveData('uniforms.json', Object.fromEntries(this.state.uniforms.custom));

            // Guardar estadísticas
            await githubManager.saveData('stats.json', {
                players: Array.from(this.state.stats.players.entries()),
                history: this.state.stats.history,
                lastUpdate: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error guardando datos:', error);
        }
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

    // Métodos de estadísticas
    getPlayerStats(playerId) {
        const cacheKey = `player_stats_${playerId}`;
        let stats = cacheManager.get(cacheKey, 'stats');
        
        if (!stats) {
            stats = this.state.stats.players.get(playerId);
            if (stats) {
                cacheManager.set(cacheKey, stats, 'stats');
            }
        }
        
        return stats;
    }

    updatePlayerStats(playerId, name, update) {
        let stats = this.getPlayerStats(playerId) || {
            name,
            goals: 0,
            assists: 0,
            playTime: 0,
            wins: 0,
            losses: 0,
            gamesPlayed: 0,
            // Nuevas estadísticas
            passes: 0,
            passesCompleted: 0,
            shots: 0,
            shotsOnTarget: 0,
            tackles: 0,
            ballTouch: 0,
            possession: 0,
            saves: 0,
            fouls: 0,
            yellowCards: 0,
            redCards: 0,
            mvps: 0,
            rating: 0,
            // Estadísticas de portero
            goalkeepingTime: 0,
            goalsAgainst: 0,
            cleanSheets: 0,
            // Rachas
            winStreak: 0,
            bestWinStreak: 0,
            scoringStreak: 0,
            bestScoringStreak: 0
        };

        // Actualizar estadísticas
        Object.keys(update).forEach(key => {
            if (key in stats) {
                stats[key] += update[key];
            }
        });

        // Calcular porcentajes y promedios
        stats.passAccuracy = stats.passes > 0 ? (stats.passesCompleted / stats.passes) * 100 : 0;
        stats.shotAccuracy = stats.shots > 0 ? (stats.shotsOnTarget / stats.shots) * 100 : 0;
        stats.goalsPerGame = stats.gamesPlayed > 0 ? stats.goals / stats.gamesPlayed : 0;
        stats.winRate = stats.gamesPlayed > 0 ? (stats.wins / stats.gamesPlayed) * 100 : 0;

        // Actualizar rachas
        if (update.wins > 0) {
            stats.winStreak++;
            stats.bestWinStreak = Math.max(stats.bestWinStreak, stats.winStreak);
        } else if (update.losses > 0) {
            stats.winStreak = 0;
        }

        if (update.goals > 0) {
            stats.scoringStreak++;
            stats.bestScoringStreak = Math.max(stats.bestScoringStreak, stats.scoringStreak);
        } else if (update.gamesPlayed > 0) {
            stats.scoringStreak = 0;
        }

        // Calcular rating (0-10)
        stats.rating = this.calculatePlayerRating(stats);

        // Actualizar caché y estado
        const cacheKey = `player_stats_${playerId}`;
        cacheManager.set(cacheKey, stats, 'stats');
        this.state.stats.players.set(playerId, stats);

        // Programar guardado
        this.scheduleStatsSave();
    }

    calculatePlayerRating(stats) {
        // Sistema de rating basado en múltiples factores
        const weights = {
            goals: 2,
            assists: 1.5,
            passAccuracy: 0.8,
            shotAccuracy: 0.7,
            winRate: 1,
            saves: 1.2,
            mvps: 1.5
        };

        let rating = 0;
        let totalWeight = 0;

        // Goles y asistencias por partido
        rating += (stats.goalsPerGame * 5) * weights.goals;
        totalWeight += weights.goals;

        // Precisión de pases (0-100%)
        rating += (stats.passAccuracy / 20) * weights.passAccuracy;
        totalWeight += weights.passAccuracy;

        // Precisión de tiros
        rating += (stats.shotAccuracy / 20) * weights.shotAccuracy;
        totalWeight += weights.shotAccuracy;

        // Porcentaje de victorias
        rating += (stats.winRate / 20) * weights.winRate;
        totalWeight += weights.winRate;

        // MVPs
        rating += (stats.mvps * 2) * weights.mvps;
        totalWeight += weights.mvps;

        // Normalizar a escala 0-10
        return Math.min(10, Math.max(0, rating / totalWeight));
    }

    getTopPlayers(category, limit = 5) {
        const cacheKey = `top_players_${category}_${limit}`;
        let topPlayers = cacheManager.get(cacheKey, 'stats');
        
        if (!topPlayers) {
            const validStats = {
                'goles': 'goals',
                'asistencias': 'assists',
                'victorias': 'wins'
            };

            const statKey = validStats[category];
            if (!statKey) return [];

            topPlayers = Array.from(this.state.stats.players.values())
                .sort((a, b) => b[statKey] - a[statKey])
                .slice(0, limit)
                .map(player => ({
                    name: player.name,
                    value: player[statKey]
                }));

            cacheManager.set(cacheKey, topPlayers, 'stats');
        }

        return topPlayers;
    }

    getCurrentMVP() {
        if (this.state.stats.currentGame.size === 0) return null;

        return Array.from(this.state.stats.currentGame.values())
            .map(player => ({
                ...player,
                score: (player.goals * 2) + player.assists
            }))
            .sort((a, b) => b.score - a.score)[0];
    }

    // Sistema de uniformes
    initializeUniforms() {
        // Equipos de fútbol
        const teams = {
            'boca': { angle: 90, colors: ['#0000FF', '#FFD700'] },
            'river': { angle: 45, colors: ['#FF0000', '#FFFFFF'] },
            'barcelona': { angle: 90, colors: ['#00529F', '#A50044'] },
            'real': { angle: 0, colors: ['#FFFFFF', '#FFC300'] },
            'psg': { angle: 90, colors: ['#004170', '#DA291C'] },
            'city': { angle: 0, colors: ['#6CABDD', '#1C2C5B'] },
            'united': { angle: 0, colors: ['#DA291C', '#FBE122'] },
            'liverpool': { angle: 0, colors: ['#C8102E', '#F6EB61'] },
            'juventus': { angle: 180, colors: ['#000000', '#FFFFFF'] },
            'milan': { angle: 90, colors: ['#FB090B', '#000000'] }
        };

        // Uniformes alternativos
        const alternativeKits = {
            'brasil': { angle: 0, colors: ['#FEE12B', '#009C3B'] },
            'argentina': { angle: 90, colors: ['#75AADB', '#FFFFFF'] },
            'uruguay': { angle: 0, colors: ['#7BAFD4', '#000000'] },
            'francia': { angle: 90, colors: ['#002395', '#FFFFFF'] },
            'alemania': { angle: 90, colors: ['#000000', '#FFFFFF'] }
        };

        // Guardar todos los uniformes
        this.state.uniforms.available = new Map([
            ...Object.entries(teams),
            ...Object.entries(alternativeKits)
        ]);
    }

    setTeamUniform(team, uniformName) {
        const uniform = this.state.uniforms.available.get(uniformName.toLowerCase()) || 
                       this.state.uniforms.custom.get(uniformName.toLowerCase());

        if (!uniform) {
            throw new BotError(ErrorTypes.GAME, 'UNIFORM_NOT_FOUND', `No se encontró el uniforme ${uniformName}`);
        }

        this.state.uniforms.current[team === 1 ? 'red' : 'blue'] = {
            name: uniformName,
            ...uniform
        };
    }

    addCustomUniform(name, colors, angle = 0) {
        if (colors.length !== 2) {
            throw new BotError(ErrorTypes.GAME, 'INVALID_UNIFORM', 'El uniforme debe tener 2 colores');
        }

        this.state.uniforms.custom.set(name.toLowerCase(), {
            angle,
            colors
        });
    }

    getAvailableUniforms() {
        return {
            predefined: Array.from(this.state.uniforms.available.keys()),
            custom: Array.from(this.state.uniforms.custom.keys())
        };
    }

    getCurrentUniforms() {
        return this.state.uniforms.current;
    }

    // Métodos de posesión
    startPossessionTracking() {
        this.state.stats.possession = {
            red: 0,
            blue: 0,
            lastTouch: null,
            startTime: Date.now()
        };
    }

    updatePossession(playerId) {
        const player = this.getPlayerTeam(playerId);
        if (!player || !this.state.stats.possession.startTime) return;

        const now = Date.now();
        const timeDiff = now - this.state.stats.possession.startTime;

        if (this.state.stats.possession.lastTouch) {
            const lastTeam = this.getPlayerTeam(this.state.stats.possession.lastTouch);
            if (lastTeam) {
                this.state.stats.possession[lastTeam] += timeDiff;
            }
        }

        this.state.stats.possession.lastTouch = playerId;
        this.state.stats.possession.startTime = now;
    }

    getPossessionStats() {
        const total = this.state.stats.possession.red + this.state.stats.possession.blue;
        if (total === 0) return { red: 50, blue: 50 };

        return {
            red: Math.round((this.state.stats.possession.red / total) * 100),
            blue: Math.round((this.state.stats.possession.blue / total) * 100)
        };
    }

    // Métodos de estadísticas de equipo
    updateTeamStats(team, update) {
        const teamStats = this.state.stats.teamStats[team];
        Object.keys(update).forEach(key => {
            if (key in teamStats) {
                teamStats[key] += update[key];
            }
        });
    }

    getTeamStats(team) {
        return this.state.stats.teamStats[team];
    }

    // Métodos de sincronización con GitHub
    scheduleStatsSave() {
        const now = Date.now();
        if (now - this.state.stats.lastSync > 300000) { // 5 minutos
            this.saveAllData();
            this.state.stats.lastSync = now;
        }
    }
}

module.exports = new StateManager(); 