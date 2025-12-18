/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// Primary workbench contribution
import './browser/terminal.contribution.js';
// Misc extensions to the workbench contribution
import './common/environmentVariable.contribution.js';
import './common/terminalExtensionPoints.contribution.js';
import './browser/terminalView.js';
// Terminal contributions - Standalone extensions to the terminal, these cannot be imported from the
// primary workbench contribution)
import '../terminalContrib/accessibility/browser/terminal.accessibility.contribution.js';
import '../terminalContrib/autoReplies/browser/terminal.autoReplies.contribution.js';
import '../terminalContrib/chatAgentTools/browser/terminal.chatAgentTools.contribution.js';
import '../terminalContrib/developer/browser/terminal.developer.contribution.js';
import '../terminalContrib/environmentChanges/browser/terminal.environmentChanges.contribution.js';
import '../terminalContrib/find/browser/terminal.find.contribution.js';
import '../terminalContrib/chat/browser/terminal.chat.contribution.js';
import '../terminalContrib/commandGuide/browser/terminal.commandGuide.contribution.js';
import '../terminalContrib/history/browser/terminal.history.contribution.js';
import '../terminalContrib/links/browser/terminal.links.contribution.js';
import '../terminalContrib/zoom/browser/terminal.zoom.contribution.js';
import '../terminalContrib/stickyScroll/browser/terminal.stickyScroll.contribution.js';
import '../terminalContrib/quickAccess/browser/terminal.quickAccess.contribution.js';
import '../terminalContrib/quickFix/browser/terminal.quickFix.contribution.js';
import '../terminalContrib/typeAhead/browser/terminal.typeAhead.contribution.js';
import '../terminalContrib/sendSequence/browser/terminal.sendSequence.contribution.js';
import '../terminalContrib/sendSignal/browser/terminal.sendSignal.contribution.js';
import '../terminalContrib/suggest/browser/terminal.suggest.contribution.js';
import '../terminalContrib/chat/browser/terminal.initialHint.contribution.js';
import '../terminalContrib/wslRecommendation/browser/terminal.wslRecommendation.contribution.js';
import '../terminalContrib/voice/browser/terminal.voice.contribution.js';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuYWxsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9wb3JpZGhpL2RldmVsb3BtZW50L3B1a3UtdnMtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvdGVybWluYWwuYWxsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLGlDQUFpQztBQUNqQyxPQUFPLG9DQUFvQyxDQUFDO0FBRTVDLGdEQUFnRDtBQUNoRCxPQUFPLDhDQUE4QyxDQUFDO0FBQ3RELE9BQU8sa0RBQWtELENBQUM7QUFDMUQsT0FBTywyQkFBMkIsQ0FBQztBQUVuQyxvR0FBb0c7QUFDcEcsa0NBQWtDO0FBQ2xDLE9BQU8saUZBQWlGLENBQUM7QUFDekYsT0FBTyw2RUFBNkUsQ0FBQztBQUNyRixPQUFPLG1GQUFtRixDQUFDO0FBQzNGLE9BQU8seUVBQXlFLENBQUM7QUFDakYsT0FBTywyRkFBMkYsQ0FBQztBQUNuRyxPQUFPLCtEQUErRCxDQUFDO0FBQ3ZFLE9BQU8sK0RBQStELENBQUM7QUFDdkUsT0FBTywrRUFBK0UsQ0FBQztBQUN2RixPQUFPLHFFQUFxRSxDQUFDO0FBQzdFLE9BQU8saUVBQWlFLENBQUM7QUFDekUsT0FBTywrREFBK0QsQ0FBQztBQUN2RSxPQUFPLCtFQUErRSxDQUFDO0FBQ3ZGLE9BQU8sNkVBQTZFLENBQUM7QUFDckYsT0FBTyx1RUFBdUUsQ0FBQztBQUMvRSxPQUFPLHlFQUF5RSxDQUFDO0FBQ2pGLE9BQU8sK0VBQStFLENBQUM7QUFDdkYsT0FBTywyRUFBMkUsQ0FBQztBQUNuRixPQUFPLHFFQUFxRSxDQUFDO0FBQzdFLE9BQU8sc0VBQXNFLENBQUM7QUFDOUUsT0FBTyx5RkFBeUYsQ0FBQztBQUNqRyxPQUFPLGlFQUFpRSxDQUFDIn0=