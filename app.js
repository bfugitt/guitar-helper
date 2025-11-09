// --- 1. CONFIGURATION ---
const ALL_CHORDS = [
    'A', 'Am', 'A7', 'B', 'Bm', 'B7', 'C', 'Cadd9', 'C#m',
    'D', 'Dm', 'D7', 'E', 'Em', 'E7', 'F', 'Fmaj7', 'F#m', 'G', 'G7'
].sort();

// --- NEW: PROGRESSION "DATABASES" ---
const PROGRESSION_DATABASE = [
    {
        name: "12-Bar Blues",
        length: 12,
        progression: ['I', 'I', 'I', 'I', 'IV', 'IV', 'I', 'I', 'V', 'IV', 'I', 'V'],
        requiredTypes: ['I', 'IV', 'V']
    },
    {
        name: "12-Bar Blues (Quick Change)",
        length: 12,
        progression: ['I', 'IV', 'I', 'I', 'IV', 'IV', 'I', 'I', 'V', 'IV', 'I', 'V'],
        requiredTypes: ['I', 'IV', 'V']
    },
    {
        name: "Doo-Wop / '50s",
        length: 4,
        progression: ['I', 'vi', 'IV', 'V'],
        requiredTypes: ['I', 'vi', 'IV', 'V']
    },
    {
        name: "Feel-Good / Pop",
        length: 4,
        progression: ['I', 'V', 'vi', 'IV'],
        requiredTypes: ['I', 'V', 'vi', 'IV']
    },
    {
        name: "Axis of Awesome",
        length: 4,
        progression: ['vi', 'IV', 'I', 'V'],
        requiredTypes: ['vi', 'IV', 'I', 'V']
    },
    {
        name: "Jazz ii-V-I",
        length: 4,
        progression: ['ii', 'V', 'I', 'I'],
        requiredTypes: ['I', 'ii', 'V']
    }
];

const KEY_DATABASE = {
    'A': { 'I': 'A', 'ii': 'Bm', 'IV': 'D', 'V': 'E', 'vi': 'F#m' },
    'C': { 'I': 'C', 'ii': 'Dm', 'IV': 'F', 'V': 'G', 'vi': 'Am' },
    'G': { 'I': 'G', 'ii': 'Am', 'IV': 'C', 'V': 'D', 'vi': 'Em' },
    'D': { 'I': 'D', 'ii': 'Em', 'IV': 'G', 'V': 'A', 'vi': 'Bm' },
    'E': { 'I': 'E', 'ii': 'F#m', 'IV': 'A', 'V': 'B', 'vi': 'C#m' }
};

// --- 2. APP STATE ---
let selectedChords = [];
let practiceInterval = null; // For the RANDOM CHORD CHANGE timer
let currentMode = 'random'; // 'random' or 'progression'

// --- 3. METRONOME STATE ---
let audioContext;
let gainNode;
let currentBPM = 80;
let isMuted = false;
let metronomeInterval = null;
let nextNoteTime = 0.0;
const lookahead = 25.0;
const scheduleAheadTime = 0.1;

// --- 4. PROGRESSION STATE ---
let currentKey = 'A'; // Default key
let generatedSong = []; // Will hold the translated chord names, e.g., ['G', 'C', 'D']
let currentMeasure = 0; // Tracks our place in the song
let beatInMeasure = 1; // Tracks the current beat (1-4)


// --- 5. DOM ELEMENTS ---
document.addEventListener('DOMContentLoaded', () => {
    // Get all the elements
    const grid = document.getElementById('chord-selection-grid');
    const display = document.getElementById('chord-display');
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    
    // Mode panels
    const randomModePanel = document.getElementById('random-mode-panel');
    const progressionModePanel = document.getElementById('progression-mode-panel');
    const modeRadios = document.querySelectorAll('input[name="mode"]');
    
    // Random mode controls
    const timerSelect = document.getElementById('timer-select');
    
    // Progression mode controls
    const keySelect = document.getElementById('key-select');
    const generateBtn = document.getElementById('generate-btn');
    const songDisplay = document.getElementById('song-display');
    
    // Metronome elements
    const bpmSlider = document.getElementById('bpm-slider');
    const bpmDisplay = document.getElementById('bpm-display');
    const muteBtn = document.getElementById('mute-btn');

    // --- 6. INITIALIZATION ---
    populateChordGrid(grid);
    // Set initial panel visibility
    toggleModePanels(); 

    // --- 7. EVENT LISTENERS ---
    // Practice listeners
    startBtn.addEventListener('click', () => startPractice(display, timerSelect));
    stopBtn.addEventListener('click', () => stopPractice(display, songDisplay));
    
    // Mode listeners
    modeRadios.forEach(radio => radio.addEventListener('change', toggleModePanels));
    
    // Progression listeners
    keySelect.addEventListener('change', (e) => currentKey = e.target.value);
    generateBtn.addEventListener('click', () => generateSong(songDisplay));
    
    // Metronome listeners
    bpmSlider.addEventListener('input', (e) => {
        currentBPM = parseInt(e.target.value, 10);
        bpmDisplay.textContent = currentBPM;
    });
    muteBtn.addEventListener('click', () => toggleMute(muteBtn));
});


// --- CHORD SELECTION ---
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

// --- NEW: MODE SWITCHING ---
function toggleModePanels() {
    currentMode = document.querySelector('input[name="mode"]:checked').value;
    const randomPanel = document.getElementById('random-mode-panel');
    const progressionPanel = document.getElementById('progression-mode-panel');

    if (currentMode === 'random') {
        randomPanel.style.display = 'block';
        progressionPanel.style.display = 'none';
    } else {
        randomPanel.style.display = 'none';
        progressionPanel.style.display = 'block';
    }
}

// --- NEW: PRACTICE ROUTER ---
/**
 * Starts the correct practice mode based on the selected radio button.
 */
function startPractice(displayElement, timerElement) {
    stopPractice(displayElement); // Stop any previous session

    if (currentMode === 'random') {
        startRandomPractice(displayElement, timerElement);
    } else {
        startProgressionPlayer(displayElement);
    }
}

/**
 * Stops all practice modes and resets the state.
 */
function stopPractice(displayElement, songDisplayElement) {
    // Stop random timer
    clearInterval(practiceInterval);
    practiceInterval = null;
    
    // Stop metronome
    stopMetronome();
    
    // Reset progression state
    generatedSong = [];
    currentMeasure = 0;
    beatInMeasure = 1;
    if (songDisplayElement) { // Check if it exists (it might not on initial load)
        songDisplayElement.textContent = 'Select a key and generate a song...';
    }
    
    displayElement.textContent = 'Practice Stopped.';
    displayElement.classList.remove('visual-flash'); // Ensure flash is off
}


// --- RANDOM MODE LOGIC (Original) ---
function startRandomPractice(displayElement, timerElement) {
    if (selectedChords.length < 2) {
        displayElement.textContent = 'Select 2+ chords!';
        return;
    }
    
    const duration = parseInt(timerElement.value, 10);
    generateNewPair(displayElement); // Show first pair immediately
    practiceInterval = setInterval(() => {
        generateNewPair(displayElement);
    }, duration);
    
    // Start metronome
    startMetronome(displayElement);
}

function generateNewPair(displayElement) {
    let index1 = Math.floor(Math.random() * selectedChords.length);
    let index2 = Math.floor(Math.random() * selectedChords.length);
    while (index1 === index2) {
        index2 = Math.floor(Math.random() * selectedChords.length);
    }
    displayElement.textContent = `${selectedChords[index1]}  →  ${selectedChords[index2]}`;
}


// --- NEW: PROGRESSION MODE LOGIC ---

/**
 * Generates a song based on selected chords and key.
 */
function generateSong(songDisplayElement) {
    const keyChords = KEY_DATABASE[currentKey];
    if (!keyChords) {
        songDisplayElement.textContent = "Error: Key not found.";
        return;
    }

    // Find all progressions that *can* be played with the selected chords
    const validProgressions = PROGRESSION_DATABASE.filter(prog => {
        // Check every required chord type (e.g., 'I', 'IV', 'V')
        return prog.requiredTypes.every(romanNumeral => {
            // 1. Translate Roman numeral to a chord name (e.g., 'I' -> 'G')
            const chordName = keyChords[romanNumeral];
            // 2. Check if that chord name is in the user's selectedChords list
            return selectedChords.includes(chordName);
        });
    });

    if (validProgressions.length === 0) {
        songDisplayElement.textContent = "No valid progressions found for your selected chords. Try adding more chords (like I, IV, V, vi).";
        return;
    }

    // Pick one valid progression at random
    const chosenProgression = validProgressions[Math.floor(Math.random() * validProgressions.length)];
    
    // Translate the Roman numerals into the final song array
    generatedSong = chosenProgression.progression.map(romanNumeral => {
        return keyChords[romanNumeral] || '?'; // '?' as a fallback
    });

    // Display the song
    songDisplayElement.textContent = `${chosenProgression.name}: ${generatedSong.join(' → ')}`;
}

/**
 * Starts the metronome and syncs chord changes to it.
 */
function startProgressionPlayer(displayElement) {
    if (generatedSong.length === 0) {
        displayElement.textContent = 'Generate a song first!';
        return;
    }

    // Reset counters
    currentMeasure = 0;
    beatInMeasure = 1;

    // Show the first chord immediately
    displayElement.textContent = generatedSong[currentMeasure];

    // Start the metronome
    startMetronome(displayElement);
}

/**
 * This new function is called by the scheduler on beat 1.
 */
function updateProgressionDisplay(displayElement) {
    // Increment the measure, looping back to the start if we reach the end
    currentMeasure = (currentMeasure + 1) % generatedSong.length;
    
    // Display the chord for the new measure
    displayElement.textContent = generatedSong[currentMeasure];
}


// --- METRONOME LOGIC (Modified) ---

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

function startMetronome(displayElement) {
    if (!audioContext) initAudio();
    audioContext.resume();
    nextNoteTime = audioContext.currentTime;
    metronomeInterval = setInterval(() => scheduler(displayElement), lookahead);
}

function stopMetronome() {
    clearInterval(metronomeInterval);
    metronomeInterval = null;
}

/**
* MODIFIED: The scheduler now also handles progression chord changes.
*/
function scheduler(displayElement) {
    while (nextNoteTime < audioContext.currentTime + scheduleAheadTime) {
        // Schedule the audio click
        scheduleNote(nextNoteTime);
        
        // --- Schedule Visuals ---
        const visualDelay = (nextNoteTime - audioContext.currentTime) * 1000;
        
        // Schedule the visual flash
        setTimeout(() => {
            displayElement.classList.add('visual-flash');
            setTimeout(() => displayElement.classList.remove('visual-flash'), 100);
        }, visualDelay);

        // --- Progression Logic ---
        if (currentMode === 'progression' && beatInMeasure === 1) {
            // On beat 1, schedule the chord display to change
            setTimeout(() => {
                updateProgressionDisplay(displayElement);
            }, visualDelay);
        }

        // Advance to the next note time
        const secondsPerBeat = 60.0 / currentBPM;
        nextNoteTime += secondsPerBeat;
        
        // Advance the beat counter
        beatInMeasure = (beatInMeasure % 4) + 1; // Loops 1, 2, 3, 4, 1...
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
