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