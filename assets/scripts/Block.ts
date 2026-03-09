import { _decorator, Component, Vec3, Sprite, Color, tween, UITransform, Node, Graphics } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Block')
export class Block extends Component {
    @property
    private useTintColor: boolean = false;

    @property
    private showBorder: boolean = true;

    @property
    private borderWidth: number = 4;

    @property({ type: Color })
    private borderColor: Color = new Color(20, 20, 20, 255);
    
    // 方块尺寸
    private _width: number = 200;
    private _height: number = 50;
    
    // 移动相关
    private _isMoving: boolean = false;
    private _moveSpeed: number = 300;
    private _direction: number = 1;
    private _moveRange: number = 350;
    
    // 获取/设置宽度
    public get width(): number { return this._width; }
    public set width(value: number) { 
        this._width = value; 
        this.updateSize();
    }
    
    onLoad() {
        this.updateSize();
        this.applyRenderStyle();
        this.updateBorder();
    }
    
    // 设置颜色
    setColor(color: Color) {
        const sprite = this.getComponent(Sprite);
        if (sprite) {
            sprite.color = this.useTintColor ? color : Color.WHITE;
        }
    }

    private applyRenderStyle() {
        const sprite = this.getComponent(Sprite);
        if (!sprite) {
            return;
        }

        if (!this.useTintColor) {
            sprite.color = Color.WHITE;
        }
    }
    
    // 更新尺寸显示
    private updateSize() {
        const uiTransform = this.getComponent(UITransform);
        if (uiTransform) {
            uiTransform.setContentSize(this._width, this._height);
        }

        this.updateBorder();
    }
    
    // 开始左右移动
    startMoving(speed: number) {
        this._isMoving = true;
        this._moveSpeed = speed;
        this.node.setPosition(-this._moveRange, this.node.position.y);
    }
    
    // 停止移动
    stopMoving() {
        this._isMoving = false;
    }
    
    update(deltaTime: number) {
        if (!this._isMoving) return;
        
        const pos = this.node.position;
        const moveStep = this._direction * this._moveSpeed * deltaTime;
        let newX = pos.x + moveStep;
        
        // 边界反弹
        if (newX > this._moveRange) {
            newX = this._moveRange;
            this._direction = -1;
        } else if (newX < -this._moveRange) {
            newX = -this._moveRange;
            this._direction = 1;
        }
        
        this.node.setPosition(newX, pos.y, pos.z);
    }
    
    // 切割方块
    cut(perfectX: number, perfectWidth: number): boolean {
        const currentX = this.node.position.x;
        const halfCurrent = this._width / 2;
        const halfPerfect = perfectWidth / 2;
        
        const currentLeft = currentX - halfCurrent;
        const currentRight = currentX + halfCurrent;
        const perfectLeft = perfectX - halfPerfect;
        const perfectRight = perfectX + halfPerfect;
        
        const overlapLeft = Math.max(currentLeft, perfectLeft);
        const overlapRight = Math.min(currentRight, perfectRight);
        const overlapWidth = overlapRight - overlapLeft;
        
        // 没有重叠 = 失败
        if (overlapWidth <= 0) {
            return false;
        }
        
        // 创建左侧掉落碎片
        if (currentLeft < perfectLeft - 0.5) {
            const dropWidth = perfectLeft - currentLeft;
            this.createFallingPiece(currentLeft + dropWidth/2, dropWidth);
        }
        
        // 创建右侧掉落碎片
        if (currentRight > perfectRight + 0.5) {
            const dropWidth = currentRight - perfectRight;
            this.createFallingPiece(perfectRight + dropWidth/2, dropWidth);
        }
        
        // 更新为重叠部分
        const newCenterX = (overlapLeft + overlapRight) / 2;
        this._width = overlapWidth;
        this.updateSize();
        this.node.setPosition(newCenterX, this.node.position.y);
        
        return true;
    }
    
    // 创建掉落碎片
    private createFallingPiece(x: number, width: number) {
        const piece = new Node();
        piece.name = "FallingPiece";
        this.node.parent.addChild(piece);
        
        piece.setPosition(x, this.node.position.y);
        
        const uiTransform = piece.addComponent(UITransform);
        uiTransform.setContentSize(width, this._height);
        
        const sprite = piece.addComponent(Sprite);
        const mySprite = this.getComponent(Sprite);
        if (mySprite) {
            sprite.color = mySprite.color;
            sprite.spriteFrame = mySprite.spriteFrame;
            sprite.type = mySprite.type;
            sprite.sizeMode = mySprite.sizeMode;
        }

        if (this.showBorder) {
            this.applyBorderToNode(piece, width, this._height);
        }
        
        // 掉落动画
        tween(piece)
            .by(0.6, { position: new Vec3(0, -800, 0) })
            .call(() => piece.destroy())
            .start();
    }
    
    // 完美放置动画
    playPerfectAnimation() {
        tween(this.node)
            .to(0.1, { scale: new Vec3(1.1, 1.2, 1) })
            .to(0.1, { scale: new Vec3(1, 1, 1) })
            .start();
    }

    private updateBorder() {
        if (!this.showBorder) {
            const graphics = this.getComponent(Graphics);
            if (graphics) {
                graphics.clear();
            }
            return;
        }

        this.applyBorderToNode(this.node, this._width, this._height);
    }

    private applyBorderToNode(target: Node, width: number, height: number) {
        let graphics = target.getComponent(Graphics);
        if (!graphics) {
            graphics = target.addComponent(Graphics);
        }

        graphics.clear();
        graphics.lineWidth = this.borderWidth;
        graphics.strokeColor = this.borderColor;
        graphics.rect(-width / 2, -height / 2, width, height);
        graphics.stroke();
    }
}