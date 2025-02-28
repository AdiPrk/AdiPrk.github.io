// Setup for the Fixed Time Loop
const frameRate = 60;
const timeStep = 1000 / frameRate;
let accumulator = 0;
let then = performance.now();

function DrawLine(x1, y1, x2, y2)
{
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.closePath();
}

class Point
{
    constructor(x, y)
    {
        this.x = x;
        this.y = y;
        this.drawX = scaleBetweenRanges(x, graphInfo.xMin, graphInfo.xMax, 0, canvas.width);
        this.drawY = scaleBetweenRanges(y, graphInfo.yMin, graphInfo.yMax, canvas.height, 0);
        this.selected = false;
    }
    draw()
    {
        if (!mouse.clicked) this.selected = false;

        if (!this.selected) {
            ctx.fillStyle = "white";
            ctx.strokeStyle = "white";
            ctx.globalAlpha = 0.2;
        }
        else {
            ctx.fillStyle = "lime";
            ctx.strokeStyle = "lime";
            ctx.globalAlpha = 0.9;
        }

        ctx.beginPath();
        ctx.arc(this.drawX, this.drawY, 10, 0, 2 * Math.PI);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.stroke();
        ctx.closePath();
    }
}

let points = [];

class Graph
{
    constructor()
    {
        this.xMin = graphInfo.xMin;
        this.xMax = graphInfo.xMax;
        this.yMin = graphInfo.yMin;
        this.yMax = graphInfo.yMax;
        this.xRange = this.xMax - this.xMin;
        this.yRange = this.yMax - this.yMin;
        this.mouseWasClicked = false;
        this.draggingPoint = false;
        this.mouseReleased = true;
    }
    update()
    {
        if (tSlider.hovered) return;
        let placePoint = false;

        // drag functionality
        this.draggingPoint = false;
        if (!mouse.clicked) this.mouseReleased = true;
        if (mouse.clicked)
        {
            let anySelected = false;
            for (let i = 0; i < points.length; i++)
            {
                if (points[i].selected)
                {
                    anySelected = true;
                    break;
                }
            }

            if (!anySelected) {
                for (let i = 0; i < points.length; i++)
                {
                    let point = points[i];
                    let dist = distance(point.drawX, point.drawY, mouse.x, mouse.y);
                    if (dist < 15)
                    {
                        point.selected = true;
                        this.mouseReleased = false;
                        break;
                    }
                }
            }
        }

        if (!this.mouseReleased) return;
        if (!mouse.clicked) this.mouseWasClicked = false;
        if (mouse.clicked && !this.mouseWasClicked)
        {
            this.mouseWasClicked = true;
            placePoint = true;
        }

        if (!placePoint) return;

        // get x and y using xScale and yScale
        let x = mouse.x / canvas.width;
        let y = 1 - mouse.y / canvas.height;

        x = x * this.xRange + this.xMin;
        y = y * this.yRange + this.yMin;

        console.log("new point");
        points.push(new Point(x, y));
    }
    draw()
    {
        ctx.strokeStyle = "white";
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.9;

        DrawLine(0, canvas.height * 0.5, canvas.width, canvas.height * 0.5);
        //DrawLine(canvas.width * 0.5, 0, canvas.width * 0.5, canvas.height);
        
        // text marking the locations on the graph

        ctx.font = "20px Outfit";
        ctx.fillStyle = "white";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText("(0, 0)", 10, canvas.height * 0.5 + 10);

        ctx.textAlign = "right";
        ctx.fillText("(1, 0)", canvas.width - 10, canvas.height * 0.5 + 10);
        
        // draw gridlines
        ctx.globalAlpha = 0.6;

        for (let i = this.xMin; i < this.xMax; i++)
        {
            // later
        }

        for (let i = this.yMin; i < this.yMax; i++)
        {
            let y = canvas.height * 0.5 + (i * canvas.height / (this.yRange));
            
            DrawLine(0, y, canvas.width, y);

            if (i != 0) {
                ctx.textAlign = "left";
                ctx.fillText("(0, " + (-i) + ")", 10, y + 10);
                ctx.textAlign = "right";
                ctx.fillText("(1, " + (-i) + ")", canvas.width - 10, y + 10);
            }
        }

        ctx.globalAlpha = 1;
    }
}

let graph = new Graph();

class BezierCurve {
    constructor(controlPoints, method = "NLI-form") {
        this.controlPoints = controlPoints;
        this.method = method; // "NLI-form", "BB-form", or "Midpoint-Subdivision"
        this.oldMethod = method;
        this.shells = [];
    }
    
    computeNLI(t, points, storeStuff = false) {
        if (points.length === 1) {
            return points[0];
        }

        let newPoints = [];
        for (let i = 0; i < points.length - 1; i++) {
            let x = (1 - t) * points[i].x + t * points[i + 1].x;
            let y = (1 - t) * points[i].y + t * points[i + 1].y;
            newPoints.push({ x, y });
        }

        if (storeStuff) {
            this.shells.push(newPoints);
        }

        return this.computeNLI(t, newPoints, storeStuff);
    }

    computeBB(t) {
        let n = this.controlPoints.length - 1;
        let result = { x: 0, y: 0 };
        for (let i = 0; i <= n; i++) {
            let binomial = this.binomialCoefficient(n, i) * Math.pow(1 - t, n - i) * Math.pow(t, i);
            result.x += binomial * this.controlPoints[i].x;
            result.y += binomial * this.controlPoints[i].y;
        }
        return result;
    }

    binomialCoefficient(n, k) {
        let coeff = 1;
        for (let i = 0; i < k; i++) {
            coeff *= (n - i) / (i + 1);
        }
        return coeff;
    }

    midpointSubdivision(points, depth) {
        if (depth === 0) return points;
        
        let left = [points[0]];
        let right = [points[points.length - 1]];
        let midpoints = [...points];
        
        while (midpoints.length > 1) {
            let newMidpoints = [];
            for (let i = 0; i < midpoints.length - 1; i++) {
                let x = (midpoints[i].x + midpoints[i + 1].x) / 2;
                let y = (midpoints[i].y + midpoints[i + 1].y) / 2;
                newMidpoints.push({ x, y });
            }
            left.push(newMidpoints[0]);
            right.unshift(newMidpoints[newMidpoints.length - 1]);
            midpoints = newMidpoints;
        }
        
        return [
            ...this.midpointSubdivision(left, depth - 1),
            midpoints[0],
            ...this.midpointSubdivision(right, depth - 1)
        ];
    }

    draw() {
        this.oldMethod = this.method;

        if (this.controlPoints.length < 2) return;

        // Draw control polygon
        ctx.setLineDash([15, 8]);
        ctx.globalAlpha = 0.3;
        for (let i = 0; i < this.controlPoints.length - 1; i++) {
            DrawLine(
                this.controlPoints[i].drawX,
                this.controlPoints[i].drawY,
                this.controlPoints[i + 1].drawX,
                this.controlPoints[i + 1].drawY,
                "gray"
            );
        }
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;

        // Draw Bézier curve based on selected method
        ctx.strokeStyle = "lime";
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        let curvePoints;
        this.shells = [];
        if (this.method === "NLI-form") {
            curvePoints = Array.from({ length: 101 }, (_, i) => this.computeNLI(i / 100, this.controlPoints));
            this.computeNLI(tSlider.value, this.controlPoints, true);
        } else if (this.method === "BB-form") {
            curvePoints = Array.from({ length: 101 }, (_, i) => this.computeBB(i / 100));
        } else if (this.method === "Midpoint-Subdivision") {
            curvePoints = this.midpointSubdivision(this.controlPoints, 4); // Higher depth for smoother curve
        }
        
        curvePoints.forEach((point, index) => {
            let drawX = scaleBetweenRanges(point.x, graphInfo.xMin, graphInfo.xMax, 0, canvas.width);
            let drawY = scaleBetweenRanges(point.y, graphInfo.yMin, graphInfo.yMax, canvas.height, 0);
            if (index === 0) ctx.moveTo(drawX, drawY);
            else ctx.lineTo(drawX, drawY);
        });
        ctx.stroke();

        // Draw shells if enabled
        ctx.lineWidth = 2;
        if (this.method == "NLI-form") 
        {
            ctx.globalAlpha = 0.3;
            ctx.strokeStyle = "silver";
            this.shells.forEach(shells => {
                shells.forEach((point, index) => {
                    // draw circle
                    let drawX = scaleBetweenRanges(point.x, graphInfo.xMin, graphInfo.xMax, 0, canvas.width);
                    let drawY = scaleBetweenRanges(point.y, graphInfo.yMin, graphInfo.yMax, canvas.height, 0);
                    ctx.beginPath();
                    ctx.arc(drawX, drawY, 5, 0, 2 * Math.PI);
                    ctx.stroke();
                    ctx.closePath();
                    
                    // line
                    ctx.setLineDash([15, 8]);
                    if (index > 0) {
                        let prevPoint = shells[index - 1];
                        let prevDrawX = scaleBetweenRanges(prevPoint.x, graphInfo.xMin, graphInfo.xMax, 0, canvas.width);
                        let prevDrawY = scaleBetweenRanges(prevPoint.y, graphInfo.yMin, graphInfo.yMax, canvas.height, 0);
                        DrawLine(prevDrawX, prevDrawY, drawX, drawY);
                    }
                    ctx.setLineDash([]);
                });
            });
            ctx.globalAlpha = 1;
        }

        // Draw control points
        this.controlPoints.forEach(point => point.draw());
    }

    update() {
        
    }
}

let bezier = new BezierCurve(points);

class NewtonForm {
    constructor(controlPoints) {
        this.controlPoints = controlPoints;
        this.xCoeffs = [];
        this.yCoeffs = [];
    }

    computeXCoeffs() {
        let d = this.controlPoints.length - 1;
        let coeffs = new Array(d + 1);
        for (let i = 0; i <= d; i++) {
            coeffs[i] = this.controlPoints[i].x;
        }

        for (let j = 1; j <= d; j++) {
            for (let i = d; i >= j; i--) {
                coeffs[i] = (coeffs[i] - coeffs[i - 1]) / j;
            }
        }

        this.xCoeffs = coeffs;
    }

    computeYCoeffs() {
        let d = this.controlPoints.length - 1;
        let coeffs = new Array(d + 1);
        for (let i = 0; i <= d; i++) {
            coeffs[i] = this.controlPoints[i].y;
        }

        for (let j = 1; j <= d; j++) {
            for (let i = d; i >= j; i--) {
                coeffs[i] = (coeffs[i] - coeffs[i - 1]) / j;
            }
        }

        this.yCoeffs = coeffs;
    }

    update()
    {
        if (graph.mouseWasClicked) {
            this.computeXCoeffs();
            this.computeYCoeffs();
            console.log("update");
        }

        if (mouse.clicked)
        {
            // check which point mouse is hovering on
            let anySelected = false;
            let pointToUpdate;

            let n = -1;
            
            for (let i = 0; i < this.controlPoints.length; i++)
            {
                let point = this.controlPoints[i];
                if (!point.selected) continue;

                n = i;
                anySelected = true;
                pointToUpdate = point;
                break;
            }

            if (!anySelected) {
                for (let i = 0; i < this.controlPoints.length; i++)
                {
                    let point = this.controlPoints[i];
                    let dist = distance(point.drawX, point.drawY, mouse.x, mouse.y);
                    if (dist < 15)
                    {
                        pointToUpdate = point;
                        n = i;
                    }
                }
            }

            if (n != -1) {
                pointToUpdate.selected = true;

                let newY = mouse.y;
                if (newY < 0) newY = 0;
                if (newY > canvas.height) newY = canvas.height;

                let newX = mouse.x;
                if (newX < 0) newX = 0;
                if (newX > canvas.width) newX = canvas.width;

                pointToUpdate.drawX = newX;
                pointToUpdate.drawY = newY;
                
                pointToUpdate.x = scaleBetweenRanges(newX, 0, canvas.width, graphInfo.xMin, graphInfo.xMax);
                pointToUpdate.y = scaleBetweenRanges(newY, canvas.height, 0, graphInfo.yMin, graphInfo.yMax);

                this.computeXCoeffs();
                this.computeYCoeffs();
            }
        }
    }

    computeX(t)
    {
        let result = this.xCoeffs[0];
        let term = 1;
        // For each additional coefficient, update the term and add its contribution.
        for (let i = 1; i < this.xCoeffs.length; i++) {
            term *= (t - (i - 1));  // Multiply by (t - previous t-value)
            result += this.xCoeffs[i] * term;
        }
        return result;
    }

    computeY(t)
    {
        let result = this.yCoeffs[0];
        let term = 1;
        // For each additional coefficient, update the term and add its contribution.
        for (let i = 1; i < this.yCoeffs.length; i++) {
            term *= (t - (i - 1));  // Multiply by (t - previous t-value)
            result += this.yCoeffs[i] * term;
        }
        return result;
    }

    draw()
    {
        let d = this.controlPoints.length - 1;
        if (d < 0) return;  // No points available.

        // Draw control points
        this.controlPoints.forEach(point => point.draw());

        // Draw Newton form curve
        ctx.strokeStyle = "lime";
        ctx.lineWidth = 2;
        ctx.beginPath();

        // We evaluate the curve over t in [0, d]. Adjust step for smoother curves.
        let tMax = d;
        let step = 0.0002;
        let x = this.computeX(0);
        let y = this.computeY(0);
        let drawX = scaleBetweenRanges(x, graphInfo.xMin, graphInfo.xMax, 0, canvas.width);
        let drawY = scaleBetweenRanges(y, graphInfo.yMin, graphInfo.yMax, canvas.height, 0);
        ctx.moveTo(drawX, drawY);

        for (let t = step; t <= tMax; t += step) {
            x = this.computeX(t);
            y = this.computeY(t);
            drawX = scaleBetweenRanges(x, graphInfo.xMin, graphInfo.xMax, 0, canvas.width);
            drawY = scaleBetweenRanges(y, graphInfo.yMin, graphInfo.yMax, canvas.height, 0);
            ctx.lineTo(drawX, drawY);
        }

        ctx.stroke();
        ctx.closePath();

        // Draw control polygon
        ctx.strokeStyle = "white";
        ctx.setLineDash([15, 8]);
        ctx.globalAlpha = 0.3;
        for (let i = 0; i < this.controlPoints.length - 1; i++) {
            DrawLine(
                this.controlPoints[i].drawX,
                this.controlPoints[i].drawY,
                this.controlPoints[i + 1].drawX,
                this.controlPoints[i + 1].drawY,
                "gray"
            );
        }
        ctx.setLineDash([]);

        ctx.globalAlpha = 1;
    }
}

let newtonForm = new NewtonForm(points);

// Main Loop
function graphUpdateLoop() {
    // Update Accumulator
    const now = performance.now();
    const dt = Math.min(now - then, 150);
    then = now;
    accumulator += dt;

    // Update State
    while (accumulator >= timeStep) {
        //graphButtons.forEach(b => b.update());
        graph.update();
        // bezier.update();
        //tSlider.update();
        newtonForm.update();
        //poly.update();
        accumulator -= timeStep;
    }

    // Render
    let t = accumulator / timeStep;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "white";
    ctx.lineWidth = 5;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    points.forEach(p => p.draw());
    graph.draw();
    //graphButtons.forEach(b => b.render());
    // bezier.draw();
    // if (bezier.method === "NLI-form") {
    //     tSlider.render();
    // }
    newtonForm.draw();

    // if no points, display text
    if (points.length == 0)
    {
        ctx.font = "40px Outfit";
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.shadowBlur = 10;
        ctx.shadowColor = "gold";

        ctx.fillText("Click on the graph to place points", canvas.width * 0.5, canvas.height * 0.5 - 70);

        ctx.shadowBlur = 0;
    }

    // Wait for the next frame
    if (game.state == "Graph") {
        requestAnimationFrame(graphUpdateLoop);
    }
    else {
        ctx.fillStyle = "black";
        ctx.globalAlpha = 0.5;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
        requestAnimationFrame(settingsUpdateLoop);
    }
}

window.onload = ()=>{
    requestAnimationFrame(graphUpdateLoop);
}