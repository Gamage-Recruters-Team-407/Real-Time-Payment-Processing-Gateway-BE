/**
 * Validates credit/debit card numbers using the Luhn Algorithm.
 * @param {string} cardNumber 
 * @returns {boolean}
 */
export function validateLuhn(cardNumber) {
    const cleaned = cardNumber.replace(/\D/g, '');
    if (cleaned.length < 13 || cleaned.length > 19) return false;

    let sum = 0;
    let shouldDouble = false;

    for (let i = cleaned.length - 1; i >= 0; i--) {
        let digit = parseInt(cleaned[i], 10);

        if (shouldDouble) {
            digit *= 2;
            if (digit > 9) {
                digit -= 9;
            }
        }

        sum += digit;
        shouldDouble = !shouldDouble;
    }

    return sum % 10 === 0;
}

/**
 * Validates if the expiry date is in MM/YY format and is not in the past.
 * @param {string} expiry 
 * @returns {boolean}
 */
export function validateExpiry(expiry) {
    if (!expiry || !expiry.includes('/')) return false;

    const parts = expiry.split('/');
    if (parts.length !== 2) return false;

    const month = parseInt(parts[0], 10);
    const yearPart = parseInt(parts[1], 10);

    if (isNaN(month) || isNaN(yearPart)) return false;
    if (month < 1 || month > 12) return false;

    const now = new Date();
    const currentYear = now.getFullYear() % 100; // 2-digit year
    const currentMonth = now.getMonth() + 1; // 1-indexed month

    if (yearPart < currentYear) return false;
    if (yearPart === currentYear && month < currentMonth) return false;

    return true;
}

/**
 * Validates the CVC/CVV (3 or 4 digits).
 * @param {string} cvc 
 * @returns {boolean}
 */
export function validateCvc(cvc) {
    const cleaned = cvc.replace(/\D/g, '');
    return cleaned.length === 3 || cleaned.length === 4;
}

/**
 * Validates card details.
 * @param {object} details 
 * @returns {{isValid: boolean, errors: object}}
 */
export function validateCardDetails({ cardholderName, cardNumber, expiry, cvc }) {
    const errors = {};

    if (!cardholderName || !cardholderName.trim()) {
        errors.cardholderName = 'Cardholder name is required';
    }

    if (!cardNumber || !validateLuhn(cardNumber)) {
        errors.cardNumber = 'Invalid card number (Luhn validation failed)';
    }

    if (!expiry || !validateExpiry(expiry)) {
        errors.expiry = 'Invalid expiry date (must be MM/YY and not in the past)';
    }

    if (!cvc || !validateCvc(cvc)) {
        errors.cvc = 'Invalid CVC (must be 3 or 4 digits)';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
}
