// Setup for the Fixed Time Loop
const frameRate = 60;
const timeStep = 1000 / frameRate;
let accumulator = 0;
let then = performance.now();

// Create the game object
const game = new Game();
game.setup();

// Main Game Loop
let screenFade = 1;
function updateGame() {
    // Update Accumulator
    const now = performance.now();
    const dt = Math.min(now - then, 150);
    then = now;
    accumulator += dt;

    // Update Game State
    let ts = dt * (timeStep / game.gameSpeed);
    if (game.freeze > 0) game.freeze -= ts;
    game.player.orb.updateTimers(ts);

    while (accumulator >= game.gameSpeed) {
        game.setPreviousPositions();
        game.update();
        accumulator -= game.gameSpeed;
    }

    // Render Game
    screenFade = Math.max(0.1, screenFade - dt / 4000);
    
    game.render(accumulator / game.gameSpeed, dt);

    ctx.fillStyle = "rgba(0, 0, 0,"+screenFade+")";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (Keys.esc) {
        game.switchGameState("Options");
    }
    
    // Wait for the next frame
    if (game.gameState == "Options") {
        screenFade = 0.25;
        requestAnimationFrame(optionsScreen);
    } else if (game.gameState == "StartingCutscene") {
        screenFade = 0.25;
        requestAnimationFrame(startingCutscene);
    } else {
        requestAnimationFrame(updateGame);
    }
}

function optionsScreen() {
    const now = performance.now();
    const dt = Math.min(now - then, 150);
    then = now;
    accumulator += dt;

    // Update Game State    
    while (accumulator >= game.gameSpeed) {
        for (let i = 0; i < optionsParticles.length; i++) {
            optionsParticles[i].update();
        }
        for (let i = 0; i < mouseParticles.length; i++) {
            mouseParticles[i].update();
        }
        audioSlider.update();
        menuBackButton.update();
        if (game.lastGameState == "Game") {
            menuHomeButton.update();
        }
        accumulator -= game.gameSpeed;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < optionsParticles.length; i++) {
        optionsParticles[i].render();
    }
    for (let i = 0; i < mouseParticles.length; i++) {
        mouseParticles[i].render();
    }
    
    screenFade = Math.max(0.1, screenFade - dt / 4000);

    ctx.font = "125px 'Outfit'";
    ctx.fillColor = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowBlur = "10";
    ctx.shadowColor = "aqua";

    ctx.fillStyle = "white";
    ctx.fillText("Options", canvas.width / 2, 120);

    ctx.shadowBlur = 0;

    audioSlider.render();

    ctx.font = "75px 'Outfit'";
    ctx.fillColor = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowBlur = "10";
    ctx.shadowColor = "aqua";

    ctx.fillStyle = "white";
    ctx.globalAlpha = 0.8;
    ctx.fillText("Keybinds", canvas.width / 2, 600);
    ctx.globalAlpha = 1;
    
    RenderAndUpdateKeybinds();

    menuBackButton.render();

    if (game.lastGameState == "Game") {
        menuHomeButton.render();
    }
    
    ctx.fillStyle = "rgba(0, 0, 0,"+screenFade+")";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    RenderCursor();

    if (game.gameState == "Title") {
        screenFade = 0.8;
        backgroundCanvas.style.background = "url('./assets/images/nrnewbgmin.png') no-repeat center center fixed";
        requestAnimationFrame(startScreen);
    } else if (game.gameState == "Game") {
        screenFade = 0.25;
        backgroundCanvas.style.background = "url('./assets/images/newGalBgmin.png') no-repeat center center fixed";
        requestAnimationFrame(updateGame);
    } else if (game.gameState == "Options") {
        requestAnimationFrame(optionsScreen);
    }
}

function creditsScreen() {
    const now = performance.now();
    const dt = Math.min(now - then, 150);
    then = now;
    accumulator += dt;

    // Update Game State    
    while (accumulator >= game.gameSpeed) {
        for (let i = 0; i < creditsParticles.length; i++) {
            creditsParticles[i].update();
        }
        for (let i = 0; i < mouseParticles.length; i++) {
            mouseParticles[i].update();
        }
        accumulator -= game.gameSpeed;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    screenFade = Math.max(0.1, screenFade - dt / 4000);

    for (let i = 0; i < creditsParticles.length; i++) {
        creditsParticles[i].render();
    }
    for (let i = 0; i < mouseParticles.length; i++) {
        mouseParticles[i].render();
    }

    ctx.font = "150px 'Outfit'";
    ctx.fillColor = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowBlur = "10";
    ctx.shadowColor = "aqua";

    ctx.fillStyle = "gold";
    ctx.fillText("Credits", canvas.width / 2, 120);

    ctx.fillStyle = "white";
    ctx.fillStyle = "rgba(255, 255, 255,"+(1-screenFade)+")";
    ctx.fillText("Everything: Adi", canvas.width / 2, 460);

    ctx.fillStyle = "black";
    ctx.shadowBlur = "white"
    ctx.textBaseline = "bottom";
    ctx.font = "30px 'Outfit'";
    ctx.fillText("Press any key to exit credits.", canvas.width / 2, canvas.height - 35);

    ctx.shadowBlur = 0;
    
    ctx.fillStyle = "rgba(0, 0, 0,"+screenFade+")";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    RenderCursor();
    
    if (Keys.any) {
        screenFade = 0.8;
        game.switchGameState("Title");
        requestAnimationFrame(startScreen);
    } else {
        requestAnimationFrame(creditsScreen);
    }
}

function startScreen() {
    // Update Accumulator
    const now = performance.now();
    const dt = Math.min(now - then, 150);
    then = now;
    accumulator += dt;

    screenFade = Math.max(0.1, screenFade - dt / 4000);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update Game State    
    while (accumulator >= game.gameSpeed) {
        for (let i = 0; i < titleButtons.length; i++) {
            titleButtons[i].update();
        }
        for (let i = 0; i < titleParticles.length; i++) {
            titleParticles[i].update();
        }
        for (let i = 0; i < mouseParticles.length; i++) {
            mouseParticles[i].update();
        }
        accumulator -= game.gameSpeed;
    }

    // Render    
    title.render();
    for (let i = 0; i < titleButtons.length; i++) {
        titleButtons[i].render();
    }

    for (let i = 0; i < titleParticles.length; i++) {
        titleParticles[i].render();
    }

    for (let i = 0; i < mouseParticles.length; i++) {
        mouseParticles[i].render();
    }

    ctx.fillStyle = "rgba(0, 0, 0,"+screenFade+")";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    RenderCursor();
    
    // States
    if (game.gameState == "Title") {
        backgroundCanvas.style.background = "url('./assets/images/nrnewbgmin.png') no-repeat center center fixed";
        requestAnimationFrame(startScreen);
    } else if (game.gameState == "Game") {
        screenFade = 0.8;
        backgroundCanvas.style.background = "url('./assets/images/newGalBgmin.png') no-repeat center center fixed";
        requestAnimationFrame(updateGame);
    } else if (game.gameState == "Options") {
        screenFade = 0.8;
        requestAnimationFrame(optionsScreen);
    } else if (game.gameState == "Credits") {
        screenFade = 1;
        requestAnimationFrame(creditsScreen);
        Keys.any = false;
    } else if (game.gameState == "Quit Game") {
        window.close();
        setTimeout(() => {
            alert("Unable to quit game, please close manually.")
        }, 100)
    }
}

backgroundCanvas.style.background = "url('./assets/images/nrnewbgmin.png') no-repeat center center fixed";

window.onload = ()=>{
    canvas.style.visibility = "visible";
    backgroundCanvas.style.visibility = "visible";
    requestAnimationFrame(startScreen);
}