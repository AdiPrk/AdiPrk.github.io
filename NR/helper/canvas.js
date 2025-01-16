const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const backgroundCanvas = document.getElementById("background");
const backgroundCtx = backgroundCanvas.getContext("2d");

function Resize() {
    let scale = Math.min(innerWidth / canvas.width, innerHeight / canvas.height);

    canvas.style.transform = `scale(${scale})`;
    canvas.style.left = (innerWidth - canvas.width) * 0.5 + "px";
    canvas.style.top = (innerHeight - canvas.height) * 0.5 + "px";

    backgroundCanvas.style.transform = `scale(${scale-0.002})`;
    backgroundCanvas.style.left = (innerWidth - canvas.width) * 0.5 + "px";
    backgroundCanvas.style.top = (innerHeight - canvas.height) * 0.5 + "px";
}

window.addEventListener('resize', Resize);
Resize();