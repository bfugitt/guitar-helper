// --- 1. CONFIGURATION ---
const ALL_CHORDS = [
    'A', 'Am', 'A7', 'B', 'Bm', 'B7', 'C', 'Cadd9', 'C#m',
    'D', 'Dm', 'D7', 'E', 'Em', 'E7', 'F', 'Fmaj7', 'F#m', 'G', 'G7'
].sort();

// --- 2. PHRASE "DATABASE" ---
const PHRASE_DATABASE = [
    { name: "Doo-Wop / '50s", length: 4, progression: ['I', 'vi', 'IV', 'V'], requiredTypes: ['I', 'vi', 'IV', 'V'] },
    { name: "Feel-Good / Pop", length: 4, progression: ['I', 'V', 'vi', 'IV'], requiredTypes: ['I', 'V', 'vi', 'IV'] },
    { name: "Axis of Awesome", length: 4, progression: ['vi', 'IV', 'I', 'V'], requiredTypes: ['vi', 'IV', 'I', 'V'] },
    { name: "Jazz ii-V-I", length: 4, progression: ['ii', 'V', 'I', 'I'], requiredTypes: ['I', 'ii', 'V'] },
    { name: "Simple Cadence", length: 4, progression: ['I', 'IV', 'V', 'I'], requiredTypes: ['I', 'IV', 'V'] },
    { name: "Amen (Plagal) Cadence", length: 2, progression: ['IV', 'I'], requiredTypes: ['I', 'IV'] },
    { name: "Perfect Cadence", length: 2, progression: ['V', 'I'], requiredTypes: ['I', 'V'] },
    { name: "Classic ii-V", length: 2, progression: ['ii', 'V'], requiredTypes: ['ii', 'V'] },
    { name: "Verse to Chorus (IV-V)", length: 2, progression: ['IV', 'V'], requiredTypes: ['IV', 'V'] },
    { name: "Minor Drop", length: 2, progression: ['I', 'vi'], requiredTypes: ['I', 'vi'] },
    { name: "12-Bar Blues", length: 12, progression: ['I', 'I', 'I', 'I', 'IV', 'IV', 'I', 'I', 'V', 'IV', 'I', 'V'], requiredTypes: ['I', 'IV', 'V'] }
];

const KEY_DATABASE = {
    'A': { 'I': 'A', 'ii': 'Bm', 'iii': 'C#m', 'IV': 'D', 'V': 'E', 'vi': 'F#m' },
    'C': { 'I': 'C', 'ii': 'Dm', 'iii': 'Em', 'IV': 'F', 'V': 'G', 'vi': 'Am' },
    'G': { 'I': 'G', 'ii': 'Am', 'iii': 'Bm', 'IV': 'C', 'V': 'D', 'vi': 'Em' },
    'D': { 'I': 'D', 'ii': 'Em', 'iii': 'F#m', 'IV': 'G', 'V': 'A', 'vi': 'Bm' },
    'E': { 'I': 'E', 'ii': 'F#m', 'iii': 'G#m', 'IV': 'A', 'V': 'B', 'vi': 'C#m' }
};

// --- 3. APP STATE ---
let selectedChords = [];
let practiceInterval = null; 
let currentMode = 'random'; 
// We no longer need the loopMode variable!

// --- 4. METRONOME STATE ---
let audioContext;
let gainNode;
let currentBPM = 80;
let isMuted = false;

let schedulerInterval = null; 
let rafID = null; 

let secondsPerBeat = 60.0 / 80.0; 
let nextBeatTime = 0.0; 
let nextNoteTime = 0.0; 

const lookahead = 25.0; 
const scheduleAheadTime = 0.1;

// --- 5. PROGRESSION STATE ---
let generatedSong = []; 
let currentMeasure = 0; 
let beatInMeasure = 1; 

// --- 6. DOM ELEMENTS ---
let displayContainer, currentChordDisplay, nextChordDisplay, songDisplayElement;
let loopToggleElement; // NEW: We'll grab this once

document.addEventListener('DOMContentLoaded', () => {
    // Get all the elements
    const grid = document.getElementById('chord-selection-grid');
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    const modeRadios = document.querySelectorAll('input[name="mode"]');
    const timerSelect = document.getElementById('timer-select');
    const generateBtn = document.getElementById('generate-btn');
    const bpmSlider = document.getElementById('bpm-slider');
    const bpmDisplay = document.getElementById('bpm-display');
    const muteBtn = document.getElementById('mute-btn');
    
    displayContainer = document.querySelector('.visual-flash-target');
    currentChordDisplay = document.getElementById('current-chord-display');
    nextChordDisplay = document.getElementById('next-chord-display');
    songDisplayElement = document.getElementById('song-display');
    
    // Get the loop toggle element
    loopToggleElement = document.getElementById('loop-toggle'); 

    // --- 7. INITIALIZATION ---
    populateChordGrid(grid);
    toggleModePanels(); 
    stopPractice(); 

    // --- 8. EVENT LISTENERS ---
    startBtn.addEventListener('click', () => startPractice(timerSelect));
    stopBtn.addEventListener('click', () => stopPractice());
    
    modeRadios.forEach(radio => radio.addEventListener('change', () => {
        toggleModePanels();
        stopPractice();
        generatedSong = [];
    }));
    
    generateBtn.addEventListener('click', () => generateSong());
    
    // We don't need a listener for the loop toggle, we'll read it directly.
    
    bpmSlider.addEventListener('input', (e) => {
        currentBPM = parseInt(e.target.value, 10);
        bpmDisplay.textContent = currentBPM;
        secondsPerBeat = 60.0 / currentBPM; 
    });
    
    muteBtn.addEventListener('click', () => toggleMute(muteBtn));
});


// --- CHORD SELECTION (Unchanged) ---
function populateChordGrid(gridElement) {
    gridElement.innerHTML = ''; 
    ALL_CHORDS.forEach(chord => {
        const button = document.createElement('button');
        button.className = 'chord-btn';
        button.textContent = chord;
        button.dataset.chord = chord;
        button.addEventListener('click', handleChordClick);
        gridElement.appendChild(button);
    });
}
function handleChordClick(event) {
    const button = event.target;
    const chord = button.dataset.chord;
    button.classList.toggle('selected');
    if (selectedChords.includes(chord)) {
        selectedChords = selectedChords.filter(c => c !== chord);
    } else {
        selectedChords.push(chord);
    }
}

// --- MODE SWITCHING (Unchanged) ---
function toggleModePanels() {
    currentMode = document.querySelector('input[name="mode"]:checked').value;
    const randomPanel = document.getElementById('random-mode-panel');
    const progressionPanel = document.getElementById('progression-mode-panel');
    if (currentMode === 'random') {
        randomPanel.style.display = 'block';
        progressionPanel.style.display = 'none';
        nextChordDisplay.style.display = 'none';
    } else {
        randomPanel.style.display = 'none';
        progressionPanel.style.display = 'block';
        nextChordDisplay.style.display = 'block';
    }
}

// --- PRACTICE ROUTER (Unchanged) ---
function stopAllLoops() {
    clearInterval(practiceInterval);
    practiceInterval = null;
    clearInterval(schedulerInterval); 
    schedulerInterval = null;
    cancelAnimationFrame(rafID); 
    rafID = null;
}

function startPractice(timerElement) {
    stopAllLoops(); 
    if (!audioContext) initAudio();
    audioContext.resume();

    currentMeasure = 0;
    beatInMeasure = 1;
    nextBeatTime = audioContext.currentTime; 
    nextNoteTime = audioContext.currentTime; 

    if (currentMode === 'random') {
        startRandomPractice(timerElement);
    } else {
        startProgressionPlayer(); 
    }
}

function stopPractice() {
    stopAllLoops();
    
    currentMeasure = 0;
    beatInMeasure = 1;
    if (currentMode === 'progression' && songDisplayElement) {
        songDisplayElement.textContent = "Select chords and generate a song...";
        generatedSong = []; 
    }
    
    currentChordDisplay.textContent = '...';
    nextChordDisplay.textContent = '';
    displayContainer.classList.remove('visual-flash');
}


// --- RANDOM MODE LOGIC (Unchanged) ---
function startRandomPractice(timerElement) {
    if (selectedChords.length < 2) {
        currentChordDisplay.textContent = 'Select 2+ chords!';
        return;
    }
    const duration = parseInt(timerElement.value, 10);
    generateNewPair(); 
    practiceInterval = setInterval(generateNewPair, duration);
    startMetronome(); 
}
function generateNewPair() {
    let index1 = Math.floor(Math.random() * selectedChords.length);
    let index2 = Math.floor(Math.random() * selectedChords.length);
    while (index1 === index2) {
        index2 = Math.floor(Math.random() * selectedChords.length);
    }
    currentChordDisplay.textContent = `${selectedChords[index1]}  →  ${selectedChords[index2]}`;
    nextChordDisplay.textContent = ''; 
}


// --- PROGRESSION MODE LOGIC (Unchanged) ---
function generateSong() {
    let allPossibleSongs = [];
    for (const keyName of Object.keys(KEY_DATABASE)) {
        const keyChords = KEY_DATABASE[keyName];
        for (const phrase of PHRASE_DATABASE) {
            const phraseIsPossible = phrase.requiredTypes.every(romanNumeral => {
                const chordName = keyChords[romanNumeral];
                return selectedChords.includes(chordName);
            });
            if (phraseIsPossible) {
                const translatedProgression = phrase.progression.map(romanNumeral => keyChords[romanNumeral] || '?');
                allPossibleSongs.push({
                    key: keyName,
                    name: phrase.name,
                    progression: translatedProgression
                });
            }
        }
    }
    if (allPossibleSongs.length === 0) {
        songDisplayElement.textContent = "No progressions found. Try selecting more chords.";
        generatedSong = [];
        return;
    }
    const chosenSong = allPossibleSongs[Math.floor(Math.random() * allPossibleSongs.length)];
    generatedSong = chosenSong.progression;
    songDisplayElement.textContent = `${chosenSong.name} (in ${chosenSong.key}): ${generatedSong.join(' → ')}`;
}

function startProgressionPlayer() {
    if (generatedSong.length === 0) {
        currentChordDisplay.textContent = 'Generate a song first!';
        return;
    }
    
    currentChordDisplay.textContent = generatedSong[0];
    nextChordDisplay.textContent = generatedSong[1 % generatedSong.length];

    startMetronome();
    visualAndLogicLoop();
}

// --- METRONOME AUDIO (TYPO FIX) ---
function initAudio() {
    if (audioContext) return;
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);
    gainNode.gain.setValueAtTime(isMuted ? 0 : 1, audioContext.currentTime);
}
function toggleMute(muteBtn) {
    isMuted = !isMuted;
    muteBtn.classList.toggle('muted', isMuted);
    muteBtn.textContent = isMuted ? 'Unmute' : 'Mute';
    if (gainNode) {
        gainNode.gain.setValueAtTime(isMuted ? 0 : 1, audioContext.currentTime);
    }
}

function startMetronome() {
    if (schedulerInterval) return; // Already running
    schedulerInterval = setInterval(scheduler, lookahead);
}

function stopMetronome() {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
}

function scheduler() {
    const now = audioContext.currentTime;
    while (nextNoteTime < now + scheduleAheadTime) {
        scheduleNote(nextNoteTime);
        nextNoteTime += secondsPerBeat;
    }
}

function scheduleNote(time) {
    // THIS IS THE TYPO FIX
    const osc = audioContext.createOscillator(); 
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, time);
    osc.connect(gainNode);
    osc.start(time);
    osc.stop(time + 0.05);
}

// --- SYNCED VISUAL/LOGIC LOOP (BUG FIX) ---
function visualAndLogicLoop() {
    rafID = requestAnimationFrame(visualAndLogicLoop);
    
    const now = audioContext.currentTime;

    if (now >= nextBeatTime) {
        
        // --- 1. Flash visual ---
        displayContainer.classList.add('visual-flash');
        setTimeout(() => displayContainer.classList.remove('visual-flash'), 100);

        // --- 2. Update display logic (only on beat 1) ---
        if (beatInMeasure === 1) {
            let nextMeasure = (currentMeasure + 1) % generatedSong.length;
            currentChordDisplay.textContent = generatedSong[currentMeasure];
            nextChordDisplay.textContent = generatedSong[nextMeasure];
        }
        
        // --- 3. Advance counters for the *next* loop ---
        beatInMeasure = (beatInMeasure % 4) + 1;
        if (beatInMeasure === 1) { // This means we just finished beat 4
            // Advance the measure
            currentMeasure = (currentMeasure + 1) % generatedSong.length;
            
            // --- 4. CHECK FOR REGENERATE (THIS IS THE FIX) ---
            // We just advanced the measure, and it's now 0.
            // This means the song *just finished*.
            // We read the toggle's "checked" status *directly* from the DOM.
            if (currentMeasure === 0 && loopToggleElement.checked) {
                // .checked is true, which means "regenerate"
                generateSong();
            }
        }

        // --- 5. Advance the logic clock ---
        nextBeatTime += secondsPerBeat;
    }
}
