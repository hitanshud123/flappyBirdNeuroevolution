let bird;
let loaded = false;
let pipes = [];

const screenH = 500;
const screenW = 500;

let cycles = 1;

let score = 0;
let highScore = 0;
function setup() {
    let canvas = createCanvas(screenH, screenW);
    canvas.parent('canvas');
}

function draw() {
    if (loaded) {
        for (let c = 0; c < cycles; c++) {
            if (pipes[pipes.length - 1].x < 200) {
                pipes.push(new Pipe());
            }
        
            for (let i = pipes.length-1; i >= 0 ; i--) {
                if (pipes[i].x + pipes[i].width < bird.x - bird.width/2) {
                    if (!pipes[i].passed) {
                        score++;
                        document.querySelector(".score").innerHTML = "Score: " + score;
                        pipes[i].passed = true;
                    }
                }
                
                if (pipes[i].offScreen()) {
                    pipes.splice(i,1);
                }
                pipes[i].update();
        
                if (bird.touches(pipes[i]) || bird.offScreen()) {
                    console.log('hit');
                    pipes = [];
                    pipes.push(new Pipe());
                    if (score > highScore) {
                        highScore = score;
                    }
                    score = 0;
                    document.querySelector(".score").innerHTML = "Score: " + score;
                    document.querySelector(".highScore").innerHTML = "High Score: " + highScore;
                }
            }
        
            bird.think();
            bird.update();
            
        }
        background(0);
        for(let pipe of pipes) {
            pipe.show()
        }
        bird.show();  
    }
}

function keyPressed() {
    if (key == ' ') {
        for (let bird of birds) {
            bird.fly();
        }
    } else if (key == 'U') {
        speed();
    } else if (key == 'D') {
        slow();
    } else if (key == 'L') {
        loadBird();
    }
}

function speed() {
    cycles += 5;
    if (cycles > 50) {cycles = 100}
}
function slow() {
    cycles -= 5;
    if (cycles > 50) {cycles = 46}
    if (cycles < 0) {cycles = -4}
}
function loadBird(dir) {
    Bird.loadBird(dir);
    pipes = []
    pipes.push(new Pipe());
}

class Pipe {
    constructor() {
        this.width = 75;
        this.gap = random(100, 125)
        this.height = random(25, screenW - 150);
        this.x = screenW;
        this.passed = false;
    }
    show() {
        fill(255);
        rect(this.x, 0, this.width, this.height);
        fill(255);
        rect(this.x, this.height + this.gap, this.width, screenH - this.height - this.gap);
    }
    update() {
        this.x -= 2;
    }
    offScreen() {
        if (this.x + this.width < 0) {
            return true;
        }
        return false;
    }
}


class Bird {
    constructor(loadedObj) {
        this.width = loadedObj.width;
        this.height = loadedObj.height;
        this.x = loadedObj.x;
        this.y = screenH / 2;

        this.gravity = loadedObj.gravity;
        this.jump = loadedObj.jump;
        this.velocity = loadedObj.velocity;

        this.score = 0;
        this.normScore = 0;

        this.brain = new NeuralNetwork(loadedObj.brain);
    }
    
    show() {
        fill(255, 150);
        ellipse(this.x, this.y, this.width, this.height);
    }
    think() {

        let closest;
        let closestD = Infinity;
        let d;
        for (let i = 0; i < pipes.length; i++) {
            d = pipes[i].x + pipes[i].width - (this.x - this.width/2);
            if (d < closestD && d > 0)  {
                closest = pipes[0];
                closestD = d;
            }
        }
        let inputs = [];
        inputs[0] = this.y / screenH;
        inputs[1] = closest.height / screenH;
        inputs[2] = (closest.height + closest.gap) / screenH;
        inputs[3] = closest.x / screenW;
        inputs[4] = this.velocity / 10;
        let output = this.brain.predict(inputs)
        if (output[0] > output[1]) {
            this.fly();
        }
    }
    fly() {
        this.velocity -= this.jump;
    }

    touches(pipe) {
        if (collideRectCircle(pipe.x, 0, pipe.width, pipe.height, this.x, this.y, this.width)) {
            return true;
        }
        if (collideRectCircle(pipe.x, pipe.height + pipe.gap, pipe.width, screenH - pipe.height - pipe.gap, this.x, this.y, this.width)) {
            return true;
        }
        return false;
    }

    offScreen () {
        if (this.y + this.height/2 > screenH) {
            return true;
        }

        if (this.y - this.height/2 < 0) {
            return true;
        }

        return false;
    }

    update() {
        this.velocity += this.gravity;
        this.velocity *= 0.95;
        this.y += this.velocity;
        this.score++;       
    }

    static loadBird(dir='birds/evolvedBird.json') {
        loadJSON(dir, Bird.fromObj);
    }

    static fromObj(obj) {
        bird = new Bird(obj);
        console.log(bird);
        loaded = true;
    }
}

function sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
}

class NeuralNetwork {
    constructor(brainObj) {
        this.inputNodes = brainObj.inputNodes;
        this.hiddenNodes = brainObj.hiddenNodes;
        this.outputNodes = brainObj.outputNodes;        

        this.weightsIH = new Matrix(this.hiddenNodes, this.inputNodes);
        this.weightsIH.data = brainObj.weightsIH.data;
        this.weightsHO = new Matrix(this.outputNodes, this.hiddenNodes);
        this.weightsHO.data = brainObj.weightsHO.data;

        this.biasIH = new Matrix(this.hiddenNodes, 1);
        this.biasIH.data = brainObj.biasIH.data;
        this.biasHO = new Matrix(this.outputNodes, 1);
        this.biasHO.data = brainObj.biasHO.data;
    }

    predict(input_array) {
        let inputs = Matrix.fromArray(input_array);

        let hidden = Matrix.matrixMult(this.weightsIH, inputs);
        hidden.elementwiseAdd(this.biasIH);
        hidden.map(sigmoid);

        let outputs = Matrix.matrixMult(this.weightsHO, hidden);
        outputs.elementwiseAdd(this.biasHO);
        outputs.map(sigmoid);

        return Matrix.toArray(outputs);
        // return output;

    }
}

class Matrix {
    constructor(rows, cols) {
        this.rows = rows;
        this.cols = cols;
        this.data = []
        
        for (let i = 0; i < this.rows; i++) {
            this.data[i] = [];
            for (let j = 0; j < this.cols; j++) {
                this.data[i][j] = 0;
            }
        }
    }

    elementwiseAdd(n) {
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                this.data[i][j] += n.data[i][j];
            }
        }
    }

    map(func) {
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                this.data[i][j] = func(this.data[i][j]);
            }
        }
    }

    static matrixMult(m1, m2) {
        if (m1.cols != m2.rows) {
            return undefined;
        }
        let product = new Matrix(m1.rows, m2.cols);
        for (let i = 0; i < m1.rows; i++) {
            for (let j = 0; j <  m2.cols; j++) {
                for (let k = 0; k < m1.cols; k++) {
                    product.data[i][j] += m1.data[i][k]*m2.data[k][j];
                }
            }
        }
        return product;
    }

    static fromArray(array) {
        let m = new Matrix(array.length,1);
        for (let i = 0; i < array.length; i++) {
            m.data[i][0] = array[i];

        }
        return m;
    }

    static toArray(m) {
        let arr = []
        for (let i = 0; i < m.rows; i++) {
            for (let j = 0; j < m.cols; j++) {
                arr.push(m.data[i][j]);
            }
        }
        return arr;
    }
}
