const graphButtons = [];
const settingsButtons = [];

class Button {
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
            if (this.text == "Back") {
                game.state = "Graph";
            } else {
                game.state = this.text;
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
        ctx.strokeStyle = "gold"
        
        ctx.fillText(this.text, this.x, this.y);

        ctx.globalAlpha = 0.2;
        ctx.strokeText(this.text, this.x, this.y);
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

class Dropdown
{
    constructor(x, y, w, h, title, options)
    {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.title = title;
        this.options = options;
        this.selected = 0;
        this.fontSize = 60;
        this.bigFontSize = 60;
        this.smallFontSize = 60;
        this.font = this.fontSize + "px 'Outfit'";
        this.color = "white";
        this.shadowColor = "black";
        this.blur = 10;
        this.clickedOnTop = false;
        this.clicked = false;

        this.inDropdown = false;

        this.maxTextWidth = 0;

        for (let i = 0; i < this.options.length; i++)
        {
            ctx.font = this.font;
            let textMetrics = ctx.measureText(this.options[i]);
            this.maxTextWidth = Math.max(this.maxTextWidth, textMetrics.width);
        }

        this.xPadding = 10;
        this.yPadding = 5;
    }
    update()
    {
        let exitDropdown = false;
        let hovering = false;
        this.updateSize();
        
        let boxLeft = this.x - this.maxTextWidth / 2 - this.xPadding;

        if (RectVsPoint({x: boxLeft, y: this.y - this.h / 2 - this.yPadding, w: this.maxTextWidth + this.xPadding * 2, h: this.h + this.yPadding * 2}, mouse))
        {
            hovering = true;
            this.color = "rgb(160, 250, 250)";
            this.shadowColor = "grey";
            this.blur = 10;
            this.fontSize = lerp(this.fontSize, this.bigFontSize, 0.1);
            
            this.clicked = true; // makes it on hover instead

            if (mouse.clicked)
            {
                this.clickedOnTop = true;
            }
            
            if (!mouse.clicked && this.clickedOnTop)
            {
                this.clicked = true;
            }
        }
        else
        {
            this.fontSize = lerp(this.fontSize, this.smallFontSize, 0.1);
            this.blur = 10;
            this.shadowColor = "black";
            this.color = "white";
            this.clickedOnTop = false;
        }

        if (this.clicked)
        {
            this.inDropdown = true;
            this.clicked = false;
            this.clickedOnTop = false;
        }

        if (this.inDropdown)
        {
            for (let i = 0; i < this.options.length; i++)
            {
                let boxTop = this.y - this.h / 2 + (this.h + this.yPadding * 2) * (i + 1) - this.yPadding;

                if (RectVsPoint({x: boxLeft, y: boxTop, w: this.maxTextWidth + this.xPadding * 2, h: this.h + this.yPadding * 2}, mouse))
                {
                    hovering = true;

                    if (mouse.clicked) {
                        this.selected = i;
                        this.inDropdown = false;                    
                    }
                }
            }
        }
        if (!hovering) this.inDropdown = false;
    }
    render()
    {
        ctx.fillStyle = "white";
        ctx.font = this.font;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        if (!this.inDropdown) ctx.shadowBlur = this.blur;
        ctx.shadowColor = this.shadowColor;

        ctx.fillText(this.title, this.x, this.y - this.h * 0.5 - this.fontSize * 0.5);

        // dropdown box
        ctx.fillStyle = "rgba(100, 100, 100, 0.3)";
        ctx.strokeStyle = "white";

        let boxLeft = this.x - this.maxTextWidth / 2 - this.xPadding;

        ctx.fillRect(boxLeft, this.y - this.h / 2 - this.yPadding, this.maxTextWidth + this.xPadding * 2, this.h + this.yPadding * 2);
        ctx.strokeRect(boxLeft, this.y - this.h / 2 - this.yPadding, this.maxTextWidth + this.xPadding * 2, this.h + this.yPadding * 2);


        ctx.fillStyle = this.color;
        ctx.strokeStyle = "aqua";
        ctx.fillText(this.options[this.selected], this.x, this.y);
        ctx.globalAlpha = 0.2;
        ctx.strokeText(this.options[this.selected], this.x, this.y);
        ctx.globalAlpha = 1;

        if (this.inDropdown)
        {
            for (let i = 0; i < this.options.length; i++)
            {
                ctx.fillStyle = "rgba(100, 100, 100, 0.3)";
                ctx.strokeStyle = "white";

                let boxTop = this.y - this.h / 2 + (this.h + this.yPadding * 2) * (i + 1) - this.yPadding;

                let isMouseOver = false;
                if (RectVsPoint({
                    x: boxLeft, 
                    y: boxTop, 
                    w: this.maxTextWidth + this.xPadding * 2, 
                    h: this.h + this.yPadding * 2}, mouse)
                ) isMouseOver = true;

                
                ctx.fillRect(boxLeft, boxTop, this.maxTextWidth + this.xPadding * 2, this.h + this.yPadding * 2);

                if (isMouseOver) ctx.shadowBlur = this.blur;
                ctx.shadowColor = "gold";
                
                ctx.strokeRect(boxLeft, boxTop, this.maxTextWidth + this.xPadding * 2, this.h + this.yPadding * 2);
                
                ctx.shadowBlur = 0;
                ctx.fillStyle = this.color;
                ctx.fillText(this.options[i], this.x, this.y + (this.h + this.yPadding * 2) * (i + 1));
                ctx.globalAlpha = 0.2;
                ctx.strokeText(this.options[i], this.x, this.y + (this.h + this.yPadding * 2) * (i + 1));
                ctx.globalAlpha = 1;

            }
        }


        ctx.shadowBlur = 0;
    }
    setFont()
    {
        this.font = this.fontSize + "px 'Outfit'";
    }
    updateSize()
    {
        this.setFont();
        ctx.font = this.font;
        let textMetrics = ctx.measureText(this.options[this.selected]);
        this.w = textMetrics.width;
        this.h = this.fontSize;
    }
}

let dropdown = new Dropdown(canvas.width * 0.5 - 200, canvas.height * 0.5 - 80, 200, 50, "Method", ["BB-form", "NLI"]);

const dropdowns = [];
dropdowns.push(dropdown);

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
        this.font = "60px 'Outfit'";
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

let volume = 1;
if (localStorage.getItem('volume')) {
    volume = localStorage.getItem('volume');
} else {
    localStorage.setItem('volume', volume)
}

let degreeSlider = new Slider(canvas.width / 2 + 90, canvas.height / 2 - 105, 250, 40, 1, 30, 1, volume, "Degree");