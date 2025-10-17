class Logger {
    level = 'INFO';
    context = {};
    setLevel(level) {
        this.level = level;
    }
    withContext(context) {
        const newLogger = new Logger();
        newLogger.level = this.level;
        newLogger.context = { ...this.context, ...context };
        return newLogger;
    }
    debug(message, ...args) {
        if (this.shouldLog('DEBUG')) {
            console.debug(`[DEBUG] ${message}`, ...args);
        }
    }
    info(message, ...args) {
        if (this.shouldLog('INFO')) {
            console.info(`[INFO] ${message}`, ...args);
        }
    }
    warn(message, ...args) {
        if (this.shouldLog('WARN')) {
            console.warn(`[WARN] ${message}`, ...args);
        }
    }
    error(message, ...args) {
        if (this.shouldLog('ERROR')) {
            console.error(`[ERROR] ${message}`, ...args);
        }
    }
    shouldLog(level) {
        const levels = {
            DEBUG: 0,
            INFO: 1,
            WARN: 2,
            ERROR: 3
        };
        return levels[level] >= levels[this.level];
    }
}
export const logger = new Logger();
//# sourceMappingURL=logger.js.map