var lib = require("./lib.js");
var clientlist = require("./clientlist.js");

module.exports = handleConnect;

function disconnect(clients) {
    for (let [key, client] of Object.entries(clients)) {
        delete clientlist.clients[client.id];
    }
}

function getSendFunction(ws, id) {
    return (msg) => {
        ws.send(JSON.stringify({
            id: id,
            data: msg
        }));
    }
}

function handleConnect(group, api) {
    return function (ws, req) {

        group.key(req.ip).schedule(() => new Promise(function (resolve) {
            ws.on('pong', () => ws.isAlive = true);

            console.log("New relay connection by " + req.ip);
            var clients = {};

            ws.on("message", function (msg) {
                try {
                    var obj = JSON.parse(msg);
                    // Check if this message contains everything we need
                    if (typeof obj.type != "string" || typeof obj.id != "number")
                        return;
                    switch (obj.type) {
                        case "connect":
                            if (typeof obj.data != "object" || typeof obj.data.headers != "object")
                                break;
                            clients[obj.id] = clientlist.addVirtualClient(1, req.ip, obj.data.headers)
                            clients[obj.id].send = getSendFunction(ws, obj.id);
                            api(clients[obj.id]);
                            break;
                        case "message":
                            if (typeof obj.data != "string")
                                break;
                            clients[obj.id].onmsg(clients[obj.id], obj.data);
                            break;
                        case "disconnect":
                            delete clientlist.clients[clients[obj.id].id];
                            delete clients[obj.id];
                    }
                } catch (error) {
                    console.log(error);
                }
            });
            
            ws.on('close', () => { resolve(); console.log("Relay connection closed by " + req.ip); disconnect(clients); });
        })).catch(function (err) {
            console.log(err)
            ws.terminate();
        });
    }
}