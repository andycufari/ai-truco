// Game Orchestrator
// Manages the flow between game engine and AI players

import TrucoEngine from './truco-engine.js';
import { AIManager } from '../lib/ai-manager.js';

class GameOrchestrator {
  constructor(aiManager, updateCallback, logCallback = null) {
    this.engine = new TrucoEngine();
    this.aiManager = aiManager;
    this.updateCallback = updateCallback;
    this.logCallback = logCallback;
    this.gameLoop = null;
    this.turnDelay = 15000; // 15 seconds between turns by default
    this.apiCallCount = 0; // Track API calls
  }

  setupGame(players) {
    // Reset engine
    this.engine.reset();
    this.apiCallCount = 0; // Reset API call counter

    // Add players with names
    players.forEach(player => {
      this.engine.addPlayer(
        player.id,
        player.team,
        player.aiProvider,
        player.model,
        player.personality
      );
      // Store player names
      if (!this.playerNames) this.playerNames = {};
      this.playerNames[player.id] = player.name || player.id;
    });

    // Deal initial cards
    this.engine.dealCards();
    
    // Notify UI
    this.updateUI();
  }

  async startGame() {
    this.gameLoop = true;
    let turnCount = 0;
    const MAX_TURNS = 200; // Límite de seguridad
    
    console.log('\n=== GAME STARTED ===');
    console.log(`gameLoop: ${this.gameLoop}`);
    console.log(`turnDelay: ${this.turnDelay}`);
    
    while (this.gameLoop && !this.isGameOver() && turnCount < MAX_TURNS) {
      console.log(`\n=== Turn ${turnCount + 1} ===`);
      console.log(`Current turn: ${this.engine.state.currentTurn}`);
      console.log(`Current bet: ${this.engine.state.currentBet ? this.engine.state.currentBet.type : 'none'}`);
      console.log(`Game over: ${this.isGameOver()}`);
      
      await this.playTurn();
      console.log(`Turn ${turnCount + 1} completed, waiting ${this.turnDelay}ms...`);
      await this.delay(this.turnDelay);
      turnCount++;
      console.log(`Moving to turn ${turnCount + 1}`);
    }
    
    console.log('\n=== GAME LOOP ENDED ===');
    console.log(`Final turnCount: ${turnCount}`);
    console.log(`gameLoop: ${this.gameLoop}`);
    console.log(`Game over: ${this.isGameOver()}`);
    
    if (turnCount >= MAX_TURNS) {
      console.error('Game exceeded maximum turns limit');
      this.stopGame();
    }
  }

  stopGame() {
    this.gameLoop = false;
    console.log(`\n=== Game Stopped ===`);
    console.log(`Total API calls: ${this.apiCallCount}`);
    console.log(`Estimated cost (GPT-3.5): ${(this.apiCallCount * 0.002).toFixed(4)}`);
    console.log(`Estimated cost (GPT-4): ${(this.apiCallCount * 0.06).toFixed(4)}`);
    console.log(`===================\n`);
  }

  async playTurn() {
    console.log(`\n--- playTurn() START ---`);
    
    // Check if there's an active bet that needs response
    if (this.engine.state.currentBet) {
      const waitingPlayer = this.engine.state.players.find(p => p.id === this.engine.state.currentBet.waitingFor);
      if (waitingPlayer) {
        console.log(`Handling bet response for: ${waitingPlayer.id}`);
        await this.handleBetResponse(waitingPlayer.id);
        console.log(`--- playTurn() END (handled bet) ---\n`);
        return;
      }
    }

    const currentPlayer = this.engine.getCurrentPlayer();
    const gameState = this.engine.getGameStateForPlayer(currentPlayer.id);
    
    console.log(`Playing turn for: ${currentPlayer.id}`);
    console.log(`Current bet: ${gameState.currentBet ? gameState.currentBet.type : 'none'}`);
    console.log(`Is my turn: ${gameState.isMyTurn}`);

    // Build prompt for AI
    const prompt = this.buildPrompt(currentPlayer, gameState);
    console.log(`\n--- PROMPT for ${currentPlayer.id} ---`);
    console.log(prompt);
    console.log(`--- END PROMPT ---\n`);

    try {
      // Call AI
      this.apiCallCount++;
      console.log(`API Call #${this.apiCallCount} - Player: ${currentPlayer.id}, Model: ${currentPlayer.model}`);
      
      const aiResponse = await this.aiManager.callAI(
        currentPlayer.aiProvider,
        currentPlayer.model,
        prompt,
        { temperature: this.getTemperatureForPersonality(currentPlayer.personality) }
      );

      // Process AI response
      console.log(`\n--- AI RESPONSE from ${currentPlayer.id} ---`);
      console.log(aiResponse);
      console.log(`--- END AI RESPONSE ---\n`);
      
      // Log AI response for analysis
      if (this.logCallback) {
        this.logCallback('AI Response', {
          playerId: currentPlayer.id,
          playerName: this.playerNames[currentPlayer.id],
          model: currentPlayer.model,
          provider: currentPlayer.aiProvider,
          response: aiResponse,
          gameState: {
            currentBet: gameState.currentBet,
            trucoState: gameState.trucoState,
            envidoState: gameState.envidoState,
            tableCards: gameState.table.length,
            cardsInHand: gameState.myCards.length
          }
        });
      }
      
      const result = await this.engine.processAction(currentPlayer.id, aiResponse);

      if (!result.success) {
        console.error(`Invalid action from ${currentPlayer.id}:`, aiResponse);
        console.error(`Error: ${result.error}`);
        console.error(`Current game state:`, {
          currentBet: gameState.currentBet,
          currentTurn: this.engine.state.currentTurn,
          cardsInHand: gameState.myCards.length,
          tableCards: gameState.table.length
        });
        
        // Force a valid action (play first card)
        if (gameState.myCards.length > 0) {
          const fallbackResult = await this.engine.processAction(currentPlayer.id, {
            accion: 'tirar',
            valor: gameState.myCards[0].id,
            razon: 'Fallback - playing first card'
          });
          console.log(`Fallback action result:`, fallbackResult);
        }
      }

      // Update UI
      this.updateUI();

    } catch (error) {
      console.error(`Error in AI turn for ${currentPlayer.id}:`, error);
    }
    
    console.log(`playTurn() completed for ${currentPlayer.id}`);
    console.log(`--- playTurn() END (normal turn) ---\n`);
  }

  async handleBetResponse(playerId) {
    await this.delay(1000); // Brief pause for drama
    
    const player = this.engine.state.players.find(p => p.id === playerId);
    const gameState = this.engine.getGameStateForPlayer(playerId);
    const prompt = this.buildBetResponsePrompt(player, gameState);

    try {
      this.apiCallCount++;
      console.log(`API Call #${this.apiCallCount} - Bet Response - Player: ${player.id}, Model: ${player.model}`);
      
      const aiResponse = await this.aiManager.callAI(
        player.aiProvider,
        player.model,
        prompt
      );

      const result = await this.engine.processAction(playerId, aiResponse);
      this.updateUI();
      
      console.log(`Bet response processed. Success: ${result.success}, Current bet: ${this.engine.state.currentBet ? this.engine.state.currentBet.type : 'none'}`);

    } catch (error) {
      console.error(`Error in bet response from ${playerId}:`, error);
      // Default to "no quiero"
      await this.engine.processAction(playerId, {
        accion: 'responder',
        valor: 'no-quiero',
        razon: 'Error - playing safe'
      });
      this.updateUI();
    }
  }

  buildPrompt(player, gameState) {
    const personalityPrompts = {
      'agresivo': 'Agresivo, apostar fuerte.',
      'conservador': 'Conservador, cuidadoso.',
      'mentiroso': 'Mentiroso, bluffear.',
      'matematico': 'Calcular probabilidades.'
    };

    // Formato compacto para reducir tokens
    return `Truco Argentino. ${personalityPrompts[player.personality] || ''}

Cartas: ${JSON.stringify(gameState.myCards.map(c => c.id))}
Mesa: ${JSON.stringify(gameState.table.map(t => t.card.id))}
Puntos: ${gameState.score[gameState.myTeam]}-${gameState.score[gameState.myTeam === 'team1' ? 'team2' : 'team1']}
Rondas: ${gameState.roundWins[gameState.myTeam]}-${gameState.roundWins[gameState.myTeam === 'team1' ? 'team2' : 'team1']}
Truco: ${gameState.trucoState || 'no'}
Envido: ${gameState.envidoState || 'no'}
${gameState.currentBet ? `Apuesta: ${gameState.currentBet.type}` : ''}

Tu envido: ${this.engine.calculateEnvido(gameState.myCards)}

${this.getContextualActions(gameState)}

Nota: "frase" es opcional - añade una frase que dirías al hacer la acción (ej: "¡Truco, carajo!", "Esta va de fierro", "No me la bancás").

IMPORTANTE: Usar exactamente "accion" (no "respuesta"). Responder solo JSON válido.`;
  }

  buildBetResponsePrompt(player, gameState) {
    const bet = gameState.currentBet;
    return `Te cantaron ${bet.type}.
Cartas: ${JSON.stringify(gameState.myCards.map(c => c.id))}
Envido: ${this.engine.calculateEnvido(gameState.myCards)}

Opciones:
- Aceptar: {"accion":"responder","valor":"quiero","razon":"...","pensamiento":"...","frase":"..."}
- Rechazar: {"accion":"responder","valor":"no-quiero","razon":"...","pensamiento":"...","frase":"..."}
${this.getCounterOptions(bet.type)}

Nota: "frase" es opcional - añade una frase que dirías al responder (ej: "¡Quiero!", "No me la bancás", "Dale que vamos").

IMPORTANTE: Usar exactamente "accion" (no "respuesta"). JSON:`;
  }

  getContextualActions(gameState) {
    let actions = [];
    
    // If there's a current bet, player must respond
    if (gameState.currentBet) {
      actions.push('- Responder: {"accion":"responder","valor":"quiero|no-quiero","razon":"...","pensamiento":"...","frase":"..."}');
      
      // Add counter-bet options
      const counters = this.getCounterOptions(gameState.currentBet.type);
      if (counters) {
        actions.push(counters);
      }
    } else {
      // Normal turn - can play cards or make bets
      actions.push('- Tirar carta: {"accion":"tirar","valor":"[id-carta]","razon":"...","pensamiento":"...","frase":"..."}');
      
      // Can only bet envido before any cards are played in the current hand and if envido hasn't been played
      // Also check that we're not in the middle of a round (no cards on table)
      // AND truco hasn't been cantado yet
      const noCardsPlayedYet = this.engine.state.players.every(p => p.playedCards.length === 0);
      if (gameState.table.length === 0 && !gameState.envidoState && !gameState.trucoState && noCardsPlayedYet) {
        actions.push('- Cantar envido: {"accion":"cantar","valor":"envido|real-envido|falta-envido","razon":"...","pensamiento":"...","frase":"..."}');
      }
      
      // Can always bet truco (unless already at max level)
      if (!gameState.trucoState) {
        actions.push('- Cantar truco: {"accion":"cantar","valor":"truco","razon":"...","pensamiento":"...","frase":"..."}');
      } else if (gameState.trucoState === 'truco') {
        actions.push('- Cantar retruco: {"accion":"cantar","valor":"retruco","razon":"...","pensamiento":"...","frase":"..."}');
      } else if (gameState.trucoState === 'retruco') {
        actions.push('- Cantar vale4: {"accion":"cantar","valor":"vale4","razon":"...","pensamiento":"...","frase":"..."}');
      }
    }
    
    return `Acciones disponibles:\n${actions.join('\n')}`;
  }

  getCounterOptions(betType) {
    const counters = {
      'envido': '- Subir: {"accion": "responder", "valor": "real-envido|falta-envido", "razon": "...","frase":"..."}',
      'real-envido': '- Subir: {"accion": "responder", "valor": "falta-envido", "razon": "...","frase":"..."}',
      'truco': '- Subir: {"accion": "responder", "valor": "retruco", "razon": "...","frase":"..."}',
      'retruco': '- Subir: {"accion": "responder", "valor": "vale4", "razon": "...","frase":"..."}'
    };
    return counters[betType] || '';
  }

  calculateEnvidoForPrompt(cards) {
    const envido = this.engine.calculateEnvido(cards);
    if (envido > 30) return `${envido} (¡Flor!)`;
    if (envido >= 28) return `${envido} (muy bueno)`;
    if (envido >= 25) return `${envido} (bueno)`;
    if (envido >= 20) return `${envido} (regular)`;
    return `${envido} (bajo)`;
  }

  getTemperatureForPersonality(personality) {
    const temps = {
      'agresivo': 0.9,
      'conservador': 0.3,
      'mentiroso': 0.8,
      'matematico': 0.2
    };
    return temps[personality] || 0.7;
  }

  isGameOver() {
    return this.engine.state.score.team1 >= 30 || 
           this.engine.state.score.team2 >= 30;
  }

  updateUI() {
    if (this.updateCallback) {
      // Send state with private thoughts AND cards for observers
      const fullState = this.engine.getPublicState(true);
      console.log('Sending state to UI:', fullState); // Debug
      this.updateCallback(fullState);
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default GameOrchestrator;
