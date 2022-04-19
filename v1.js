var lib = require("./lib.js");
const settings = require("./settings.js");
//.
module.exports = handleConnection;

// Handle the player connecting to a TF2 server
function handlePlayerServer(client) {
    if (client.server) {
        var clients = lib.getClientsOnServer(client.server.ip, client.server.port);
        var steamidlist = [];
        for (var i in clients) {
            steamidlist.push({ steamid: clients[i].server.steamid });
            if (clients[i] != client)
                clients[i].send(lib.formatMessageToClient("authedplayers", [{ steamid: client.server.steamid }]));
        }
        // Send client a list of all known players on this server
        client.send(lib.formatMessageToClient("authedplayers", steamidlist));
    }
}

const isPrintableASCII = string => /^[\x20-\x7F]*$/.test(string);

// Handle incoming messages from the client
function onMessage(client, msg) {
    try {
        var obj = JSON.parse(msg);
        // Check if this message contains everything we need
        if (typeof obj.username != "string" || typeof obj.type != "string" || typeof obj.data != "object") {
            return;
        }

        // Make sure the username isn't too large
        if (obj.username.length > 32) {
            return;
        }

        if (!isPrintableASCII(obj.username))
            return;

        switch (obj.type) {
            case "chat":
                // Parameters:
                // loc: Which chat? Currently only "public" is supported
                // msg: Actual message

                if (typeof obj.data.msg != "string" || typeof obj.data.loc != "string") {
                    return;
                }

                // Check if the message is too big/wrong location
                if (obj.data.msg.length > 128 || obj.data.loc != "public") {
                    return;
                }

                // Check if message is printable ascii
                if (!isPrintableASCII(obj.data.msg)) {
                    return;
                }

                if (settings.Verbose) {
                    console.log("[CHAT] " + obj.username + ": " + obj.data.msg);
                }

                lib.handleChatMessage(client.ip, obj.username, obj.data.msg, "public", client.colour)
                break;

            case "dataupdate":
                if (typeof obj.data.colour == "string") {
                    if (settings.Verbose) {
                        console.log("[DataUpdate] Color will be changed to: " + obj.data.colour);
                    }

                    lib.setColour(client, obj.data.colour);
                }

                if (typeof obj.data.server == "object") {
                    if (obj.data.server.connected) {
                        if (settings.Verbose) {
                            console.log("[DataUpdate] Server will be changed to: " + obj.data.server.ip + ":" + obj.data.server.port);
                        }

                        lib.setServer(client, obj.data.server.ip, obj.data.server.port, obj.data.server.steamid);
                        handlePlayerServer(client);
                    }
                    else {
                        if (settings.Verbose) {
                            console.log("[DataUpdate] Server will be changed to: null");
                        }

                        lib.setServer(client);
                    }
                }
                break;

            default:
                return;
        }

    } catch (error) { console.error(error); return; }
}

function handleConnection(client) {
    client.onmsg = onMessage;
    handlePlayerServer(client);
}