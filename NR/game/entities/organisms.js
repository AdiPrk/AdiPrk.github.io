class Organism extends Entity {
    constructor(info) {
        super(info);
        this.facing = Math.random() < 0.5 ? "left" : "right";
    }
}

class Crawler extends Organism {
    constructor(info) {
        super(info)    
        
        this.speed = 1.65;
        this.vx = this.facing == "left" ? -this.speed : this.speed;
        this.vy = 0;
        this.grounded = false;
        this.renderAngle = Math.random() * Math.PI * 2;
        this.crawlerCollider = new SAT.Box(new SAT.Vector(this.x,this.y), 5, 5).toPolygon();
    }
    updateCrawlerCollider() {
        if (this.vx < 0) {
            this.crawlerCollider.pos.x = this.x;
            this.crawlerCollider.pos.y = this.y + this.h;
        } else {
            this.crawlerCollider.pos.x = this.x + this.w - 5;
            this.crawlerCollider.pos.y = this.y + this.h;
        }
    }
    move() {        
        this.vy += game.gravity;
        this.prevX = this.x;
        this.prevY = this.y;
        this.x += this.vx;
        this.y += this.vy;
        this.updateCollider();
        this.updateCrawlerCollider();
        this.grounded = false;

        for (let i = 0; i < game.room.entities.length; i++) {
            let ent = game.room.entities[i];
            if (ent.id == this.id) continue;
            
            let response = new SAT.Response();
            let collided = SAT.testPolygonPolygon(ent.collider, this.collider, response);

            if (collided) {
                this.x += response.overlapV.x;
                this.y += response.overlapV.y;
                this.updateCollider();

                if (response.overlapV.x != 0) {
                    this.vx *= -1;
                }
                
                if (response.overlapV.y > 0 && this.vy > 0) {
                    this.vy = 0;
                }
                if (response.overlapV.y < 0 && this.vy > 0) {
                    this.vy = 0;
                    this.grounded = true;
                }
            }
        }

        for (let i = 0; i < game.room.entities.length; i++) {
            let ent = game.room.entities[i];
            if (ent.id == this.id) continue;
            
            let response = new SAT.Response();
            let collided = SAT.testPolygonPolygon(ent.collider, this.crawlerCollider, response);

            if (collided) {
                if (!response.bInA && this.grounded) {
                    this.vx *= -1;
                }
            }
        }
    }
    
    render(dt) {
        this.renderAngle += dt;
        
        this.facing = this.vx < 0 ? "left" : "right";
        ctx.fillStyle = "orange";
        ctx.fillRect(this.lerpedX, this.lerpedY, this.w, this.h);

        ctx.strokeStyle = "red";
        ctx.lineWidth = 2;
        ctx.strokeRect(this.lerpedX, this.lerpedY, this.w, this.h);

        let xDiff = this.lerpedX - this.x;
        let yDiff = this.lerpedY - this.y;
        
        ctx.fillStyle = "black";
        ctx.fillRect(this.x + this.w / 2 - this.w / 6, this.y + this.h / 2 - this.h / 6, this.w / 3, this.h / 3);
    }
}