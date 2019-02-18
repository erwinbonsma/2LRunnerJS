var Instruction = {
    NOOP: 0,
    DATA: 1,
    TURN: 2,
    DONE: 3
};

/**
 * @constructor
 */
function Program(width, height) {
    this.width = width;
    this.height = height;

    this.instructions = [];
    for (var col = 0; col < width; col++) {
        this.instructions[col] = []
        for (var row = 0; row < height; row++) {
            this.instructions[col][row] = Instruction.NOOP;
        }
    }
}

Program.prototype.load = function(programString) {
    var col = 0, row = 0;
    var i = 0;

    if (programString.length != this.width * this.height) {
        console.log("Program string length invalid");
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
        this.instructions[col++][row] = ins;
        if (col == this.width) {
            col = 0;
            row++;
        }
    }

    console.log("Program loaded");
}

Program.prototype.getInstruction = function(col, row) {
    if (col < 0 || col >= this.width || row < 0 || row >= this.height) {
        return Instruction.DONE;
    } else {
        return this.instructions[col][row];
    }
}

/**
 * @constructor
 */
function ProgramViewer(program) {
    this.program = program;

    this.canvas = document.getElementById("programCanvas");

    this.drawR = 20;
    this.drawSep = 50;
}

ProgramViewer.prototype.getX = function(col) {
    return (col + 0.5) * this.drawSep;
}

ProgramViewer.prototype.getY = function(row) {
    return (row + 0.5) * this.drawSep;
}

ProgramViewer.prototype.drawLine = function(ctx, col1, row1, col2, row2) {
    ctx.beginPath();
    ctx.moveTo(this.getX(col1), this.getY(row1));
    ctx.lineTo(this.getX(col2), this.getY(row2));
    ctx.stroke();
}

ProgramViewer.prototype.drawCircle = function(ctx, col, row, fillColor) {
    ctx.fillStyle = fillColor;
    ctx.strokeStyle = "#808080";

    ctx.beginPath();
    ctx.arc(this.getX(col), this.getY(row), this.drawR, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}

ProgramViewer.prototype.drawGrid = function(ctx) {
    ctx.strokeStyle = "#404040";

    for (var col = 0; col < this.program.width; col++) {
        this.drawLine(ctx, col, 0, col, this.program.height - 1);
    }

    for (var row = 0; row < this.program.height; row++) {
        this.drawLine(ctx, 0, row, this.program.width - 1, row);
    }
}

ProgramViewer.prototype.drawProgram = function(ctx) {
    console.log("Drawing...")

    for (var col = 0; col < this.program.width; col++) {
        for (var row = 0; row < this.program.height; row++) {
            var ins = this.program.getInstruction(col, row);

            switch (ins) {
                case Instruction.DATA: this.drawCircle(ctx, col, row, "#FFFFFF"); break;
                case Instruction.TURN: this.drawCircle(ctx, col, row, "#000000"); break;
            }
        }
    }
}

ProgramViewer.prototype.draw = function() {
    var ctx = this.canvas.getContext("2d");

    // Clear canvas
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawGrid(ctx);
    this.drawProgram(ctx);
}

function init() {
    var program = new Program(5, 5);
    var programViewer = new ProgramViewer(program);

    program.load("*_*__o___*o____o*_o_o__*_");
    programViewer.draw();
}

init();