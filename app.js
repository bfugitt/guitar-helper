// --- 1. CONFIGURATION ---
const ALL_CHORDS = [
    'A', 'Am', 'A7', 'B', 'Bm', 'B7', 'C', 'Cadd9', 'C#m',
    'D', 'Dm', 'D7', 'E', 'Em', 'E7', 'F', 'Fmaj7', 'F#m', 'G', 'G7'
].sort();

// --- 2. PHRASE "DATABASE" (was PROGRESSION_DATABASE) ---
const PHRASE_DATABASE = [
    // --- 4-Bar Phrases ---
    { name: "Doo-Wop / '50s", length: 4, progression: ['I', 'vi', 'IV', 'V'], requiredTypes: ['I', 'vi', 'IV', 'V'] },
    { name: "Feel-Good / Pop", length: 4, progression: ['I', 'V', 'vi', 'IV'], requiredTypes: ['I', 'V', 'vi', 'IV'] },
    { name: "Axis of Awesome", length: 4, progression: ['vi', 'IV', 'I', 'V'], requiredTypes: ['vi', 'IV', 'I', 'V'] },
    { name: "Jazz ii-V-I", length: 4, progression: ['ii', 'V', 'I', 'I'], requiredTypes: ['I', 'ii', 'V'] },
    { name: "Simple Cadence", length: 4, progression: ['I', 'IV', 'V', 'I'], requiredTypes: ['I', 'IV', 'V'] },
    // --- 2-Bar Phrases ---
    { name: "Amen (Plagal) Cadence", length: 2, progression: ['IV', 'I'], requiredTypes: ['I', 'IV'] },
    { name: "Perfect Cadence", length: 2, progression: ['V', 'I'], requiredTypes: ['I', 'V'] },
    { name: "Classic ii-V", length: 2, progression: ['ii', 'V'], requiredTypes: ['ii', 'V'] },
    { name: "Verse to Chorus (IV-V)", length: 2, progression: ['IV', 'V'], requiredTypes: ['IV', 'V'] },
    { name: "Minor Drop", length: 2, progression: ['I', 'vi'], requiredTypes: ['I', 'vi'] },
    // --- 12-Bar Blues ---
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
let loopMode = 'loop'; // 'loop' or 'regenerate'

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
let generatedSong = []; 
let currentMeasure = 0; 
let beatInMeasure = 1; 

// --- 6. DOM ELEMENTS (NEW) ---
// We define these here so we can access them from multiple functions
let displayContainer, currentChordDisplay, nextChordDisplay, songDisplayElement;

document.addEventListener('DOMContentLoaded', () => {
    // Get all the elements
    const grid = document.getElementById('chord-selection-grid');
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    
    // Mode panels
    const modeRadios = document.querySelectorAll('input[name="mode"]');
    
    // Random mode controls
    const timerSelect = document.getElementById('timer-select');
    
    // Progression mode controls
    const generateBtn = document.getElementById('generate-btn');
    const loopToggle = document.getElementById('loop-toggle'); 
    
    // Metronome elements
    const bpmSlider = document.getElementById('bpm-slider');
    const bpmDisplay = document.getElementById('bpm-display');
    const muteBtn = document.getElementById('mute-btn');
    
    // NEW: Assign global display elements
    displayContainer = document.querySelector('.visual-flash-target');
    currentChordDisplay = document.getElementById('current-chord-display');
    nextChordDisplay = document.getElementById('next-chord-display');
    songDisplayElement = document.getElementById('song-display');

    // --- 7. INITIALIZATION ---
    populateChordGrid(grid);
    toggleModePanels(); // This will also hide/show next-chord display
    stopPractice(); // Set the initial "..." text

    // --- 8. EVENT LISTENERS ---
    // Practice listeners
    startBtn.addEventListener('click', () => startPractice(timerSelect));
    stopBtn.addEventListener('click', () => stopPractice());
    
    // Mode listeners
    modeRadios.forEach(radio => radio.addEventListener('change', () => {
        toggleModePanels();
        stopPractice();
        generatedSong = [];
    }));
    
    // Progression listeners
    generateBtn.addEventListener('click', () => generateSong());
    loopToggle.addEventListener('change', (e) => {
        loopMode = e.target.checked ? 'regenerate' : 'loop';
    });
    
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

// --- MODE SWITCHING (UPDATED) ---
function toggleModePanels() {
    currentMode = document.querySelector('input[name="mode"]:checked').value;
    const randomPanel = document.getElementById('random-mode-panel');
    const progressionPanel = document.getElementById('progression-mode-panel');

    if (currentMode === 'random') {
        randomPanel.style.display = 'block';
        progressionPanel.style.display = 'none';
        nextChordDisplay.style.display = 'none'; // Hide next chord
    } else {
        randomPanel.style.display = 'none';
        progressionPanel.style.display = 'block';
        nextChordDisplay.style.display = 'block'; // Show next chord
    }
}

// --- PRACTICE ROUTER (UPDATED) ---
function startPractice(timerElement) {
    // 1. Stop any currently running timers
    clearInterval(practiceInterval);
    practiceInterval = null;
    stopMetronome();
    
    // 2. Reset beat/measure counters
    currentMeasure = 0;
    beatInMeasure = 1;

    // 3. Route to the correct mode
    if (currentMode === 'random') {
        startRandomPractice(timerElement);
    } else {
        startProgressionPlayer();
    }
}

function stopPractice() {
    // Stop timers
    clearInterval(practiceInterval);
    practiceInterval = null;
    stopMetronome();
    
    // Reset progression player
    currentMeasure = 0;
    beatInMeasure = 1;
    
    if (currentMode === 'progression') {
        songDisplayElement.textContent = "Select chords and generate a song...";
        generatedSong = []; // Clear the song *on stop*
    }
    
    currentChordDisplay.textContent = '...';
    nextChordDisplay.textContent = '';
    displayContainer.classList.remove('visual-flash');
}


// --- RANDOM MODE LOGIC (UPDATED) ---
function startRandomPractice(timerElement) {
    if (selectedChords.length < 2) {
        currentChordDisplay.textContent = 'Select 2+ chords!';
        return;
    }
    
    const duration = parseInt(timerElement.value, 10);
    generateNewPair(); // Show first pair immediately
    practiceInterval = setInterval(() => {
        generateNewPair();
    }, duration);
    
    startMetronome(); // Start metronome
}

function generateNewPair() {
    let index1 = Math.floor(Math.random() * selectedChords.length);
    let index2 = Math.floor(Math.random() * selectedChords.length);
    while (index1 === index2) {
        index2 = Math.floor(Math.random() * selectedChords.length);
    }
    // Update the main display only
    currentChordDisplay.textContent = `${selectedChords[index1]}  →  ${selectedChords[index2]}`;
    nextChordDisplay.textContent = ''; // No "next" in random mode
}


// --- PROGRESSION MODE LOGIC (NEW & IMPROVED) ---

/**
 * NEW: Generates a *single song* from the database.
 */
function generateSong() {
    let allPossibleSongs = [];

    // Loop through every key
    for (const keyName of Object.keys(KEY_DATABASE)) {
        const keyChords = KEY_DATABASE[keyName];

        // For this key, loop through all available phrases
        for (const phrase of PHRASE_DATABASE) {
            
            // Check if the user has selected all the chords required for this phrase
            const phraseIsPossible = phrase.requiredTypes.every(romanNumeral => {
                const chordName = keyChords[romanNumeral];
                return selectedChords.includes(chordName);
            });

            // If yes, this is a valid song!
            if (phraseIsPossible) {
                // Translate the Roman numerals into actual chords
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
        songDisplayElement.textContent = "No progressions found. Try selecting more chords (e.g., G, C, and D).";
        generatedSong = []; // Clear any old song
        return;
    }

    // --- NEW "SONG" LOGIC ---
    // Pick ONE song at random from all the possibilities
    const chosenSong = allPossibleSongs[Math.floor(Math.random() * allPossibleSongs.length)];
    
    // Set the global state
    generatedSong = chosenSong.progression;

    // Display the song
    songDisplayElement.textContent = `${chosenSong.name} (in ${chosenSong.key}): ${generatedSong.join(' → ')}`;
}

/**
 * Starts the metronome and syncs chord changes to it.
 */
function startProgressionPlayer() {
    if (generatedSong.length === 0) {
        currentChordDisplay.textContent = 'Generate a song first!';
        return;
    }
    
    // Set the initial display
    let nextMeasure = (currentMeasure + 1) % generatedSong.length;
    currentChordDisplay.textContent = generatedSong[currentMeasure];
    nextChordDisplay.textContent = generatedSong[nextMeasure];

    // Start the metronome
    startMetronome();
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

function startMetronome() {
    if (!audioContext) initAudio();
    audioContext.resume();
    nextNoteTime = audioContext.currentTime;
    metronomeInterval = setInterval(() => scheduler(), lookahead);
}

function stopMetronome() {
    clearInterval(metronomeInterval);
    metronomeInterval = null;
}

/**
* MODIFIED: The scheduler now handles "next chord" and "regenerate" logic.
*/
function scheduler() {
    while (nextNoteTime < audioContext.currentTime + scheduleAheadTime) {
        // Schedule the audio click
        scheduleNote(nextNoteTime);
        
        // --- Schedule Visuals ---
        const visualDelay = (nextNoteTime - audioContext.currentTime) * 1000;
        
        // Schedule the visual flash
        setTimeout(() => {
            displayContainer.classList.add('visual-flash');
            setTimeout(() => displayContainer.classList.remove('visual-flash'), 100);
        }, visualDelay);

        // --- Progression Logic ---
        if (currentMode === 'progression' && beatInMeasure === 1) {
            // On beat 1, schedule the chord display to change
            setTimeout(() => {
                // Get the 'next' measure index, looping around
                let nextMeasure = (currentMeasure + 1) % generatedSong.length;
                
                // Update the text content
                currentChordDisplay.textContent = generatedSong[currentMeasure];
                nextChordDisplay.textContent = generatedSong[nextMeasure];
                
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
             
             // --- NEW LOOP LOGIC ---
             // If we've just looped back to the *start* of the song...
             if (currentMeasure === 0 && loopMode === 'regenerate') {
                // ...and the toggle is set to "regenerate",
                // make a new song *silently*.
                // The scheduler will pick it up on the *next* beat.
                generateSong();
             }
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
