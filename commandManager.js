const { ErrorTypes, BotError, handleError } = require('./errorHandler.js');
const stateManager = require('./stateManager.js');

// Colores para mensajes
const COLORS = {
    SUCCESS_GREEN: 0x2ECC71,
    ERROR_RED: 0xE74C3C,
    WARNING_ORANGE: 0xE67E22,
    INFO_BLUE: 0x3498DB,
    ADMIN_ORANGE: 0xF39C12,
    SPECIAL_PURPLE: 0x9B59B6,
    TEAM_RED: 0xFF4040,
    TEAM_BLUE: 0x4040FF
};

// Definición de comandos
const commands = {
    // Comandos de Admin (visibles)
    admin: {
        login: {
            description: "Iniciar sesión como admin",
            usage: "!login [contraseña]",
            adminOnly: false,
            handler: (room, player, args) => {
                if (args.length !== 1) {
                    throw new BotError(ErrorTypes.COMMAND, 'INVALID_ARGS', 'Uso correcto: !login [contraseña]');
                }

                const password = args[0];
                if (password === stateManager.getState().adminPassword) {
                    room.setPlayerAdmin(player.id, true);
                    stateManager.addAdmin(player.id);
                    return { message: "✅ ¡Login exitoso! Ahora sos admin.", color: COLORS.SUCCESS_GREEN };
                } else {
                    throw new BotError(ErrorTypes.AUTH, 'INVALID_PASSWORD', 'Contraseña incorrecta');
                }
            }
        },
        mute: {
            description: "Mutear a un jugador",
            usage: "!mute @jugador [minutos]",
            adminOnly: true,
            handler: (room, player, args) => {
                if (args.length !== 2) {
                    throw new BotError(ErrorTypes.COMMAND, 'INVALID_ARGS', 'Uso correcto: !mute @jugador [minutos]');
                }

                const targetName = args[0].replace('@', '');
                const duration = parseInt(args[1]) * 60 * 1000;
                
                const target = room.getPlayerList().find(p => p.name === targetName);
                if (!target) {
                    throw new BotError(ErrorTypes.COMMAND, 'PLAYER_NOT_FOUND', `No se encontró al jugador ${targetName}`);
                }

                stateManager.mutePlayer(target.id, duration);
                return {
                    message: `🤐 ${targetName} ha sido muteado por ${args[1]} minutos`,
                    color: COLORS.SUCCESS_GREEN
                };
            }
        },
        unmute: {
            description: "Desmutear a un jugador",
            usage: "!unmute @jugador",
            adminOnly: true,
            handler: (room, player, args) => {
                if (args.length !== 1) {
                    throw new BotError(ErrorTypes.COMMAND, 'INVALID_ARGS', 'Uso correcto: !unmute @jugador');
                }

                const targetName = args[0].replace('@', '');
                const target = room.getPlayerList().find(p => p.name === targetName);
                if (!target) {
                    throw new BotError(ErrorTypes.COMMAND, 'PLAYER_NOT_FOUND', `No se encontró al jugador ${targetName}`);
                }

                stateManager.unmutePlayer(target.id);
                return {
                    message: `🔊 ${targetName} ha sido desmuteado`,
                    color: COLORS.SUCCESS_GREEN
                };
            }
        }
    },

    // Comandos de Juego
    game: {
        bb: {
            description: "Despedirse y salir de la sala",
            usage: "!bb",
            adminOnly: false,
            handler: (room, player) => {
                room.kickPlayer(player.id, "👋 ¡Chau! Volvé pronto", false);
                return {
                    message: `👋 ${player.name} se fue (bb)`,
                    color: COLORS.INFO_BLUE
                };
            }
        },
        afk: {
            description: "Marcarse como AFK",
            usage: "!afk",
            adminOnly: false,
            handler: (room, player) => {
                room.setPlayerTeam(player.id, 0);
                return {
                    message: `💤 ${player.name} está AFK`,
                    color: COLORS.INFO_BLUE
                };
            }
        },
        cambio: {
            description: "Iniciar sistema de cambios",
            usage: "!cambio",
            adminOnly: false,
            handler: (room, player) => {
                if (!stateManager.getState().substitution.active) {
                    stateManager.getState().substitution = {
                        active: true,
                        step: 0,
                        team: player.team,
                        initiator: player.id
                    };
                    return {
                        message: "🔄 Sistema de cambios activado. Elegí el jugador a cambiar.",
                        color: COLORS.INFO_BLUE
                    };
                }
                return {
                    message: "❌ Ya hay un cambio en proceso.",
                    color: COLORS.ERROR_RED
                };
            }
        },
        uniforme: {
            description: "Cambiar uniforme del equipo",
            usage: "!uniforme [nombre]",
            adminOnly: true,
            handler: (room, player, args) => {
                if (args.length < 1) {
                    throw new BotError(ErrorTypes.COMMAND, 'INVALID_ARGS', 'Uso correcto: !uniforme [nombre]');
                }
                // Aquí iría la lógica de cambio de uniforme
                return {
                    message: `👕 Cambiando uniforme a ${args[0]}...`,
                    color: COLORS.INFO_BLUE
                };
            }
        }
    },

    // Comandos de Diversión
    fun: {
        horoscopo: {
            description: "Ver tu horóscopo del día",
            usage: "!horoscopo [signo]",
            adminOnly: false,
            handler: (room, player, args) => {
                if (args.length !== 1) {
                    throw new BotError(ErrorTypes.COMMAND, 'INVALID_ARGS', 'Uso correcto: !horoscopo [signo]');
                }

                const signo = args[0].toLowerCase();
                const signos = ['aries', 'tauro', 'geminis', 'cancer', 'leo', 'virgo', 'libra', 'escorpio', 'sagitario', 'capricornio', 'acuario', 'piscis'];
                
                if (!signos.includes(signo)) {
                    throw new BotError(ErrorTypes.COMMAND, 'INVALID_SIGN', 'Signo no válido');
                }

                stateManager.getState().waitingHoroscope.add(player.id);
                return {
                    message: `🔮 Consultando los astros para ${player.name}...`,
                    color: COLORS.SPECIAL_PURPLE
                };
            }
        },
        disco: {
            description: "Activar/desactivar modo disco",
            usage: "!disco",
            adminOnly: true,
            handler: (room, player) => {
                const isActive = stateManager.toggleDiscoMode();
                return {
                    message: isActive ? "🕺 ¡Modo disco activado! 💃" : "🚫 Modo disco desactivado",
                    color: COLORS.SPECIAL_PURPLE
                };
            }
        },
        amongus: {
            description: "Mostrar arte ASCII de Among Us",
            usage: "!amongus",
            adminOnly: false,
            handler: (room, player) => {
                return {
                    message: "ඞ Sus...",
                    color: COLORS.SPECIAL_PURPLE
                };
            }
        },
        carrera: {
            description: "Iniciar una carrera de emojis",
            usage: "!carrera",
            adminOnly: false,
            handler: (room, player) => {
                if (stateManager.getState().race.isActive) {
                    throw new BotError(ErrorTypes.GAME, 'RACE_ACTIVE', '❌ Ya hay una carrera en curso');
                }
                
                stateManager.startRace();
                return {
                    message: "🏁 ¡CARRERA! Escribí !participar para sumarte",
                    color: COLORS.SPECIAL_PURPLE
                };
            }
        },
        participar: {
            description: "Participar en la carrera actual",
            usage: "!participar",
            adminOnly: false,
            handler: (room, player) => {
                const race = stateManager.getState().race;
                if (!race.isActive) {
                    throw new BotError(ErrorTypes.GAME, 'NO_RACE', '❌ No hay ninguna carrera activa');
                }
                
                if (race.participants.has(player.id)) {
                    throw new BotError(ErrorTypes.GAME, 'ALREADY_RACING', '❌ Ya estás participando');
                }

                const emoji = race.animalEmojis[Math.floor(Math.random() * race.animalEmojis.length)];
                race.participants.set(player.id, emoji);
                race.positions.set(player.id, 0);

                return {
                    message: `🎯 ${player.name} se suma a la carrera como ${emoji}`,
                    color: COLORS.SPECIAL_PURPLE
                };
            }
        },
        ruleta: {
            description: "Jugar a la ruleta rusa (te puede kickear)",
            usage: "!ruleta",
            adminOnly: false,
            handler: (room, player) => {
                if (Math.random() < 0.167) { // 1/6 de probabilidad
                    room.kickPlayer(player.id, "💥 ¡BOOM! Perdiste en la ruleta", false);
                    return {
                        message: `🎲 ${player.name} jugó a la ruleta y... ¡PERDIÓ! 💀`,
                        color: COLORS.SPECIAL_PURPLE
                    };
                }
                return {
                    message: `🎲 ${player.name} jugó a la ruleta y... ¡SOBREVIVIÓ! 😅`,
                    color: COLORS.SPECIAL_PURPLE
                };
            }
        },
        f: {
            description: "Mostrar respetos",
            usage: "!f",
            adminOnly: false,
            handler: (room, player) => {
                return {
                    message: `${player.name} ha mostrado sus respetos. 🌹 F`,
                    color: COLORS.SPECIAL_PURPLE
                };
            }
        }
    },

    // Comandos de Estadísticas
    stats: {
        stats: {
            description: "Ver tus estadísticas",
            usage: "!stats",
            adminOnly: false,
            handler: (room, player) => {
                const stats = stateManager.getPlayerStats(player.id);
                if (!stats) {
                    return {
                        message: "📊 Todavía no tenés estadísticas registradas",
                        color: COLORS.INFO_BLUE
                    };
                }

                return {
                    message: `📊 Estadísticas de ${player.name}:

⚽ GOLES Y ASISTENCIAS:
• Goles: ${stats.goals} (${stats.goalsPerGame.toFixed(2)} por partido)
• Asistencias: ${stats.assists}
• Tiros: ${stats.shots} (${stats.shotAccuracy.toFixed(1)}% al arco)

🎯 PASES Y POSESIÓN:
• Pases completados: ${stats.passesCompleted}/${stats.passes} (${stats.passAccuracy.toFixed(1)}%)
• Toques de balón: ${stats.ballTouch}
• Posesión promedio: ${stats.possession.toFixed(1)}%

🛡️ DEFENSA:
• Tackles: ${stats.tackles}
• Atajadas: ${stats.saves}
• Vallas invictas: ${stats.cleanSheets}

📈 RENDIMIENTO:
• Rating: ${stats.rating.toFixed(1)}/10
• Partidos: ${stats.gamesPlayed}
• Victorias: ${stats.wins} (${stats.winRate.toFixed(1)}%)
• MVPs: ${stats.mvps}

🏆 RACHAS:
• Racha de victorias: ${stats.winStreak} (Mejor: ${stats.bestWinStreak})
• Racha goleadora: ${stats.scoringStreak} (Mejor: ${stats.bestScoringStreak})

⚠️ DISCIPLINA:
• Faltas: ${stats.fouls}
• Tarjetas amarillas: ${stats.yellowCards}
• Tarjetas rojas: ${stats.redCards}`,
                    color: COLORS.INFO_BLUE
                };
            }
        },
        top: {
            description: "Ver tabla de líderes",
            usage: "!top [goles|asistencias|victorias]",
            adminOnly: false,
            handler: (room, player, args) => {
                if (args.length !== 1) {
                    throw new BotError(ErrorTypes.COMMAND, 'INVALID_ARGS', 'Uso: !top [goles|asistencias|victorias]');
                }

                const category = args[0].toLowerCase();
                const validCategories = ['goles', 'asistencias', 'victorias'];
                if (!validCategories.includes(category)) {
                    throw new BotError(ErrorTypes.COMMAND, 'INVALID_CATEGORY', 'Categoría inválida');
                }

                const top = stateManager.getTopPlayers(category, 5);
                let message = `🏆 Top 5 - ${category.toUpperCase()}:\n`;
                top.forEach((player, index) => {
                    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '👏';
                    message += `${medal} ${player.name}: ${player.value}\n`;
                });

                return {
                    message,
                    color: COLORS.SPECIAL_PURPLE
                };
            }
        },
        mvp: {
            description: "Ver el MVP del partido actual",
            usage: "!mvp",
            adminOnly: false,
            handler: (room, player) => {
                const mvp = stateManager.getCurrentMVP();
                if (!mvp) {
                    return {
                        message: "🏆 Todavía no hay suficientes datos para elegir MVP",
                        color: COLORS.INFO_BLUE
                    };
                }

                return {
                    message: `🏆 MVP actual: ${mvp.name}
⚽ Goles: ${mvp.goals}
🎯 Asistencias: ${mvp.assists}
📊 Puntuación: ${mvp.score}`,
                    color: COLORS.SPECIAL_PURPLE
                };
            }
        },
        partido: {
            description: "Ver estadísticas del partido actual",
            usage: "!partido",
            adminOnly: false,
            handler: (room, player) => {
                const possession = stateManager.getPossessionStats();
                const redStats = stateManager.getTeamStats('red');
                const blueStats = stateManager.getTeamStats('blue');

                return {
                    message: `📊 ESTADÍSTICAS DEL PARTIDO:

⚽ TIROS:
🔴 Rojos: ${redStats.shots} (${redStats.shotsOnTarget} al arco)
🔵 Azules: ${blueStats.shots} (${blueStats.shotsOnTarget} al arco)

🎯 POSESIÓN:
🔴 Rojos: ${possession.red}%
🔵 Azules: ${possession.blue}%

⚡ PASES:
🔴 Rojos: ${redStats.passes}
🔵 Azules: ${blueStats.passes}

💪 TACKLES:
🔴 Rojos: ${redStats.tackles}
🔵 Azules: ${blueStats.tackles}

⚠️ FALTAS:
🔴 Rojos: ${redStats.fouls}
🔵 Azules: ${blueStats.fouls}`,
                    color: COLORS.INFO_BLUE
                };
            }
        },
        ranking: {
            description: "Ver el ranking general",
            usage: "!ranking",
            adminOnly: false,
            handler: (room, player) => {
                const players = Array.from(stateManager.getState().stats.players.values())
                    .sort((a, b) => b.rating - a.rating)
                    .slice(0, 10);

                let message = "🏆 RANKING GENERAL (Top 10):\n\n";
                players.forEach((p, i) => {
                    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '👏';
                    message += `${medal} ${p.name}
• Rating: ${p.rating.toFixed(1)}/10
• Goles: ${p.goals} | Asistencias: ${p.assists}
• Win rate: ${p.winRate.toFixed(1)}%\n\n`;
                });

                return {
                    message,
                    color: COLORS.SPECIAL_PURPLE
                };
            }
        }
    },

    // Comandos Secretos (no aparecen en !help)
    secret: {
        spy: {
            description: "Activar modo espía (secreto)",
            usage: "!spy",
            adminOnly: true,
            showInHelp: false,
            handler: (room, player) => {
                const spies = stateManager.getState().spies;
                if (spies.has(player.id)) {
                    spies.delete(player.id);
                    return {
                        message: "🕵️ Modo espía desactivado",
                        color: COLORS.SPECIAL_PURPLE,
                        privateMessage: true
                    };
                } else {
                    spies.add(player.id);
                    return {
                        message: "🕵️ Modo espía activado - Podrás ver mensajes de equipo",
                        color: COLORS.SPECIAL_PURPLE,
                        privateMessage: true
                    };
                }
            }
        },
        ac: {
            description: "Chat de admins (secreto)",
            usage: "!ac [mensaje]",
            adminOnly: true,
            showInHelp: false,
            handler: (room, player, args) => {
                if (args.length === 0) {
                    throw new BotError(ErrorTypes.COMMAND, 'INVALID_ARGS', 'Escribí un mensaje');
                }
                const message = args.join(' ');
                room.getPlayerList().forEach(p => {
                    if (p.admin) {
                        room.sendAnnouncement(
                            `👑 [Admin] ${player.name}: ${message}`,
                            p.id,
                            COLORS.ADMIN_ORANGE
                        );
                    }
                });
                return null; // No mostrar mensaje general
            }
        }
    }
};

// Función para procesar comandos
function processCommand(room, player, message) {
    if (!message.startsWith('!')) return false;

    const [command, ...args] = message.slice(1).split(' ');
    
    // Buscar el comando en todas las categorías
    for (const category of Object.values(commands)) {
        if (command in category) {
            const cmd = category[command];
            
            // Verificar permisos
            if (cmd.adminOnly && !stateManager.isAdmin(player.id)) {
                throw new BotError(ErrorTypes.AUTH, 'NO_PERMISSION', '❌ Necesitás ser admin para usar este comando');
            }

            try {
                // Ejecutar el comando
                const result = cmd.handler(room, player, args);
                if (result && result.message) {
                    if (result.privateMessage) {
                        room.sendAnnouncement(result.message, player.id, result.color);
                    } else {
                        room.sendAnnouncement(result.message, null, result.color);
                    }
                }
                return true;
            } catch (error) {
                if (error instanceof BotError) {
                    throw error;
                }
                throw new BotError(ErrorTypes.COMMAND, 'EXECUTION_FAILED', `Error ejecutando ${command}: ${error.message}`);
            }
        }
    }

    // Comando no encontrado
    throw new BotError(ErrorTypes.COMMAND, 'UNKNOWN_COMMAND', `Comando desconocido: ${command}`);
}

// Función para obtener ayuda de comandos
function getCommandHelp(isAdmin = false) {
    let help = "📋 Comandos disponibles:\n\n";
    
    for (const [category, categoryCommands] of Object.entries(commands)) {
        // Saltear categoría secreta
        if (category === 'secret') continue;

        help += `${category.toUpperCase()}:\n`;
        for (const [name, cmd] of Object.entries(categoryCommands)) {
            // Solo mostrar comandos no secretos y respetar permisos
            if ((!cmd.showInHelp === false) && (!cmd.adminOnly || isAdmin)) {
                help += `${cmd.usage} - ${cmd.description}\n`;
            }
        }
        help += "\n";
    }
    
    return help;
}

module.exports = {
    processCommand,
    getCommandHelp,
    commands
}; 