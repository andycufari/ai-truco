// AI Truco Client App - Enhanced Version
// Handles UI updates and socket communication

let socket;
let currentRoomId;
let gameState;
let isPaused = false;
let showThoughts = true;
let gameStartTime = null;
let gameTimer = null;
let lieCount = { player1: 0, player2: 0 };
let handsPlayed = 0;
let currentFeed = 'actions';
let playerNames = { player1: 'Jugador 1', player2: 'Jugador 2' };

// Avatar mappings
const providerAvatars = {
    'openai': '🧠',
    'claude': '🎭',
    'deepseek': '🌊',
    'ollama': '🦙'
};

const personalityEmojis = {
    'normal': '🎯',
    'agresivo': '🔥',
    'conservador': '🛡️',
    'mentiroso': '🎭',
    'matematico': '🧮'
};

const actionIcons = {
    'CARD_PLAYED': '🃏',
    'CANTO': '📢',
    'RESPONSE': '💬',
    'ROUND_WON': '🏆',
    'ENVIDO_RESOLVED': '🎯',
    'HAND_END': '✋',
    'GAME_END': '🏁',
    'PRIVATE_THOUGHT': '💭'
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeSocket();
    setupEventListeners();
    loadProviders();
    
    // Initialize thoughts button as active
    const thoughtsBtn = document.getElementById('toggleThoughts');
    if (thoughtsBtn && showThoughts) {
        thoughtsBtn.classList.add('bg-purple-500', 'text-black');
        thoughtsBtn.classList.remove('border-purple-500');
    }
});

function initializeSocket() {
    socket = io('http://localhost:3001');

    socket.on('connect', () => {
        console.log('Connected to server');
        updateConnectionStatus(true);
    });

    socket.on('game_created', ({ roomId }) => {
        currentRoomId = roomId;
        console.log('Game created:', roomId);
    });

    socket.on('game_update', (state) => {
        if (!isPaused) {
            gameState = state;
            updateUI(state);
        }
    });

    socket.on('game_error', ({ message }) => {
        addFeedEntry('⚠️ ERROR: ' + message, 'error', 'actions');
    });

    socket.on('game_stopped', () => {
        addFeedEntry('🏁 Se terminó la partida', 'game-end', 'actions');
        stopGameTimer();
        currentRoomId = null; // Clear room ID so a new game can be created
        gameState = null;
        setTimeout(() => {
            showSetup();
            // Clear all game state
            isPaused = false;
            document.getElementById('pauseGame').innerHTML = '⏸️';
        }, 3000);
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        updateConnectionStatus(false);
    });
}

function setupEventListeners() {
    // Start game button
    document.getElementById('startGame').addEventListener('click', startGame);
    
    // Game controls
    document.getElementById('stopGame').addEventListener('click', stopGame);
    document.getElementById('pauseGame').addEventListener('click', togglePause);
    
    // Toggle thoughts button
    const thoughtsBtn = document.getElementById('toggleThoughts');
    if (thoughtsBtn) {
        thoughtsBtn.addEventListener('click', toggleThoughts);
    }
    
    // Speed control
    const speedSlider = document.getElementById('gameSpeed');
    speedSlider.addEventListener('input', (e) => {
        const speed = e.target.value;
        document.getElementById('speedValue').textContent = `${speed/1000}s`;
        if (currentRoomId && socket) {
            socket.emit('update_speed', { roomId: currentRoomId, speed: parseInt(speed) });
        }
    });

    // Provider change handlers
    document.getElementById('player1-provider').addEventListener('change', (e) => {
        updateModelOptions('player1-model', e.target.value);
    });
    
    document.getElementById('player2-provider').addEventListener('change', (e) => {
        updateModelOptions('player2-model', e.target.value);
    });
}

async function loadProviders() {
    try {
        const response = await fetch('http://localhost:3001/api/providers');
        const providers = await response.json();
        
        // Update provider dropdowns based on what's available
        const providerSelects = ['player1-provider', 'player2-provider'];
        providerSelects.forEach(selectId => {
            const select = document.getElementById(selectId);
            select.innerHTML = '';
            
            providers.forEach(provider => {
                const option = document.createElement('option');
                option.value = provider.id;
                option.textContent = provider.name;
                select.appendChild(option);
            });
        });

        // Update initial model options
        if (providers.length > 0) {
            updateModelOptions('player1-model', providers[0].id);
            updateModelOptions('player2-model', providers[0].id);
        }
    } catch (error) {
        console.error('Error loading providers:', error);
    }
}

function updateModelOptions(selectId, providerId) {
    const modelSelect = document.getElementById(selectId);
    modelSelect.innerHTML = '';
    
    const models = {
        'openai': [
            { value: 'gpt-3.5-turbo', text: 'GPT-3.5 (Recomendado)' },
            { value: 'gpt-4', text: 'GPT-4 (Costoso)' }
        ],
        'claude': [
            { value: 'claude-3-haiku-20240307', text: 'Claude Haiku (Económico)' },
            { value: 'claude-3-sonnet-20240229', text: 'Claude Sonnet (Premium)' }
        ],
        'deepseek': [
            { value: 'deepseek-chat', text: 'DeepSeek Chat' },
            { value: 'deepseek-coder', text: 'DeepSeek Coder' }
        ],
        'ollama': [
            { value: 'llama2', text: 'Llama 2 (Local)' },
            { value: 'mistral', text: 'Mistral (Local)' },
            { value: 'codellama', text: 'CodeLlama (Local)' }
        ]
    };
    
    const providerModels = models[providerId] || [];
    providerModels.forEach(model => {
        const option = document.createElement('option');
        option.value = model.value || model;
        option.textContent = model.text || model;
        modelSelect.appendChild(option);
    });
}

function startGame() {
    // Get custom names
    const name1 = document.getElementById('player1-custom-name').value || 'Jugador 1';
    const name2 = document.getElementById('player2-custom-name').value || 'Jugador 2';
    
    playerNames = { player1: name1, player2: name2 };
    
    const players = [
        {
            id: 'player1',
            name: name1,
            team: 'team1',
            aiProvider: document.getElementById('player1-provider').value,
            model: document.getElementById('player1-model').value,
            personality: document.getElementById('player1-personality').value
        },
        {
            id: 'player2',
            name: name2,
            team: 'team2',
            aiProvider: document.getElementById('player2-provider').value,
            model: document.getElementById('player2-model').value,
            personality: document.getElementById('player2-personality').value
        }
    ];

    // Update player info in UI
    updatePlayerDisplay(players[0], 1);
    updatePlayerDisplay(players[1], 2);

    // Create and start game
    socket.emit('create_game', {});
    socket.once('game_created', ({ roomId }) => {
        currentRoomId = roomId;
        socket.emit('start_game', { roomId, players });
        showGameBoard();
        clearAllFeeds();
        startGameTimer();
        lieCount = { player1: 0, player2: 0 };
        handsPlayed = 0;
        addFeedEntry('🎮 ¡Arrancó la partida!', 'game-start', 'actions');
        updateCurrentAction('Preparando la partida...');
    });
}

function updatePlayerDisplay(player, num) {
    const avatar = providerAvatars[player.aiProvider] || '🤖';
    const personalityEmoji = personalityEmojis[player.personality] || '';
    
    // Update main player display
    document.getElementById(`player${num}-avatar`).textContent = avatar;
    document.getElementById(`player${num}-display-name`).textContent = player.name;
    document.getElementById(`player${num}-model-info`).textContent = player.model;
    document.getElementById(`player${num}-personality-info`).textContent = 
        `${personalityEmoji} ${player.personality}`;
    
    // Update observer names
    const observerNameEl = document.getElementById(`observer-player${num}-name`);
    if (observerNameEl) {
        observerNameEl.textContent = `${num === 1 ? '🔵' : '🔴'} ${player.name}`;
    }
}

function stopGame() {
    if (currentRoomId && confirm('¿Seguro que querés terminar la partida?')) {
        socket.emit('stop_game', { roomId: currentRoomId });
    }
}

function togglePause() {
    const btn = document.getElementById('pauseGame');
    isPaused = !isPaused;
    
    if (isPaused) {
        btn.innerHTML = '▶️';
        addFeedEntry('⏸️ Juego pausado', 'system', 'actions');
    } else {
        btn.innerHTML = '⏸️';
        addFeedEntry('▶️ Juego reanudado', 'system', 'actions');
    }
}

function toggleThoughts() {
    showThoughts = !showThoughts;
    const btn = document.getElementById('toggleThoughts');
    
    if (showThoughts) {
        btn.classList.add('bg-purple-500', 'text-black');
        btn.classList.remove('border-purple-500');
        document.querySelectorAll('.thought-bubble').forEach(el => {
            el.style.display = 'block';
        });
    } else {
        btn.classList.remove('bg-purple-500', 'text-black');
        btn.classList.add('border-purple-500');
        document.querySelectorAll('.thought-bubble').forEach(el => {
            el.style.display = 'none';
        });
    }
}

function updateConnectionStatus(connected) {
    // Could add a visual indicator
}

function showSetup() {
    document.getElementById('gameSetup').style.display = 'block';
    document.getElementById('gameBoard').style.display = 'none';
    isPaused = false;
    stopGameTimer();
}

function showGameBoard() {
    document.getElementById('gameSetup').style.display = 'none';
    document.getElementById('gameBoard').style.display = 'block';
}

function updateUI(state) {
    if (!state) return;
    
    console.log('Game state update:', state); // Debug

    // Update scores with animation
    updateScore('team1', state.score.team1);
    updateScore('team2', state.score.team2);

    // Update game state info
    updateGameState(state);
    
    // Update round wins
    updateRoundWins(state.roundWins);

    // Update player cards (card backs for main view)
    updatePlayerCards(state.players);

    // Update observer cards (actual cards)
    console.log('Players data for observer:', state.players); // Debug
    updateObserverCards(state.players);

    // Update table cards
    updateTableCards(state.table);

    // Process history with thoughts
    processHistory(state.history, state.privateThoughts);

    // Highlight current player
    highlightCurrentPlayer(state.currentTurn);

    // Update round info - removed since we simplified the UI
}

function updateScore(team, newScore) {
    const scoreEl = document.getElementById(`score-${team}`);
    const currentScore = parseInt(scoreEl.textContent);
    
    if (currentScore !== newScore) {
        scoreEl.textContent = newScore;
        scoreEl.parentElement.classList.add('pulse');
        setTimeout(() => {
            scoreEl.parentElement.classList.remove('pulse');
        }, 1000);
    }
}

function updateRoundWins(roundWins) {
    if (!roundWins) return;
    
    document.getElementById('round-wins-team1').textContent = roundWins.team1 || 0;
    document.getElementById('round-wins-team2').textContent = roundWins.team2 || 0;
}

function updateGameState(state) {
    // Current bet display
    const betDisplay = document.getElementById('current-bet-display');
    const betText = document.getElementById('current-bet-text');
    
    if (state.currentBet) {
        betDisplay.classList.remove('hidden');
        const proposer = state.currentBet.proposer === 'player1' ? playerNames.player1 : playerNames.player2;
        const waiting = state.currentBet.waitingFor === 'player1' ? playerNames.player1 : playerNames.player2;
        betText.textContent = `${proposer} cantó ${state.currentBet.type.toUpperCase()} - Esperando que responda ${waiting}`;
    } else {
        betDisplay.classList.add('hidden');
    }
}

function updatePlayerCards(players) {
    players.forEach((player, index) => {
        const cardsContainer = document.getElementById(`player${index + 1}-cards`);
        cardsContainer.innerHTML = '';
        
        // Show card backs for cards in hand
        for (let i = 0; i < player.cardsCount; i++) {
            const card = createCardElement(null, true);
            cardsContainer.appendChild(card);
        }
        
        // Show played cards face up
        player.playedCards.forEach(card => {
            const cardEl = createCardElement(card);
            cardEl.classList.add('played');
            cardsContainer.appendChild(cardEl);
        });
    });
}

function updateObserverCards(players) {
    console.log('Updating observer cards for players:', players); // Debug
    
    players.forEach((player, index) => {
        const handContainer = document.getElementById(`observer-player${index + 1}-cards`);
        const envidoEl = document.getElementById(`observer-player${index + 1}-envido`);
        
        if (!handContainer || !envidoEl) {
            console.error(`Observer elements not found for player ${index + 1}`);
            return;
        }
        
        handContainer.innerHTML = '';
        
        // Show actual cards if available
        if (player.cards && player.cards.length > 0) {
            console.log(`Player ${index + 1} cards:`, player.cards); // Debug
            
            player.cards.forEach(card => {
                const cardEl = createCardElement(card, false, true);
                handContainer.appendChild(cardEl);
            });
            
            // Update envido value
            if (player.envido !== null && player.envido !== undefined) {
                envidoEl.textContent = `Envido: ${player.envido}`;
            } else {
                envidoEl.textContent = 'Envido: --';
            }
        } else {
            console.log(`Player ${index + 1} has no cards in state`); // Debug
            // If no cards, show placeholder
            envidoEl.textContent = 'Envido: --';
            const placeholder = document.createElement('div');
            placeholder.className = 'text-gray-600 text-sm';
            placeholder.textContent = 'Sin cartas';
            handContainer.appendChild(placeholder);
        }
    });
}

function updateTableCards(table) {
    const tableContainer = document.getElementById('table-cards');
    
    // Only update if there are new cards
    if (table.length !== tableContainer.children.length) {
        tableContainer.innerHTML = '';
        
        table.forEach((play, index) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'table-card-wrapper';
            wrapper.style.animationDelay = `${index * 0.1}s`;
            
            const cardEl = createCardElement(play.card);
            wrapper.appendChild(cardEl);
            
            const label = document.createElement('div');
            label.className = 'card-label';
            const playerName = play.playerId === 'player1' ? playerNames.player1 : playerNames.player2;
            label.textContent = play.playerId === 'player1' ? '🔵' : '🔴';
            label.title = playerName;
            wrapper.appendChild(label);
            
            tableContainer.appendChild(wrapper);
        });
    }
}

function createCardElement(card, isBack = false, isSmall = false) {
    const cardDiv = document.createElement('div');
    
    // Base classes for all cards
    const baseClasses = 'card relative flex flex-col items-center justify-center font-bold rounded-lg transition-all';
    
    // Size classes
    const sizeClasses = isSmall 
        ? 'w-14 h-20 text-sm' 
        : 'w-20 h-28 text-base';
    
    // Apply classes
    cardDiv.className = `${baseClasses} ${sizeClasses}`;
    
    if (isBack) {
        cardDiv.classList.add('card-back');
        cardDiv.innerHTML = '<div class="absolute inset-0 rounded-lg"></div>';
    } else {
        // Card front
        cardDiv.style.backgroundColor = '#f0f0f0';
        cardDiv.style.border = '2px solid #333';
        
        // Set color based on suit
        let color = 'black';
        if (card.suit === 'copas') color = 'red';
        else if (card.suit === 'oros') color = 'gold';
        else if (card.suit === 'bastos') color = 'green';
        
        cardDiv.style.color = color;
        
        const valueEl = document.createElement('div');
        valueEl.className = isSmall ? 'text-2xl font-bold' : 'text-3xl font-bold';
        valueEl.textContent = card.value;
        
        const suitEl = document.createElement('div');
        suitEl.className = isSmall ? 'text-2xl' : 'text-3xl';
        suitEl.textContent = getSuitSymbol(card.suit);
        
        cardDiv.appendChild(valueEl);
        cardDiv.appendChild(suitEl);
    }
    
    return cardDiv;
}

function getSuitSymbol(suit) {
    const symbols = {
        'espadas': '⚔️',
        'bastos': '🌵',
        'oros': '👑',
        'copas': '🍷'
    };
    return symbols[suit] || suit;
}

function highlightCurrentPlayer(currentTurn) {
    // Remove previous highlights
    document.querySelectorAll('.player-area').forEach(el => {
        el.classList.remove('glow-border');
    });
    
    // Add highlight to current player
    const currentArea = document.getElementById(`player${currentTurn + 1}-area`);
    if (currentArea) {
        currentArea.classList.add('glow-border');
    }
    
    // Update turn display
    const turnDisplay = document.getElementById('current-turn-display');
    if (turnDisplay) {
        const currentPlayerName = currentTurn === 0 ? playerNames.player1 : playerNames.player2;
        turnDisplay.textContent = currentPlayerName;
    }
}

function updateCurrentAction(text) {
    const actionEl = document.getElementById('current-action');
    if (actionEl) {
        actionEl.textContent = text;
        actionEl.style.opacity = '1';
        
        // Fade out after a few seconds
        setTimeout(() => {
            actionEl.style.opacity = '0.5';
        }, 5000);
    }
}

let lastHistoryLength = 0;
let lastThoughtIndex = 0;

function processHistory(history, privateThoughts = []) {
    // Process new public history entries
    if (history.length > lastHistoryLength) {
        const newEntries = history.slice(lastHistoryLength);
        newEntries.forEach(entry => {
            if (entry.type !== 'PRIVATE_THOUGHT') {
                addHistoryEntry(entry);
            }
        });
        lastHistoryLength = history.length;
    }

    // Process private thoughts
    if (privateThoughts && privateThoughts.length > lastThoughtIndex) {
        const newThoughts = privateThoughts.slice(lastThoughtIndex);
        newThoughts.forEach(thought => {
            addThoughtBubble(thought.data);
            addFeedEntry(
                `💭 ${playerNames[thought.data.player]}: "${thought.data.thought}"`, 
                'thought', 
                'thoughts'
            );
        });
        lastThoughtIndex = privateThoughts.length;
    }
}

function addHistoryEntry(entry) {
    let message = '';
    let className = '';
    const icon = actionIcons[entry.type] || '📌';
    const playerName = entry.data.player ? playerNames[entry.data.player] : '';

    switch (entry.type) {
        case 'CARD_PLAYED':
            message = `${playerName} jugó ${entry.data.card}`;
            if (entry.data.frase) {
                message += ` - "${entry.data.frase}"`;
            }
            updateCurrentAction(message);
            playSound('sound-card');
            break;
        case 'CANTO':
            message = `${playerName} cantó ${entry.data.canto.toUpperCase()}`;
            if (entry.data.frase) {
                message += ` - "${entry.data.frase}"`;
            }
            updateCurrentAction(`¡${playerName} canta ${entry.data.canto}!`);
            className = 'canto';
            playSound('sound-action');
            break;
        case 'RESPONSE':
            const response = entry.data.response === 'quiero' ? 'QUIERO' : 
                           entry.data.response === 'no-quiero' ? 'NO QUIERO' : 
                           entry.data.response.toUpperCase();
            message = `${playerName}: ${response}`;
            if (entry.data.frase) {
                message += ` - "${entry.data.frase}"`;
            }
            updateCurrentAction(`${playerName} dice: ${response}`);
            break;
        case 'ROUND_WON':
            const roundWinnerTeam = entry.data.team;
            const roundWinnerName = roundWinnerTeam === 'team1' ? playerNames.player1 : playerNames.player2;
            const currentRoundWins = gameState ? gameState.roundWins : { team1: 0, team2: 0 };
            message = `${roundWinnerName} se llevó la baza (${currentRoundWins.team1}-${currentRoundWins.team2})`;
            updateCurrentAction(`¡${roundWinnerName} gana la ronda!`);
            className = 'win';
            break;
        case 'ENVIDO_RESOLVED':
            const envidoWinnerTeam = entry.data.winner;
            const envidoWinnerName = envidoWinnerTeam === 'team1' ? playerNames.player1 : playerNames.player2;
            message = `Envido: ${envidoWinnerName} ganó con ${entry.data[entry.data.winner]} tantos`;
            updateCurrentAction(`¡${envidoWinnerName} gana el envido!`);
            className = 'win';
            break;
        case 'HAND_END':
            const handWinnerTeam = entry.data.winner;
            const handWinnerName = handWinnerTeam === 'team1' ? playerNames.player1 : playerNames.player2;
            message = `Mano terminada: ${handWinnerName} suma ${entry.data.points} puntos`;
            updateCurrentAction(`¡${handWinnerName} se lleva la mano!`);
            className = 'win';
            handsPlayed++;
            
            // Add separators to both feeds
            setTimeout(() => {
                addFeedEntry('═══════════════════════════════════════', 'separator', 'actions');
                addFeedEntry('💭 Nueva mano - Qué estarán pensando ahora', 'separator', 'thoughts');
            }, 1000);
            break;
        case 'GAME_END':
            const winnerTeam = entry.data.winner;
            const winnerName = winnerTeam === 'team1' ? playerNames.player1 : playerNames.player2;
            message = `¡PARTIDA TERMINADA! Ganador: ${winnerName}`;
            updateCurrentAction(`🏆 ¡${winnerName} GANA LA PARTIDA!`);
            className = 'game-end';
            
            // Add final separators
            setTimeout(() => {
                addFeedEntry('🏆═══════════════════════════════════════🏆', 'game-end', 'actions');
                addFeedEntry('🎯 PARTIDA FINALIZADA', 'game-end', 'actions');
                addFeedEntry('🏆═══════════════════════════════════════🏆', 'game-end', 'actions');
                addFeedEntry('🏆 PARTIDA TERMINADA 🏆', 'game-end', 'thoughts');
            }, 1000);
            break;
    }

    if (message) {
        addFeedEntry(`${icon} ${message}`, className, 'actions');
    }
}

function addThoughtBubble(thoughtData) {
    const playerNum = thoughtData.player === 'player1' ? 1 : 2;
    const playerArea = document.getElementById(`player${playerNum}-area`);
    
    // Remove existing thought bubble if any
    const existingBubble = playerArea.querySelector('.thought-bubble');
    if (existingBubble) {
        existingBubble.remove();
    }
    
    if (!showThoughts) return;
    
    // Create thought bubble
    const bubble = document.createElement('div');
    bubble.className = 'thought-bubble absolute bg-white text-black p-3 rounded-lg shadow-lg max-w-xs text-sm z-50';
    
    // Position to the side instead of top/bottom
    if (playerNum === 1) {
        bubble.classList.add('top-4', 'right-0', 'translate-x-full', 'mr-4');
    } else {
        bubble.classList.add('bottom-4', 'right-0', 'translate-x-full', 'mr-4');
    }
    
    bubble.innerHTML = `
        <button class="absolute top-1 right-1 text-gray-500 hover:text-black text-sm" onclick="this.parentElement.remove()">✕</button>
        <div class="italic pr-4">${thoughtData.thought}</div>
        <div class="absolute w-4 h-4 bg-white transform rotate-45 top-4 -left-2"></div>
    `;
    
    // Add to player area
    playerArea.style.position = 'relative';
    playerArea.style.overflow = 'visible';
    playerArea.appendChild(bubble);
    
    // Check for lies/bluffs
    const thoughtLower = thoughtData.thought.toLowerCase();
    if (thoughtLower.includes('mentir') || 
        thoughtLower.includes('bluff') ||
        thoughtLower.includes('farol') ||
        thoughtLower.includes('engañ')) {
        // Removed lie count tracking since we simplified the UI
    }
    
    // Animate and remove after longer time
    setTimeout(() => {
        if (bubble.parentElement) {
            bubble.classList.add('fade-out');
            setTimeout(() => bubble.remove(), 500);
        }
    }, 12000); // 12 seconds
}

function addFeedEntry(message, className = '', feedType = 'actions') {
    const feedId = feedType === 'actions' ? 'actions-content' : 'thoughts-content';
    const feedContent = document.getElementById(feedId);
    
    if (!feedContent) return;
    
    const entry = document.createElement('div');
    entry.className = 'mb-2 pb-2 border-b border-gray-800 text-sm';
    
    if (className === 'canto') {
        entry.classList.add('text-pink-400');
    } else if (className === 'win') {
        entry.classList.add('text-green-400', 'font-bold');
    } else if (className === 'thought') {
        entry.classList.add('text-purple-400', 'italic');
    } else if (className === 'game-end') {
        entry.classList.add('text-yellow-400', 'font-bold', 'text-base');
    } else if (className === 'separator') {
        entry.classList.add('text-gray-600', 'text-center', 'font-mono', 'text-xs');
    }
    
    const time = new Date().toLocaleTimeString();
    entry.innerHTML = `
        <div class="text-gray-600 text-xs">[${time}]</div>
        <div>${message}</div>
    `;
    
    feedContent.appendChild(entry);
    feedContent.scrollTop = feedContent.scrollHeight;
    
    // Keep only last 50 entries
    while (feedContent.children.length > 50) {
        feedContent.removeChild(feedContent.firstChild);
    }
}

function switchFeed(type) {
    currentFeed = type;
    
    // Update tabs
    document.querySelectorAll('.feed-tab').forEach(tab => {
        tab.classList.remove('border-b-2', 'border-green-500');
    });
    event.target.classList.add('border-b-2', 'border-green-500');
    
    // Update content
    if (type === 'actions') {
        document.getElementById('actions-feed').classList.remove('hidden');
        document.getElementById('thoughts-feed').classList.add('hidden');
    } else {
        document.getElementById('actions-feed').classList.add('hidden');
        document.getElementById('thoughts-feed').classList.remove('hidden');
    }
}

function clearFeed(type) {
    const feedId = type === 'actions' ? 'actions-content' : 'thoughts-content';
    document.getElementById(feedId).innerHTML = '';
}

function clearAllFeeds() {
    clearFeed('actions');
    clearFeed('thoughts');
    lastHistoryLength = 0;
    lastThoughtIndex = 0;
}

function updateLieCount(playerNum) {
    lieCount[`player${playerNum}`]++;
    // Removed UI update since we simplified the interface
}

function startGameTimer() {
    gameStartTime = Date.now();
    if (gameTimer) clearInterval(gameTimer);
    
    gameTimer = setInterval(() => {
        if (!isPaused) {
            const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            // Removed game-time display since we simplified the UI
        }
    }, 1000);
}

function stopGameTimer() {
    if (gameTimer) {
        clearInterval(gameTimer);
        gameTimer = null;
    }
}

// Sound functions
let soundEnabled = true;

function playSound(soundId) {
    if (!soundEnabled) return;
    
    try {
        const sound = document.getElementById(soundId);
        if (sound) {
            sound.currentTime = 0;
            sound.volume = 0.3;
            sound.play().catch(e => console.log('Sound play failed:', e));
        }
    } catch (e) {
        console.log('Sound error:', e);
    }
}

// Make functions globally accessible
window.clearFeed = clearFeed;
window.switchFeed = switchFeed;

// Initialize sound on first user interaction
document.addEventListener('click', () => {
    // Try to play a silent sound to enable audio
    const sounds = ['sound-card', 'sound-action'];
    sounds.forEach(id => {
        const sound = document.getElementById(id);
        if (sound) {
            sound.volume = 0;
            sound.play().then(() => {
                sound.pause();
                sound.currentTime = 0;
                sound.volume = 0.3;
            }).catch(() => {});
        }
    });
}, { once: true });
