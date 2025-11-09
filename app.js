// --- 1. CONFIGURATION ---
const ALL_CHORDS = [
    'A', 'Am', 'A7', 'B', 'Bm', 'B7', 'C', 'Cadd9', 'C#m',
    'D', 'Dm', 'D7', 'E', 'Em', 'E7', 'F', 'Fmaj7', 'F#m', 'G', 'G7'
].sort();

// --- 2. PROGRESSION "DATABASES" ---
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

// Added more chords to the keys to make it smarter
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

// --- 4. METRONOME STATE ---
let audioContext;
let gainNode;
let currentBPM = 80;
let isMuted = false;
let metronomeInterval = null;
let nextNoteTime = 0.0;
const lookahead = 25.0;
const scheduleAheadTime = 0.1;

// --- 5. PROGRESSION STATE ---
let generatedSong = []; // Will hold the translated chord names, e.g., ['G', 'C', 'D']
let currentMeasure = 0; 
let beatInMeasure = 1; 


// --- 6. DOM ELEMENTS ---
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
    const generateBtn = document.getElementById('generate-btn');
    const songDisplay = document.getElementById('song-display');
    
    // Metronome elements
    const bpmSlider = document.getElementById('bpm-slider');
    const bpmDisplay = document.getElementById('bpm-display');
    const muteBtn = document.getElementById('mute-btn');

    // --- 7. INITIALIZATION ---
    populateChordGrid(grid);
    toggleModePanels(); 

    // --- 8. EVENT LISTENERS ---
    // Practice listeners
    startBtn.addEventListener('click', () => startPractice(display, timerSelect));
    stopBtn.addEventListener('click', () => stopPractice(display, songDisplay));
    
    // Mode listeners
    modeRadios.forEach(radio => radio.addEventListener('change', () => {
        toggleModePanels();
        // Fully stop and reset when switching modes
        stopPractice(display, songDisplay);
        // Also clear the generated song when switching modes
        generatedSong = [];
    }));
    
    // Progression listeners
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

// --- MODE SWITCHING ---
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

// --- PRACTICE ROUTER (BUG FIXED) ---

/**
 * Starts the correct practice mode.
 * The 'stop' calls are now handled more carefully.
 */
function startPractice(displayElement, timerElement) {
    // 1. Stop any *currently running* timers
    //    We NO LONGER call the full stopPractice() here, as that was the bug!
    clearInterval(practiceInterval);
    practiceInterval = null;
    stopMetronome();
    
    // 2. Reset beat/measure counters
    currentMeasure = 0;
    beatInMeasure = 1;

    // 3. Route to the correct mode
    if (currentMode === 'random') {
        startRandomPractice(displayElement, timerElement);
    } else {
        startProgressionPlayer(displayElement);
    }
}

/**
 * This is now ONLY for the "Stop" button.
 */
function stopPractice(displayElement, songDisplayElement) {
    // Stop timers
    clearInterval(practiceInterval);
    practiceInterval = null;
    stopMetronome();
    
    // Reset progression player
    currentMeasure = 0;
    beatInMeasure = 1;
    
    // We DON'T clear the generatedSong here, so the user can "Start" again.
    // We only reset the song display text IF we are in progression mode
    if (currentMode === 'progression' && songDisplayElement) {
        songDisplayElement.textContent = "Select chords and generate a song...";
        generatedSong = []; // Clear the song *on stop*
    }
    
    displayElement.textContent = 'Practice Stopped.';
    displayElement.classList.remove('visual-flash'); // Ensure flash is off
}


// --- RANDOM MODE LOGIC ---
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
    
    startMetronome(displayElement); // Start metronome
}

function generateNewPair(displayElement) {
    let index1 = Math.floor(Math.random() * selectedChords.length);
    let index2 = Math.floor(Math.random() * selectedChords.length);
    while (index1 === index2) {
        index2 = Math.floor(Math.random() * selectedChords.length);
    }
    displayElement.textContent = `${selectedChords[index1]}  →  ${selectedChords[index2]}`;
}


// --- PROGRESSION MODE LOGIC (NEW & IMPROVED) ---

/**
 * Smartly generates a song by checking all keys against selected chords.
 */
function generateSong(songDisplayElement) {
    let allPossibleSongs = [];

    // Loop through every key in our database (e.g., 'A', 'C', 'G'...)
    for (const keyName of Object.keys(KEY_DATABASE)) {
        const keyChords = KEY_DATABASE[keyName];

        // For this key, loop through all available progressions
        for (const prog of PROGRESSION_DATABASE) {
            
            // Check if the user has selected all the chords required for this progression *in this key*
            const progressionIsPossible = prog.requiredTypes.every(romanNumeral => {
                const chordName = keyChords[romanNumeral];
                return selectedChords.includes(chordName);
            });

            // If yes, this is a valid song!
            if (progressionIsPossible) {
                // Translate the Roman numerals into actual chords
                const songChords = prog.progression.map(romanNumeral => keyChords[romanNumeral] || '?');
                
                // Add this song to our list of possibilities
                allPossibleSongs.push({
                    key: keyName,
                    name: prog.name,
                    progression: songChords
                });
            }
        }
    }

    if (allPossibleSongs.length === 0) {
        songDisplayElement.textContent = "No progressions found. Try selecting more chords (e.g., G, C, and D).";
        generatedSong = []; // Clear any old song
        return;
    }

    // Pick one song at random from all the possibilities
    const chosenSong = allPossibleSongs[Math.floor(Math.random() * allPossibleSongs.length)];
    
    // Set the global state
    generatedSong = chosenSong.progression;

    // Display the song
    songDisplayElement.textContent = `${chosenSong.name} (in ${chosenSong.key}): ${generatedSong.join(' → ')}`;
}

/**
 * Starts the metronome and syncs chord changes to it.
 */
function startProgressionPlayer(displayElement) {
    if (generatedSong.length === 0) {
        // This error check is now for the user
        displayElement.textContent = 'Generate a song first!';
        return;
    }

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


// --- METRONOME LOGIC (Unchanged, but vital) ---

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
* The scheduler now also handles progression chord changes.
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
                // Check if we're at the *start* (beat 1, measure 0)
                // If so, we DON'T update, because 'Start' already put the
                // first chord up. This prevents a "double-tap" on the first chord.
                if (currentMeasure !== 0) {
                     updateProgressionDisplay(displayElement);
                }
            }, visualDelay);
        }

        // Advance to the next note time
        const secondsPerBeat = 60.0 / currentBPM;
        nextNoteTime += secondsPerBeat;
        
        // Advance the beat counter (loops 1, 2, 3, 4, 1...)
        beatInMeasure = (beatInMeasure % 4) + 1;
        
        // If we've just finished beat 4, increment the measure
        if (beatInMeasure === 1) {
             currentMeasure = (currentMeasure + 1) % generatedSong.length;
        }
    }
}

// A small tweak to the scheduler logic
function scheduler(displayElement) {
    while (nextNoteTime < audioContext.currentTime + scheduleAheadTime) {
        // Schedule the audio click
        scheduleNote(nextNoteTime);
        
        // --- Schedule Visuals ---
        const visualDelay = (nextNoteTime - audioContext.currentTime) * 1000;
        
        setTimeout(() => {
            displayElement.classList.add('visual-flash');
            setTimeout(() => displayElement.classList.remove('visual-flash'), 100);
        }, visualDelay);

        // --- Progression Logic ---
        if (currentMode === 'progression' && beatInMeasure === 1) {
            // On beat 1, schedule the chord display to change
            setTimeout(() => {
                // This is simpler: just update the display to the current measure.
                // 'startProgressionPlayer' already set it to measure 0.
                // The scheduler will increment it *after* this beat.
                displayElement.textContent = generatedSong[currentMeasure];
            }, visualDelay);
        }

        // Advance to the next note time
        const secondsPerBeat = 60.0 / currentBPM;
        nextNoteTime += secondsPerBeat;
        
        // Advance the beat counter (loops 1, 2, 3, 4, 1...)
        beatInMeasure = (beatInMeasure % 4) + 1;
        
        // If we've just finished beat 4, increment the measure
        if (beatInMeasure === 1) {
             currentMeasure = (currentMeasure + 1) % generatedSong.length;
        }
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
