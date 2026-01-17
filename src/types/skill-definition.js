"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkillDependencyType = exports.SkillExtensionType = void 0;
/**
 * Extension types for skill definition
 */
var SkillExtensionType;
(function (SkillExtensionType) {
    SkillExtensionType["OVERRIDE"] = "override";
    SkillExtensionType["COMPOSE"] = "compose";
    SkillExtensionType["DECORATE"] = "decorate";
    SkillExtensionType["HOOK"] = "hook";
})(SkillExtensionType || (exports.SkillExtensionType = SkillExtensionType = {}));
/**
 * Dependency types for skill definition
 */
var SkillDependencyType;
(function (SkillDependencyType) {
    SkillDependencyType["SKILL"] = "skill";
    SkillDependencyType["LIBRARY"] = "library";
    SkillDependencyType["TOOL"] = "tool";
    SkillDependencyType["SERVICE"] = "service";
})(SkillDependencyType || (exports.SkillDependencyType = SkillDependencyType = {}));
//# sourceMappingURL=skill-definition.js.map