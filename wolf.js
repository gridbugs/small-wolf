const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const worldWidth = 24;
const worldDepth = 32;

function generateWorld() {
  const numIterations = 6;
  const surviveMin = 4
  const surviveMax = 8
  const resurrectMin = 5
  const resurrectMax = 5
  let world = Array.from({ length: worldWidth * worldDepth }, () => Math.random() < 0.5 ? 0 : 1);
  let copy = [...world];
  for (let i = 0; i < numIterations; i++) {
    for (let y = 0; y < worldDepth; y++) {
      for (let x = 0; x < worldWidth; x++) {
        let index = y * worldWidth + x;
        if (x == 0 || y == 0 || x == worldWidth - 1 || y == worldDepth - 1) {
          copy[index] = 1;
          continue;
        }
        let numLivingNeigbours =
          world[(y - 1) * worldWidth + (x + 0)] +
          world[(y - 1) * worldWidth + (x + 1)] +
          world[(y + 0) * worldWidth + (x + 1)] +
          world[(y + 1) * worldWidth + (x + 1)] +
          world[(y + 1) * worldWidth + (x + 0)] +
          world[(y + 1) * worldWidth + (x - 1)] +
          world[(y + 0) * worldWidth + (x - 1)] +
          world[(y - 1) * worldWidth + (x - 1)];
        if (world[index] == 0) {
          copy[index] = numLivingNeigbours >= resurrectMin && numLivingNeigbours <= resurrectMax ? 1 : 0;
        } else {
          copy[index] = numLivingNeigbours >= surviveMin && numLivingNeigbours <= surviveMax ? 1 : 0;
        }
      }
    }
    let tmp = world;
    world = copy;
    copy = tmp;
  }
  let biggestRegion = [];
  for (let y = 0; y < worldDepth; y++) {
    for (let x = 0; x < worldWidth; x++) {
      let currentIndex = y * worldWidth + x;
      if (world[currentIndex] == 0 && copy[currentIndex] != 2) {
        const toVisit = [currentIndex];
        let toVisitIndex = 0;
        copy[currentIndex] = 2;
        while (toVisitIndex < toVisit.length) {
          currentIndex = toVisit[toVisitIndex];
          toVisitIndex += 1;
          for (let neighbour of [currentIndex - 1, currentIndex + 1, currentIndex - worldWidth, currentIndex + worldWidth]) {
            if (world[neighbour] == 0 && copy[neighbour] != 2) {
              copy[neighbour] = 2;
              toVisit.push(neighbour);
            }
          }
        }
        if (toVisit.length > biggestRegion.length) {
          biggestRegion = toVisit;
        }
      }
    }
  }
  for (let i = 0; i < world.length; i++) {
    world[i] = 0;
  }
  for (let i of biggestRegion) {
    world[i] = 1;
  }
  const playerStartIndex = biggestRegion[Math.floor(Math.random() * biggestRegion.length)];
  return {
    map: world,
    player: {
      x: (playerStartIndex % worldWidth) + 0.5,
      y: (playerStartIndex / worldWidth) + 0.5,
      heading: 0,
    }
  };
}

const world = generateWorld();


function drawStrip(xOffset, height) {
  const wallColour = "#FF00FF";
  const ceilingColour = "#00FFFF";
  const floorColour = "#000000";
  const yTop = (canvas.height - height) / 2;
  ctx.fillStyle = ceilingColour;
  ctx.fillRect(xOffset, 0, 1, yTop);
  ctx.fillStyle = wallColour;
  ctx.fillRect(xOffset, yTop, 1, height);
  ctx.fillStyle = floorColour;
  ctx.fillRect(xOffset, yTop + height, 1, yTop);
}

function render() {
  for (let i = 0; i < canvas.width; i++) {
    drawStrip(i, i);
  }
}

function frame() {
  render();
  debugDrawWorld();
  requestAnimationFrame(frame);
}

function debugDrawWorld() {
  for (let y = 0; y < worldDepth; y++) {
    for (let x = 0; x < worldWidth; x++) {
      let index = y * worldWidth + x;
      ctx.fillStyle = world.map[index] ? "black" : "white";
      ctx.fillRect(x * 10, y * 10, 10, 10);
    }
  }
  ctx.fillStyle = "red";
  ctx.fillRect(world.player.x * 10 - 2, world.player.y * 10 - 2, 4, 4);
}

frame();
