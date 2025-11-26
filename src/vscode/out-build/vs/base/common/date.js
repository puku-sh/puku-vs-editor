/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../nls.js';
import { Lazy } from './lazy.js';
import { LANGUAGE_DEFAULT } from './platform.js';
const minute = 60;
const hour = minute * 60;
const day = hour * 24;
const week = day * 7;
const month = day * 30;
const year = day * 365;
/**
 * Create a localized difference of the time between now and the specified date.
 * @param date The date to generate the difference from.
 * @param appendAgoLabel Whether to append the " ago" to the end.
 * @param useFullTimeWords Whether to use full words (eg. seconds) instead of
 * shortened (eg. secs).
 * @param disallowNow Whether to disallow the string "now" when the difference
 * is less than 30 seconds.
 */
export function fromNow(date, appendAgoLabel, useFullTimeWords, disallowNow) {
    if (typeof date !== 'number') {
        date = date.getTime();
    }
    const seconds = Math.round((new Date().getTime() - date) / 1000);
    if (seconds < -30) {
        return localize(45, null, fromNow(new Date().getTime() + seconds * 1000, false));
    }
    if (!disallowNow && seconds < 30) {
        return localize(46, null);
    }
    let value;
    if (seconds < minute) {
        value = seconds;
        if (appendAgoLabel) {
            if (value === 1) {
                return useFullTimeWords
                    ? localize(47, null, value)
                    : localize(48, null, value);
            }
            else {
                return useFullTimeWords
                    ? localize(49, null, value)
                    : localize(50, null, value);
            }
        }
        else {
            if (value === 1) {
                return useFullTimeWords
                    ? localize(51, null, value)
                    : localize(52, null, value);
            }
            else {
                return useFullTimeWords
                    ? localize(53, null, value)
                    : localize(54, null, value);
            }
        }
    }
    if (seconds < hour) {
        value = Math.floor(seconds / minute);
        if (appendAgoLabel) {
            if (value === 1) {
                return useFullTimeWords
                    ? localize(55, null, value)
                    : localize(56, null, value);
            }
            else {
                return useFullTimeWords
                    ? localize(57, null, value)
                    : localize(58, null, value);
            }
        }
        else {
            if (value === 1) {
                return useFullTimeWords
                    ? localize(59, null, value)
                    : localize(60, null, value);
            }
            else {
                return useFullTimeWords
                    ? localize(61, null, value)
                    : localize(62, null, value);
            }
        }
    }
    if (seconds < day) {
        value = Math.floor(seconds / hour);
        if (appendAgoLabel) {
            if (value === 1) {
                return useFullTimeWords
                    ? localize(63, null, value)
                    : localize(64, null, value);
            }
            else {
                return useFullTimeWords
                    ? localize(65, null, value)
                    : localize(66, null, value);
            }
        }
        else {
            if (value === 1) {
                return useFullTimeWords
                    ? localize(67, null, value)
                    : localize(68, null, value);
            }
            else {
                return useFullTimeWords
                    ? localize(69, null, value)
                    : localize(70, null, value);
            }
        }
    }
    if (seconds < week) {
        value = Math.floor(seconds / day);
        if (appendAgoLabel) {
            return value === 1
                ? localize(71, null, value)
                : localize(72, null, value);
        }
        else {
            return value === 1
                ? localize(73, null, value)
                : localize(74, null, value);
        }
    }
    if (seconds < month) {
        value = Math.floor(seconds / week);
        if (appendAgoLabel) {
            if (value === 1) {
                return useFullTimeWords
                    ? localize(75, null, value)
                    : localize(76, null, value);
            }
            else {
                return useFullTimeWords
                    ? localize(77, null, value)
                    : localize(78, null, value);
            }
        }
        else {
            if (value === 1) {
                return useFullTimeWords
                    ? localize(79, null, value)
                    : localize(80, null, value);
            }
            else {
                return useFullTimeWords
                    ? localize(81, null, value)
                    : localize(82, null, value);
            }
        }
    }
    if (seconds < year) {
        value = Math.floor(seconds / month);
        if (appendAgoLabel) {
            if (value === 1) {
                return useFullTimeWords
                    ? localize(83, null, value)
                    : localize(84, null, value);
            }
            else {
                return useFullTimeWords
                    ? localize(85, null, value)
                    : localize(86, null, value);
            }
        }
        else {
            if (value === 1) {
                return useFullTimeWords
                    ? localize(87, null, value)
                    : localize(88, null, value);
            }
            else {
                return useFullTimeWords
                    ? localize(89, null, value)
                    : localize(90, null, value);
            }
        }
    }
    value = Math.floor(seconds / year);
    if (appendAgoLabel) {
        if (value === 1) {
            return useFullTimeWords
                ? localize(91, null, value)
                : localize(92, null, value);
        }
        else {
            return useFullTimeWords
                ? localize(93, null, value)
                : localize(94, null, value);
        }
    }
    else {
        if (value === 1) {
            return useFullTimeWords
                ? localize(95, null, value)
                : localize(96, null, value);
        }
        else {
            return useFullTimeWords
                ? localize(97, null, value)
                : localize(98, null, value);
        }
    }
}
export function fromNowByDay(date, appendAgoLabel, useFullTimeWords) {
    if (typeof date !== 'number') {
        date = date.getTime();
    }
    const todayMidnightTime = new Date();
    todayMidnightTime.setHours(0, 0, 0, 0);
    const yesterdayMidnightTime = new Date(todayMidnightTime.getTime());
    yesterdayMidnightTime.setDate(yesterdayMidnightTime.getDate() - 1);
    if (date > todayMidnightTime.getTime()) {
        return localize(99, null);
    }
    if (date > yesterdayMidnightTime.getTime()) {
        return localize(100, null);
    }
    return fromNow(date, appendAgoLabel, useFullTimeWords);
}
/**
 * Gets a readable duration with intelligent/lossy precision. For example "40ms" or "3.040s")
 * @param ms The duration to get in milliseconds.
 * @param useFullTimeWords Whether to use full words (eg. seconds) instead of
 * shortened (eg. secs).
 */
export function getDurationString(ms, useFullTimeWords) {
    const seconds = Math.abs(ms / 1000);
    if (seconds < 1) {
        return useFullTimeWords
            ? localize(101, null, ms)
            : localize(102, null, ms);
    }
    if (seconds < minute) {
        return useFullTimeWords
            ? localize(103, null, Math.round(ms) / 1000)
            : localize(104, null, Math.round(ms) / 1000);
    }
    if (seconds < hour) {
        return useFullTimeWords
            ? localize(105, null, Math.round(ms / (1000 * minute)))
            : localize(106, null, Math.round(ms / (1000 * minute)));
    }
    if (seconds < day) {
        return useFullTimeWords
            ? localize(107, null, Math.round(ms / (1000 * hour)))
            : localize(108, null, Math.round(ms / (1000 * hour)));
    }
    return localize(109, null, Math.round(ms / (1000 * day)));
}
export function toLocalISOString(date) {
    return date.getFullYear() +
        '-' + String(date.getMonth() + 1).padStart(2, '0') +
        '-' + String(date.getDate()).padStart(2, '0') +
        'T' + String(date.getHours()).padStart(2, '0') +
        ':' + String(date.getMinutes()).padStart(2, '0') +
        ':' + String(date.getSeconds()).padStart(2, '0') +
        '.' + (date.getMilliseconds() / 1000).toFixed(3).slice(2, 5) +
        'Z';
}
export const safeIntl = {
    DateTimeFormat(locales, options) {
        return new Lazy(() => {
            try {
                return new Intl.DateTimeFormat(locales, options);
            }
            catch {
                return new Intl.DateTimeFormat(undefined, options);
            }
        });
    },
    Collator(locales, options) {
        return new Lazy(() => {
            try {
                return new Intl.Collator(locales, options);
            }
            catch {
                return new Intl.Collator(undefined, options);
            }
        });
    },
    Segmenter(locales, options) {
        return new Lazy(() => {
            try {
                return new Intl.Segmenter(locales, options);
            }
            catch {
                return new Intl.Segmenter(undefined, options);
            }
        });
    },
    Locale(tag, options) {
        return new Lazy(() => {
            try {
                return new Intl.Locale(tag, options);
            }
            catch {
                return new Intl.Locale(LANGUAGE_DEFAULT, options);
            }
        });
    },
    NumberFormat(locales, options) {
        return new Lazy(() => {
            try {
                return new Intl.NumberFormat(locales, options);
            }
            catch {
                return new Intl.NumberFormat(undefined, options);
            }
        });
    }
};
//# sourceMappingURL=date.js.map