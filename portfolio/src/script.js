const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');
let particlesArray = [];

// Determine which page we are on
const isShowcase = document.body.id === 'page-showcase';
const isInteractivePage = document.body.id === 'page-projects' || 
                          document.body.id === 'page-resume' || 
                          document.body.id === 'page-contact';

// Variables for Showcase Scroll Logic
let sectionMap = [];

// Variables for Mouse Interaction
const mouse = { x: null, y: null, radius: 150 };

// Time tracking for Delta Time
let lastTime = 0;

// This class divides the screen into boxes. Particles only look for friends 
// in their own box or neighbor boxes.
class ParticleGrid {
    constructor(cellSize) {
        this.cellSize = cellSize;
        this.grid = new Map();
    }

    clear() {
        this.grid.clear();
    }

    // Add a particle to the correct grid cell
    insert(particle) {
        // Calculate grid keys (e.g., "5,3")
        const col = Math.floor(particle.x / this.cellSize);
        const row = Math.floor(particle.y / this.cellSize);
        const key = `${col},${row}`;

        if (!this.grid.has(key)) {
            this.grid.set(key, []);
        }
        this.grid.get(key).push(particle);
    }

    // Find nearby particles without checking everyone
    query(particle) {
        const col = Math.floor(particle.x / this.cellSize);
        const row = Math.floor(particle.y / this.cellSize);
        let neighbors = [];

        // Check the 3x3 grid around the particle
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                const key = `${col + i},${row + j}`;
                if (this.grid.has(key)) {
                    neighbors = neighbors.concat(this.grid.get(key));
                }
            }
        }
        return neighbors;
    }
}

// Connection radius for lines (and grid cell size)
const connectionDistance = 100;
const particleGrid = new ParticleGrid(connectionDistance);


// 1. Resize & Setup
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (isShowcase) mapSections();
}

function mapSections() {
    sectionMap = [];
    const sections = document.querySelectorAll('.showcase-section');
    sections.forEach(sec => {
        const rect = sec.getBoundingClientRect();
        sectionMap.push({
            top: rect.top + window.scrollY,
            bottom: rect.top + window.scrollY + rect.height,
            color: `rgba(${sec.dataset.color}, 1)`,
            type: sec.dataset.type
        });
    });
}

// 2. The Particle Class
class Particle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 1;
        this.baseX = this.x;
        this.baseY = this.y;
        this.density = (Math.random() * 30) + 1;
        
        // Base Speed (Pixels per SECOND now, not per frame)
        // We multiply by ~60 to match previous feel on 60hz screens
        this.speedX = (Math.random() * 2 - 1) * 60; 
        this.speedY = (Math.random() * 2 - 1) * 60;
        
        // Circuit Mode Specifics
        this.axisLock = Math.random() > 0.5 ? 'x' : 'y';
        this.circuitTimer = 0;
    }

    update(deltaTime) {
        // --- SCENARIO 1: INTERACTIVE PAGES ---
        if (isInteractivePage && mouse.x != null) {
            let dx = mouse.x - this.x;
            let dy = mouse.y - this.y;
            // Cheap distance check first (bounding box) to avoid sqrt
            if (Math.abs(dx) < mouse.radius && Math.abs(dy) < mouse.radius) {
                let distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < mouse.radius) {
                    const forceDirectionX = dx / distance;
                    const forceDirectionY = dy / distance;
                    const force = (mouse.radius - distance) / mouse.radius;
                    
                    // Apply movement with Delta Time
                    const moveX = forceDirectionX * force * this.density * 20; // boost for dt
                    const moveY = forceDirectionY * force * this.density * 20;
                    
                    this.x -= moveX * deltaTime;
                    this.y -= moveY * deltaTime;
                }
            } else {
                // Return to base
                if (this.x !== this.baseX) { 
                    let dx = this.x - this.baseX; 
                    this.x -= dx * 5 * deltaTime; 
                }
                if (this.y !== this.baseY) { 
                    let dy = this.y - this.baseY; 
                    this.y -= dy * 5 * deltaTime; 
                }
            }
        } 
        
        // --- SCENARIO 2: SHOWCASE PAGE ---
        else if (isShowcase) {
            const absoluteY = this.y + window.scrollY;
            let currentType = 'default';

            for(let sec of sectionMap) {
                if (absoluteY >= sec.top && absoluteY < sec.bottom) {
                    currentType = sec.type;
                    break;
                }
            }

            let speedMultiplier = 0.05;
            if (currentType === 'circuit') {
                // CIRCUIT
                this.circuitTimer += deltaTime * speedMultiplier * 60; // Normalize timer to frames
                if (this.circuitTimer > 60) {
                    this.axisLock = this.axisLock === 'x' ? 'y' : 'x';
                    this.circuitTimer = 0;
                }
                
                if (this.axisLock === 'x') {
                    this.x += this.speedX * 2 * speedMultiplier * deltaTime;
                } else {
                    this.y += this.speedY * 2 * speedMultiplier * deltaTime;
                }

            } else if (currentType === 'stream') {
                // STREAM
                this.x += this.speedX * 4 * speedMultiplier * deltaTime;
                this.y += this.speedY * 0.2 * speedMultiplier * deltaTime;
                
            } else {
                // DEFAULT
                this.x += this.speedX * speedMultiplier * deltaTime;
                this.y += this.speedY * speedMultiplier * deltaTime;
            }

            // Edge Wrapping
            if (this.x > canvas.width) this.x = 0;
            if (this.x < 0) this.x = canvas.width;
            if (this.y > canvas.height) this.y = 0;
            if (this.y < 0) this.y = canvas.height;
        }
    }

    draw(neighbors) {
        let activeColor = 'rgba(255, 255, 255, 0.3)'; 
        let currentType = 'default';

        if (isShowcase) {
            const absoluteY = this.y + window.scrollY;
            for(let sec of sectionMap) {
                if (absoluteY >= sec.top && absoluteY < sec.bottom) {
                    activeColor = sec.color;
                    currentType = sec.type;
                    break;
                }
            }
        } else if (isInteractivePage) {
            activeColor = 'rgba(100, 200, 255, 0.5)';
        }

        ctx.fillStyle = activeColor;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();

        // --- OPTIMIZED NETWORK DRAWING ---
        if (currentType === 'network') {
            // We use the 'neighbors' passed from the grid query, NOT the full array
            for (let p of neighbors) {
                if (p === this) continue;

                let dx = this.x - p.x;
                let dy = this.y - p.y;
                // Optimization: compare squared distance to avoid Math.sqrt
                let distSq = dx * dx + dy * dy;
                let connDistSq = connectionDistance * connectionDistance;

                if (distSq < connDistSq) {
                    ctx.beginPath();
                    // We only do the sqrt here for opacity calculation
                    let distance = Math.sqrt(distSq);
                    let opacity = 1 - (distance / connectionDistance);
                    
                    let lineColor = activeColor.replace('1)', opacity + ')');
                    ctx.strokeStyle = lineColor;
                    ctx.lineWidth = 1;
                    ctx.moveTo(this.x, this.y);
                    ctx.lineTo(p.x, p.y);
                    ctx.stroke();
                }
            }
        }
    }
}

// 3. Init
function init() {
    particlesArray = [];
    let numberOfParticles = (canvas.width * canvas.height) / 7500;
    
    for (let i = 0; i < numberOfParticles; i++) {
        particlesArray.push(new Particle());
    }
    if (isShowcase) mapSections();
}

// 4. Animation Loop with Delta Time
function animate(timeStamp) {
    // Delta Time Calculation
    if (!lastTime) lastTime = timeStamp;
    deltaTime = (timeStamp - lastTime) / 1000; // Time in seconds
    lastTime = timeStamp;
    
    deltaTime = Math.min(deltaTime, 0.1);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Clear the spatial grid for this frame
    particleGrid.clear();

    // 1. Update all particles & Insert into Grid
    for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].update(deltaTime);
        particleGrid.insert(particlesArray[i]);
    }

    // 2. Query Grid & Draw
    for (let i = 0; i < particlesArray.length; i++) {
        // Query the grid for neighbors specifically for this particle
        const neighbors = particleGrid.query(particlesArray[i]);
        particlesArray[i].draw(neighbors);
    }
    
    requestAnimationFrame(animate);
}

// Event Listeners
window.addEventListener('resize', () => {
    resize();
    init();
});

window.addEventListener('mousemove', (e) => {
    mouse.x = e.x;
    mouse.y = e.y;
});
window.addEventListener('mouseout', () => {
    mouse.x = null;
    mouse.y = null;
});

// Start
resize();
init();
requestAnimationFrame(animate);