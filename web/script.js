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
        this.moveCounterElement = document.getElementById('move-counter');
        this.difficultyDisplayElement = document.getElementById('difficulty-display');
        this.profileNameDisplay = document.getElementById('profile-name-display');
        this.profileGradeDisplay = document.getElementById('profile-grade-display');
        this.profileExpDisplay = document.getElementById('profile-exp-display');
        this.profileRecordDisplay = document.getElementById('profile-record-display');
        this.userModalElement = document.getElementById('user-modal');
        this.formationModalElement = document.getElementById('formation-modal');
        this.moveCount = 0;
        this.maxMoves = 200;
        this.gameOver = false;
        this.lastMoveCapture = false;
        this.lastMoveCheck = false;
        this.passUsed = { cho: false, han: false };
        this.resultProcessed = false;

        this.formations = {
            cho: 0,
            han: 0
        };
        this.playerSide = null;
        this.aiDifficulty = 3;
        this.aiDelay = 1000; // Default 1 second
        this.moveHistory = []; // Track move history for undo

        // Initialize UserManager
        this.userManager = new UserManager();
        this.currentUser = null;
        this.profile = {
            name: '',
            grade: 1,
            exp: 0,
            wins: 0,
            losses: 0,
            highestGrade: 1
        };

        this.drawGrid();
        this.setupEventListeners();
        this.setupFormationModal();
        this.setupUserModal();
        this.soundManager = new SoundManager();
        this.updateScoreboard();
        this.updateProfileDisplay();
    }

    getDepthForDifficulty(level) {
        // 9단계 난이도(1~9) 그대로 깊이 매핑
        const map = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        return map[(level || 1) - 1] || 1;
    }

    gradeIndexToDepth(gradeIndex) {
        // 27단계(18급~9단)를 3단계씩 묶어 9단계 난이도로 변환
        const idx = Math.max(1, Math.min(gradeIndex || 1, 27));
        return Math.ceil(idx / 3);
    }

    getGradeLabel(idx) {
        const labels = [
            '18급', '17급', '16급', '15급', '14급', '13급', '12급', '11급', '10급',
            '9급', '8급', '7급', '6급', '5급', '4급', '3급', '2급', '1급',
            '1단', '2단', '3단', '4단', '5단', '6단', '7단', '8단', '9단'
        ];
        return labels[idx - 1] || `레벨 ${idx}`;
    }

    // Removed loadProfiles() and saveProfiles() - now using UserManager

    setupUserModal() {
        const listEl = document.getElementById('user-list');
        const noUserEl = document.getElementById('no-user');
        const userListSection = document.getElementById('user-list-section');
        const modalTitle = document.getElementById('user-modal-title');
        const showRegisterBtn = document.getElementById('show-register-btn');
        const registerForm = document.getElementById('register-form');
        const nameInput = document.getElementById('new-user-name');
        const gradeSelect = document.getElementById('new-user-grade');
        const formationInput = document.getElementById('new-user-formation');
        const delayInput = document.getElementById('new-user-delay');
        const addBtn = document.getElementById('add-user-btn');
        const cancelRegisterBtn = document.getElementById('cancel-register-btn');
        const limitMsg = document.getElementById('user-limit-msg');

        // Show/hide registration form
        if (showRegisterBtn) {
            showRegisterBtn.addEventListener('click', () => {
                if (registerForm) registerForm.style.display = 'block';
                if (userListSection) userListSection.style.display = 'none';
                if (modalTitle) modalTitle.textContent = '사용자 등록';
                showRegisterBtn.style.display = 'none';
            });
        }

        if (cancelRegisterBtn) {
            cancelRegisterBtn.addEventListener('click', () => {
                if (registerForm) registerForm.style.display = 'none';
                if (userListSection) userListSection.style.display = 'block';
                if (modalTitle) modalTitle.textContent = '사용자 선택';
                if (showRegisterBtn) showRegisterBtn.style.display = 'block';
                // Reset form
                if (nameInput) nameInput.value = '';
                if (gradeSelect) gradeSelect.value = '1';
                if (formationInput) formationInput.value = '0';
                if (delayInput) delayInput.value = '2';
                if (limitMsg) limitMsg.textContent = '';
            });
        }

        const renderList = () => {
            if (!listEl) return;
            listEl.innerHTML = '';
            const users = this.userManager.getAllUsers();
            const hasUsers = users.length > 0;
            if (noUserEl) noUserEl.style.display = hasUsers ? 'none' : 'block';
            if (limitMsg) limitMsg.textContent = users.length >= 10 ? '등록 인원은 최대 10명입니다.' : '';

            users.forEach(user => {
                const item = document.createElement('div');
                item.className = 'user-item';

                const nameDiv = document.createElement('div');
                const rankInfo = this.userManager.getRankInfo(user.rank);
                nameDiv.textContent = `${user.name} (${rankInfo.name})`;

                const recordDiv = document.createElement('div');
                recordDiv.textContent = `전적 ${user.wins}승 ${user.losses}패`;

                const actions = document.createElement('div');
                actions.className = 'actions';

                const selectBtn = document.createElement('button');
                selectBtn.className = 'start-btn';
                selectBtn.textContent = '선택';
                selectBtn.addEventListener('click', () => {
                    this.currentUser = this.userManager.setCurrentUser(user.id);
                    this.updateProfileDisplay();
                    this.hideUserModal();
                    this.showFormationModal();
                });

                const editBtn = document.createElement('button');
                editBtn.className = 'start-btn slim';
                editBtn.textContent = '편집';
                editBtn.addEventListener('click', () => {
                    this.showEditModal(user);
                });

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'start-btn slim';
                deleteBtn.textContent = '삭제';
                deleteBtn.addEventListener('click', () => {
                    if (confirm(`${user.name} 프로필을 삭제할까요?`)) {
                        this.userManager.deleteUser(user.id);
                        renderList();
                        if (this.userManager.getAllUsers().length === 0) {
                            this.showUserModal();
                        }
                    }
                });

                actions.appendChild(selectBtn);
                actions.appendChild(editBtn);
                actions.appendChild(deleteBtn);
                item.appendChild(nameDiv);
                item.appendChild(recordDiv);
                item.appendChild(actions);
                listEl.appendChild(item);
            });
        };

        if (addBtn) {
            addBtn.addEventListener('click', () => {
                const users = this.userManager.getAllUsers();
                if (users.length >= 10) {
                    if (limitMsg) limitMsg.textContent = '등록 인원은 최대 10명입니다.';
                    return;
                }

                const name = nameInput ? nameInput.value.trim() : '';
                const rank = gradeSelect ? parseInt(gradeSelect.value) : 1;
                const formation = formationInput ? parseInt(formationInput.value) : 0;
                const delay = delayInput ? parseFloat(delayInput.value) : 2;

                if (!name) {
                    alert('이름을 입력해 주세요.');
                    return;
                }

                if (users.some(u => u.name === name)) {
                    alert('이미 동일한 이름의 사용자가 있습니다.');
                    return;
                }

                // Create user with initial rank and XP (same formation for both sides)
                const newUser = this.userManager.createUser(name, formation, formation, delay);
                newUser.rank = rank;
                const rankInfo = this.userManager.getRankInfo(rank);
                newUser.experience = rankInfo.xpRequired;
                this.userManager.updateUser(newUser.id, newUser);

                renderList();
                // Reset form and hide
                if (nameInput) nameInput.value = '';
                if (gradeSelect) gradeSelect.value = '1';
                if (formationInput) formationInput.value = '0';
                if (delayInput) delayInput.value = '2';
                if (registerForm) registerForm.style.display = 'none';
                if (userListSection) userListSection.style.display = 'block';
                if (modalTitle) modalTitle.textContent = '사용자 선택';
                if (showRegisterBtn) showRegisterBtn.style.display = 'block';
            });
        }

        this.showUserModal();
        renderList();
    }

    showUserModal() {
        if (this.userModalElement) this.userModalElement.classList.remove('hidden');
        if (this.formationModalElement) this.formationModalElement.classList.add('hidden');
    }

    hideUserModal() {
        if (this.userModalElement) this.userModalElement.classList.add('hidden');
    }

    showFormationModal() {
        if (this.userModalElement) this.userModalElement.classList.add('hidden');
        if (this.formationModalElement) this.formationModalElement.classList.remove('hidden');
        this.updateProfileDisplay();
        // Re-setup formation modal with current user settings
        this.setupFormationModal();
    }

    showEditModal(user) {
        const editModal = document.getElementById('user-edit-modal');
        const editName = document.getElementById('edit-user-name');
        const editGrade = document.getElementById('edit-user-grade');
        const editFormation = document.getElementById('edit-user-formation');
        const editDelay = document.getElementById('edit-user-delay');
        const saveBtn = document.getElementById('save-user-btn');
        const cancelBtn = document.getElementById('cancel-edit-btn');

        if (!editModal) return;

        // Set current values
        if (editName) editName.value = user.name;
        const rankInfo = this.userManager.getRankInfo(user.rank);
        if (editGrade) editGrade.value = user.rank;
        if (editFormation) editFormation.value = user.preferredFormation.cho; // Use cho as the single formation
        if (editDelay) editDelay.value = user.aiDelay;

        // Remove old listeners
        const newSaveBtn = saveBtn.cloneNode(true);
        const newCancelBtn = cancelBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

        // Save handler
        newSaveBtn.addEventListener('click', () => {
            const formation = parseInt(editFormation.value);
            const updates = {
                preferredFormation: {
                    cho: formation,
                    han: formation  // Same formation for both sides
                },
                aiDelay: parseFloat(editDelay.value)
            };
            this.userManager.updateUser(user.id, updates);
            editModal.classList.add('hidden');
            // Refresh user list
            this.setupUserModal();
        });

        // Cancel handler
        newCancelBtn.addEventListener('click', () => {
            editModal.classList.add('hidden');
        });

        editModal.classList.remove('hidden');
    }

    updateProfileDisplay() {
        if (!this.currentUser) return;
        const { name, rank, experience, wins, losses } = this.currentUser;
        const rankInfo = this.userManager.getRankInfo(rank);
        const nextRankInfo = this.userManager.getRankInfo(rank + 1);
        const nextThreshold = nextRankInfo ? nextRankInfo.xpRequired : 'MAX';

        if (this.profileNameDisplay) this.profileNameDisplay.textContent = `이름: ${name || '-'}`;
        if (this.profileGradeDisplay) this.profileGradeDisplay.textContent = `레벨: ${rankInfo.name}`;
        if (this.profileExpDisplay) {
            const nextText = nextThreshold === 'MAX' ? `${experience} / MAX` : `${experience} / ${nextThreshold}`;
            this.profileExpDisplay.textContent = `EXP: ${nextText}`;
        }
        if (this.profileRecordDisplay) {
            this.profileRecordDisplay.textContent = `전적: ${wins}승 ${losses}패`;
        }
    }

    getNextExpThreshold(grade) {
        // thresholds per grade index (1..27): reaching threshold bumps to next grade
        const thresholds = [
            0, 150, 320, 500, 700, 920, 1150, 1400, 1660, 1930,
            2210, 2500, 2800, 3110, 3430, 3760, 4100, 4450, 4810,
            5180, 5560, 5950, 6350, 6760, 7180, 7610, 8050, 8500, Infinity
        ];
        return thresholds[grade] || null;
    }

    applyResultToProfile(outcome) {
        if (!this.currentUser) return;

        const won = outcome === 'win';
        const result = this.userManager.recordGameResult(this.currentUser, won);

        // Update current user reference
        this.currentUser = this.userManager.getUser(this.currentUser.id);
        this.updateProfileDisplay();

        // Show result modal
        this.showResultModal(won, result);
    }

    showResultModal(won, result) {
        const resultModal = document.getElementById('result-modal');
        const resultTitle = document.getElementById('result-title');
        const resultOutcome = document.getElementById('result-outcome');
        const resultXP = document.getElementById('result-xp');
        const resultRank = document.getElementById('result-rank');
        const nextGameBtn = document.getElementById('next-game-btn');
        const exitGameBtn = document.getElementById('exit-game-btn');

        if (!resultModal) return;

        // Set result content
        if (resultTitle) {
            resultTitle.textContent = won ? '승리!' : '패배';
            resultTitle.style.color = won ? '#2ecc71' : '#e74c3c';
        }

        if (resultOutcome) {
            resultOutcome.textContent = won ? '🎉 축하합니다! 승리하셨습니다!' : '😔 아쉽게 패배하셨습니다.';
            resultOutcome.style.fontSize = '24px';
            resultOutcome.style.marginBottom = '20px';
        }

        if (resultXP) {
            const xpText = result.xpChange > 0 ? `+${result.xpChange}` : `${result.xpChange}`;
            resultXP.textContent = `경험치: ${xpText} (총 ${result.newXP} XP)`;
            resultXP.style.fontSize = '18px';
            resultXP.style.color = result.xpChange > 0 ? '#2ecc71' : '#e74c3c';
        }

        if (resultRank) {
            const oldRankInfo = this.userManager.getRankInfo(result.oldRank);
            const newRankInfo = this.userManager.getRankInfo(result.newRank);

            if (result.rankChanged) {
                const direction = result.newRank > result.oldRank ? '승급' : '강등';
                resultRank.textContent = `${direction}! ${oldRankInfo.name} → ${newRankInfo.name}`;
                resultRank.style.fontSize = '20px';
                resultRank.style.color = '#f39c12';
                resultRank.style.fontWeight = 'bold';
            } else {
                resultRank.textContent = `현재 급수: ${newRankInfo.name}`;
                resultRank.style.fontSize = '18px';
                resultRank.style.color = '#ecf0f1';
            }
        }

        // Remove old event listeners
        const newNextBtn = nextGameBtn.cloneNode(true);
        const newExitBtn = exitGameBtn.cloneNode(true);
        nextGameBtn.parentNode.replaceChild(newNextBtn, nextGameBtn);
        exitGameBtn.parentNode.replaceChild(newExitBtn, exitGameBtn);

        // Next game handler
        newNextBtn.addEventListener('click', () => {
            resultModal.classList.add('hidden');
            this.showFormationModal();
        });

        // Exit handler
        newExitBtn.addEventListener('click', () => {
            resultModal.classList.add('hidden');
            this.setupUserModal(); // Refresh user list with updated stats
        });

        resultModal.classList.remove('hidden');
    }

    // Removed recalculateGrade() - now using UserManager

    onGameEnd(winnerSide) {
        if (this.resultProcessed) return;
        this.resultProcessed = true;
        if (!this.playerSide) return;
        let outcome = 'draw';
        if (winnerSide) {
            outcome = winnerSide === this.playerSide ? 'win' : 'loss';
        }
        this.applyResultToProfile(outcome);
    }

    resumeTurnState(fromUndo = false) {
        if (this.gameOver) return;
        const isAITurn = this.ai && this.turn === this.ai.side;
        if (isAITurn) {
            this.boardElement.style.pointerEvents = 'none';
            this.updateStatus("AI가 생각 중...");
            if (fromUndo) {
                setTimeout(() => this.ai.makeMove(), this.aiDelay);
            }
        } else {
            this.boardElement.style.pointerEvents = 'auto';
            this.updateStatus(`${this.turn === SIDE.CHO ? '초' : '한'}의 차례입니다`);
        }
    }

    setDefaultFormations() {
        this.formations = { cho: 0, han: 0 };
        document.querySelectorAll('.formation-btn').forEach(b => b.classList.remove('selected'));
        ['cho', 'han'].forEach(side => {
            const btn = document.querySelector(`.formation-btn[data-side="${side}"][data-formation="0"]`);
            if (btn) {
                btn.classList.add('selected');
            }
        });
    }

    setupFormationModal() {
        const modal = document.getElementById('formation-modal');
        const startBtn = document.getElementById('start-game-btn');
        const formationBtns = document.querySelectorAll('.formation-btn');
        const sideBtns = document.querySelectorAll('.side-btn');
        const difficultySelect = document.getElementById('ai-difficulty');
        const delayInput = document.getElementById('ai-delay');

        if (!this.currentUser) {
            return;
        }

        // Auto-configure based on user profile
        // 1. Set AI difficulty based on user rank
        const aiDifficulty = this.userManager.getAIDifficulty(this.currentUser.rank);
        this.aiDifficulty = aiDifficulty;
        if (difficultySelect) {
            difficultySelect.value = String(aiDifficulty);
            difficultySelect.disabled = true; // Disable manual selection
            const rankInfo = this.userManager.getRankInfo(this.currentUser.rank);
            this.difficultyDisplayElement.textContent = `난이도: 레벨${aiDifficulty} (${rankInfo.name})`;
        }

        // 2. Set AI delay from user preference
        if (delayInput) {
            delayInput.value = this.currentUser.aiDelay;
            this.aiDelay = this.currentUser.aiDelay * 1000;
        }

        // 3. Auto-select player side (alternating)
        const nextSide = this.userManager.getNextSide(this.currentUser);
        this.playerSide = nextSide;
        sideBtns.forEach(btn => {
            btn.classList.remove('selected');
            btn.disabled = true; // Disable manual selection
            if (btn.dataset.side === nextSide) {
                btn.classList.add('selected');
            }
        });

        // 4. Set player's preferred formation
        const playerFormation = this.currentUser.preferredFormation[nextSide];
        this.formations[nextSide] = playerFormation;

        // 5. Set random AI formation
        const aiSideStr = nextSide === 'cho' ? 'han' : 'cho';
        const aiFormation = this.userManager.getRandomFormation();
        this.formations[aiSideStr] = aiFormation;

        // Disable all formation buttons and select appropriate ones
        formationBtns.forEach(btn => {
            btn.classList.remove('selected');
            btn.disabled = true; // Disable manual selection
            const side = btn.dataset.side;
            const formation = parseInt(btn.dataset.formation);

            if (side === nextSide && formation === playerFormation) {
                btn.classList.add('selected');
            } else if (side === aiSideStr && formation === aiFormation) {
                btn.classList.add('selected');
            }
        });

        // Enable start button
        if (startBtn) {
            startBtn.disabled = false;
        }

        // Start button handler
        const newStartBtn = startBtn.cloneNode(true);
        startBtn.parentNode.replaceChild(newStartBtn, startBtn);

        // 5-second auto-start countdown
        let countdown = 5;
        let countdownInterval = null;
        let autoStartTimeout = null;

        const startGame = () => {
            // Clear timers
            if (countdownInterval) clearInterval(countdownInterval);
            if (autoStartTimeout) clearTimeout(autoStartTimeout);

            modal.classList.add('hidden');

            // Record side choice for alternation
            this.userManager.recordSide(this.currentUser, nextSide);

            const aiSide = this.playerSide === 'cho' ? SIDE.HAN : SIDE.CHO;
            const searchDepth = this.getDepthForDifficulty(this.aiDifficulty);
            this.ai = new AI(this, aiSide, searchDepth);
            this.turn = SIDE.CHO;
            this.initBoard(this.formations.cho, this.formations.han);
            this.renderPieces();
            this.moveCount = 0;
            this.gameOver = false;
            this.resultProcessed = false;
            this.lastMoveCapture = false;
            this.lastMoveCheck = false;
            this.passUsed = { cho: false, han: false };
            this.moveHistory = [];
            this.boardElement.style.pointerEvents = "auto";
            this.updateScoreboard();
            this.updateStatus("초의 차례입니다");

            // If AI is cho (player is han), AI moves first
            if (aiSide === SIDE.CHO) {
                setTimeout(() => {
                    this.ai.makeMove();
                }, 500);
            }
        };

        // Update button text with countdown
        const updateButtonText = () => {
            newStartBtn.textContent = `대국 시작 (${countdown}초)`;
        };

        updateButtonText();

        // Start countdown
        countdownInterval = setInterval(() => {
            countdown--;
            if (countdown > 0) {
                updateButtonText();
            } else {
                clearInterval(countdownInterval);
                startGame();
            }
        }, 1000);

        // Auto-start after 5 seconds
        autoStartTimeout = setTimeout(() => {
            startGame();
        }, 5000);

        // Manual start on click
        newStartBtn.addEventListener('click', () => {
            startGame();
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
        let winnerSide = null;
        if (Math.abs(choScore - hanWithKomi) < 1e-6) {
            message = `Material draw (Cho ${choText}, Han ${hanBaseText}+1.5)`;
        } else {
            winnerSide = choScore > hanWithKomi ? SIDE.CHO : SIDE.HAN;
            const winnerLabel = winnerSide === SIDE.CHO ? 'Cho' : 'Han';
            message = `Material win (${reason}) - ${winnerLabel} wins (Cho ${choText}, Han ${hanBaseText}+1.5)`;
        }

        this.updateStatus(message);
        this.boardElement.style.pointerEvents = 'none';
        this.gameOver = true;
        this.onGameEnd(winnerSide);
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

        // Clear captured pieces containers
        const capturedChoContainer = document.getElementById('captured-cho');
        const capturedHanContainer = document.getElementById('captured-han');
        if (capturedChoContainer) capturedChoContainer.innerHTML = '';
        if (capturedHanContainer) capturedHanContainer.innerHTML = '';

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
                this.setDefaultFormations();
                document.querySelectorAll('.side-btn').forEach(b => b.classList.remove('selected'));
                this.playerSide = null;
                document.getElementById('start-game-btn').disabled = true;
                this.moveCount = 0;
                this.gameOver = false;
                this.resultProcessed = false;
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

        document.getElementById('undo-btn').addEventListener('click', () => {
            this.handleUndo();
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
        // Save pass action to history so it can be undone
        this.moveHistory.push({
            action: 'pass',
            moveCount: this.moveCount,
            turn: this.turn,
            passUsed: { ...this.passUsed },
            lastMoveCapture: this.lastMoveCapture,
            lastMoveCheck: this.lastMoveCheck
        });

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

    handleUndo() {
        if (this.gameOver) {
            this.updateStatus("게임이 종료되었습니다.");
            return;
        }

        if (this.moveHistory.length === 0) {
            this.updateStatus("무를 수가 없습니다.");
            return;
        }

        const restoreHistoryEntry = (entry) => {
            if (entry.action === 'pass') {
                this.moveCount = entry.moveCount;
                this.turn = entry.turn;
                this.passUsed = { ...entry.passUsed };
                this.lastMoveCapture = entry.lastMoveCapture;
                this.lastMoveCheck = entry.lastMoveCheck;
                this.updateScoreboard();
                return;
            }

            this.board[entry.fromY][entry.fromX] = entry.piece;
            this.board[entry.toY][entry.toX] = entry.captured;
            entry.piece.x = entry.fromX;
            entry.piece.y = entry.fromY;

            if (entry.captured) {
                const capturerSide = entry.captured.side === SIDE.CHO ? SIDE.HAN : SIDE.CHO;
                const capturerContainer = document.getElementById(`captured-${capturerSide}`);
                if (capturerContainer.lastChild) {
                    capturerContainer.removeChild(capturerContainer.lastChild);
                }
            }

            this.moveCount = entry.moveCount;
            this.turn = entry.turn;
            this.passUsed = { ...entry.passUsed };
            this.lastMoveCapture = entry.lastMoveCapture;
            this.lastMoveCheck = entry.lastMoveCheck;
            this.renderPieces();
            this.updateScoreboard();
        };

        const undoOnce = () => {
            if (this.moveHistory.length === 0) return;
            const entry = this.moveHistory.pop();
            restoreHistoryEntry(entry);
        };

        // 플레이어 차례에 무르면 AI 수와 내 수를 한꺼번에 되돌린다
        if (this.ai && this.playerSide && this.turn === this.playerSide) {
            undoOnce(); // 상대 수
            undoOnce(); // 내 수
        } else {
            undoOnce();
        }

        this.selectedPiece = null;
        this.clearHighlights();
        this.resumeTurnState(true);
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

        // Save move to history before making the move
        this.moveHistory.push({
            action: 'move',
            piece: piece,
            fromX: piece.x,
            fromY: piece.y,
            toX: x,
            toY: y,
            captured: target,
            moveCount: this.moveCount,
            turn: this.turn,
            passUsed: { ...this.passUsed },
            lastMoveCapture: this.lastMoveCapture,
            lastMoveCheck: this.lastMoveCheck
        });

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

        // Highlight last move
        const allPieces = this.boardElement.querySelectorAll('.piece');
        allPieces.forEach(p => p.classList.remove('last-move'));
        if (piece.element) {
            piece.element.classList.add('last-move');
        }

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
            const winnerSide = this.turn === SIDE.CHO ? SIDE.HAN : SIDE.CHO;
            const winner = winnerSide === SIDE.CHO ? '초' : '한';
            this.updateStatus(`외통수! ${winner} 승리!`);
            this.boardElement.style.pointerEvents = 'none';
            this.soundManager.playGameOver(this.turn !== SIDE.CHO);
            this.onGameEnd(winnerSide);
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
        this.updateStatus(`${this.turn === SIDE.CHO ? '초' : '한'}의 차례입니다`);

        this.checkGameOver();
        if (this.gameOver) {
            this.boardElement.style.pointerEvents = 'none';
            return;
        }

        if (this.turn === this.ai.side) {
            this.boardElement.style.pointerEvents = 'none';
            this.updateStatus("AI가 생각 중...");
            setTimeout(() => {
                this.ai.makeMove();
            }, this.aiDelay);
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

