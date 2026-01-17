"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IssueSeverity = exports.IssueType = exports.AdaptationType = exports.MigrationStrategy = exports.PackageDependencyType = void 0;
/**
 * Dependency types for packages
 */
var PackageDependencyType;
(function (PackageDependencyType) {
    PackageDependencyType["RUNTIME"] = "runtime";
    PackageDependencyType["DEVELOPMENT"] = "development";
    PackageDependencyType["PEER"] = "peer";
    PackageDependencyType["OPTIONAL"] = "optional";
})(PackageDependencyType || (exports.PackageDependencyType = PackageDependencyType = {}));
/**
 * Migration strategies
 */
var MigrationStrategy;
(function (MigrationStrategy) {
    MigrationStrategy["CONSERVATIVE"] = "conservative";
    MigrationStrategy["AGGRESSIVE"] = "aggressive";
    MigrationStrategy["INTERACTIVE"] = "interactive";
})(MigrationStrategy || (exports.MigrationStrategy = MigrationStrategy = {}));
/**
 * Types of configuration adaptations
 */
var AdaptationType;
(function (AdaptationType) {
    AdaptationType["ENVIRONMENT_VARIABLE"] = "environment_variable";
    AdaptationType["PATH_MAPPING"] = "path_mapping";
    AdaptationType["DEPENDENCY_VERSION"] = "dependency_version";
    AdaptationType["CAPABILITY_SUBSTITUTION"] = "capability_substitution";
})(AdaptationType || (exports.AdaptationType = AdaptationType = {}));
/**
 * Types of compatibility issues
 */
var IssueType;
(function (IssueType) {
    IssueType["MISSING_DEPENDENCY"] = "missing_dependency";
    IssueType["VERSION_MISMATCH"] = "version_mismatch";
    IssueType["PLATFORM_INCOMPATIBILITY"] = "platform_incompatibility";
    IssueType["CAPABILITY_MISSING"] = "capability_missing";
    IssueType["CONFIGURATION_CONFLICT"] = "configuration_conflict";
})(IssueType || (exports.IssueType = IssueType = {}));
/**
 * Severity levels for issues
 */
var IssueSeverity;
(function (IssueSeverity) {
    IssueSeverity["INFO"] = "info";
    IssueSeverity["WARNING"] = "warning";
    IssueSeverity["ERROR"] = "error";
    IssueSeverity["CRITICAL"] = "critical";
})(IssueSeverity || (exports.IssueSeverity = IssueSeverity = {}));
//# sourceMappingURL=migration.js.map