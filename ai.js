class AI {
    constructor(game, side, difficulty = 3) {
        this.game = game;
        this.side = side;
        this.maxDepth = difficulty; // Difficulty = search depth (1-10)
        this.pieceValues = {
            [PIECE_TYPE.CHA]: 13,
            [PIECE_TYPE.PO]: 7,
            [PIECE_TYPE.MA]: 5,
            [PIECE_TYPE.SANG]: 3,
            [PIECE_TYPE.SA]: 3,
            [PIECE_TYPE.JOL]: 2,
            [PIECE_TYPE.KING]: 1000
        };
    }

    makeMove() {
        setTimeout(() => {
            const bestMove = this.minimaxRoot(this.maxDepth, true);
            if (bestMove) {
                // Clear selection before AI moves
                this.game.selectedPiece = null;
                this.game.clearHighlights();

                // Make the move
                this.game.movePiece(bestMove.piece, bestMove.move.x, bestMove.move.y);

                // Switch turn back to player
                this.game.turn = this.game.turn === SIDE.CHO ? SIDE.HAN : SIDE.CHO;
                this.game.turnElement.textContent = this.game.turn === SIDE.CHO ? 'Cho (Blue)' : 'Han (Red)';
                this.game.updateStatus(`${this.game.turn === SIDE.CHO ? 'Cho' : 'Han'}'s Turn`);

                // Check game over
                this.game.checkGameOver();

                // Re-enable board for player
                this.game.boardElement.style.pointerEvents = 'auto';
            } else {
                console.log("AI has no moves!");
                this.game.updateStatus("AI has no legal moves!");
            }
        }, 500);
    }

    evaluate(board) {
        let score = 0;
        for (let y = 0; y < BOARD_ROWS; y++) {
            for (let x = 0; x < BOARD_COLS; x++) {
                const piece = board[y][x];
                if (piece) {
                    const value = this.pieceValues[piece.type];
                    if (piece.side === this.side) {
                        score += value;
                    } else {
                        score -= value;
                    }

                    // Simple position bonuses
                    // Center control for Ma/Sang/Po?
                    // King safety?
                }
            }
        }
        return score;
    }

    minimaxRoot(depth, isMaximizing) {
        // Get all legal moves for AI
        const moves = this.getAllMoves(this.side);
        let bestMove = -Infinity;
        let bestMoveFound = null;

        // Sort moves to improve pruning? (Captures first)

        for (const move of moves) {
            // Simulate
            const { piece, targetX, targetY, captured } = this.simulateMove(move);

            const value = this.minimax(depth - 1, -Infinity, Infinity, !isMaximizing);

            // Undo
            this.undoMove(move, captured);

            if (value > bestMove) {
                bestMove = value;
                bestMoveFound = move;
            }
        }
        return bestMoveFound;
    }

    minimax(depth, alpha, beta, isMaximizing) {
        if (depth === 0) {
            return this.evaluate(this.game.board);
        }

        const currentSide = isMaximizing ? this.side : (this.side === SIDE.CHO ? SIDE.HAN : SIDE.CHO);
        const moves = this.getAllMoves(currentSide);

        if (moves.length === 0) {
            // Checkmate or Stalemate
            if (this.game.isCheck(currentSide)) {
                return isMaximizing ? -10000 : 10000; // Checkmate
            }
            return 0; // Stalemate
        }

        if (isMaximizing) {
            let bestMove = -Infinity;
            for (const move of moves) {
                const { captured } = this.simulateMove(move);
                bestMove = Math.max(bestMove, this.minimax(depth - 1, alpha, beta, false));
                this.undoMove(move, captured);
                alpha = Math.max(alpha, bestMove);
                if (beta <= alpha) {
                    return bestMove;
                }
            }
            return bestMove;
        } else {
            let bestMove = Infinity;
            for (const move of moves) {
                const { captured } = this.simulateMove(move);
                bestMove = Math.min(bestMove, this.minimax(depth - 1, alpha, beta, true));
                this.undoMove(move, captured);
                beta = Math.min(beta, bestMove);
                if (beta <= alpha) {
                    return bestMove;
                }
            }
            return bestMove;
        }
    }

    getAllMoves(side) {
        const moves = [];
        for (let y = 0; y < BOARD_ROWS; y++) {
            for (let x = 0; x < BOARD_COLS; x++) {
                const piece = this.game.board[y][x];
                if (piece && piece.side === side) {
                    const legalMoves = this.game.getLegalMoves(piece);
                    legalMoves.forEach(m => {
                        moves.push({
                            piece: piece,
                            move: m,
                            fromX: x,
                            fromY: y
                        });
                    });
                }
            }
        }
        return moves;
    }

    simulateMove(moveData) {
        const { piece, move, fromX, fromY } = moveData;
        const targetX = move.x;
        const targetY = move.y;
        const captured = this.game.board[targetY][targetX];

        // Execute move on board
        this.game.board[fromY][fromX] = null;
        this.game.board[targetY][targetX] = piece;
        piece.x = targetX;
        piece.y = targetY;

        return { piece, targetX, targetY, captured };
    }

    undoMove(moveData, captured) {
        const { piece, fromX, fromY } = moveData;
        const targetX = moveData.move.x;
        const targetY = moveData.move.y;

        // Restore
        this.game.board[fromY][fromX] = piece;
        this.game.board[targetY][targetX] = captured;
        piece.x = fromX;
        piece.y = fromY;
    }
}
