"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const outdent_1 = require("outdent");
const vitest_1 = require("vitest");
const parserImpl_1 = require("../../node/parserImpl");
const treeSitterLanguages_1 = require("../../node/treeSitterLanguages");
const getStructure_util_1 = require("./getStructure.util");
(0, vitest_1.describe)('getStructure - cpp', () => {
    (0, vitest_1.afterAll)(() => (0, parserImpl_1._dispose)());
    function cppStruct(source) {
        return (0, getStructure_util_1.srcWithAnnotatedStructure)(treeSitterLanguages_1.WASMLanguage.Cpp, source);
    }
    (0, vitest_1.test)('source with different syntax constructs', async () => {
        const filename = 'test.cpp';
        const source = await (0, getStructure_util_1.fromFixture)(filename);
        await (0, vitest_1.expect)(await cppStruct(source)).toMatchFileSnapshot((0, getStructure_util_1.snapshotPathInFixture)(filename));
    });
    (0, vitest_1.test)('do not throw invalid range error', async () => {
        const filename = 'problem1.cpp';
        const source = await (0, getStructure_util_1.fromFixture)(filename);
        await (0, vitest_1.expect)(await cppStruct(source)).toMatchFileSnapshot((0, getStructure_util_1.snapshotPathInFixture)(filename));
    });
    (0, vitest_1.test)('do not throw invalid range error - 2', async () => {
        const source = (0, outdent_1.outdent) `
			void main() {
				// Trigger servo movement based on the difference
				if (remappedDifference > 0) {
					Serial.println("Turning clockwise...");
					controlServo(SERVO_CW); // Spin the servo clockwise
				} else if (remappedDifference < 0) {
					Serial.println("Turning counterclockwise...");
					controlServo(SERVO_CCW); // Spin the servo counterclockwise
				} /* else {
					Serial.println("Stopping servo...");
					controlServo(SERVO_STOP); // Stop the servo if the difference is zero
				} */
			}
		`;
        (0, vitest_1.expect)(await cppStruct(source)).toMatchInlineSnapshot(`
			"<FUNCTION_DEFINITION>void main() {
			<COMMENT>	// Trigger servo movement based on the difference
			</COMMENT><IF_STATEMENT>	if (remappedDifference > 0) {
			<EXPRESSION_STATEMENT>		Serial.println("Turning clockwise...");
			</EXPRESSION_STATEMENT><EXPRESSION_STATEMENT-1>		controlServo(SERVO_CW); // Spin the servo clockwise
			</EXPRESSION_STATEMENT-1>	} else<IF_STATEMENT-1> if (remappedDifference < 0) {
			<EXPRESSION_STATEMENT-2>		Serial.println("Turning counterclockwise...");
			</EXPRESSION_STATEMENT-2><EXPRESSION_STATEMENT-3>		controlServo(SERVO_CCW); // Spin the servo counterclockwise
			</EXPRESSION_STATEMENT-3>	}</IF_STATEMENT-1> /* else {
					Serial.println("Stopping servo...");
					controlServo(SERVO_STOP); // Stop the servo if the difference is zero
				} */
			</IF_STATEMENT>}</FUNCTION_DEFINITION>"
		`);
    });
    (0, vitest_1.test)('trailing semicolon after class declaration', async () => {
        const source = `class A {};`;
        (0, vitest_1.expect)(await cppStruct(source)).toMatchInlineSnapshot(`"<CLASS_SPECIFIER>class A {};</CLASS_SPECIFIER>"`);
    });
});
//# sourceMappingURL=getStructure.cpp.spec.js.map