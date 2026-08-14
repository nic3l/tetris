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

import { dropInterval, hasFullColumn, emptyGrid, ROWS } from './game.js';

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
