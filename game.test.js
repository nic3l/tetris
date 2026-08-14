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

import { dropInterval } from './game.js';

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
