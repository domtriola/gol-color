"use strict";

function Game(canvasId, options) {
	this.canvas = document.getElementById(canvasId);
	this.context = this.canvas.getContext('2d');
	this.rows = options['rows'];
	this.columns = options['columns'];
	this.recIntensity = options['recIntensity'];
	this.midIntensity = options['midIntensity'];
	this.domIntensity = options['domIntensity'];
	this.grid = new Grid(this.rows, this.columns);
	this.cellWidth = this.canvas.width / this.columns;
	this.cellHeight = this.canvas.height / this.rows;
}
Game.prototype.draw = function() {
	var ctx = this.context;
	var cellWidth = this.cellWidth;
	var cellHeight = this.cellHeight;
	this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
	this.grid.space.forEach(function(row, i) {
		row.forEach(function(cell, j) {
			ctx.beginPath();
			ctx.rect(i*cellWidth, j*cellHeight, cellWidth, cellHeight);
			ctx.strokeStyle = "#ccc";
			ctx.stroke();
			if(cell.state) {
				var red = numberToPaddedHex(Math.floor(cell.rgb[0]));
				var green = numberToPaddedHex(Math.floor(cell.rgb[1]));
				var blue = numberToPaddedHex(Math.floor(cell.rgb[2]));
				var fill = "#" + red + green + blue;
				ctx.fillStyle = fill;
				if (ctx.fillStyle != fill)
					throw ("Fillstyle is changed from " + fill + " to " + ctx.fillStyle);
				ctx.fill();
			}
			ctx.closePath();
		});
	});
}
Game.prototype.setGrid = function() {
	for (var i=0; i < this.grid.columns; i++) {
		for (var j=0; j < this.grid.rows; j++)
			this.grid.set(new Vector(i, j), new Cell(new Vector(i, j)));
	}
	this.draw();
}
Game.prototype.turn = function() {
	eachCell(function(cell) {
		cell.getNeighbors();
	});
	this.grid.space.forEach(function(row, i) {
		row.forEach(function(cell, j) {
			this.grid.space[i][j].checkNeighbors();
		}, this);
	}, this);
	this.grid.space.forEach(function(row, i) {
		row.forEach(function(cell, j) {
			this.grid.space[i][j].state = this.grid.space[i][j].nextState;
			this.grid.space[i][j].rgb = this.grid.space[i][j].nextRgb;
		}, this);
	}, this);
}
function numberToPaddedHex(num) {
	var result = Number(num).toString(16);
	if (result.length < 2)
		result = "0" + result;
	return result;
}

function Vector(x, y) {
	this.x = x;
	this.y = y;
}
Vector.prototype.plus = function(other) {
	return new Vector(this.x + other.x, this.y + other.y);
}

function Grid(rows, columns) {
	this.space = (new Array(rows));
	for (var i=0; i < rows; i++)
		this.space[i] = (new Array(columns));
	this.columns = columns;
	this.rows = rows;
}
Grid.prototype.isInside = function(vector) {
  return vector.x >= 0 && vector.x < this.columns &&
         vector.y >= 0 && vector.y < this.rows;
};
Grid.prototype.get = function(vector) {
	return this.space[vector.x][vector.y];
};
Grid.prototype.set = function(vector, value) {
	this.space[vector.x][vector.y] = value;
};

var directions = {
  "n":  new Vector(0, -1),
  "ne": new Vector(1, -1),
  "e":  new Vector(1, 0),
  "se": new Vector(1, 1),
  "s":  new Vector(0, 1),
  "sw": new Vector(-1, 1),
  "w":  new Vector(-1, 0),
  "nw": new Vector(-1, -1)
};

function View(game, vector) {
	this.game = game;
	this.vector = vector;
}
View.prototype.look = function(dir) {
	var target = this.vector.plus(directions[dir]);
	if (this.game.grid.isInside(target))
		return this.game.grid.get(target);
	else
		return null;
}

function Cell(vector) {
	this.state = 0;
	this.nextState = 0;
	this.rgb = null;
	this.nextRgb = null;
	this.neighbors = [];
	this.vector = vector;
}
Cell.prototype.getNeighbors = function() {
	this.neighbors = [];
	var view = new View(game, this.vector);
	for (var dir in directions) {
		this.neighbors.push(view.look(dir));
	}
};
Cell.prototype.checkNeighbors = function() {
	var neighborCount = 0;
	var neighborColors = [];
	var edgeDeath = 0;
	for (var i = 0; i < this.neighbors.length; i++) {
		var neighbor = this.neighbors[i];
		if (neighbor == null) {
			this.nextRgb = null;
			this.nextState = 0;
			var edgeDeath = 1;
			break;
		} else if (neighbor.state) {
			neighborCount++;
			neighborColors.push(neighbor.rgb);
		}
	}
	if (!edgeDeath) {
		if (this.state == 0) {
			if (neighborCount == 3) {
				this.nextState = 1;
				this.nextRgb = this.parentsColor(neighborColors);
			}
		} else if (!(neighborCount == 2 || neighborCount ==3)) {
			this.nextState = 0;
			this.nextRgb = null;
		} else {
			this.nextState = 1;
			this.nextRgb = this.rgb;
		}
	}
};
Cell.prototype.colorRandom = function() {
	this.rgb = [randRgb(), randRgb(), randRgb()];
};
Cell.prototype.parentsColor = function(neighborColors) {
	var reds = [];
	var greens = [];
	var blues = [];
	neighborColors.forEach(function(color) {
		reds.push(color[0]);
		greens.push(color[1]);
		blues.push(color[2]);
	});
	var redSum = reds.reduce(function(sum, color) { return sum + color; }, 0);
	var greenSum = greens.reduce(function(sum, color) { return sum + color; }, 0);
	var blueSum = blues.reduce(function(sum, color) { return sum + color; }, 0);
	var redAvg = redSum / reds.length;
	var greenAvg = greenSum / greens.length;
	var blueAvg = blueSum / blues.length;
	var colorAvgs = [
		{ red: redAvg },
		{ green: greenAvg },
		{ blue: blueAvg }
	].sort(compareColors);
	colorAvgs[0][Object.keys(colorAvgs[0])[0]] =
		colorRecessive(colorAvgs[0][Object.keys(colorAvgs[0])[0]]);
	colorAvgs[1][Object.keys(colorAvgs[1])[0]] =
		colorMid(colorAvgs[1][Object.keys(colorAvgs[1])[0]]);
	colorAvgs[2][Object.keys(colorAvgs[2])[0]] =
		colorDominant(colorAvgs[2][Object.keys(colorAvgs[2])[0]]);
	var nextColors = new Array(3);
	colorAvgs.forEach(function(colorHash) {
		if (Object.keys(colorHash)[0] == 'red')
			nextColors[0] = colorHash[Object.keys(colorHash)[0]];
		else if (Object.keys(colorHash)[0] == 'green')
			nextColors[1] = colorHash[Object.keys(colorHash)[0]];
		else
			nextColors[2] = colorHash[Object.keys(colorHash)[0]];
	});
	return nextColors;
};
function compareColors(a, b) {
	var aColor = a[Object.keys(a)[0]];
	var bColor = b[Object.keys(b)[0]];
	if (aColor < bColor)
		return -1;
	if (aColor > bColor)
		return 1;
	return 0;
}
function colorRecessive(color) {
	if (color > game.recIntensity)
		color -= game.recIntensity;
	else
		color = 0;
	return color;
};
function colorMid(color) {
	var newColor = color;
	var change = Math.floor(Math.random() * game.midIntensity);
	if (Math.floor(Math.random() * 2))
		newColor += change;
	else
		newColor -= change;

	if (newColor <= 255 && newColor >= 0) {
		return newColor;
	} else
		return colorMid(color);
};
function colorDominant(color) {
	if (color < 255 - game.domIntensity)
		color += game.domIntensity;
	else
		color = 255;
	return color;
};
function randRgb() {
	return Math.floor((Math.random() * 255) + 1);
}

function eachCell(body) {
	for (var c = 0; c < game.columns; c++) {
		for (var r = 0; r < game.rows; r++) {
			var cell = game.grid.space[c][r];
			body(cell);
		}
	}
}


//* Run Program

var defaultOpts = {
	rows: 60,
	columns: 60,
	domIntensity: 2,
	recIntensity: 2,
	midIntensity: 50
}

var game = new Game('canvas', defaultOpts);
var autoStepping = true;
var timeInterval = 60;
game.setGrid();

// html button commands
function play() {
	autoStepping = true;
	var start = null;
	function autoStep() {
		if (start === null) start = Date.now();
		if (autoStepping && Date.now() - start > timeInterval) {
			step();
			start = null;
			requestAnimationFrame(autoStep);
		} else if (autoStepping)
			requestAnimationFrame(autoStep);
	}
	autoStep();
}
function stop() {
	autoStepping = false;
}
function step() {
	game.turn();
	game.draw();
}
function clearGrid() {
	game.setGrid();
	timeInterval = 60;
}
function slower() {
	timeInterval += 20;
}
function faster() {
	if (timeInterval > 0)
		timeInterval -= 20;
}

// Starting configurations
function random() {
	eachCell(function(cell) {
		if (Math.floor(Math.random() * 2)) {
			cell.state = 1;
			cell.colorRandom();
		}
	});
	game.draw();
}
function block() {
	var cells = [game.grid.space[game.columns/2 - 1][game.rows/2 - 1],
							 game.grid.space[game.columns/2][game.rows/2 - 1],
							 game.grid.space[game.columns/2 - 1][game.rows/2],
							 game.grid.space[game.columns/2][game.rows/2]];
	cells.forEach(function(cell) {
		cell.state = 1;
		cell.colorRandom();
	});
	game.draw();
}
function beehive() {
	var cells = [game.grid.space[game.columns/2 - 1][game.rows/2 - 2],
							 game.grid.space[game.columns/2][game.rows/2 - 2],
							 game.grid.space[game.columns/2 - 2][game.rows/2 - 1],
							 game.grid.space[game.columns/2 + 1][game.rows/2 - 1],
							 game.grid.space[game.columns/2 - 1][game.rows/2],
							 game.grid.space[game.columns/2][game.rows/2]];
	cells.forEach(function(cell) {
		cell.state = 1;
		cell.colorRandom();
	});
	game.draw();
}
function line() {
	for (var c = 0; c < game.columns; c++) {
		game.grid.space[c][Math.floor(game.rows/2)].state = 1;
		game.grid.space[c][Math.floor(game.rows/2)].colorRandom();
	}
	game.draw();
}
function rPentomino() {
	var cells = [game.grid.space[game.columns/2 - 1][game.rows/2 - 1],
							 game.grid.space[game.columns/2][game.rows/2 - 1],
							 game.grid.space[game.columns/2 - 1][game.rows/2],
							 game.grid.space[game.columns/2 - 2][game.rows/2],
							 game.grid.space[game.columns/2 - 1][game.rows/2 + 1]];
	cells.forEach(function(cell) {
		cell.state = 1;
		cell.colorRandom();
	});
	game.draw();
}
