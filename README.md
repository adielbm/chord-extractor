this is a tool that extracts chords from audio files. it's basically a wrapper around chord-extractor (which is itself a wrapper around Chordino). It uses [chord-extractor](https://github.com/ohollo/chord-extractor) to extract chords from local audio files (or downloaded them from youtube videos using `yt-dlp` if a youtube link is provided). The extracted chords are then displayed using [tombatossals/react-chords](https://github.com/tombatossals/react-chords) + [tombatossals/chords-db](https://github.com/tombatossals/chords-db).

it works for me. i really HOPE it works for you too :] 

![screenshot](screenshot.png)

# Requirements

- python 3.8.20 (for chord extraction via chord-extractor)
- [chord-extractor](https://github.com/ohollo/chord-extractor) and its requirements
- https://code.soundsoftware.ac.uk/projects/vamp-plugin-pack/files to install `Chordino and NNLS Chroma` plugins
- for youtube downloads:
    - yt-dlp
    - python 3.9 or newer (for yt-dlp support)

# Setup

First make sure you have pyenv installed. see: https://github.com/pyenv/pyenv#installation

Then install both Python versions:

```bash
# Install latest python
pyenv install 3.13

# Install python 3.8 for chord-extractor
pyenv install 3.8.10
pyenv local 3.8.10  # Set it as default for this project

# Install chord-extractor dependencies in Python 3.8 environment
pip install -r requirements.txt

# Install yt-dlp in Python 3.9+ (adjust version if needed)
python3.13 -m pip install yt-dlp

# Install main dependencies in Python 3.8 environment
pip install -r requirements.txt

# optional: install and build the react app
npm install
npm run build
```

# Usage

**Inside** the project directory run either:

```bash
# for a local file
python chord.py path/to/your/file.mp3

# for yt video/audio
python chord.py https://www.youtube.com/watch?v=your_video_id
```

## Acknowledgements

This project includes code from David Rubert under the MIT License:
- `guitar.json` and `ukulele.json` from [https://github.com/tombatossals/chords-db](https://github.com/tombatossals/chords-db) (Copyright Original Author David Rubert).