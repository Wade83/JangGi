const BOARD_COLS = 9;
const BOARD_ROWS = 10;

const PIECE_TYPE = {
    KING: 'king',
    SA: 'sa',
    CHA: 'cha',
    PO: 'po',
    MA: 'ma',
    SANG: 'sang',
    JOL: 'jol'
};

const PIECE_VALUES = {
    [PIECE_TYPE.CHA]: 13,
    [PIECE_TYPE.PO]: 7,
    [PIECE_TYPE.MA]: 5,
    [PIECE_TYPE.SANG]: 3,
    [PIECE_TYPE.SA]: 3,
    [PIECE_TYPE.JOL]: 2
};

const SIDE = {
    CHO: 'cho',
    HAN: 'han'
};

class Piece {
    constructor(type, side) {
        this.type = type;
        this.side = side;
        this.x = -1;
        this.y = -1;
        this.element = null;
    }

    getLabel() {
        if (this.side === SIDE.CHO) {
            switch (this.type) {
                case PIECE_TYPE.KING: return '楚';
                case PIECE_TYPE.SA: return '士';
                case PIECE_TYPE.CHA: return '車';
                case PIECE_TYPE.PO: return '包';
                case PIECE_TYPE.MA: return '馬';
                case PIECE_TYPE.SANG: return '象';
                case PIECE_TYPE.JOL: return '卒';
            }
        } else {
            switch (this.type) {
                case PIECE_TYPE.KING: return '漢';
                case PIECE_TYPE.SA: return '士';
                case PIECE_TYPE.CHA: return '車';
                case PIECE_TYPE.PO: return '包';
                case PIECE_TYPE.MA: return '馬';
                case PIECE_TYPE.SANG: return '象';
                case PIECE_TYPE.JOL: return '兵';
            }
        }
        return '?';
    }

    getSizeClass() {
        if (this.type === PIECE_TYPE.KING) return 'large';
        if (this.type === PIECE_TYPE.CHA || this.type === PIECE_TYPE.PO || this.type === PIECE_TYPE.MA || this.type === PIECE_TYPE.SANG) return 'medium';
        return 'small';
    }
}

class JanggiGame {
    constructor() {
        this.board = Array(BOARD_ROWS).fill(null).map(() => Array(BOARD_COLS).fill(null));
        this.turn = SIDE.CHO;
        this.selectedPiece = null;
        this.boardElement = document.getElementById('board');
        this.statusElement = document.getElementById('status-message');
        this.turnElement = document.getElementById('current-turn');
        this.moveCounterElement = document.getElementById('move-counter');
        this.moveCount = 0;
        this.maxMoves = 200;
        this.gameOver = false;
        this.lastMoveCapture = false;
        this.lastMoveCheck = false;
        this.passUsed = { cho: false, han: false };

        this.formations = {
            cho: null,
            han: null
        };
        this.playerSide = null;
        this.aiDifficulty = 3;

        this.drawGrid();
        this.setupEventListeners();
        this.setupFormationModal();
        this.soundManager = new SoundManager();
        this.updateScoreboard();
    }

    setupFormationModal() {
        const modal = document.getElementById('formation-modal');
        const startBtn = document.getElementById('start-game-btn');
        const formationBtns = document.querySelectorAll('.formation-btn');
        const sideBtns = document.querySelectorAll('.side-btn');
        const difficultySelect = document.getElementById('ai-difficulty');

        // Side selection
        sideBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                sideBtns.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                this.playerSide = btn.dataset.side;
                this.checkStartReady();
            });
        });

        // Difficulty selection
        difficultySelect.addEventListener('change', () => {
            this.aiDifficulty = parseInt(difficultySelect.value);
        });

        // Formation selection
        formationBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const side = btn.dataset.side;
                const formation = parseInt(btn.dataset.formation);

                document.querySelectorAll(`.formation-btn[data-side="${side}"]`).forEach(b => {
                    b.classList.remove('selected');
                });

                btn.classList.add('selected');
                this.formations[side] = formation;
                this.checkStartReady();
            });
        });

        startBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
            const aiSide = this.playerSide === 'cho' ? SIDE.HAN : SIDE.CHO;
            this.ai = new AI(this, aiSide, this.aiDifficulty);
            this.turn = SIDE.CHO;
            this.initBoard(this.formations.cho, this.formations.han);
            this.renderPieces();
            this.moveCount = 0;
            this.gameOver = false;
            this.lastMoveCapture = false;
            this.lastMoveCheck = false;
            this.passUsed = { cho: false, han: false };
            this.boardElement.style.pointerEvents = "auto";
            this.updateScoreboard();
            this.turnElement.textContent = 'Cho';
            this.updateStatus("Cho's turn");
            // If AI is cho (player is han), AI moves first
            if (aiSide === SIDE.CHO) {
                setTimeout(() => {
                    this.ai.makeMove();
                }, 500);
            }
        });
    }

    checkStartReady() {
        const startBtn = document.getElementById('start-game-btn');
        if (this.playerSide && this.formations.cho !== null && this.formations.han !== null) {
            startBtn.disabled = false;
        }
    }

    computeMaterialScores() {
        let cho = 0;
        let han = 0;

        for (let y = 0; y < BOARD_ROWS; y++) {
            for (let x = 0; x < BOARD_COLS; x++) {
                const piece = this.board[y][x];
                if (!piece) continue;
                const value = PIECE_VALUES[piece.type] || 0;
                if (piece.side === SIDE.CHO) {
                    cho += value;
                } else {
                    han += value;
                }
            }
        }

        return { cho, han };
    }

    updateScoreboard() {
        if (this.moveCounterElement) {
            this.moveCounterElement.textContent = `${this.moveCount} / ${this.maxMoves}`;
        }

        const scores = this.computeMaterialScores();
        const hanWithKomi = (scores.han + 1.5).toFixed(1);
        const choText = scores.cho.toFixed(1);

        const scoreChoEl = document.getElementById('score-cho');
        const scoreHanEl = document.getElementById('score-han');

        if (scoreChoEl) scoreChoEl.textContent = choText;
        if (scoreHanEl) scoreHanEl.textContent = hanWithKomi;
    }

    applyMaterialDecision(reason = 'rule end') {
        if (this.gameOver) return true;
        if (this.lastMoveCapture || this.lastMoveCheck) {
            this.updateStatus('Material decision deferred (capture/check on last move).');
            return false;
        }

        const { cho, han } = this.computeMaterialScores();
        const choScore = cho;
        const hanBase = han;
        const hanWithKomi = hanBase + 1.5;

        const choText = choScore.toFixed(1);
        const hanBaseText = hanBase.toFixed(1);

        let message;
        if (Math.abs(choScore - hanWithKomi) < 1e-6) {
            message = `Material draw (Cho ${choText}, Han ${hanBaseText}+1.5)`;
        } else {
            const winnerSide = choScore > hanWithKomi ? SIDE.CHO : SIDE.HAN;
            const winnerLabel = winnerSide === SIDE.CHO ? 'Cho' : 'Han';
            message = `Material win (${reason}) - ${winnerLabel} wins (Cho ${choText}, Han ${hanBaseText}+1.5)`;
        }

        this.updateStatus(message);
        this.boardElement.style.pointerEvents = 'none';
        this.gameOver = true;
        setTimeout(() => alert(message), 100);
        return true;
    }

    checkEndTriggers() {
        if (this.gameOver) return true;

        const scores = this.computeMaterialScores();
        const lowMaterial = scores.cho <= 10 || scores.han <= 10;
        const moveLimitReached = this.moveCount >= this.maxMoves;
        const bothPassed = this.passUsed.cho && this.passUsed.han;

        if (moveLimitReached || bothPassed || lowMaterial) {
            const reason = moveLimitReached ? '200 moves' : (bothPassed ? 'both passed' : '10 or fewer points');
            return this.applyMaterialDecision(reason);
        }
        return false;
    }
    initBoard(choFormation = 0, hanFormation = 0) {
        this.board = Array(BOARD_ROWS).fill(null).map(() => Array(BOARD_COLS).fill(null));

        const formationPatterns = [
            [PIECE_TYPE.MA, PIECE_TYPE.SANG, PIECE_TYPE.SANG, PIECE_TYPE.MA],
            [PIECE_TYPE.MA, PIECE_TYPE.SANG, PIECE_TYPE.MA, PIECE_TYPE.SANG],
            [PIECE_TYPE.SANG, PIECE_TYPE.MA, PIECE_TYPE.MA, PIECE_TYPE.SANG],
            [PIECE_TYPE.SANG, PIECE_TYPE.MA, PIECE_TYPE.SANG, PIECE_TYPE.MA]
        ];

        const setupSide = (side, rowStart, formation) => {
            const isTop = rowStart === 0;
            const backRow = isTop ? 0 : 9;
            const palaceRow = isTop ? 1 : 8;
            const pawnRow = isTop ? 3 : 6;
            const cannonRow = isTop ? 2 : 7;

            this.placePiece(new Piece(PIECE_TYPE.KING, side), 4, palaceRow);
            this.placePiece(new Piece(PIECE_TYPE.SA, side), 3, backRow);
            this.placePiece(new Piece(PIECE_TYPE.SA, side), 5, backRow);
            this.placePiece(new Piece(PIECE_TYPE.CHA, side), 0, backRow);
            this.placePiece(new Piece(PIECE_TYPE.CHA, side), 8, backRow);

            const pattern = formationPatterns[formation];
            this.placePiece(new Piece(pattern[0], side), 1, backRow);
            this.placePiece(new Piece(pattern[1], side), 2, backRow);
            this.placePiece(new Piece(pattern[2], side), 6, backRow);
            this.placePiece(new Piece(pattern[3], side), 7, backRow);

            this.placePiece(new Piece(PIECE_TYPE.PO, side), 1, cannonRow);
            this.placePiece(new Piece(PIECE_TYPE.PO, side), 7, cannonRow);

            for (let i = 0; i < BOARD_COLS; i += 2) {
                this.placePiece(new Piece(PIECE_TYPE.JOL, side), i, pawnRow);
            }
        };

        setupSide(SIDE.HAN, 0, hanFormation);
        setupSide(SIDE.CHO, 9, choFormation);
    }

    placePiece(piece, x, y) {
        this.board[y][x] = piece;
        piece.x = x;
        piece.y = y;
    }

    drawGrid() {
        this.boardElement.innerHTML = '';
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';

        const createLine = (x1, y1, x2, y2) => {
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute('x1', `${(x1 / (BOARD_COLS - 1)) * 100}%`);
            line.setAttribute('y1', `${(y1 / (BOARD_ROWS - 1)) * 100}%`);
            line.setAttribute('x2', `${(x2 / (BOARD_COLS - 1)) * 100}%`);
            line.setAttribute('y2', `${(y2 / (BOARD_ROWS - 1)) * 100}%`);
            line.setAttribute('stroke', '#333');
            line.setAttribute('stroke-width', '1');
            return line;
        };

        for (let i = 0; i < BOARD_ROWS; i++) svg.appendChild(createLine(0, i, 8, i));
        for (let i = 0; i < BOARD_COLS; i++) svg.appendChild(createLine(i, 0, i, 9));

        svg.appendChild(createLine(3, 0, 5, 2));
        svg.appendChild(createLine(5, 0, 3, 2));
        svg.appendChild(createLine(3, 7, 5, 9));
        svg.appendChild(createLine(5, 7, 3, 9));

        this.boardElement.appendChild(svg);
    }

    renderPieces() {
        const existingPieces = this.boardElement.querySelectorAll('.piece');
        existingPieces.forEach(p => p.remove());

        for (let y = 0; y < BOARD_ROWS; y++) {
            for (let x = 0; x < BOARD_COLS; x++) {
                const piece = this.board[y][x];
                if (piece) {
                    const el = document.createElement('div');
                    el.className = `piece ${piece.side} ${piece.getSizeClass()}`;
                    el.textContent = piece.getLabel();
                    el.style.left = `${(x / (BOARD_COLS - 1)) * 100}%`;
                    el.style.top = `${(y / (BOARD_ROWS - 1)) * 100}%`;
                    el.dataset.x = x;
                    el.dataset.y = y;

                    piece.element = el;
                    this.boardElement.appendChild(el);
                }
            }
        }
    }

    setupEventListeners() {
        this.boardElement.addEventListener('click', (e) => {
            if (this.gameOver) return;

            const rect = this.boardElement.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const clickX = Math.round((x / rect.width) * (BOARD_COLS - 1));
            const clickY = Math.round((y / rect.height) * (BOARD_ROWS - 1));
            this.handleCellClick(clickX, clickY);
        });

        document.getElementById('reset-btn').addEventListener('click', () => {
            if (confirm('새 게임을 시작하시겠습니까? 현재 게임 내용은 사라집니다.')) {
                document.getElementById('formation-modal').classList.remove('hidden');
                this.formations = { cho: null, han: null };
                document.querySelectorAll('.formation-btn').forEach(b => b.classList.remove('selected'));
                document.getElementById('start-game-btn').disabled = true;
                this.moveCount = 0;
                this.gameOver = false;
                this.updateScoreboard();
                this.lastMoveCapture = false;
                this.lastMoveCheck = false;
                this.passUsed = { cho: false, han: false };
                this.boardElement.style.pointerEvents = 'auto';
                this.updateStatus('');
            }
        });

        document.getElementById('pass-btn').addEventListener('click', () => {
            if (this.gameOver) return;
            if (this.ai && this.turn !== this.playerSide) {
                this.updateStatus("It is AI's turn.");
                return;
            }
            this.handlePass();
        });
    }

    handleCellClick(x, y) {
        if (x < 0 || x >= BOARD_COLS || y < 0 || y >= BOARD_ROWS) return;

        const clickedPiece = this.board[y][x];

        if (this.selectedPiece) {
            if (this.isValidMove(this.selectedPiece, x, y)) {
                const ended = this.movePiece(this.selectedPiece, x, y);
                this.selectedPiece = null;
                this.clearHighlights();
                if (!ended) {
                    this.switchTurn();
                }
            } else if (clickedPiece && clickedPiece.side === this.turn) {
                this.selectPiece(clickedPiece);
            } else {
                const pseudoLegal = this.getPseudoLegalMoves(this.selectedPiece).some(m => m.x === x && m.y === y);
                if (pseudoLegal) {
                    this.updateStatus('착수 금지: 내 왕이 장군됩니다.');
                }
                this.selectedPiece = null;
                this.clearHighlights();
            }
        } else {
            if (clickedPiece && clickedPiece.side === this.turn) {
                this.selectPiece(clickedPiece);
            }
        }
    }

    handlePass() {
        this.passUsed[this.turn] = true;
        this.lastMoveCapture = false;
        this.lastMoveCheck = false;
        this.moveCount += 1;
        this.updateScoreboard();

        const ended = this.checkEndTriggers();
        if (!ended) {
            this.switchTurn();
        }
    }
    selectPiece(piece) {
        this.selectedPiece = piece;
        this.clearHighlights();
        piece.element.classList.add('selected');
        this.showValidMoves(piece);
    }

    clearHighlights() {
        const selected = this.boardElement.querySelectorAll('.selected');
        selected.forEach(el => el.classList.remove('selected'));
        const hints = this.boardElement.querySelectorAll('.move-hint');
        hints.forEach(el => el.remove());
    }

    showValidMoves(piece) {
        const moves = this.getLegalMoves(piece);
        moves.forEach(m => {
            const hint = document.createElement('div');
            hint.className = 'move-hint';
            hint.style.left = `${(m.x / (BOARD_COLS - 1)) * 100}%`;
            hint.style.top = `${(m.y / (BOARD_ROWS - 1)) * 100}%`;
            this.boardElement.appendChild(hint);
        });
    }

    isInPalace(x, y, side) {
        if (x < 3 || x > 5) return false;
        if (side === SIDE.HAN) return y >= 0 && y <= 2;
        if (side === SIDE.CHO) return y >= 7 && y <= 9;
        return false;
    }

    isCheck(side, boardState = this.board) {
        let king = null;
        for (let y = 0; y < BOARD_ROWS; y++) {
            for (let x = 0; x < BOARD_COLS; x++) {
                const p = boardState[y][x];
                if (p && p.type === PIECE_TYPE.KING && p.side === side) {
                    king = p;
                    break;
                }
            }
            if (king) break;
        }

        if (!king) return true;

        const enemySide = side === SIDE.CHO ? SIDE.HAN : SIDE.CHO;

        for (let y = 0; y < BOARD_ROWS; y++) {
            for (let x = 0; x < BOARD_COLS; x++) {
                const p = boardState[y][x];
                if (p && p.side === enemySide) {
                    const moves = this.getPseudoLegalMoves(p, boardState);
                    if (moves.some(m => m.x === king.x && m.y === king.y)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    getLegalMoves(piece) {
        const pseudoMoves = this.getPseudoLegalMoves(piece, this.board);
        return pseudoMoves.filter(m => {
            const originalX = piece.x;
            const originalY = piece.y;
            const targetPiece = this.board[m.y][m.x];

            // If capturing opponent's king, always allow it (game ends)
            if (targetPiece && targetPiece.type === PIECE_TYPE.KING && targetPiece.side !== piece.side) {
                return true;
            }

            this.board[originalY][originalX] = null;
            this.board[m.y][m.x] = piece;
            piece.x = m.x;
            piece.y = m.y;

            const inCheck = this.isCheck(piece.side, this.board);

            this.board[m.y][m.x] = targetPiece;
            this.board[originalY][originalX] = piece;
            piece.x = originalX;
            piece.y = originalY;

            return !inCheck;
        });
    }

    getPseudoLegalMoves(piece, boardState = this.board) {
        const moves = [];
        const { x, y, type, side } = piece;

        const addMove = (nx, ny) => {
            if (nx >= 0 && nx < BOARD_COLS && ny >= 0 && ny < BOARD_ROWS) {
                const target = boardState[ny][nx];
                if (!target || target.side !== side) {
                    moves.push({ x: nx, y: ny });
                }
            }
        };

        const checkLine = (dx, dy, maxDist = 10) => {
            for (let i = 1; i <= maxDist; i++) {
                const nx = x + dx * i;
                const ny = y + dy * i;
                if (nx < 0 || nx >= BOARD_COLS || ny < 0 || ny >= BOARD_ROWS) break;

                const target = boardState[ny][nx];
                if (!target) {
                    moves.push({ x: nx, y: ny });
                } else {
                    if (target.side !== side) moves.push({ x: nx, y: ny });
                    break;
                }
            }
        };

        const checkCannonLine = (dx, dy) => {
            let jump = false;
            for (let i = 1; i < 10; i++) {
                const nx = x + dx * i;
                const ny = y + dy * i;
                if (nx < 0 || nx >= BOARD_COLS || ny < 0 || ny >= BOARD_ROWS) break;

                const target = boardState[ny][nx];
                if (!jump) {
                    if (target) {
                        if (target.type === PIECE_TYPE.PO) break;
                        jump = true;
                    }
                } else {
                    if (target) {
                        if (target.side !== side && target.type !== PIECE_TYPE.PO) {
                            moves.push({ x: nx, y: ny });
                        }
                        break;
                    } else {
                        moves.push({ x: nx, y: ny });
                    }
                }
            }
        };

        switch (type) {
            case PIECE_TYPE.JOL:
                const forward = side === SIDE.CHO ? -1 : 1;
                addMove(x, y + forward);
                addMove(x - 1, y);
                addMove(x + 1, y);

                const inTopPalace = (x >= 3 && x <= 5 && y >= 0 && y <= 2);
                const inBottomPalace = (x >= 3 && x <= 5 && y >= 7 && y <= 9);

                if (inTopPalace || inBottomPalace) {
                    const isCenter = (x === 4 && (y === 1 || y === 8));
                    const isCorner = (x === 3 || x === 5) && (y === 0 || y === 2 || y === 7 || y === 9);
                    if (isCenter) {
                        addMove(x - 1, y + forward);
                        addMove(x + 1, y + forward);
                    } else if (isCorner) {
                        const centerY = y < 5 ? 1 : 8;
                        if (y + forward === centerY) {
                            addMove(4, centerY);
                        }
                    }
                }
                break;

            case PIECE_TYPE.CHA:
                checkLine(1, 0); checkLine(-1, 0);
                checkLine(0, 1); checkLine(0, -1);
                if (this.isInPalace(x, y, side) || this.isInPalace(x, y, side === SIDE.CHO ? SIDE.HAN : SIDE.CHO)) {
                    const checkPalaceDiag = (px, py) => {
                        if (x === 4 && (y === 1 || y === 8)) {
                            [[3, y - 1], [5, y - 1], [3, y + 1], [5, y + 1]].forEach(p => addMove(p[0], p[1]));
                        }
                        else if ((x === 3 || x === 5) && (y === 0 || y === 2 || y === 7 || y === 9)) {
                            const cy = y < 5 ? 1 : 8;
                            addMove(4, cy);
                        }
                    };
                    checkPalaceDiag(x, y);
                }
                break;

            case PIECE_TYPE.PO:
                checkCannonLine(1, 0); checkCannonLine(-1, 0);
                checkCannonLine(0, 1); checkCannonLine(0, -1);
                if ((x === 3 || x === 5) && (y === 0 || y === 2 || y === 7 || y === 9)) {
                    const cy = y < 5 ? 1 : 8;
                    const cx = 4;
                    const bridge = boardState[cy][cx];
                    if (bridge && bridge.type !== PIECE_TYPE.PO) {
                        const tx = x === 3 ? 5 : 3;
                        const ty = y === 0 ? 2 : (y === 2 ? 0 : (y === 7 ? 9 : 7));
                        const target = boardState[ty][tx];
                        if (!target || (target.side !== side && target.type !== PIECE_TYPE.PO)) {
                            moves.push({ x: tx, y: ty });
                        }
                    }
                }
                break;

            case PIECE_TYPE.MA:
                const maOffsets = [
                    { dx: 1, dy: 2, px: 0, py: 1 }, { dx: -1, dy: 2, px: 0, py: 1 },
                    { dx: 1, dy: -2, px: 0, py: -1 }, { dx: -1, dy: -2, px: 0, py: -1 },
                    { dx: 2, dy: 1, px: 1, py: 0 }, { dx: 2, dy: -1, px: 1, py: 0 },
                    { dx: -2, dy: 1, px: -1, py: 0 }, { dx: -2, dy: -1, px: -1, py: 0 }
                ];
                maOffsets.forEach(o => {
                    const px = x + o.px;
                    const py = y + o.py;
                    if (px >= 0 && px < BOARD_COLS && py >= 0 && py < BOARD_ROWS) {
                        if (!boardState[py][px]) {
                            addMove(x + o.dx, y + o.dy);
                        }
                    }
                });
                break;

            case PIECE_TYPE.SANG:
                const sangOffsets = [
                    { dx: 2, dy: 3, p1x: 0, p1y: 1, p2x: 1, p2y: 2 }, { dx: -2, dy: 3, p1x: 0, p1y: 1, p2x: -1, p2y: 2 },
                    { dx: 2, dy: -3, p1x: 0, p1y: -1, p2x: 1, p2y: -2 }, { dx: -2, dy: -3, p1x: 0, p1y: -1, p2x: -1, p2y: -2 },
                    { dx: 3, dy: 2, p1x: 1, p1y: 0, p2x: 2, p2y: 1 }, { dx: 3, dy: -2, p1x: 1, p1y: 0, p2x: 2, p2y: -1 },
                    { dx: -3, dy: 2, p1x: -1, p1y: 0, p2x: -2, p2y: 1 }, { dx: -3, dy: -2, p1x: -1, p1y: 0, p2x: -2, p2y: -1 }
                ];
                sangOffsets.forEach(o => {
                    const p1x = x + o.p1x;
                    const p1y = y + o.p1y;
                    const p2x = x + o.p2x;
                    const p2y = y + o.p2y;

                    if (p1x >= 0 && p1x < BOARD_COLS && p1y >= 0 && p1y < BOARD_ROWS &&
                        p2x >= 0 && p2x < BOARD_COLS && p2y >= 0 && p2y < BOARD_ROWS) {
                        if (!boardState[p1y][p1x] && !boardState[p2y][p2x]) {
                            addMove(x + o.dx, y + o.dy);
                        }
                    }
                });
                break;

            case PIECE_TYPE.KING:
            case PIECE_TYPE.SA:
                addMove(x + 1, y); addMove(x - 1, y);
                addMove(x, y + 1); addMove(x, y - 1);
                [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(d => {
                    const nx = x + d[0];
                    const ny = y + d[1];
                    if (this.isInPalace(nx, ny, side)) {
                        const isCenter = (x === 4 && (y === 1 || y === 8));
                        const isCorner = (x === 3 || x === 5) && (y === 0 || y === 2 || y === 7 || y === 9);
                        if (isCenter || isCorner) {
                            addMove(nx, ny);
                        }
                    }
                });

                {
                    const validMoves = moves.filter(m => this.isInPalace(m.x, m.y, side));
                    moves.length = 0;
                    validMoves.forEach(m => moves.push(m));
                }
                break;
        }

        return moves;
    }

    isValidMove(piece, x, y) {
        const moves = this.getLegalMoves(piece);
        return moves.some(m => m.x === x && m.y === y);
    }

    movePiece(piece, x, y) {
        if (this.gameOver) return false;

        const target = this.board[y][x];
        this.lastMoveCapture = !!target;
        if (target) {
            this.capturePiece(target);
            this.soundManager.playCapture();
        } else {
            this.soundManager.playMove();
        }

        this.board[piece.y][piece.x] = null;
        this.board[y][x] = piece;
        piece.x = x;
        piece.y = y;

        this.renderPieces();
        this.moveCount += 1;
        this.passUsed = { cho: false, han: false };
        this.updateScoreboard();
        const opponent = piece.side === SIDE.CHO ? SIDE.HAN : SIDE.CHO;
        this.lastMoveCheck = this.isCheck(opponent);

        return this.checkEndTriggers();
    }
    capturePiece(piece) {
        const capturerSide = piece.side === SIDE.CHO ? SIDE.HAN : SIDE.CHO;
        const capturerContainer = document.getElementById(`captured-${capturerSide}`);

        const el = document.createElement('div');
        el.className = `captured-piece ${piece.side}`;
        el.textContent = piece.getLabel();
        capturerContainer.appendChild(el);
    }

    checkGameOver() {
        if (this.gameOver) return;

        if (this.isCheckmate(this.turn)) {
            const winner = this.turn === SIDE.CHO ? '한' : '초';
            this.updateStatus(`외통수! ${winner} 승리!`);
            this.boardElement.style.pointerEvents = 'none';
            this.soundManager.playGameOver(this.turn !== SIDE.CHO);
            setTimeout(() => alert(`외통수! ${winner} 승리!`), 100);
        } else if (this.isCheck(this.turn)) {
            const player = this.turn === SIDE.CHO ? '초' : '한';
            this.updateStatus(`${player} 장군!`);
            this.soundManager.playCheck();
        }
    }
    isCheckmate(side) {
        if (!this.isCheck(side)) return false;

        for (let y = 0; y < BOARD_ROWS; y++) {
            for (let x = 0; x < BOARD_COLS; x++) {
                const piece = this.board[y][x];
                if (piece && piece.side === side) {
                    if (this.getLegalMoves(piece).length > 0) return false;
                }
            }
        }
        return true;
    }

    switchTurn() {
        if (this.gameOver) return;

        this.turn = this.turn === SIDE.CHO ? SIDE.HAN : SIDE.CHO;
        this.turnElement.textContent = this.turn === SIDE.CHO ? '초' : '한';
        this.updateStatus(`${this.turn === SIDE.CHO ? '초' : '한'}의 차례`);

        this.checkGameOver();
        if (this.gameOver) {
            this.boardElement.style.pointerEvents = 'none';
            return;
        }

        if (this.turn === this.ai.side) {
            this.boardElement.style.pointerEvents = 'none';
            this.updateStatus("AI가 생각 중...");
            this.ai.makeMove();
        } else {
            this.boardElement.style.pointerEvents = 'auto';
        }
    }
    updateStatus(msg) {
        this.statusElement.textContent = msg;
    }
}

window.onload = () => {
    const game = new JanggiGame();
};
