"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResolutionStrategy = exports.ConflictSeverity = exports.ConflictType = exports.ExtensionType = void 0;
/**
 * Extension types
 */
var ExtensionType;
(function (ExtensionType) {
    ExtensionType["OVERRIDE"] = "override";
    ExtensionType["COMPOSE"] = "compose";
    ExtensionType["DECORATE"] = "decorate";
})(ExtensionType || (exports.ExtensionType = ExtensionType = {}));
/**
 * Types of extension conflicts
 */
var ConflictType;
(function (ConflictType) {
    ConflictType["PRIORITY_CONFLICT"] = "priority_conflict";
    ConflictType["INTERFACE_CONFLICT"] = "interface_conflict";
    ConflictType["DEPENDENCY_CONFLICT"] = "dependency_conflict";
    ConflictType["VERSION_CONFLICT"] = "version_conflict";
})(ConflictType || (exports.ConflictType = ConflictType = {}));
/**
 * Severity levels for conflicts
 */
var ConflictSeverity;
(function (ConflictSeverity) {
    ConflictSeverity["LOW"] = "low";
    ConflictSeverity["MEDIUM"] = "medium";
    ConflictSeverity["HIGH"] = "high";
    ConflictSeverity["CRITICAL"] = "critical";
})(ConflictSeverity || (exports.ConflictSeverity = ConflictSeverity = {}));
/**
 * Strategies for resolving conflicts
 */
var ResolutionStrategy;
(function (ResolutionStrategy) {
    ResolutionStrategy["PRIORITY_BASED"] = "priority_based";
    ResolutionStrategy["USER_CHOICE"] = "user_choice";
    ResolutionStrategy["AUTOMATIC"] = "automatic";
    ResolutionStrategy["DISABLE_CONFLICTING"] = "disable_conflicting";
})(ResolutionStrategy || (exports.ResolutionStrategy = ResolutionStrategy = {}));
//# sourceMappingURL=extension.js.map