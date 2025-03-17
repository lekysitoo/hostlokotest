const CONFIG = require('./config.js');
const { ErrorTypes, BotError } = require('./errorHandler.js');
const cacheManager = require('./cacheManager.js');
const fs = require('fs').promises;
const path = require('path');

class GitHubManager {
    constructor() {
        this.config = CONFIG.GITHUB;
        this.retryConfig = {
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 5000
        };
        this.backupDir = path.join(__dirname, 'backups');
        this.initBackupDir();
    }

    // Inicializar directorio de backups
    async initBackupDir() {
        try {
            await fs.mkdir(this.backupDir, { recursive: true });
        } catch (error) {
            console.error('Error creando directorio de backups:', error);
        }
    }

    // Método principal para hacer requests a GitHub con retry
    async makeGitHubRequest(endpoint, options = {}, retryCount = 0) {
        try {
            const url = `${this.config.apiBaseUrl}${endpoint}`;
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Authorization': `token ${this.config.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    ...options.headers
                }
            });

            if (!response.ok) {
                // Manejar rate limiting
                if (response.status === 403 && response.headers.get('X-RateLimit-Remaining') === '0') {
                    const resetTime = response.headers.get('X-RateLimit-Reset') * 1000;
                    const waitTime = Math.max(0, resetTime - Date.now());
                    await this.sleep(waitTime);
                    return this.makeGitHubRequest(endpoint, options);
                }

                throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
            }

            return await response.json();

        } catch (error) {
            if (retryCount < this.retryConfig.maxRetries) {
                const delay = Math.min(
                    this.retryConfig.baseDelay * Math.pow(2, retryCount),
                    this.retryConfig.maxDelay
                );
                await this.sleep(delay);
                return this.makeGitHubRequest(endpoint, options, retryCount + 1);
            }

            throw new BotError(
                ErrorTypes.GITHUB,
                'REQUEST_FAILED',
                `Error después de ${this.retryConfig.maxRetries} intentos: ${error.message}`
            );
        }
    }

    // Cargar datos desde GitHub con caché
    async loadData(path, category = 'stats') {
        const cacheKey = `github_${path}`;
        const cachedData = cacheManager.get(cacheKey, category);
        
        if (cachedData) {
            return cachedData;
        }

        try {
            const endpoint = `/repos/${this.config.owner}/${this.config.repo}/contents/${path}`;
            const response = await this.makeGitHubRequest(endpoint);
            
            const content = JSON.parse(Buffer.from(response.content, 'base64').toString());
            cacheManager.set(cacheKey, content, category);
            
            // Crear backup local
            await this.createBackup(path, content);
            
            return content;

        } catch (error) {
            console.error(`Error cargando datos de GitHub (${path}):`, error);
            
            // Intentar cargar desde backup local
            const backupData = await this.loadFromBackup(path);
            if (backupData) {
                return backupData;
            }

            throw new BotError(
                ErrorTypes.GITHUB,
                'LOAD_FAILED',
                `No se pudieron cargar los datos de ${path}`
            );
        }
    }

    // Guardar datos en GitHub con backup local
    async saveData(path, data) {
        try {
            // Primero crear backup local
            await this.createBackup(path, data);

            const endpoint = `/repos/${this.config.owner}/${this.config.repo}/contents/${path}`;
            
            // Obtener SHA del archivo actual si existe
            let sha;
            try {
                const current = await this.makeGitHubRequest(endpoint);
                sha = current.sha;
            } catch (error) {
                // Archivo no existe, está bien
            }

            // Preparar contenido
            const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
            
            // Hacer el request
            await this.makeGitHubRequest(endpoint, {
                method: 'PUT',
                body: JSON.stringify({
                    message: `Update ${path} [${new Date().toISOString()}]`,
                    content,
                    sha
                })
            });

            // Actualizar caché
            cacheManager.set(`github_${path}`, data, 'stats');

        } catch (error) {
            console.error(`Error guardando datos en GitHub (${path}):`, error);
            throw new BotError(
                ErrorTypes.GITHUB,
                'SAVE_FAILED',
                `No se pudieron guardar los datos en ${path}`
            );
        }
    }

    // Crear backup local
    async createBackup(filename, data) {
        try {
            const backupPath = path.join(this.backupDir, `${filename}.backup.json`);
            await fs.writeFile(
                backupPath,
                JSON.stringify({
                    data,
                    timestamp: Date.now()
                }, null, 2)
            );
        } catch (error) {
            console.error('Error creando backup:', error);
        }
    }

    // Cargar desde backup local
    async loadFromBackup(filename) {
        try {
            const backupPath = path.join(this.backupDir, `${filename}.backup.json`);
            const backupContent = await fs.readFile(backupPath, 'utf8');
            const { data, timestamp } = JSON.parse(backupContent);
            
            // Verificar si el backup no es muy viejo (24 horas)
            if (Date.now() - timestamp > 24 * 60 * 60 * 1000) {
                return null;
            }

            return data;
        } catch (error) {
            return null;
        }
    }

    // Utilidad para sleep
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Verificar conexión con GitHub
    async checkConnection() {
        try {
            await this.makeGitHubRequest('/rate_limit');
            return true;
        } catch (error) {
            return false;
        }
    }

    // Obtener límites de rate
    async getRateLimit() {
        try {
            const response = await this.makeGitHubRequest('/rate_limit');
            return response.resources.core;
        } catch (error) {
            console.error('Error obteniendo rate limit:', error);
            return null;
        }
    }
}

module.exports = new GitHubManager(); 