import { _decorator, Component, Vec3, Color, instantiate, Prefab, 
         input, Input, EventTouch, Label, view, tween, Node, UITransform } from 'cc';
import { Block } from './Block';
const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
    
    @property(Prefab)
    private blockPrefab: Prefab = null;
    
    @property(Label)
    private scoreLabel: Label = null;
    
    private _blocks: Block[] = [];
    private _currentBlock: Block = null;
    private _score: number = 0;
    private _isGameOver: boolean = false;
    
    private readonly START_WIDTH: number = 200;
    private readonly BLOCK_HEIGHT: number = 50;
    private readonly START_Y: number = -250;
    private readonly COLORS: Color[] = [
        new Color(231, 76, 60),
        new Color(46, 204, 113),
        new Color(52, 152, 219),
        new Color(241, 196, 15),
        new Color(155, 89, 182),
        new Color(26, 188, 156),
        new Color(230, 126, 34),
    ];
    
    onLoad() {
        input.on(Input.EventType.TOUCH_START, this.onScreenTouch, this);
        this.startGame();
    }
    
    onDestroy() {
        input.off(Input.EventType.TOUCH_START, this.onScreenTouch, this);
    }
    
    startGame() {
        this._blocks.forEach(b => b.node.destroy());
        this._blocks = [];
        this._score = 0;
        this._isGameOver = false;
        this.node.setPosition(Vec3.ZERO);
        
        this.updateScoreUI();
        
        const baseBlock = this.createBlock(0, this.START_Y, this.START_WIDTH, false);
        this._blocks.push(baseBlock);
        
        this.scheduleOnce(() => this.spawnNextBlock(), 0.5);
    }
    
    createBlock(x: number, y: number, width: number, isMoving: boolean): Block {
        const node = instantiate(this.blockPrefab);
        node.setPosition(x, y);
        
        const uiTransform = node.getComponent(UITransform);
        if (uiTransform) {
            uiTransform.priority = this._blocks.length;
        }
        
        this.node.addChild(node);
        
        const block = node.getComponent(Block);
        block.width = width;
        block.setColor(this.COLORS[this._score % this.COLORS.length]);
        
        return block;
    }
    
    spawnNextBlock() {
        if (this._isGameOver) return;
        
        const lastBlock = this._blocks[this._blocks.length - 1];
        const lastPos = lastBlock.node.position;
        const newY = lastPos.y + this.BLOCK_HEIGHT;
        const newWidth = lastBlock.width;
        
        this._currentBlock = this.createBlock(0, newY, newWidth, true);
        
        const speed = 250 + (this._score * 15);
        this._currentBlock.startMoving(speed);
        
        this.adjustView();
    }
    
    onScreenTouch(event: EventTouch) {
        if (this._isGameOver || !this._currentBlock) return;
        
        this._currentBlock.stopMoving();
        
        const lastBlock = this._blocks[this._blocks.length - 1];
        const success = this._currentBlock.cut(
            lastBlock.node.position.x,
            lastBlock.width
        );
        
        if (!success) {
            this.gameOver();
            return;
        }
        
        const diff = Math.abs(this._currentBlock.node.position.x - lastBlock.node.position.x);
        if (diff < 2) {
            this._currentBlock.playPerfectAnimation();
        }
        
        this._blocks.push(this._currentBlock);
        this._score++;
        this.updateScoreUI();
        
        this.scheduleOnce(() => this.spawnNextBlock(), 0.2);
    }
    
    adjustView() {
        const stackHeight = this._blocks.length * this.BLOCK_HEIGHT;
        const screenHeight = view.getVisibleSize().height;
        const maxVisibleHeight = screenHeight * 0.6;
        
        if (stackHeight > maxVisibleHeight) {
            const offset = stackHeight - maxVisibleHeight;
            tween(this.node)
                .to(0.3, { position: new Vec3(0, -offset, 0) })
                .start();
        }
    }
    
    updateScoreUI() {
        if (this.scoreLabel) {
            this.scoreLabel.string = `得分: ${this._score}`;
        }
    }
    
    gameOver() {
        this._isGameOver = true;
        
        if (this._currentBlock) {
            tween(this._currentBlock.node)
                .by(0.5, { position: new Vec3(0, -500, 0) })
                .start();
        }
        
        this.scheduleOnce(() => this.startGame(), 2);
    }
}