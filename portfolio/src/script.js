const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');
let particlesArray = [];

// Determine which page we are on
const isShowcase = document.body.id === 'page-showcase';
const isInteractivePage = document.body.id === 'page-projects' || document.body.id === 'page-resume';

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
            if (Math.abs(dx) < mouse.radius && Math.abs(dy) < mouse.radius) {
                let distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < mouse.radius) {
                    const forceDirectionX = dx / distance;
                    const forceDirectionY = dy / distance;
                    const force = (mouse.radius - distance) / mouse.radius;
                    
                    const moveX = forceDirectionX * force * this.density * 20;
                    const moveY = forceDirectionY * force * this.density * 20;
                    
                    this.x -= moveX * deltaTime;
                    this.y -= moveY * deltaTime;
                }
            } else {
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
                this.circuitTimer += deltaTime * speedMultiplier * 60;
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
                this.x += this.speedX * 4 * speedMultiplier * deltaTime;
                this.y += this.speedY * 0.2 * speedMultiplier * deltaTime;
            } else {
                this.x += this.speedX * speedMultiplier * deltaTime;
                this.y += this.speedY * speedMultiplier * deltaTime;
            }

            if (this.x > canvas.width) this.x = 0;
            if (this.x < 0) this.x = canvas.width;
            if (this.y > canvas.height) this.y = 0;
            if (this.y < 0) this.y = canvas.height;
        }
    }

    draw(neighbors) {
        let activeColor = 'rgba(255, 255, 255, 0.3)'; 
        let currentType = 'default';
        let currentSection = null; // We need the whole section object now

        if (isShowcase) {
            const absoluteY = this.y + window.scrollY;
            for(let sec of sectionMap) {
                if (absoluteY >= sec.top && absoluteY < sec.bottom) {
                    activeColor = sec.color;
                    currentType = sec.type;
                    currentSection = sec;
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

        // --- OPTIMIZED NETWORK DRAWING WITH LINE CHOPPING ---
        if (currentType === 'network') {
            for (let p of neighbors) {
                if (p === this) continue;

                let dx = this.x - p.x;
                let dy = this.y - p.y;
                let distSq = dx * dx + dy * dy;
                let connDistSq = connectionDistance * connectionDistance;

                if (distSq < connDistSq) {
                    let distance = Math.sqrt(distSq);
                    let opacity = 1 - (distance / connectionDistance);
                    
                    // 1. Identify Neighbor's Section
                    let pAbsY = p.y + window.scrollY;
                    let pSection = null;
                    if (isShowcase) {
                         for(let sec of sectionMap) {
                             if (pAbsY >= sec.top && pAbsY < sec.bottom) {
                                 pSection = sec;
                                 break;
                             }
                         }
                    }
                    
                    let pColor = pSection ? pSection.color : activeColor;

                    // 2. If sections differ, split the line!
                    if (currentSection && pSection && currentSection !== pSection) {
                        
                        // Determine the boundary Y (Absolute)
                        // If I am above neighbor, boundary is my bottom. If below, my top.
                        let boundaryAbsY = (this.y < p.y) ? currentSection.bottom : currentSection.top;
                        let boundaryScreenY = boundaryAbsY - window.scrollY;
                        
                        // Linear Interpolation to find Intersection X
                        // t = (Y_target - Y_start) / (Y_end - Y_start)
                        let t = (boundaryScreenY - this.y) / (p.y - this.y);
                        let splitX = this.x + t * (p.x - this.x);
                        
                        // Draw Segment 1 (My Color)
                        ctx.beginPath();
                        ctx.strokeStyle = activeColor.replace('1)', opacity + ')');
                        ctx.lineWidth = 1;
                        ctx.moveTo(this.x, this.y);
                        ctx.lineTo(splitX, boundaryScreenY);
                        ctx.stroke();

                        // Draw Segment 2 (Neighbor Color)
                        ctx.beginPath();
                        ctx.strokeStyle = pColor.replace('1)', opacity + ')');
                        ctx.lineWidth = 1;
                        ctx.moveTo(splitX, boundaryScreenY);
                        ctx.lineTo(p.x, p.y);
                        ctx.stroke();

                    } else {
                        // 3. Standard Single Line Draw
                        ctx.beginPath();
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
}

// 3. Init
function init() {
    particlesArray = [];
    let numberOfParticles = (canvas.width * canvas.height) / 10000;
    
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

const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+";

function instantScramble(element) {
    // 1. Setup
    const originalText = element.dataset.value; 
    let iterations = 0;
    
    // 2. Make visible immediately
    element.style.visibility = 'visible';
    
    // 3. Adaptive Speed: 
    // We want everything to finish in roughly 15 frames (0.25 seconds)
    // So we calculate how many characters to reveal per frame.
    const length = originalText.length;
    const step = Math.max(1, Math.ceil(length / 15)); 

    const interval = setInterval(() => {
        element.innerText = originalText
            .split("")
            .map((letter, index) => {
                // Formatting: Keep spaces and newlines clean
                if (letter === " " || letter === "\n") return letter;
                
                // If we passed this index, show real letter
                if(index < iterations) {
                    return originalText[index];
                }
                // Otherwise, show random tech character
                return chars[Math.floor(Math.random() * chars.length)];
            })
            .join("");
        
        // 4. Resolve Condition
        if(iterations >= length) { 
            clearInterval(interval);
            element.innerText = originalText; // Ensure perfect finish
        }
        
        // 5. Increment
        iterations += step; 

    }, 20); // Run every 20ms
}

// Observer Logic
document.addEventListener("DOMContentLoaded", () => {
    
    // Select EVERYTHING containing text
    // We exclude the .link-text in the footer to avoid breaking the hover effect
    const targets = document.querySelectorAll('h1, h2, h3, p:not(.link-text), .tags span, .showcase-btn, .contact-btn, .bio-text');

    targets.forEach(el => {
        // Store original text
        el.dataset.value = el.innerText;
        
        // Hide initially to prevent "flash of unstyled content"
        el.style.visibility = 'hidden'; 
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = entry.target;
                
                // Run the effect immediately
                instantScramble(target);

                // Stop observing so it doesn't run again
                observer.unobserve(target);
            }
        });
    }, {
        threshold: 0.1 // Trigger as soon as 10% is visible (Instant feel)
    });

    targets.forEach(el => observer.observe(el));    
});