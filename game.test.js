// Тесты правил игры. Запуск из папки game:
//
//     node --test
//
// Node сам находит файлы *.test.js, выполняет их и печатает отчёт.
// Ничего ставить не нужно: и запускалка (node:test), и сравнение (node:assert)
// встроены в Node. Браузер не участвует — game.js не знает про страницу,
// поэтому его функции вызываются здесь напрямую.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  dropInterval, hasFullColumn, rotatedPlacement, makePiece,
  emptyGrid, SHAPES, ROWS, COLS,
} from './game.js';

const i5 = () => makePiece(SHAPES.find(s => s.name === 'i5'));

// Разгон: каждые 30 очков пауза между шагами делится на 1.25,
// но не становится меньше 250 мс.

test('в начале игры фигура идёт клетку в секунду', () => {
  assert.equal(dropInterval(0), 1000);
});

test('до порога в 30 очков скорость не меняется', () => {
  assert.equal(dropInterval(29), 1000);
});

test('на 30 очках наступает первое ускорение', () => {
  assert.equal(dropInterval(30), 800);
});

test('внутри уровня скорость держится ступенькой', () => {
  assert.equal(dropInterval(59), 800);
});

test('на каждом следующем пороге множитель применяется заново', () => {
  assert.equal(dropInterval(60), 640);
  assert.equal(dropInterval(90), 512);
});

test('перед потолком формула ещё считает', () => {
  assert.equal(dropInterval(209), 262.144);
});

test('разгон упирается в потолок 250 мс и дальше не растёт', () => {
  assert.equal(dropInterval(210), 250);
  assert.equal(dropInterval(10000), 250);
});

// Конец игры по завалу: колонка, занятая сверху донизу.
// Два случая отличаются одной-единственной клеткой — так проверка ловит
// и «считает не ту колонку», и «смотрит только на низ».

test('колонка занята сверху донизу — игра кончена', () => {
  const grid = emptyGrid();
  for (let y = 0; y < ROWS; y++) grid[y][3] = '#f2c14e';
  assert.equal(hasFullColumn(grid), true);
});

test('в колонке есть пустая клетка — игра продолжается', () => {
  const grid = emptyGrid();
  for (let y = 0; y < ROWS; y++) grid[y][3] = '#f2c14e';
  grid[7][3] = null;   // одна дырка посередине
  assert.equal(hasFullColumn(grid), false);
});

test('колонка не достаёт одну клетку до верха — игра продолжается', () => {
  const grid = emptyGrid();
  for (let y = 1; y < ROWS; y++) grid[y][3] = '#f2c14e';   // пусто только в ряду 0
  assert.equal(hasFullColumn(grid), false);
});

// Поворот. rotatedPlacement ничего не меняет: она возвращает, куда фигура
// встанет, либо null, если ей некуда.

test('палка из 5 на свободном поле ложится горизонтально', () => {
  const grid = emptyGrid();
  const next = rotatedPlacement(grid, i5());

  assert.notEqual(next, null);
  assert.equal(next.cells.length, 1);      // одна строка...
  assert.equal(next.cells[0].length, 5);   // ...из пяти блоков подряд
});

test('палка у правой стенки поворачивается — её отодвигает внутрь поля', () => {
  const grid = emptyGrid();
  const piece = i5();
  piece.x = COLS - 1;   // прижата к правому краю

  const next = rotatedPlacement(grid, piece);

  assert.notEqual(next, null);
  assert.equal(next.cells[0].length, 5);        // легла горизонтально
  assert.ok(next.x >= 0, 'не вылезла за левый край');
  assert.ok(next.x + 5 <= COLS, 'не вылезла за правый край');
});

test('зажатой в колодце палке повернуться некуда — null', () => {
  // Всё поле занято, свободна одна колонка 4 — в ней и стоит палка.
  // Горизонтально ей нужно пять свободных клеток в ряд, а их нет нигде.
  const grid = emptyGrid();
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++)
      if (x !== 4) grid[y][x] = '#f2c14e';

  const piece = i5();
  piece.y = 5;

  assert.equal(rotatedPlacement(grid, piece), null);
});
