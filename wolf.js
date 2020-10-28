const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const worldWidth = 24;
const worldDepth = 32;

const inputState = {
  up: false,
  down: false,
  left: false,
  right: false,
}

document.onkeydown = (e) => {
  switch (e.keyCode) {
    case 37:
      inputState.left = true;
      break;
    case 38:
      inputState.up = true;
      break;
    case 39:
      inputState.right = true;
      break;
    case 40:
      inputState.down = true;
      break;
  }
}

document.onkeyup = (e) => {
  switch (e.keyCode) {
    case 37:
      inputState.left = false;
      break;
    case 38:
      inputState.up = false;
      break;
    case 39:
      inputState.right = false;
      break;
    case 40:
      inputState.down = false;
      break;
  }
}

function generateWorld() {
  const numIterations = 6;
  const surviveMin = 4
  const surviveMax = 8
  const resurrectMin = 5
  const resurrectMax = 5
  function seed() {
    while (true) {
      const r = Math.floor(Math.random() * (1 << 31));
      if (r != 0) {
        return r;
      }
    }
  }
  let prng = {
    state: seed(),
  };
  function rng32() {
    let x = prng.state;
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    prng.state = x;
    return x;
  }
  let world = Array.from({ length: worldWidth * worldDepth }, () => rng32() < 0 ? 0 : 1);
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
    world[i] = 1;
  }
  for (let i of biggestRegion) {
    world[i] = 0;
  }
  const distanceMap = Array.from({ length: worldWidth * worldDepth }, () => -1);
  const edgeQueue = [];
  for (let i = 0; i < world.length; i++) {
    if (world[i] == 0) {
      let count = 0;
      for (let neighbour of [i - 1, i + 1, i - worldWidth, i + worldWidth]) {
        count += world[neighbour];
      }
      if (count != 0) {
        distanceMap[i] = 0;
        edgeQueue.push(i);
      }
    }
  }
  let edgeIndex = 0;
  let maxDistance = -1;
  let playerStartCandates = [];
  while (edgeIndex < edgeQueue.length) {
    const currentIndex = edgeQueue[edgeIndex];
    edgeIndex += 1;
    if (distanceMap[currentIndex] > maxDistance) {
      maxDistance = distanceMap[currentIndex];
      playerStartCandates = [];
    }
    if (distanceMap[currentIndex] == maxDistance) {
      playerStartCandates.push(currentIndex);
    }
    for (let neighbour of [currentIndex - 1, currentIndex + 1, currentIndex - worldWidth, currentIndex + worldWidth]) {
      if (distanceMap[neighbour] == -1 && world[neighbour] == 0) {
        distanceMap[neighbour] = distanceMap[currentIndex] + 1;
        edgeQueue.push(neighbour);
      }
    }
  }
  const playerStartIndex = playerStartCandates[Math.floor(Math.abs(rng32() % playerStartCandates.length))];
  return {
    map: world,
    player: {
      x: (playerStartIndex % worldWidth),
      y: Math.floor(playerStartIndex / worldWidth),
      heading: Math.PI / 6,
    }
  };
}

const world = generateWorld();

function castRays(x, y, heading) {
  const dxBase = Math.cos(heading);
  const dyBase = Math.sin(heading);
  const fovRatio = 0.005;
  const dxNorm = dyBase * fovRatio;
  const dyNorm = -dxBase * fovRatio;
  for (let j = 0; j < canvas.width; j++) {
    let curX = x;
    let curY = y;
    const dx = dxBase + (j - (canvas.width >> 1)) * dxNorm;
    const dy = dyBase + (j - (canvas.width >> 1)) * dyNorm;
    const getNextXInt = dx > 0 ? x => Math.floor(x + 1) : x => Math.ceil(x - 1);
    const getNextYInt = dy > 0 ? y => Math.floor(y + 1) : y => Math.ceil(y - 1);
    while (true) {
      const nextXInt = getNextXInt(curX);
      const nextYInt = getNextYInt(curY);
      const xMul = (nextXInt - curX) / dx;
      const yMul = (nextYInt - curY) / dy;
      const mul = Math.min(xMul, yMul);
      const nextX = curX + dx * mul;
      const nextY = curY + dy * mul;
      const xIdx = Math.floor((nextX + curX) / 2);
      const yIdx = Math.floor((nextY + curY) / 2);
      if (world.map[yIdx * worldWidth + xIdx] == 1) {
        const distanceX = curX - x;
        const distanceY = curY - y;
        const normalDistance = (dxBase * distanceX + dyBase * distanceY) / Math.sqrt(dxBase * dxBase + dyBase * dyBase);
        if (normalDistance > 0) {
          const distanceSquared = distanceX * distanceX + distanceY * distanceY;
          drawStrip(j, 400 / normalDistance, distanceSquared);
        }
        break;
      }
      curX = nextX;
      curY = nextY;
    }
  }
}

function drawStrip(xOffset, height, distanceSquared) {
  const x = Math.min(255, Math.floor(5000 / distanceSquared));
  const wallColour = `rgb(${x}, 0, ${x})`;
  const ceilingColour = "#00FFFF";
  const floorColour = "#000088";
  const yTop = (canvas.height - height) / 2;
  ctx.fillStyle = ceilingColour;
  ctx.fillRect(xOffset, 0, 1, yTop);
  ctx.fillStyle = wallColour;
  ctx.fillRect(xOffset, yTop, 1, height);
  ctx.fillStyle = floorColour;
  ctx.fillRect(xOffset, yTop + height, 1, yTop);
}

function processInput() {
  if (inputState.left) {
    world.player.heading += 0.05;
  }
  if (inputState.right) {
    world.player.heading -= 0.05;
  }
  const speed = 0.2;
  if (inputState.up) {
    world.player.x += Math.cos(world.player.heading) * speed;
    world.player.y += Math.sin(world.player.heading) * speed;
  }
  if (inputState.down) {
    world.player.x -= Math.cos(world.player.heading) * speed;
    world.player.y -= Math.sin(world.player.heading) * speed;
  }
}

function frame() {
  processInput();
  castRays(world.player.x, world.player.y, world.player.heading);
  requestAnimationFrame(frame);
}

frame();
