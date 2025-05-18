// Simplified Mac OS Synth using Web Audio API - Adapted for React
function initMacSynth() {
    console.log('Initializing Mac Synth...');
    
    // Audio context setup
    let audioCtx;
    let masterGain;
    let activeOscillators = {};
    let activeNotes = new Set();
    
    // Synth parameters and nodes
    let currentWaveform = 'sine';
    
    // ADSR defaults - simplified but still used internally
    let attackTime = 0.1;
    let decayTime = 0.2;
    let sustainLevel = 0.7;
    let releaseTime = 0.3;
    
    // Effects nodes
    let delayNode;
    let reverbGain;
    let delayGain;
    
    // Initialize Audio Context
    function initAudio() {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = 0.7;
        masterGain.connect(audioCtx.destination);
        
        // Setup delay node
        delayNode = audioCtx.createDelay();
        delayNode.delayTime.value = 0.3;
        delayGain = audioCtx.createGain();
        delayGain.gain.value = 0;
        
        // Connect delay
        delayGain.connect(audioCtx.destination);
        delayNode.connect(delayGain);
        masterGain.connect(delayNode);
        
        // Simple reverb (using gain as a simple approximation)
        reverbGain = audioCtx.createGain();
        reverbGain.gain.value = 0;
        reverbGain.connect(audioCtx.destination);
        masterGain.connect(reverbGain);
    }
    
    // Play a note
    function playNote(note) {
        if (!audioCtx) initAudio();
        
        if (activeNotes.has(note)) return; // Note is already playing
        activeNotes.add(note);
        
        // Create oscillator
        const osc = audioCtx.createOscillator();
        osc.type = currentWaveform;
        osc.frequency.value = getNoteFrequency(note);
        
        // Create gain node for this note
        const noteGain = audioCtx.createGain();
        noteGain.gain.value = 0;
        
        // Connect oscillator to gain and then to master gain
        osc.connect(noteGain);
        noteGain.connect(masterGain);
        
        // Apply ADSR envelope
        const now = audioCtx.currentTime;
        noteGain.gain.setValueAtTime(0, now);
        noteGain.gain.linearRampToValueAtTime(1, now + attackTime);
        noteGain.gain.linearRampToValueAtTime(sustainLevel, now + attackTime + decayTime);
        
        // Start oscillator
        osc.start();
        
        // Store oscillator and gain node
        activeOscillators[note] = { osc, noteGain };
        
        // Update UI
        const keyElement = document.querySelector(`.key[data-note="${note}"]`);
        if (keyElement) keyElement.classList.add('active');
    }
    
    // Stop a note
    function stopNote(note) {
        if (!activeOscillators[note]) return;
        
        const { osc, noteGain } = activeOscillators[note];
        const now = audioCtx.currentTime;
        
        // Release phase
        noteGain.gain.setValueAtTime(noteGain.gain.value, now);
        noteGain.gain.linearRampToValueAtTime(0, now + releaseTime);
        
        // Schedule oscillator stop
        osc.stop(now + releaseTime);
        
        // Clean up
        setTimeout(() => {
            activeNotes.delete(note);
            delete activeOscillators[note];
        }, releaseTime * 1000);
        
        // Update UI
        const keyElement = document.querySelector(`.key[data-note="${note}"]`);
        if (keyElement) keyElement.classList.remove('active');
    }
    
    // Convert note to frequency
    function getNoteFrequency(note) {
        const noteMap = {
            'C4': 261.63,
            'C#4': 277.18,
            'D4': 293.66,
            'D#4': 311.13,
            'E4': 329.63,
            'F4': 349.23,
            'F#4': 369.99,
            'G4': 392.00,
            'G#4': 415.30,
            'A4': 440.00,
            'A#4': 466.16,
            'B4': 493.88,
            'C5': 523.25
        };
        return noteMap[note] || 440;
    }
    
    // Change sound mode
    function setSoundMode(mode) {
        switch(mode) {
            case 'retro-game':
                currentWaveform = 'square';
                attackTime = 0.01;
                decayTime = 0.1;
                sustainLevel = 0.6;
                releaseTime = 0.1;
                break;
            case 'soft-keys':
                currentWaveform = 'sine';
                attackTime = 0.05;
                decayTime = 0.2;
                sustainLevel = 0.7;
                releaseTime = 0.3;
                break;
            case 'dreamy':
                currentWaveform = 'sine';
                attackTime = 0.2;
                decayTime = 0.3;
                sustainLevel = 0.6;
                releaseTime = 0.5;
                // Add delay and reverb for dreaminess
                if (delayGain) delayGain.gain.value = 0.4;
                if (reverbGain) reverbGain.gain.value = 0.3;
                return;
            case 'sharp':
                currentWaveform = 'sawtooth';
                attackTime = 0.01;
                decayTime = 0.1;
                sustainLevel = 0.8;
                releaseTime = 0.1;
                break;
        }
        
        // Reset effects for non-dreamy modes
        if (mode !== 'dreamy') {
            if (delayGain) delayGain.gain.value = 0;
            if (reverbGain) reverbGain.gain.value = 0;
        }
    }
    
    // Initialize the keyboard event listeners
    function initKeyboard() {
        const keys = document.querySelectorAll('.key');
        if (!keys.length) {
            console.warn('No keyboard keys found');
            return;
        }
        
        keys.forEach(key => {
            const note = key.getAttribute('data-note');
            
            key.addEventListener('mousedown', () => {
                playNote(note);
            });
            
            key.addEventListener('mouseup', () => {
                stopNote(note);
            });
            
            key.addEventListener('mouseout', () => {
                if (activeNotes.has(note)) {
                    stopNote(note);
                }
            });
            
            // Touch support
            key.addEventListener('touchstart', (e) => {
                e.preventDefault();
                playNote(note);
            });
            
            key.addEventListener('touchend', (e) => {
                e.preventDefault();
                stopNote(note);
            });
        });
    }
    
    // Initialize sound mode buttons
    function initSoundModeButtons() {
        const buttons = document.querySelectorAll('.sound-mode-button');
        if (!buttons.length) {
            console.warn('No sound mode buttons found');
            return;
        }
        
        buttons.forEach(button => {
            const mode = button.getAttribute('data-mode');
            
            button.addEventListener('click', () => {
                // Remove active class from all buttons
                buttons.forEach(btn => btn.classList.remove('active'));
                
                // Add active class to clicked button
                button.classList.add('active');
                
                // Set sound mode
                setSoundMode(mode);
            });
        });
        
        // Set default mode (first button)
        buttons[0].classList.add('active');
        setSoundMode(buttons[0].getAttribute('data-mode'));
    }
    
    // Initialize the effects controls
    function initEffectsControls() {
        const delayControl = document.getElementById('delay-control');
        const reverbControl = document.getElementById('reverb-control');
        
        if (delayControl) {
            delayControl.addEventListener('input', (e) => {
                if (delayGain) delayGain.gain.value = e.target.value;
            });
        } else {
            console.warn('Delay control not found');
        }
        
        if (reverbControl) {
            reverbControl.addEventListener('input', (e) => {
                if (reverbGain) reverbGain.gain.value = e.target.value * 0.5; // Scale down reverb
            });
        } else {
            console.warn('Reverb control not found');
        }
    }
    
    // Computer keyboard support
    function initComputerKeyboard() {
        const keyMap = {
            'a': 'C4',
            'w': 'C#4',
            's': 'D4',
            'e': 'D#4',
            'd': 'E4',
            'f': 'F4',
            't': 'F#4',
            'g': 'G4',
            'y': 'G#4',
            'h': 'A4',
            'u': 'A#4',
            'j': 'B4',
            'k': 'C5'
        };
        
        document.addEventListener('keydown', (e) => {
            if (keyMap[e.key] && !activeNotes.has(keyMap[e.key])) {
                playNote(keyMap[e.key]);
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (keyMap[e.key]) {
                stopNote(keyMap[e.key]);
            }
        });
    }
    
    // Initialize everything
    function init() {
        console.log('Initializing synth components...');
        
        // Only initialize the audio context on user interaction
        document.addEventListener('click', function initOnFirstClick() {
            if (!audioCtx) initAudio();
            document.removeEventListener('click', initOnFirstClick);
        }, { once: true });
        
        // Init UI components
        setTimeout(() => {
            initKeyboard();
            initSoundModeButtons();
            initEffectsControls();
            initComputerKeyboard();
            console.log('Synth UI initialized!');
        }, 500); // Short delay to ensure DOM is ready
    }
    
    // Run initialization
    init();
}

// Make the function available globally
window.initMacSynth = initMacSynth; 