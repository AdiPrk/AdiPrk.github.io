class Entity {
    constructor(info) {
        Object.assign(this, info);

        this.prevX = this.x;
        this.prevY = this.y;
        this.lerpedX = this.x;
        this.lerpedY = this.y;

        this.vx = 0;
        this.vy = 0;
        this.ax = 0;
        this.ay = 0;

        this.type = parseInt(this.type) || null;

        this.collider = new SAT.Box(new SAT.Vector(this.x,this.y), this.w, this.h).toPolygon();
        this.alpha = 1;
    }
    setLerpedPosition(t) {
        this.lerpedX = lerp(this.prevX, this.x, t);
        this.lerpedY = lerp(this.prevY, this.y, t);
    }
    updateCollider() {
        this.collider.pos.x = this.x;
        this.collider.pos.y = this.y;
    }
    move() {
        
    }
    render() {
        
    }
}