var Instruction = {
    NOOP: 0,
    DATA: 1,
    TURN: 2,
    DONE: 3
};
var Dir = {
    UP: 0,
    RIGHT: 1,
    DOWN: 2,
    LEFT: 3
};
var Status = {
    READY: 0,
    RUNNING: 1,
    DONE: 2,
    ERROR: 3
};
var dx = [0, 1, 0, -1];
var dy = [1, 0, -1, 0];

/**
 * @constructor
 */
function ProgramPointer() {
    this.col = 0;
    this.row = -1;
    this.dir = Dir.UP;
}

ProgramPointer.prototype.step = function() {
    this.col += dx[this.dir];
    this.row += dy[this.dir];
}

ProgramPointer.prototype.turnCounterClockwise = function() {
    this.dir = (this.dir + 3) % 4;
}

ProgramPointer.prototype.turnClockwise = function() {
    this.dir = (this.dir + 1) % 4;
}

ProgramPointer.prototype.toString = function() {
    return "[x = " + this.col + ", y = " + this.row + ", dir = " + this.dir + "]";
}

/**
 * @constructor
 */
function Data(size) {
    this.size = size;
    this.minBound = 0;
    this.maxBound = 0;
    this.data = [];
    this.data[0] = 0;
    this.dp = 0;
}

Data.prototype.value = function() {
    return this.data[this.dp];
}

Data.prototype.inc = function() {
    this.data[this.dp] += 1;
}

Data.prototype.dec= function() {
    this.data[this.dp] -= 1;
}

Data.prototype.shr = function() {
    this.dp++;
    if (this.dp > this.maxBound) {
        if (this.maxBound - this.minBound < size) {
            this.maxBound = this.dp;
            this.data[this.dp] = 0;
        } else {
            console.log("Data limit reached");
            return false;
        }
    }
    return true;
}

Data.prototype.shl = function() {
    this.dp--;
    if (this.dp < this.minBound) {
        if (this.maxBound - this.minBound < size) {
            this.minBound = this.dp;
            this.data[this.dp] = 0;
        } else {
            console.log("Data limit reached");
            return false;
        }
    }
    return true;
}

/**
 * @constructor
 */
function Computer(width, height, datasize) {
    this.width = width;
    this.height = height;
    this.datasize = datasize;

    this.program = [];
    for (var col = 0; col < width; col++) {
        this.program[col] = []
        for (var row = 0; row < height; row++) {
            this.program[col][row] = Instruction.NOOP;
        }
    }

    this.reset();
}

Computer.prototype.reset = function() {
    this.data = new Data(this.datasize);
    this.pp = new ProgramPointer();
    this.status = Status.READY;
    this.numSteps = 0;
}

Computer.prototype.loadProgram = function(programString) {
    var col = 0, row = this.height - 1;
    var i = 0;

    if (programString.length != this.width * this.height) {
        console.log("Computer string length invalid");
        return;
    }

    while (i < programString.length) {
        var ins = Instruction.NOOP; // Default
        switch (programString[i++]) {
            case '_': ins = Instruction.NOOP; break;
            case 'o': ins = Instruction.DATA; break;
            case '*': ins = Instruction.TURN; break;
            default: console.log("Invalid character in program string");
        }
        this.program[col++][row] = ins;
        if (col == this.width) {
            col = 0;
            row--;
        }
    }

    console.log("Program loaded");
}

Computer.prototype.getInstruction = function(col, row) {
    if (col < 0 || col >= this.width || row < 0 || row >= this.height) {
        return Instruction.DONE;
    } else {
        return this.program[col][row];
    }
}

Computer.prototype.step = function(col, row) {
    if (this.status == Status.READY) {
        this.status = Status.RUNNING;
    }
    if (this.status != Status.RUNNING) {
        return;
    }

    var col, row;
    var instruction;

    do {
        col = this.pp.col + dx[this.pp.dir];
        row = this.pp.row + dy[this.pp.dir];

        instruction = this.getInstruction(col, row);
        switch (instruction) {
            case Instruction.NOOP:
                break;
            case Instruction.DONE:
                this.status = Status.DONE;
                break;
            case Instruction.DATA:
                switch (this.pp.dir) {
                    case Dir.UP:
                        this.data.inc();
                        break;
                    case Dir.DOWN:
                        this.data.dec();
                        break;
                    case Dir.RIGHT:
                        if (!this.data.shr()) {
                            this.status = Status.ERROR;
                        }
                        break;
                    case Dir.LEFT:
                        if (!this.data.shl()) {
                            this.status = Status.ERROR;
                        }
                        break;
                }
                break;
            case Instruction.TURN:
                if (this.data.value() == 0) {
                    this.pp.turnCounterClockwise();
                } else {
                    this.pp.turnClockwise();
                }
                break;
        }
    } while (instruction == Instruction.TURN);

    this.pp.col = col;
    this.pp.row = row;
    this.numSteps++;
}

/**
 * @constructor
 */
function ComputerViewer(computer) {
    this.computer = computer;

    this.canvas = document.getElementById("programCanvas");

    this.drawR = 20;
    this.drawSep = 50;
    this.ppR = 24;
}

ComputerViewer.prototype.getX = function(col) {
    return (col + 0.5) * this.drawSep;
}

ComputerViewer.prototype.getY = function(row) {
    return (this.computer.height - row - 0.5) * this.drawSep;
}

ComputerViewer.prototype.drawLine = function(ctx, col1, row1, col2, row2) {
    ctx.beginPath();
    ctx.moveTo(this.getX(col1), this.getY(row1));
    ctx.lineTo(this.getX(col2), this.getY(row2));
    ctx.stroke();
}

ComputerViewer.prototype.drawProgramPointer = function(ctx) {
    ctx.strokeStyle = "#008000";
    var x = this.getX(this.computer.pp.col);
    var y = this.getY(this.computer.pp.row);
    ctx.rect(x - this.ppR, y - this.ppR, this.ppR * 2, this.ppR * 2);
    ctx.stroke();
}

ComputerViewer.prototype.drawCircle = function(ctx, col, row, fillColor) {
    ctx.fillStyle = fillColor;
    ctx.strokeStyle = "#808080";

    ctx.beginPath();
    ctx.arc(this.getX(col), this.getY(row), this.drawR, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}

ComputerViewer.prototype.drawGrid = function(ctx) {
    ctx.strokeStyle = "#404040";

    for (var col = 0; col < this.computer.width; col++) {
        this.drawLine(ctx, col, 0, col, this.computer.height - 1);
    }

    for (var row = 0; row < this.computer.height; row++) {
        this.drawLine(ctx, 0, row, this.computer.width - 1, row);
    }
}

ComputerViewer.prototype.drawProgram = function(ctx) {
    for (var col = 0; col < this.computer.width; col++) {
        for (var row = 0; row < this.computer.height; row++) {
            var ins = this.computer.getInstruction(col, row);

            switch (ins) {
                case Instruction.DATA: this.drawCircle(ctx, col, row, "#FFFFFF"); break;
                case Instruction.TURN: this.drawCircle(ctx, col, row, "#000000"); break;
            }
        }
    }
}

ComputerViewer.prototype.draw = function() {
    var ctx = this.canvas.getContext("2d");

    // Clear canvas
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawGrid(ctx);
    this.drawProgram(ctx);
    this.drawProgramPointer(ctx);
}

/**
 * @constructor
 */
function ComputerControl(model, viewer) {
    this.model = model;
    this.viewer = viewer;
}

ComputerControl.prototype.step = function() {
    this.model.step();
    this.viewer.draw();
}

ComputerControl.prototype.reset = function() {
    this.model.reset();
    this.viewer.draw();
}

function init() {
    var computer = new Computer(5, 5);
    var computerViewer = new ComputerViewer(computer);

    computer.loadProgram("*_*__o___*o____o*_o_o__*_");
    computerViewer.draw();

    return new ComputerControl(computer, computerViewer);
}

var computerControl = init();