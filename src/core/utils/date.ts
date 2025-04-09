
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

export const formatCalendarDate = (date: Date) => {
    const resetDate = new Date(date);
    resetDate.setHours(0, 0, 0, 0);

    return resetDate;
};

export const formatEndDate = (startDate: Date, duration: number, skipWeekend: boolean) => {

    let endDate = new Date(startDate);
    if (!!skipWeekend) {

        // If weekends are included, just add (duration - 1) days
        endDate.setDate(startDate.getDate() + (duration - 1));
        return endDate;
    }

    // If weekends are skipped
    let daysAdded = 0;
    while (daysAdded < duration) {
        // Move to the next day (except for the first iteration)
        if (daysAdded > 0) {
            endDate.setDate(endDate.getDate() + 1);
        }

        // Only count weekdays (Monday to Friday)
        if (endDate.getDay() !== 0 && endDate.getDay() !== 6) {
            daysAdded++;
        }
    }

    return endDate
}

