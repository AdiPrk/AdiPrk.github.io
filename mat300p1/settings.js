let sliderCircleImage = new Image();
sliderCircleImage.src = "images/sliderCircle.png";

function settingsUpdateLoop()
{
    // Update Accumulator
    const now = performance.now();
    const dt = Math.min(now - then, 150);
    then = now;
    accumulator += dt;

    // Update State
    while (accumulator >= timeStep) {
        settingsButtons.forEach(b => b.update());
        dropdowns.forEach(d => d.update());
        degreeSlider.update();
        accumulator -= timeStep;
    }

    // Render
    let t = accumulator / timeStep;

    ctx.strokeStyle = "white";
    ctx.lineWidth = 3;
    
    ctx.fillStyle = "black";
    let rectWidth = 800;
    let rectHeight = 400;
    ctx.fillRect(canvas.width * 0.5 - rectWidth * 0.5, canvas.height * 0.5 - rectHeight * 0.5, rectWidth, rectHeight);
    ctx.strokeRect(canvas.width * 0.5 - rectWidth * 0.5, canvas.height * 0.5 - rectHeight * 0.5, rectWidth, rectHeight);

    settingsButtons.forEach(b => b.render());
    dropdowns.forEach(d => d.render());
    degreeSlider.render();

    // Wait for the next frame
    if (game.state == "Settings") {
        requestAnimationFrame(settingsUpdateLoop);
    }
    else {
        poly = new BernsteinPolynomial(degreeSlider.value, dropdowns[0].options[dropdowns[0].selected]);
        requestAnimationFrame(graphUpdateLoop);
    }
}