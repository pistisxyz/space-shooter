import WebSocket, { WebSocketServer } from 'ws';
import fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
const app = fastify();

const __dirname = dirname(fileURLToPath(import.meta.url))

app.register(fastifyStatic, {
  root: resolve(__dirname, '..', 'public'),
});

app.register(fastifyWebsocket);

app.register(async (app) => {
  app.get('/ws', { websocket: true }, (con, req) => {
    con.store = {id: Math.floor(Math.random() * 10_000_000_000)}
  
    con.on('data', (_data) => {
      con.socket;
      let data = JSON.parse(_data);
      broadcast(con, data)
    });
  
    con.on('end', () => {
      broadcast(con, {type: 'disconnect'})
    })

    con.on('error', (err) => {
      console.error(err);
    })
  });
})

app.listen({port: 8080}).then(() => {
  console.log('Listening on port 8080');
})

// const wss = new WebSocketServer({ port: 3333 });

// wss.on('connection', function connection(ws) {
//   ws.on('error', console.error);

//   ws.store = { id: Math.floor(Math.random() * 10000000000) };

//   ws.on('message', function message(_data, isBinary) {
//     let data = JSON.parse(_data);
//     broadcast(ws, data);
//   });

//   ws.on('close', function close() {
//     broadcast(ws, { type: 'disconnect', id: ws.store.id });
//   });
// });

function broadcast(con, message) {
  message.id = con.store.id;
  message = JSON.stringify(message);
  for (let client of app.websocketServer.clients) {
    if (client !== con.socket && client.readyState == WebSocket.OPEN) {
      client.send(message);
    }
  }
}

// function broadcast(ws, message) {
//   wss.clients.forEach(function each(client) {
//     if (client !== ws && client.readyState === WebSocket.OPEN) {
//       message.id = ws.store.id;
//       client.send(JSON.stringify(message));
//     }
//   });
// }
