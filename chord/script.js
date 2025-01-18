// Setup Canvas
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  const scale = Math.min(innerWidth / canvas.width, innerHeight / canvas.height);
  canvas.style.transform = `scale(${scale})`;
  canvas.style.left = `${(innerWidth - canvas.width) * 0.5}px`;
  canvas.style.top = `${(innerHeight - canvas.height) * 0.5}px`;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function calculateTimeout(bpm) {
    return (60 / bpm) * 1000; // Convert BPM to milliseconds
}

// Setup for the Fixed Time Loop
const frameRate = 60;
const timeStep = 1000 / frameRate;
let accumulator = 0;
let then = performance.now();

// Main Loop
let currentBeat = 0;
let beatsToStart = 8;
let bpmTimer = 0;
let updatingBPM = false;
let currChord = 0;
let chordUpdateCounter = 0;
let boldIndex = 0;
let spokeChord = false;
let startedExcercise = false;
let resetBeat = false;
function updateLoop() {
    // Update Accumulator
    const now = performance.now();
    const dt = Math.min(now - then, 150);
    then = now;
    accumulator += dt;

    // let arr = chordArr[currChord].split("-");
    // let c1 = arr[0].trim();
    // let c2 = arr[1].trim();

    if (updatingBPM) {
        bpmTimer += dt;

        let ms = calculateTimeout(audioSlider.value);

        if (bpmTimer > ms)
        {
            if (resetBeat) 
            {
                currentBeat = -1;
                chordUpdateCounter = -1;
                resetBeat = false;
                currChord = 0;
            }

            spokeChord = false;
            ++chordUpdateCounter;
            if (chordUpdateCounter == 8) {
                chordUpdateCounter = 0;
                currChord = (currChord + 1) % chordArr.length;
                                
                // randomized chords
                //currChord = Math.floor(Math.random() * chordArr.length);
            }

            if (!startedExcercise)
            {
                if (currentBeat == 3) {
                    playHighSeiko()
                }
                else {
                    playLowSeiko();
                }
                
                bpmTimer -= ms;
                ++currentBeat;

                if (currentBeat == beatsToStart - 1 || beatsToStart - currentBeat < 0) 
                {
                    startedExcercise = true;
                    resetBeat = true;
                }
            }
            else 
            {
                boldIndex = Math.floor(chordUpdateCounter / 4);
                
                currentBeat = (currentBeat + 1) % 4;
                bpmTimer -= ms;

                if (currentBeat == 0)
                {
                    playABeat();
                }
                else
                {
                    playBBeat();                
                }
            }
        }
    }

    // Update State
    while (accumulator >= timeStep) {
        accumulator -= timeStep;

        audioSlider.update();
        beatSlider.update();
        leadupSlider.update();
        beatsToStart = leadupSlider.value;

        for (let i = 0; i < titleButtons.length; i++) {
            titleButtons[i].update();
        }
        particles.forEach(p => p.update());

        let startButton = titleButtons[0];

        if (startButton.wasClicked) {
            if (startButton.text == "Start") {
                startButton.text = "Stop";
                updatingBPM = true;
                playHighSeiko();
            } else {
                startButton.text = "Start";
                updatingBPM = false;
                startedExcercise = false;
            }
            bpmTimer = 0;
            currentBeat = 0;
            resetBeat = false;
            chordUpdateCounter = 0;
            boldIndex = 0;
        }

        let restartButton = titleButtons[1];

        if (restartButton.wasClicked) {
            window.location.reload();
        }
    }

    // Render
    let t = accumulator / timeStep;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
	ctx.fillStyle = "rgba(0, 0, 0, 1)";

	ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawBackground();

    particles.forEach(p => p.render());

    // Tempo
    ctx.font = "125px 'Outfit'";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowBlur = "10";
    ctx.shadowColor = "aqua";
    ctx.fillStyle = "white";
    ctx.fillText("Chord Transition Excercise", canvas.width / 2, 120);
    ctx.shadowBlur = 0;

    // Slider
    audioSlider.render();
    beatSlider.render();
    leadupSlider.render();

    // Beat Circles
    ctx.strokeStyle = "gold";

    for (let i = 0; i < 4; ++i) 
    {
        if (i == currentBeat || i + 4 == currentBeat) ctx.fillStyle = "gold";
        else ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
        ctx.beginPath();
        ctx.arc(canvas.width * 0.5 - 90 + 60 * i, canvas.height * 0.5 + 20, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.closePath();
    }

    // Buttons
    for (let i = 0; i < titleButtons.length; i++) {
        titleButtons[i].render();
    }

    // Chords
    ctx.font = "65px 'Outfit'";
    ctx.fillStyle = "white";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.shadowBlur = "10";
    ctx.shadowColor = "aqua";
    ctx.globalAlpha = 0.8;

    if (startedExcercise && !resetBeat)
    {
        console.log(currChord);
        let arr = chordArr[currChord].split("-");
        let c1 = arr[0].trim();
        let c2 = arr[1].trim();
        
        // Measure text widths
        const text1 = "Current: ";
        const text2 = c1;
        const text3 = " - ";
        const text4 = c2;

        const text1Width = ctx.measureText(text1).width;
        const text2Width = ctx.measureText(text2).width;
        const text3Width = ctx.measureText(text3).width;
        const text4Width = ctx.measureText(text4).width;

        const totalWidth = text1Width + text2Width + text3Width + text4Width;

        // Calculate starting position to center the text
        const startX = (canvas.width - totalWidth) / 2;
        const y = 750;

        // Draw each text segment
        ctx.fillText(text1, startX, y);

        if (boldIndex == 0) { ctx.shadowColor = "gold", ctx.shadowBlur = 10; }
        ctx.fillText(text2, startX + text1Width, y);
        ctx.shadowBlur = 0;

        ctx.fillText(text3, startX + text1Width + text2Width, y);

        if (boldIndex == 1) { ctx.shadowColor = "gold", ctx.shadowBlur = 10; }
        ctx.fillText(text4, startX + text1Width + text2Width + text3Width, y);

        ctx.font = "65px 'Outfit'";
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowBlur = "5";
        ctx.shadowColor = "aqua";
        ctx.font = "40px 'Outfit'";
        ctx.fillText("Next: " + chordArr[(currChord + 1) % chordArr.length], canvas.width / 2, 810);
        ctx.globalAlpha = 1;
    }
    else
    {
        ctx.textAlign = "center";
        ctx.shadowBlur = "10";
        ctx.shadowColor = "aqua";
        
        if (!updatingBPM)
        {
            ctx.font = "50px 'Outfit'";
            ctx.fillText("Press Start to Begin", canvas.width / 2, 750);
        }
        else {
            ctx.fillText("Starting in: " + (beatsToStart - currentBeat), canvas.width * 0.5, 750);
        }

        ctx.shadowBlur = "5";
        ctx.font = "40px 'Outfit'";
        
        ctx.fillText("Next: " + chordArr[(currChord) % chordArr.length], canvas.width / 2, 810);
        ctx.globalAlpha = 1;
    }

    // Wait for the next frame
    requestAnimationFrame(updateLoop);
}

window.onload = ()=>{
    requestAnimationFrame(updateLoop);
}