/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class StaticServiceAccessor {
    constructor() {
        this.services = new Map();
    }
    withService(id, service) {
        this.services.set(id, service);
        return this;
    }
    get(id) {
        const value = this.services.get(id);
        if (!value) {
            throw new Error('Service does not exist');
        }
        return value;
    }
    getIfExists(id) {
        const value = this.services.get(id);
        return value;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWhhbWVkL0Rlc2t0b3AvcHVrdS12cy1lZGl0b3IvcHVrdS1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi93b3JkUGFydE9wZXJhdGlvbnMvdGVzdC9icm93c2VyL3V0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE1BQU0sT0FBTyxxQkFBcUI7SUFBbEM7UUFDUyxhQUFRLEdBQUcsSUFBSSxHQUFHLEVBQXVDLENBQUM7SUFtQm5FLENBQUM7SUFqQk8sV0FBVyxDQUFJLEVBQXdCLEVBQUUsT0FBVTtRQUN6RCxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDL0IsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRU0sR0FBRyxDQUFJLEVBQXdCO1FBQ3JDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3BDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNaLE1BQU0sSUFBSSxLQUFLLENBQUMsd0JBQXdCLENBQUMsQ0FBQztRQUMzQyxDQUFDO1FBQ0QsT0FBTyxLQUFVLENBQUM7SUFDbkIsQ0FBQztJQUVELFdBQVcsQ0FBSSxFQUF3QjtRQUN0QyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNwQyxPQUFPLEtBQXNCLENBQUM7SUFDL0IsQ0FBQztDQUNEIn0=