const Instruction = {
    NOOP: 0,
    DATA: 1,
    TURN: 2,
    DONE: 3
};
const Dir = {
    UP: 0,
    RIGHT: 1,
    DOWN: 2,
    LEFT: 3
};
const Status = {
    READY: 0,
    RUNNING: 1,
    DONE: 2,
    ERROR: 3
};
const dx = [0, 1, 0, -1];
const dy = [1, 0, -1, 0];

const maxRunSpeed = 20;
const unitRunSpeed = 5;

const numHeatmapColors = 8;
const heatmapColors = [
    "#0000FF", "#6A00FF", "#D500FF", "#FF00BD", "#FF0052", "#FF1800", "#FF8300", "#FFFF00"
];

const fromBase64 = [
    62,  255, 62,  255, 63,  52,  53, 54, 55, 56, 57, 58, 59, 60, 61, 255,
    255, 0,   255, 255, 255, 255, 0,  1,  2,  3,  4,  5,  6,  7,  8,  9,
    10,  11,  12,  13,  14,  15,  16, 17, 18, 19, 20, 21, 22, 23, 24, 25,
    255, 255, 255, 255, 63,  255, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35,
    36,  37,  38,  39,  40,  41,  42, 43, 44, 45, 46, 47, 48, 49, 50, 51
];
const toBase64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

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
    this.minValue = 0;
    this.maxValue = 0;
    this.data = [];
    this.data[0] = 0;
    this.dp = 0;
    this.changeCount = 0;
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
    this.changeCount++;
    this.maxValue = Math.max(this.data[this.dp], this.maxValue);
}

Data.prototype.dec = function() {
    this.data[this.dp] -= 1;
    this.changeCount++;
    this.minValue = Math.min(this.data[this.dp], this.minValue);
}

Data.prototype.shr = function() {
    this.dp++;
    this.changeCount++;
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
    this.changeCount++;
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

PathTracker.prototype.colorForVisitCount = function(count) {
    var rank = this.rankForVisitCount(count);
    if (rank >= numHeatmapColors) {
        rank = numHeatmapColors - 1;
    }
    return heatmapColors[rank];
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

Program.prototype.isPositionValid = function(col, row) {
    return (col >= 0 && col < this.width && row >= 0 && row < this.height);
}

Program.prototype.getInstruction = function(col, row) {
    if (this.isPositionValid(col, row)) {
        return this.instructions[col][row];
    } else {
        return Instruction.DONE;
    }
}

Program.prototype.setInstruction = function(col, row, ins) {
    if (this.isPositionValid(col, row)) {
        this.instructions[col][row] = ins;
    } else {
        console.warn("Instruction out of bounds");
    }
}

Program.prototype.dump = function() {
    s = ""
    for (var row = this.height - 1; row >= 0; --row) {
        for (var col = 0; col < this.width; ++col) {
            if (col > 0) s += " ";
            switch (this.getInstruction(col, row)) {
                case Instruction.NOOP: s += "_"; break;
                case Instruction.DATA: s += "o"; break;
                case Instruction.TURN: s += "*"; break;
                default: s += "?";
            }
        }
        s += "\n";
    }
    console.info(s);
}

function loadProgramFromWebString(programString) {
    var size = Math.round(Math.sqrt(programString.length));

    if (size * size != programString.length) {
        console.log("Web programs must be square");
        return;
    }

    var program = new Program(size, size);
    var col = 0, row = size - 1;
    var i = 0;

    while (i < programString.length) {
        var ins = Instruction.NOOP; // Default
        switch (programString[i++]) {
            case '_': ins = Instruction.NOOP; break;
            case 'o': ins = Instruction.DATA; break;
            case '*': ins = Instruction.TURN; break;
            default: console.warn("Invalid character in program string");
        }
        program.setInstruction(col++, row, ins);
        if (col == size) {
            col = 0;
            row--;
        }
    }

    return program;
}

function loadProgramFromBase27String(programString) {
    const w = parseInt(programString.substring(0, 1));
    const h = parseInt(programString.substring(1, 2));

    var program = new Program(w, h);

    var col = 0, row = h - 1;
    var i = 2;
    var v = [];

    while (row >= 0) {
        if (v.length == 0) {
            if (i == programString.length) {
                console.error("Program string too short");
                return
            }

            var ch = programString[i++];
            var val = ch == '_' ? 0 : (ch.charCodeAt(0) - 97) + 1;
            while (v.length < 3) {
                v.push(val % 3);
                val = Math.floor(val / 3);
            }
        }

        program.setInstruction(col, row, v.pop());

        if (++col == w) {
            col = 0;
            row -= 1;
        }
    }

    return program;
}

function b64_decode(s) {
    var out = [];
    var val = 0, bits = 0;

    for (let c of s) {
        if (c < '+' || c > 'z') break;
        const ci = c.charCodeAt(0) - '+'.charCodeAt(0);
        if (fromBase64[ci] >= 64) break;
        val = (val << 6) + fromBase64[ci];
        bits += 6;
        if (bits >= 8) {
            out.push((val >> (bits - 8)) & 0xFF);
            bits -= 8;
        }
    }

    if (bits > 0) {
        out.push((val << (8 - bits)) & 0xFF);
    }

    return out;
}

function loadProgramFromBase64String(programString) {
    const bytes = b64_decode(programString);
    const w = bytes[0] >> 4;
    const h = bytes[0] % 16;

    var col = 0, row = h - 1;
    var program = new Program(w, h);

    var p = 1, shift = 6;
    var byte = bytes[p];

    while (row >= 0) {
        program.setInstruction(col, row, (byte >> shift) & 0x3);

        if (++col == w) {
            --row;
            col = 0;
        }

        if (shift == 0) {
            shift = 6;
            byte = bytes[++p];
        } else {
            shift -= 2;
        }
    }

    return program;
}

function base64StringForProgram(program) {
    var val = program.width * 16 + program.height;
    var bits = 2;
    var s = toBase64[(val >> bits) & 0x3f];

    for (var row = program.height; --row >= 0; ) {
        for (var col = 0; col < program.width; col++) {
            val = (val << 2) | program.getInstruction(col, row);
            bits += 2;

            if (bits >= 6) {
                bits -= 6;
                s += toBase64[(val >> bits) & 0x3f];
            }
        }
    }

    if (bits > 0) {
        s += toBase64[(val << (6 - bits)) & 0x3f];
    }

    return s;
}

/**
 * @constructor
 */
function Computer(datasize, program) {
    this.program = program;

    this.data = new Data(datasize);
    this.pathTracker = new PathTracker(program.width, program.height);
    this.cursor = new Cursor();

    this.reset();
}

Computer.prototype.reset = function() {
    this.data.reset();
    this.pp = new ProgramPointer();
    this.status = Status.READY;
    this.numSteps = 0;
    this.pathTracker.reset();
}

Computer.prototype.step = function() {
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

        instruction = this.program.getInstruction(col, row);
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

    this.ctx.font = "14px Arial";
    this.valueSep = 6;

    this.desiredCenterAddress = 0;
    this.deltaToDesired = 0;

    this.frozen = false;
}

DataViewer.prototype.freeze = function() {
    this.frozen = true;
}

DataViewer.prototype.defrost = function() {
    this.frozen = false;
}

DataViewer.prototype._setColor = function(activeValue) {
    var style = activeValue ? "#000000" : "#B0B0B0";
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
    if (this.data.dp != this.desiredCenterAddress) {
        this._adjustDeltaToDesired(this.data.dp);
    }
    else if (Math.abs(this.deltaToDesired) > 0.2) {
        if (!this.frozen) {
            this.deltaToDesired = (this.deltaToDesired * 4) / 5;
        }
    }
    else if (this.data.changeCount == this.prevChangeCount) {
        // Nothing has changed. No need to redraw.
        return;
    }
    this.prevChangeCount = this.data.changeCount;

    // Clear canvas
    this.ctx.fillStyle = "#FFFFFF";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);


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
function ProgramViewer(computer) {
    this.computer = computer;

    this.canvas = document.getElementById("programCanvas");
    this.ctx = this.canvas.getContext("2d");

    this.calculateScale();
}

ProgramViewer.prototype.calculateScale = function() {
    const program = this.computer.program;
    var hsep = this.canvas.width / (program.width + 1);
    var vsep = this.canvas.height / (program.height + 1);

    this.drawSep = (hsep < vsep) ? hsep : vsep;
    this.drawR = 0.4 * this.drawSep;
    this.ppR = 0.25 * this.drawSep;
    this.ppW = 1.0 * this.ppR;
}

ProgramViewer.prototype.getX = function(col) {
    const program = this.computer.program;
    if (col < 0) {
        return 0.4 * this.drawSep;
    }
    else if (col >= program.width) {
        return (program.width + 0.6) * this.drawSep;
    }
    else {
        return (col + 1) * this.drawSep;
    }
}

ProgramViewer.prototype.getY = function(row) {
    const program = this.computer.program;
    if (row < 0) {
        return (program.height + 0.6) * this.drawSep;
    }
    else if (row >= program.height) {
        return 0.4 * this.drawSep;
    }
    else {
        return (program.height - row) * this.drawSep;
    }
}

ProgramViewer.prototype.getCol = function(x) {
    return Math.round(x / this.drawSep) - 1;
}

ProgramViewer.prototype.getRow = function(y) {
    return this.computer.program.height - Math.round(y / this.drawSep);
}

ProgramViewer.prototype.drawLine = function(x1, y1, x2, y2) {
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();
}

ProgramViewer.prototype.drawGridLine = function(col1, row1, col2, row2) {
    this.drawLine(this.getX(col1), this.getY(row1), this.getX(col2), this.getY(row2));
}

ProgramViewer.prototype.drawProgramPointer = function() {
    switch (this.computer.status) {
        case Status.ERROR: this.ctx.fillStyle = "#FF0000"; break;
        case Status.RUNNING: this.ctx.fillStyle = "#404040"; break;
        case Status.DONE: this.ctx.fillStyle = "#808080"; break;
    }
    this.ctx.strokeStyle = "#000000";

    var x = this.getX(this.computer.pp.col);
    var y = this.getY(this.computer.pp.row);

    this.ctx.save();

    this.ctx.translate(x, y);
    this.ctx.rotate(0.5 * Math.PI * this.computer.pp.dir);
    this.ctx.translate(0, -0.2 * this.ppR);

    this.ctx.beginPath();
    this.ctx.moveTo(0, -this.ppR);
    this.ctx.lineTo(-this.ppW, this.ppR);
    this.ctx.lineTo( this.ppW, this.ppR);
    this.ctx.lineTo(0, -this.ppR);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.restore();
}

ProgramViewer.prototype.drawCircle = function(col, row, fillColor) {
    this.ctx.fillStyle = fillColor;
    this.ctx.strokeStyle = "#404040";

    this.ctx.beginPath();
    this.ctx.arc(this.getX(col), this.getY(row), this.drawR, 0, 2 * Math.PI);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();
}

ProgramViewer.prototype.drawGrid = function() {
    this.ctx.lineWidth = 1
    this.ctx.strokeStyle = "#808080";

    const program = this.computer.program;
    for (var col = 0; col < program.width; col++) {
        this.drawGridLine(col, 0, col, program.height - 1);
    }

    for (var row = 0; row < program.height; row++) {
        this.drawGridLine(0, row, program.width - 1, row);
    }

    this.ctx.lineWidth = 1;
}

ProgramViewer.prototype.drawPaths = function() {
    var tracker = this.computer.pathTracker;
    var count;

    this.ctx.lineWidth = 4;
    this.ctx.lineCap = "round";

    const program = this.computer.program;
    for (var x = 0; x < program.width; x++) {
        for (var y = 0; y < program.height; y++) {
            if (x < program.width - 1) {
                count = tracker.getHorizontalVisitCount(x, y);
                if (count > 0) {
                    this.ctx.strokeStyle = tracker.colorForVisitCount(count);
                    this.drawGridLine(x, y, x + 1, y);
                }
            }
            if (y < program.height - 1) {
                count = tracker.getVerticalVisitCount(x, y);
                if (count > 0) {
                    this.ctx.strokeStyle = tracker.colorForVisitCount(count);
                    this.drawGridLine(x, y, x, y + 1);
                }
            }
        }
    }

    this.ctx.lineWidth = 1;
    this.ctx.lineCap = "butt";
}

ProgramViewer.prototype.drawProgram = function() {
    const program = this.computer.program;
    for (var col = 0; col < program.width; col++) {
        for (var row = 0; row < program.height; row++) {
            var ins = program.getInstruction(col, row);

            switch (ins) {
                case Instruction.DATA: this.drawCircle(col, row, "#FFFFFF"); break;
                case Instruction.TURN: this.drawCircle(col, row, "#000000"); break;
            }
        }
    }
}

ProgramViewer.prototype.drawNumSteps = function() {
    this.ctx.font = "12px Arial";
    this.ctx.fillStyle = "#000000";
    var s = this.computer.numSteps;
    var w = this.ctx.measureText(s).width;
    this.ctx.fillText(s, this.canvas.width - w, this.canvas.height);
}

ProgramViewer.prototype.drawCursor = function() {
    const x = this.getX(this.computer.cursor.col);
    const y = this.getY(this.computer.cursor.row);
    this.ctx.fillStyle = "#FF0000";
    this.ctx.fillRect(x - 3, y - 3, 6, 6);
}

ProgramViewer.prototype.draw = function() {
    const editing = this.computer.cursor.enabled;

    if (!editing && this.computer.numSteps == this.prevDrawSteps) {
        // Nothing has changed. No need to redraw.
        return;
    }

    // Clear canvas
    this.ctx.fillStyle = "#FFFFFF";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawGrid();
    this.drawPaths();
    this.drawProgram();
    if (editing) {
        this.drawCursor();
        this.prevDrawSteps = -1;
    } else {
        if (this.computer.status != Status.READY) {
            this.drawProgramPointer();
            this.drawNumSteps();
        }
        this.prevDrawSteps = this.computer.numSteps;
    }
}

/**
 * @constructor
 */
function Cursor() {
    this.col = 0;
    this.row = 0;
    this.enabled = false;
}

function CursorControl(model, program, programViewer) {
    this.model = model;
    this.program = program;
    this.programViewer = programViewer;

    const me = this;
    document.addEventListener("keydown", function(event) {
        me._handleKeyEvent(event);
    });
    document.addEventListener("click", function(event) {
        me._handleClickEvent(event);
    });
}

CursorControl.prototype._changeInstruction = function(col, row) {
    const ins = this.program.getInstruction(col, row);
    this.program.setInstruction(col, row, (ins + 1) % 3);

    console.log(base64StringForProgram(this.program));
}

CursorControl.prototype._handleKeyEvent = function(event) {
    if (!this.model.enabled) return;

    const w = this.program.width;
    const h = this.program.height;
    const cursor = this.model;
    if (event.code == "ArrowRight") {
        cursor.col = (cursor.col + 1) % w;
    }
    if (event.code == "ArrowLeft") {
        cursor.col = (cursor.col + w - 1) % w;
    }
    if (event.code == "ArrowUp") {
        cursor.row = (cursor.row + 1) % h;
    }
    if (event.code == "ArrowDown") {
        cursor.row = (cursor.row + h - 1) % h;
    }
    if (event.code == "Space") {
        this._changeInstruction(cursor.col, cursor.row);
    }
}

CursorControl.prototype._handleClickEvent = function(event) {
    if (!this.model.enabled) return;

    const rect = this.programViewer.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const col = this.programViewer.getCol(x);
    const row = this.programViewer.getRow(y);
    console.log(`x,y=${x},${y} => ${col},${row}`);

    if (this.program.isPositionValid(col, row)) {
        this._changeInstruction(col, row);
    }
}

/**
 * @constructor
 */
function ComputerControl(model) {
    this.model = model;
    this.programViewer = new ProgramViewer(model);
    this.dataViewer = new DataViewer(model.data);
    this.cursorControl = new CursorControl(model.cursor, model.program, this.programViewer);
    this.paused = true;
    this.numUpdatesSinceLastPlay = 0;

    this._setRunSpeed(4);
    document.getElementById("speed-slider").value = this.runSpeed;

    const me = this;
    this.updateId = setInterval(function() { me._update() }, 40);

    this._handleDataViewerDrags();
}

ComputerControl.prototype._handleDataViewerDrags = function() {
    const me = this;
    const canvas = this.dataViewer.canvas;

    canvas.onmousedown = function(event) {
        if (!me.paused) {
            return; // Can only drag when the program is paused
        }

        function onMouseMove(event) {
            me.dataViewer.deltaToDesired += event.movementX;
        }

        function abortDrag() {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", abortDrag);
            me.dataViewer.defrost();
        }

        me.dataViewer.freeze();
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", abortDrag);
    }
}

ComputerControl.prototype._updateButtons = function() {
    var runnable = (this.model.status == Status.READY || this.model.status == Status.RUNNING);
    const editing = this.model.cursor.enabled;
    document.getElementById("reset-button").disabled = editing || (this.model.status == Status.READY);
    document.getElementById("step-button").disabled = editing || !runnable || !this.paused;
    document.getElementById("play-button").disabled = editing || !runnable || !this.paused;
    document.getElementById("pause-button").disabled = editing || this.paused;
    document.getElementById("edit-button").disabled = (this.model.status == Status.RUNNING) && !this.paused;
}

ComputerControl.prototype._update = function() {
    this._updateButtons();
    this.programViewer.draw();
    this.dataViewer.draw();

    if (!this.paused) {
        if (++this.numUpdatesSinceLastPlay >= this.playPeriod) {
            this._playTick();
            this.numUpdatesSinceLastPlay = 0;
        }
    }
}

ComputerControl.prototype._postStep = function() {
    this.model.pathTracker.rankVisitCounts();

    if (this.model.status != Status.RUNNING) {
        this.paused = true;
        const data = this.model.data;
        console.log(
            `steps = ${this.model.numSteps}, ` +
            `minValue = ${data.minValue}, ` +
            `maxValue = ${data.maxValue}, ` +
            `dataSize = ${data.maxBound - data.minBound + 1}`
        );
    }
}

ComputerControl.prototype.step = function() {
    this.model.step();
    this._postStep();
}

ComputerControl.prototype._playTick = function() {
    var numSteps = this.stepsPerPlay;
    while (numSteps-- > 0) {
        this.model.step();
    }
    this._postStep();
}

ComputerControl.prototype.reset = function() {
    this.model.reset();
    this.paused = true;
}

ComputerControl.prototype.play = function() {
    this.paused = false;
}

ComputerControl.prototype.edit = function() {
    this.model.cursor.enabled = !this.model.cursor.enabled;
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
}

ComputerControl.prototype.updateRunSpeed = function() {
    this._setRunSpeed(document.getElementById("speed-slider").value);
}

ComputerControl.prototype.dump = function() {
    console.log("data = " + this.model.data.toString());
    this.model.pathTracker.dump();
}

function init() {
    const urlParams = new URLSearchParams(window.location.search);

    var program;

    const programString = urlParams.get('p');
    if (programString) {
        if (programString.includes("*")) {
            console.info("Loading from web string");
            program = loadProgramFromWebString(programString);
        } else {
            console.info("Loading from base-64 string")
            program = loadProgramFromBase64String(programString);
        }
    } else {
        const sizeString = urlParams.get('s');
        if (sizeString.includes("x")) {
            const sizes = sizeString.split('x');
            const w = parseInt(sizes[0]);
            const h = parseInt(sizes[1]);
            program = new Program(w, h);
        } else {
            const size = parseInt(urlParams.get('s')) || 9;
            program = new Program(size, size);
        }
    }

    program.dump();

    var computer = new Computer(8192, program);

    return new ComputerControl(computer);
}

// In case URLSearchParams function does not exist (e.g. Edge browsers), provide custom one.
// Implementation taken from:
// https://stackoverflow.com/questions/45758837/script5009-urlsearchparams-is-undefined-in-ie-11
(function (w) {
    w.URLSearchParams = w.URLSearchParams || function (searchString) {
        var self = this;
        self.searchString = searchString;
        self.get = function (name) {
            var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(self.searchString);
            if (results == null) {
                return null;
            }
            else {
                return decodeURI(results[1]) || 0;
            }
        };
    }
})(window)

var computerControl = init();

// Export settings needed by the HTML page (so that they remain accessible after minification)
window["computerControl"] = computerControl;
ComputerControl.prototype["step"] = ComputerControl.prototype.step;
ComputerControl.prototype["play"] = ComputerControl.prototype.play;
ComputerControl.prototype["edit"] = ComputerControl.prototype.edit;
ComputerControl.prototype["pause"] = ComputerControl.prototype.pause;
ComputerControl.prototype["reset"] = ComputerControl.prototype.reset;
ComputerControl.prototype["updateRunSpeed"] = ComputerControl.prototype.updateRunSpeed;
