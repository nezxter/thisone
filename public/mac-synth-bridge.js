// Mac Synth Bridge Script
// This script provides an interface between the synth.js and the Next.js component

// Audio context and necessary variables
let audioCtx;
let masterGain;
let activeOscillators = {};
let delayNode;
let reverbNode;
let delayGain;
let reverbGain;
let currentWaveform = 'sine';

// Song playback variables
let currentSong = null;
let isPlaying = false;
let songTimeouts = [];

// ADSR defaults
let attackTime = 0.1;
let decayTime = 0.2;
let sustainLevel = 0.7;
let releaseTime = 0.3;

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
      { note: 'A3', duration: 0.25 }
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

// Initialize audio context
function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().then(() => {
        console.log('AudioContext resumed successfully');
      });
    }
    
    // Create master gain
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.7;
    masterGain.connect(audioCtx.destination);
    
    // Setup delay
    delayNode = audioCtx.createDelay();
    delayNode.delayTime.value = 0.3;
    delayGain = audioCtx.createGain();
    delayGain.gain.value = 0;
    
    delayNode.connect(delayGain);
    delayGain.connect(delayNode);
    delayGain.connect(masterGain);
    
    // Setup simple reverb
    createReverbImpulse();
  }
}

// Create reverb impulse
function createReverbImpulse() {
  const sampleRate = audioCtx.sampleRate;
  const length = sampleRate * 2; // 2 seconds
  const impulse = audioCtx.createBuffer(2, length, sampleRate);
  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);
  
  for (let i = 0; i < length; i++) {
    const n = i / length;
    // Simple exponential decay
    left[i] = (Math.random() * 2 - 1) * Math.pow(1 - n, 1.5);
    right[i] = (Math.random() * 2 - 1) * Math.pow(1 - n, 1.5);
  }
  
  reverbNode = audioCtx.createConvolver();
  reverbNode.buffer = impulse;
  reverbGain = audioCtx.createGain();
  reverbGain.gain.value = 0;
  
  reverbNode.connect(reverbGain);
  reverbGain.connect(masterGain);
}

// Get note frequency from note name
function getNoteFrequency(noteName) {
  if (noteName === 'R') return 0; // Rest
  
  const A4 = 440.0;
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  
  // Extract the note and octave (e.g., "C4" -> "C" and "4")
  const note = noteName.slice(0, -1);
  const octave = parseInt(noteName.slice(-1));
  
  // Find the semitone distance from A4
  const noteIndex = notes.indexOf(note);
  const octaveDistance = octave - 4;
  const semitoneDistance = noteIndex - notes.indexOf('A') + octaveDistance * 12;
  
  // Calculate frequency using the semitone formula
  return A4 * Math.pow(2, semitoneDistance / 12);
}

// Play a note
function playNote(frequency) {
  if (!audioCtx) initAudio();
  
  // If frequency is 0, this is a rest, so don't play anything
  if (frequency === 0) return null;
  
  // Create oscillator
  const oscillator = audioCtx.createOscillator();
  oscillator.type = currentWaveform;
  oscillator.frequency.value = frequency;
  
  // Create gain node for ADSR envelope
  const gainNode = audioCtx.createGain();
  gainNode.gain.value = 0;
  
  // Connect oscillator to gain node
  oscillator.connect(gainNode);
  
  // Connect to effects and master output
  gainNode.connect(delayNode);
  gainNode.connect(reverbNode);
  gainNode.connect(masterGain);
  
  // Start oscillator
  oscillator.start();
  
  // Apply ADSR envelope
  const now = audioCtx.currentTime;
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(1, now + attackTime);
  gainNode.gain.linearRampToValueAtTime(sustainLevel, now + attackTime + decayTime);
  
  return { oscillator, gainNode };
}

// Stop a note
function stopNote(note) {
  if (activeOscillators[note]) {
    const { oscillator, gainNode } = activeOscillators[note];
    const now = audioCtx.currentTime;
    
    // Release phase
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(gainNode.gain.value, now);
    gainNode.gain.linearRampToValueAtTime(0, now + releaseTime);
    
    // Stop the oscillator after release
    oscillator.stop(now + releaseTime);
    
    delete activeOscillators[note];
  }
}

// Sound Modes
const soundModes = {
  'retro-game': {
    waveform: 'square',
    attack: 0.01,
    decay: 0.1,
    sustain: 0.6,
    release: 0.2,
    delay: 0.2,
    reverb: 0.2
  },
  'soft-keys': {
    waveform: 'sine',
    attack: 0.05,
    decay: 0.1,
    sustain: 0.8,
    release: 0.3,
    delay: 0.0,
    reverb: 0.1
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

// Apply sound mode
function applySoundMode(mode) {
  if (!audioCtx) initAudio();
  
  if (soundModes[mode]) {
    const settings = soundModes[mode];
    
    // Update waveform
    currentWaveform = settings.waveform;
    
    // Update ADSR
    attackTime = settings.attack;
    decayTime = settings.decay;
    sustainLevel = settings.sustain;
    releaseTime = settings.release;
    
    // Update effects
    if (delayGain) delayGain.gain.value = settings.delay;
    if (reverbGain) reverbGain.gain.value = settings.reverb;
    
    console.log(`Applied sound mode: ${mode}`);
  }
}

// Play song function
function playSong(songId) {
  if (!audioCtx) initAudio();
  
  // Stop any currently playing song
  stopSong();
  
  // Get the song
  const song = songs[songId];
  if (!song) return;
  
  // Set as current song
  currentSong = songId;
  isPlaying = true;
  
  // Update UI
  const nowPlayingEl = document.getElementById('now-playing');
  const playButton = document.getElementById('play-button');
  const stopButton = document.getElementById('stop-button');
  
  if (nowPlayingEl) nowPlayingEl.textContent = 'Now Playing: ' + song.name;
  if (playButton) playButton.disabled = true;
  if (stopButton) stopButton.disabled = false;
  
  // Calculate beat duration in ms
  const beatDuration = 60000 / song.tempo;
  
  // Schedule notes
  let totalDuration = 0;
  let totalBeats = 0;
  
  // First calculate total duration in beats
  song.notes.forEach(noteData => {
    totalBeats += noteData.duration;
  });
  
  // Schedule each note
  song.notes.forEach((noteData, index) => {
    // Calculate timing in ms
    const noteStartTime = totalDuration;
    const noteDuration = noteData.duration * beatDuration;
    
    // Schedule this note
    const timeout = setTimeout(() => {
      // If song stopped, don't play
      if (!isPlaying || currentSong !== songId) return;
      
      // Play the note (or rest)
      if (noteData.note !== 'R') {
        const freq = getNoteFrequency(noteData.note);
        activeOscillators[noteData.note] = playNote(freq);
        
        // Schedule note release
        setTimeout(() => {
          if (activeOscillators[noteData.note]) {
            stopNote(noteData.note);
          }
        }, noteDuration * 0.9); // Release slightly before next note
      }
      
      // Update progress
      const progressPercent = (noteStartTime + noteDuration) / (totalBeats * beatDuration) * 100;
      updateProgress(progressPercent);
      
      // If we're at the last note, reset when done
      if (index === song.notes.length - 1) {
        setTimeout(() => {
          if (currentSong === songId) {
            // Song finished
            isPlaying = false;
            currentSong = null;
            
            // Update UI
            if (nowPlayingEl) nowPlayingEl.textContent = 'Finished: ' + song.name;
            if (playButton) playButton.disabled = false;
            if (stopButton) stopButton.disabled = true;
            updateProgress(0);
          }
        }, noteDuration);
      }
    }, noteStartTime);
    
    // Add to timeouts array
    songTimeouts.push(timeout);
    
    // Add to total duration
    totalDuration += noteDuration;
  });
}

// Stop song function
function stopSong() {
  // Clear all scheduled timeouts
  songTimeouts.forEach(timeout => clearTimeout(timeout));
  songTimeouts = [];
  
  // Set state
  isPlaying = false;
  
  // Stop any active notes
  Object.keys(activeOscillators).forEach(note => {
    stopNote(note);
  });
  
  // Update UI
  const nowPlayingEl = document.getElementById('now-playing');
  const playButton = document.getElementById('play-button');
  const stopButton = document.getElementById('stop-button');
  const songSelect = document.getElementById('song-select');
  
  if (nowPlayingEl) {
    if (currentSong && songs[currentSong]) {
      nowPlayingEl.textContent = 'Selected: ' + songs[currentSong].name;
    } else if (songSelect && songSelect.value && songs[songSelect.value]) {
      currentSong = songSelect.value;
      nowPlayingEl.textContent = 'Selected: ' + songs[currentSong].name;
    } else {
      nowPlayingEl.textContent = 'No song selected';
    }
  }
  
  if (playButton) playButton.disabled = !(songSelect && songSelect.value);
  if (stopButton) stopButton.disabled = true;
  
  // Reset progress
  updateProgress(0);
  
  currentSong = null;
}

// Update progress bar
function updateProgress(percent) {
  const progressEl = document.getElementById('song-progress');
  if (progressEl) {
    progressEl.style.setProperty('--progress', `${percent}%`);
  }
}

// Expose functions to window for Next.js component to access
window.playNoteManually = function(note) {
  if (!audioCtx) initAudio();
  
  const frequency = getNoteFrequency(note);
  activeOscillators[note] = playNote(frequency);
  
  console.log(`Playing note: ${note} (${frequency.toFixed(2)} Hz)`);
  return note;
};

window.stopNoteManually = function(note) {
  stopNote(note);
  return note;
};

window.applySoundModeManually = function(mode) {
  applySoundMode(mode);
  return mode;
};

// Expose song player functions
window.playSongManually = function(songId) {
  playSong(songId);
  return songId;
};

window.stopSongManually = function() {
  stopSong();
  return true;
};

// Initialize with a default sound mode
window.addEventListener('load', function() {
  console.log("Mac Synth Bridge loaded");
  
  // Initialize audio
  setTimeout(() => {
    applySoundMode('soft-keys');
    
    // Initialize song UI
    const songSelect = document.getElementById('song-select');
    const playButton = document.getElementById('play-button');
    const stopButton = document.getElementById('stop-button');
    
    if (songSelect) {
      songSelect.addEventListener('change', function() {
        const songId = this.value;
        const nowPlayingEl = document.getElementById('now-playing');
        
        if (songId && songs[songId]) {
          currentSong = songId;
          if (nowPlayingEl) nowPlayingEl.textContent = 'Selected: ' + songs[songId].name;
          if (playButton) playButton.disabled = false;
        } else {
          currentSong = null;
          if (nowPlayingEl) nowPlayingEl.textContent = 'No song selected';
          if (playButton) playButton.disabled = true;
        }
        
        if (stopButton) stopButton.disabled = true;
        updateProgress(0);
      });
    }
    
    if (playButton) {
      playButton.addEventListener('click', function() {
        if (currentSong || (songSelect && songSelect.value)) {
          playSong(currentSong || songSelect.value);
        }
      });
    }
    
    if (stopButton) {
      stopButton.addEventListener('click', stopSong);
    }
  }, 500);
}); 