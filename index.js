const settings = require("./settings.js");

const express = require('express');
const app = express();
var expressWs = require('express-ws')(app);
const Bottleneck = require("bottleneck").default;

const MAX_CONNECTIONS = 5;

const connectionlimit_group = settings.enforce_limits ? new Bottleneck.Group({ maxConcurrent: MAX_CONNECTIONS }) : null;

const clientlist = require("./clientlist.js");

app.get('/', (req, res) => res.send('Direct connections to FedNexus are currently not supported!'));

if (settings.enforce_limits)
    app.use("/api/v1", async function (req, res, next) {
        var count = connectionlimit_group.key(req.ip).counts();
        if (count.EXECUTING < MAX_CONNECTIONS)
            next();
        else
            res.status(419).end();
    });

app.ws('/api/v1/client', clientlist.getClientConnectHandler(1, require("./v1.js"), connectionlimit_group));
if (settings.enable_endpoint_proxy)
    // Endpoint for proxies to connect to this nullnexus instance
    app.ws('/api/v1/proxy', require("./botproxy.js")(connectionlimit_group, require("./v1.js")));

app.listen(settings.LISTEN, () => console.log(`FedNexus listening on ${settings.LISTEN}!`));

setInterval(function ping() {
    expressWs.getWss().clients.forEach(function each(ws) {
      if (ws.isAlive === false) return ws.terminate();
   
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);