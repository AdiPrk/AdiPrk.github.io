let helpTextBG = new Image();
helpTextBG.src = "assets/images/helpTextBG.png";

class Game {
    constructor() {
        this.player = new Player({
            x: 0,
            y: 0,
            w: 30,
            h: 45
        });
        
        this.gravity = 1;
        this.gameSpeed = timeStep;
        this.chapter = "Tutorial";
        this.room = null;
        this.deleteTempRoomIn = 0;
        this.freeze = 0;
        this.tempRooms = [];
        this.helpText = "";
        this.helpTextOpacity = 0;
        this.helpTextTimer = 0;
        this.gameState = "Title";
        this.lastGameState = "Title";
        this.removedBlocks = [];
    }
    switchGameState(state) {
        this.lastGameState = this.gameState;
        this.gameState = state;
    }
    setup() {
        createArea(this.chapter);
        this.player.moveToSpawn();
        this.setGameSpeed(1);
        SetCameraOnPlayer();
    }
    setGameSpeed(s) {
        this.gameSpeed = timeStep / s;
    }
    update() {
        if (this.freeze > 0) return;
        
        this.player.update();
        
        for (let i = 0; i < this.room.entities.length; i++) {
            let ent = this.room.entities[i];
            ent.move();
        }

        for (let i = 0; i < gameBGParticles.length; i++) {
            gameBGParticles[i].update();
        }
        for (let i = 0; i < gameFGParticles.length; i++) {
            gameFGParticles[i].update();
        }
    }
    createDialogue(text) {
        this.dialogue = text;
        ResetKeys();
    }
    render(t, dt) {
        let col = game?.room?.backgroundColor;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "black";
        ctx.globalAlpha = 0.9;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;

        // Set Lerped Positions
        this.player.setLerpedPosition(t);

        // Move Camera
        GlideCameraToPlayer(dt);
        
        // Translate Canvas
        const canvasTranslateX = canvas.width / 2 - camera.x * camera.scale;
        const canvasTranslateY = canvas.height / 2 - camera.y * camera.scale;

        ctx.translate(canvasTranslateX, canvasTranslateY);
        ctx.scale(camera.scale, camera.scale);

        // BG Particles
        for (let i = 0; i < gameBGParticles.length; i++) {
            gameBGParticles[i].render();
        }

        // Render Entities
        for (let i = 0; i < this.room.entities.length; i++) {
            let ent = this.room.entities[i];
            ent.setLerpedPosition(t);
            ent.render(dt);
        }

        let filterTempRooms = false;
        for (let r = 0; r < this.tempRooms.length; r++) {
            let room = this.tempRooms[r][0];
            this.tempRooms[r][1] -= dt;
            
            if(this.tempRooms[r][1] < 0) {
                room.delete = true;
                filterTempRooms = true;
            }
    
            for (let i = 0; i < room.entities.length; i++) {
                let ent = room.entities[i];
                
                ent.render(dt);
            }
        }

        if (filterTempRooms) {
            this.tempRooms = this.tempRooms.filter((e) => e[0].delete != true);
        }

        this.player.renderPlayer();

        // FG Particles
        for (let i = 0; i < gameFGParticles.length; i++) {
            gameFGParticles[i].render();
        }

        // Reset canvas transform
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        if (camera.darkness > 0) {
            ctx.globalAlpha = camera.darkness;
            ctx.fillStyle = "black";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalAlpha = 1;
        }

        this.renderDialogue();
        this.renderHelpText(dt);
    }
    setPreviousPositions() {
        this.player.prevX = this.player.x;
        this.player.prevY = this.player.y;
    }
    renderTopBarThing() {
        let x = 75;
        let y = 50;

        // Render Orb
        ctx.fillStyle = "white";
        if (this.player.orb.canDash) {
            ctx.fillStyle = "grey";
        }
        
        ctx.strokeStyle = "blue";
        ctx.beginPath();
        ctx.arc(x, y + 25, 40, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.closePath();
        
        // Render Player Lives
        x += 75;
        ctx.lineWidth = 4;
        
        ctx.strokeStyle = "rgb(140, 40, 40)";
        ctx.fillStyle = "white";
        
        for (let i = 0; i < this.player.lives; i++) {
            ctx.fillRect(x+80*i, y, 50, 50);
            ctx.strokeRect(x+80*i, y, 50, 50);
        }

        ctx.strokeStyle = "rgb(180, 40, 40)";
        ctx.fillStyle = "black";
        for (let i = Math.max(this.player.lives, 0); i < this.player.maxLives; i++) {
            ctx.fillRect(x+80*i, y, 50, 50);
            ctx.strokeRect(x+80*i, y, 50, 50);
        }
    }
    renderDialogue() {
        if (this.dialogue) {
            if (Keys.c) {
                this.dialogue = null;
                ResetKeys();
            }
        }
    }
    setHelpText(text) {
        this.helpText = text;
        this.helpTextTimer = 700;
    }
    renderHelpText(dt) {
        if (this.helpText == "Move: Arrow Keys" && (KeyBinds.left != "ArrowLeft" || KeyBinds.right != "ArrowRight")) {
            return;
        }
        if (this.helpText == "Jump: C" && KeyBinds.jump != "KeyC") {
            return;
        }
        
        if (this.helpTextTimer >= 0) {
            this.helpTextTimer -= dt;
        }

        if (this.helpText != "" && this.helpTextTimer >= 0) {
            if (Math.abs(1 - this.helpTextOpacity) > 0.0001) {
                this.helpTextOpacity = lerp(this.helpTextOpacity, 1, 0.008 * (dt / game.gameSpeed));
            }
        } else {
            if (Math.abs(this.helpTextOpacity) > 0.0001) {
                this.helpTextOpacity = lerp(this.helpTextOpacity, 0, 0.025 * (dt / game.gameSpeed));
            }
        }

        ctx.globalAlpha = this.helpTextOpacity;
        //ctx.fillStyle = "black";
        
        let textMetrics = ctx.measureText(this.helpText);

        ctx.globalAlpha = this.helpTextOpacity / 3;
        ctx.fillStyle = ctx.createPattern(helpTextBG, "repeat");
        ctx.beginPath();
        ctx.roundRect(canvas.width / 2 - textMetrics.width / 2 - 10, canvas.height * 0.75 - 37.5, textMetrics.width + 20, 70, [20]);
        ctx.fill();
        ctx.closePath();
        ctx.globalAlpha = this.helpTextOpacity;
        
        ctx.fillStyle = "white";
        ctx.font = "60px 'Outfit'"
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowBlur = 10;
        ctx.shadowColor = "aqua";
        
        ctx.fillText(this.helpText, canvas.width / 2, canvas.height * 0.75);

        ctx.shadowBlur = 0;        
        ctx.globalAlpha = 1;
    }
}