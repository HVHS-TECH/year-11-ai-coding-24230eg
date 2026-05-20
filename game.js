// Simple Tetris implementation
"use strict";

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next');
const nextCtx = nextCanvas.getContext('2d');

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;
canvas.width = COLS * BLOCK;
canvas.height = ROWS * BLOCK;

const colors = [null, '#00f0f0', '#0000f0', '#f0a000', '#f0f000', '#00f000', '#a000f0', '#f00000'];

function createMatrix(w, h) {
	const m = [];
	while (h--) m.push(new Array(w).fill(0));
	return m;
}

const PIECES = {
	'I': [[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],[[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]]],
	'J': [[[2,0,0],[2,2,2],[0,0,0]],[[0,2,2],[0,2,0],[0,2,0]],[[0,0,0],[2,2,2],[0,0,2]],[[0,2,0],[0,2,0],[2,2,0]]],
	'L': [[[0,0,3],[3,3,3],[0,0,0]],[[0,3,0],[0,3,0],[0,3,3]],[[0,0,0],[3,3,3],[3,0,0]],[[3,3,0],[0,3,0],[0,3,0]]],
	'O': [[[4,4],[4,4]]],
	'S': [[[0,5,5],[5,5,0],[0,0,0]],[[0,5,0],[0,5,5],[0,0,5]]],
	'T': [[[0,6,0],[6,6,6],[0,0,0]],[[0,6,0],[0,6,6],[0,6,0]],[[0,0,0],[6,6,6],[0,6,0]],[[0,6,0],[6,6,0],[0,6,0]]],
	'Z': [[[7,7,0],[0,7,7],[0,0,0]],[[0,0,7],[0,7,7],[0,7,0]]]
};

function drawMatrix(matrix, offset, ctxRef) {
	const cx = ctxRef || ctx;
	for (let y = 0; y < matrix.length; ++y) {
		for (let x = 0; x < matrix[y].length; ++x) {
			const val = matrix[y][x];
			if (val) {
				cx.fillStyle = colors[val];
				cx.fillRect((x + offset.x) * BLOCK, (y + offset.y) * BLOCK, BLOCK - 1, BLOCK - 1);
			}
		}
	}
}

function drawArena() {
	ctx.fillStyle = '#000';
	ctx.fillRect(0,0,canvas.width,canvas.height);
	drawMatrix(arena, {x:0,y:0}, ctx);
}

function collide(arena, player) {
	const m = player.matrix;
	const o = player.pos;
	for (let y = 0; y < m.length; ++y) {
		for (let x = 0; x < m[y].length; ++x) {
			if (m[y][x] !== 0 && (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) {
				return true;
			}
		}
	}
	return false;
}

function merge(arena, player) {
	player.matrix.forEach((row,y) => {
		row.forEach((val,x) => {
			if (val) {
				arena[y + player.pos.y][x + player.pos.x] = val;
			}
		});
	});
}

function rotate(matrix, dir) {
	for (let y = 0; y < matrix.length; ++y) {
		for (let x = 0; x < y; ++x) {
			[matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
		}
	}
	if (dir > 0) matrix.forEach(row => row.reverse()); else matrix.reverse();
}

function sweep() {
	let rowCount = 0;
	outer: for (let y = arena.length -1; y >= 0; --y) {
		for (let x = 0; x < arena[y].length; ++x) {
			if (arena[y][x] === 0) continue outer;
		}
		const row = arena.splice(y,1)[0].fill(0);
		arena.unshift(row);
		++y;
		rowCount++;
	}
	if (rowCount) {
		player.score += (rowCount * 100) * rowCount;
		player.lines += rowCount;
		player.level = Math.floor(player.lines / 10) + 1;
		updateScore();
	}
}

function updateScore() {
	document.getElementById('score').textContent = player.score;
	document.getElementById('lines').textContent = player.lines;
	document.getElementById('level').textContent = player.level;
}

function createPiece(type) {
	const variants = PIECES[type];
	// pick first rotation as default
	return variants[0].map(r => r.slice());
}

function randomPiece() {
	const keys = Object.keys(PIECES);
	return keys[Math.floor(Math.random() * keys.length)];
}

function playerDrop() {
	player.pos.y++;
	if (collide(arena, player)) {
		player.pos.y--;
		merge(arena, player);
		resetPlayer();
		sweep();
		if (collide(arena, player)) {
			// game over
			arena.forEach(row => row.fill(0));
			player.score = 0; player.lines = 0; player.level = 1;
			updateScore();
		}
	}
	dropCounter = 0;
}

function playerMove(dir) {
	player.pos.x += dir;
	if (collide(arena, player)) player.pos.x -= dir;
}

function playerRotate(dir) {
	const pos = player.pos.x;
	rotate(player.matrix, dir);
	let offset = 1;
	while (collide(arena, player)) {
		player.pos.x += offset;
		offset = -(offset + (offset > 0 ? 1 : -1));
		if (offset > player.matrix[0].length) { rotate(player.matrix, -dir); player.pos.x = pos; return; }
	}
}

function resetPlayer() {
	const type = player.next;
	player.matrix = createPiece(type);
	player.pos.y = 0;
	player.pos.x = Math.floor(COLS / 2) - Math.floor(player.matrix[0].length / 2);
	player.next = randomPiece();
	drawNext();
}

function draw() {
	drawArena();
	drawMatrix(player.matrix, player.pos, ctx);
}

function drawNext() {
	nextCtx.fillStyle = '#000';
	nextCtx.fillRect(0,0,nextCanvas.width,nextCanvas.height);
	const size = player.matrix ? player.matrix.length : 4;
	const scale = BLOCK * 0.8;
	const nx = 1; const ny = 1;
	// draw using the first rotation of next piece
	const variants = PIECES[player.next];
	const m = variants[0];
	for (let y = 0; y < m.length; y++) {
		for (let x = 0; x < m[y].length; x++) {
			const v = m[y][x];
			if (v) {
				nextCtx.fillStyle = colors[v];
				nextCtx.fillRect((x + nx) * (scale/1.5), (y + ny) * (scale/1.5), (scale/1.5)-2, (scale/1.5)-2);
			}
		}
	}
}

let arena = createMatrix(COLS, ROWS);

const player = { pos: {x:0,y:0}, matrix: null, next: randomPiece(), score:0, lines:0, level:1 };

resetPlayer();
updateScore();

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let paused = false;

function update(time = 0) {
	const delta = time - lastTime;
	lastTime = time;
	if (!paused) {
		dropCounter += delta;
		const interval = dropInterval - (player.level -1) * 80;
		if (dropCounter > Math.max(100, interval)) {
			playerDrop();
		}
	}
	draw();
	requestAnimationFrame(update);
}

document.addEventListener('keydown', event => {
	if (event.code === 'ArrowLeft') playerMove(-1);
	else if (event.code === 'ArrowRight') playerMove(1);
	else if (event.code === 'ArrowDown') playerDrop();
	else if (event.code === 'ArrowUp') playerRotate(1);
	else if (event.code === 'Space') {
		// hard drop
		while (!collide(arena, player)) player.pos.y++;
		player.pos.y--;
		merge(arena, player);
		resetPlayer();
		sweep();
		dropCounter = 0;
	} else if (event.key.toLowerCase() === 'p') paused = !paused;
});

document.getElementById('restart').addEventListener('click', () => {
	arena.forEach(row => row.fill(0));
	player.score = 0; player.lines = 0; player.level = 1;
	player.next = randomPiece();
	resetPlayer(); updateScore();
});

requestAnimationFrame(update);
