/**
 * Returns a color string based on the WBS code prefix.
 * This can be used to visually distinguish top-level WBS categories.
 * @param wbsCodePrefix The prefix of the WBS code (e.g., "1", "1.1").
 * @returns A hex color string.
 */
export const getWBSColor = (wbsCodePrefix: string): string => {
  const firstDigit = wbsCodePrefix.split('.')[0];
  switch (firstDigit) {
    case '1': return '#60A5FA'; // Tailwind blue-400
    case '2': return '#34D399'; // Tailwind emerald-400
    case '3': return '#FACC15'; // Tailwind yellow-400
    case '4': return '#FB7185'; // Tailwind rose-400
    case '5': return '#A78BFA'; // Tailwind violet-400
    case '6': return '#2DD4BF'; // Tailwind teal-400
    case '7': return '#F472B6'; // Tailwind pink-400
    case '8': return '#F87171'; // Tailwind red-400
    case '9': return '#A3A3A3'; // Tailwind gray-400
    default: return '#94A3B8'; // Tailwind slate-400
  }
};
