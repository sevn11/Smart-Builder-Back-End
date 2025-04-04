
export const formatNumberWithCommas = (number: number | string) => {
    if (isNaN(Number(number))) {
        return 0;
    }

    let numberString = number.toString();

    numberString = numberString.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    return numberString;
};