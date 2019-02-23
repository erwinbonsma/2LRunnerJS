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

var maxRunSpeed = 20;
var unitRunSpeed = 6;

var programs = {
    Loop_5x5: { w: 5, h: 5, program: "*_*__o___*o____o*_o_o__*_" },
    BB_7x7_342959: { w: 7, h: 7, program: "_**____*oo__*___o**_*_*oooo**__oo_**_*o_o*o___o*_" },
    BB_7x7_1842682: { w: 7, h: 7, program: "__*_____*o__*__*oo__*__o**o_*_oooo**o**___oo*__*_" }
};

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
        if (this.maxBound - this.minBound < this.size) {
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
        if (this.maxBound - this.minBound < this.size) {
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
    this.ctx = this.canvas.getContext("2d");

    this.drawR = 12;
    this.drawSep = 32;
    this.ppR = 14;
}

ComputerViewer.prototype.getX = function(col) {
    return (col + 0.5) * this.drawSep;
}

ComputerViewer.prototype.getY = function(row) {
    return (this.computer.height - row - 0.5) * this.drawSep;
}

ComputerViewer.prototype.drawLine = function(x1, y1, x2, y2) {
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();
}

ComputerViewer.prototype.drawGridLine = function(col1, row1, col2, row2) {
    this.drawLine(this.getX(col1), this.getY(row1), this.getX(col2), this.getY(row2));
}

ComputerViewer.prototype.drawProgramPointer = function() {
    switch (this.computer.status) {
        case Status.ERROR: this.ctx.strokeStyle = "#FF0000"; break;
        case Status.RUNNING: this.ctx.strokeStyle = "#008000"; break;
        case Status.DONE: this.ctx.strokeStyle = "#008000"; break;
    }
    var x = this.getX(this.computer.pp.col);
    var y = this.getY(this.computer.pp.row);
    this.ctx.beginPath();
    this.ctx.rect(x - this.ppR, y - this.ppR, this.ppR * 2, this.ppR * 2);
    this.ctx.stroke();

    this.ctx.strokeStyle = "#D0D000";
    this.ctx.lineWidth = 3;
    switch (this.computer.pp.dir) {
        case Dir.UP: this.drawLine(x - this.ppR, y - this.ppR, x + this.ppR, y - this.ppR); break;
        case Dir.RIGHT: this.drawLine(x + this.ppR, y - this.ppR, x + this.ppR, y + this.ppR); break;
        case Dir.DOWN: this.drawLine(x - this.ppR, y + this.ppR, x + this.ppR, y + this.ppR); break;
        case Dir.LEFT: this.drawLine(x - this.ppR, y - this.ppR, x - this.ppR, y + this.ppR); break;
    }
    this.ctx.lineWidth = 1;
}

ComputerViewer.prototype.drawCircle = function(col, row, fillColor) {
    this.ctx.fillStyle = fillColor;
    this.ctx.strokeStyle = "#808080";

    this.ctx.beginPath();
    this.ctx.arc(this.getX(col), this.getY(row), this.drawR, 0, 2 * Math.PI);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();
}

ComputerViewer.prototype.drawGrid = function() {
    this.ctx.strokeStyle = "#404040";

    for (var col = 0; col < this.computer.width; col++) {
        this.drawGridLine(col, 0, col, this.computer.height - 1);
    }

    for (var row = 0; row < this.computer.height; row++) {
        this.drawGridLine(0, row, this.computer.width - 1, row);
    }
}

ComputerViewer.prototype.drawProgram = function() {
    for (var col = 0; col < this.computer.width; col++) {
        for (var row = 0; row < this.computer.height; row++) {
            var ins = this.computer.getInstruction(col, row);

            switch (ins) {
                case Instruction.DATA: this.drawCircle(col, row, "#FFFFFF"); break;
                case Instruction.TURN: this.drawCircle(col, row, "#000000"); break;
            }
        }
    }
}

ComputerViewer.prototype.draw = function() {
    // Clear canvas
    this.ctx.fillStyle = "#FFFFFF";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawGrid();
    this.drawProgram();
    if (this.computer.status != Status.READY) {
        this.drawProgramPointer();
    }
}

/**
 * @constructor
 */
function ComputerControl(model, viewer) {
    this.model = model;
    this.viewer = viewer;
    this._setRunSpeed(4);
    this._update();
}

ComputerControl.prototype._updateButtons = function() {
    var runnable = (this.model.status == Status.READY || this.model.status == Status.RUNNING);
    document.getElementById("reset-button").disabled = (this.model.status == Status.READY);
    document.getElementById("step-button").disabled = !runnable || this.playId;
    document.getElementById("play-button").disabled = !runnable || this.playId;
    document.getElementById("pause-button").disabled = !runnable || !this.playId;
    document.getElementById("slower-button").disabled = (this.runSpeed == 0);
    document.getElementById("faster-button").disabled = (this.runSpeed == maxRunSpeed);
}

ComputerControl.prototype._update = function() {
    this._updateButtons();
    this.viewer.draw();
}

ComputerControl.prototype.step = function() {
    this.model.step();
    this._update();
}

ComputerControl.prototype._playTick = function() {
    var numSteps = this.stepsPerTick;
    while (numSteps-- > 0) {
        this.model.step();
    }
    this._update();
}

ComputerControl.prototype.reset = function() {
    this.model.reset();
    this._update();
}

ComputerControl.prototype.play = function() {
    if (this.playId) {
        clearInterval(this.playId);
    }

    var me = this;
    this.playId = setInterval(function() { me._playTick() }, this.stepPeriod * 40);
}

ComputerControl.prototype.pause = function() {
    if (!this.playId) {
        return;
    }

    clearInterval(this.playId);
    this.playId = undefined;
    this._update();
}

ComputerControl.prototype._setRunSpeed = function(speed) {
    this.runSpeed = speed;
    if (speed == 0) {
        return;
    }

    if (speed < unitRunSpeed) {
        this.stepPeriod = 1 << (unitRunSpeed - speed);
        this.stepsPerTick = 1;
    } else {
        this.stepPeriod = 1;
        this.stepsPerTick = 1 << (speed - unitRunSpeed);
    }

    if (this.playId) {
        // Invoke again as schedule interval may have changed
        this.play();
    }
}

ComputerControl.prototype.changeRunSpeed = function(delta) {
    this._setRunSpeed(Math.min(maxRunSpeed, Math.max(0, this.runSpeed + delta)));
    this._update();
}

function init() {
    var program = programs.BB_7x7_342959;
    var computer = new Computer(program.w, program.h, 4096);
    computer.loadProgram(program.program);

    var computerViewer = new ComputerViewer(computer);

    return new ComputerControl(computer, computerViewer);
}

var computerControl = init();