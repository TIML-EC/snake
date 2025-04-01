class Snake {
    constructor() {
        this.chineseChars = "✧以客為尊✧創新與科技✧卓越服務✧團隊精神✧精益求精";
        this.currentCharIndex = 0;
        this.reset();
    }

    reset() {
        this.body = [
            { x: 5, y: 5 },
            { x: 4, y: 5 },
            { x: 3, y: 5 }
        ];
        this.direction = 'right';
        this.nextDirection = 'right';
    }

    move(food) {
        const head = { x: this.body[0].x, y: this.body[0].y };

        this.direction = this.nextDirection;

        switch (this.direction) {
            case 'up': head.y--; break;
            case 'down': head.y++; break;
            case 'left': head.x--; break;
            case 'right': head.x++; break;
        }

        this.body.unshift(head);

        if (head.x === food.position.x && head.y === food.position.y) {
            this.currentCharIndex = (this.currentCharIndex + 1) % this.chineseChars.length;
            return true;
        } else {
            this.body.pop();
            return false;
        }
    }

    checkCollision(gridSize) {
        const head = this.body[0];
        if (head.x < 0 || head.x >= gridSize || head.y < 0 || head.y >= gridSize) {
            return true;
        }

        for (let i = 1; i < this.body.length; i++) {
            if (head.x === this.body[i].x && head.y === this.body[i].y) {
                return true;
            }
        }
        return false;
    }
}

class Food {
    constructor() {
        this.position = { x: 0, y: 0 };
    }

    generate(gridSize, snake) {
        do {
            this.position.x = Math.floor(Math.random() * gridSize);
            this.position.y = Math.floor(Math.random() * gridSize);
        } while (this.checkOverlap(snake));
    }

    checkOverlap(snake) {
        return snake.body.some(segment => 
            segment.x === this.position.x && segment.y === this.position.y
        );
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gridSize = 13;
        this.tileSize = this.canvas.width / this.gridSize;
        this.snake = new Snake();
        this.food = new Food();
        this.score = 0;
        this.gameLoop = null;
         this.gamepadLoop = null;
        this.speed = 200;
        this.snakeHead = new Image();
        this.snakeHead.src = 'logo.png';
        this.snakeHead.onerror = () => {
            this.snakeHead = null;
        };
        this.gamepad = null;
        this.vibrationActuator = null;

        document.addEventListener('keydown', this.handleKeyPress.bind(this));
        window.addEventListener('gamepadconnected', this.handleGamepadConnected.bind(this));
        window.addEventListener('gamepaddisconnected', this.handleGamepadDisconnected.bind(this));
        
        // 開始持續監聽手柄狀態
        this.startGamepadLoop();

        // 添加狀態面板切換功能
        const toggleButton = document.getElementById('toggleButton');
        const statusPanel = document.getElementById('statusPanel');
        toggleButton.addEventListener('click', () => {
            statusPanel.classList.toggle('open');
        });

    }

    handleKeyPress(event) {
        const key = event.key;
        const direction = this.snake.direction;

        switch (key) {
            case 'ArrowUp':
                if (direction !== 'down') this.snake.nextDirection = 'up';
                break;
            case 'ArrowDown':
                if (direction !== 'up') this.snake.nextDirection = 'down';
                break;
            case 'ArrowLeft':
                if (direction !== 'right') this.snake.nextDirection = 'left';
                break;
            case 'ArrowRight':
                if (direction !== 'left') this.snake.nextDirection = 'right';
                break;
        }
    }

    start() {
        this.snake.reset();
        this.food.generate(this.gridSize, this.snake);
        this.score = 0;
        document.getElementById('score').textContent = this.score;
        document.getElementById('startScreen').style.display = 'none';
        document.getElementById('gameOverScreen').style.display = 'none';
        this.gameLoop = setInterval(() => this.update(), this.speed);
    }

    startGamepadLoop() {
        if (this.gamepadLoop) return;
        this.gamepadLoop = setInterval(() => {
            this.handleGamepadInput();
        }, 50); // 每50毫秒更新一次手柄狀態
    }

    handleGamepadConnected(event) {
        console.log('✅ 🎮 手柄已連接:', event.gamepad);
        this.gamepad = event.gamepad;
        this.vibrationActuator = event.gamepad.vibrationActuator;
        document.getElementById('gamepadStatus').style.display = 'block';
        this.startGamepadLoop();
    }

    handleGamepadDisconnected(event) {
        console.log('❌ 🎮 手柄已斷開連接');
        this.gamepad = null;
        this.vibrationActuator = null;
        document.getElementById('gamepadStatus').style.display = 'none';
        document.getElementById('leftStick').textContent = '未使用';
        document.getElementById('dpad').textContent = '未使用';
        document.getElementById('buttons').textContent = '未使用';
        document.getElementById('vibration').textContent = '未使用';
        if (this.gamepadLoop) {
            clearInterval(this.gamepadLoop);
            this.gamepadLoop = null;
        }
    }

    handleGamepadInput() {
        if (!this.gamepad) return;
        
        // 獲取最新的手柄狀態
        const gamepads = navigator.getGamepads();
        const gamepad = gamepads[this.gamepad.index];
        if (!gamepad) return;

        // 方向鍵或左搖桿控制
        const direction = this.snake.direction;
        const axes = gamepad.axes;
        const buttons = gamepad.buttons;

        // 更新左搖桿狀態
        const leftStickX = Math.round(axes[0] * 100);
        const leftStickY = Math.round(axes[1] * 100);
        document.getElementById('leftStick').textContent = `X: ${leftStickX}%, Y: ${leftStickY}%`;

        // 更新方向鍵狀態
        const dpadStatus = [];
        if (buttons[12].pressed) dpadStatus.push('上');
        if (buttons[13].pressed) dpadStatus.push('下');
        if (buttons[14].pressed) dpadStatus.push('左');
        if (buttons[15].pressed) dpadStatus.push('右');
        document.getElementById('dpad').textContent = dpadStatus.length > 0 ? dpadStatus.join('+') : '未按下';

        // 更新按鈕狀態
        const pressedButtons = [];
        buttons.forEach((button, index) => {
            if (button.pressed) pressedButtons.push(`按鈕${index}`);
        });
        document.getElementById('buttons').textContent = pressedButtons.length > 0 ? pressedButtons.join(', ') : '未按下';

        // 左搖桿控制
        if (axes[0] < -0.5 && direction !== 'right') this.snake.nextDirection = 'left';
        if (axes[0] > 0.5 && direction !== 'left') this.snake.nextDirection = 'right';
        if (axes[1] < -0.5 && direction !== 'down') this.snake.nextDirection = 'up';
        if (axes[1] > 0.5 && direction !== 'up') this.snake.nextDirection = 'down';

        // 方向鍵控制
        if (buttons[14].pressed && direction !== 'right') this.snake.nextDirection = 'left';
        if (buttons[15].pressed && direction !== 'left') this.snake.nextDirection = 'right';
        if (buttons[12].pressed && direction !== 'down') this.snake.nextDirection = 'up';
        if (buttons[13].pressed && direction !== 'up') this.snake.nextDirection = 'down';
    }

    update() {
        
        if (this.snake.move(this.food)) {
            this.score += 10;
            document.getElementById('score').textContent = this.score;
            this.food.generate(this.gridSize, this.snake);
            if (this.vibrationActuator) {
                this.vibrationActuator.playEffect('dual-rumble', {
                    startDelay: 0,
                    duration: 100,
                    weakMagnitude: 0.5,
                    strongMagnitude: 0.5
                });
                document.getElementById('vibration').textContent = '吃到食物震動';            
            }
        }

        if (this.snake.checkCollision(this.gridSize)) {
            if (this.vibrationActuator) {
                this.vibrationActuator.playEffect('dual-rumble', {
                    startDelay: 0,
                    duration: 1500,
                    weakMagnitude: 1.0,
                    strongMagnitude: 1.0
                });
                document.getElementById('vibration').textContent = '遊戲結束震動';
            }
            this.gameOver();
            return;
        }

        this.draw();
    }

    draw() {
        // 清空畫布，使用深色背景
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 繪製蛇
        this.ctx.fillStyle = '#00ffff';
        this.snake.body.forEach((segment, index) => {
            if (index === 0) {
                // 繪製蛇頭
                let rotation = 0;
                switch(this.snake.direction) {
                    case 'up': rotation = -Math.PI/2; break;
                    case 'down': rotation = Math.PI/2; break;
                    case 'left': rotation = Math.PI; break;
                    case 'right': rotation = 0; break;
                }
                if (this.snakeHead) {
                    this.ctx.drawImage(this.snakeHead, segment.x * this.tileSize, segment.y * this.tileSize, this.tileSize, this.tileSize);
                } else {
                    this.ctx.fillStyle = '#00ffff';
                    this.ctx.fillRect(
                        segment.x * this.tileSize,
                        segment.y * this.tileSize,
                        this.tileSize - 1,
                        this.tileSize - 1
                    );
                }
            } else {
                // 繪製蛇身文字
                this.ctx.fillStyle = '#00ffff';
                this.ctx.fillRect(
                    segment.x * this.tileSize,
                    segment.y * this.tileSize,
                    this.tileSize - 1,
                    this.tileSize - 1
                );
                
                // 只在第四格開始的蛇身上顯示文字
                if (index >= 3) {
                    const charIndex = (index - 3) % this.snake.chineseChars.length;
                    const char = this.snake.chineseChars[charIndex];
                    
                    this.ctx.fillStyle = '#1a1a2e';
                    this.ctx.font = `${this.tileSize * 0.8}px Arial`;
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    this.ctx.fillText(
                        char,
                        segment.x * this.tileSize + this.tileSize/2,
                        segment.y * this.tileSize + this.tileSize/2
                    );
                }
            }
        });

        // 繪製食物
        this.ctx.fillStyle = '#ff69b4';
        this.ctx.fillRect(
            this.food.position.x * this.tileSize,
            this.food.position.y * this.tileSize,
            this.tileSize - 1,
            this.tileSize - 1
        );
    }

    gameOver() {
        clearInterval(this.gameLoop);
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('gameOverScreen').style.display = 'block';
    }
}

let game;

window.onload = function() {
    game = new Game();
    // 初始化時就開始檢測手柄狀態
    const gamepads = navigator.getGamepads();
    if (gamepads) {
        for (const gamepad of gamepads) {
            if (gamepad) {
                game.handleGamepadConnected({ gamepad: gamepad });
                break;
            }
        }
    }
};

function startGame() {
    if (game) {
        game.start();
    }
}

function restartGame() {
    if (game) {
        game.start();
    }
}