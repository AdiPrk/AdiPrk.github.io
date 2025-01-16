"use strict"

var KeyBinds = {};

if (localStorage.getItem('KeyBinds')) {
    KeyBinds = JSON.parse(localStorage.getItem('KeyBinds'));
} else {
    KeyBinds = {
        "left": "ArrowLeft",
        "right": "ArrowRight",
        "up": "ArrowUp",
        "down": "ArrowDown",
        "jump": "KeyC",
        "ability1": "KeyX",
        "ability2": "KeyZ"
    }
    localStorage.setItem('KeyBinds', JSON.stringify(KeyBinds));
}

var Keys = {
    up: false,
    down: false,
    left: false,
    right: false,
    z: false,
    x: false,
    c: false,
    any: false,
    esc: false,
    lastKey: ""
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
    Keys.z = false;
    Keys.x = false;
    Keys.c = false;
}

let lastKey = "right";

window.onkeydown = function (e) {
    let kc = e.code;
    Keys.any = true;
    Keys.lastKey = kc;

    if (kc == KeyBinds["ability2"]) {
        Keys.z = true;
    }

    if (kc == KeyBinds["ability1"]) {
        Keys.x = true;
    }

    if (kc == KeyBinds["jump"]) {
        Keys.c = true;
    }
    
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

    if (kc == "Escape") {
        Keys.esc = true;
    }
};

window.onkeyup = function (e) {
    let kc = e.code;

    if (kc == KeyBinds["ability2"]) {
        Keys.z = false;
    }

    if (kc == KeyBinds["ability1"]) {
        Keys.x = false;
    }

    if (kc == KeyBinds["jump"]) {
        Keys.c = false;
    }

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

    if (kc == "Escape") {
        Keys.esc = false;
    }
};

const mouse = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    angle: 0,
    clicked: false
}

canvas.addEventListener('mousemove', function(e) {
    var r = canvas.getBoundingClientRect()
    
    let scaledCanvasWidth = canvas.width / camera.scale;
    let scaledCanvasHeight = canvas.height / camera.scale;
    
    let scaledMouseX = ((e.clientX - r.left) / (r.right - r.left)) * scaledCanvasWidth - (canvas.width / camera.scale - canvas.width) / 2;
    let scaledMouseY = ((e.clientY - r.top) / (r.bottom - r.top)) * scaledCanvasHeight - (canvas.height / camera.scale - canvas.height) / 2;
    
    let cameraShiftX = canvas.width / 2 - camera.x;
    let cameraShiftY = canvas.height / 2 - camera.y;
    
    mouse.x = scaledMouseX - 0;
    mouse.y = scaledMouseY - 0;
})

canvas.addEventListener('mousedown', function(e) {
    mouse.clicked = true;
})

canvas.addEventListener('mouseup', function(e) {
    mouse.clicked = false;
})