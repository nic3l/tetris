// Правила тетриса. Здесь нет ни document, ни canvas — только сетка, фигуры
// и счёт. Всё, что видно на экране, живёт в index.html и вызывает эти функции.
//
// Это ES-модуль: и страница, и тесты в терминале подключают его одним и тем же
// словом import. Правила проверяются без браузера и без заглушек DOM.

const COLS = 10;
const ROWS = 15;
const DROP_MS = 1000;      // стартовая скорость: 1 клетка в секунду
const FAST_FACTOR = 5;     // ускорение на S/Ы
const SPEED_STEP = 30;     // каждые 30 очков...
const SPEED_MULT = 1.25;   // ...скорость падения умножается на 1.25
const MIN_DROP_MS = 250;   // предел разгона: не быстрее 250 мс на клетку
const SCORE_PER_ROW = 10;  // очков за собранную строку
const GRACE_HEIGHT = 11;   // когда стакан дорос до 11 клеток...
const GRACE_MS = 333;      // ...новая фигура треть секунды висит неподвижно

// Фигуры: матрица 1/0 + цвет.
const SHAPES = [
  { name: 'dot',   color: '#f2c14e', cells: [[1]] },
  { name: 'i3',    color: '#4ec9f2', cells: [[1],[1],[1]] },
  { name: 'i4',    color: '#4e8cf2', cells: [[1],[1],[1],[1]] },
  { name: 'i5',    color: '#7a6cf5', cells: [[1],[1],[1],[1],[1]] },
  { name: 'o4',    color: '#f27a4e', cells: [[1,1],[1,1]] },
  { name: 'o9',    color: '#ef5b7b', cells: [[1,1,1],[1,1,1],[1,1,1]] },
  { name: 'rect',  color: '#5ad19a', cells: [[1,1],[1,1],[1,1]] },
  // Г-образная: высота 4, сверху один блок влево
  { name: 'jTall', color: '#c46ef0', cells: [[1,1],[0,1],[0,1],[0,1]] },
];

function emptyGrid() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function rotateCW(cells) {
  const h = cells.length, w = cells[0].length;
  const out = Array.from({ length: w }, () => Array(h).fill(0));
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      out[x][h - 1 - y] = cells[y][x];
  return out;
}

function collides(grid, p, dx, dy, cells = p.cells) {
  for (let y = 0; y < cells.length; y++) {
    for (let x = 0; x < cells[y].length; x++) {
      if (!cells[y][x]) continue;
      const nx = p.x + x + dx;
      const ny = p.y + y + dy;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && grid[ny][nx]) return true;
    }
  }
  return false;
}

function randomShape() {
  return SHAPES[Math.floor(Math.random() * SHAPES.length)];
}

// Новая фигура: копия матрицы, по центру сверху.
function makePiece(shape) {
  const cells = shape.cells.map(row => row.slice());
  return {
    cells,
    color: shape.color,
    x: Math.floor((COLS - cells[0].length) / 2),
    y: 0,
    rot: 0,   // номер поворота, 0..3
  };
}

// Куда встанет фигура после поворота, или null, если повернуть некуда.
// Поворот вокруг центра: координата фигуры — её левый верхний угол, а рамка
// при повороте меняет ширину с высотой (w×h → h×w). Без поправки угол остаётся
// на месте и фигура будто крутится вокруг него; сдвигаем так, чтобы совпали
// центры старой и новой рамки. У фигур вроде 2×3 центр приходится на полклетки,
// и округление всегда в одну сторону уводило бы фигуру всё дальше при каждом
// повороте — поэтому чередуем округление по чётности поворота.
function rotatedPlacement(grid, piece) {
  const rotated = rotateCW(piece.cells);
  const w = piece.cells[0].length, h = piece.cells.length;
  const round = piece.rot % 2 === 0 ? Math.floor : Math.ceil;
  const cx = round((w - h) / 2);
  const cy = round((h - w) / 2);
  // wall-kick: если на новом месте не помещается — пробуем рядом
  for (const dy of [0, 1, 2, -1, -2]) {
    for (const dx of [0, -1, 1, -2, 2]) {
      const probe = { x: piece.x + cx + dx, y: piece.y + cy + dy, cells: rotated };
      if (probe.y < 0) continue;   // выше поля фигуру не поднимаем
      if (!collides(grid, probe, 0, 0, rotated))
        return { cells: rotated, x: probe.x, y: probe.y, rot: (piece.rot + 1) % 4 };
    }
  }
  return null;
}

// Самый нижний ряд, до которого фигура может опуститься.
function dropTarget(grid, piece) {
  const p = { x: piece.x, y: piece.y, cells: piece.cells };
  while (!collides(grid, p, 0, 1)) p.y++;
  return p.y;
}

// Вписывает фигуру в сетку — с этого момента она часть завала.
function lockPiece(grid, piece) {
  for (let y = 0; y < piece.cells.length; y++) {
    for (let x = 0; x < piece.cells[y].length; x++) {
      if (!piece.cells[y][x]) continue;
      const gy = piece.y + y, gx = piece.x + x;
      if (gy >= 0) grid[gy][gx] = piece.color;
    }
  }
  return grid;
}

function fullRows(grid) {
  const rows = [];
  for (let y = 0; y < ROWS; y++) if (grid[y].every(c => c)) rows.push(y);
  return rows;
}

// Убирает строки. Ничего не рисует и никуда не пишет: возвращает новую сетку,
// заработанные очки и то, на сколько клеток съехала каждая уцелевшая строка —
// последнее нужно только для анимации, но считается здесь, потому что это
// прямое следствие правил.
function applyClear(grid, rows) {
  const cleared = new Set(rows);
  const kept = [];
  const shifts = [];
  for (let y = 0; y < ROWS; y++) {
    if (cleared.has(y)) continue;
    // строка падает на столько клеток, сколько убрано под ней
    let shift = 0;
    for (const c of rows) if (c > y) shift++;
    kept.push(grid[y]);
    shifts.push(shift);
  }
  while (kept.length < ROWS) { kept.unshift(Array(COLS).fill(null)); shifts.unshift(0); }
  return { grid: kept, shifts, points: SCORE_PER_ROW * rows.length };
}

// Высота завала: сколько клеток от дна до самого верхнего занятого ряда.
function stackHeight(grid) {
  for (let y = 0; y < ROWS; y++)
    if (grid[y].some(c => c)) return ROWS - y;
  return 0;
}

// Конец игры: какая-то колонка заполнена на всю высоту поля.
function hasFullColumn(grid) {
  for (let x = 0; x < COLS; x++) {
    let full = true;
    for (let y = 0; y < ROWS; y++) if (!grid[y][x]) { full = false; break; }
    if (full) return true;
  }
  return false;
}

// Пауза между шагами вниз. Уровень считается прямо из счёта, поэтому очистка
// сразу нескольких строк учитывается за один раз.
function dropInterval(score) {
  const level = Math.floor(score / SPEED_STEP);
  return Math.max(MIN_DROP_MS, DROP_MS / Math.pow(SPEED_MULT, level));
}

// Нужна ли новой фигуре передышка перед падением.
function graceFor(grid) {
  return stackHeight(grid) >= GRACE_HEIGHT ? GRACE_MS : 0;
}

export {
  COLS, ROWS, DROP_MS, FAST_FACTOR, SPEED_STEP, SPEED_MULT, MIN_DROP_MS,
  SCORE_PER_ROW, GRACE_HEIGHT, GRACE_MS, SHAPES,
  emptyGrid, rotateCW, collides, randomShape, makePiece, rotatedPlacement,
  dropTarget, lockPiece, fullRows, applyClear, stackHeight, hasFullColumn,
  dropInterval, graceFor,
};
