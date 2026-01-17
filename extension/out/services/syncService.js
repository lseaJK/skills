"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SynchronizationService = void 0;
const events_1 = require("events");
const sync_1 = require("../types/sync");
/**
 * Simplified synchronization service for VS Code extension
 */
class SynchronizationService extends events_1.EventEmitter {
    constructor(registry, config) {
        super();
        this.registry = registry;
        this.config = config;
        this.status = sync_1.SyncStatus.IDLE;
        this.watchedSkills = new Map(); // skillId -> hash
        this.conflicts = new Map();
        this.setupAutoSync();
    }
    /**
     * Get current synchronization status
     */
    getStatus() {
        return this.status;
    }
    /**
     * Get last synchronization time
     */
    getLastSyncTime() {
        return this.lastSyncTime;
    }
    /**
     * Get current conflicts
     */
    getConflicts() {
        return Array.from(this.conflicts.values());
    }
    /**
     * Start monitoring skills for changes
     */
    async startMonitoring() {
        const skills = await this.registry.list();
        // Initialize watched skills with their current hashes
        for (const skill of skills) {
            const hash = this.calculateSkillHash(skill);
            this.watchedSkills.set(skill.id, hash);
        }
        this.emit(sync_1.SyncEvent.STATUS_CHANGED, this.status);
    }
    /**
     * Stop monitoring skills
     */
    stopMonitoring() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = undefined;
        }
        this.watchedSkills.clear();
    }
    /**
     * Manually trigger synchronization
     */
    async synchronize() {
        if (this.status === sync_1.SyncStatus.SYNCING) {
            throw new Error('Synchronization already in progress');
        }
        this.setStatus(sync_1.SyncStatus.SYNCING);
        this.emit(sync_1.SyncEvent.SYNC_STARTED);
        try {
            const result = await this.performSync();
            this.lastSyncTime = new Date();
            this.setStatus(result.conflicts.length > 0 ? sync_1.SyncStatus.CONFLICT : sync_1.SyncStatus.IDLE);
            this.emit(sync_1.SyncEvent.SYNC_COMPLETED, result);
            return result;
        }
        catch (error) {
            this.setStatus(sync_1.SyncStatus.ERROR);
            const errorResult = {
                success: false,
                syncedSkills: [],
                conflicts: [],
                errors: [error instanceof Error ? error.message : String(error)],
                timestamp: new Date()
            };
            this.emit(sync_1.SyncEvent.SYNC_FAILED, errorResult);
            return errorResult;
        }
    }
    /**
     * Detect changes in skills since last sync
     */
    async detectChanges() {
        const changedSkills = [];
        const currentSkills = await this.registry.list();
        // Check for modified skills
        for (const skill of currentSkills) {
            const currentHash = this.calculateSkillHash(skill);
            const previousHash = this.watchedSkills.get(skill.id);
            if (!previousHash || previousHash !== currentHash) {
                changedSkills.push(skill.id);
                this.watchedSkills.set(skill.id, currentHash);
            }
        }
        // Check for deleted skills
        for (const [skillId] of this.watchedSkills) {
            const exists = currentSkills.some(skill => skill.id === skillId);
            if (!exists) {
                changedSkills.push(skillId);
                this.watchedSkills.delete(skillId);
            }
        }
        return changedSkills;
    }
    /**
     * Resolve a synchronization conflict
     */
    async resolveConflict(skillId, resolution) {
        const conflict = this.conflicts.get(skillId);
        if (!conflict) {
            throw new Error(`No conflict found for skill: ${skillId}`);
        }
        conflict.resolution = resolution;
        try {
            await this.applyConflictResolution(conflict);
            this.conflicts.delete(skillId);
            // Update status if no more conflicts
            if (this.conflicts.size === 0 && this.status === sync_1.SyncStatus.CONFLICT) {
                this.setStatus(sync_1.SyncStatus.IDLE);
            }
        }
        catch (error) {
            throw new Error(`Failed to resolve conflict for ${skillId}: ${error}`);
        }
    }
    /**
     * Update synchronization configuration
     */
    updateConfiguration(newConfig) {
        this.config = { ...this.config, ...newConfig };
        // Restart auto-sync if interval changed
        if (newConfig.autoSync !== undefined || newConfig.syncInterval !== undefined) {
            this.setupAutoSync();
        }
    }
    /**
     * Get synchronization statistics
     */
    getStatistics() {
        return {
            totalSkills: this.watchedSkills.size,
            watchedSkills: this.watchedSkills.size,
            conflicts: this.conflicts.size,
            lastSyncTime: this.lastSyncTime,
            status: this.status
        };
    }
    /**
     * Setup automatic synchronization
     */
    setupAutoSync() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
        }
        if (this.config.autoSync && this.config.syncInterval > 0) {
            this.syncTimer = setInterval(async () => {
                try {
                    const changes = await this.detectChanges();
                    if (changes.length > 0) {
                        await this.synchronize();
                    }
                }
                catch (error) {
                    console.error('Auto-sync failed:', error);
                }
            }, this.config.syncInterval);
        }
    }
    /**
     * Perform the actual synchronization
     */
    async performSync() {
        const syncedSkills = [];
        const conflicts = [];
        const errors = [];
        try {
            // Detect changes
            const changedSkills = await this.detectChanges();
            // Process each changed skill
            for (const skillId of changedSkills) {
                try {
                    const skill = await this.registry.resolve(skillId);
                    // Simulate conflict detection (in real implementation, this would check against remote)
                    const hasConflict = await this.checkForConflicts(skill);
                    if (hasConflict) {
                        const conflict = await this.createConflict(skill);
                        conflicts.push(conflict);
                        this.conflicts.set(skillId, conflict);
                        this.emit(sync_1.SyncEvent.CONFLICT_DETECTED, conflict);
                    }
                    else {
                        // Synchronize the skill
                        await this.syncSkill(skill);
                        syncedSkills.push(skillId);
                        this.emit(sync_1.SyncEvent.SKILL_SYNCHRONIZED, skill);
                    }
                }
                catch (error) {
                    const errorMessage = `Failed to sync skill ${skillId}: ${error}`;
                    errors.push(errorMessage);
                    console.error(errorMessage);
                }
            }
            return {
                success: errors.length === 0,
                syncedSkills,
                conflicts,
                errors,
                timestamp: new Date()
            };
        }
        catch (error) {
            throw new Error(`Synchronization failed: ${error}`);
        }
    }
    /**
     * Check for conflicts with a skill
     */
    async checkForConflicts(skill) {
        // In a real implementation, this would check against a remote registry
        // For now, we'll simulate conflict detection based on dependencies
        const dependentSkills = await this.registry.getDependentSkills(skill.id);
        // Simulate conflict if skill has dependents and version changed
        return dependentSkills.length > 0 && Math.random() < 0.1; // 10% chance of conflict
    }
    /**
     * Create a conflict object
     */
    async createConflict(skill) {
        return {
            skillId: skill.id,
            type: 'version',
            localVersion: skill.version,
            remoteVersion: this.generateRemoteVersion(skill.version),
            description: `Version conflict detected for skill ${skill.name}`
        };
    }
    /**
     * Synchronize a single skill
     */
    async syncSkill(skill) {
        // In a real implementation, this would sync with remote registry
        // For now, we'll just update the local hash
        const hash = this.calculateSkillHash(skill);
        this.watchedSkills.set(skill.id, hash);
    }
    /**
     * Apply conflict resolution
     */
    async applyConflictResolution(conflict) {
        switch (conflict.resolution) {
            case 'local':
                // Keep local version - no action needed
                break;
            case 'remote':
                // Update to remote version - simulate by updating version
                const skill = await this.registry.resolve(conflict.skillId);
                skill.version = conflict.remoteVersion;
                await this.registry.update(conflict.skillId, skill);
                break;
            case 'merge':
                // Merge versions - simplified implementation
                const mergedSkill = await this.registry.resolve(conflict.skillId);
                mergedSkill.version = this.mergeVersions(conflict.localVersion, conflict.remoteVersion);
                await this.registry.update(conflict.skillId, mergedSkill);
                break;
        }
    }
    /**
     * Calculate hash for a skill to detect changes
     */
    calculateSkillHash(skill) {
        const content = JSON.stringify({
            id: skill.id,
            version: skill.version,
            description: skill.description,
            invocationSpec: skill.invocationSpec,
            dependencies: skill.dependencies,
            updated: skill.metadata.updated
        });
        // Simple hash function (in production, use a proper hash library)
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }
    /**
     * Generate a simulated remote version
     */
    generateRemoteVersion(localVersion) {
        const parts = localVersion.split('.');
        const patch = parseInt(parts[2] || '0') + 1;
        return `${parts[0]}.${parts[1]}.${patch}`;
    }
    /**
     * Merge two versions (simplified)
     */
    mergeVersions(local, remote) {
        const localParts = local.split('.').map(Number);
        const remoteParts = remote.split('.').map(Number);
        // Take the higher version for each part
        const merged = [
            Math.max(localParts[0] || 0, remoteParts[0] || 0),
            Math.max(localParts[1] || 0, remoteParts[1] || 0),
            Math.max(localParts[2] || 0, remoteParts[2] || 0)
        ];
        return merged.join('.');
    }
    /**
     * Set status and emit change event
     */
    setStatus(status) {
        if (this.status !== status) {
            this.status = status;
            this.emit(sync_1.SyncEvent.STATUS_CHANGED, status);
        }
    }
    /**
     * Dispose of resources
     */
    dispose() {
        this.stopMonitoring();
        this.removeAllListeners();
    }
}
exports.SynchronizationService = SynchronizationService;
//# sourceMappingURL=syncService.js.map