import os
import argparse
import shutil
import subprocess
import json as json_lib
from typing import Tuple
from chord_extractor.extractors import Chordino
import http.server
import socketserver
import json
import webbrowser

# Define the port and handler
PORT = 8000

# Change the current directory to the folder containing index.html
os.chdir(os.path.dirname(os.path.realpath(__file__)))

# Set up the handler to serve files
Handler = http.server.SimpleHTTPRequestHandler

# CONFIG
DEBUG = False

# CONSTANTS
SCRIPT_DIR = os.path.dirname(os.path.realpath(__file__)) # directory of this script file
CURRENT_DIR = os.getcwd() # current directory in terminal

def extract_chords_from_audio(audio_file):
    chordino = Chordino()
    c = chordino.preprocess(audio_file)
    chords = chordino.extract(audio_file)
    return chords

def copy_file_to_tmp(source_path):
    # Get the current directory (where the script is located)
    current_directory = os.path.dirname(os.path.abspath(__file__))
    # get the file name with extension
    filename = os.path.basename(source_path)
    # get the file extension
    _, file_extension = os.path.splitext(source_path)
    # Path to the destination file
    dest_directory = os.path.join(current_directory, 'dist')
    os.makedirs(dest_directory, exist_ok=True)  # Make sure the 'dist' folder exists
    dest_file = os.path.join(dest_directory, 'tmp' + file_extension)
    shutil.copy(source_path, dest_file)
    print(f"{source_path} has been copied to {dest_file}")
    return filename, dest_file

def generate_json_with_chords(filename, chords, display_name=None, youtube_url=None):
    # Create the structure for the JSON
    song_data = {
        "filename": filename,
        "display_name": display_name or filename,
        "youtube_url": youtube_url,
        "chords": []
    }
    print(f"DEBUG: Writing to JSON - filename={filename}, display_name={display_name or filename}, youtube_url={youtube_url}")
    
    # Iterate through the chords and add them to the list
    for chord in chords:
        chord_data = {
            "timestamp": chord.timestamp,
            "chord": chord.chord
        }
        if chord.chord[0] in 'ABCDEFG':
            song_data["chords"].append(chord_data)
    
    # Define the file path where the JSON will be saved
    json_file = os.path.join(os.path.dirname(os.path.realpath(__file__)), "dist/chords.json")

    print(f"Writing JSON data to: {json_file}")
    
    # Write the JSON data to a file
    with open(json_file, "w", encoding="utf-8") as f:
        json.dump(song_data, f, indent=4)

def run_server():
    # Change the current directory to 'dist'
    os.chdir(os.path.join(SCRIPT_DIR, 'dist'))
    
    # Set up the server with the given handler
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Serving at http://localhost:{PORT}")
        webbrowser.open(f"http://localhost:{PORT}")
        httpd.serve_forever()        


def is_youtube_url(url: str) -> bool:
    return 'youtube.com' in url or 'youtu.be' in url

def find_python_with_yt_dlp() -> str:
    """
    Find a Python 3.9+ interpreter with yt-dlp installed.
    Checks: pyenv versions, system PATH, common locations.
    """
    import sys
    
    candidates = []
    
    # 1. Check pyenv versions (3.13, 3.12, 3.11, 3.10, 3.9)
    pyenv_root = os.path.expanduser('~/.pyenv/versions')
    if os.path.exists(pyenv_root):
        for version in ['3.13', '3.12', '3.11', '3.10', '3.9']:
            # Try to find any 3.X version
            for entry in os.listdir(pyenv_root):
                if entry.startswith(version):
                    candidates.append(os.path.join(pyenv_root, entry, 'bin', 'python'))
    
    # 2. Check system PATH (python3.9, python3.10, etc., python3)
    candidates.extend([
        'python3.13', 'python3.12', 'python3.11', 'python3.10', 'python3.9',
        'python3'
    ])
    
    # Test each candidate
    for python_cmd in candidates:
        try:
            result = subprocess.run(
                [python_cmd, '-m', 'yt_dlp', '--version'],
                capture_output=True, text=True, timeout=5
            )
            if result.returncode == 0:
                print(f"Found Python with yt-dlp: {python_cmd}", file=sys.stderr)
                return python_cmd
        except (FileNotFoundError, subprocess.TimeoutExpired, OSError):
            continue
    
    # If no python with yt-dlp found, raise helpful error
    raise RuntimeError(
        "ERROR: Could not find a Python 3.9+ interpreter with yt-dlp installed.\n\n"
        "To use YouTube downloads, you need:\n"
        "  1. Python 3.9 or newer\n"
        "  2. yt-dlp installed in that Python version\n\n"
        "Setup options:\n\n"
        "Option A - Using pyenv (recommended):\n"
        "  pyenv install 3.13.2\n"
        "  ~/.pyenv/versions/3.13.2/bin/python -m pip install yt-dlp\n\n"
        "Option B - Using system python3.10+:\n"
        "  python3.10 -m pip install yt-dlp\n\n"
        "See README.md for more details."
    )

def download_audio_from_youtube(url: str) -> Tuple[str, str]:
    """Download audio from YouTube URL using yt-dlp."""
    python_cmd = find_python_with_yt_dlp()
    
    # check if the file exists in `dist` folder
    tmp_file = os.path.join(SCRIPT_DIR, 'dist', 'tmp.webm')
    if os.path.exists(tmp_file):
        os.remove(tmp_file)
    
    # Create dist folder if it doesn't exist
    dist_dir = os.path.join(SCRIPT_DIR, 'dist')
    os.makedirs(dist_dir, exist_ok=True)
    
    # Use yt-dlp via subprocess
    cmd = [
        python_cmd,
        '-m', 'yt_dlp',
        '-f', 'bestaudio/best',
        '-o', tmp_file,
        '--no-playlist',
        url
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"yt-dlp download failed: {result.stderr}")
    
    # Extract title using yt-dlp JSON output
    info_cmd = [
        python_cmd,
        '-m', 'yt_dlp',
        '-j',
        '--no-playlist',
        url
    ]
    info_result = subprocess.run(info_cmd, capture_output=True, text=True)
    title = None
    if info_result.returncode == 0:
        info = json_lib.loads(info_result.stdout)
        title = info.get('title', None)
    
    return tmp_file, title

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Generate HTML with chords from audio file")
    parser.add_argument("file", help="Path to the audio file")
    args = parser.parse_args()

    if DEBUG:
        print('args.file: ', args.file)
        print('CURRENT_DIR: ', CURRENT_DIR)
        print('CURRENT_DIR: ', SCRIPT_DIR)

    # youtube url
    youtube_url = None
    if is_youtube_url(args.file):
        print('The audio file is a youtube url: ', args.file)
        tmp_path, title  = download_audio_from_youtube(args.file)
        tmp_filename = 'tmp.webm'
        display_name = title if title else 'YouTube Video'
        youtube_url = args.file
        print(f"The audio file has been downloaded: {tmp_path}")
        print(f"DEBUG: Title extracted = {title}")
        print(f"DEBUG: Display name = {display_name}")
        print(f"DEBUG: YouTube URL = {youtube_url}")

    # local file
    else: 
        tmp_filename, tmp_path = copy_file_to_tmp(os.path.join(CURRENT_DIR, args.file))
        display_name = None

    chords = extract_chords_from_audio(tmp_path)
    generate_json_with_chords(tmp_filename, chords, display_name, youtube_url)
    run_server()
