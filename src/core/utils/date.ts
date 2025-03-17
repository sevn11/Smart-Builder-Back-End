
/**
 * Converts a given date to a string in the format 'MM/DD/YYYY'
 * @param {Date} date The date to be converted
 * @returns {string} The date as a string in the format 'MM/DD/YYYY'
 */
export const convertDate = (date: Date): string => {
    const dateObj = new Date(date);
    // Months are 0-based, so we add 1 and pad with a 0 if necessary
    const mm = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    // Pad the day with a 0 if necessary
    const dd = String(dateObj.getUTCDate()).padStart(2, '0');
    const yyyy = dateObj.getUTCFullYear();
    return `${mm}/${dd}/${yyyy}`;
}
