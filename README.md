# 🇦🇷 AI Truco 🃏

**Las mejores IAs del mundo se enfrentan al Truco Argentino**

AI Truco es un simulador donde diferentes modelos de Inteligencia Artificial (GPT-4, Claude, DeepSeek, etc.) se enfrentan jugando al Truco Argentino. Como observador, podés ver todas las cartas y seguir los pensamientos estratégicos de cada IA en tiempo real.

![AI Truco Demo](https://img.shields.io/badge/Estado-Funcional-brightgreen)
![Node.js](https://img.shields.io/badge/Node.js-18+-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

## 🎯 Características

- **Vista del Observador**: Ves las cartas de ambos jugadores y sus valores de envido
- **Pensamientos en Tiempo Real**: Cada IA revela su estrategia mientras juega
- **Múltiples Modelos**: OpenAI, Claude, DeepSeek y más
- **Personalidades Configurables**: Agresivo, conservador, mentiroso, matemático
- **Interfaz Completa**: Feed de acciones, control de velocidad, estadísticas
- **100% Truco Argentino**: Envido, truco, retruco, vale cuatro hasta 30 puntos

## 🚀 Instalación Rápida

### 1. Clonar el Repositorio
```bash
git clone https://github.com/tu-usuario/ai-truco.git
cd ai-truco
```

### 2. Instalar Dependencias
```bash
npm install
```

### 3. Configurar API Keys
Copiá el archivo de ejemplo:
```bash
cp .env.example .env
```

Editá el archivo `.env` con tus claves de API:
```env
# OpenAI (Requerido para GPT-3.5/GPT-4)
OPENAI_API_KEY=sk-tu-clave-aqui

# Claude (Opcional - para usar Claude)
ANTHROPIC_API_KEY=sk-ant-tu-clave-aqui

# DeepSeek (Opcional - muy barato y bueno)
DEEPSEEK_API_KEY=sk-tu-clave-aqui
```

### 4. ¡Arrancar!
```bash
npm start
```

Abrí tu navegador en `http://localhost:3001` y ¡a jugar!

## 🔑 Cómo Conseguir las API Keys

### OpenAI (Recomendado - GPT-3.5)
1. Andá a [platform.openai.com](https://platform.openai.com)
2. Creá una cuenta y agregá crédito (USD $5 alcanza para jugar mucho)
3. Andá a "API Keys" y creá una nueva clave
4. Usá `gpt-3.5-turbo` que es barato y juega bien

### Claude (Opcional)
1. Registrate en [console.anthropic.com](https://console.anthropic.com)
2. Conseguí créditos gratis para empezar
3. Creá una API key en la sección "API Keys"

### DeepSeek (Muy barato)
1. Andá a [platform.deepseek.com](https://platform.deepseek.com)
2. Es súper barato, casi gratis
3. Creá una cuenta y conseguí tu API key

## 🎮 Cómo Usar

1. **Configurar Jugadores**: Elegí nombres, modelos y personalidades
2. **Iniciar Partida**: Hacé click en "¡ARRANCAR LA PARTIDA!"
3. **Observar**: Mirá las cartas reales y los pensamientos de las IAs
4. **Controlar**: Ajustá la velocidad o pausá para analizar jugadas

### Personalidades Disponibles

- **🎯 Equilibrado**: Juega de forma balanceada
- **🔥 Agresivo**: Canta todo, siempre va al frente
- **🛡️ Cagón**: Se achica, juega conservador
- **🎭 Mentiroso**: Bluffea mucho, difícil de leer
- **🧮 Calculador**: Juega por probabilidades matemáticas

## 🏗️ Estructura del Proyecto

```
ai-truco/
├── src/
│   ├── lib/
│   │   └── ai-manager.js       # Gestión de múltiples LLMs
│   ├── game/
│   │   ├── truco-engine.js     # Motor del juego (reglas)
│   │   └── orchestrator.js     # Coordinador IA-juego
│   └── server.js               # Servidor Express + Socket.io
├── public/
│   ├── index.html              # Interfaz con Tailwind CSS
│   ├── app.js                  # Cliente JavaScript
│   └── style.css               # (deprecado)
├── package.json
├── .env.example                # Plantilla para API keys
└── README.md
```

## 🛠️ Desarrollo

### Modo Desarrollo (Auto-restart)
```bash
npm run dev
```

### Agregar Nuevos Modelos
Editá `src/lib/ai-manager.js` y agregá tu proveedor siguiendo el patrón existente.

### Personalizar Prompts
Los prompts están en `src/game/orchestrator.js` en la función `buildPrompt()`.

## 🎲 Reglas del Truco Implementadas

- ✅ **Envido**: Completo con todas las variantes
- ✅ **Truco/Retruco/Vale Cuatro**: Sistema completo de cantos
- ✅ **Manos**: Manejo correcto de manos pares
- ✅ **Puntaje**: Hasta 30 puntos
- ✅ **Mazo**: 40 cartas españolas con valores correctos
- ✅ **Jerarquías**: Orden correcto de cartas del truco

## 🐛 Solución de Problemas

### Error: "Cannot connect to server"
- Asegurate que el puerto 3001 esté libre
- Verificá que tengas Node.js 18+ instalado

### Error: "API Key invalid"
- Revisá que las claves en `.env` sean correctas
- Asegurate que tengas crédito en tu cuenta de OpenAI/Claude

### El juego va muy lento
- Usá `gpt-3.5-turbo` en lugar de `gpt-4`
- Ajustá la velocidad con el control deslizante

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Especialmente:

- 🆕 Nuevos proveedores de IA
- 🎨 Mejoras visuales
- 🎯 Optimización de prompts
- 🐛 Corrección de bugs
- 🧪 Tests automáticos

### Hacer un Pull Request
1. Fork el repositorio
2. Creá una branch: `git checkout -b mi-nueva-feature`
3. Commitea: `git commit -m 'Agrego nueva feature'`
4. Push: `git push origin mi-nueva-feature`
5. Abrí un Pull Request

## 📊 Performance y Costos

### Costos Aproximados (USD)
- **GPT-3.5**: ~$0.002 por partida completa
- **GPT-4**: ~$0.20 por partida completa  
- **Claude**: ~$0.01 por partida completa
- **DeepSeek**: ~$0.0001 por partida completa 🔥

### Velocidad
- **GPT-3.5**: ~2-3 segundos por jugada
- **Claude**: ~3-4 segundos por jugada
- **DeepSeek**: ~1-2 segundos por jugada

## 🔮 Próximas Features

- [ ] 🏆 Modo torneo con múltiples partidas
- [ ] 📊 Estadísticas avanzadas de mentiras
- [ ] 🎥 Sistema de replay de partidas
- [ ] 📱 Versión responsive para móviles
- [ ] 🎨 Temas visuales (oscuro/claro)
- [ ] 🧠 Fine-tuning de prompts por personalidad

## 📄 Licencia

MIT License - Podés usar este código para lo que quieras.

## 🙏 Créditos

**Creado por [CM64.studio](https://cm64.studio)** 🚀

¿Te gustó el proyecto? ¡Dale una ⭐ al repositorio!

---

### 🆘 Soporte

¿Problemas? ¿Ideas? 
- 📫 Abrí un [Issue](https://github.com/tu-usuario/ai-truco/issues)
- 💬 O escribime directamente

**¡Que gane el mejor algoritmo!** 🤖🃏
