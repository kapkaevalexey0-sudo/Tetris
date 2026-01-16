class TetrisGame {
    constructor() {
        this.canvas = document.getElementById('tetris');
        this.ctx = this.canvas.getContext('2d');
        this.nextCanvas = document.getElementById('nextPiece');
        this.nextCtx = this.nextCanvas.getContext('2d');
        
        this.BLOCK_SIZE = 30;
        this.BOARD_WIDTH = 10;
        this.BOARD_HEIGHT = 20;
        
        this.board = Array.from({length: this.BOARD_HEIGHT}, () => 
            Array(this.BOARD_WIDTH).fill(0)
        );
        
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.gameOver = false;
        this.isPaused = false;
        
        this.tetrominoes = null;
        this.currentPiece = null;
        this.nextPiece = null;
        this.currentX = 0;
        this.currentY = 0;
        
        this.dropInterval = 1000;
        this.dropStart = Date.now();
        
        this.init();
    }

    async init() {
        await this.loadTetrominoes();
        this.createNewPiece();
        this.updateNextPieceDisplay();
        
        // Загрузка рекордов
        this.loadHighScores();
        
        // Обработчики событий
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetGame());
        document.getElementById('saveScoreBtn').addEventListener('click', () => this.saveScore());
        document.getElementById('playAgainBtn').addEventListener('click', () => this.resetGame());
        
        // Запуск игрового цикла
        requestAnimationFrame(() => this.gameLoop());
    }

    async loadTetrominoes() {
        try {
            const response = await fetch('/api/tetrominoes');
            this.tetrominoes = await response.json();
        } catch (error) {
            console.error('Ошибка загрузки тетромино:', error);
        }
    }

    loadHighScores() {
        fetch('/api/scores')
            .then(response => response.json())
            .then(scores => this.displayHighScores(scores))
            .catch(error => console.error('Ошибка загрузки рекордов:', error));
    }

    displayHighScores(scores) {
        const scoresList = document.getElementById('highScores');
        if (scores.length === 0) {
            scoresList.innerHTML = '<div class="score-item">Пока нет рекордов</div>';
            return;
        }
        
        scoresList.innerHTML = scores.map((score, index) => `
            <div class="score-item">
                <span class="score-rank">${index + 1}.</span>
                <span class="score-name">${score.name}</span>
                <span class="score-value">${score.score}</span>
            </div>
        `).join('');
    }

    getRandomTetromino() {
        const keys = Object.keys(this.tetrominoes);
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        return {
            shape: this.tetrominoes[randomKey].shape,
            color: this.tetrominoes[randomKey].color
        };
    }

    createNewPiece() {
        if (this.nextPiece) {
            this.currentPiece = this.nextPiece;
        } else {
            this.currentPiece = this.getRandomTetromino();
        }
        
        this.nextPiece = this.getRandomTetromino();
        this.currentX = Math.floor(this.BOARD_WIDTH / 2) - 
                       Math.floor(this.currentPiece.shape[0].length / 2);
        this.currentY = 0;
        
        if (this.checkCollision()) {
            this.gameOver = true;
            this.showGameOver();
        }
        
        this.updateNextPieceDisplay();
    }

    updateNextPieceDisplay() {
        if (!this.nextPiece || !this.nextCtx) return;
        
        this.nextCtx.clearRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        
        const blockSize = 20;
        const offsetX = (this.nextCanvas.width - this.nextPiece.shape[0].length * blockSize) / 2;
        const offsetY = (this.nextCanvas.height - this.nextPiece.shape.length * blockSize) / 2;
        
        this.nextCtx.fillStyle = this.nextPiece.color;
        this.nextPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    this.nextCtx.fillRect(
                        offsetX + x * blockSize,
                        offsetY + y * blockSize,
                        blockSize - 1,
                        blockSize - 1
                    );
                    
                    this.nextCtx.strokeStyle = '#fff';
                    this.nextCtx.lineWidth = 1;
                    this.nextCtx.strokeRect(
                        offsetX + x * blockSize,
                        offsetY + y * blockSize,
                        blockSize - 1,
                        blockSize - 1
                    );
                }
            });
        });
    }

    drawBoard() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Рисуем сетку
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 0.5;
        
        for (let x = 0; x <= this.BOARD_WIDTH; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * this.BLOCK_SIZE, 0);
            this.ctx.lineTo(x * this.BLOCK_SIZE, this.BOARD_HEIGHT * this.BLOCK_SIZE);
            this.ctx.stroke();
        }
        
        for (let y = 0; y <= this.BOARD_HEIGHT; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * this.BLOCK_SIZE);
            this.ctx.lineTo(this.BOARD_WIDTH * this.BLOCK_SIZE, y * this.BLOCK_SIZE);
            this.ctx.stroke();
        }
        
        // Рисуем установленные блоки
        this.board.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    this.ctx.fillStyle = value;
                    this.ctx.fillRect(
                        x * this.BLOCK_SIZE,
                        y * this.BLOCK_SIZE,
                        this.BLOCK_SIZE - 1,
                        this.BLOCK_SIZE - 1
                    );
                    
                    this.ctx.strokeStyle = '#fff';
                    this.ctx.lineWidth = 1;
                    this.ctx.strokeRect(
                        x * this.BLOCK_SIZE,
                        y * this.BLOCK_SIZE,
                        this.BLOCK_SIZE - 1,
                        this.BLOCK_SIZE - 1
                    );
                }
            });
        });
        
        // Рисуем текущую фигуру
        if (this.currentPiece && !this.gameOver) {
            this.ctx.fillStyle = this.currentPiece.color;
            this.currentPiece.shape.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value) {
                        this.ctx.fillRect(
                            (this.currentX + x) * this.BLOCK_SIZE,
                            (this.currentY + y) * this.BLOCK_SIZE,
                            this.BLOCK_SIZE - 1,
                            this.BLOCK_SIZE - 1
                        );
                        
                        this.ctx.strokeStyle = '#fff';
                        this.ctx.lineWidth = 1;
                        this.ctx.strokeRect(
                            (this.currentX + x) * this.BLOCK_SIZE,
                            (this.currentY + y) * this.BLOCK_SIZE,
                            this.BLOCK_SIZE - 1,
                            this.BLOCK_SIZE - 1
                        );
                    }
                });
            });
        }
    }

    checkCollision(offsetX = 0, offsetY = 0, piece = this.currentPiece) {
        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (piece.shape[y][x]) {
                    const newX = this.currentX + x + offsetX;
                    const newY = this.currentY + y + offsetY;
                    
                    if (newX < 0 || newX >= this.BOARD_WIDTH || 
                        newY >= this.BOARD_HEIGHT ||
                        (newY >= 0 && this.board[newY][newX])) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    rotatePiece() {
        if (!this.currentPiece) return;
        
        const originalShape = this.currentPiece.shape;
        const rows = originalShape.length;
        const cols = originalShape[0].length;
        
        // Создаем повернутую матрицу
        const rotated = Array.from({length: cols}, () => Array(rows).fill(0));
        
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                rotated[x][rows - 1 - y] = originalShape[y][x];
            }
        }
        
        const rotatedPiece = {
            shape: rotated,
            color: this.currentPiece.color
        };
        
        // Проверяем коллизию после поворота
        if (!this.checkCollision(0, 0, rotatedPiece)) {
            this.currentPiece.shape = rotated;
        }
    }

    movePiece(dx, dy) {
        if (!this.checkCollision(dx, dy)) {
            this.currentX += dx;
            this.currentY += dy;
            return true;
        }
        return false;
    }

    lockPiece() {
        this.currentPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    const boardY = this.currentY + y;
                    if (boardY >= 0) {
                        this.board[boardY][this.currentX + x] = this.currentPiece.color;
                    }
                }
            });
        });
    }

    clearLines() {
        let linesCleared = 0;
        
        for (let y = this.BOARD_HEIGHT - 1; y >= 0; y--) {
            if (this.board[y].every(cell => cell !== 0)) {
                this.board.splice(y, 1);
                this.board.unshift(Array(this.BOARD_WIDTH).fill(0));
                linesCleared++;
                y++; // Проверяем ту же строку снова после сдвига
            }
        }
        
        if (linesCleared > 0) {
            // Обновляем счет
            const points = [0, 40, 100, 300, 1200];
            this.score += points[linesCleared] * this.level;
            this.lines += linesCleared;
            
            // Обновляем уровень каждые 10 линий
            this.level = Math.floor(this.lines / 10) + 1;
            
            // Увеличиваем скорость
            this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 100);
            
            this.updateUI();
        }
    }

    dropPiece() {
        if (!this.movePiece(0, 1)) {
            this.lockPiece();
            this.clearLines();
            this.createNewPiece();
        }
    }

    hardDrop() {
        while (this.movePiece(0, 1)) {}
        this.lockPiece();
        this.clearLines();
        this.createNewPiece();
    }

    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        document.getElementById('lines').textContent = this.lines;
    }

    handleKeyPress(e) {
        if (this.gameOver || this.isPaused) return;
        
        switch(e.key) {
            case 'ArrowLeft':
                this.movePiece(-1, 0);
                break;
            case 'ArrowRight':
                this.movePiece(1, 0);
                break;
            case 'ArrowDown':
                this.movePiece(0, 1);
                break;
            case 'ArrowUp':
                this.rotatePiece();
                break;
            case ' ':
                this.hardDrop();
                break;
            case 'p':
            case 'P':
                this.togglePause();
                break;
        }
    }

    startGame() {
        if (this.gameOver) {
            this.resetGame();
        }
        this.isPaused = false;
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        const pauseBtn = document.getElementById('pauseBtn');
        const icon = pauseBtn.querySelector('i');
        
        if (this.isPaused) {
            icon.className = 'fas fa-play';
            pauseBtn.innerHTML = '<i class="fas fa-play"></i> Продолжить';
        } else {
            icon.className = 'fas fa-pause';
            pauseBtn.innerHTML = '<i class="fas fa-pause"></i> Пауза';
        }
    }

    resetGame() {
        this.board = Array.from({length: this.BOARD_HEIGHT}, () => 
            Array(this.BOARD_WIDTH).fill(0)
        );
        
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.gameOver = false;
        this.isPaused = false;
        
        this.dropInterval = 1000;
        this.dropStart = Date.now();
        
        this.createNewPiece();
        this.updateUI();
        this.hideGameOver();
    }

    showGameOver() {
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('gameOverModal').style.display = 'flex';
    }

    hideGameOver() {
        document.getElementById('gameOverModal').style.display = 'none';
        document.getElementById('playerName').value = '';
    }

    async saveScore() {
        const name = document.getElementById('playerName').value.trim() || 'Anonymous';
        
        const scoreData = {
            name: name,
            score: this.score,
            level: this.level,
            lines: this.lines
        };
        
        try {
            const response = await fetch('/api/scores', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(scoreData)
            });
            
            const result = await response.json();
            if (result.success) {
                alert('Результат сохранен!');
                this.loadHighScores();
                this.hideGameOver();
                this.resetGame();
            } else {
                alert('Ошибка сохранения результата: ' + result.error);
            }
        } catch (error) {
            alert('Ошибка сети при сохранении результата');
        }
    }

    gameLoop() {
        const now = Date.now();
        const delta = now - this.dropStart;
        
        if (!this.isPaused && !this.gameOver) {
            if (delta > this.dropInterval) {
                this.dropPiece();
                this.dropStart = now;
            }
        }
        
        this.drawBoard();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Инициализация игры при загрузке страницы
window.addEventListener('DOMContentLoaded', () => {
    new TetrisGame();
});
