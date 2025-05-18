'use client';

import { useEffect, useRef } from 'react';
import styles from './styles.module.css';

// Add TypeScript interface for window object
declare global {
  interface Window {
    initSynth?: () => void;
    playNoteManually?: (note: string) => void;
    stopNoteManually?: (note: string) => void; 
    applySoundModeManually?: (mode: string) => void;
    playSongManually?: (songId: string) => string;
    stopSongManually?: () => boolean;
  }
}

export default function MacSynth() {
  const scriptLoadedRef = useRef(false);
  
  useEffect(() => {
    // Add global styles for the VT323 font
    const style = document.createElement('style');
    style.innerHTML = `
      body {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        font-family: 'VT323', var(--font-vt323), monospace !important;
      }
    `;
    document.head.appendChild(style);

    // Only load the script once
    if (!scriptLoadedRef.current) {
      // Load our custom bridge script
      const script = document.createElement('script');
      script.src = '/mac-synth-bridge.js'; // Use our simplified bridge script
      script.async = true;
      script.onload = () => {
        console.log('Mac synth bridge loaded successfully');
        
        // Wait a short time to make sure DOM elements exist
        setTimeout(() => {
          // Bind mouse events to keys
          const keys = document.querySelectorAll(`.${styles.key}`);
          keys.forEach(key => {
            // Mouse down - Play note
            key.addEventListener('mousedown', function(this: HTMLElement) {
              const note = this.getAttribute('data-note');
              this.classList.add(styles.active);
              console.log('Key pressed:', note);
              if (window.playNoteManually && note) {
                window.playNoteManually(note);
              }
            });
            
            // Mouse up - Stop note
            key.addEventListener('mouseup', function(this: HTMLElement) {
              const note = this.getAttribute('data-note');
              this.classList.remove(styles.active);
              console.log('Key released:', note);
              if (window.stopNoteManually && note) {
                window.stopNoteManually(note);
              }
            });
            
            // Mouse leave - Stop note if key was pressed
            key.addEventListener('mouseleave', function(this: HTMLElement) {
              const note = this.getAttribute('data-note');
              if (this.classList.contains(styles.active)) {
                this.classList.remove(styles.active);
                console.log('Key left:', note);
                if (window.stopNoteManually && note) {
                  window.stopNoteManually(note);
                }
              }
            });
          });
          
          // Bind click events to sound mode buttons
          const soundButtons = document.querySelectorAll(`.${styles.soundModeButton}`);
          soundButtons.forEach(button => {
            button.addEventListener('click', function(this: HTMLElement) {
              const mode = this.getAttribute('data-mode');
              console.log('Sound mode selected:', mode);
              if (window.applySoundModeManually && mode) {
                window.applySoundModeManually(mode);
                
                // Update active button styling
                soundButtons.forEach(btn => btn.classList.remove(styles.active));
                this.classList.add(styles.active);
              }
            });
          });
          
          // Add song player controls
          const songSelect = document.getElementById('song-select');
          const playButton = document.getElementById('play-button');
          const stopButton = document.getElementById('stop-button');
          
          if (songSelect) {
            songSelect.addEventListener('change', function(this: HTMLSelectElement) {
              console.log('Song selected:', this.value);
              playButton?.removeAttribute('disabled');
              if (window.playSongManually && this.value) {
                // Just enable the play button, don't play yet
                if (playButton) (playButton as HTMLButtonElement).disabled = false;
              }
            });
          }
          
          if (playButton) {
            playButton.addEventListener('click', function() {
              console.log('Play button clicked');
              const songId = (songSelect as HTMLSelectElement)?.value;
              if (window.playSongManually && songId) {
                window.playSongManually(songId);
              }
            });
          }
          
          if (stopButton) {
            stopButton.addEventListener('click', function() {
              console.log('Stop button clicked');
              if (window.stopSongManually) {
                window.stopSongManually();
              }
            });
          }
          
          // Also add keyboard support
          document.addEventListener('keydown', (e) => {
            // Simple mapping from keyboard to notes
            const keyMap: Record<string, string> = {
              'a': 'C4', 's': 'D4', 'd': 'E4', 'f': 'F4', 
              'g': 'G4', 'h': 'A4', 'j': 'B4', 'k': 'C5',
              'w': 'C#4', 'e': 'D#4', 't': 'F#4', 'y': 'G#4', 'u': 'A#4'
            };
            
            const note = keyMap[e.key.toLowerCase()];
            if (note) {
              const keyElement = document.querySelector(`.${styles.key}[data-note="${note}"]`) as HTMLElement;
              if (keyElement && !keyElement.classList.contains(styles.active)) {
                keyElement.classList.add(styles.active);
                if (window.playNoteManually) {
                  window.playNoteManually(note);
                }
              }
            }
          });
          
          document.addEventListener('keyup', (e) => {
            const keyMap: Record<string, string> = {
              'a': 'C4', 's': 'D4', 'd': 'E4', 'f': 'F4', 
              'g': 'G4', 'h': 'A4', 'j': 'B4', 'k': 'C5',
              'w': 'C#4', 'e': 'D#4', 't': 'F#4', 'y': 'G#4', 'u': 'A#4'
            };
            
            const note = keyMap[e.key.toLowerCase()];
            if (note) {
              const keyElement = document.querySelector(`.${styles.key}[data-note="${note}"]`) as HTMLElement;
              if (keyElement) {
                keyElement.classList.remove(styles.active);
                if (window.stopNoteManually) {
                  window.stopNoteManually(note);
                }
              }
            }
          });
        }, 100);
      };
      
      script.onerror = (error) => {
        console.error('Error loading mac synth bridge script:', error);
      };
      
      document.body.appendChild(script);
      scriptLoadedRef.current = true;
    }
    
    // Cleanup function
    return () => {
      // Remove event listeners if needed
    };
  }, []);

  return (
    <div className={styles.rootContainer}>
      <div className={styles.desktop}>
        {/* Main Synth Window */}
        <div className={`${styles.window} ${styles.synthWindow}`} id="synth-window">
            <div className={styles.titleBar}>
                <div className={styles.titleButtons}>
                    <div className={styles.closeButton}></div>
                    <div className={styles.minimizeButton}></div>
                    <div className={styles.zoomButton}></div>
                </div>
                <div className={styles.title}>Mac OS Synth</div>
            </div>
            
            <div className={styles.windowBody}>
                <div className={styles.controlPanel}>
                    {/* Effects section removed as requested */}
                </div>
                
                <div className={styles.keyboardContainer}>
                    <div id="keyboard" className={styles.keyboard}>
                        {/* White keys */}
                        <div className={`${styles.key} ${styles.whiteKey}`} data-note="C4"></div>
                        <div className={`${styles.key} ${styles.whiteKey}`} data-note="D4"></div>
                        <div className={`${styles.key} ${styles.whiteKey}`} data-note="E4"></div>
                        <div className={`${styles.key} ${styles.whiteKey}`} data-note="F4"></div>
                        <div className={`${styles.key} ${styles.whiteKey}`} data-note="G4"></div>
                        <div className={`${styles.key} ${styles.whiteKey}`} data-note="A4"></div>
                        <div className={`${styles.key} ${styles.whiteKey}`} data-note="B4"></div>
                        <div className={`${styles.key} ${styles.whiteKey}`} data-note="C5"></div>
                        
                        {/* Black keys */}
                        <div className={`${styles.key} ${styles.blackKey}`} data-note="C#4" style={{ left: '6.5%' }}></div>
                        <div className={`${styles.key} ${styles.blackKey}`} data-note="D#4" style={{ left: '18.5%' }}></div>
                        <div className={`${styles.key} ${styles.blackKey}`} data-note="F#4" style={{ left: '43.5%' }}></div>
                        <div className={`${styles.key} ${styles.blackKey}`} data-note="G#4" style={{ left: '56.5%' }}></div>
                        <div className={`${styles.key} ${styles.blackKey}`} data-note="A#4" style={{ left: '68.5%' }}></div>
                    </div>
                </div>
                
                <div className={styles.soundModesPanel}>
                    <div className={styles.soundModesTitle}>Sound Mode</div>
                    <div className={styles.soundModesButtons}>
                        <button className={styles.soundModeButton} data-mode="retro-game">Retro Game</button>
                        <button className={styles.soundModeButton} data-mode="soft-keys">Soft Keys</button>
                        <button className={styles.soundModeButton} data-mode="dreamy">Dreamy</button>
                        <button className={styles.soundModeButton} data-mode="sharp">Sharp</button>
                    </div>
                </div>
            </div>
        </div>
        
        {/* Song Player Window */}
        <div className={`${styles.window} ${styles.songPlayerWindow}`} id="song-window">
            <div className={styles.titleBar}>
                <div className={styles.titleButtons}>
                    <div className={styles.closeButton}></div>
                    <div className={styles.minimizeButton}></div>
                    <div className={styles.zoomButton}></div>
                </div>
                <div className={styles.title}>Song Player</div>
            </div>
            
            <div className={styles.windowBody}>
                <div className={styles.songPlayer}>
                    <div className={styles.songSelection}>
                        <label>Choose a song:</label>
                        <select id="song-select">
                            <option value="">Select a song...</option>
                            <option value="game-theme">Super Mario Bros Theme</option>
                            <option value="simple-scale">Simple Scale</option>
                        </select>
                    </div>
                    
                    <div className={styles.songControls}>
                        <button id="play-button" disabled>Play</button>
                        <button id="stop-button" disabled>Stop</button>
                    </div>
                    
                    <div className={styles.songInfo}>
                        <div id="now-playing" className={styles.nowPlaying}>No song selected</div>
                        <div id="song-progress" className={styles.songProgress}></div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
} 