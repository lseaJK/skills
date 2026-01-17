"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncStatus = exports.SyncEvent = void 0;
/**
 * Synchronization event types
 */
var SyncEvent;
(function (SyncEvent) {
    SyncEvent["SYNC_STARTED"] = "syncStarted";
    SyncEvent["SYNC_COMPLETED"] = "syncCompleted";
    SyncEvent["SYNC_FAILED"] = "syncFailed";
    SyncEvent["SKILL_SYNCHRONIZED"] = "skillSynchronized";
    SyncEvent["CONFLICT_DETECTED"] = "conflictDetected";
    SyncEvent["STATUS_CHANGED"] = "statusChanged";
})(SyncEvent || (exports.SyncEvent = SyncEvent = {}));
/**
 * Synchronization status
 */
var SyncStatus;
(function (SyncStatus) {
    SyncStatus["IDLE"] = "idle";
    SyncStatus["SYNCING"] = "syncing";
    SyncStatus["ERROR"] = "error";
    SyncStatus["CONFLICT"] = "conflict";
})(SyncStatus || (exports.SyncStatus = SyncStatus = {}));
//# sourceMappingURL=sync.js.map