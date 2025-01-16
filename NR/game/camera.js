"use strict"

const camera = {
    x: 0,
    y: 0,
    scale: 1,
    xOffset: 0,
    yOffset: 0,
    targetScale: 1,
    scaleSpeed: 1,
    darkness: 0,
    shake: false,
    shakeStrength: 1
}

function ScaleCamera(dt) {
    if (Math.abs(camera.targetScale - camera.scale) > 0.0001) {
        camera.scale = lerp(camera.scale, camera.targetScale, (0.1 * camera.scaleSpeed) * (dt / game.gameSpeed));
    } else {
       camera.scale = camera.targetScale;
    }
}

function SetCameraOnPlayer() {
    const roomBounds = game.roomBounds;
    const canvasCenterX = canvas.width / 2;
    const canvasCenterY = canvas.height / 2;
    
    let x = game.player.x + game.player.w/2 + camera.xOffset;
    let y = game.player.y + game.player.h/2 + camera.yOffset;

    let newX = roomBounds.x - (canvas.width - (canvas.width / camera.scale)) / 2;
    let newY = roomBounds.y - (canvas.height - (canvas.height / camera.scale)) / 2;
    
    let newW = roomBounds.w + (canvas.width - (canvas.width / camera.scale));
    let newH = roomBounds.h + (canvas.height - (canvas.height / camera.scale));
    
    x = Math.max(x, newX + canvasCenterX);
    y = Math.max(y, newY + canvasCenterY);

    x = Math.min(x, newX + newW - canvasCenterX);
    y = Math.min(y, newY + newH - canvasCenterY);

    camera.x = x;
    camera.y = y;
}

function GlideCameraToPlayer(dt) {
    const roomBounds = game.roomBounds;
    const canvasCenterX = canvas.width / 2;
    const canvasCenterY = canvas.height / 2;
    ScaleCamera(dt);

    let x = game.player.lerpedX + game.player.w/2 + camera.xOffset;
    let y = game.player.lerpedY + game.player.h/2 + camera.yOffset;

    let newX = roomBounds.x - (canvas.width - (canvas.width / camera.scale)) / 2;
    let newY = roomBounds.y - (canvas.height - (canvas.height / camera.scale)) / 2;
    
    let newW = roomBounds.w + (canvas.width - (canvas.width / camera.scale));
    let newH = roomBounds.h + (canvas.height - (canvas.height / camera.scale));
    
    x = Math.max(x, newX + canvasCenterX);
    y = Math.max(y, newY + canvasCenterY);

    x = Math.min(x, newX + newW - canvasCenterX);
    y = Math.min(y, newY + newH - canvasCenterY);

    const dx = camera.x - x;
    const dy = camera.y - y;
    const dist = Math.sqrt(dx * dx + dy * dy) * (dt / game.gameSpeed);
    const angle = Math.atan2(y - camera.y, x - camera.x);

    let shakeX = camera.shake ? (Math.random() * 20 - 10) * camera.shakeStrength : 0;
    let shakeY = camera.shake ? (Math.random() * 20 - 10) * camera.shakeStrength : 0;

    if (dist > 1) {
        camera.x += Math.cos(angle) * dist / 8 + shakeX;
        camera.y += Math.sin(angle) * dist / 8 + shakeY;
    } else {
        camera.x = x + shakeX;
        camera.y = y + shakeY;
    }
}