const popSize = 1000;
let birds = [];
let savedBirds = [];
let bestBird = null; 
let pipes = [];
let save;

const screenH = 500;
const screenW = 500;

let cycles = 1;

let gen = 0; 
let currHighScore = 0;
let allTimeHighScore = 0;
function setup() {
    gen++;
    for (let i = 0; i < popSize; i++) {
        birds.push(new Bird);
    }
    bestBird = birds[0];
    pipes.push(new Pipe());
    let canvas = createCanvas(screenH, screenW)
    canvas.parent('canvas')
}

function draw() {
    for (let c = 0; c < cycles; c++) {
        if (pipes[pipes.length - 1].x < 200) {
            pipes.push(new Pipe());
        }
    
        for (let i = pipes.length-1; i >= 0 ; i--) {
            if (pipes[i].x + pipes[i].width < birds[0].x - birds[0].width/2) {
                if (!pipes[i].passed) {
                    currHighScore++;
                    document.querySelector(".currScore").innerHTML = "Current High Score: " + currHighScore;
                    pipes[i].passed = true;
                    if (currHighScore > allTimeHighScore) {
                        bestBird = birds[0];
                    }
                }
            }
            
            if (pipes[i].offScreen()) {
                pipes.splice(i,1);
            }
            pipes[i].update();
    
            for (let j = birds.length-1; j >= 0 ; j--) {
                if (birds[j].touches(pipes[i]) || birds[j].offScreen()) {
                    savedBirds.push(birds.splice(j,1)[0])
                }
            }

            if (birds.length == 0) {
                pipes = [];
                pipes.push(new Pipe());
                GA.nextGeneration();
                gen++;
                if (currHighScore > allTimeHighScore) {
                    allTimeHighScore = currHighScore;
                }
                currHighScore = 0;
                document.querySelector(".gen").innerHTML = "Generation: " + gen;
                document.querySelector(".currScore").innerHTML = "Current High Score: " + currHighScore;
                document.querySelector(".highScoe").innerHTML = "All Time High Score: " + allTimeHighScore;
            }   
            
        }
    
        for (let bird of birds) {
            bird.think();
            bird.update();
        }
    }
    background(0);
    for(let pipe of pipes) {
        pipe.show()
    }
    birdsShow = 100;
    if (birdsShow > birds.length) {
        birdsShow = birds.length;
    }
    for (let i = 0; i < birdsShow; i++) {
        birds[i].show();
    }
}

function keyPressed() {
    if (key == ' ') {
        for (let bird of birds) {
            bird.fly();
        }
    } else if (key == 'U') {
        speed();
        console.log(cycles);
    } else if (key == 'D') {
        slow();
        console.log(cycles);
    } else if (key == 'S') {
        saveBird();
    }
}

function speed() {
    if (cycles < 5) {
        cycles += 1;
    } else {
        cycles += 5;
    }
    if (cycles > 50) {cycles = 100}
}
function slow() {
    if (cycles < 6) {
        cycles -= 1;
    } else {
        cycles -= 5;
    }
    if (cycles > 50) {cycles = 50}
    if (cycles < 0) {cycles = 0}
}
function saveBird(dir) {
    save = bestBird.saveBird(dir);
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
    constructor(brain) {
        this.width = 35;
        this.height = 35;
        this.x = 50;
        this.y = screenH / 2;

        this.gravity = 0.6;
        this.jump = 15;
        this.velocity = 0;

        this.score = 0;
        this.normScore = 0;

        if (brain) {
            this.brain = brain.copy();
        } else {
            this.brain = new NeuralNetwork(5, 12, 2);
        }
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

    saveBird (dir='bird.json') {
        saveJSON(this, dir)
    }
}

class GA {
    static nextGeneration() {
        this.nomalize();
        for (let i = 0; i < popSize; i++) {
            birds[i] = this.pickOne();
        }
        savedBirds = [];
    }

    static pickOne() {
        let index = 0;
        let r = Math.random();
        while (r > 0) {
            r -= savedBirds[index].normScore;
            index++;
        }
        index--;

        let bird = savedBirds[index];
        let child = new Bird(bird.brain);
        child.brain.mutate(0.1);
        return child;
    }

    static nomalize() {
        let sum = 0;
        for (let bird of savedBirds) {
            sum += bird.score;
        }
        for (let bird of savedBirds) {
            bird.normScore = bird.score / sum;
        }
    }

    
}

function sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
}

class NeuralNetwork {
    constructor(inputNodes, hiddenNodes, outputNodes) {
        if(inputNodes instanceof NeuralNetwork) {
            this.inputNodes = inputNodes.inputNodes;
            this.hiddenNodes = inputNodes.hiddenNodes;
            this.outputNodes = inputNodes.outputNodes;

            this.weightsIH = inputNodes.weightsIH.copy();
            this.weightsHO = inputNodes.weightsHO.copy();

            this.biasIH = inputNodes.biasIH.copy();
            this.biasHO = inputNodes.biasHO.copy();
        } else {
            this.inputNodes = inputNodes;
            this.hiddenNodes = hiddenNodes;
            this.outputNodes = outputNodes;        
    
            this.weightsIH = new Matrix(this.hiddenNodes, this.inputNodes);
            this.weightsHO = new Matrix(this.outputNodes, this.hiddenNodes);
            this.weightsIH.randomize();
            this.weightsHO.randomize();
    
            this.biasIH = new Matrix(this.hiddenNodes, 1);
            this.biasHO = new Matrix(this.outputNodes, 1);
            this.biasIH.randomize();
            this.biasHO.randomize();
        }      

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

    copy () {
        return new NeuralNetwork(this);
    }

    mutate(rate) {
        function mut(n) {
            if (Math.random() < rate) {
                return  n += Math.random()-0.5;
            } 
            return n;
        }

        this.weightsIH.map(mut);
        this.weightsHO.map(mut);
        this.biasIH.map(mut);
        this.biasIH.map(mut);
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

    copy() {
        let m = new Matrix(this.rows, this.cols);
        for(let i = 0; i < this.rows; i++){
            for(let j = 0; j< this.cols; j++) {
                m.data[i][j] = this.data[i][j];
            }
        }
        return m;
    }

    randomize() {
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                this.data[i][j] = Math.random()*2 - 1;
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
