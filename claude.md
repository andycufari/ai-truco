# HayTruco - Documentación para Claude Code

## 🎯 Descripción del Proyecto

HayTruco es un simulador de Truco Argentino donde diferentes modelos de IA (GPT-4, Claude, DeepSeek, etc.) juegan entre sí. El observador puede ver las cartas de ambos jugadores, sus pensamientos privados, y seguir la partida en tiempo real.

## 🏗️ Estructura del Proyecto

```
/Users/CM64XD/Desktop/DEUS/CM64/kiosks/HayTruco/
├── src/
│   ├── lib/
│   │   └── ai-manager.js       # Gestión modular de múltiples LLMs
│   ├── game/
│   │   ├── truco-engine.js     # Motor del juego con todas las reglas
│   │   └── orchestrator.js     # Coordinador entre IA y motor
│   └── server.js               # Servidor Express + Socket.io
├── public/
│   ├── index.html              # UI con Tailwind CSS
│   ├── app.js                  # Cliente JavaScript
│   └── style.css               # (deprecado - ahora usamos Tailwind)
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## 🔧 Componentes Principales

### 1. **AI Manager** (`src/lib/ai-manager.js`)
- Abstracción para múltiples proveedores de IA
- Soporta: OpenAI, Claude, DeepSeek, Ollama, Gemini
- Fácil agregar nuevos proveedores

### 2. **Truco Engine** (`src/game/truco-engine.js`)
- Motor completo del juego
- Maneja: envido, truco, retruco, vale cuatro
- Sistema de puntuación hasta 30
- Validación de jugadas

### 3. **Orchestrator** (`src/game/orchestrator.js`)
- Conecta las IAs con el motor
- Maneja el flujo del juego
- Genera prompts para las IAs
- Incluye pensamientos privados

### 4. **UI** (`public/index.html` + `app.js`)
- Tailwind CSS para diseño responsive
- Feed dual: Acciones públicas y Pensamientos privados
- Vista del observador con cartas reales
- Sonidos sutiles para feedback
- Nombres personalizados para jugadores

## 🎮 Features Implementadas

### Vista del Observador
- ✅ Cartas reales de ambos jugadores visibles
- ✅ Valor de envido calculado
- ✅ Pensamientos privados en burbujas
- ✅ Feed separado para pensamientos

### Experiencia de Usuario
- ✅ Tiempo configurable entre jugadas (5-30 segundos)
- ✅ Nombres personalizados para jugadores
- ✅ Personalidades de IA (agresivo, conservador, mentiroso, matemático)
- ✅ Estadísticas en tiempo real (mentiras, tiempo, manos)
- ✅ Sonidos para acciones

### Técnicas
- ✅ WebSockets para tiempo real
- ✅ Prompts mínimos - el modelo debe conocer el juego
- ✅ Respuestas en JSON estructurado
- ✅ Manejo de errores y fallbacks

## 📝 Estado Actual (Screenshot)

El juego funciona correctamente:
- Las cartas del observador se muestran en el panel derecho
- Los pensamientos aparecen como burbujas sobre cada jugador
- El feed de actividad muestra las jugadas claramente
- La mesa central muestra las cartas jugadas

## 🚀 Próximos Pasos Sugeridos

1. **Mejorar Análisis de Mentiras**
   - Detectar patrones de bluff más sofisticados
   - Estadísticas de éxito en mentiras

2. **Modo Torneo**
   - Múltiples partidas seguidas
   - Tabla de posiciones
   - Diferentes enfrentamientos

3. **Grabación y Replay**
   - Guardar partidas completas
   - Sistema de replay con controles
   - Exportar partidas interesantes

4. **Mejoras de IA**
   - Fine-tuning de prompts por personalidad
   - Memoria de jugadas anteriores
   - Aprendizaje de patrones del oponente

5. **UI Enhancements**
   - Animaciones de cartas más fluidas
   - Efectos visuales para cantos
   - Modo oscuro/claro
   - Responsive para móviles

## 🐛 Issues Conocidos

1. **Performance**: Con muchos logs la consola puede ralentizarse
2. **Sonidos**: Requieren interacción inicial del usuario
3. **Memoria**: Las partidas largas acumulan mucha historia

## 💻 Comandos Útiles

```bash
# Instalar dependencias
npm install

# Copiar y configurar .env
cp .env.example .env
# Editar .env con tus API keys

# Iniciar servidor
npm start

# Desarrollo con nodemon
npm run dev
```

## 🔑 Configuración de API Keys

En `.env` necesitas:
```
OPENAI_API_KEY=tu-key-aqui
DEEPSEEK_API_KEY=tu-key-aqui  # Si quieres usar DeepSeek
ANTHROPIC_API_KEY=tu-key-aqui # Para Claude
```

## 📊 Flujo del Juego

1. Usuario configura jugadores (nombre, modelo, personalidad)
2. Orchestrator inicializa el juego
3. Motor reparte cartas
4. Por cada turno:
   - Orchestrator pide jugada a la IA
   - IA responde con JSON (acción + pensamiento)
   - Motor valida y ejecuta
   - UI se actualiza vía WebSocket
5. Continúa hasta llegar a 30 puntos

## 🎯 Estructura de Prompts

```javascript
// Prompt incluye:
- Cartas del jugador
- Estado de la mesa
- Puntaje actual
- Estado de envido/truco
- Historial de la mano

// Respuesta esperada:
{
  "accion": "tirar|cantar|responder",
  "valor": "carta-id|canto|respuesta",
  "razon": "explicación técnica",
  "pensamiento": "estrategia privada"
}
```

## 🔄 Para Continuar el Desarrollo

1. El código está modularizado y listo para extensiones
2. Agregar nuevos providers es simple (heredar de base class)
3. La UI usa Tailwind, fácil de modificar
4. El motor está separado de la UI (se podría hacer CLI)
5. Los logs de debug ya están implementados

## 📱 Consideraciones Mobile

- La UI es responsive pero optimizada para desktop
- En mobile habría que reorganizar los paneles
- Considerar versión simplificada para pantallas pequeñas

---

**Creado por CM64.studio** 🚀
