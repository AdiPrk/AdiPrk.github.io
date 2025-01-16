let mouseImage = new Image();
mouseImage.src = "assets/images/cursor.png";

let sliderCircleImage = new Image();
sliderCircleImage.src = "assets/images/sliderCircle.png";

var mouseParticles = [];

function RenderCursor() {
    ctx.shadowBlur = 2;
    ctx.shadowColor = mouse.clicked == true ? "gold" : "black";
    let ratio = 100 / 145;
    let mouseHeight = 40;
    let mouseWidth = mouseHeight * ratio;

    ctx.drawImage(mouseImage, mouse.x, mouse.y, mouseWidth, mouseHeight);
    
    ctx.shadowBlur = 0;

    mouseParticles.push(new MouseParticle());
    mouseParticles = mouseParticles.filter(e => e.life > 0);
}

class MouseParticle {
    constructor() {
        this.x = mouse.x;
        this.y = mouse.y;
        this.r = Math.random() * 3;
        this.w = this.r*2;
        this.h = this.r*2;
        this.rot = Math.random() * Math.PI * 2;
        this.color = "hsl("+(Math.random()*255)+",40%,50%)";
        this.alpha = Math.random()*0.3+0.2;
        this.angle = Math.random() * Math.PI * 2;
        this.speed = this.r / 25;
        this.vx = Math.cos(this.angle) * this.speed;
        this.vy = Math.sin(this.angle) * this.speed;
        this.shape = Math.random() < 0.5 ? "circle" : "square";
        this.life = 60;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        
        this.rot += 0.01;
        this.life--;
    }
    render() {
        if (this.shape == "square") {
            ctx.translate(this.x + this.w / 2, this.y + this.h / 2)
            ctx.rotate(this.rot);
            
            ctx.fillStyle = this.color;
            ctx.globalAlpha = this.alpha;
            
            ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);
    
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            
            ctx.globalAlpha = 1;
        } else if (this.shape == "circle") {
            ctx.fillStyle = this.color;
            ctx.globalAlpha = this.alpha;
            
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.closePath();
            
            ctx.globalAlpha = 1;
        }
    }
}

const titleButtons = [];

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
    }
    update() {
        this.updateSize();
        
        if (RectVsPoint({x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h}, mouse)) {
            this.color = "rgb(160, 250, 250)";
            this.shadowColor = "grey";
            this.blur = 10;
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
            this.shadowColor = "black";
            this.color = "white";
            this.clickedOnTop = false;
        }

        if (this.clicked) {
            this.clicked = false;
            this.clickedOnTop = false;
            if (this.text == "Start Game") {
                game.switchGameState("Game");
            } else {
                game.switchGameState(this.text);
            }
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

titleButtons.push(new TitleButton("Start Game", canvas.width / 2, 525));
titleButtons.push(new TitleButton("Options", canvas.width / 2, 600));
titleButtons.push(new TitleButton("Credits", canvas.width / 2, 675));
titleButtons.push(new TitleButton("Quit Game", canvas.width / 2, 750));

class Title {
    constructor(text, x, y) {
        this.text = text;
        this.x = x;
        this.y = y;
        this.font = "175px 'Outfit'";
        this.color = "white";
    }
    render() {
        ctx.fillStyle = this.color;
        ctx.font = this.font;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowBlur = 10;
        ctx.shadowColor = "aqua";
        
        ctx.fillText(this.text, this.x, this.y);
        ctx.shadowBlur = 0;
    }
}

var title = new Title("Nexus Rift", canvas.width / 2, 200);

const titleParticles = [];

class MovingCircleParticle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.r = 3 + Math.random() * 10;
        this.color = "hsl("+(Math.random()*255)+",50%,50%)";
        this.alpha = Math.random()*0.2+0.1;
        this.angle = Math.random() * Math.PI * 2;
        this.speed = this.r / 5;
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

const creditsParticles = [];

class RotatingSquareParticle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.w = 2 + Math.random() * 15;
        this.h = this.w;
        this.rot = Math.random() * Math.PI * 2;
        this.color = "hsl("+(Math.random()*255)+",50%,50%)";
        this.alpha = Math.random()*0.2+0.1;
        this.angle = Math.random() * Math.PI * 2;
        this.rotSpeed = Math.random() * 0.1 - 0.05;
        this.vx = Math.cos(this.angle) * this.speed;
        this.vy = Math.sin(this.angle) * this.speed;
    }
    update() {
        this.rot += this.rotSpeed;

        this.vx = Math.cos(this.angle) * this.rotSpeed * 10;
        this.vy = Math.sin(this.angle) * this.rotSpeed * 10;
        
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

if (Math.random() < 0.5) {
    for (let i = 0; i < 20; i++) {
        titleParticles.push(new MovingCircleParticle());
    }
} else {
    for (let i = 0; i < 20; i++) {
        titleParticles.push(new RotatingSquareParticle());
    }
}

for (let i = 0; i < 75; i++) {
    creditsParticles.push(new RotatingSquareParticle());
    creditsParticles.push(new MovingCircleParticle());
}

const optionsParticles = [];

for (let i = 0; i < 80; i++) {
    optionsParticles.push(new RotatingSquareParticle());
}


var gameBGParticles = [];
var gameFGParticles = [];

class GalaxyParticle {
    constructor() {
        this.x = Math.random() * game.roomBounds.w + game.roomBounds.x;
        this.y = Math.random() * game.roomBounds.h + game.roomBounds.y;
        this.r = Math.random() * 3.5;
        this.rot = Math.random() * Math.PI * 2;
        let r = Math.random() * 100 + 150;
        let g = Math.random() * 100 + 150;
        let b = Math.random() * 100 + 150;
        this.color = "rgb("+r+","+g+","+b+")";
        this.alpha = Math.random()*0.2+0.1;
        this.angle = Math.random() * Math.PI * 2;
        this.speed = this.r / 60;
        this.vx = Math.cos(this.angle) * this.speed;
        this.vy = Math.sin(this.angle) * this.speed;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < game.roomBounds.x - this.r) {
            this.x = game.roomBounds.x + game.roomBounds.w + this.r;
        }
        if (this.y < game.roomBounds.y - this.r) {
            this.y = game.roomBounds.y + game.roomBounds.h + this.r;
        }
        if (this.x > game.roomBounds.x + game.roomBounds.w + this.r) {
            this.x = game.roomBounds.x - this.r;
        }
        if (this.y > game.roomBounds.y + game.roomBounds.h + this.r) {
            this.y = game.roomBounds.y - this.r;
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

class DarkParticle {
    constructor() {
        this.x = Math.random() * game.roomBounds.w + game.roomBounds.x;
        this.y = Math.random() * game.roomBounds.h + game.roomBounds.y;
        this.r = Math.random() * 12;
        this.rot = Math.random() * Math.PI * 2;
        let r = 0;
        let g = 0;
        let b = 0;
        this.color = "rgb("+r+","+g+","+b+")";
        this.alpha = Math.random()*0.4 + 0.3;
        this.angle = Math.random() * Math.PI * 2;
        this.speed = 0;//this.r / 15;
        this.vx = Math.cos(this.angle);
        this.vy = Math.sin(this.angle);
        this.ax = Math.random() * 100 - 50;
        this.ay = Math.random() * 100 - 50;
        this.shadowStrength = Math.random() * 20;
        this.image = new Image();
        this.image.src = "./assets/images/darkParticle.png";
    }
    update() {
        if (this.speed == 0) return;
        
        this.angle = Math.atan2(game.player.y + game.player.h/2 - this.y, game.player.x+game.player.w/2 - this.x);
        if (startingCutsceneLength <= 2000) this.angle += Math.PI;
        this.vx = Math.cos(this.angle) * this.speed + this.ax;
        this.vy = Math.sin(this.angle) * this.speed + this.ay;
        this.x += this.vx + Math.random() * 3 - 1.5;
        this.y += this.vy + Math.random() * 3 - 1.5;
        
        this.speed += 0.3;
        this.r += 0.05;

        this.ax *= 0.9;
        this.ay *= 0.9;
    }
    render() {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.alpha;

        if (this.speed > 0) {
            ctx.drawImage(this.image, this.x - this.r, this.y - this.r, this.r * 2, this.r * 2)
        } else {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.closePath();
        }
        
        
        
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    }
}

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
    }
    update() {
        this.sliderShadowColor = "aqua";
        this.sliderR = this.h * 0.34
        if (mouse.clicked && (this.selected || RectVsPoint(this, mouse))) {
            this.selected = true;
            this.sliderX = mouse.x;
            this.sliderShadowColor = "gold";
            this.sliderR = this.h * 0.37;
        } else {
            this.selected = false;
        }
        
        this.sliderX = Math.max(this.sliderX, this.x + 5);
        this.sliderX = Math.min(this.sliderX, this.x + this.w - 5);

        this.value = scaleBetweenRanges(this.sliderX, this.x + 5, this.x + this.w - 5, this.min, this.max);

        let lastValue = this.value;
        this.value = Math.round(this.value);
        if (this.value != lastValue) {
            localStorage.setItem('volume', JSON.stringify(this.value));
        }

        this.value = Math.max(this.value, this.min);
        this.value = Math.min(this.value, this.max);
    }
    render() {
        ctx.fillStyle = this.color;
        ctx.font = this.font;
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.shadowColor;
        ctx.globalAlpha = 0.8;
        ctx.fillText(this.text + ": " + this.value, this.x + this.w / 2, this.y);
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
        // ctx.arc(this.sliderX, this.sliderY, this.sliderR, 0, Math.PI * 2);
        // ctx.fill();
        // ctx.closePath();
        ctx.shadowBlur = 0;
    }
}

let volume = 5;
if (localStorage.getItem('volume')) {
    volume = localStorage.getItem('volume');
} else {
    localStorage.setItem('volume', volume)
}

let audioSlider = new AudioSlider(canvas.width / 2 - 150, canvas.height / 2 - 80, 300, 40, 0, 10, 1, volume, "Audio");

const keybindButtons = [];

class KeybindButton {
    constructor(x, y, w, h, key, bind) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.key = key;
        this.bind = bind;
        this.keyText = this.key.charAt(0).toUpperCase() + this.key.slice(1);
        this.searchingForKey = false;
        this.keyWhenStartingSearch = "";
        this.color = "green";
        this.font = "40px 'Outfit'";
        this.shadowColor = "aqua";
        this.hover = false;
    }
    update() {
        if (mouse.clicked && RectVsPoint(this, mouse)) {
            this.searchingForKey = true;
            this.keyWhenStartingSearch = Keys.lastKey;
        } else if (mouse.clicked) {
            this.searchingForKey = false;
        } 
        
        if (RectVsPoint(this, mouse)) {
            this.hover = true;
        } else {
            this.hover = false;
        }

        if (this.searchingForKey) {
            if (Keys.lastKey != this.keyWhenStartingSearch) {
                this.bind = Keys.lastKey;
                this.searchingForKey = false;
                KeyBinds[this.key] = this.bind;
                localStorage.setItem('KeyBinds', JSON.stringify(KeyBinds));
                Keys.lastKey = "";
            }
        }
    }
    render() {
        
        if (this.searchingforKey) {
            this.color = "red";
        } else {
            this.color = "white";
        }

        ctx.fillStyle = "grey";
        
        ctx.shadowBlur = 0;
        if (this.hover || this.searchingForKey) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = "green";
        }
        ctx.beginPath();
        ctx.roundRect(this.x, this.y, this.w, this.h, [15]);
        ctx.fill();
        ctx.closePath();
        ctx.shadowBlur = 0;
        
        ctx.fillStyle = this.color;
        ctx.font = this.font;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.shadowColor;
        ctx.globalAlpha = 0.7;
        
        if (this.searchingForKey) {
            ctx.shadowColor = "gold";
            ctx.fillText(this.keyText + ": ...", this.x + this.w / 2, this.y + this.h / 2);
        } else {
            ctx.fillText(this.keyText + ": " + this.bind, this.x + this.w / 2, this.y + this.h / 2);
        }
        
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    }
}

function CreateKeybindButtons() {
    let buttonCountTopRow = 4;
    let buttonCountBottomRow = 3;
    let width = 360;
    let height = 50;
    let buttonGap = 40;

    let buttonX = (canvas.width / 2) + 20 - (buttonCountTopRow * width + buttonCountTopRow * buttonGap) * 0.5;
    let buttonY = 670;
    
    keybindButtons.push(new KeybindButton(buttonX, buttonY, width, height, "left", KeyBinds.left));
    buttonX += width + buttonGap;

    keybindButtons.push(new KeybindButton(buttonX, buttonY, width, height, "right", KeyBinds.right));
    buttonX += width + buttonGap;

    keybindButtons.push(new KeybindButton(buttonX, buttonY, width, height, "up", KeyBinds.up));
    buttonX += width + buttonGap;

    keybindButtons.push(new KeybindButton(buttonX, buttonY, width, height, "down", KeyBinds.down));
    buttonX += width;

    buttonY += 100;
    buttonX = (canvas.width / 2) + 20 - (buttonCountBottomRow * width + buttonCountBottomRow * buttonGap) * 0.5;

    keybindButtons.push(new KeybindButton(buttonX, buttonY, width, height, "jump", KeyBinds.jump));
    buttonX += width + buttonGap;

    keybindButtons.push(new KeybindButton(buttonX, buttonY, width, height, "ability1", KeyBinds.ability1));
    buttonX += width + buttonGap;

    keybindButtons.push(new KeybindButton(buttonX, buttonY, width, height, "ability2", KeyBinds.ability2));
}

CreateKeybindButtons();

function RenderAndUpdateKeybinds() {
    for (let i = 0; i < keybindButtons.length; i++) {
        keybindButtons[i].update();
        keybindButtons[i].render();
    }
}

class MenuBackButton {
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
    }
    update() {
        this.updateSize();
        
        if (RectVsPoint(this, mouse)) {
            this.color = "rgb(160, 250, 250)";
            this.shadowColor = "grey";
            this.blur = 10;
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
            this.shadowColor = "black";
            this.color = "white";
            this.clickedOnTop = false;
        }

        if (this.clicked) {
            this.clicked = false;
            this.clickedOnTop = false;
            game.switchGameState(game.lastGameState);
        }
    }
    render() {
        ctx.fillStyle = this.color;
        ctx.font = this.font;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
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

const menuBackButton = new MenuBackButton("Back", 50, 50);

class MenuReturnToHome {
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
    }
    update() {
        this.updateSize();
        
        if (RectVsPoint({x: this.x - this.w, y: this.y, w: this.w, h: this.h}, mouse)) {
            this.color = "rgb(160, 250, 250)";
            this.shadowColor = "grey";
            this.blur = 10;
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
            this.shadowColor = "black";
            this.color = "white";
            this.clickedOnTop = false;
        }

        if (this.clicked) {
            this.clicked = false;
            this.clickedOnTop = false;
            canvas.style.background = "url('./assets/images/nrnewbgmin.png') no-repeat center center fixed";
            game.switchGameState("Title");
        }
    }
    render() {
        ctx.fillStyle = this.color;
        ctx.font = this.font;
        ctx.textAlign = "right";
        ctx.textBaseline = "top";
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

const menuHomeButton = new MenuReturnToHome("Return to Menu", canvas.width - 50, 50);

let startingCutsceneLength = 5000;
let circleSizeCounter = 5;
let circleAlpha = 0;
function startingCutscene() {
    // Update Accumulator
    const now = performance.now();
    const dt = Math.min(now - then, 150);
    then = now;
    accumulator += dt;

    startingCutsceneLength -= dt;
    camera.shake = startingCutsceneLength > -400;
    
    // Update Game State
    let ts = dt * (timeStep / game.gameSpeed);
    if (game.freeze > 0) game.freeze -= ts;
    game.player.orb.updateTimers(ts);

    while (accumulator >= game.gameSpeed) {
        game.setPreviousPositions();
        game.update();

        if (startingCutsceneLength <= 3000) {
            circleAlpha+=0.0035;
        }
        if (startingCutsceneLength <= 2000) {
            circleAlpha+=0.0085;
        }
        if (startingCutsceneLength <= 1000) {
            circleAlpha-=0.025;
        }
        
        if (startingCutsceneLength <= 2000) {
            circleSizeCounter += 50;
        }
        accumulator -= game.gameSpeed;
    }

    // Render Game
    screenFade = Math.max(0.1, screenFade - dt / 4000);
    
    game.render(accumulator / game.gameSpeed, dt);

    if (circleAlpha > 0.9) {
        console.log("set alpha");
        game.startingCutDarkBlock.alpha = 0;
        game.startingCutDarkBlock.disabled = true;
        game.player.orb.unlockAbility("dash");
    }

    if (startingCutsceneLength <= -400) {
        game.switchGameState("Game");
    }
    
    if (startingCutsceneLength <= 0) {
        // Don't render any circle or anything
    } else if (startingCutsceneLength <= 2000) {
        SetCameraOnPlayer();
        const canvasTranslateX = canvas.width / 2 - camera.x * camera.scale;
        const canvasTranslateY = canvas.height / 2 - camera.y * camera.scale;
        ctx.translate(canvasTranslateX, canvasTranslateY);
        ctx.scale(camera.scale, camera.scale);
        
        let cx = game.player.x + game.player.w / 2;
        let cy = game.player.y + game.player.h / 2;
        let cr = circleSizeCounter;
        ctx.globalAlpha = circleAlpha;

        ctx.beginPath();
        ctx.fillStyle = "purple";
        ctx.strokeStyle = "white";
        ctx.lineWidth = 8;
        ctx.arc(cx, cy, cr, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.closePath();

        ctx.setTransform(1, 0, 0, 1, 0, 0);
    } else if (startingCutsceneLength <= 3000) {
        SetCameraOnPlayer();
        const canvasTranslateX = canvas.width / 2 - camera.x * camera.scale;
        const canvasTranslateY = canvas.height / 2 - camera.y * camera.scale;
        ctx.translate(canvasTranslateX, canvasTranslateY);
        ctx.scale(camera.scale, camera.scale);
        
        cx = game.player.x + game.player.w / 2;
        cy = game.player.y + game.player.h / 2;
        cr = 5;
        ctx.globalAlpha = circleAlpha;

        ctx.beginPath();
        ctx.fillStyle = "gold";
        ctx.shadowBlur = 10;
        ctx.shadowColor = "white";
        ctx.arc(cx, cy, cr, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
        ctx.shadowBlur = 0;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    ctx.fillStyle = "rgba(0, 0, 0,"+screenFade+")";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Wait for the next frame
    if (game.gameState == "Game") {
        camera.shake = false;
        game.player.stopKeyboardInput = false;
        requestAnimationFrame(updateGame);
    } else {
        requestAnimationFrame(startingCutscene);
    }
}