class Room {
    constructor(info) {
        Object.assign(this, info);

        console.log(this.solidLeftWall)
        
        this.noSolidWalls = false;
        
        if (!this.solidLeftWall && !this.solidRightWall && !this.solidTopWall && !this.solidBottomWall) {
            this.noSolidWalls = true;
        }
    }
    Render() {
        ctx.fillStyle = this.background;
        ctx.fillRect(this.x, this.y, this.w, this.h);
    }
}