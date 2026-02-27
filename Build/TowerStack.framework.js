/**
 * 堆塔游戏 - Unity风格导出版本
 * 游戏框架核心代码
 */

// 游戏引擎类
class GameEngine {
    constructor(config) {
        this.canvas = document.getElementById(config.canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.width = config.width || window.innerWidth;
        this.height = config.height || window.innerHeight;
        
        // 设置画布尺寸
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        
        // 游戏状态
        this.gameState = 'loading'; // 加载中, 准备, 游戏中, 暂停, 游戏结束
        this.score = 0;
        this.lives = 3;
        this.perfectCount = 0;
        
        // 资源管理
        this.assets = {
            images: {},
            sounds: {}
        };
        this.assetsToLoad = 0;
        this.assetsLoaded = 0;
        
        // 游戏对象
        this.blocks = [];
        this.currentBlock = null;
        this.hook = null;
        
        // 物理参数
        this.blockWidth = this.width * 0.15;
        this.blockHeight = this.blockWidth * 0.46;
        this.ropeLength = this.height * 0.3;  // 缩短绳子长度以保持堆栈较高
        this.swingAngle = 0;
        this.swingSpeed = 0.04; // 稍微增加速度以提高难度
        this.dropSpeed = 10; // 稍微增加下落速度
        
        // 相机参数
        this.cameraY = 0;
        
        // 动画参数
        this.lastTime = 0;
        this.animationId = null;
        
        // 回调函数
        this.onScoreChange = config.onScoreChange || null;
        this.onLivesChange = config.onLivesChange || null;
        this.onGameOver = config.onGameOver || null;
        
        // 绑定事件
        this.bindEvents();
    }
    
    // 加载资源
    loadAssets(assetList, onProgress, onComplete) {
        this.assetsToLoad = assetList.length;
        this.assetsLoaded = 0;
        
        assetList.forEach(asset => {
            if (asset.type === 'image') {
                const img = new Image();
                img.onload = () => {
                    this.assets.images[asset.name] = img;
                    this.assetsLoaded++;
                    if (onProgress) {
                        onProgress(this.assetsLoaded, this.assetsToLoad);
                    }
                    if (this.assetsLoaded === this.assetsToLoad && onComplete) {
                        onComplete();
                    }
                };
                img.onerror = () => {
                    console.error('加载图片失败:', asset.path);
                    this.assetsLoaded++;
                    if (this.assetsLoaded === this.assetsToLoad && onComplete) {
                        onComplete();
                    }
                };
                img.src = asset.path;
            }
        });
    }
    
    // 初始化游戏
    init() {
        this.gameState = 'ready';
        this.score = 0;
        this.lives = 3;
        this.perfectCount = 0;
        this.blocks = [];
        this.cameraY = 0;
        this.swingAngle = 0;
        
        // 触发初始界面更新
        if (this.onScoreChange) this.onScoreChange(this.score);
        if (this.onLivesChange) this.onLivesChange(this.lives);
        
        // 创建钩子 - 保持在顶部
        this.hook = {
            x: this.width / 2,
            y: this.height * 0.15  // 15%位置，让钩子更高一点
        };
        
        // 创建基础方块（底座）
        const fixedTopY = this.hook.y + this.ropeLength;
        const gap = this.blockHeight * 1.6;
        const initialBaseY = fixedTopY + gap + this.blockHeight; 
        
        const baseBlock = {
            x: this.width / 2 - this.blockWidth / 2,
            y: initialBaseY,
            width: this.blockWidth,
            height: this.blockHeight,
            state: 'landed'
        };
        this.blocks.push(baseBlock);
        
        // 初始化相机位置
        this.cameraY = (fixedTopY + gap) - initialBaseY;
        
        // 创建第一个方块
        this.createNewBlock();
    }
    
        // 创建新方块
    createNewBlock() {
        const fixedSpawnY = this.hook.y + this.ropeLength;
        const spawnY = fixedSpawnY - this.cameraY;

        this.currentBlock = {
            x: this.width / 2 - this.blockWidth / 2,
            y: spawnY,
            width: this.blockWidth,
            height: this.blockHeight,
            // 初始角度
            angle: 0,
            state: 'swinging'
        };
    }
    
    // 开始游戏
    start() {
        if (this.gameState === 'ready') {
            this.gameState = 'playing';
            this.lastTime = performance.now();
            this.animate();
        }
    }
    
    // 暂停游戏
    pause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
            }
        }
    }
    
    // 恢复游戏
    resume() {
        if (this.gameState === 'paused') {
            this.gameState = 'playing';
            this.lastTime = performance.now();
            this.animate();
        }
    }
    
    // 绑定事件
    bindEvents() {
        // 鼠标点击
        this.canvas.addEventListener('click', () => {
            this.handleDrop();
        });
        
        // 触摸事件
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleDrop();
        });
        
        // 空格键
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && this.gameState === 'playing') {
                e.preventDefault();
                this.handleDrop();
            }
        });
    }
    
    // 处理放下方块
    handleDrop() {
        if (this.gameState !== 'playing') return;
        if (!this.currentBlock || this.currentBlock.state !== 'swinging') return;
        
        this.currentBlock.state = 'dropping';
    }
    
    // 更新游戏逻辑
    update(deltaTime) {
        if (this.gameState !== 'playing') return;
        
        if (this.currentBlock) {
            if (this.currentBlock.state === 'swinging') {
                // 摆动逻辑
                this.swingAngle += this.swingSpeed;
                const maxAngle = Math.PI / 5; // 36度
                const angle = Math.sin(this.swingAngle) * maxAngle;
                
                // 计算方块位置（绕钩子摆动）
                const hookX = this.hook.x;
                const hookY = this.hook.y;
                
                this.currentBlock.x = hookX + Math.sin(angle) * this.ropeLength - this.blockWidth / 2;
                this.currentBlock.y = (hookY + Math.cos(angle) * this.ropeLength) - this.cameraY;
                this.currentBlock.angle = angle;
                
            } else if (this.currentBlock.state === 'dropping') {
                // 下落逻辑
                this.currentBlock.y += this.dropSpeed;
                
                // 检测碰撞 - 找到最顶部的已放置方块
                if (this.blocks.length > 0) {
                    const topBlock = this.blocks[this.blocks.length - 1];
                    if (this.currentBlock.y + this.currentBlock.height >= topBlock.y) {
                        // 精确对齐到顶部方块上方
                        this.currentBlock.y = topBlock.y - this.currentBlock.height;
                        this.handleLanding();
                    }
                }
            }
        }
    }
    
    // 处理方块着陆
    handleLanding() {
        const lastBlock = this.blocks[this.blocks.length - 1];
        const currentCenterX = this.currentBlock.x + this.blockWidth / 2;
        const lastCenterX = lastBlock.x + this.blockWidth / 2;
        const offset = Math.abs(currentCenterX - lastCenterX);
        
        // 判断是否成功着陆
        if (offset < this.blockWidth * 0.45) {
            // 成功着陆
            this.currentBlock.state = 'landed';
            this.currentBlock.angle = 0;
            
            // 新方块直接放在最后一个方块的上方
            this.currentBlock.y = lastBlock.y - this.blockHeight;
            
            // 将新方块加入堆栈
            this.blocks.push(this.currentBlock);
            
            // 移动相机向上，保持顶部方块在固定位置
            const fixedTopY = this.hook.y + this.ropeLength;
            const gap = this.blockHeight * 1.6;
            
            this.cameraY = (fixedTopY + gap) - this.currentBlock.y;
            
            // 判断是否完美
            const isPerfect = offset < this.blockWidth * 0.15;
            if (isPerfect) {
                this.perfectCount++;
                this.addScore(50 + this.perfectCount * 25);
            } else {
                this.perfectCount = 0;
                this.addScore(25);
            }
            
            // 创建新方块
            this.currentBlock = null;
            setTimeout(() => {
                this.createNewBlock();
            }, 300);
            
        } else {
            // 失败
            this.loseLife();
        }
    }
    
    // 增加分数
    addScore(points) {
        this.score += points;
        if (this.onScoreChange) {
            this.onScoreChange(this.score);
        }
    }
    
    // 失去生命
    loseLife() {
        this.lives--;
        this.perfectCount = 0;
        this.currentBlock = null;
        
        if (this.onLivesChange) {
            this.onLivesChange(this.lives);
        }
        
        if (this.lives <= 0) {
            this.gameOver();
        } else {
            setTimeout(() => {
                this.createNewBlock();
            }, 500);
        }
    }
    
    // 游戏结束
    gameOver() {
        this.gameState = 'gameover';
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.onGameOver) {
            this.onGameOver(this.score);
        }
    }
    
    // 渲染游戏
    render() {
        // 清空画布
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // 绘制背景
        const bgGradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        bgGradient.addColorStop(0, '#87CEEB');
        bgGradient.addColorStop(1, '#4A90E2');
        this.ctx.fillStyle = bgGradient;
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // 保存上下文
        this.ctx.save();
        this.ctx.translate(0, this.cameraY);
        
        // 绘制已放置的方块
        this.blocks.forEach((block, index) => {
            this.drawBlock(block, index + 1);
        });
        
        // 绘制当前方块
        if (this.currentBlock) {
            this.drawBlock(this.currentBlock, this.blocks.length + 1);
        }
        
        this.ctx.restore();
        
        // 在相机变换之外绘制绳子和钩子（固定在屏幕空间）
        if (this.currentBlock && this.currentBlock.state === 'swinging') {
            this.drawRope();
        }
        this.drawHook();
    }
    
    // 绘制方块
    drawBlock(block, number) {
        const img = this.assets.images['block'];
        if (img) {
            this.ctx.drawImage(img, block.x, block.y, block.width, block.height);
        } else {
            // 备用绘制
            this.ctx.fillStyle = '#FF6B6B';
            this.ctx.fillRect(block.x, block.y, block.width, block.height);
            this.ctx.strokeStyle = '#C92A2A';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(block.x, block.y, block.width, block.height);
        }
        
        // 绘制方块编号（用于调试）
        if (number) {
            this.ctx.fillStyle = '#2C5F2D';
            this.ctx.font = 'bold ' + (this.blockHeight * 0.4) + 'px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(number, block.x + block.width / 2, block.y + block.height / 2);
        }
    }
    
    // 绘制绳子
    drawRope() {
        if (!this.currentBlock) return;
        
        const hookX = this.hook.x;
        const hookY = this.hook.y;
        const blockCenterX = this.currentBlock.x + this.blockWidth / 2;
        const blockTopY = this.currentBlock.y + this.cameraY; 
        
        this.ctx.save();
        this.ctx.strokeStyle = '#8B4513';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(hookX, hookY);
        this.ctx.lineTo(blockCenterX, blockTopY);
        this.ctx.stroke();
        this.ctx.restore();
    }
    
    // 绘制钩子
    drawHook() {
        const img = this.assets.images['hook'];
        const size = 30;
        const x = this.hook.x;
        const y = this.hook.y;
        
        if (img) {
            this.ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
        } else {
            this.ctx.fillStyle = '#FFD700';
            this.ctx.beginPath();
            this.ctx.arc(x, y, 10, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    // 动画循环
    animate(currentTime = 0) {
        if (this.gameState !== 'playing') return;
        
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        this.update(deltaTime);
        this.render();
        
        this.animationId = requestAnimationFrame((time) => this.animate(time));
    }
}

// 导出到全局
window.TowerStackGame = GameEngine;
