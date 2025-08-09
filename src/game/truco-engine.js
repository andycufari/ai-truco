// Truco Game Engine
// Handles all game logic, rules, and state management

class TrucoEngine {
  constructor() {
    this.reset();
    this.setupCardHierarchy();
  }

  setupCardHierarchy() {
    // Card power ranking for Truco
    this.cardPower = new Map([
      ['1-espadas', 14],    // Ancho de espadas
      ['1-bastos', 13],     // Ancho de bastos
      ['7-espadas', 12],    
      ['7-oros', 11],       
      ['3-espadas', 10], ['3-bastos', 10], ['3-oros', 10], ['3-copas', 10],
      ['2-espadas', 9], ['2-bastos', 9], ['2-oros', 9], ['2-copas', 9],
      ['1-oros', 8], ['1-copas', 8],  // Ancho falso
      ['12-espadas', 7], ['12-bastos', 7], ['12-oros', 7], ['12-copas', 7],
      ['11-espadas', 6], ['11-bastos', 6], ['11-oros', 6], ['11-copas', 6],
      ['10-espadas', 5], ['10-bastos', 5], ['10-oros', 5], ['10-copas', 5],
      ['7-copas', 4], ['7-bastos', 4],  // 7 falso
      ['6-espadas', 3], ['6-bastos', 3], ['6-oros', 3], ['6-copas', 3],
      ['5-espadas', 2], ['5-bastos', 2], ['5-oros', 2], ['5-copas', 2],
      ['4-espadas', 1], ['4-bastos', 1], ['4-oros', 1], ['4-copas', 1]
    ]);
  }

  reset() {
    this.state = {
      players: [],
      currentRound: 0,
      currentTurn: 0,
      score: { team1: 0, team2: 0 },
      deck: [],
      table: [],
      trucoState: null, // null, 'truco', 'retruco', 'vale4'
      envidoState: null, // null, 'envido', 'real-envido', 'falta-envido'
      currentBet: null,
      roundWins: { team1: 0, team2: 0 },
      mano: 0, // Player who starts
      history: []
    };
  }

  createDeck() {
    const suits = ['espadas', 'bastos', 'oros', 'copas'];
    const values = ['1', '2', '3', '4', '5', '6', '7', '10', '11', '12'];
    const deck = [];

    for (const suit of suits) {
      for (const value of values) {
        deck.push({
          value,
          suit,
          id: `${value}-${suit}`,
          power: this.cardPower.get(`${value}-${suit}`)
        });
      }
    }

    return this.shuffle(deck);
  }

  shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  addPlayer(id, team, aiProvider, model, personality = 'normal') {
    this.state.players.push({
      id,
      team,
      aiProvider,
      model,
      personality,
      cards: [],
      playedCards: []
    });
  }

  dealCards() {
    this.state.deck = this.createDeck();
    const cardsPerPlayer = 3;
    
    this.state.players.forEach((player, index) => {
      player.cards = this.state.deck.slice(
        index * cardsPerPlayer,
        (index + 1) * cardsPerPlayer
      );
      player.playedCards = [];
    });

    this.state.currentTurn = this.state.mano;
    this.logEvent('DEAL', { mano: this.state.mano });
  }

  calculateEnvido(cards) {
    // Group by suit
    const bySuit = {};
    cards.forEach(card => {
      if (!bySuit[card.suit]) bySuit[card.suit] = [];
      bySuit[card.suit].push(card);
    });

    let maxEnvido = 0;

    // Check each suit
    for (const suit in bySuit) {
      const suitCards = bySuit[suit];
      if (suitCards.length >= 2) {
        // Get two highest cards of same suit
        const values = suitCards
          .map(c => {
            const val = parseInt(c.value);
            return val >= 10 ? 0 : val; // Face cards = 0
          })
          .sort((a, b) => b - a)
          .slice(0, 2);
        
        const envido = values[0] + values[1] + 20;
        maxEnvido = Math.max(maxEnvido, envido);
      } else {
        // Single card
        const val = parseInt(suitCards[0].value);
        const points = val >= 10 ? 0 : val;
        maxEnvido = Math.max(maxEnvido, points);
      }
    }

    return maxEnvido;
  }

  getCurrentPlayer() {
    return this.state.players[this.state.currentTurn];
  }

  getGameStateForPlayer(playerId) {
    const player = this.state.players.find(p => p.id === playerId);
    return {
      myCards: player.cards,
      myTeam: player.team,
      table: this.state.table,
      score: this.state.score,
      trucoState: this.state.trucoState,
      envidoState: this.state.envidoState,
      currentBet: this.state.currentBet,
      roundWins: this.state.roundWins,
      history: this.state.history.filter(h => h.public), // Only public events
      isMyTurn: this.state.players[this.state.currentTurn].id === playerId
    };
  }

  validateAction(playerId, action) {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player) return false;

    // Check if it's player's turn
    if (this.state.currentBet) {
      // During a bet, specific player must respond
      if (this.state.currentBet.waitingFor !== playerId) return false;
    } else {
      if (this.state.players[this.state.currentTurn].id !== playerId) return false;
    }

    // Validate specific actions
    switch (action.accion) {
      case 'tirar':
        return this.validateCardPlay(player, action.valor);
      
      case 'cantar':
        return this.validateCanto(player, action.valor);
      
      case 'responder':
        return this.validateResponse(player, action.valor);
      
      default:
        return false;
    }
  }

  validateCardPlay(player, cardId) {
    return player.cards.some(c => c.id === cardId);
  }

  validateCanto(player, canto) {
    // Can't canto after 1st card in final round
    if (this.state.table.length > 0 && this.state.roundWins.team1 + this.state.roundWins.team2 === 2) {
      return false;
    }

    // Envido variants - can't canto if already cantado
    if (['envido', 'real-envido', 'falta-envido'].includes(canto)) {
      // If any envido was already cantado, can't canto again
      if (this.state.envidoState) {
        return false;
      }
      // Can't canto envido if truco was already cantado
      if (this.state.trucoState) {
        return false;
      }
      // Can only canto envido before any cards are played in the hand
      const noCardsPlayedYet = this.state.players.every(p => p.playedCards.length === 0);
      return this.state.table.length === 0 && noCardsPlayedYet;
    }

    // Truco variants
    if (canto === 'truco' && !this.state.trucoState) return true;
    if (canto === 'retruco' && this.state.trucoState === 'truco') return true;
    if (canto === 'vale4' && this.state.trucoState === 'retruco') return true;

    return false;
  }

  validateResponse(player, response) {
    if (!this.state.currentBet) return false;
    return ['quiero', 'no-quiero', 'envido', 'real-envido', 'falta-envido', 
            'truco', 'retruco', 'vale4'].includes(response);
  }

  async processAction(playerId, action) {
    if (!this.validateAction(playerId, action)) {
      return { success: false, error: 'Invalid action' };
    }

    const player = this.state.players.find(p => p.id === playerId);

    // Store private thought if present
    if (action.pensamiento) {
      this.logEvent('PRIVATE_THOUGHT', {
        player: playerId,
        thought: action.pensamiento,
        action: action.accion,
        private: true
      });
    }

    switch (action.accion) {
      case 'tirar':
        return this.playCard(player, action.valor, action.razon, action.frase);
      
      case 'cantar':
        return this.processCanto(player, action.valor, action.razon, action.frase);
      
      case 'responder':
        return this.processResponse(player, action.valor, action.razon, action.frase);
    }
  }

  playCard(player, cardId, reason, frase) {
    const cardIndex = player.cards.findIndex(c => c.id === cardId);
    const card = player.cards[cardIndex];
    
    // Remove from hand
    player.cards.splice(cardIndex, 1);
    player.playedCards.push(card);
    
    // Add to table
    this.state.table.push({
      playerId: player.id,
      card: card,
      team: player.team
    });

    this.logEvent('CARD_PLAYED', { 
      player: player.id, 
      card: card.id,
      reason: reason,
      frase: frase,
      public: true 
    });

    console.log(`\n=== AFTER CARD PLAYED ===`);
    console.log(`Table length: ${this.state.table.length}, Players: ${this.state.players.length}`);
    console.log(`Current turn before: ${this.state.currentTurn}`);
    
    // Check if round is complete
    if (this.state.table.length === this.state.players.length) {
      console.log(`Round complete! Evaluating...`);
      this.evaluateRound();
    } else {
      // Next turn
      this.state.currentTurn = (this.state.currentTurn + 1) % this.state.players.length;
      console.log(`Next turn: ${this.state.currentTurn}`);
    }
    console.log(`=== END AFTER CARD PLAYED ===\n`);

    return { success: true };
  }

  evaluateRound() {
    console.log(`\n=== EVALUATING ROUND ===`);
    console.log(`Cards on table: ${this.state.table.length}`);
    console.log(`Table cards:`, this.state.table.map(t => `${t.playerId}: ${t.card.id} (power: ${t.card.power})`));
    
    // Find winner of this round
    let winner = this.state.table[0];
    let isParda = false;
    
    for (let i = 1; i < this.state.table.length; i++) {
      if (this.state.table[i].card.power > winner.card.power) {
        winner = this.state.table[i];
        isParda = false;
      } else if (this.state.table[i].card.power === winner.card.power) {
        // Parda (tie) - the first player (mano) wins
        isParda = true;
      }
    }
    
    // In case of parda, the mano (first player) wins
    if (isParda) {
      winner = this.state.table[0];
      console.log(`PARDA! Winner is mano: ${winner.playerId}`);
    }

    console.log(`Round winner: ${winner.playerId} with ${winner.card.id}`);
    console.log(`Round wins before: team1=${this.state.roundWins.team1}, team2=${this.state.roundWins.team2}`);

    // Update round wins
    this.state.roundWins[winner.team]++;
    
    console.log(`Round wins after: team1=${this.state.roundWins.team1}, team2=${this.state.roundWins.team2}`);
    console.log(`=== END EVALUATE ROUND ===\n`);
    
    this.logEvent('ROUND_WON', { 
      team: winner.team, 
      player: winner.playerId,
      public: true 
    });

    // Clear table
    this.state.table = [];

    // Check if hand is over (best of 3)
    if (this.state.roundWins.team1 === 2 || this.state.roundWins.team2 === 2 ||
        (this.state.roundWins.team1 === 1 && this.state.roundWins.team2 === 1 && 
         this.state.players[0].cards.length === 0)) {
      this.endHand();
    } else {
      // Winner starts next round
      this.state.currentTurn = this.state.players.findIndex(p => p.id === winner.playerId);
    }
  }

  processCanto(player, canto, reason, frase) {
    // Determine who should respond (opponent team)
    const opponentTeam = player.team === 'team1' ? 'team2' : 'team1';
    const opponent = this.state.players.find(p => p.team === opponentTeam);

    this.state.currentBet = {
      type: canto,
      proposer: player.id,
      waitingFor: opponent.id
    };

    this.logEvent('CANTO', { 
      player: player.id, 
      canto: canto,
      reason: reason,
      frase: frase,
      public: true 
    });

    return { success: true, waitingFor: opponent.id };
  }

  processResponse(player, response, reason, frase) {
    const bet = this.state.currentBet;
    if (!bet) return { success: false };

    this.logEvent('RESPONSE', { 
      player: player.id, 
      response: response,
      to: bet.type,
      reason: reason,
      frase: frase,
      public: true 
    });

    if (response === 'quiero') {
      // Accept the bet
      if (['envido', 'real-envido', 'falta-envido'].includes(bet.type)) {
        this.resolveEnvido(bet.type);
      } else {
        this.state.trucoState = bet.type;
      }
    } else if (response === 'no-quiero') {
      // Reject - give points to proposer
      const points = this.getBetValue(bet.type, false);
      const proposerTeam = this.state.players.find(p => p.id === bet.proposer).team;
      this.state.score[proposerTeam] += points;
      
      if (this.isTrucoBet(bet.type)) {
        // When truco is rejected, the hand ends immediately
        // The proposer wins the points for the rejection (already added above)
        // We need to log the hand end but NOT call endHand() which would add more points
        this.logEvent('HAND_END', { 
          winner: proposerTeam,
          points: points,
          finalScore: this.state.score,
          public: true 
        });
        
        // Check game end
        if (this.state.score.team1 >= 30 || this.state.score.team2 >= 30) {
          this.endGame();
        } else {
          // Setup next hand
          this.state.mano = (this.state.mano + 1) % this.state.players.length;
          this.state.roundWins = { team1: 0, team2: 0 };
          this.state.trucoState = null;
          this.state.envidoState = null;
          this.state.currentBet = null;
          this.state.table = [];
          this.dealCards();
        }
        return { success: true };
      }
    } else {
      // Counter-bet (e.g., envido → real-envido)
      return this.processCanto(player, response, reason, frase);
    }

    this.state.currentBet = null;
    return { success: true };
  }

  resolveEnvido(type) {
    console.log(`\n=== RESOLVING ENVIDO ===`);
    console.log(`Type: ${type}`);
    console.log(`Current truco state: ${this.state.trucoState}`);
    
    // Calculate envido for each team
    const team1Players = this.state.players.filter(p => p.team === 'team1');
    const team2Players = this.state.players.filter(p => p.team === 'team2');
    
    const team1Envido = Math.max(...team1Players.map(p => this.calculateEnvido(p.cards)));
    const team2Envido = Math.max(...team2Players.map(p => this.calculateEnvido(p.cards)));

    const winner = team1Envido > team2Envido ? 'team1' : 'team2';
    const points = this.getBetValue(type, true);
    
    console.log(`Winner: ${winner}, Points: ${points}`);
    console.log(`Score before: team1=${this.state.score.team1}, team2=${this.state.score.team2}`);
    
    this.state.score[winner] += points;
    this.state.envidoState = type;
    
    console.log(`Score after: team1=${this.state.score.team1}, team2=${this.state.score.team2}`);
    console.log(`Game should end? team1=${this.state.score.team1 >= 30}, team2=${this.state.score.team2 >= 30}`);
    console.log(`=== END RESOLVING ENVIDO ===\n`);

    this.logEvent('ENVIDO_RESOLVED', { 
      winner,
      team1: team1Envido,
      team2: team2Envido,
      points,
      public: true 
    });
    
    // Check if this envido resolution ends the game
    if (this.state.score.team1 >= 30 || this.state.score.team2 >= 30) {
      console.log('Game ended due to envido points!');
      this.endGame();
    }
  }

  getBetValue(bet, accepted) {
    const values = {
      'envido': accepted ? 2 : 1,
      'real-envido': accepted ? 3 : 1,
      'falta-envido': accepted ? (30 - Math.max(this.state.score.team1, this.state.score.team2)) : 1,
      'truco': accepted ? 2 : 1,
      'retruco': accepted ? 3 : 2,
      'vale4': accepted ? 4 : 3
    };
    return values[bet] || 1;
  }

  isTrucoBet(bet) {
    return ['truco', 'retruco', 'vale4'].includes(bet);
  }

  endHand() {
    // Determine winner
    const winner = this.state.roundWins.team1 > this.state.roundWins.team2 ? 'team1' : 'team2';
    
    // Award points
    let points = 1;
    if (this.state.trucoState === 'truco') points = 2;
    if (this.state.trucoState === 'retruco') points = 3;
    if (this.state.trucoState === 'vale4') points = 4;
    
    this.state.score[winner] += points;

    this.logEvent('HAND_END', { 
      winner,
      points,
      finalScore: this.state.score,
      public: true 
    });

    // Check game end
    if (this.state.score.team1 >= 30 || this.state.score.team2 >= 30) {
      this.endGame();
    } else {
      // Setup next hand
      this.state.mano = (this.state.mano + 1) % this.state.players.length;
      this.state.roundWins = { team1: 0, team2: 0 };
      this.state.trucoState = null;
      this.state.envidoState = null;
      this.state.currentBet = null;
      this.state.table = []; // Clear the table
      this.dealCards();
    }
  }

  endGame() {
    const winner = this.state.score.team1 >= 30 ? 'team1' : 'team2';
    this.logEvent('GAME_END', { 
      winner,
      finalScore: this.state.score,
      public: true 
    });
  }

  logEvent(type, data) {
    this.state.history.push({
      type,
      data,
      timestamp: Date.now(),
      public: data.public || false
    });
  }

  getPublicState(includePrivate = false) {
    return {
      players: this.state.players.map(p => ({
        id: p.id,
        team: p.team,
        cardsCount: p.cards.length,
        playedCards: p.playedCards,
        // Include actual cards for observer mode
        cards: includePrivate ? p.cards : [],
        envido: includePrivate ? this.calculateEnvido(p.cards) : null
      })),
      table: this.state.table,
      score: this.state.score,
      trucoState: this.state.trucoState,
      envidoState: this.state.envidoState,
      currentBet: this.state.currentBet,
      roundWins: this.state.roundWins,
      currentTurn: this.state.currentTurn,
      history: includePrivate ? this.state.history : this.state.history.filter(h => h.public),
      privateThoughts: includePrivate ? this.state.history.filter(h => h.type === 'PRIVATE_THOUGHT') : []
    };
  }
}

export default TrucoEngine;
