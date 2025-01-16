let chordArr = [
    "Am - A", "Am - C", "Am - D", "Am - Dm", "Am - E", "Am - Em", "Am - F", "Am - G", "Am - C(add9)",
    "A - C", "A - D", "A - Dm", "A - E", "A - Em", "A - F", "A - G", "A - C(add9)",
    "C - D", "C - Dm", "C - E", "C - Em", "C - F", "C - G", "C - C(add9)",
    "D - Dm", "D - E", "D - Em", "D - F", "D - G", "D - C(add9)",
    "Dm - E", "Dm - Em", "Dm - F", "Dm - G", "Dm - C(add9)",
    "E - Em", "E - F", "E - G", "E - C(add9)", "Em - F", "Em - G", "Em - C(add9)",
    "F - G", "F - C(add9)", "G - C(add9)"
];

let chordAudioMap = {
    "Am": new SpeechSynthesisUtterance("A-minor"),
    "A": new SpeechSynthesisUtterance("A"),
    "C": new SpeechSynthesisUtterance("C"),
    "D": new SpeechSynthesisUtterance("D"),
    "Dm": new SpeechSynthesisUtterance("D-minor"),
    "E": new SpeechSynthesisUtterance("E"),
    "Em": new SpeechSynthesisUtterance("E-minor"),
    "F": new SpeechSynthesisUtterance("F"),
    "G": new SpeechSynthesisUtterance("G"),
    "C(add9)": new SpeechSynthesisUtterance("C add ninth")
}

function preloadUtterances(map) {
    for (let key in chordAudioMap) {
        let utterance = chordAudioMap[key];
        utterance.volume = 0;
        speechSynthesis.speak(utterance);
    }
}

// Preload all utterances
// preloadUtterances(chordAudioMap);

let aBeat = new Audio('assets/audio/aBeat.wav');
let bBeat = new Audio('assets/audio/bBeat.wav');
let highSeiko = new Audio('assets/audio/High Seiko SQ50.wav');
let lowSeiko = new Audio('assets/audio/Low Seiko SQ50.wav');

function playABeat() {
    aBeat.currentTime = 0;
    aBeat.volume = beatSlider.value * 0.1;
    aBeat.play();
}

function playBBeat() {
    bBeat.currentTime = 0;
    bBeat.volume = beatSlider.value * 0.1;
    bBeat.play();
}

function playHighSeiko() {
    highSeiko.currentTime = 0;
    highSeiko.volume = beatSlider.value * 0.1;
    highSeiko.play();
}

function playLowSeiko() {
    lowSeiko.currentTime = 0;
    lowSeiko.volume = beatSlider.value * 0.1;
    lowSeiko.play();
}