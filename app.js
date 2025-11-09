// --- 1. CONFIGURATION ---
const ALL_CHORDS = [
    'A', 'Am', 'A7', 'B', 'Bm', 'B7', 'C', 'Cadd9', 'C#m',
    'D', 'Dm', 'D7', 'E', 'Em', 'E7', 'F', 'Fmaj7', 'F#m', 'G', 'G7'
].sort();

// --- 2. PROGRESSION "DATABASES" ---

// RENAMED and EXPANDED
// We now have short phrases of 2 or 4 bars
const PHRASE_DATABASE = [
    // --- 4-Bar Phrases ---
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
    },
    {
        name: "Simple Cadence",
        length: 4,
        progression: ['I', 'IV', 'V', 'I'],
        requiredTypes: ['I', 'IV', 'V']
    },
    
    // --- 2-Bar Phrases ---
    {
        name: "Amen (Plagal) Cadence",
        length: 2,
        progression: ['IV', 'I'],
        requiredTypes: ['I', 'IV']
    },
    {
        name: "Perfect Cadence",
        length: 2,
        progression: ['V', 'I'],
        requiredTypes: ['I', 'V']
    },
    {
        name: "Classic ii-V",
        length: 2,
        progression: ['ii', 'V'],
        requiredTypes: ['ii', 'V']
    },
    {
        name: "Verse to Chorus (IV-V)",
        length: 2,
        progression: ['IV', 'V'],
        requiredTypes: ['IV', 'V']
    },
    {
        name: "Minor Drop",
        length: 2,
        progression: ['I', 'vi'],
        requiredTypes: ['I', 'vi']
    }
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


// --- 6. DOM ELEMENTS ---
document.addEventListener('DOMContentLoaded', () => {
    // Get all the elements
    const grid = document.getElementById('chord-selection-grid');
    const display = document.getElementById('chord-display');
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    
    // Mode panels
    const modeRadios = document.querySelectorAll('input[name="mode"]');
    
    // Random mode controls
    const timerSelect = document.getElementById('timer-select');
    
    // Progression mode controls
    const generateBtn = document.getElementById('generate-btn');
    const songDisplay = document.getElementById('song-display');
    const loopToggle = document.getElementById('loop-toggle'); // NEW
    
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
        stopPractice(display, songDisplay);
        generatedSong = [];
    }));
    
    // Progression listeners
    generateBtn.addEventListener('click', () => generateSong(songDisplay));
    // NEW: Listen to the loop toggle
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


// ... (populateChordGrid, handleChordClick, toggleModePanels functions are UNCHANGED) ...
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
// --- PRACTICE ROUTER (UNCHANGED) ---
function startPractice(displayElement, timerElement) {
    clearInterval(practiceInterval);
    practiceInterval = null;
    stopMetronome();
    
    currentMeasure = 0;
    beatInMeasure = 1;

    if (currentMode === 'random') {
        startRandomPractice(displayElement, timerElement);
    } else {
        startProgressionPlayer(displayElement);
    }
}
function stopPractice(displayElement, songDisplayElement) {
    clearInterval(practiceInterval);
    practiceInterval = null;
    stopMetronome();
    
    currentMeasure = 0;
    beatInMeasure = 1;
    
    if (currentMode === 'progression' && songDisplayElement) {
        songDisplayElement.textContent = "Select chords and generate a song...";
        generatedSong = []; // Clear the song *on stop*
    }
    
    displayElement.textContent = 'Practice Stopped.';
    displayElement.classList.remove('visual-flash');
}


// --- RANDOM MODE LOGIC (UNCHANGED) ---
function startRandomPractice(displayElement, timerElement) {
    if (selectedChords.length < 2) {
        displayElement.textContent = 'Select 2+ chords!';
        return;
    }
    const duration = parseInt(timerElement.value, 10);
    generateNewPair(displayElement);
    practiceInterval = setInterval(() => {
        generateNewPair(displayElement);
    }, duration);
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


// --- PROGRESSION MODE LOGIC (NEW & IMPROVED) ---

/**
 * NEW: Generates a song by combining 4 random phrases.
 */
function generateSong(songDisplayElement) {
    let allPossiblePhrases = [];

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

            // If yes, this is a valid phrase!
            if (phraseIsPossible) {
                // Translate the Roman numerals into actual chords
                const translatedProgression = phrase.progression.map(romanNumeral => keyChords[romanNumeral] || '?');
                
                allPossiblePhrases.push({
                    key: keyName,
                    name: phrase.name,
                    progression: translatedProgression,
                    length: phrase.length
                });
            }
        }
    }

    if (allPossiblePhrases.length === 0) {
        songDisplayElement.textContent = "No progressions found. Try selecting more chords (e.g., G, C, and D).";
        generatedSong = []; // Clear any old song
        return;
    }

    // --- NEW "SONG ASSEMBLY" LOGIC ---
    generatedSong = []; // Clear the song
    let songNames = [];
    let totalBars = 0;
    const PHRASES_PER_SONG = 4; // Let's make a song from 4 phrases

    for (let i = 0; i < PHRASES_PER_SONG; i++) {
        // Pick one phrase at random from all the possibilities
        const chosenPhrase = allPossiblePhrases[Math.floor(Math.random() * allPossiblePhrases.length)];
        
        // Add its chords to the song
        generatedSong.push(...chosenPhrase.progression);
        
        // Add its name for the display
        songNames.push(chosenPhrase.name);
        totalBars += chosenPhrase.length;
    }

    // Display the song
    songDisplayElement.innerHTML = `<strong>${totalBars}-Bar Song Medley (in ${allPossiblePhrases[0].key}):</strong><br>${songNames.join('  →  ')}`;
}

/**
 * Starts the metronome and syncs chord changes to it. (Unchanged)
 */
function startProgressionPlayer(displayElement) {
    if (generatedSong.length === 0) {
        displayElement.textContent = 'Generate a song first!';
        return;
    }
    displayElement.textContent = generatedSong[currentMeasure];
    startMetronome(displayElement);
}


// --- METRONOME LOGIC (Modified) ---

// ... (initAudio, toggleMute, startMetronome, stopMetronome functions are UNCHANGED) ...
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
* MODIFIED: The scheduler now handles the "loop" or "regenerate" logic.
*/
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
             
             // --- NEW LOOP LOGIC ---
             // If we've just looped back to the *start* of the song...
             if (currentMeasure === 0 && loopMode === 'regenerate') {
                // ...and the toggle is set to "regenerate",
                // make a new song *silently*.
                // The scheduler will pick it up on the *next* beat.
                generateSong(document.getElementById('song-display'));
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
