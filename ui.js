let sliderCircleImage = new Image();
sliderCircleImage.src = "assets/images/sliderCircle.png";

class AudioSlider {
    constructor(x, y, w, h, min, max, step, def, text) {
        this.min = min;
        this.max = max;
        this.step = step;
        this.def = def;
        this.value = this.def;
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.sliderX = scaleBetweenRanges(this.value, this.min, this.max, this.x + 5, this.x + this.w - 5);
        this.sliderY = this.y + this.h / 2;
        this.sliderR = this.h * 0.37;
        this.text = text;
        this.color = "white";
        this.font = "70px 'Outfit'";
        this.shadowColor = "aqua";
        this.sliderShadowColor = "aqua";
        this.selected = false;

        console.log(def);
    }
    update() {
        this.sliderShadowColor = "aqua";
        this.sliderR = this.h * 0.34;
        
        if (mouse.clicked && (this.selected || RectVsPoint(this, mouse))) {
            this.selected = true;
            this.sliderX = mouse.x;
            this.sliderShadowColor = "gold";
            this.sliderR = this.h * 0.37;
        } else {
            this.selected = false;
        }
        
        // Constrain slider position within bounds
        this.sliderX = Math.max(this.sliderX, this.x + 5);
        this.sliderX = Math.min(this.sliderX, this.x + this.w - 5);

        // Map slider position to value and apply step rounding
        let rawValue = scaleBetweenRanges(this.sliderX, this.x + 5, this.x + this.w - 5, this.min, this.max);
        let steppedValue = Math.round((rawValue - this.min) / this.step) * this.step + this.min;
        
        // Constrain stepped value within min and max
        this.value = Math.max(this.min, Math.min(this.max, steppedValue));
        
        // Update sliderX position based on stepped value
        this.sliderX = scaleBetweenRanges(this.value, this.min, this.max, this.x + 5, this.x + this.w - 5);

        // Store value in localStorage if it changes
        let lastValue = parseFloat(localStorage.getItem('bpm') || this.def);
        if (this.value !== lastValue) {
            localStorage.setItem('bpm', JSON.stringify(this.value));
        }
    }
    render() {
        ctx.fillStyle = this.color;
        ctx.font = this.font;
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.shadowColor;
        ctx.globalAlpha = 0.8;
        ctx.fillText(this.value + " " + this.text, this.x + this.w / 2, this.y);
        ctx.globalAlpha = 1;
        
        ctx.shadowBlur = 5;
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.roundRect(this.x - 15, this.y, this.w + 30, this.h, [20])
        ctx.fill();
        ctx.closePath();
        ctx.globalAlpha = 1;

        ctx.shadowColor = "black";
        ctx.fillStyle = "grey";
        if (RectVsPoint(this, mouse) || this.selected) {
            ctx.shadowColor = "gold";
        }
        ctx.fillRect(this.x, this.y + this.h / 2 - 2, this.w, 4);
        
        ctx.fillStyle = "black";
        ctx.shadowColor = this.sliderShadowColor;
        ctx.drawImage(sliderCircleImage, this.sliderX-this.sliderR, this.sliderY-this.sliderR, this.sliderR*2, this.sliderR*2);
        
        // ctx.beginPath();
        // ctx.beginPath();
        // ctx.arc(this.sliderX, this.sliderY, this.sliderR, 0, Math.PI * 2);
        // ctx.fill();
        // ctx.closePath();
        
        ctx.shadowBlur = 0;
    }
}

let bpm = 100;
if (localStorage.getItem('bpm')) {
    bpm = localStorage.getItem('bpm');
} else {
    localStorage.setItem('bpm', bpm)
}

let audioSlider = new AudioSlider(canvas.width / 2 - 150, canvas.height / 2 - 60, 300, 40, 20, 180, 5, bpm, "BPM");


class TitleButton {
    constructor(text, x, y) {
        this.text = text;
        this.x = x;
        this.y = y;
        this.smallFontSize = 60;
        this.bigFontSize = 65;
        this.fontSize = this.smallFontSize;
        this.w = 0;
        this.h = this.fontSize;
        this.font = this.fontSize + "px 'Outfit'";
        this.color = "white";
        this.shadowColor = "black";
        this.blur = 10;
        this.clickedOnTop = false;
        this.clicked = false;
        this.wasClicked = false;
    }
    update() {
        this.wasClicked = false;
        this.updateSize();
        
        if (RectVsPoint({x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h}, mouse)) {
            this.color = "rgb(160, 250, 250)";
            this.shadowColor = "grey";
            this.blur = 100;
            this.fontSize = lerp(this.fontSize, this.bigFontSize, 0.1);
            
            if (mouse.clicked) {
                this.clickedOnTop = true;
            }
            
            if (!mouse.clicked && this.clickedOnTop) {
                this.clicked = true;
            }
        } else {
            this.fontSize = lerp(this.fontSize, this.smallFontSize, 0.1);
            this.blur = 10;
            this.shadowColor = "silver";
            this.color = "white";
            this.clickedOnTop = false;
        }

        if (this.clicked) {
            this.wasClicked = true;
            this.clicked = false;
            this.clickedOnTop = false;
        }
    }
    render() {
        ctx.fillStyle = this.color;
        ctx.font = this.font;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowBlur = this.blur;
        ctx.shadowColor = this.shadowColor;
        
        ctx.fillText(this.text, this.x, this.y);
        ctx.shadowBlur = 0;
    }
    setFont() {
        this.font = this.fontSize + "px 'Outfit'";
    }
    updateSize() {
        this.setFont();
        ctx.font = this.font;
        let textMetrics = ctx.measureText(this.text);
        this.w = textMetrics.width;
        this.h = this.fontSize;
    }
}

const titleButtons = [];
titleButtons.push(new TitleButton("Start", canvas.width / 2 - 100, 600));
titleButtons.push(new TitleButton("Restart", canvas.width / 2 + 100, 600));


class MovingCircleParticle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.r = 3 + Math.random() * 10;
        this.color = "hsl("+(Math.random()*255)+",50%,50%)";
        this.alpha = Math.random()*0.05+0.05;
        this.angle = Math.random() * Math.PI * 2;
        this.speed = this.r / 50;
        this.vx = Math.cos(this.angle) * this.speed;
        this.vy = Math.sin(this.angle) * this.speed;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < -this.r) {
            this.x = canvas.width + this.r;
        }
        if (this.y < -this.r) {
            this.y = canvas.height + this.r;
        }
        if (this.x > canvas.width + this.r) {
            this.x = -this.r;
        }
        if (this.y > canvas.height + this.r) {
            this.y = -this.r;
        }
    }
    render() {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.alpha;
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
        
        ctx.globalAlpha = 1;
    }
}

class RotatingSquareParticle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.w = 2 + Math.random() * 15;
        this.h = this.w;
        this.rot = Math.random() * Math.PI * 2;
        this.color = "hsl("+(Math.random()*255)+",50%,50%)";
        this.alpha = Math.random()*0.1+0.05;
        this.angle = Math.random() * Math.PI * 2;
        this.rotSpeed = Math.random() * 0.05 - 0.05;
        this.vx = Math.cos(this.angle) * this.rotSpeed;
        this.vy = Math.sin(this.angle) * this.rotSpeed;
    }
    update() {
        this.rot += this.rotSpeed;

        this.vx = Math.cos(this.angle) * this.rotSpeed * 5;
        this.vy = Math.sin(this.angle) * this.rotSpeed * 5;
        
        this.x += this.vx;
        this.y += this.vy;
    }
    render() {
        ctx.translate(this.x + this.w / 2, this.y + this.h / 2)
        ctx.rotate(this.rot);
        
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.alpha;
        
        ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        ctx.globalAlpha = 1;
    }
}

let particles = [];

for (let i = 0; i < 50; i++) {
        if (Math.random() < 0.5) {
        particles.push(new MovingCircleParticle());
    } else {
        particles.push(new RotatingSquareParticle());
    }
}