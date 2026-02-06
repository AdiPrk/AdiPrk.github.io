const graphButtons = [];
const settingsButtons = [];

class Button {
    constructor(text, x, y, bg = false, color = null) {
        this.text = text;
        this.x = x;
        this.y = y;
        this.smallFontSize = 60;
        this.bigFontSize = 65;
        this.fontSize = this.smallFontSize;
        this.w = 0;
        this.h = this.fontSize;
        this.font = this.fontSize + "px 'Outfit'";
        this.defaultColor = color || "rgb(255,255,255)";
        this.hoverColor = "rgb(160, 250, 250)";
        this.color = this.defaultColor;
        this.shadowColor = "black";
        this.blur = 10;
        this.clickedOnTop = false;
        this.clicked = false;
        this.bg = bg;
    }
    update() {
        this.graphPointSelected = false;
        bezier.controlPoints.forEach(p => {
            if (p.selected) this.graphPointSelected = true;    
        });
        if (this.graphPointSelected) return;
        
        this.updateSize();
        
        if (RectVsPoint({x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h}, mouse)) {
            this.color = this.hoverColor;
            this.shadowColor = "grey";
            this.blur = 10;
            this.fontSize = lerp(this.fontSize, this.bigFontSize, 0.1);
            
            if (mouse.clicked) {
                this.clickedOnTop = true;
                mouse.clicked = false; // stop propogation
            }
            
            if (!mouse.clicked && this.clickedOnTop) {
                this.clicked = true;
            }
        } else {
            this.fontSize = lerp(this.fontSize, this.smallFontSize, 0.1);
            this.blur = 10;
            this.shadowColor = "black";
            this.color = this.defaultColor;
            this.clickedOnTop = false;
        }

        if (this.clicked) {
            this.clicked = false;
            this.clickedOnTop = false;
            let isMethod = this.text == "NLI-form" || this.text == "BB-form" || this.text == "Midpoint-Subdivision";

            if (isMethod) {
                if (this.text == "NLI-form" || this.text == "BB-form" || this.text == "Midpoint-Subdivision") {
                    bezier.method = this.text;
                }
            }
            else {
                if (this.text == "Back") {
                    game.state = "Graph";
                } else {
                    game.state = this.text;
                }
            }
        }
    }
    render() {
        if (this.bg)
        {
            let r = 20;
            let g = 20;
            let b = 20;
            ctx.strokeStyle = "silver";

            let isMethod = this.text == "NLI-form" || this.text == "BB-form" || this.text == "Midpoint-Subdivision";
            if (isMethod) {
                let isSelected = bezier.method == this.text;
                if (isSelected) {
                    ctx.strokeStyle = "gold";
                }
            }

            let bg = "rgb(" + r + "," + g + "," + b + ")";

            ctx.fillStyle = bg;

            let xPadding = 8;
            let yPadding = 5;
            let round = 15;
            ctx.beginPath();
            ctx.roundRect(this.x - this.w / 2 - xPadding, this.y - this.h / 2 - yPadding, this.w + xPadding * 2, this.h + yPadding * 2, round);
            ctx.fill();
            ctx.stroke();
            ctx.closePath();
        }

        ctx.fillStyle = this.color;
        ctx.font = this.font;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowBlur = this.blur;
        ctx.shadowColor = this.shadowColor;
        ctx.lineWidth = 1;
        //ctx.strokeStyle = "silver";
        
        ctx.fillText(this.text, this.x, this.y);

        ctx.globalAlpha = 0.2;
        //ctx.strokeText(this.text, this.x, this.y);
        ctx.globalAlpha = 1;
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

graphButtons.push(new Button("Settings", canvas.width - 120, canvas.height - 50));
settingsButtons.push(new Button("Back", canvas.width * 0.5, canvas.height * 0.5 + 150));

// Method buttons
const methodButtons = [];
let btnPadding = 80;
let btnBase = canvas.height * 0.5 - 150;


methodButtons.push(new Button("NLI-form", canvas.width * 0.5, btnBase, true));
methodButtons.push(new Button("BB-form", canvas.width * 0.5, btnBase + btnPadding, true));
methodButtons.push(new Button("Midpoint-Subdivision", canvas.width * 0.5, btnBase + btnPadding * 2, true));

class Slider {
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
        this.font = "40px 'Outfit'";
        this.shadowColor = "aqua";
        this.sliderShadowColor = "aqua";
        this.selected = false;
        this.graphPointSelected = false;
        this.hovered = false;
    }
    update() {
        this.graphPointSelected = false;
        bezier.controlPoints.forEach(p => {
            if (p.selected) this.graphPointSelected = true;    
        });
        if (this.graphPointSelected) return;
        
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
        this.value = Math.round(this.value * 1000) / 1000;
        if (this.value != lastValue) {
            localStorage.setItem('volume', JSON.stringify(this.value));
        }

        this.value = Math.max(this.value, this.min);
        this.value = Math.min(this.value, this.max);
    }
    render() {
        ctx.fillStyle = "white";
        ctx.font = this.font;
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.shadowBlur = 0;
        ctx.shadowColor = this.shadowColor;
        ctx.globalAlpha = 0.8;
        ctx.globalAlpha = 1;
        
        ctx.fillStyle = "white";
        ctx.font = this.font;
        
        ctx.fillText(this.text + ": " + this.value, this.x + this.w / 2, this.y - 5);
        
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
            this.hovered = true;
            
            if (!this.graphPointSelected) {
                ctx.shadowColor = "gold";
            }
        }
        else {
            this.hovered = false;
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

let tSlider = new Slider(canvas.width / 2 - 425, canvas.height / 2 + 400, 250, 40, 0, 1, 0.01, 0.5, "T-value");