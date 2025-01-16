class Orb {
    constructor(owner) {
        this.owner = owner;

        this.powers = ["dash", "gravity"];
        this.unlockedPowers = [];

        // dash
        this.dashing = false;
        this.dashFrames = 12;
        this.dashFrameCounter = 0;
        this.dashBy = null;
        this.canDash = false;
        this.dashTimer = 0;
        this.dashCooldown = 600;
    }
    unlockAbility(abil) {
        if (!this.unlockedPowers.includes(abil)) {
            this.unlockedPowers.push(abil);
        }
    }
    updateTimers(dt) {
        this.dashTimer = Math.max(0, this.dashTimer - dt);
    }
    update() {
        if (!this.canDash && this.owner.grounded) this.canDash = true;
        
        // dash        
        if ((Keys.x && this.canDash && this.dashTimer <= 0) || this.dashing) {
            if (this.unlockedPowers.includes("dash")) {
                this.dash();
                this.dashTimer = this.dashCooldown;
            }
        }
    }
    dash() {
        this.canDash = false;
        this.owner.vx = 0;
        this.owner.vy = 0;

        // Calculate how much to move each frame
        if (!this.dashBy) {
            let tx = 0;
            let ty = 0;
    
            if (Keys.left) tx = -1;
            if (Keys.right) tx = 1;
            if (Keys.down) ty = 1;
            if (Keys.up) ty = -1;
    
            if (tx == 0 && ty == 0) {
                let dir = this.owner.facing;
                if (dir == "right") tx = 1;
                if (dir == "left") tx = -1;
            }
    
            let dist = 200;
            if (tx != 0 && ty != 0) dist *= 0.7071;

            this.dashBy = {
                x: tx == 0 ? 0 : (tx * dist) / this.dashFrames,
                y: ty == 0 ? 0 : (ty * dist) / this.dashFrames
            }
        }

        // Move the owner        
        if (this.dashFrameCounter < this.dashFrames) {         
            this.dashing = true;
            this.owner.orbFreeze = true;
            this.dashFrameCounter++;
            
            if (this.dashBy.x != 0) {
                this.owner.x += this.dashBy.x;
                this.owner.handleCollisionsSAT();
                this.owner.handleOutOfBounds();
            }
            if (this.dashBy.y != 0) {
                this.owner.y += this.dashBy.y;
                this.owner.handleCollisionsSAT();
                this.owner.handleOutOfBounds();
            }
        }
        else {
            this.stopDashing();
        }
    }
    stopDashing() {
        this.dashing = false;
        this.dashFrameCounter = 0;
        this.dashBy = null;
        this.owner.orbFreeze = false;
        this.dashTimer = this.dashCooldown;
    }
}