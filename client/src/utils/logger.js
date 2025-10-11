// JS shim that re-exports the TypeScript logger shim for imports that use .js suffix
module.exports = require('./logger');
module.exports.__esModule = true;
exports.logger = module.exports.logger || module.exports.default || {};
