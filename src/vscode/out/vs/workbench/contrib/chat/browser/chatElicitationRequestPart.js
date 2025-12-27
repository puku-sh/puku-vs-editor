/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../base/common/lifecycle.js';
import { observableValue } from '../../../../base/common/observable.js';
export class ChatElicitationRequestPart extends Disposable {
    constructor(title, message, subtitle, acceptButtonLabel, rejectButtonLabel, 
    // True when the primary action is accepted, otherwise the action that was selected
    _accept, reject, source, moreActions, onHide) {
        super();
        this.title = title;
        this.message = message;
        this.subtitle = subtitle;
        this.acceptButtonLabel = acceptButtonLabel;
        this.rejectButtonLabel = rejectButtonLabel;
        this._accept = _accept;
        this.source = source;
        this.moreActions = moreActions;
        this.onHide = onHide;
        this.kind = 'elicitation2';
        this.state = observableValue('state', "pending" /* ElicitationState.Pending */);
        this._isHiddenValue = observableValue('isHidden', false);
        this.isHidden = this._isHiddenValue;
        if (reject) {
            this.reject = async () => {
                const state = await reject();
                this.state.set(state, undefined);
            };
        }
    }
    accept(value) {
        return this._accept(value).then(state => {
            this.state.set(state, undefined);
        });
    }
    hide() {
        if (this._isHiddenValue.get()) {
            return;
        }
        this._isHiddenValue.set(true, undefined, undefined);
        this.onHide?.();
        this.dispose();
    }
    toJSON() {
        const state = this.state.get();
        return {
            kind: 'elicitationSerialized',
            title: this.title,
            message: this.message,
            state: state === "pending" /* ElicitationState.Pending */ ? "rejected" /* ElicitationState.Rejected */ : state,
            acceptedResult: this.acceptedResult,
            subtitle: this.subtitle,
            source: this.source,
            isHidden: this._isHiddenValue.get(),
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVsaWNpdGF0aW9uUmVxdWVzdFBhcnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL3BvcmlkaGkvZGV2ZWxvcG1lbnQvcHVrdS12cy1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdEVsaWNpdGF0aW9uUmVxdWVzdFBhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBZSxlQUFlLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUlyRixNQUFNLE9BQU8sMEJBQTJCLFNBQVEsVUFBVTtJQVN6RCxZQUNpQixLQUErQixFQUMvQixPQUFpQyxFQUNqQyxRQUFrQyxFQUNsQyxpQkFBeUIsRUFDekIsaUJBQXFDO0lBQ3JELG1GQUFtRjtJQUNsRSxPQUE2RCxFQUM5RSxNQUF3QyxFQUN4QixNQUF1QixFQUN2QixXQUF1QixFQUN2QixNQUFtQjtRQUVuQyxLQUFLLEVBQUUsQ0FBQztRQVpRLFVBQUssR0FBTCxLQUFLLENBQTBCO1FBQy9CLFlBQU8sR0FBUCxPQUFPLENBQTBCO1FBQ2pDLGFBQVEsR0FBUixRQUFRLENBQTBCO1FBQ2xDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBUTtRQUN6QixzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBRXBDLFlBQU8sR0FBUCxPQUFPLENBQXNEO1FBRTlELFdBQU0sR0FBTixNQUFNLENBQWlCO1FBQ3ZCLGdCQUFXLEdBQVgsV0FBVyxDQUFZO1FBQ3ZCLFdBQU0sR0FBTixNQUFNLENBQWE7UUFuQnBCLFNBQUksR0FBRyxjQUFjLENBQUM7UUFDL0IsVUFBSyxHQUFHLGVBQWUsQ0FBQyxPQUFPLDJDQUEyQixDQUFDO1FBR2pELG1CQUFjLEdBQUcsZUFBZSxDQUFVLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUM5RCxhQUFRLEdBQXlCLElBQUksQ0FBQyxjQUFjLENBQUM7UUFrQnBFLElBQUksTUFBTSxFQUFFLENBQUM7WUFDWixJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssSUFBSSxFQUFFO2dCQUN4QixNQUFNLEtBQUssR0FBRyxNQUFNLE1BQU8sRUFBRSxDQUFDO2dCQUM5QixJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDbEMsQ0FBQyxDQUFDO1FBQ0gsQ0FBQztJQUNGLENBQUM7SUFFRCxNQUFNLENBQUMsS0FBcUI7UUFDM0IsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUN2QyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDbEMsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsSUFBSTtRQUNILElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDO1lBQy9CLE9BQU87UUFDUixDQUFDO1FBQ0QsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUNwRCxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQztRQUNoQixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDaEIsQ0FBQztJQUVNLE1BQU07UUFDWixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBRS9CLE9BQU87WUFDTixJQUFJLEVBQUUsdUJBQXVCO1lBQzdCLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSztZQUNqQixPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU87WUFDckIsS0FBSyxFQUFFLEtBQUssNkNBQTZCLENBQUMsQ0FBQyw0Q0FBMkIsQ0FBQyxDQUFDLEtBQUs7WUFDN0UsY0FBYyxFQUFFLElBQUksQ0FBQyxjQUFjO1lBQ25DLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUTtZQUN2QixNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU07WUFDbkIsUUFBUSxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxFQUFFO1NBQ1MsQ0FBQztJQUMvQyxDQUFDO0NBQ0QifQ==