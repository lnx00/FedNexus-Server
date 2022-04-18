const lib = require("./lib.js");

var clients = {};
var id = 0;

function addBaseClient(version, ip) {
    var clientid = ++id;
    return clients[clientid] = {
        id: clientid,
        version: version,
        chat: true,
        ip: ip
    }
}

function addWsClient(ws, req, version) {
    var client = addBaseClient(version, req.ip);
    // Enable chat
    client.chat = true;
    // Set the username colour
    lib.setColour(client, req.headers.nullnexus_colour, 0xfc9003);
    // Set server info
    lib.setServer(client, req.headers.nullnexus_server_ip, req.headers.nullnexus_server_port, req.headers.nullnexus_server_steamid);
    client.websocket = ws;
    client.send = (data) => ws.send(data);
    ws.on("message", (msg) => client.onmsg(client, msg));
    ws.on('close', () => { delete clients[client.id]; });
    ws.on('pong', () => ws.isAlive = true);
    return client;
}

function getClientConnectHandler(version, api, group) {
    return function (ws, req) {
        group.key(req.ip).schedule(() => new Promise(function (resolve) {
            console.log("New client connection by " + req.ip);
            api(addWsClient(ws, req, version));
            ws.on('close', () => { resolve(); console.log("Client connection closed by " + req.ip) });
        })).catch(function (err) {
            console.log(err)
            ws.terminate();
        });
    }
}

function addVirtualClient(version, ip, headers) {
    console.log("Virtual client connected on " + ip);
    var client = addBaseClient(version, ip);
    // Set the username colour
    lib.setColour(client, headers.nullnexus_colour, 0xfc9003);
    // Set server info
    lib.setServer(client, headers.nullnexus_server_ip, headers.nullnexus_server_port, headers.nullnexus_server_steamid);
    return client;
}

exports.getClientConnectHandler = getClientConnectHandler;
exports.clients = clients;
exports.addVirtualClient = addVirtualClient;