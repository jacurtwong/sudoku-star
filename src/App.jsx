import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DIFFICULTIES, formatTime, generatePuzzle, scoreGame } from "./sudoku.js";

const DIGITS = Array.from({ length: 9 }, (_, index) => index + 1);
const LEADERBOARD_KEY = "sudoku-neon-leaderboard";

function IconButton({ label, children, onClick, className = "", disabled = false }) {
  return (
    <button
      className={`icon-button ${className}`}
      onClick={onClick}
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function RestartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.8 9.5A7.7 7.7 0 1 1 6.7 17" />
      <path d="M4.7 4.9v4.6h4.6" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 2 1.7 6.4L20 10l-6.3 1.6L12 18l-1.7-6.4L4 10l6.3-1.6L12 2Z" />
      <path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z" />
    </svg>
  );
}

function HintIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M8.3 14.6A6.2 6.2 0 1 1 15.7 14c-.9.7-1.4 1.6-1.6 2.7H9.9c-.2-.8-.6-1.6-1.6-2.1Z" />
    </svg>
  );
}

function createEntries() {
  return Array(81).fill(0);
}

function loadLeaderboard() {
  try {
    return JSON.parse(localStorage.getItem(LEADERBOARD_KEY)) ?? {};
  } catch {
    return {};
  }
}

function saveLeaderboardLocal(board) {
  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(board));
  } catch {
    // Browsers can block storage in private contexts; server persistence still works in production.
  }
}

async function fetchLeaderboard() {
  const response = await fetch("/api/leaderboard", { cache: "no-store" });
  if (!response.ok) throw new Error("Leaderboard API unavailable");
  return response.json();
}

async function saveLeaderboardRemote(board) {
  const response = await fetch("/api/leaderboard", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(board),
  });
  if (!response.ok) throw new Error("Leaderboard API unavailable");
  return response.json();
}

function Fireworks({ active }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!active) return undefined;

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const particles = [];
    const colors = ["#34d5ff", "#ffcf5a", "#ff5f87", "#7ef29d", "#ffffff"];
    let frame = 0;
    let animationId;

    const resize = () => {
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      context.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    };

    const burst = () => {
      const x = window.innerWidth * (0.2 + Math.random() * 0.6);
      const y = window.innerHeight * (0.12 + Math.random() * 0.36);
      for (let index = 0; index < 80; index += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.6 + Math.random() * 5.2;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 60 + Math.random() * 36,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: 1.4 + Math.random() * 2.8,
        });
      }
    };

    const draw = () => {
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      if (frame % 28 === 0) burst();

      for (let index = particles.length - 1; index >= 0; index -= 1) {
        const particle = particles[index];
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.035;
        particle.life -= 1;

        if (particle.life <= 0) {
          particles.splice(index, 1);
          continue;
        }

        context.globalAlpha = Math.min(1, particle.life / 44);
        context.fillStyle = particle.color;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fill();
      }

      context.globalAlpha = 1;
      frame += 1;
      animationId = requestAnimationFrame(draw);
    };

    resize();
    burst();
    window.addEventListener("resize", resize);
    animationId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, [active]);

  return <canvas className="fireworks" ref={canvasRef} aria-hidden="true" />;
}

function SudokuCell({ index, given, value, selected, related, sameDigit, conflict, onSelect }) {
  const row = Math.floor(index / 9);
  const col = index % 9;
  const boxEnd = (col + 1) % 3 === 0 && col !== 8;
  const rowEnd = (row + 1) % 3 === 0 && row !== 8;

  return (
    <button
      className={[
        "cell",
        given ? "given" : "entry",
        selected ? "selected" : "",
        related ? "related" : "",
        sameDigit ? "same-digit" : "",
        conflict ? "conflict" : "",
        boxEnd ? "box-end" : "",
        rowEnd ? "row-end" : "",
      ].join(" ")}
      type="button"
      onClick={() => onSelect(index)}
      aria-label={`第 ${row + 1} 行第 ${col + 1} 列${value ? `，数字 ${value}` : "，空格"}`}
    >
      {value || ""}
    </button>
  );
}

function SudokuBoard({ puzzle, entries, solution, selectedIndex, selectedDigit, onSelect }) {
  return (
    <div className="board" role="grid" aria-label="数独棋盘">
      {puzzle.map((given, index) => {
        const value = given || entries[index];
        const selectedRow = Math.floor(selectedIndex / 9);
        const selectedCol = selectedIndex % 9;
        const row = Math.floor(index / 9);
        const col = index % 9;
        const related =
          selectedIndex >= 0 &&
          (row === selectedRow ||
            col === selectedCol ||
            (Math.floor(row / 3) === Math.floor(selectedRow / 3) &&
              Math.floor(col / 3) === Math.floor(selectedCol / 3)));

        return (
          <SudokuCell
            key={index}
            index={index}
            given={given}
            value={value}
            selected={selectedIndex === index}
            related={related}
            sameDigit={Boolean(value && selectedDigit && value === selectedDigit)}
            conflict={Boolean(!given && value && value !== solution[index])}
            onSelect={onSelect}
          />
        );
      })}
    </div>
  );
}

function NumberPad({ counts, selectedDigit, onInput, onErase }) {
  return (
    <div className="keypad" aria-label="数字小键盘">
      {DIGITS.map((digit) => (
        <button
          className={`key ${selectedDigit === digit ? "active" : ""}`}
          key={digit}
          type="button"
          onClick={() => onInput(digit)}
          disabled={counts[digit] >= 9}
        >
          <span>{digit}</span>
          <small>{counts[digit]}/9</small>
        </button>
      ))}
      <button className="key erase" type="button" onClick={onErase}>
        <span>清除</span>
        <small>Back</small>
      </button>
    </div>
  );
}

function Leaderboard({ records, difficulty }) {
  const rows = records[difficulty] ?? [];
  return (
    <aside className="leaderboard" aria-label="排行榜">
      <div className="panel-title">
        <span>排行榜</span>
        <small>{DIFFICULTIES[difficulty].label}</small>
      </div>
      <ol>
        {rows.length ? (
          rows.map((record, index) => (
            <li key={`${record.score}-${record.time}-${index}`}>
              <span className="rank">{index + 1}</span>
              <span className="record-name">{record.name}</span>
              <strong>{record.score}</strong>
              <small>{formatTime(record.time)}</small>
            </li>
          ))
        ) : (
          <li className="empty-record">暂无成绩</li>
        )}
      </ol>
    </aside>
  );
}

function WinDialog({ score, time, onSave, saved }) {
  const [name, setName] = useState("玩家");

  return (
    <div className="win-dialog" role="dialog" aria-modal="true" aria-label="通关成绩">
      <div className="win-panel">
        <SparkIcon />
        <h2>通关完成</h2>
        <p>得分 {score} · 用时 {formatTime(time)}</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSave(name.trim() || "玩家");
          }}
        >
          <input
            value={name}
            onChange={(event) => setName(event.target.value.slice(0, 10))}
            aria-label="排行榜昵称"
            disabled={saved}
          />
          <button type="submit" disabled={saved}>
            {saved ? "正在开新局" : "保存并开新局"}
          </button>
        </form>
      </div>
    </div>
  );
}

function useTimer(paused) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (paused) return undefined;
    const id = window.setInterval(() => setSeconds((current) => current + 1), 1000);
    return () => window.clearInterval(id);
  }, [paused]);

  return [seconds, setSeconds];
}

export default function App() {
  const [difficulty, setDifficulty] = useState("easy");
  const [game, setGame] = useState(() => generatePuzzle("easy"));
  const [entries, setEntries] = useState(createEntries);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedDigit, setSelectedDigit] = useState(null);
  const [mistakes, setMistakes] = useState(0);
  const [hintsLeft, setHintsLeft] = useState(3);
  const [completed, setCompleted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [leaderboard, setLeaderboard] = useState(loadLeaderboard);
  const [seconds, setSeconds] = useTimer(completed);

  const visibleValues = useMemo(
    () => game.puzzle.map((given, index) => given || entries[index]),
    [entries, game.puzzle]
  );

  const counts = useMemo(() => {
    const next = Object.fromEntries(DIGITS.map((digit) => [digit, 0]));
    visibleValues.forEach((value) => {
      if (value) next[value] += 1;
    });
    return next;
  }, [visibleValues]);

  const score = scoreGame(difficulty, seconds, mistakes);

  useEffect(() => {
    let cancelled = false;
    fetchLeaderboard()
      .then((remoteBoard) => {
        if (cancelled) return;
        setLeaderboard(remoteBoard);
        saveLeaderboardLocal(remoteBoard);
      })
      .catch(() => {
        // Vite dev mode has no API server; keep the local fallback for development.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const startGame = useCallback(
    (nextDifficulty = difficulty) => {
      setDifficulty(nextDifficulty);
      setGame(generatePuzzle(nextDifficulty));
      setEntries(createEntries());
      setSelectedIndex(-1);
      setSelectedDigit(null);
      setMistakes(0);
      setHintsLeft(3);
      setCompleted(false);
      setSaved(false);
      setSeconds(0);
    },
    [difficulty, setSeconds]
  );

  const checkCompletion = useCallback(
    (nextEntries) => {
      const solved = game.puzzle.every((given, index) => {
        const value = given || nextEntries[index];
        return value === game.solution[index];
      });
      if (solved) setCompleted(true);
    },
    [game.puzzle, game.solution]
  );

  const selectCell = (index) => {
    const value = game.puzzle[index] || entries[index];
    setSelectedIndex(index);
    setSelectedDigit(value || selectedDigit);
  };

  const inputDigit = useCallback(
    (digit) => {
      setSelectedDigit(digit);
      if (selectedIndex < 0 || game.puzzle[selectedIndex] || completed) return;

      setEntries((current) => {
        const next = [...current];
        const previous = next[selectedIndex];
        next[selectedIndex] = previous === digit ? 0 : digit;
        if (next[selectedIndex] && next[selectedIndex] !== game.solution[selectedIndex]) {
          setMistakes((value) => value + 1);
        }
        window.setTimeout(() => checkCompletion(next), 0);
        return next;
      });
    },
    [checkCompletion, completed, game.puzzle, game.solution, selectedIndex]
  );

  const erase = useCallback(() => {
    if (selectedIndex < 0 || game.puzzle[selectedIndex] || completed) return;
    setEntries((current) => {
      const next = [...current];
      next[selectedIndex] = 0;
      return next;
    });
  }, [completed, game.puzzle, selectedIndex]);

  const useHint = useCallback(() => {
    if (completed || hintsLeft <= 0) return;

    const selectedIsPlayable =
      selectedIndex >= 0 &&
      !game.puzzle[selectedIndex] &&
      entries[selectedIndex] !== game.solution[selectedIndex];
    const hintIndex = selectedIsPlayable
      ? selectedIndex
      : game.puzzle.findIndex((given, index) => !given && entries[index] !== game.solution[index]);

    if (hintIndex < 0) return;

    setEntries((current) => {
      const next = [...current];
      next[hintIndex] = game.solution[hintIndex];
      window.setTimeout(() => checkCompletion(next), 0);
      return next;
    });
    setSelectedIndex(hintIndex);
    setSelectedDigit(game.solution[hintIndex]);
    setHintsLeft((value) => value - 1);
  }, [checkCompletion, completed, entries, game.puzzle, game.solution, hintsLeft, selectedIndex]);

  const saveScore = (name) => {
    if (saved) return;
    const next = { ...leaderboard };
    const row = [...(next[difficulty] ?? []), { name, score, time: seconds }]
      .sort((a, b) => b.score - a.score || a.time - b.time)
      .slice(0, 5);
    next[difficulty] = row;
    setLeaderboard(next);
    saveLeaderboardLocal(next);
    saveLeaderboardRemote(next).catch(() => {
      saveLeaderboardLocal(next);
    });
    setSaved(true);
    window.setTimeout(() => startGame(difficulty), 700);
  };

  useEffect(() => {
    const onKeyDown = (event) => {
      if (/^[1-9]$/.test(event.key)) inputDigit(Number(event.key));
      if (event.key === "Backspace" || event.key === "Delete" || event.key === "0") erase();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [erase, inputDigit]);

  return (
    <main className="app-shell">
      <Fireworks active={completed} />
      <section className="game-panel">
        <header className="topbar">
          <div>
            <h1>数独星盘</h1>
            <p>安静推理，漂亮收官</p>
          </div>
          <div className="difficulty-tabs" aria-label="难度">
            {Object.entries(DIFFICULTIES).map(([key, config]) => (
              <button
                className={difficulty === key ? "active" : ""}
                key={key}
                type="button"
                onClick={() => startGame(key)}
              >
                {config.label}
              </button>
            ))}
          </div>
          <div className="stats">
            <span>
              <small>时间</small>
              {formatTime(seconds)}
            </span>
            <span>
              <small>分数</small>
              {score}
            </span>
            <span>
              <small>失误</small>
              {mistakes}
            </span>
            <IconButton
              label={`提示，剩余 ${hintsLeft} 次`}
              className="hint-button"
              onClick={useHint}
              disabled={completed || hintsLeft <= 0}
            >
              <HintIcon />
              <small>{hintsLeft}</small>
            </IconButton>
            <IconButton label="新开一局" onClick={() => startGame()}>
              <RestartIcon />
            </IconButton>
          </div>
        </header>

        <div className="content-grid">
          <section className="play-area" aria-label="游戏区">
            <SudokuBoard
              puzzle={game.puzzle}
              entries={entries}
              solution={game.solution}
              selectedIndex={selectedIndex}
              selectedDigit={selectedDigit}
              onSelect={selectCell}
            />
            <NumberPad counts={counts} selectedDigit={selectedDigit} onInput={inputDigit} onErase={erase} />
          </section>

          <div className="side-stack">
            <Leaderboard records={leaderboard} difficulty={difficulty} />
          </div>
        </div>
      </section>
      {completed ? <WinDialog score={score} time={seconds} onSave={saveScore} saved={saved} /> : null}
    </main>
  );
}
