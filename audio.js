let aBeat = new Audio('assets/audio/aBeat.wav');
let bBeat = new Audio('assets/audio/bBeat.wav');

function playABeat() {
    aBeat.currentTime = 0; // Reset to the beginning
    aBeat.volume = 0.3;
    aBeat.play();
}

function playBBeat() {
    bBeat.currentTime = 0; // Reset to the beginning
    bBeat.volume = 0.3;
    bBeat.play();
}
