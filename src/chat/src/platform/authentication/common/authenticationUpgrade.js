"use strict";
/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Stub implementation - GitHub authentication upgrade removed
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthenticationChatUpgradeService = exports.IAuthenticationChatUpgradeService = void 0;
const services_1 = require("../../../util/common/services");
exports.IAuthenticationChatUpgradeService = (0, services_1.createServiceIdentifier)('IAuthenticationChatUpgradeService');
/**
 * Stub implementation - GitHub authentication upgrade functionality removed
 * All methods return false/no-op since GitHub auth is disabled
 */
class AuthenticationChatUpgradeService {
    async shouldRequestPermissiveSessionUpgrade() {
        // GitHub auth upgrade removed - always return false
        return false;
    }
    async showPermissiveSessionModal(_force) {
        // GitHub auth upgrade removed - always return false
        return false;
    }
}
exports.AuthenticationChatUpgradeService = AuthenticationChatUpgradeService;
//# sourceMappingURL=authenticationUpgrade.js.map