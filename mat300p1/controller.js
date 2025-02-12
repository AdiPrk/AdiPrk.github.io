"use strict"

const graphInfo = {
    xMin: 0,
    xMax: 1,
    yMin: -3,
    yMax: 3,
}

var KeyBinds = {
    "left": "ArrowLeft",
    "right": "ArrowRight",
    "up": "ArrowUp",
    "down": "ArrowDown",
}

var Keys = {
    up: false,
    down: false,
    left: false,
    right: false,
}

let OldKeys = {
    up: false,
    down: false,
    left: false,
    right: false,
}

function ResetKeys() {
    Keys.left = false;
    Keys.right = false;
    Keys.up = false;
    Keys.down = false;
}

let lastKey = "right";

window.onkeydown = function (e) {
    let kc = e.code;
    
    if (kc == KeyBinds["up"]) {
        Keys.up = true;
    }

    if (kc == KeyBinds["left"]) {
        Keys.left = true;
        OldKeys.left = true;
        if (lastKey != "left") {
            lastKey = "left";
        }
    }

    if (kc == KeyBinds["right"]) {
        Keys.right = true;
        OldKeys.right = true;
        if (lastKey != "right") {
            lastKey = "right";
        }
    }

    if (kc == KeyBinds["down"]) {
        Keys.down = true;
    }

    if (kc == KeyBinds["left"] || kc == KeyBinds["right"]) {
        if (lastKey == "right") {
            Keys.left = false;
        } else if (lastKey == "left") {
            Keys.right = false;
        }
    }
};

window.onkeyup = function (e) {
    let kc = e.code;

    if (kc == KeyBinds["up"]) {
        Keys.up = false;
    }

    if (kc == KeyBinds["left"]) {
        Keys.left = false;
        OldKeys.left = false;
        if (OldKeys.right) {
            Keys.right = true;
        }
    }

    if (kc == KeyBinds["right"]) {
        Keys.right = false;
        OldKeys.right = false;
        if (OldKeys.left) {
            Keys.left = true;
        }
    }

    if (kc == KeyBinds["down"]) {
        Keys.down = false;
    }
};

const mouse = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    clicked: false,
}

function getCursorPosition(e) {
    var rect = canvas.getBoundingClientRect(),
    scaleX = canvas.width / rect.width,
    scaleY = canvas.height / rect.height; 
    
    mouse.x = (e.clientX - rect.left) / (rect.right - rect.left) * canvas.width;
    mouse.y = (e.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height;

    let x = mouse.x / canvas.width;
    let y = 1 - mouse.y / canvas.height;

    x = x * graphInfo.xRange + graphInfo.xMin;
    y = y * graphInfo.yRange + graphInfo.yMin;

    mouse.graphX = x;
    mouse.graphY = y;
}

window.addEventListener('mousedown', function(e) {
    mouse.clicked = true;
})

window.addEventListener('mouseup', function(e) {
    mouse.clicked = false;
})

window.addEventListener('mousemove', function(e) {
    getCursorPosition(e);
})