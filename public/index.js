/// <reference path="./kontra.js"/>
import '/kontra.js';

let { canvas } = kontra.init('game');

const socket = new WebSocket('ws://' + window.location.hostname + ':' + window.location.port + '/ws');

let players = {};
let bullets = [];
let ebullets = [];

const anchor = { x: 0.5, y: 0.5 };
const speed = 10;
let timeElapsed = 0;
let shootCD = false;
let score = 0;

const SPAWN = 'spawn';
const POSITION = 'position';
const DISCONNECT = 'disconnect';
const BULLET = 'bullets';
const HIT = 'hit';

// Connection opened
socket.addEventListener('open', () => {
  socket.send(JSON.stringify({ type: SPAWN, x: ship.x, y: ship.y }));
  loop.start();
});

// Listen for messages
socket.addEventListener('message', (event) => {
  let data;
  try {
    data = JSON.parse(event.data);
  } catch (e) {
    console.log('Failed parse on:', event.data);
  }
  if (data.type != POSITION) console.log('Message from server', event.data);

  switch (data.type) {
    case SPAWN:
      createShip(data.x, data.y, data.id);
      sendPosition();
      break;
    case POSITION:
      updatePosition(data);
      break;
    case DISCONNECT:
      delete players[data.id];
      break;
    case BULLET:
      addEnemyBullet(data);
      break;
    default:
      console.warn('Unknown signal:', data.type);
  }
});

let ship = kontra.Sprite({
  x: 80,
  y: 80,
  color: 'red',
  width: 20,
  height: 20,
  anchor: { x: 0.5, y: 0.5 },
});

let child = createObject(0, 0, 'orange', { x: 10, y: 40 });
ship.addChild(child);

function updatePosition(data) {
  let player = players[data.id];
  if (!player) {
    createShip(data.x, data.y, data.id);
  } else {
    player.rotation = data.rotation;
    player.x = data.x;
    player.y = data.y;
  }
}

function createShip(x, y, id) {
  let ship = kontra.Sprite({
    x,
    y,
    color: 'blue',
    width: 20,
    height: 20,
    anchor: { x: 0.5, y: 0.5 },
  });
  let child = createObject(0, 0, 'magenta', { x: 10, y: 40 });
  ship.addChild(child);
  players[id] = ship;
}

function addEnemyBullet(data) {
  let { x, y, dir } = data.bullet;
  let [dx, dy] = [Math.cos(dir), Math.sin(dir)];
  let bullet = kontra.Sprite({
    x,
    y,
    color: 'cyan',
    height: 5,
    width: 5,
    dx: dx * (speed + 1),
    dy: dy * (speed + 1),
    anchor,
  });
  ebullets.push(bullet);
}

function createObject(x, y, color, size = { x: 20, y: 20 }) {
  return kontra.GameObject({
    x,
    y,
    width: size.x,
    height: size.y,
    anchor: { x: 0, y: 1 / 8 },
    color,
    render: function () {
      this.context.fillStyle = this.color;
      this.context.fillRect(0, 0, this.height, this.width);
    },
  });
}

function shoot() {
  let { x: px, y: py } = kontra.getPointer();
  let vec = kontra.Vector(px - ship.x, py - ship.y);
  let dir = vec.direction();
  let [dx, dy] = [Math.cos(dir), Math.sin(dir)];
  let bullet = kontra.Sprite({
    x: ship.x + dx * 20,
    y: ship.y + dy * 20,
    color: 'red',
    height: 5,
    width: 5,
    dx: dx * (speed + 1),
    dy: dy * (speed + 1),
    anchor: { x: 0.5, y: 0.5 },
  });
  bullets.push(bullet);

  socket.send(
    JSON.stringify({
      type: BULLET,
      bullet: {
        x: bullet.x,
        y: bullet.y,
        dir,
      },
    })
  );
}

kontra.initPointer();
kontra.initKeys();
kontra.initInput();

// TODO: disconnect rotation from position or check for rotation changes
function sendPosition() {
  socket.send(
    JSON.stringify({
      type: POSITION,
      rotation: ship.rotation,
      x: ship.x,
      y: ship.y,
    })
  );
}

let scoreText = kontra.Text({
  font: 'bold 16px monospace',
  color: '#00e000',
  x: 10,
  y: 10,
});

let mouseDown
document.body.onmousedown = () => mouseDown++;
document.body.onmouseup = () => mouseDown--;

// TODO: send position only when moving
kontra.on('tick', sendPosition);

var loop = kontra.GameLoop({
  update: (delta) => {
    let pointer = kontra.getPointer();
    timeElapsed += delta;

    if (kontra.keyPressed('w')) {
      if (ship.y > 10) ship.y -= speed;
    }
    if (kontra.keyPressed('s')) {
      if (ship.y < canvas.height - 10) ship.y += speed;
    }
    if (kontra.keyPressed('d')) {
      if (ship.x < canvas.width - 10) ship.x += speed;
    }
    if (kontra.keyPressed('a')) {
      if (ship.x > 10) ship.x -= speed;
    }

    if (kontra.keyPressed('space') || mouseDown) {
      if (!shootCD) {
        shoot();
        setTimeout(() => {
          shootCD = false;
        }, 250);
        shootCD = true;
      }
    }

    ship.rotation = Math.atan2(pointer.y - ship.y, pointer.x - ship.x);
    if (canvas.width < ship.x) {
      ship.x = -20;
    }

    ship.update();

    for (let player of Object.values(players)) {
      if (player) player.update();
    }

    bullets.forEach((b, i) => {
      if (outsideCanvas(b.x, b.y)) {
        delete bullets[i];
      } else {
        b.update();
        Object.values(players).forEach((p) => {
          if (kontra.collides(p, b)) {
            delete bullets[i];
            score++;
          }
        });
      }
    });

    ebullets.forEach((b, i) => {
      if (outsideCanvas(b.x, b.y)) {
        delete ebullets[i];
      } else {
        b.update();
        if (kontra.collides(ship, b)) {
          delete ebullets[i];
        }
      }
    });

    if (score != scoreText.text) {
      scoreText.text = score;
      scoreText.update();
    }
  },
  render: () => {
    for (let player of Object.values(players)) {
      if (player) player.render();
    }

    ebullets.map((bullet) => bullet.render());
    bullets.map((bullet) => bullet.render());
    ship.render();
    scoreText.render();
  },
  blur: true,
});

// Garbage collection
setInterval(() => {
  if (ebullets.length > 1000) {
    ebullets.filter((a) => a);
  }
  if (bullets.length > 100) {
    bullets.filter((a) => a);
  }
}, 60 * 1000);

function outsideCanvas(x, y) {
  return x < 0 || x > canvas.width || y < 0 || y > canvas.height;
}
