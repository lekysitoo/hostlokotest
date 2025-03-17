# 🎮 HaxBall Bot Config

## 📋 Configuración Inicial

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/lekysitoo/hostlokotest.git
   cd hostlokotest
   ```

2. **Configurar variables de ambiente**
   - Copiar el archivo `.env.example` a `.env`:
     ```bash
     cp .env.example .env
     ```
   - Editar el archivo `.env` y agregar tu token de GitHub:
     ```
     GITHUB_TOKEN=tu_token_aqui
     ```

3. **Archivos de configuración**
   - `config.js`: Contiene la configuración general del bot
   - `.env`: Variables sensibles (NO SUBIR AL REPO)
   - `.gitignore`: Lista de archivos ignorados por git

## 🔧 Estructura de Archivos

```
├── config.js           # Configuración general
├── .env               # Variables de ambiente (local)
├── .env.example       # Ejemplo de variables de ambiente
└── .gitignore        # Archivos ignorados por git
```

## 🚀 Uso

1. Asegúrate de tener todos los archivos de configuración en su lugar
2. El token de GitHub debe estar en el archivo `.env`
3. No subas nunca el archivo `.env` al repositorio

## 🔒 Seguridad

- Nunca compartas tu token de GitHub
- No subas el archivo `.env` al repositorio
- Usa siempre variables de ambiente para datos sensibles 