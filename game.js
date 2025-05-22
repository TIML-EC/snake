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
        this.spawnTime = Date.now();
        this.baseColor = '#ff69b4';
        this.orangeColor = '#ffa500';
        this.greenColor = '#90ee90';
    }

    generate(gridSize, snake) {
        do {
            this.position.x = Math.floor(Math.random() * gridSize);
            this.position.y = Math.floor(Math.random() * gridSize);
        } while (this.checkOverlap(snake));
        this.spawnTime = Date.now();
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
        this.baseSpeed = 200;
        this.speed = this.baseSpeed;
        this.snakeHead = new Image();
        this.snakeHead.src = 'logo.png';
        this.snakeHead.onerror = () => {
            this.snakeHead = null;
        };
        this.gamepad = null;
        this.vibrationActuator = null;
        this.button8PrevState = false;
        this.foodHistory = [];
        this.missionStatementElement = document.getElementById('missionStatement');

        // 初始化音效
        this.bgm = new Audio('https://raw.githubusercontent.com/TIML-EC/snake/main/bgm1.wav');
        this.bgm.loop = true;
        this.eatSound = new Audio('https://raw.githubusercontent.com/TIML-EC/snake/main/eat.wav');
        this.endSound = new Audio('https://raw.githubusercontent.com/TIML-EC/snake/main/end.wav');

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
            case ' ':
                if (this.gameLoop === null) {
                    this.start();
                }
                break;
        }
    }

    start() {
        this.snake.reset();
        this.food.generate(this.gridSize, this.snake);
        this.score = 0;
        this.speed = this.baseSpeed;
        this.foodHistory = [];
        document.getElementById('score').textContent = this.score;
        document.getElementById('currentSpeed').textContent = '1';
        document.getElementById('startScreen').style.display = 'none';
        document.getElementById('gameOverScreen').style.display = 'none';
        document.getElementById('foodHistoryList').innerHTML = '';
        // 初始化文字顏色
        this.updateMissionStatementColor();
        this.gameLoop = setInterval(() => this.update(), this.speed);
        // 開始播放背景音樂
        this.bgm.play();
    }

    startGamepadLoop() {
        if (this.gamepadLoop) return;
        this.gamepadLoop = setInterval(() => {
            this.handleGamepadInput();
        }, 50); // 每50毫秒更新一次手柄状态
    }

    handleGamepadConnected(event) {
        console.log('✅ 🎮 手柄已连接:', event.gamepad);
        this.gamepad = event.gamepad;
        this.vibrationActuator = event.gamepad.vibrationActuator;
        document.getElementById('gamepadStatus').style.display = 'block';
        this.startGamepadLoop();
    }

    handleGamepadDisconnected(event) {
        console.log('❌ 🎮 手柄已断开连接');
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
        
        // 获取最新的手柄状态
        const gamepads = navigator.getGamepads();
        const gamepad = gamepads[this.gamepad.index];
        if (!gamepad) return;

        // 方向键或左摇杆控制
        const direction = this.snake.direction;
        const axes = gamepad.axes;
        const buttons = gamepad.buttons;

        // 更新左摇杆状态
        const leftStickX = Math.round(axes[0] * 100);
        const leftStickY = Math.round(axes[1] * 100);
        document.getElementById('leftStick').textContent = `X: ${leftStickX}%, Y: ${leftStickY}%`;

        // 更新方向键状态
        const dpadStatus = [];
        if (buttons[12].pressed) dpadStatus.push('上');
        if (buttons[13].pressed) dpadStatus.push('下');
        if (buttons[14].pressed) dpadStatus.push('左');
        if (buttons[15].pressed) dpadStatus.push('右');
        document.getElementById('dpad').textContent = dpadStatus.length > 0 ? dpadStatus.join('+') : '未按下';

        // 更新按钮状态
        const pressedButtons = [];
        buttons.forEach((button, index) => {
            if (button.pressed) pressedButtons.push(`按钮${index}`);
        });
        document.getElementById('buttons').textContent = pressedButtons.length > 0 ? pressedButtons.join(', ') : '未按下';

        // 检测按钮8切换状态面板
        if (buttons[8].pressed && !this.button8PrevState) {
            document.getElementById('statusPanel').classList.toggle('open');
        }
        this.button8PrevState = buttons[8].pressed;

        // 检测按钮9（Start按钮）
        if (buttons[9].pressed) {
            if (this.gameLoop === null) {
                this.start();
            }
        }

        // 左摇杆控制
        if (axes[0] < -0.5 && direction !== 'right') this.snake.nextDirection = 'left';
        if (axes[0] > 0.5 && direction !== 'left') this.snake.nextDirection = 'right';
        if (axes[1] < -0.5 && direction !== 'down') this.snake.nextDirection = 'up';
        if (axes[1] > 0.5 && direction !== 'up') this.snake.nextDirection = 'down';

        // 方向键控制
        if (buttons[14].pressed && direction !== 'right') this.snake.nextDirection = 'left';
        if (buttons[15].pressed && direction !== 'left') this.snake.nextDirection = 'right';
        if (buttons[12].pressed && direction !== 'down') this.snake.nextDirection = 'up';
        if (buttons[13].pressed && direction !== 'up') this.snake.nextDirection = 'down';
    }

    update() {
        
        if (this.snake.move(this.food)) {
            this.score += 10;
            document.getElementById('score').textContent = this.score;
            
            // 更新文字顏色
            this.updateMissionStatementColor();
            
            // 根据食物存在时间调整速度
            const foodAge = (Date.now() - this.food.spawnTime) / 1000;
            let level = 1;
            if (foodAge <= 1.5) {
                // 1.5秒內吃到食物（粉色），減速
                this.speed = Math.min(this.baseSpeed + 50, this.speed + 50);
                if (this.speed > this.baseSpeed) {
                    this.speed = this.baseSpeed;
                }
            } else if (foodAge > 3) {
                // 3秒後吃到食物（綠色），加速
                this.speed = Math.max(50, this.speed - 50);
            }
            
            // 根據當前速度計算等級
            if (this.speed <= 50) level = 4;
            else if (this.speed <= 100) level = 3;
            else if (this.speed <= 150) level = 2;
            
            // 更新遊戲循環速度和顯示
            if (this.gameLoop) {
                clearInterval(this.gameLoop);
                this.gameLoop = setInterval(() => this.update(), this.speed);
                document.getElementById('currentSpeed').textContent = level;
                
                // 記錄食物顏色和速度
                let foodColor = '粉';
                if (foodAge > 3) {
                    foodColor = '綠';
                } else if (foodAge > 1.5) {
                    foodColor = '橙';
                }
                this.foodHistory.push({ color: foodColor, speed: level });
                
                // 更新食物歷史記錄顯示
                const historyList = document.getElementById('foodHistoryList');
                const historyItem = document.createElement('div');
                historyItem.style.padding = '5px';
                historyItem.style.borderBottom = '1px solid #00b4d8';
                historyItem.innerHTML = `<span style="color: ${foodColor === '粉' ? '#ff69b4' : foodColor === '橙' ? '#ffa500' : '#90ee90'}">${foodColor}</span> - 速度 ${level}`;
                historyList.appendChild(historyItem);
            }
            
            this.food.generate(this.gridSize, this.snake);
            // 播放吃食物音效
            this.eatSound.play();
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

    updateMissionStatementColor() {
        if (!this.missionStatementElement) return;

        const totalChars = this.snake.chineseChars.length;
        const goldCharsCount = Math.min(Math.floor(this.score / 10), totalChars);
        let newHTML = '';

        for (let i = 0; i < totalChars; i++) {
            const char = this.snake.chineseChars[i];
            if (i < goldCharsCount) {
                newHTML += `<span style="color: gold;">${char}</span>`;
            } else {
                newHTML += char;
            }
        }
        this.missionStatementElement.innerHTML = newHTML;
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
        const foodAge = (Date.now() - this.food.spawnTime) / 1000; // 轉換為秒
        if (foodAge <= 1.5) {
            this.ctx.fillStyle = this.food.baseColor;
        } else if (foodAge <= 3) {
            this.ctx.fillStyle = this.food.orangeColor;
        } else {
            this.ctx.fillStyle = this.food.greenColor;
        }
        this.ctx.fillRect(
            this.food.position.x * this.tileSize,
            this.food.position.y * this.tileSize,
            this.tileSize - 1,
            this.tileSize - 1
        );
    }

    gameOver() {
        clearInterval(this.gameLoop);
        this.gameLoop = null;
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('gameOverScreen').style.display = 'block';
        // 停止背景音樂並播放結束音效
        this.bgm.pause();
        this.bgm.currentTime = 0;
        this.endSound.play();
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