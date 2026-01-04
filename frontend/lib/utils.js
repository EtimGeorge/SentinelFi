"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWBSColor = exports.formatCurrency = void 0;
// Maps WBS Level 1 to the defined Tailwind colors for charts/tree visualization
var WBS_COLOR_MAP = {
    '1': '#059669', // wbs-green
    '2': '#2563EB', // wbs-blue
    '3': '#FBBF24', // wbs-yellow
    '4': '#DB2777', // wbs-magenta
    '5': '#06B6D4', // wbs-cyan
    '6': '#DC2626', // wbs-red
    '7': '#7C3AED', // wbs-violet
    '8': '#EA580C', // wbs-orange
};
/**
 * Formats a number into a Nigerian Naira currency string.
 * @param amount The numeric amount.
 */
var formatCurrency = function (amount, currencyCode, includeSymbol) {
    if (currencyCode === void 0) { currencyCode = 'NGN'; }
    if (includeSymbol === void 0) { includeSymbol = true; }
    var locale = currencyCode === 'USD' ? 'en-US' : 'en-NG';
    var options = {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    };
    if (includeSymbol) {
        options.style = 'currency';
        options.currency = currencyCode;
    }
    else {
        options.style = 'decimal';
    }
    return new Intl.NumberFormat(locale, options).format(amount);
};
exports.formatCurrency = formatCurrency;
/**
 * Returns the brand-defined color for a given WBS code.
 * @param wbsCode The WBS code (e.g., '1.2.1').
 */
var getWBSColor = function (wbsCode) {
    var level1 = wbsCode.split('.')[0];
    return WBS_COLOR_MAP[level1] || WBS_COLOR_MAP['1']; // Default to green
};
exports.getWBSColor = getWBSColor;
/**
 * Converts raw rollup data into a format suitable for the WBS Tree display.
 * This is the functional equivalent of the full CTE query output.
 */
// The conversion logic is in the WBSHierarchyTree component for simplicity, but the types are here
