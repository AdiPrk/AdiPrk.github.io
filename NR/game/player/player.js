const playerImage = new Image()
//playerImage.src = "assets/images/player.png";

class Player extends Entity {
    constructor(info) {
        super(info);
        
        this.speed = 2;
        this.jumpStrength = 1.1;
        this.upHeldSinceJump = false;

        this.grounded = false;
        this.friction = 0.75;

        this.spawn = {
            x: null,
            y: null
        };

        this.facing = "right";
        this.orb = new Orb(this);
        this.orbFreeze = false;
        this.stopKeyboardInput = false;

        this.maxLives = 5;
        this.lives = this.maxLives;
        this.dead = false;

        this.shadowBlur = 0;
        this.shadowColor = "white";
    }
    update() {
        // Movement
        if (game.dialogue) {
            this.gravityOnly();
        }
        else {
            if (!this.orbFreeze) {
                this.regularMovement();
            }

            // Powers
            this.orb.update();   
        } 

        if (this.dead) {
            this.respawn();
        }
    }
    regularMovement() {
        // Left and right movement
        if (!this.stopKeyboardInput) {
            if (Keys.left) {
                this.vx -= this.speed;
                this.facing = "left";
            } else if (Keys.right) {
                this.vx += this.speed;
                this.facing = "right";
            }
        }

        // If grounded, set player can jump
        if (this.grounded) {
            this.canJump = true;
            this.vy = 0;
        }

        // Gravity
        if (!Keys.down) {
            if (this.vy < 20) {
                this.vy += game.gravity;
            } else {
                this.vy = lerp(this.vy, 20, 0.1);
            }
        }
        
        if (this.vy < 25 && Keys.down && !this.stopKeyboardInput) {
            if (this.vy < 20) {
                this.vy += game.gravity * 1.2;
            } else {
                this.vy = lerp(this.vy, 25, 0.1);
            }
        }	

        // Friction
        this.vx *= this.friction;
        if (!this.grounded && !Keys.left && !Keys.right) {
            this.vx *= this.friction;
        }
        this.ax *= 0.7;
        this.ay *= 0.7;

        // Jump
        if (Keys.c == false && this.upHeldSinceJump == true) {
            this.upHeldSinceJump = false;
        } else if (this.upHeldSinceJump == true) {
            this.vy -= game.gravity * 0.5;
        }

        if (!this.stopKeyboardInput && Keys.c && this.grounded && this.upHeldSinceJump == false) {
            this.grounded = false;
            this.vy = -this.jumpStrength * 10;

            this.upHeldSinceJump = true;
        }

        if (Math.abs(this.vx) < 0.01) this.vx = 0;
        if (Math.abs(this.vy) < 0.01) this.vy = 0;

        // Update Position
        this.grounded = false;

        this.vx += this.ax;
        this.vy += this.ay;
        this.x += this.vx;
        this.y += this.vy;
        
        this.handleCollisionsSAT();

        if (this.dead) {
            this.respawn();
        }
        
        this.handleOutOfBounds();
    }
    gravityOnly() {
        
    }
    handleCollisionsSAT() {
        this.updateCollider();
        for (let i = 0; i < game.room.entities.length; i++) {
            let ent = game.room.entities[i];
            let response = new SAT.Response();
            let collided = SAT.testPolygonPolygon(ent.collider, this.collider, response);

            if (collided) {
				if (this.dead) {
                    break;
                }
				
                switch (ent.type) {
                    case 3: { // Normal
                        this.x += response.overlapV.x;
                        this.y += response.overlapV.y;
                        this.updateCollider();
                        
                        if (response.overlapV.y > 0 && this.vy < 0) {
                            this.vy = 0;
                        }
                        if (response.overlapV.y < 0 && this.vy > 0) {
                            this.vy = 0;
                            this.grounded = true;
                        }
                        break;
                    }
                    case 4:
                    case 5: {
                        // Lava
                        // Crawler
                        this.dead = true;
                        this.lives--;
                        break;
                    }
                    case 6: {
                        // Help Text Trigger
                        if (ent.text.slice(0,4).toLowerCase() == "dash") {
                            if (!this.orb.unlockedPowers.includes("dash")) {
                                this.orb.unlockedPowers.push("dash");
                            }
                        }
                        
                        game.setHelpText(ent.text);
                        break;
                    }
                    case 8: {
                        // Cutscenes
                        if (ent.disabled) break;
                        if (ent.cutsceneName == "Starting") {
                            this.stopKeyboardInput = true;
                            ent.disabled = true;
                            game.removedBlocks.push(ent);
                            
                            for (let i = 0; i < gameFGParticles.length; i++) {
                                let p = gameFGParticles[i];
                                p.speed = 0.1;
                            }
                            game.switchGameState("StartingCutscene");
                        }
                        break;
                    }
                    case 12: {
                        if (ent.disabled) break;
                        this.x += response.overlapV.x;
                        this.y += response.overlapV.y;
                        this.ax += response.overlapV.x * 3;
                        this.ay += response.overlapV.y * 3;
                        game.removedBlocks.push(ent);
                        ent.offsetSpeed = 2.5;
                        game.startingCutDarkBlock = ent;
                        this.updateCollider();
                        
                        break;
                    }
                    case 13: {
                        camera.xOffset = parseInt(ent.offsetX);
                        camera.yOffset = parseInt(ent.offsetY);
                        break;
                    }
                    default: {
                        throw ("add collisions for " + ent.type + " 💀")
                        break;
                    }
                }
            }
        }
    }
    handleOutOfBounds() {
        if (FullyInRectVsRect(this, game.roomBounds)) return;
        
        let nextRoom = FindNextRoom();

        // Check for Solid Walls
        if ((game.room.solidLeftWall || !nextRoom) && this.x < game.roomBounds.x) {
            this.x = game.roomBounds.x;
        }
        if ((game.room.solidRightWall || !nextRoom) && this.x + this.w > game.roomBounds.x + game.roomBounds.w) {
            this.x = game.roomBounds.x + game.roomBounds.w - this.w;
        }
        if (game.room.solidTopWall && this.y < game.roomBounds.y) {
            this.y = game.roomBounds.y;
            this.vy = 0;
        }
        if (game.room.solidBottomWall && this.y + this.h > game.roomBounds.y + game.roomBounds.h) {
            this.y = game.roomBounds.y + game.roomBounds.h - this.h;
            this.grounded = true;
        }

        // If fully inside room, exit if statement
        if (RectVsRect(this, game.roomBounds)) return;

        // If there is a new room, create it.
        if (nextRoom) {
            createArea(game.chapter, nextRoom);
            this.handleCollisionsSAT();
        } else {
            if (!game.room.solidBottomWall && this.y + this.h > game.roomBounds.y + game.roomBounds.h) {
                this.respawn();
            }
        }
    }
    respawn() {
        if (this.orb.dashing) {
            this.orb.stopDashing();
        }

        game.freeze = 750;
        this.moveToSpawn();
        this.vx = 0;
        this.vy = 0;
        
        if (this.dead) {
            this.dead = false;
            
            if (this.lives <= 0) {
                game.freeze = 1500;
                this.lives = this.maxLives;
            }
        }
    }
    setSpawn(x, y) {
        this.spawn.x = x;
        this.spawn.y = y;
    }
    moveToSpawn() {
        this.x = this.spawn.x;
        this.y = this.spawn.y;
    }
    renderPlayer() {        
        // Render Player
        ctx.fillStyle = "rgb(180, 240, 180)";
        
        if (this.orb.dashing == true) {
            ctx.globalAlpha = 0.1;
        }
        
        ctx.shadowBlur = this.shadowBlur;
        ctx.shadowColor = this.shadowColor;
        
        ctx.fillRect(this.lerpedX, this.lerpedY, this.w, this.h);

        // Orb
        let arcLen = this.orb.unlockedPowers.length / this.orb.powers.length * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(this.lerpedX + this.w / 2, this.lerpedY + this.h / 2, 8, 0, Math.PI * 2);
        ctx.fillStyle = "black";
        ctx.fill();
        ctx.closePath();

        ctx.beginPath();
        ctx.moveTo(this.lerpedX + this.w / 2, this.lerpedY + this.h / 2);
        ctx.arc(this.lerpedX + this.w / 2, this.lerpedY + this.h / 2, 8, 0, arcLen);
        ctx.fillStyle = "purple";
        ctx.fill();
        ctx.closePath();
        
        ctx.globalAlpha = 1;
    }
}