const { Engine, Render, Runner, World, Bodies, Body, Events} = Matter;

const newGame = document.querySelector('.new-game');
const nextLevel = document.querySelector('.next-level');

let storedCellsH = Number(localStorage.getItem('cellsH'));
let storedCellsV = Number(localStorage.getItem('cellsV'));

let cellsHorizontal = storedCellsH > 5 ? storedCellsH : 5;
let cellsVertical = storedCellsV > 4 ? storedCellsV : 3;

const width = window.innerWidth;
const height = window.innerHeight;

const unitLengthX = width / cellsHorizontal;
const unitLengthY = height / cellsVertical;

const engine = Engine.create();
engine.world.gravity.y = 0;
const {world} = engine;
const render = Render.create({
    element: document.body,
    engine: engine,
    options: {
        wireframes: false,
        width,
        height
    }
});

Render.run(render);
Runner.run(Runner.create(), engine);

// BUTTON LISTENERS

newGame.addEventListener('click', () => {
    window.localStorage.clear();
    window.location.reload();
});

nextLevel.addEventListener('click', () => {
    location.reload();
});

// INCREASING NUMBER OF CELLS

const increaseCells = () => {
    let addCellsH = cellsHorizontal + 2;
    let addCellsV = Math.floor((cellsHorizontal + 2) * .67);

    storage('cellsH', addCellsH);
    storage('cellsV', addCellsV);
}

const storage = (key, value) => {
    if(key === 'cellsH'){
        localStorage.setItem('cellsH', value);
    }
    if(key === 'cellsV'){
        localStorage.setItem('cellsV', value);
    }
};

// WALLS - top, bottom, left, right
const walls = [
    Bodies.rectangle(width / 2, 0, width, 2, {isStatic: true}),
    Bodies.rectangle(width / 2, height, width, 2, {isStatic: true}),
    Bodies.rectangle(0, height / 2, 2, height, {isStatic: true}),
    Bodies.rectangle(width, height / 2, 2, height, {isStatic: true})
];
World.add(world, walls);

// MAZE GENERATION

const shuffle = (arr) => {
    let counter = arr.length;
    while (counter > 0) {
        const index = Math.floor(Math.random() * counter);
        counter--;
        const temp = arr[counter];
        arr[counter] = arr[index];
        arr[index] = temp;
    }
    return arr;
};

const grid = Array(cellsVertical).fill(null).map(() => Array(cellsHorizontal).fill(false));

const verticals = Array(cellsVertical).fill(null).map(() => Array(cellsHorizontal - 1).fill(false));
const horizontals = Array(cellsVertical - 1).fill(null).map(() => Array(cellsHorizontal).fill(false));

const startRow = Math.floor(Math.random() * cellsVertical);
const startColumn = Math.floor(Math.random() * cellsHorizontal);

const stepThroughCell = (row, column) => {
    // If I have visited the cell at [row, column], then return
    if (grid[row][column] === true){
        return;
    }
    // Mark this cell as being visited
    grid[row][column] = true;
    // Assemble randomly-ordered list of neighbors
    const neighbors = shuffle([
        [row - 1, column, 'up'],
        [row, column + 1, 'right'],
        [row + 1, column, 'down'],
        [row, column - 1, 'left']
    ]);
    // For each neighbor .....
    for (let neighbor of neighbors) {
        const [nextRow, nextColumn, direction] = neighbor;
        // See if that neighbor is out of bounds
        if (nextRow < 0 || nextRow >= cellsVertical || nextColumn < 0 || nextColumn >= cellsHorizontal){
            continue;
        }
        // If we have visited that neigbor, continue to next neighbor
        if (grid[nextRow][nextColumn]){
            continue;
        }
        // Remove a wall from either horizontals or verticals
        if (direction === 'left') {
            verticals[row][column - 1] = true;
        } else if (direction === 'right') {
            verticals[row][column] = true;
        } else if (direction === 'up') {
            horizontals[row -1][column] = true;
        } else if (direction === 'down') {
            horizontals[row][column] = true;
        }
        stepThroughCell(nextRow, nextColumn);
    }
    // Visit that next cell
};
stepThroughCell(startRow, startColumn);

// DRAWING HORIZONTAL AND VERTICAL SEGMENTS
horizontals.forEach((row, rowIndex) => {
    row.forEach((open, columnIndex) => {
        if (open === true){
            return;
        }
        const wall = Bodies.rectangle(
            columnIndex * unitLengthX + unitLengthX / 2,
            rowIndex * unitLengthY + unitLengthY,
            unitLengthX,
            5,
            {label:'wall', isStatic: true, render: {fillStyle: 'white'}}
        );
        World.add(world, wall);
    });
});

verticals.forEach((row, rowIndex) => {
    row.forEach((open, columnIndex) => {
        if(open) {
            return;
        }
        const wall = Bodies.rectangle(
            columnIndex * unitLengthX + unitLengthX,
            rowIndex * unitLengthY + unitLengthY / 2,
            5,
            unitLengthY,
            {label:'wall', isStatic: true, render: {fillStyle: 'white'}}
        );
        World.add(world, wall);
    });
});

// DRAWING THE GOAL
const goal = Bodies.rectangle(
    width - unitLengthX / 2,
    height - unitLengthY / 2,
    unitLengthX * .7,
    unitLengthY * .7,
    {friction: 0, label: 'goal', isStatic: true, render: {fillStyle: 'lawngreen'}}
);
World.add(world, goal);

// DRAWING THE BALL
const ballRadius = Math.min(unitLengthX, unitLengthY) / 4;
const ball = Bodies.circle(
    unitLengthX / 2,
    unitLengthY / 2,
    ballRadius,
    {friction: 0, label: 'ball', render: {fillStyle: 'magenta'}}
);
World.add(world, ball);

document.addEventListener('keydown', event => {
    const {x, y} = ball.velocity;
    const speedLimit = 5;
    if(event.keyCode === 87 && y > -speedLimit){
        Body.setVelocity(ball, {x, y: y - 5});
    }
    if(event.keyCode === 68 && x < speedLimit){
        Body.setVelocity(ball, {x: x + 5, y});
    }
    if(event.keyCode === 83 && y < speedLimit){
        Body.setVelocity(ball, {x, y: y + 5});
    }
    if(event.keyCode === 65 && x > -speedLimit){
        Body.setVelocity(ball, {x: x - 5, y});
    }  
});

// WIN CONDITION

Events.on(engine, 'collisionStart', event => {
    event.pairs.forEach(collision => {
        // console.log(collision);
        const labels = ['ball', 'goal'];
        if ( labels.includes(collision.bodyA.label) && labels.includes(collision.bodyB.label)) {
            document.querySelector('.winner').classList.remove('hidden');
            increaseCells();
            world.gravity.y = 1;
            world.bodies.forEach(body => {
                if (body.label === 'wall'){
                    Body.setStatic(body, false);
                }
            })
        }
    });
});

window.onload = () => localStorage.clear();


