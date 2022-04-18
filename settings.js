const options = require('command-line-args')({ name: "port", type: Number });

exports.LISTEN = options.port || 3000;
exports.enforce_limits = true;
exports.enable_endpoint_proxy = true;