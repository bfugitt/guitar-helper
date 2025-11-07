// --- 1. CONFIGURATION ---
// To add more chords, just add them to this array!
// The app will automatically create the buttons.
const ALL_CHORDS = [
    'A', 'Am', 'A7',
    'B', 'Bm', 'B7',
    'C', 'C7', 'Cadd9',
    'D', 'Dm', 'D7',
    'E', 'Em', 'E7',
    'F', 'Fmaj7',
    'G', 'G7'
];


// --- 2. APP STATE ---
// These variables will track the app's current state.
let selectedChords = [];
let practiceInterval = null; // This will hold our timer (so we can stop it)


// --- 3. DOM ELEMENTS ---
// We get all the HTML elements we need to work with once the page loads.
document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('chord-selection-grid');
    const display = document.getElementById('chord-display');
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    const timerSelect = document.getElementById('timer-select');

    // --- 4. INITIALIZATION ---
    // Create the chord buttons when the page loads
    populateChordGrid(grid);

    // --- 5. EVENT LISTENERS ---
    // We attach our functions to the buttons.
    startBtn.addEventListener('click', () => startPractice(display, timerSelect));
    stopBtn.addEventListener('click', () => stopPractice(display));
});


/**
 * Populates the chord grid with buttons from the ALL_CHORDS array.
 * @param {HTMLElement} gridElement - The grid container element.
 */
function populateChordGrid(gridElement) {
    // Clear the grid in case it's ever re-run
    gridElement.innerHTML = ''; 

    ALL_CHORDS.forEach(chord => {
        const button = document.createElement('button');
        button.className = 'chord-btn';
        button.textContent = chord;
        button.dataset.chord = chord; // Store the chord name in a data attribute

        // Add a click listener to *each* new button
        button.addEventListener('click', handleChordClick);
        
        gridElement.appendChild(button);
    });
}

/**
 * Handles clicks on any chord button.
 * @param {Event} event - The click event from the button.
 */
function handleChordClick(event) {
    const button = event.target;
    const chord = button.dataset.chord;

    // Toggle the 'selected' class on the button
    button.classList.toggle('selected');

    if (selectedChords.includes(chord)) {
        // If it's already in the array, remove it
        selectedChords = selectedChords.filter(c => c !== chord);
    } else {
        // If it's not in the array, add it
        selectedChords.push(chord);
    }
}

/**
 * Starts the practice session.
 * @param {HTMLElement} displayElement - The element to show the chords in.
 * @param {HTMLElement} timerElement - The <select> dropdown for the timer.
 */
function startPractice(displayElement, timerElement) {
    // 1. Stop any practice that's already running
    stopPractice(displayElement);

    // 2. Check if the user has selected enough chords
    if (selectedChords.length < 2) {
        displayElement.textContent = 'Select 2+ chords!';
        return;
    }

    // 3. Get the timer duration from the dropdown
    const duration = parseInt(timerElement.value, 10);

    // 4. Generate the first pair immediately
    generateNewPair(displayElement);

    // 5. Set an interval to generate a new pair repeatedly
    // We store the interval's ID in our state variable
    practiceInterval = setInterval(() => {
        generateNewPair(displayElement);
    }, duration);
}

/**
 * Stops the practice session.
 * @param {HTMLElement} displayElement - The element to show the chords in.
 */
function stopPractice(displayElement) {
    // Clears the repeating timer
    clearInterval(practiceInterval);
    practiceInterval = null; // Reset the state
    displayElement.textContent = 'Practice Stopped.';
}

/**
 * Generates a new, random pair of chords and updates the display.
 * @param {HTMLElement} displayElement - The element to show the chords in.
 */
function generateNewPair(displayElement) {
    // Get two random indexes from our selectedChords array
    let index1 = Math.floor(Math.random() * selectedChords.length);
    let index2 = Math.floor(Math.random() * selectedChords.length);

    // Make sure the two chords are not the same
    while (index1 === index2) {
        index2 = Math.floor(Math.random() * selectedChords.length);
    }

    const chord1 = selectedChords[index1];
    const chord2 = selectedChords[index2];

    displayElement.textContent = `${chord1}  →  ${chord2}`;
}