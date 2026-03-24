import { useEffect, useState, useRef, useMemo } from "react";
import ReactChord from "@tombatossals/react-chords/lib/Chord";
import { Minus, Plus, ZoomIn, ZoomOut } from "lucide-react";
import "./App.css";

function App() {
  const [chords, setChords] = useState([]);
  const [currentChord, setCurrentChord] = useState(null);
  const [nextChord, setNextChord] = useState(null);
  const [capo, setCapo] = useState(0);
  const [instrument, setInstrument] = useState("guitar");
  const audioRef = useRef(null);
  const [guitarData, setGuitarData] = useState(null);
  const [ukuleleData, setUkuleleData] = useState(null);

  const [filename, setFilename] = useState();
  const [audioSrc, setAudioSrc] = useState();

  const tunings = {
    guitar: {
      strings: 6,
      fretsOnChord: 4,
      name: "Guitar",
      keys: [],
      tunings: {
        standard: ["E", "A", "D", "G", "B", "E"],
      },
    },
    ukulele: {
      strings: 4,
      fretsOnChord: 4,
      name: "Ukulele",
      keys: [],
      tunings: {
        standard: ["G", "C", "E", "A"],
      },
    },
  };

  useEffect(() => {
    fetch("guitar.json")
      .then((res) => res.json())
      .then((data) => {
        setGuitarData(data);
      })
      .catch((err) => console.error("Failed to load data:", err));

    fetch("ukulele.json")
      .then((res) => res.json())
      .then((data) => {
        setUkuleleData(data);
      })
      .catch((err) => console.error("Failed to load data:", err));
  }, []);

  function getChordData(instrument, key, suffix) {
    if (instrument === "guitar" && guitarData) {
      return guitarData.chords[key]?.filter((chord) => chord.suffix === suffix)[0]?.positions[0] || [];
    }
    if (instrument === "ukulele" && ukuleleData) {
      return ukuleleData.chords[key]?.filter((chord) => chord.suffix === suffix)[0]?.positions[0] || [];
    }
    return [];
  }

  const parseChord = (chord) => {

    if (!chord || chord.length === 0) return { key: "", suffix: "" };

    let key;
    let suffix;
    // first replace all the sharp notes with the flat notes
    [["A#", "Bb"], ["C#", "Db"], ["D#", "Eb"], ["F#", "Gb"], ["G#", "Ab"]].forEach(([sharp, flat]) => {
      chord = chord.replace(sharp, flat);
    });

    ["Ab", "Bb", "Db", "Eb", "Gb"].forEach((flat) => {
      if (chord.startsWith(flat)) {
        key = flat;
        suffix = chord.slice(flat.length);
      }
    });

    if (!key) {
      ["A", "B", "C", "D", "E", "F", "G"].forEach((note) => {
        if (chord.startsWith(note)) {
          key = note;
          suffix = chord.slice(note.length);
        }
      });
    }

    if (suffix === "m") {
      suffix = "minor";
    }
    if (suffix === "") {
      suffix = "major";
    }
    // if (key == "Db") {
    //   key = "Csharp";
    // }
    // if (key == "Gb") {
    //   key = "Fsharp";
    // }

    return { key, suffix };
  };

  const ChordDiagram = ({ chord, instrument }) => {
    let { key, suffix } = parseChord(chord);
    if (!chord || chord.length === 0) return null;
    let chordData = getChordData(instrument, key, suffix);
    if ((!chordData || chordData.length === 0) && suffix.includes("/")) {
      suffix = suffix.split("/")[0];
      chordData = getChordData(instrument, key, suffix);
    }
    if (!chordData || chordData.length === 0) {
      return null;
    }
    return (
      <ReactChord
        chord={chordData}
        instrument={tunings[instrument]}
        lite={true}
      />
    );
  };

  useEffect(() => {
    fetch("chords.json")
      .then((res) => res.json())
      .then((data) => {
        if (!data.chords || !data.chords.length) return;

        // Compute durations
        const updatedChords = data.chords.map((chord, index) => {
          const nextChord = data.chords[index + 1];
          return {
            ...chord,
            duration: nextChord ? nextChord.timestamp - chord.timestamp : 1, // Avoid 0 duration
          };
        });

        // Find max duration
        const maxDuration = Math.max(...updatedChords.map((chord) => chord.duration)) || 1;

        // Assign widths based on maxDuration
        const finalChords = updatedChords.map((chord) => ({
          ...chord,
          width: (chord.duration / maxDuration) * 300, // Normalize width
        }));


        setChords(finalChords);
        setFilename(data.filename);
      })
      .catch((err) => console.error("Failed to load data:", err));
  }, []);

  useEffect(() => {
    // Fetching the audio file dynamically
    const fetchAudio = async () => {
      try {
        const extension = extractExtension(filename);
        if (!extension) {
          return;
        }

        const response = await fetch(`./tmp.${extension}`);
        if (response.ok) {
          const blob = await response.blob();
          const audioUrl = URL.createObjectURL(blob); // Create a temporary URL
          setAudioSrc(audioUrl);
        }
      } catch (error) {
        console.error('Error fetching audio:', error);
      }
    };
    fetchAudio();
  }, [filename]);

  useEffect(() => {
    // If the audio source changes, we force the audio to reload
    if (audioRef.current && audioSrc) {
      audioRef.current.load(); // Trigger reloading the audio element
      audioRef.current.play(); // Optionally auto-play the audio when the src changes
    }
  }, [audioSrc]); // Run when audioSrc changes

  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.code === "Space") {
        event.preventDefault();
        if (audioRef.current) {
          if (!audioRef.current.paused) {
            audioRef.current.pause();
          } else {
            audioRef.current.play();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyPress);

    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, []);

  const [currentTime, setCurrentTime] = useState(0);
  const rafRef = useRef(null);

  function simplifyChord(chord) {
    return chord.replace(/\/.*/, "").replace("A#", "Bb").replace("D#", "Eb");
  }

  const handleZoomIn = () => {
    setChords((prevChords) =>
      prevChords.map((chord) => {
        return {
          ...chord,
          width: chord.width * 2
        };
      })
    );
  };

  const handleZoomOut = () => {
    setChords((prevChords) =>
      prevChords.map((chord) => {
        return {
          ...chord,
          width: chord.width * 0.5,
        };
      })
    );
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const syncCurrentTime = () => {
      setCurrentTime(audio.currentTime || 0);
    };

    const stopRaf = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    const tick = () => {
      setCurrentTime(audio.currentTime || 0);
      rafRef.current = requestAnimationFrame(tick);
    };

    const handlePlay = () => {
      stopRaf();
      tick();
    };

    const handlePause = () => {
      stopRaf();
      syncCurrentTime();
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("seeking", syncCurrentTime);
    audio.addEventListener("seeked", syncCurrentTime);
    audio.addEventListener("timeupdate", syncCurrentTime);
    audio.addEventListener("loadedmetadata", syncCurrentTime);
    audio.addEventListener("ended", handlePause);

    return () => {
      stopRaf();
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("seeking", syncCurrentTime);
      audio.removeEventListener("seeked", syncCurrentTime);
      audio.removeEventListener("timeupdate", syncCurrentTime);
      audio.removeEventListener("loadedmetadata", syncCurrentTime);
      audio.removeEventListener("ended", handlePause);
    };
  }, [audioSrc]);

  const activeChordIndex = useMemo(() => {
    if (!chords.length) return -1;

    return chords.findIndex((chord, index) => {
      const next = chords[index + 1];
      return chord.timestamp <= currentTime && (!next || next.timestamp > currentTime);
    });
  }, [chords, currentTime]);

  useEffect(() => {
    if (activeChordIndex < 0 || !chords[activeChordIndex]) {
      setCurrentChord(null);
      setNextChord(null);
      return;
    }

    const active = chords[activeChordIndex];
    const next = chords[activeChordIndex + 1];
    setCurrentChord(simplifyChord(active.chord));
    setNextChord(next ? simplifyChord(next.chord) : "");
  }, [activeChordIndex, chords]);

  // useEffect(() => {
  //   const audio = audioRef.current;

  //   const handleTimeUpdate = () => {
  //     const currentTime = audio.currentTime;
  //     const activeChord = chords.find(
  //       (chord, index) =>
  //         chord.timestamp <= currentTime &&
  //         (!chords[index + 1] ||
  //           chords[index + 1].timestamp > currentTime)
  //     );

  //     if (activeChord) {
  //       setCurrentChord(activeChord.chord);
  //       setNextChord(
  //         (chords[chords.indexOf(activeChord) + 1] && chords[chords.indexOf(activeChord) + 1].chord) || null
  //       );
  //     }
  //   };

  //   audio.addEventListener("timeupdate", handleTimeUpdate);

  //   return () => {
  //     audio.removeEventListener("timeupdate", handleTimeUpdate);
  //   };
  // }, [chords]);

  const handleChordClick = (timestamp) => {
    if (audioRef.current) {
      audioRef.current.currentTime = timestamp;
      audioRef.current.play();
    }
  };

  const transposeChords = (amount) => {
    setChords((prevChords) =>
      prevChords.map((chord) => ({
        ...chord,
        chord: transposeChord(chord.chord, amount),
      }))
    );
    setCapo((prevCapo) => prevCapo - amount);
  };

  const transposeChord = (chord, amount) => {
    const scale = [
      "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
    ];
    const normalizeMap = {
      Cb: "B", Db: "C#", Eb: "D#", Fb: "E", Gb: "F#", Ab: "G#", Bb: "A#",
      "E#": "F", "B#": "C",
    };

    return chord.replace(/[CDEFGAB](b|#)?/g, (match) => {
      let i =
        (scale.indexOf(normalizeMap[match] || match) + amount) % scale.length;
      return scale[i < 0 ? i + scale.length : i];
    });
  };

  const extractExtension = (filename) => {
    return filename?.split(".").pop();
  };

  const controlButtonClass =
    "inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-app-subtle bg-app-accent px-4 py-3 text-sm font-semibold tracking-wide text-app-text shadow-sm transition hover:border-app-subtle hover:bg-app-strong hover:text-app-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app";
  const instrumentButtonClass =
    "inline-flex min-h-12 cursor-pointer items-center justify-center rounded-xl border px-4 py-3 text-sm font-semibold tracking-wide shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app";

  return (
    <div className="min-h-screen bg-app text-app-text">
      <header className="sticky top-0 z-20 border-b border-app-subtle bg-app/90 backdrop-blur-sm">
        <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-4 md:px-6 lg:grid-cols-[minmax(0,2fr)_minmax(240px,1fr)_minmax(240px,1fr)] lg:items-stretch">
          <div className="space-y-3 rounded-2xl border border-app-subtle bg-app-panel p-4 shadow-sm">
            <h1 className="truncate text-lg font-semibold tracking-tight md:text-xl">{filename || "Unknown file"}</h1>

            <div className="rounded-xl border border-app-subtle bg-app-accent px-3 py-2">
              <audio ref={audioRef} controls className="w-full">
                <source src={audioSrc} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </div>

            <div className="grid gap-2">
              <div className="grid grid-cols-[1fr_auto_1fr] gap-2">
                <button className={controlButtonClass} onClick={() => transposeChords(-1)}>
                <Minus size={18} strokeWidth={2.5} />
                Transpose Down
                </button>

                <div className="inline-flex min-h-12 items-center justify-center rounded-xl border border-app-subtle bg-app-panel px-4 py-3 text-sm font-semibold tracking-wide shadow-sm">
                  CAPO&nbsp;<span className="text-xl font-bold">{capo}</span>
                </div>

                <button className={controlButtonClass} onClick={() => transposeChords(1)}>
                  <Plus size={18} strokeWidth={2.5} />
                  Transpose Up
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  className={`${instrumentButtonClass} ${instrument === "guitar" ? "border-app-strong bg-app-strong text-app-text" : "border-app-subtle bg-app-accent text-app-text hover:border-app-subtle hover:bg-app-strong hover:text-app-text"}`}
                  onClick={() => setInstrument("guitar")}
                >
                  Guitar
                </button>
                <button
                  className={`${instrumentButtonClass} ${instrument === "ukulele" ? "border-app-strong bg-app-strong text-app-text" : "border-app-subtle bg-app-accent text-app-text hover:border-app-subtle hover:bg-app-strong hover:text-app-text"}`}
                  onClick={() => setInstrument("ukulele")}
                >
                  Ukulele
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button className={controlButtonClass} onClick={handleZoomOut}>
                  <ZoomOut size={18} strokeWidth={2.5} />
                  Zoom Out
                </button>
                <button className={controlButtonClass} onClick={handleZoomIn}>
                  <ZoomIn size={18} strokeWidth={2.5} />
                  Zoom In
                </button>
              </div>
            </div>
          </div>

          <div className="chord-diagram-card">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-app-muted">Now</p>
            <ChordDiagram chord={currentChord} instrument={instrument} />
            <h3 className="text-2xl font-bold tracking-tight">{currentChord || "..."}</h3>
          </div>

          <div className="chord-diagram-card opacity-80">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-app-muted">Next</p>
            <ChordDiagram chord={nextChord} instrument={instrument} />
            <h3 className="text-2xl font-bold tracking-tight">{nextChord || "..."}</h3>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 pb-8 pt-4 md:px-6">
        <ul className="flex flex-wrap gap-2 md:gap-3">
          {chords.map((item, index) => (
            <li
              key={index}
              onClick={() => handleChordClick(item.timestamp)}
              className={`chord-chip ${index === activeChordIndex ? "active" : index < activeChordIndex ? "actived" : ""}`}
              style={{
                width: `${Math.max(item.width, 96)}px`,
                "--index": index,
                "--progress": `${Math.max(
                  0,
                  Math.min(
                    100,
                    index === activeChordIndex
                      ? ((currentTime - item.timestamp) / Math.max(item.duration, 0.001)) * 100
                      : index < activeChordIndex
                        ? 100
                        : 0
                  )
                )}%`,
              }}
            >
              {item.chord}
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}

export default App;
