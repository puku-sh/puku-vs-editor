"use strict";
/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  VS Code-specific implementation of Puku Configuration Service
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.VsCodePukuConfigService = void 0;
const vscode = __importStar(require("vscode"));
const pukuConfig_1 = require("../common/pukuConfig");
const PUKU_API_ENDPOINT = 'https://api.puku.sh';
const CONFIG_ENDPOINT = `${PUKU_API_ENDPOINT}/v1/config`;
/**
 * VS Code-specific implementation of PukuConfigService
 * Fetches configuration from Puku backend API with authentication
 */
class VsCodePukuConfigService extends pukuConfig_1.PukuConfigService {
    constructor() {
        super(CONFIG_ENDPOINT);
    }
    /**
     * Get session token from VS Code workbench's Puku auth service
     */
    async _getSessionToken() {
        try {
            const result = await vscode.commands.executeCommand('_puku.getSessionToken');
            return result?.token;
        }
        catch (error) {
            console.error('[VsCodePukuConfigService] Error getting session token:', error);
            return undefined;
        }
    }
    async _fetchConfig() {
        try {
            // Get authentication token
            const token = await this._getSessionToken();
            if (!token) {
                console.warn('[PukuConfig] No authentication token available, using defaults');
                this._config = pukuConfig_1.DEFAULT_PUKU_CONFIG;
                return;
            }
            const response = await fetch(this._configEndpoint, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                console.warn(`[PukuConfig] Failed to fetch config (${response.status}), using defaults`);
                this._config = pukuConfig_1.DEFAULT_PUKU_CONFIG;
                return;
            }
            const data = await response.json();
            this._config = data;
            this._onDidChangeConfig.fire(this._config);
            console.log('[PukuConfig] Configuration loaded from server:', this._config);
        }
        catch (error) {
            console.error('[PukuConfig] Error fetching config:', error);
            this._config = pukuConfig_1.DEFAULT_PUKU_CONFIG;
        }
    }
}
exports.VsCodePukuConfigService = VsCodePukuConfigService;
//# sourceMappingURL=vscodePukuConfigService.js.map