/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { language } from '../../../../base/common/platform.js';
export const ISpeechService = createDecorator('speechService');
export const HasSpeechProvider = new RawContextKey('hasSpeechProvider', false, { type: 'boolean', description: localize(12055, null) });
export const SpeechToTextInProgress = new RawContextKey('speechToTextInProgress', false, { type: 'boolean', description: localize(12056, null) });
export const TextToSpeechInProgress = new RawContextKey('textToSpeechInProgress', false, { type: 'boolean', description: localize(12057, null) });
export var SpeechToTextStatus;
(function (SpeechToTextStatus) {
    SpeechToTextStatus[SpeechToTextStatus["Started"] = 1] = "Started";
    SpeechToTextStatus[SpeechToTextStatus["Recognizing"] = 2] = "Recognizing";
    SpeechToTextStatus[SpeechToTextStatus["Recognized"] = 3] = "Recognized";
    SpeechToTextStatus[SpeechToTextStatus["Stopped"] = 4] = "Stopped";
    SpeechToTextStatus[SpeechToTextStatus["Error"] = 5] = "Error";
})(SpeechToTextStatus || (SpeechToTextStatus = {}));
export var TextToSpeechStatus;
(function (TextToSpeechStatus) {
    TextToSpeechStatus[TextToSpeechStatus["Started"] = 1] = "Started";
    TextToSpeechStatus[TextToSpeechStatus["Stopped"] = 2] = "Stopped";
    TextToSpeechStatus[TextToSpeechStatus["Error"] = 3] = "Error";
})(TextToSpeechStatus || (TextToSpeechStatus = {}));
export var KeywordRecognitionStatus;
(function (KeywordRecognitionStatus) {
    KeywordRecognitionStatus[KeywordRecognitionStatus["Recognized"] = 1] = "Recognized";
    KeywordRecognitionStatus[KeywordRecognitionStatus["Stopped"] = 2] = "Stopped";
    KeywordRecognitionStatus[KeywordRecognitionStatus["Canceled"] = 3] = "Canceled";
})(KeywordRecognitionStatus || (KeywordRecognitionStatus = {}));
export var AccessibilityVoiceSettingId;
(function (AccessibilityVoiceSettingId) {
    AccessibilityVoiceSettingId["SpeechTimeout"] = "accessibility.voice.speechTimeout";
    AccessibilityVoiceSettingId["AutoSynthesize"] = "accessibility.voice.autoSynthesize";
    AccessibilityVoiceSettingId["SpeechLanguage"] = "accessibility.voice.speechLanguage";
    AccessibilityVoiceSettingId["IgnoreCodeBlocks"] = "accessibility.voice.ignoreCodeBlocks";
})(AccessibilityVoiceSettingId || (AccessibilityVoiceSettingId = {}));
export const SPEECH_LANGUAGE_CONFIG = "accessibility.voice.speechLanguage" /* AccessibilityVoiceSettingId.SpeechLanguage */;
export const SPEECH_LANGUAGES = {
    ['da-DK']: {
        name: localize(12058, null)
    },
    ['de-DE']: {
        name: localize(12059, null)
    },
    ['en-AU']: {
        name: localize(12060, null)
    },
    ['en-CA']: {
        name: localize(12061, null)
    },
    ['en-GB']: {
        name: localize(12062, null)
    },
    ['en-IE']: {
        name: localize(12063, null)
    },
    ['en-IN']: {
        name: localize(12064, null)
    },
    ['en-NZ']: {
        name: localize(12065, null)
    },
    ['en-US']: {
        name: localize(12066, null)
    },
    ['es-ES']: {
        name: localize(12067, null)
    },
    ['es-MX']: {
        name: localize(12068, null)
    },
    ['fr-CA']: {
        name: localize(12069, null)
    },
    ['fr-FR']: {
        name: localize(12070, null)
    },
    ['hi-IN']: {
        name: localize(12071, null)
    },
    ['it-IT']: {
        name: localize(12072, null)
    },
    ['ja-JP']: {
        name: localize(12073, null)
    },
    ['ko-KR']: {
        name: localize(12074, null)
    },
    ['nl-NL']: {
        name: localize(12075, null)
    },
    ['pt-PT']: {
        name: localize(12076, null)
    },
    ['pt-BR']: {
        name: localize(12077, null)
    },
    ['ru-RU']: {
        name: localize(12078, null)
    },
    ['sv-SE']: {
        name: localize(12079, null)
    },
    ['tr-TR']: {
        // allow-any-unicode-next-line
        name: localize(12080, null)
    },
    ['zh-CN']: {
        name: localize(12081, null)
    },
    ['zh-HK']: {
        name: localize(12082, null)
    },
    ['zh-TW']: {
        name: localize(12083, null)
    }
};
export function speechLanguageConfigToLanguage(config, lang = language) {
    if (typeof config === 'string') {
        if (config === 'auto') {
            if (lang !== 'en') {
                const langParts = lang.split('-');
                return speechLanguageConfigToLanguage(`${langParts[0]}-${(langParts[1] ?? langParts[0]).toUpperCase()}`);
            }
        }
        else {
            if (SPEECH_LANGUAGES[config]) {
                return config;
            }
        }
    }
    return 'en-US';
}
//# sourceMappingURL=speechService.js.map