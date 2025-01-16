let blockImg = new Image();
blockImg.src = "assets/images/blok12.png";

let lavaImg = new Image();
lavaImg.src = "assets/images/lava.png";

let darknessImg = new Image();
darknessImg.src = "assets/images/blok6.png";

let blocksToRender = [];

class Block extends Entity {
    constructor(info) {
        super(info);

        if (this.texture == -1) {
            this.image = blockImg;
        } else {
            this.image = new Image();
            this.image.src = "assets/images/blok" + this.texture + ".png"
        }
    }
    render(dt, setCtx = true) {               
        ctx.lineWidth = 1;
        ctx.fillStyle = ctx.createPattern(this.image, "repeat");
        ctx.strokeStyle = ctx.fillStyle;
        
        ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.strokeRect(this.x, this.y, this.w, this.h);
    }
}

class Lava extends Entity {
    constructor(info) {
        super(info);
        this.image = lavaImg;
    }
    render() {       
        ctx.lineWidth = 1;
        
        ctx.fillStyle = ctx.createPattern(this.image, "repeat");
        ctx.strokeStyle = ctx.fillStyle;

        ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.strokeRect(this.x, this.y, this.w, this.h);
    }
}

class DarknessBlock extends Entity {
    constructor(info) {
        super(info);
        this.image = darknessImg;
        this.offsetY = 0;
        this.offsetSpeed = 0.3;
    }
    render() {       
        ctx.lineWidth = 1;
        ctx.globalAlpha = this.alpha;
        
        ctx.fillStyle = ctx.createPattern(this.image, "repeat");
        
        ctx.beginPath();
        ctx.rect(this.x, this.y, this.w, this.h);

        // Draw texture
        this.offsetY += this.offsetSpeed;    
        ctx.translate(0, this.offsetY);
        ctx.fill();
        ctx.closePath()
        ctx.translate(0, -this.offsetY);

        // Make block darker
        ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
        ctx.strokeStyle = "rgb(0, 0, 0)";
        ctx.lineWidth = 1;
        ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.strokeRect(this.x, this.y, this.w, this.h);
        
        ctx.globalAlpha = 1;
    }
}

class HelpTextTrigger extends Entity {
    constructor(info) {
        super(info);
    }
}

class CutsceneTrigger extends Entity {
    constructor(info) {
        super(info);
    }
    render() {       
        // ctx.lineWidth = 2;
        // ctx.fillStyle = "green";
        // ctx.globalAlpha = 0.2;
        // ctx.fillRect(this.x, this.y, this.w, this.h);
        // ctx.globalAlpha = 1;
    }
}

class CamOffsetTrigger extends Entity {
    constructor(info) {
        super(info);
    }
}