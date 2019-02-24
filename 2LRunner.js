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
    this.reset();
}

Data.prototype.reset = function() {
    this.minBound = 0;
    this.maxBound = 0;
    this.data = [];
    this.data[0] = 0;
    this.dp = 0;
}

Data.prototype.value = function() {
    return this.data[this.dp];
}

Data.prototype.valueAt = function(index) {
    if (index < this.minBound || index > this.maxBound) {
        return 0;
    }
    return this.data[index];
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

Data.prototype.toString = function() {
    var s = "";
    var i = this.minBound;
    while (i <= this.maxBound) {
        if (s != "") {
            s += ",";
        }
        if (i == this.dp) {
            s += "[" + this.data[i] + "]";
        } else {
            s += this.data[i];
        }
        i++;
    }
    return s;
}

/**
 * @constructor
 */
function RangeBucket(value) {
    this.minRange = value;
    this.maxRange = value;
    this.count = 1;
}

/**
 * @constructor
 */
function PathTracker(width, height) {
    this.width = width;
    this.height = height;
    this.horizontalCounts = [];
    this.verticalCounts = [];
    
    for (var x = 0; x < width; x++) {
        this.horizontalCounts[x] = [];
        this.verticalCounts[x] = [];
    }
    
    this.reset();
}

PathTracker.prototype.reset = function() {
    for (var x = 0; x < this.width; x++) {
        for (var y = 0; y < this.height; y++) {
            this.horizontalCounts[x][y] = 0;
            this.verticalCounts[x][y] = 0;
        }
    }
}

// Invoke just before moving pp one step in current direction.
PathTracker.prototype.trackMoveStep = function(pp) {
    switch(pp.dir) {
        case Dir.UP: this.verticalCounts[pp.col][pp.row]++; break;
        case Dir.DOWN: this.verticalCounts[pp.col][pp.row - 1]++; break;
        case Dir.RIGHT: this.horizontalCounts[pp.col][pp.row]++; break;
        case Dir.LEFT: this.horizontalCounts[pp.col - 1][pp.row]++; break;
    }
}

PathTracker.prototype.getHorizontalVisitCount = function(x, y) {
    return this.horizontalCounts[x][y];
}

PathTracker.prototype.getVerticalVisitCount = function(x, y) {
    return this.verticalCounts[x][y];
}

PathTracker.prototype._registerVisitCount = function(count) {
    if (count == 0) {
        return;
    }

    var bucket = this.buckets;
    var prev = undefined;

    while (bucket && bucket.maxRange < count) {
        prev = bucket;
        bucket = bucket.next;
    }

    if (bucket && bucket.minRange <= count) {
        // Count falls inside existing bucket
        bucket.count += 1;
        return;
    }
    if (bucket && count == bucket.minRange - 1) {
        // Count falls inside existing bucket by expanding minRange by one
        bucket.count += 1;
        bucket.minRange = count;
        return;
    }
    if (bucket && count == bucket.maxRange + 1) {
        // Count falls inside existing bucket by expanding maxRange by one
        bucket.count += 1;
        bucket.maxRange = count;
        return;
    }

    // Need to create a new bucket
    var newBucket = new RangeBucket(count);
    this.numBuckets++;

    if (prev) {
        prev.next = newBucket;
    } else {
        this.buckets = newBucket;
    }
    newBucket.next = bucket;
}

PathTracker.prototype._collapseBuckets = function() {
    var bucket = this.buckets;
    var prev = undefined;

    while (bucket) {
        if (prev && bucket.minRange - prev.maxRange <= 1) {
            // Bucket ranges touch (or overlap), so join them
            prev.maxRange = bucket.maxRange;
            prev.count += bucket.count;
            prev.next = bucket.next;

            this.numBuckets--;
        } else {
            prev = bucket;
        }
        bucket = bucket.next;
    }
}

PathTracker.prototype.rankVisitCounts = function() {
    this.numBuckets = 0;
    this.buckets = undefined;

    for (var x = 0; x < this.width; x++) {
        for (var y = 0; y < this.height; y++) {
            this._registerVisitCount(this.horizontalCounts[x][y]);
            this._registerVisitCount(this.verticalCounts[x][y]);
        }
    }

    this._collapseBuckets();
}

PathTracker.prototype.rankForVisitCount = function(count) {
    var bucket = this.buckets;
    var rank = 0;

    while (bucket) {
        if (count >= bucket.minRange && count <= bucket.maxRange) {
            return rank;
        }
        rank++;
        bucket = bucket.next;
    }

    console.log("Did not find bucket for count = " + count);
}

PathTracker.prototype.dump = function() {
    var bucket = this.buckets;
    var s = "";
    while (bucket) {
        if (s.length > 0) {
            s += " ";
        }
        s += bucket.minRange + "-" + bucket.maxRange + "(" + bucket.count + ")";
        bucket = bucket.next;
    }
    console.log(s);
}

/**
 * @constructor
 */
function Computer(width, height, datasize) {
    this.width = width;
    this.height = height;
    this.data = new Data(datasize);
    this.pathTracker = new PathTracker(width, height);

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
    this.data.reset();
    this.pathTracker.reset();
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

    if (this.status != Status.DONE && this.numSteps > 0) {
        // Do not count first and last step, as they are out of bounds
        this.pathTracker.trackMoveStep(this.pp);
    }
    this.pp.col = col;
    this.pp.row = row;
    this.numSteps++;
}

/**
 * @constructor
 */
function DataViewer(data) {
    this.data = data;

    this.canvas = document.getElementById("dataCanvas");
    this.ctx = this.canvas.getContext("2d");

    this.ctx.font = "24px Arial";
    this.valueSep = 8;

    this.desiredCenterAddress = 0;
    this.deltaToDesired = 0;
}

DataViewer.prototype._setColor = function(activeValue) {
    var style = activeValue ? "#00FF00" : "#008000";
    this.ctx.strokeStyle = style;
    this.ctx.fillStyle = style;
}

DataViewer.prototype._widthOfValueAt = function(address) {
    return this.ctx.measureText(this.data.valueAt(address)).width;
}

DataViewer.prototype._adjustDeltaToDesired = function(newDesiredCenterAddress) {
    var delta = newDesiredCenterAddress > this.desiredCenterAddress ? 1 : -1;

    var shift = 0;
    var i = this.desiredCenterAddress;
    shift += this._widthOfValueAt(i) / 2;
    shift += this.valueSep;
    i += delta;

    // We may skip several addresses
    while (i != newDesiredCenterAddress) {
        shift += this._widthOfValueAt(i);
        shift += this.valueSep;
        i += delta;
    }

    shift += this._widthOfValueAt(i) / 2;

    this.deltaToDesired += delta * shift;
    this.desiredCenterAddress = newDesiredCenterAddress;
}

DataViewer.prototype._drawValues = function(x, i, inc) {
    var w = this.canvas.width;

    while ((inc < 0 && x >= 0) || (inc > 0 && x < w)) {
        var xdelta = this._widthOfValueAt(i) + this.valueSep;
        this._setColor(i == this.data.dp);
        if (inc < 0) {
            x -= xdelta;
        }
        this.ctx.fillText(this.data.valueAt(i), x, 20);
        if (inc > 0) {
            x += xdelta;
        }
        i += inc;
    }
}

DataViewer.prototype.draw = function() {
    // Clear canvas
    this.ctx.fillStyle = "#FFFFFF";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.data.dp != this.desiredCenterAddress) {
        this._adjustDeltaToDesired(this.data.dp);
    }
    else if (this.deltaToDesired != 0) {
        this.deltaToDesired = (this.deltaToDesired * 4) / 5;
    }

    var w = this._widthOfValueAt(this.desiredCenterAddress);
    var x = (this.canvas.width - w) / 2;
    
    if (this.deltaToDesired > this.canvas.width / 2) {
        this.deltaToDesired = this.canvas.width / 2;
    }
    else if (this.deltaToDesired < -this.canvas.width / 2) {
        this.deltaToDesired = -this.canvas.width / 2;
    }
    x += this.deltaToDesired;

    this._drawValues(x, this.data.dp, 1);
    this._drawValues(x, this.data.dp - 1, -1);
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

ComputerViewer.prototype.drawPaths = function() {
    var tracker = this.computer.pathTracker;
    var count;

    this.ctx.strokeStyle = "#0000FF";
    this.ctx.lineWidth = 3;
    
    for (var x = 0; x < this.computer.width; x++) {
        for (var y = 0; y < this.computer.height; y++) {
            if (x < this.computer.width - 1) {
                count = tracker.getHorizontalVisitCount(x, y);
                if (count > 0) {
                    this.drawGridLine(x, y, x + 1, y);
                }
            }
            if (y < this.computer.height - 1) {
                count = tracker.getVerticalVisitCount(x, y);
                if (count > 0) {
                    this.drawGridLine(x, y, x, y + 1);
                }
            }
        }
    }

    this.ctx.lineWidth = 1;
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
    this.drawPaths();
    this.drawProgram();
    if (this.computer.status != Status.READY) {
        this.drawProgramPointer();
    }
}

/**
 * @constructor
 */
function ComputerControl(model) {
    this.model = model;
    this.viewer = new ComputerViewer(model);
    this.dataViewer = new DataViewer(model.data);

    this.paused = true;
    this.numUpdatesSinceLastPlay = 0;

    this._setRunSpeed(4);

    var me = this;
    this.updateId = setInterval(function() { me._update() }, 40);
}

ComputerControl.prototype._updateButtons = function() {
    var runnable = (this.model.status == Status.READY || this.model.status == Status.RUNNING);
    document.getElementById("reset-button").disabled = (this.model.status == Status.READY);
    document.getElementById("step-button").disabled = !runnable || !this.paused;
    document.getElementById("play-button").disabled = !runnable || !this.paused;
    document.getElementById("pause-button").disabled = !runnable || this.paused;
    document.getElementById("slower-button").disabled = (this.runSpeed == 0);
    document.getElementById("faster-button").disabled = (this.runSpeed == maxRunSpeed);
}

ComputerControl.prototype._updateStatus = function() {
    document.getElementById("status").innerHTML = "Steps = " + this.model.numSteps;
}

ComputerControl.prototype._update = function() {
    this._updateButtons();
    this._updateStatus();
    this.viewer.draw();
    this.dataViewer.draw();

    if (!this.paused) {
        if (++this.numUpdatesSinceLastPlay >= this.playPeriod) {
            this._playTick();
            this.numUpdatesSinceLastPlay = 0;
        }
    }
}

ComputerControl.prototype.step = function() {
    this.model.step();
    this.model.pathTracker.rankVisitCounts();
}

ComputerControl.prototype._playTick = function() {
    var numSteps = this.stepsPerPlay;
    while (numSteps-- > 0) {
        this.model.step();
    }
    this.model.pathTracker.rankVisitCounts();
}

ComputerControl.prototype.reset = function() {
    this.model.reset();
}

ComputerControl.prototype.play = function() {
    this.paused = false;
}

ComputerControl.prototype.pause = function() {
    this.paused = true;
}

ComputerControl.prototype._setRunSpeed = function(speed) {
    this.runSpeed = speed;

    if (speed < unitRunSpeed) {
        this.playPeriod = 1 << (unitRunSpeed - speed);
        this.stepsPerPlay = 1;
    } else {
        this.playPeriod = 1;
        this.stepsPerPlay = 1 << (speed - unitRunSpeed);
    }
}

ComputerControl.prototype.changeRunSpeed = function(delta) {
    this._setRunSpeed(Math.min(maxRunSpeed, Math.max(0, this.runSpeed + delta)));
    this._update();
}

ComputerControl.prototype.dump = function() {
    console.log("data = " + this.model.data.toString());
    this.model.pathTracker.dump();
}

function init() {
    var program = programs.BB_7x7_1842682;
    var computer = new Computer(program.w, program.h, 4096);
    computer.loadProgram(program.program);

    return new ComputerControl(computer);
}

var computerControl = init();