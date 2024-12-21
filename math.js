function RectVsRect(r1, r2) {    
    return (r1.x < r2.x + r2.w && r1.x + r1.w > r2.x && r1.y < r2.y + r2.h && r1.y + r1.h > r2.y);
}

function RectVsRectPlusPixel(r1, r2) {
    return (r1.x <= r2.x + r2.w && r1.x + r1.w >= r2.x && r1.y <= r2.y + r2.h && r1.y + r1.h >= r2.y);
}

function FullyInRectVsRect(r1, r2) {
    return (r1.x >= r2.x && r1.x + r1.w <= r2.x + r2.w && r1.y >= r2.y && r1.y + r1.h <= r2.y + r2.h);
}

function RectVsPoint(r, p) {
    return (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
}

function lerp(start, end, t) {
    return start * (1 - t) + end * t;
}

function PointToRectDistance(p, r) {
    let px = clamp(r.x, r.x + r.w, p.x);
    let py = clamp(r.y, r.y + r.h, p.y);
    let dx = p.x - px;
    let dy = p.y - py;
    return Math.sqrt(dx*dx + dy*dy);
}

function scaleBetweenRanges(number, inMin, inMax, outMin, outMax) {
    return (number - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}

function clamp(min, max, val){
  if (val < min) return min
  if (val > max) return max
  return val
}

function distance(x1, y1, x2, y2) {
    return Math.sqrt((y2 - y1) ** 2 + (x2 - x1) ** 2)
}

function roundToGrid(number, gridSize) {
    if (number > -gridSize / 2) {
        return (number + gridSize/2) - (number + gridSize/2) % gridSize;
    }

    return (number + gridSize/2) - (number + gridSize/2) % gridSize - gridSize;
}

function gaussianRandom(mean=0, stdev=1) {
    let u = 1 - Math.random(); //Converting [0,1) to (0,1)
    let v = Math.random();
    let z = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
    // Transform to the desired mean and standard deviation:
    return z * stdev + mean;
}