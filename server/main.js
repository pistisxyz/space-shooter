import WebSocket, { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 3333 });

wss.on('connection', function connection(ws) {
    ws.on('error', console.error);

    ws.store = {id: Math.floor(Math.random() * 10000000000)}

    ws.on('message', function message(_data, isBinary) {
        let data = JSON.parse(_data);
        broadcast(ws, data)
    });

    ws.on('close', function close(){
        broadcast(ws, {type: "disconnect", id: ws.store.id})
    })
});

function broadcast(ws, message){
    wss.clients.forEach(function each(client) {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
            message.id = ws.store.id;
            client.send(JSON.stringify(message));
        }
    });
}