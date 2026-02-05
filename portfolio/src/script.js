const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');
let particlesArray = [];

// Determine which page we are on
const isShowcase = document.body.id === 'page-showcase';
const isInteractivePage = document.body.id === 'page-projects' || document.body.id === 'page-resume';

// Variables for Showcase Scroll Logic
let sectionMap = [];

// Variables for Mouse Interaction (Projects Page)
const mouse = { x: null, y: null, radius: 150 };

// 1. Resize & Setup
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (isShowcase) mapSections();
}

function mapSections() {
    sectionMap = [];
    const sections = document.querySelectorAll('.full-screen');
    sections.forEach(sec => {
        const rect = sec.getBoundingClientRect();
        sectionMap.push({
            top: rect.top + window.scrollY,
            bottom: rect.top + window.scrollY + rect.height,
            color: `rgba(${sec.dataset.color}, 1)`
        });
    });
}

// 2. The Particle
class Particle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 1;
        this.baseX = this.x;
        this.baseY = this.y;
        this.density = (Math.random() * 30) + 1;
        
        // Movement speed
        this.speedX = Math.random() * 1 - 0.5;
        this.speedY = Math.random() * 1 - 0.5;
    }

    update() {
        // --- LOGIC A: MOUSE INTERACTION (Projects Page) ---
        if (isInteractivePage && mouse.x != null) {
            let dx = mouse.x - this.x;
            let dy = mouse.y - this.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < mouse.radius) {
                // Move particle away from mouse
                const forceDirectionX = dx / distance;
                const forceDirectionY = dy / distance;
                const force = (mouse.radius - distance) / mouse.radius;
                const directionX = forceDirectionX * force * this.density;
                const directionY = forceDirectionY * force * this.density;
                this.x -= directionX;
                this.y -= directionY;
            } else {
                // Return to original position slowly
                if (this.x !== this.baseX) {
                    let dx = this.x - this.baseX;
                    this.x -= dx / 10;
                }
                if (this.y !== this.baseY) {
                    let dy = this.y - this.baseY;
                    this.y -= dy / 10;
                }
            }
        } 
        // --- LOGIC B: FREE FLOAT (Showcase Page) ---
        else {
            this.x += this.speedX;
            this.y += this.speedY;
            if (this.x > canvas.width || this.x < 0) this.speedX *= -1;
            if (this.y > canvas.height || this.y < 0) this.speedY *= -1;
        }
    }

    draw() {
        let activeColor = 'rgba(255,255,255,0.3)'; // Default

        // If on Showcase, color depends on scroll position
        if (isShowcase) {
            const absoluteY = this.y + window.scrollY;
            for(let sec of sectionMap) {
                if (absoluteY >= sec.top && absoluteY < sec.bottom) {
                    activeColor = sec.color;
                    break;
                }
            }
        } 
        // If on Projects, particles are Blue/White
        else if (isInteractivePage) {
            activeColor = 'rgba(100, 200, 255, 0.5)';
        }

        ctx.fillStyle = activeColor;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
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

// 4. Loop
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].update();
        particlesArray[i].draw();
    }
    requestAnimationFrame(animate);
}

// Event Listeners
window.addEventListener('resize', () => {
    resize();
    init();
});

// Mouse listeners for interaction
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
animate();