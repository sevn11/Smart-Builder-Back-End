
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

export const formatEndDate = (startDate: Date, duration: number, weekendScheduled: boolean) => {
  const resultDate = new Date(startDate);
  let daysAdded = 0;

  while (daysAdded < duration) {
    const day = resultDate.getDay(); // 0 = Sunday, 6 = Saturday

    if (weekendScheduled) {
      daysAdded++;
    } else {
      if (day !== 0 && day !== 6) {
        daysAdded++;
      }
    }

    if (daysAdded < duration) {
      resultDate.setDate(resultDate.getDate() + 1);
    }
  }

  return resultDate;
}

// date + 1
export const resetEventStart = (date: Date) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + 1);
  nextDate.setHours(0, 0, 0, 0);

  return nextDate;
};

