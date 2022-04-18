const ip = require("ip");
var clientlist = require("./clientlist.js");
const Bottleneck = require("bottleneck").default;

exports.setColour = function (client, colour, fallback) {
    try {
        colour = parseInt(colour);
    } catch (error) {
        colour = null;
    }
    if (!colour || colour > 0xFFFFFF || colour < 0x000000) {
        if (fallback)
            client.colour = fallback;
        return;
    }
    client.colour = colour;
}

exports.setServer = function (client, server_ip, server_port, steamid) {
    if (typeof server_ip != "string" || typeof server_port != "string" || typeof steamid != "string" || ip.isPrivate(server_ip)) {
        client.server = null;
        return;
    }
    client.server = { ip: server_ip, port: server_port, steamid: steamid };
}

exports.sendBroadcast = function (msg, self, check) {
    for (let [key, client] of Object.entries(clientlist.clients)) {
        // Check if the client should recieve the message
        if (check && !check(client))
            continue;
        // Don't send to broadcaster
        if (!self || client !== self) {
            client.send(msg);
        }
    }
}

exports.formatMessageToClient = function (type, data) {
    return JSON.stringify({
        type: type,
        data: data
    })
}

const chat_bottleneck = new Bottleneck.Group({
    reservoir: 2,
    reservoirIncreaseInterval: 5 * 1000,
    reservoirIncreaseAmount: 1,
    reservoirIncreaseMaximum: 5,
    highWater: 0
});

exports.handleChatMessage = function (ip, username, message, loc, colour) {
    chat_bottleneck.key(ip).schedule(function () {
        var broadcast = exports.formatMessageToClient("chat", {
            msg: message,
            user: username,
            loc: loc,
            colour: colour
        });
        exports.sendBroadcast(broadcast, null, (client) => client.chat)
    }).catch(() => { });
}

exports.getClientsOnServer = function (ip, port) {
    var clients = [];
    for (let [key, client] of Object.entries(clientlist.clients)) {
        if (client.server && client.server.ip === ip && client.server.port === port)
            clients.push(client);
    }
    return clients;
}
