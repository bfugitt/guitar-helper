// --- 1. CONFIGURATION ---
const ALL_CHORDS = [
    'A', 'Am', 'A7', 'B7', 'C', 'Cadd9', 'D', 'Dm', 'D7',
    'E', 'Em', 'E7', 'Fmaj7', 'G', 'G7'
].sort();

// --- 2. APP STATE ---
let selectedChords = [];
let practiceInterval = null; // For the CHORD CHANGE timer

// --- 3. METRONOME STATE ---
let audioContext;       // The main Web Audio API object
let gainNode;           // Controls the volume (for muting)
let currentBPM = 80;
let isMuted = false;
let metronomeInterval = null; // For the METRONOME tick scheduler
let nextNoteTime = 0.0; // When the next note is scheduled to play
const lookahead = 25.0; // How often we check for notes (ms)
const scheduleAheadTime = 0.1; // How far ahead to schedule audio (s)

// --- 4. DOM ELEMENTS ---
document.addEventListener('DOMContentLoaded', () => {
    // Get all the elements
    const grid = document.getElementById('chord-selection-grid');
    const display = document.getElementById('chord-display');
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    const timerSelect = document.getElementById('timer-select');
    
    // Metronome elements
    const bpmSlider = document.getElementById('bpm-slider');
    const bpmDisplay = document.getElementById('bpm-display');
    const muteBtn = document.getElementById('mute-btn');

    // --- 5. INITIALIZATION ---
    populateChordGrid(grid);

    // --- 6. EVENT LISTENERS ---
    // Practice listeners
    startBtn.addEventListener('click', () => startPractice(display, timerSelect));
    stopBtn.addEventListener('click', () => stopPractice(display));
    
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

// --- PRACTICE SESSION LOGIC ---
function startPractice(displayElement, timerElement) {
    stopPractice(displayElement); // Stop any previous session

    if (selectedChords.length < 2) {
        displayElement.textContent = 'Select 2+ chords!';
        return;
    }

    // Start the chord changer
    const duration = parseInt(timerElement.value, 10);
    generateNewPair(displayElement); // Show first pair immediately
    practiceInterval = setInterval(() => {
        generateNewPair(displayElement);
    }, duration);
    
    // Start the metronome
    startMetronome(displayElement);
}

function stopPractice(displayElement) {
    // Stop chord changer
    clearInterval(practiceInterval);
    practiceInterval = null;
    
    // Stop metronome
    stopMetronome();
    
    displayElement.textContent = 'Practice Stopped.';
    displayElement.classList.remove('visual-flash'); // Ensure flash is off
}

function generateNewPair(displayElement) {
    let index1 = Math.floor(Math.random() * selectedChords.length);
    let index2 = Math.floor(Math.random() * selectedChords.length);
    while (index1 === index2) {
        index2 = Math.floor(Math.random() * selectedChords.length);
    }
    displayElement.textContent = `${selectedChords[index1]}  →  ${selectedChords[index2]}`;
}

// --- METRONOME LOGIC ---

/**
 * Initializes the Web Audio API. Must be called after a user clicks.
 */
function initAudio() {
    if (audioContext) return; // Already initialized
    
    // Create the main audio context
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create a Gain Node (volume control)
    gainNode = audioContext.createGain();
    
    // Connect the gain node to the speakers
    gainNode.connect(audioContext.destination);
    
    // Set initial volume based on mute state
    gainNode.gain.setValueAtTime(isMuted ? 0 : 1, audioContext.currentTime);
}

/**
 * Toggles the metronome's mute state.
 */
function toggleMute(muteBtn) {
    isMuted = !isMuted;
    muteBtn.classList.toggle('muted', isMuted);
    muteBtn.textContent = isMuted ? 'Unmute' : 'Mute';
    
    if (gainNode) {
        // Set the volume (0 = mute, 1 = full)
        gainNode.gain.setValueAtTime(isMuted ? 0 : 1, audioContext.currentTime);
    }
}

/**
 * Starts the metronome scheduler.
 */
function startMetronome(displayElement) {
    if (!audioContext) {
        initAudio(); // Initialize audio on first start
    }
    
    // Resume context if it was suspended (a browser requirement)
    audioContext.resume();
    
    nextNoteTime = audioContext.currentTime; // Start scheduling from now
    
    // Start the scheduler interval
    metronomeInterval = setInterval(() => {
        scheduler(displayElement);
    }, lookahead);
}

/**
 * Stops the metronome scheduler.
 */
function stopMetronome() {
    clearInterval(metronomeInterval);
    metronomeInterval = null;
}

/**
 * The "heart" of the metronome. Runs every 'lookahead' milliseconds
 * to see if any new notes need to be scheduled.
 */
function scheduler(displayElement) {
    // Keep scheduling notes as long as they are in the near future
    while (nextNoteTime < audioContext.currentTime + scheduleAheadTime) {
        // Schedule the audio click
        scheduleNote(nextNoteTime);
        
        // Trigger the visual flash
        // We use a small timeout to sync the visual flash with the audio
        const visualDelay = (nextNoteTime - audioContext.currentTime) * 1000;
        
        setTimeout(() => {
            displayElement.classList.add('visual-flash');
            // Remove the flash after a short duration
            setTimeout(() => displayElement.classList.remove('visual-flash'), 100);
        }, visualDelay);

        // Advance to the next note time
        const secondsPerBeat = 60.0 / currentBPM;
        nextNoteTime += secondsPerBeat;
    }
}

/**
 * Creates and schedules a single audio "beep" for a precise time.
 * @param {number} time - The audioContext.currentTime when the note should play.
 */
function scheduleNote(time) {
    // Create a new sound source (an oscillator)
    const osc = audioContext.createOscillator();
    osc.type = 'triangle'; // A simple, non-annoying "beep"
    osc.frequency.setValueAtTime(880, time); // A 'click' frequency (A5)
    
    // Connect the oscillator to the gain node (which controls volume)
    osc.connect(gainNode);
    
    // Schedule the note to start at the precise time
    osc.start(time);
    // Schedule it to stop 50ms later
    osc.stop(time + 0.05);
}
