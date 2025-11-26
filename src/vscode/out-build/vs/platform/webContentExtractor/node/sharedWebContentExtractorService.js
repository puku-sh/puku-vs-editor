/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { VSBuffer } from '../../../base/common/buffer.js';
export class SharedWebContentExtractorService {
    async readImage(uri, token) {
        if (token.isCancellationRequested) {
            return undefined;
        }
        try {
            const response = await fetch(uri.toString(true), {
                headers: {
                    'Accept': 'image/*',
                    'User-Agent': 'Mozilla/5.0'
                }
            });
            const contentType = response.headers.get('content-type');
            if (!response.ok || !contentType?.startsWith('image/') || !/(webp|jpg|jpeg|gif|png|bmp)$/i.test(contentType)) {
                return undefined;
            }
            const content = VSBuffer.wrap(await response /* workaround https://github.com/microsoft/TypeScript/issues/61826 */.bytes());
            return content;
        }
        catch (err) {
            console.log(err);
            return undefined;
        }
    }
}
//# sourceMappingURL=sharedWebContentExtractorService.js.map