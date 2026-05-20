const SIDE = 9;
const BOX = 3;

export const DIFFICULTIES = {
  easy: { label: "轻松", blanks: 36, baseScore: 5000 },
  medium: { label: "进阶", blanks: 46, baseScore: 8000 },
  hard: { label: "大师", blanks: 54, baseScore: 12000 },
};

const range = (count) => Array.from({ length: count }, (_, index) => index);

const shuffle = (items) => {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
};

const pattern = (row, col) => (BOX * (row % BOX) + Math.floor(row / BOX) + col) % SIDE;

export function generateSolution() {
  const rows = shuffle(range(BOX)).flatMap((group) =>
    shuffle(range(BOX)).map((row) => group * BOX + row)
  );
  const cols = shuffle(range(BOX)).flatMap((group) =>
    shuffle(range(BOX)).map((col) => group * BOX + col)
  );
  const numbers = shuffle(range(SIDE).map((value) => value + 1));

  return rows.flatMap((row) => cols.map((col) => numbers[pattern(row, col)]));
}

function canPlace(board, index, value) {
  const row = Math.floor(index / SIDE);
  const col = index % SIDE;
  const boxRow = Math.floor(row / BOX) * BOX;
  const boxCol = Math.floor(col / BOX) * BOX;

  for (let offset = 0; offset < SIDE; offset += 1) {
    if (board[row * SIDE + offset] === value) return false;
    if (board[offset * SIDE + col] === value) return false;
  }

  for (let rowOffset = 0; rowOffset < BOX; rowOffset += 1) {
    for (let colOffset = 0; colOffset < BOX; colOffset += 1) {
      const checkIndex = (boxRow + rowOffset) * SIDE + boxCol + colOffset;
      if (board[checkIndex] === value) return false;
    }
  }

  return true;
}

function countSolutions(board, limit = 2) {
  const emptyIndex = board.findIndex((value) => value === 0);
  if (emptyIndex === -1) return 1;

  let count = 0;
  const candidates = shuffle(range(SIDE).map((value) => value + 1));

  for (const candidate of candidates) {
    if (!canPlace(board, emptyIndex, candidate)) continue;
    board[emptyIndex] = candidate;
    count += countSolutions(board, limit);
    board[emptyIndex] = 0;
    if (count >= limit) break;
  }

  return count;
}

export function generatePuzzle(difficulty = "easy") {
  const solution = generateSolution();
  const puzzle = [...solution];
  const targetBlanks = DIFFICULTIES[difficulty].blanks;
  const cells = shuffle(range(SIDE * SIDE));
  let blanks = 0;

  for (const index of cells) {
    if (blanks >= targetBlanks) break;

    const previous = puzzle[index];
    puzzle[index] = 0;

    if (countSolutions([...puzzle]) === 1) {
      blanks += 1;
    } else {
      puzzle[index] = previous;
    }
  }

  return { puzzle, solution };
}

export function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const rest = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
}

export function scoreGame(difficulty, seconds, mistakes) {
  const config = DIFFICULTIES[difficulty];
  return Math.max(100, config.baseScore - seconds * 3 - mistakes * 250);
}
