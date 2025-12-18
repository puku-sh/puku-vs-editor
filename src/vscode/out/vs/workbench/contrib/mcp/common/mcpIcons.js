/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getMediaMime } from '../../../../base/common/mime.js';
import { URI } from '../../../../base/common/uri.js';
const mcpAllowableContentTypes = [
    'image/webp',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif'
];
var IconTheme;
(function (IconTheme) {
    IconTheme[IconTheme["Light"] = 0] = "Light";
    IconTheme[IconTheme["Dark"] = 1] = "Dark";
    IconTheme[IconTheme["Any"] = 2] = "Any";
})(IconTheme || (IconTheme = {}));
function validateIcon(icon, launch, logger) {
    const mimeType = icon.mimeType?.toLowerCase() || getMediaMime(icon.src);
    if (!mimeType || !mcpAllowableContentTypes.includes(mimeType)) {
        logger.debug(`Ignoring icon with unsupported mime type: ${icon.src} (${mimeType}), allowed: ${mcpAllowableContentTypes.join(', ')}`);
        return;
    }
    const uri = URI.parse(icon.src);
    if (uri.scheme === 'data') {
        return uri;
    }
    if (uri.scheme === 'https' || uri.scheme === 'http') {
        if (launch.type !== 2 /* McpServerTransportType.HTTP */) {
            logger.debug(`Ignoring icon with HTTP/HTTPS URL: ${icon.src} as the MCP server is not launched with HTTP transport.`);
            return;
        }
        const expectedAuthority = launch.uri.authority.toLowerCase();
        if (uri.authority.toLowerCase() !== expectedAuthority) {
            logger.debug(`Ignoring icon with untrusted authority: ${icon.src}, expected authority: ${expectedAuthority}`);
            return;
        }
        return uri;
    }
    if (uri.scheme === 'file') {
        if (launch.type !== 1 /* McpServerTransportType.Stdio */) {
            logger.debug(`Ignoring icon with file URL: ${icon.src} as the MCP server is not launched as a local process.`);
            return;
        }
        return uri;
    }
    logger.debug(`Ignoring icon with unsupported scheme: ${icon.src}. Allowed: data:, http:, https:, file:`);
    return;
}
export function parseAndValidateMcpIcon(icons, launch, logger) {
    const result = [];
    for (const icon of icons.icons || []) {
        const uri = validateIcon(icon, launch, logger);
        if (!uri) {
            continue;
        }
        const sizesArr = typeof icon.sizes === 'string' ? icon.sizes.split(' ') : Array.isArray(icon.sizes) ? icon.sizes : [];
        result.push({
            src: uri,
            theme: icon.theme === 'light' ? 0 /* IconTheme.Light */ : icon.theme === 'dark' ? 1 /* IconTheme.Dark */ : 2 /* IconTheme.Any */,
            sizes: sizesArr.map(size => {
                const [widthStr, heightStr] = size.toLowerCase().split('x');
                return { width: Number(widthStr) || 0, height: Number(heightStr) || 0 };
            }).sort((a, b) => a.width - b.width)
        });
    }
    result.sort((a, b) => a.sizes[0]?.width - b.sizes[0]?.width);
    return result;
}
export class McpIcons {
    static fromStored(icons) {
        return McpIcons.fromParsed(icons?.map(i => ({ src: URI.revive(i.src), theme: i.theme, sizes: i.sizes })));
    }
    static fromParsed(icons) {
        return new McpIcons(icons || []);
    }
    constructor(_icons) {
        this._icons = _icons;
    }
    getUrl(size) {
        const dark = this.getSizeWithTheme(size, 1 /* IconTheme.Dark */);
        if (dark?.theme === 2 /* IconTheme.Any */) {
            return { dark: dark.src };
        }
        const light = this.getSizeWithTheme(size, 0 /* IconTheme.Light */);
        if (!light && !dark) {
            return undefined;
        }
        return { dark: (dark || light).src, light: light?.src };
    }
    getSizeWithTheme(size, theme) {
        let bestOfAnySize;
        for (const icon of this._icons) {
            if (icon.theme === theme || icon.theme === 2 /* IconTheme.Any */ || icon.theme === undefined) { // undefined check for back compat
                bestOfAnySize = icon;
                const matchingSize = icon.sizes.find(s => s.width >= size);
                if (matchingSize) {
                    return { ...icon, sizes: [matchingSize] };
                }
            }
        }
        return bestOfAnySize;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwSWNvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL3BvcmlkaGkvZGV2ZWxvcG1lbnQvcHVrdS12cy1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tY3AvY29tbW9uL21jcEljb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFNckQsTUFBTSx3QkFBd0IsR0FBc0I7SUFDbkQsWUFBWTtJQUNaLFdBQVc7SUFDWCxZQUFZO0lBQ1osV0FBVztJQUNYLFdBQVc7Q0FDWCxDQUFDO0FBRUYsSUFBVyxTQUlWO0FBSkQsV0FBVyxTQUFTO0lBQ25CLDJDQUFLLENBQUE7SUFDTCx5Q0FBSSxDQUFBO0lBQ0osdUNBQUcsQ0FBQTtBQUNKLENBQUMsRUFKVSxTQUFTLEtBQVQsU0FBUyxRQUluQjtBQWVELFNBQVMsWUFBWSxDQUFDLElBQWMsRUFBRSxNQUF1QixFQUFFLE1BQWU7SUFDN0UsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsRUFBRSxXQUFXLEVBQUUsSUFBSSxZQUFZLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3hFLElBQUksQ0FBQyxRQUFRLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztRQUMvRCxNQUFNLENBQUMsS0FBSyxDQUFDLDZDQUE2QyxJQUFJLENBQUMsR0FBRyxLQUFLLFFBQVEsZUFBZSx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3JJLE9BQU87SUFDUixDQUFDO0lBRUQsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7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