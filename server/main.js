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
  app.get('/ws', { websocket: true }, (con, _req) => {
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

function broadcast(con, message) {
  message.id = con.store.id;
  message = JSON.stringify(message);
  for (let client of app.websocketServer.clients) {
    if (client !== con.socket && client.readyState == WebSocket.OPEN) {
      client.send(message);
    }
  }
}
