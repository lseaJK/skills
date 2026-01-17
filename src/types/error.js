"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorSeverity = exports.ErrorType = exports.SystemError = void 0;
/**
 * Base system error class
 */
class SystemError extends Error {
    constructor(type, message, severity = ErrorSeverity.ERROR, context = {}, suggestions = [], cause) {
        super(message);
        this.name = 'SystemError';
        this.type = type;
        this.severity = severity;
        this.context = context;
        this.suggestions = suggestions;
        this.cause = cause;
    }
}
exports.SystemError = SystemError;
/**
 * Types of system errors
 */
var ErrorType;
(function (ErrorType) {
    ErrorType["SKILL_DEFINITION_ERROR"] = "skill_definition_error";
    ErrorType["EXECUTION_ERROR"] = "execution_error";
    ErrorType["MIGRATION_ERROR"] = "migration_error";
    ErrorType["EXTENSION_ERROR"] = "extension_error";
    ErrorType["VALIDATION_ERROR"] = "validation_error";
    ErrorType["REGISTRY_ERROR"] = "registry_error";
    ErrorType["CONFIGURATION_ERROR"] = "configuration_error";
})(ErrorType || (exports.ErrorType = ErrorType = {}));
/**
 * Error severity levels
 */
var ErrorSeverity;
(function (ErrorSeverity) {
    ErrorSeverity["INFO"] = "info";
    ErrorSeverity["WARNING"] = "warning";
    ErrorSeverity["ERROR"] = "error";
    ErrorSeverity["CRITICAL"] = "critical";
})(ErrorSeverity || (exports.ErrorSeverity = ErrorSeverity = {}));
//# sourceMappingURL=error.js.map