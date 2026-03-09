// Game Configuration & State
const state = {
    puzzles: [],
    activePuzzle: null,
    isPlaying: false,
    startTime: 0,
    timerInterval: null,
    score: 0,
    placedPieces: 0,
    totalPieces: 0
};

// UI Elements
const el = {
    puzzleList: document.getElementById('puzzleList'),
    boardContainer: document.getElementById('boardContainer'),
    puzzleGrid: document.getElementById('puzzleGrid'),
    piecesContainer: document.getElementById('piecesContainer'),
    startBtn: document.getElementById('startBtn'),
    resetBtn: document.getElementById('resetBtn'),
    scoreDisplay: document.getElementById('scoreDisplay'),
    timerDisplay: document.getElementById('timerDisplay'),
    currentPuzzleTitle: document.getElementById('currentPuzzleTitle'),
    winModal: document.getElementById('winModal'),
    finalTime: document.getElementById('finalTime'),
    finalScore: document.getElementById('finalScore'),
    playAgainBtn: document.getElementById('playAgainBtn'),
    puzzlePreviewBox: document.getElementById('puzzlePreviewBox'),
    puzzlePreviewImg: document.getElementById('puzzlePreviewImg')
};

// Initialize
async function initGame() {
    // Redirect to login if not logged in
    if (!localStorage.getItem('playerName')) {
        window.location.href = '../../index.html';
        return;
    }
    await fetchPuzzles();
    setupEventListeners();

    // Auto-select puzzle from URL param (e.g. ?puzzle=3 from menu.html)
    const params = new URLSearchParams(window.location.search);
    const paramId = params.get('puzzle');
    if (paramId) {
        const idx = state.puzzles.findIndex(p => String(p.id) === paramId);
        if (idx >= 0) selectPuzzle(idx);
    }
}

async function fetchPuzzles() {
    try {
        const res = await fetch('../backend/get_puzzles.php');
        const json = await res.json();
        if (json.success && json.data.length > 0) {
            state.puzzles = json.data;
            renderPuzzleList();
        } else {
            el.puzzleList.innerHTML = '<li>No puzzles available. Ask admin to upload.</li>';
        }
    } catch (e) {
        console.error("Failed to load puzzles", e);
        el.puzzleList.innerHTML = '<li>Error loading puzzles.</li>';
    }
}

function renderPuzzleList() {
    el.puzzleList.innerHTML = '';
    state.puzzles.forEach((p, index) => {
        const li = document.createElement('li');
        li.textContent = p.title;
        li.dataset.index = index;
        li.addEventListener('click', () => selectPuzzle(index));
        el.puzzleList.appendChild(li);
    });
}

function selectPuzzle(index) {
    if (state.isPlaying) return; // Disable switching during active game

    // Highlight selected
    Array.from(el.puzzleList.children).forEach(child => child.classList.remove('active'));
    el.puzzleList.children[index].classList.add('active');

    state.activePuzzle = state.puzzles[index];
    el.currentPuzzleTitle.textContent = state.activePuzzle.title;
    el.startBtn.disabled = false;
    
    // Show unsliced preview image
    el.puzzlePreviewImg.src = `../${state.activePuzzle.image_url}`;
    el.puzzlePreviewBox.style.display = 'flex';
    
    // Auto preview or prepare board
    prepareBoard();
}

function setupEventListeners() {
    el.startBtn.addEventListener('click', startGame);
    el.resetBtn.addEventListener('click', () => {
        stopGame();
        if(state.activePuzzle) prepareBoard();
    });
    el.playAgainBtn.addEventListener('click', () => {
        el.winModal.classList.remove('show');
        if(state.activePuzzle) prepareBoard();
    });
}

function prepareBoard() {
    el.puzzleGrid.innerHTML = '';
    el.piecesContainer.innerHTML = '';
    
    const p = state.activePuzzle;
    const cols = parseInt(p.grid_columns);
    const rows = parseInt(p.grid_rows);
    state.totalPieces = cols * rows;

    // Set CSS grid config
    el.puzzleGrid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    el.puzzleGrid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    
    // Calculate sizing (Fit within 70% of board container)
    const containerW = el.boardContainer.clientWidth * 0.7;
    const containerH = el.boardContainer.clientHeight * 0.7;
    
    // Assuming image aspect ratio 1:1 for simplicity, or adjust based on container
    // Let's force a fixed size for the grid for easier math
    const boardSize = Math.min(containerW, containerH, 500);
    el.puzzleGrid.style.width = boardSize + 'px';
    el.puzzleGrid.style.height = boardSize + 'px';

    const cellW = boardSize / cols;
    const cellH = boardSize / rows;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.dataset.r = r;
            cell.dataset.c = c;
            cell.style.width = cellW + 'px';
            cell.style.height = cellH + 'px';
            el.puzzleGrid.appendChild(cell);
        }
    }
}

function startGame() {
    if (!state.activePuzzle) return;
    
    state.isPlaying = true;
    state.placedPieces = 0;
    state.score = 0;
    el.scoreDisplay.textContent = state.score;
    
    el.startBtn.disabled = true;
    el.resetBtn.disabled = false;
    el.puzzleList.style.pointerEvents = 'none'; // Prevent switching

    spawnPieces();
    
    state.startTime = Date.now();
    state.timerInterval = setInterval(updateTimer, 1000);
}

function stopGame() {
    state.isPlaying = false;
    clearInterval(state.timerInterval);
    el.timerDisplay.textContent = '00:00';
    el.startBtn.disabled = false;
    el.resetBtn.disabled = true;
    el.puzzleList.style.pointerEvents = 'auto';
}

function updateTimer() {
    if (!state.isPlaying) return;
    const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
    const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const s = String(elapsed % 60).padStart(2, '0');
    el.timerDisplay.textContent = `${m}:${s}`;
}

function spawnPieces() {
    el.piecesContainer.innerHTML = '';
    const p = state.activePuzzle;
    const cols = parseInt(p.grid_columns);
    const rows = parseInt(p.grid_rows);
    
    const boardW = parseInt(el.puzzleGrid.style.width);
    const boardH = parseInt(el.puzzleGrid.style.height);
    const cellW = boardW / cols;
    const cellH = boardH / rows;

    const imageUrl = `../${p.image_url}`;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const piece = document.createElement('div');
            piece.className = 'puzzle-piece';
            piece.dataset.r = r;
            piece.dataset.c = c;
            
            // Background positioning
            piece.style.width = cellW + 'px';
            piece.style.height = cellH + 'px';
            piece.style.backgroundImage = `url('${imageUrl}')`;
            piece.style.backgroundSize = `${boardW}px ${boardH}px`;
            piece.style.backgroundPosition = `-${c * cellW}px -${r * cellH}px`;
            
            // Random initial placement around edges of the board
            const containerW = el.boardContainer.clientWidth;
            const containerH = el.boardContainer.clientHeight;
            
            // Just place them randomly avoiding the center grid if possible
            let rx = Math.random() * (containerW - cellW);
            let ry = Math.random() * (containerH - cellH);
            
            piece.style.left = rx + 'px';
            piece.style.top = ry + 'px';
            
            el.piecesContainer.appendChild(piece);
        }
    }
}

// Hand Tracking Integration hooks
let grabbedPiece = null;
let grabOffsetX = 0;
let grabOffsetY = 0;

window.GameInterface = {
    handlePinchStart: (x, y) => {
        if (!state.isPlaying) return;
        
        // Convert screen coordinates to board container relative coordinates
        const rect = el.boardContainer.getBoundingClientRect();
        const localX = x - rect.left;
        const localY = y - rect.top;

        // Find piece under cursor
        const pieces = Array.from(document.querySelectorAll('.puzzle-piece:not(.snapped)'));
        for (let i = pieces.length - 1; i >= 0; i--) {
            const p = pieces[i];
            
            // Get exact actual bounding rect of the piece on the screen
            const pRect = p.getBoundingClientRect();
            
            // Add a generous hitbox margin to make grabbing on webcam much easier
            const margin = 30;
            
            // Compare absolute screen coordinates (x, y) with the absolute piece bounding rect
            if (x >= (pRect.left - margin) && x <= (pRect.right + margin) && 
                y >= (pRect.top - margin) && y <= (pRect.bottom + margin)) {
                
                grabbedPiece = p;
                
                // Calculate grab initial click offset INSIDE the piece
                // What's important is `pRect.left` vs `x`.
                // e.g. If cursor is at x=200 and piece left is 190, the offset is 10.
                
                grabOffsetX = x - pRect.left;
                grabOffsetY = y - pRect.top;
                
                p.classList.add('grabbed');
                // Bring to front
                el.piecesContainer.appendChild(p);
                break;
            }
        }
    },
    
    handlePinchMove: (x, y) => {
        if (!grabbedPiece) return;
        
        // We know where we clicked within the piece (grabOffsetX/Y)
        // We want the piece's new absolute top/left to be cursor minus that offset.
        // BUT the piece is absolutely positioned relative to `.piecesContainer`.
        // So we need to subtract the container's absolute position.
        
        const containerRect = el.piecesContainer.getBoundingClientRect();
        
        let localX = (x - grabOffsetX) - containerRect.left;
        let localY = (y - grabOffsetY) - containerRect.top;
        
        // Allowed overflow beyond container limits slightly so they can drag comfortably
        const padding = 50; 
        
        localX = Math.max(-padding, Math.min(el.boardContainer.clientWidth - parseFloat(grabbedPiece.style.width) + padding, localX));
        localY = Math.max(-padding, Math.min(el.boardContainer.clientHeight - parseFloat(grabbedPiece.style.height) + padding, localY));

        grabbedPiece.style.left = localX + 'px';
        grabbedPiece.style.top = localY + 'px';
    },
    
    handlePinchEnd: (x, y) => {
        if (!grabbedPiece) return;
        
        // Check if dropped over correct grid cell
        const rect = el.puzzleGrid.getBoundingClientRect();
        const centerX = x; // use absolute screen coord for comparison
        const centerY = y;
        
        let snapped = false;

        // Target cell
        const tr = parseInt(grabbedPiece.dataset.r);
        const tc = parseInt(grabbedPiece.dataset.c);
        
        // Find target cell DOM
        const targetCell = el.puzzleGrid.querySelector(`.grid-cell[data-r="${tr}"][data-c="${tc}"]`);
        if (targetCell) {
            const cellRect = targetCell.getBoundingClientRect();
            
            // Allow snapping if cursor center is within the generous vicinity of the target grid cell
            const margin = 30; // 30px leeway around the cell to forgive loose grabs
            if (x >= (cellRect.left - margin) && x <= (cellRect.right + margin) &&
                y >= (cellRect.top - margin) && y <= (cellRect.bottom + margin)) {
                
                // Snap it
                grabbedPiece.classList.remove('grabbed');
                grabbedPiece.classList.add('snapped');
                
                // Position exactly over the grid cell relative to container
                const containerRect = el.boardContainer.getBoundingClientRect();
                grabbedPiece.style.left = (cellRect.left - containerRect.left) + 'px';
                grabbedPiece.style.top = (cellRect.top - containerRect.top) + 'px';
                
                grabbedPiece = null;
                snapped = true;
                handlePiecePlaced();
            }
        }
        
        if (!snapped) {
            grabbedPiece.classList.remove('grabbed');
            grabbedPiece = null;
        }
    }
};

function handlePiecePlaced() {
    state.placedPieces++;
    
    // Calculate score
    const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
    // Base 1000 per piece, reducing by elapsed seconds
    const pieceScore = Math.max(100, 1000 - (elapsed * 2));
    state.score += pieceScore;
    el.scoreDisplay.textContent = state.score;
    
    if (state.placedPieces >= state.totalPieces) {
        handleWin();
    }
}

function handleWin() {
    stopGame();
    // Calculate final time string
    const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
    const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const s = String(elapsed % 60).padStart(2, '0');
    
    el.finalTime.textContent = `${m}:${s}`;
    el.finalScore.textContent = state.score;
    el.winModal.classList.add('show');
    
    // Save score to db
    const playerName = localStorage.getItem('playerName');
    const puzzleId = state.activePuzzle.id;
    
    fetch('../backend/save_score.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            player_name: playerName,
            puzzle_id: puzzleId,
            score: state.score,
            time_taken: elapsed
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            console.log("Score saved successfully");
        } else {
            console.error("Failed to save score:", data.message);
        }
    })
    .catch(err => console.error("Error saving score:", err));
}

// Start
initGame();
