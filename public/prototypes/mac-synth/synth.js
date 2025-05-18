// Simplified Mac OS Synth using Web Audio API
document.addEventListener('DOMContentLoaded', function() {
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
    let reverbNode;
    let delayGain;
    let reverbGain;
    
    // DOM Elements
    const keyboard = document.getElementById('keyboard');
    const keys = document.querySelectorAll('.key');
    const soundModeButtons = document.querySelectorAll('.sound-mode-button');
    
    // Effects Controls
    const delayControl = document.getElementById('delay-control');
    const reverbControl = document.getElementById('reverb-control');
    
    // Song Player Elements
    const songSelect = document.getElementById('song-select');
    const playButton = document.getElementById('play-button');
    const stopButton = document.getElementById('stop-button');
    const nowPlayingText = document.getElementById('now-playing');
    const songProgress = document.getElementById('song-progress');
    
    // Song playback variables
    let currentSong = null;
    let isPlaying = false;
    let songTimeouts = [];
    
    // Song definitions
    const songs = {
        'game-theme': {
            name: 'Super Mario Bros Theme',
            tempo: 160, // BPM
            notes: [
                // Main melody (simplified Super Mario Bros theme)
                { note: 'E4', duration: 0.25 },
                { note: 'E4', duration: 0.25 },
                { note: 'R', duration: 0.25 },  // Rest
                { note: 'E4', duration: 0.25 },
                { note: 'R', duration: 0.25 },  // Rest
                { note: 'C4', duration: 0.25 },
                { note: 'E4', duration: 0.25 },
                { note: 'R', duration: 0.25 },  // Rest
                { note: 'G4', duration: 0.5 },
                { note: 'R', duration: 0.5 },  // Rest
                { note: 'G3', duration: 0.5 },
                { note: 'R', duration: 0.25 },  // Rest
                
                // Second phrase
                { note: 'C4', duration: 0.25 },
                { note: 'R', duration: 0.5 },  // Rest
                { note: 'G3', duration: 0.25 },
                { note: 'R', duration: 0.5 },  // Rest
                { note: 'E3', duration: 0.25 },
                { note: 'R', duration: 0.5 },  // Rest
                { note: 'A3', duration: 0.25 },
                { note: 'R', duration: 0.25 },  // Rest
                { note: 'B3', duration: 0.25 },
                { note: 'R', duration: 0.25 },  // Rest
                { note: 'A#3', duration: 0.25 },
                { note: 'A3', duration: 0.25 },
                
                // Third phrase
                { note: 'G3', duration: 0.25 },
                { note: 'E4', duration: 0.25 },
                { note: 'G4', duration: 0.25 },
                { note: 'A4', duration: 0.25 },
                { note: 'F4', duration: 0.25 },
                { note: 'G4', duration: 0.25 },
                { note: 'R', duration: 0.25 },  // Rest
                { note: 'E4', duration: 0.25 },
                { note: 'R', duration: 0.25 },  // Rest
                { note: 'C4', duration: 0.25 },
                { note: 'D4', duration: 0.25 },
                { note: 'B3', duration: 0.25 }
            ]
        },
        'simple-scale': {
            name: 'Simple Scale',
            tempo: 120, // BPM
            notes: [
                { note: 'C4', duration: 0.5 },
                { note: 'D4', duration: 0.5 },
                { note: 'E4', duration: 0.5 },
                { note: 'F4', duration: 0.5 },
                { note: 'G4', duration: 0.5 },
                { note: 'A4', duration: 0.5 },
                { note: 'B4', duration: 0.5 },
                { note: 'C5', duration: 0.5 },
                { note: 'B4', duration: 0.5 },
                { note: 'A4', duration: 0.5 },
                { note: 'G4', duration: 0.5 },
                { note: 'F4', duration: 0.5 },
                { note: 'E4', duration: 0.5 },
                { note: 'D4', duration: 0.5 },
                { note: 'C4', duration: 0.5 }
            ]
        }
    };
    
    // Sound Modes
    const soundModes = {
        'retro-game': {
            waveform: 'square',
            attack: 0.01,
            decay: 0.1,
            sustain: 0.6,
            release: 0.2,
            delay: 0.0,
            reverb: 0.2
        },
        'soft-keys': {
            waveform: 'sine',
            attack: 0.05,
            decay: 0.1,
            sustain: 0.8,
            release: 0.3,
            delay: 0.0,
            reverb: 0.0
        },
        'dreamy': {
            waveform: 'sine',
            attack: 0.2,
            decay: 0.3,
            sustain: 0.7,
            release: 0.5,
            delay: 0.3,
            reverb: 0.6
        },
        'sharp': {
            waveform: 'sawtooth',
            attack: 0.01,
            decay: 0.1,
            sustain: 0.5,
            release: 0.1,
            delay: 0.0,
            reverb: 0.1
        }
    };
    
    // Initialize audio context on first user interaction
    function initAudio() {
        if (!audioCtx) {
            // Create new audio context
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            
            // Resume audio context (needed for some browsers)
            if (audioCtx.state === 'suspended') {
                audioCtx.resume().then(() => {
                    console.log('AudioContext resumed successfully');
                });
            }
            
            console.log('Audio context initialized, state:', audioCtx.state);
            
            // Create master gain
            masterGain = audioCtx.createGain();
            masterGain.gain.value = 0.7;
            masterGain.connect(audioCtx.destination);
            
            // Setup delay
            delayNode = audioCtx.createDelay();
            delayNode.delayTime.value = 0.3;
            delayGain = audioCtx.createGain();
            delayGain.gain.value = 0;
            
            // Create a simple feedback loop
            delayNode.connect(delayGain);
            delayGain.connect(delayNode);
            delayGain.connect(masterGain);
            
            // Setup simple reverb with convolver
            reverbNode = audioCtx.createConvolver();
            createReverbImpulse();
            reverbGain = audioCtx.createGain();
            reverbGain.gain.value = 0;
            
            // Connect reverb node to reverb gain
            reverbNode.connect(reverbGain);
            reverbGain.connect(masterGain);
            
            // Apply initial effects settings from UI
            updateEffects();
        } else if (audioCtx.state === 'suspended') {
            // If context exists but is suspended, resume it
            audioCtx.resume().then(() => {
                console.log('AudioContext resumed');
            });
        }
    }
    
    // Create a simple impulse response for reverb
    function createReverbImpulse() {
        const sampleRate = audioCtx.sampleRate;
        const length = sampleRate * 2; // 2 seconds
        const impulse = audioCtx.createBuffer(2, length, sampleRate);
        const leftChannel = impulse.getChannelData(0);
        const rightChannel = impulse.getChannelData(1);
        
        for (let i = 0; i < length; i++) {
            const decay = Math.pow(1 - i / length, 2);
            leftChannel[i] = (Math.random() * 2 - 1) * decay;
            rightChannel[i] = (Math.random() * 2 - 1) * decay;
        }
        
        reverbNode.buffer = impulse;
    }
    
    // Calculate frequency for a note
    function getNoteFrequency(noteName) {
        // Return 0 for rests
        if (noteName === 'R') return 0;
        
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        
        // Parse the note to get the note name and octave
        const note = noteName.slice(0, -1);
        const octave = parseInt(noteName.slice(-1));
        
        // A4 is 440 Hz
        const a4 = 440;
        const a4Octave = 4;
        const a4Index = notes.indexOf('A');
        
        // Distance from A4 in semitones
        const noteIndex = notes.indexOf(note);
        const distanceFromA4 = (octave - a4Octave) * 12 + (noteIndex - a4Index);
        
        // Calculate frequency: f = 440 * 2^(n/12) where n is the number of semitones from A4
        return a4 * Math.pow(2, distanceFromA4 / 12);
    }
    
    // Play a note with ADSR envelope
    function playNote(frequency) {
        if (!audioCtx || audioCtx.state !== 'running') {
            console.warn('AudioContext not running, cannot play sound');
            return null;
        }
        
        // Skip rests (frequency = 0)
        if (frequency === 0) return null;
        
        console.log('Playing note at frequency:', frequency, 'with waveform:', currentWaveform);
        
        // Create oscillator
        const oscillator = audioCtx.createOscillator();
        oscillator.type = currentWaveform;
        oscillator.frequency.value = frequency;
        
        // Create envelope for the note
        const envelope = audioCtx.createGain();
        envelope.gain.value = 0;
        
        // Connect oscillator to envelope
        oscillator.connect(envelope);
        
        // Connect to master output
        envelope.connect(masterGain);
        
        // Connect to delay effect
        envelope.connect(delayNode);
        
        // Connect to reverb effect
        envelope.connect(reverbNode);
        
        // ADSR envelope automation
        const now = audioCtx.currentTime;
        
        // Attack
        envelope.gain.setValueAtTime(0, now);
        envelope.gain.linearRampToValueAtTime(1, now + attackTime);
        
        // Decay
        envelope.gain.linearRampToValueAtTime(sustainLevel, now + attackTime + decayTime);
        
        // Start the oscillator
        oscillator.start();
        
        return { oscillator, envelope };
    }
    
    // Stop a note with release envelope
    function stopNote(note) {
        if (activeOscillators[note]) {
            const { oscillator, envelope } = activeOscillators[note];
            
            // Release envelope
            const now = audioCtx.currentTime;
            envelope.gain.setValueAtTime(envelope.gain.value, now);
            envelope.gain.linearRampToValueAtTime(0, now + releaseTime);
            
            // Stop the oscillator after release
            oscillator.stop(now + releaseTime + 0.01);
            
            // Remove from active oscillators after release time
            setTimeout(() => {
                delete activeOscillators[note];
                activeNotes.delete(note);
            }, releaseTime * 1000 + 20);
        }
    }
    
    // Update effects settings from sliders
    function updateEffects() {
        if (!audioCtx) return;
        
        delayGain.gain.value = parseFloat(delayControl.value) * 0.7;
        reverbGain.gain.value = parseFloat(reverbControl.value);
        
        console.log("Effects updated - Delay:", delayGain.gain.value, "Reverb:", reverbGain.gain.value);
    }
    
    // Apply a sound mode
    function applySoundMode(mode) {
        if (!soundModes[mode]) return;
        
        const settings = soundModes[mode];
        
        // Apply the settings
        currentWaveform = settings.waveform;
        attackTime = settings.attack;
        decayTime = settings.decay;
        sustainLevel = settings.sustain;
        releaseTime = settings.release;
        
        // Update the UI
        delayControl.value = settings.delay;
        reverbControl.value = settings.reverb;
        
        // Apply effects
        updateEffects();
        
        // Update active oscillators if any
        Object.values(activeOscillators).forEach(({ oscillator }) => {
            oscillator.type = currentWaveform;
        });
        
        // Update UI
        soundModeButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        
        console.log("Sound mode applied:", mode, "Waveform:", currentWaveform);
    }
    
    // Play a song from the songs collection
    function playSong(songId) {
        initAudio();
        
        // First, stop any currently playing song
        stopSong();
        
        const song = songs[songId];
        if (!song) {
            console.error('Song not found:', songId);
            return;
        }
        
        // Change to Retro Game sound mode for game music, otherwise use soft keys
        if (songId === 'game-theme') {
            applySoundMode('retro-game');
        } else {
            applySoundMode('soft-keys');
        }
        
        console.log('Playing song:', song.name);
        
        currentSong = songId;
        isPlaying = true;
        updateSongUI();
        
        // Calculate beat duration from tempo
        const beatDuration = 60 / song.tempo;
        let currentTime = 0;
        
        // Play each note in sequence
        song.notes.forEach((noteObj, index) => {
            const { note, duration } = noteObj;
            const actualDuration = duration * beatDuration;
            
            // Schedule the note to play at the right time
            const timeout = setTimeout(() => {
                // Skip rests
                if (note !== 'R') {
                    const frequency = getNoteFrequency(note);
                    
                    // Find key element and highlight it
                    const keyElement = document.querySelector(`.key[data-note="${note}"]`);
                    if (keyElement) {
                        keyElement.classList.add('active');
                        
                        // Remove highlight after duration
                        setTimeout(() => {
                            keyElement.classList.remove('active');
                        }, actualDuration * 800); // Little shorter than actual duration to avoid overlap
                    }
                    
                    // Play the note
                    const sound = playNote(frequency);
                    
                    // Schedule the note to stop
                    if (sound) {
                        const releaseTimeout = setTimeout(() => {
                            const { oscillator, envelope } = sound;
                            
                            // Release envelope
                            const now = audioCtx.currentTime;
                            envelope.gain.setValueAtTime(envelope.gain.value, now);
                            envelope.gain.linearRampToValueAtTime(0, now + 0.05);
                            
                            // Stop the oscillator after release
                            oscillator.stop(now + 0.06);
                        }, actualDuration * 800); // Little shorter than actual duration for better articulation
                        
                        songTimeouts.push(releaseTimeout);
                    }
                }
                
                // Update progress
                updateProgress(index / song.notes.length * 100);
                
                // If this is the last note, reset when done
                if (index === song.notes.length - 1) {
                    setTimeout(() => {
                        if (isPlaying) {
                            stopSong();
                        }
                    }, actualDuration * 1000);
                }
            }, currentTime * 1000);
            
            songTimeouts.push(timeout);
            
            // Add this note's duration to the current time
            currentTime += actualDuration;
        });
    }
    
    // Stop the currently playing song
    function stopSong() {
        // Set flag first
        isPlaying = false;
        
        // Clear all timeouts
        songTimeouts.forEach(timeout => clearTimeout(timeout));
        songTimeouts = [];
        
        // Forcefully stop all audio - most aggressive approach
        if (audioCtx) {
            // Suspend the audio context (pauses all audio processing)
            audioCtx.suspend().then(() => {
                console.log("Audio context suspended");
                
                // Immediately mute the master output
                if (masterGain) {
                    masterGain.gain.value = 0;
                }
                
                // Clear all active oscillators
                Object.keys(activeOscillators).forEach(note => {
                    try {
                        const { oscillator, envelope } = activeOscillators[note];
                        
                        // Disconnect everything
                        envelope.disconnect();
                        oscillator.disconnect();
                        
                        // Stop oscillator
                        oscillator.stop(0);
                    } catch (e) {
                        console.log("Error stopping oscillator:", e);
                    }
                    
                    // Remove from tracking
                    delete activeOscillators[note];
                });
                
                // Clear active notes
                activeNotes.clear();
                
                // Resume audio context after a brief pause
                setTimeout(() => {
                    // Restore master gain
                    if (masterGain) {
                        masterGain.gain.value = 0.7;
                        
                        // Reconnect master gain to destination if it was disconnected
                        if (!masterGain.numberOfOutputs) {
                            masterGain.connect(audioCtx.destination);
                        }
                    }
                    
                    // Resume audio context
                    audioCtx.resume().then(() => {
                        console.log("Audio context resumed after stop");
                    });
                }, 100);
            });
        }
        
        // Remove all active key highlights
        document.querySelectorAll('.key.active').forEach(key => {
            key.classList.remove('active');
        });
        
        // Update UI
        updateSongUI();
        updateProgress(0);
    }
    
    // Update the song player UI based on current state
    function updateSongUI() {
        if (isPlaying) {
            nowPlayingText.textContent = 'Now playing: ' + songs[currentSong].name;
            playButton.disabled = true;
            stopButton.disabled = false;
        } else {
            if (currentSong) {
                nowPlayingText.textContent = 'Stopped: ' + songs[currentSong].name;
            } else {
                nowPlayingText.textContent = 'No song selected';
            }
            
            playButton.disabled = !songSelect.value;
            stopButton.disabled = true;
        }
    }
    
    // Update progress bar
    function updateProgress(percent) {
        songProgress.style.setProperty('--progress', percent + '%');
        songProgress.setAttribute('data-progress', Math.round(percent) + '%');
    }
    
    // Set up event listeners
    function setupEventListeners() {
        // Initialize audio on any user interaction with the page
        document.body.addEventListener('click', function() {
            initAudio();
        }, { once: true });
        
        // Piano keyboard
        keys.forEach(key => {
            const note = key.dataset.note;
            
            key.addEventListener('mousedown', function() {
                if (activeNotes.has(note)) return;
                
                initAudio();
                const frequency = getNoteFrequency(note);
                
                // Create oscillator and play
                activeNotes.add(note);
                key.classList.add('active');
                activeOscillators[note] = playNote(frequency);
            });
            
            key.addEventListener('mouseup', function() {
                key.classList.remove('active');
                stopNote(note);
            });
            
            key.addEventListener('mouseleave', function() {
                if (key.classList.contains('active')) {
                    key.classList.remove('active');
                    stopNote(note);
                }
            });
        });
        
        // Sound mode buttons
        soundModeButtons.forEach(button => {
            button.addEventListener('click', function() {
                initAudio();
                const mode = this.dataset.mode;
                applySoundMode(mode);
            });
        });
        
        // Effects controls
        delayControl.addEventListener('input', function() {
            initAudio();
            updateEffects();
        });
        
        reverbControl.addEventListener('input', function() {
            initAudio();
            updateEffects();
        });
        
        // Song player controls
        songSelect.addEventListener('change', function() {
            // Update play button state
            playButton.disabled = !this.value;
            
            // If nothing selected, update UI
            if (!this.value) {
                currentSong = null;
                updateSongUI();
            } else {
                currentSong = this.value;
                nowPlayingText.textContent = 'Selected: ' + songs[currentSong].name;
            }
        });
        
        playButton.addEventListener('click', function() {
            if (songSelect.value) {
                playSong(songSelect.value);
            }
        });
        
        stopButton.addEventListener('click', stopSong);
        
        // Keyboard input for testing
        document.addEventListener('keydown', function(e) {
            // Simple mapping from keyboard to notes
            const keyMap = {
                'a': 'C4', 's': 'D4', 'd': 'E4', 'f': 'F4', 
                'g': 'G4', 'h': 'A4', 'j': 'B4', 'k': 'C5',
                'w': 'C#4', 'e': 'D#4', 't': 'F#4', 'y': 'G#4', 'u': 'A#4'
            };
            
            const note = keyMap[e.key.toLowerCase()];
            if (note && !activeNotes.has(note)) {
                const keyElement = document.querySelector(`.key[data-note="${note}"]`);
                if (keyElement) {
                    initAudio();
                    
                    // Play the note
                    activeNotes.add(note);
                    keyElement.classList.add('active');
                    activeOscillators[note] = playNote(getNoteFrequency(note));
                }
            }
        });
        
        document.addEventListener('keyup', function(e) {
            const keyMap = {
                'a': 'C4', 's': 'D4', 'd': 'E4', 'f': 'F4', 
                'g': 'G4', 'h': 'A4', 'j': 'B4', 'k': 'C5',
                'w': 'C#4', 'e': 'D#4', 't': 'F#4', 'y': 'G#4', 'u': 'A#4'
            };
            
            const note = keyMap[e.key.toLowerCase()];
            if (note) {
                const keyElement = document.querySelector(`.key[data-note="${note}"]`);
                if (keyElement) {
                    keyElement.classList.remove('active');
                    stopNote(note);
                }
            }
        });
    }
    
    // Add debug info element
    function addDebugElement() {
        const debugDiv = document.createElement('div');
        debugDiv.id = 'debug-info';
        debugDiv.style.position = 'fixed';
        debugDiv.style.bottom = '10px';
        debugDiv.style.left = '10px';
        debugDiv.style.background = 'rgba(0,0,0,0.7)';
        debugDiv.style.color = 'white';
        debugDiv.style.padding = '5px';
        debugDiv.style.fontSize = '12px';
        debugDiv.style.fontFamily = 'monospace';
        debugDiv.style.zIndex = '1000';
        document.body.appendChild(debugDiv);
        
        return debugDiv;
    }
    
    // Initialize
    function init() {
        console.log("Initializing Mac OS Synth...");
        
        // Make windows draggable
        makeWindowsDraggable();
        
        // Add debug element
        const debugEl = addDebugElement();
        debugEl.textContent = "Audio not initialized. Click a key or button to start.";
        
        // Update debug info every second
        setInterval(() => {
            if (audioCtx) {
                debugEl.textContent = `AudioContext: ${audioCtx.state} | Waveform: ${currentWaveform} | Delay: ${delayGain?.gain.value.toFixed(2)} | Reverb: ${reverbGain?.gain.value.toFixed(2)}`;
            }
        }, 1000);
        
        // Add CSS for progress bar
        const style = document.createElement('style');
        style.textContent = `
            #song-progress::after {
                width: var(--progress, 0%);
            }
        `;
        document.head.appendChild(style);
        
        setupEventListeners();
        
        // Apply default sound mode (with a delay to ensure everything is set up)
        setTimeout(() => {
            applySoundMode('soft-keys');
        }, 300);
    }
    
    // Make windows draggable
    function makeWindowsDraggable() {
        const windows = document.querySelectorAll('.window');
        
        windows.forEach(window => {
            const titleBar = window.querySelector('.title-bar');
            let isDragging = false;
            let offsetX, offsetY;
            
            titleBar.addEventListener('mousedown', (e) => {
                // Ignore clicks on buttons
                if (e.target.classList.contains('close-button') || 
                    e.target.classList.contains('minimize-button') || 
                    e.target.classList.contains('zoom-button')) {
                    return;
                }
                
                isDragging = true;
                offsetX = e.clientX - window.getBoundingClientRect().left;
                offsetY = e.clientY - window.getBoundingClientRect().top;
                
                // Add active class
                window.classList.add('dragging');
            });
            
            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                
                const x = e.clientX - offsetX;
                const y = e.clientY - offsetY;
                
                // Apply new position
                window.style.position = 'absolute';
                window.style.left = `${x}px`;
                window.style.top = `${y}px`;
            });
            
            document.addEventListener('mouseup', () => {
                if (isDragging) {
                    isDragging = false;
                    window.classList.remove('dragging');
                }
            });
        });
    }
    
    // Start everything
    init();
}); 