/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *  Next Edit Suggestions Service Registration
 *--------------------------------------------------------------------------------------------*/

import { registerSingleton, InstantiationType, IInstantiationService } from '../../../platform/instantiation/common/extensions';
import { PukuNesNextEditProvider } from '../pukuai/vscode-node/nextEdit/pukuNesNextEditProvider';
import { PukuNextEditManager } from '../pukuai/vscode-node/nextEdit/pukuNextEditManager';
import { PukuFimNextEditProvider } from '../pukuai/vscode-node/nextEdit/pukuFimNextEditProvider';
import { IPukuAuthService } from '../pukuIndexing/common/pukuAuth';
import { IPukuConfigService } from '../pukuIndexing/common/pukuConfig';
import { IFetcherService } from '../../../platform/networking/common/fetcherService';
import { ILogService } from '../../../platform/log/common/logService';
import { IEditorService } from '../pukuai/editor/common/editorService';

// Register NES services
registerSingleton(PukuNextEditManager, InstantiationType.Eager);
registerSingleton(PukuNesNextEditProvider, InstantiationType.Delayed);
registerSingleton(PukuFimNextEditProvider, InstantiationType.Delayed);

// Register the enhanced inline completion provider
registerSingleton(IPukuInlineCompletionProvider, PukuEnhancedInlineCompletionProvider);

export function registerNextEditServices(instantiationService: IInstantiationService): void {
	// Services are already registered through the decorators above
	// This function can be used for any additional setup if needed
}