"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProxiedSimulationEndpointHealth = exports.SimulationEndpointHealthImpl = exports.ISimulationEndpointHealth = void 0;
const services_1 = require("../../src/util/common/services");
exports.ISimulationEndpointHealth = (0, services_1.createServiceIdentifier)('ISimulationEndpointHealth');
class SimulationEndpointHealthImpl {
    constructor() {
        this.failures = [];
    }
    markFailure(testInfo, request) {
        this.failures.push({ testInfo, request });
    }
}
exports.SimulationEndpointHealthImpl = SimulationEndpointHealthImpl;
class ProxiedSimulationEndpointHealth {
    static registerTo(instance, rpc) {
        rpc.registerMethod('ProxiedSimulationEndpointHealth.markFailure', ({ testInfo, request }) => {
            instance.markFailure(testInfo, request);
        });
        return instance;
    }
    constructor(rpc) {
        this.rpc = rpc;
        this.failures = [];
    }
    markFailure(testInfo, request) {
        this.failures.push({ testInfo, request });
        this.rpc.callMethod('ProxiedSimulationEndpointHealth.markFailure', { testInfo, request });
    }
}
exports.ProxiedSimulationEndpointHealth = ProxiedSimulationEndpointHealth;
//# sourceMappingURL=simulationEndpointHealth.js.map