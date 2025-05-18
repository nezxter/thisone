# Mac OS Synth - Simplified

A web-based synthesizer with classic Mac OS interface styling, designed for ease of use.

## Features

- 8-key piano/synthesizer with both mouse and keyboard control
- Web Audio API-powered sound engine 
- Simple effects controls: Delay and Reverb
- Four intuitive sound modes for different styles
- Classic Mac OS window interface styling

## How to Use

1. Start the local server by running:
   ```
   cd app/prototypes/mac-synth
   npm install
   npm start
   ```
2. Open your browser to http://localhost:8080

### Playing Notes

- Click the piano keys with your mouse to play notes
- Or use your computer keyboard:
  - White keys: A, S, D, F, G, H, J, K
  - Black keys: W, E, T, Y, U

### Sound Modes

Choose from four distinct sound modes:
- **Retro Game**: 8-bit console game-like sounds (square wave with light reverb)
- **Soft Keys**: Gentle piano-like tones (sine wave, no effects)
- **Dreamy**: Atmospheric, spacious sound (sine wave with reverb and delay)
- **Sharp**: Bright, cutting tones (sawtooth wave with short release)

### Adjusting Effects

Fine-tune your sound with two simple effect sliders:
- **Delay**: Adds echo to your notes
- **Reverb**: Adds space and ambience

## Technical Details

This synthesizer uses:
- Web Audio API for all sound generation
- Simple interface designed for casual users
- Responsive design that works on various screen sizes

## Notes

- Web Audio API requires user interaction before making sounds
- For best experience, use on a desktop browser 