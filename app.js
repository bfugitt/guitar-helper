// --- 1. CONFIGURATION ---
const ALL_CHORDS = [
    'A', 'Am', 'A7', 'B', 'Bm', 'B7', 'C', 'Cadd9', 'C#m',
    'D', 'Dm', 'D7', 'E', 'Em', 'E7', 'F', 'Fmaj7', 'F#m', 'G', 'G7'
].sort();

// --- 2. PHRASE "DATABASE" ---
const PHRASE_DATABASE = [
    // ... (Your database is unchanged) ...
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
let practiceInterval = null; // For Random Mode's timer
let currentMode = 'random'; 
let loopMode = 'loop'; 

// --- 4. METRONOME STATE (REFACTORED) ---
let audioContext;
let gainNode;
let currentBPM = 80;
let isMuted = false;

let schedulerInterval = null; // For the audio-only scheduler
let rafID = null; // For the visual/logic loop

let secondsPerBeat = 60.0 / 80.0; // Initial value
let nextBeatTime = 0.0; // The time the *next beat* is due
let nextNoteTime = 0.0; // The time the *next audio note* should be queued

const lookahead = 25.0; 
const scheduleAheadTime = 0.1;

// --- 5. PROGRESSION STATE ---
let generatedSong = []; 
let currentMeasure = 0; 
let beatInMeasure = 1; 

// --- 6. DOM ELEMENTS ---
let displayContainer, currentChordDisplay, nextChordDisplay, songDisplayElement;

document.addEventListener('DOMContentLoaded', () => {
    // ... (Get all elements) ...
    const grid = document.getElementById('chord-selection-grid');
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    const modeRadios = document.querySelectorAll('input[name="mode"]');
    const timerSelect = document.getElementById('timer-select');
    const generateBtn = document.getElementById('generate-btn');
    const loopToggle = document.getElementById('loop-toggle'); 
    const bpmSlider = document.getElementById('bpm-slider');
    const bpmDisplay = document.getElementById('bpm-display');
    const muteBtn = document.getElementById('mute-btn');
    
    displayContainer = document.querySelector('.visual-flash-target');
    currentChordDisplay = document.getElementById('current-chord-display');
    nextChordDisplay = document.getElementById('next-chord-display');
    songDisplayElement = document.getElementById('song-display');

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
    
    loopToggle.addEventListener('change', (e) => {
        loopMode = e.target.checked ? 'regenerate' : 'loop';
    });
    
    // UPDATED: BPM slider now updates secondsPerBeat
    bpmSlider.addEventListener('input', (e) => {
        currentBPM = parseInt(e.target.value, 10);
        bpmDisplay.textContent = currentBPM;
        secondsPerBeat = 60.0 / currentBPM; // Update this global
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

// --- PRACTICE ROUTER (REFACTORED) ---
function startPractice(timerElement) {
    // Stop any and all previous loops
    stopPractice(); 
    
    // Initialize audio context if it's not already
    if (!audioContext) initAudio();
    audioContext.resume();

    // Reset counters and clocks
    currentMeasure = 0;
    beatInMeasure = 1;
    nextBeatTime = audioContext.currentTime; // Logic starts NOW
    nextNoteTime = audioContext.currentTime; // Audio starts NOW

    // Route to the correct mode
    if (currentMode === 'random') {
        startRandomPractice(timerElement);
    } else {
        startProgressionPlayer();
    }
}

function stopPractice() {
    // Stop Random Mode timer
    clearInterval(practiceInterval);
    practiceInterval = null;
    
    // Stop Progression Mode loops
    stopMetronome(); // Stops audio scheduler
    cancelAnimationFrame(rafID); // Stops visual/logic loop
    rafID = null;
    
    // Reset progression state
    currentMeasure = 0;
    beatInMeasure = 1;
    if (currentMode === 'progression') {
        songDisplayElement.textContent = "Select chords and generate a song...";
        generatedSong = []; 
    }
    
    // Reset displays
    currentChordDisplay.textContent = '...';
    nextChordDisplay.textContent = '';
    displayContainer.classList.remove('visual-flash');
}


// --- RANDOM MODE LOGIC (Unchanged) ---
// This mode is simple and doesn't suffer from drift,
// so we can leave it on its own timer.
function startRandomPractice(timerElement) {
    if (selectedChords.length < 2) {
        currentChordDisplay.textContent = 'Select 2+ chords!';
        return;
    }
    const duration = parseInt(timerElement.value, 10);
    generateNewPair(); 
    practiceInterval = setInterval(generateNewPair, duration);
    // We can also start the audio-only metronome
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


// --- PROGRESSION MODE LOGIC (REFACTORED) ---
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

/**
 * REFACTORED: Starts the two loops for Progression Mode.
 */
function startProgressionPlayer() {
    if (generatedSong.length === 0) {
        currentChordDisplay.textContent = 'Generate a song first!';
        return;
    }
    
    // Set the initial display (beat 1 of measure 0)
    currentChordDisplay.textContent = generatedSong[0];
    nextChordDisplay.textContent = generatedSong[1 % generatedSong.length];

    // Start the audio scheduler loop
    startMetronome();
    
    // Start the visual/logic loop
    visualAndLogicLoop();
}

// --- METRONOME AUDIO (REFACTORED) ---
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

/**
 * REFACTORED: This function now *only* starts the audio scheduler.
 */
function startMetronome() {
    if (schedulerInterval) return; // Already running
    schedulerInterval = setInterval(scheduler, lookahead);
}

/**
 * REFACTORED: This function now *only* stops the audio scheduler.
 */
function stopMetronome() {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
}

/**
 * REFACTORED: This is now a "dumb" audio-only scheduler.
 * It has NO logic about beats, measures, or visuals.
 */
function scheduler() {
    const now = audioContext.currentTime;
    // Keep the audio queue full
    while (nextNoteTime < now + scheduleAheadTime) {
        // 1. Schedule the audio
        scheduleNote(nextNoteTime);
        // 2. Advance the audio clock
        nextNoteTime += secondsPerBeat;
    }
}

function scheduleNote(time) {
    const osc = audioContext.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, time);
    osc.connect(gainNode);
    osc.start(time);
    osc.stop(time + 0.05);
}

// --- NEW: THE SYNCED VISUAL/LOGIC LOOP ---
/**
 * This is the new "heart" of the progression mode.
 * It runs on requestAnimationFrame, so it's tied to the screen's refresh.
 * It checks the audioContext.currentTime to drive all logic and visuals.
 */
function visualAndLogicLoop() {
    // Keep the loop going
    rafID = requestAnimationFrame(visualAndLogicLoop);
    
    const now = audioContext.currentTime;

    // Check if it's time for the next beat's LOGIC
    if (now >= nextBeatTime) {
        
        // --- 1. This is the "on beat" logic ---
        // Flash the display
        displayContainer.classList.add('visual-flash');
        setTimeout(() => displayContainer.classList.remove('visual-flash'), 100);

        // --- 2. Update logic counters ---
        // We are on beatInMeasure. Update the display *for* this beat.
        if (beatInMeasure === 1) {
            // We are on the downbeat. Update the displays.
            let nextMeasure = (currentMeasure + 1) % generatedSong.length;
            currentChordDisplay.textContent = generatedSong[currentMeasure];
            nextChordDisplay.textContent = generatedSong[nextMeasure];
            
            // Check for regenerate *after* displaying
            if (currentMeasure === 0 && beatInMeasure === 1 && generatedSong.length > 0) {
                 if(loopMode === 'regenerate' && nextBeatTime > audioContext.currentTime) { // Check that we're not on the very first start
                    generateSong();
                 }
            }
        }
        
        // --- 3. Advance counters for the *next* loop ---
        beatInMeasure = (beatInMeasure % 4) + 1;
        if (beatInMeasure === 1) {
            // We just finished beat 4, so advance the measure
            currentMeasure = (currentMeasure + 1) % generatedSong.length;
        }

        // --- 4. Advance the logic clock ---
        // This schedules the *next* time this "if" block will run
        nextBeatTime += secondsPerBeat;
    }
}
