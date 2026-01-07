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

        ctx.fillStyle = "white";
        ctx.globalAlpha = 0.2;
        ctx.beginPath();
        ctx.arc(this.drawX, this.drawY, 10, 0, 2 * Math.PI);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "white";
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
    }
    update()
    {
        let placePoint = false;

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

// Bernstein Polynomial Class
class BernsteinPolynomial {
    constructor(degree, method) {
        this.degree = degree;
        this.coefficients = Array.from({ length: degree + 1 }, () => 1); // Default coefficients
        this.controlPoints = this.coefficients.map((a, i) => new Point(i / degree, a));
        this.method = method;
    }

    computeNLI(t) {
        let temp = [...this.coefficients];

        for (let d = 1; d <= this.degree; d++) {
            for (let i = 0; i <= this.degree - d; i++) {
                temp[i] = (1 - t) * temp[i] + t * temp[i + 1];
            }
        }

        return temp[0];
    }

    computeBB(t) {
        let sum = 0;
        for (let i = 0; i <= this.degree; i++) {
            const binomial = this.binomialCoefficient(this.degree, i);
            sum += binomial * this.coefficients[i] * Math.pow(1 - t, this.degree - i) * Math.pow(t, i);
        }   
        return sum;
    }

    binomialCoefficient(n, k) {
        let coeff = 1;
        for (let i = 0; i < k; i++) {
            coeff *= (n - i) / (i + 1);
        }
        return coeff;
    }

    draw() {
        const method = this.method;
        ctx.strokeStyle = "lime";
        ctx.lineWidth = 2;
        ctx.beginPath();
        let prevX = 0, prevY = this.computeNLI(0);
        if (method === "BB-form") prevY = this.computeBB(0);
        
        for (let t = 0; t <= 1.01; t += 0.01) {
            const x = scaleBetweenRanges(t, graphInfo.xMin, graphInfo.xMax, 0, canvas.width);
            const y = scaleBetweenRanges(
                method === "NLI" ? this.computeNLI(t) : this.computeBB(t),
                graphInfo.yMin,
                graphInfo.yMax,
                canvas.height,
                0
            );
            if (t === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
            prevX = x;
            prevY = y;
        }
        ctx.stroke();

        // Draw control points
        this.controlPoints.forEach(point => point.draw());
    }

    update()
    {
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

                pointToUpdate.drawY = newY;
                pointToUpdate.y = scaleBetweenRanges(newY, canvas.height, 0, graphInfo.yMin, graphInfo.yMax);
                this.coefficients[n] = pointToUpdate.y;
            }
        }
    }
}

let poly = new BernsteinPolynomial(degreeSlider.value, "BB-form");

// Main Loop
function graphUpdateLoop() {
    // Update Accumulator
    const now = performance.now();
    const dt = Math.min(now - then, 150);
    then = now;
    accumulator += dt;

    // Update State
    while (accumulator >= timeStep) {
        graph.update();
        poly.update();
        graphButtons.forEach(b => b.update());
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
    graphButtons.forEach(b => b.render());
    poly.draw();

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