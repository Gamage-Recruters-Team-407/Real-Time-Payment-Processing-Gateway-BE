const otpStore = new Map();

export const saveOTP = (key, otp, expiresAt) => {
    otpStore.set(key, { otp, expiresAt, attempts: 0 });
};

export const getOTP = (key) => {
    return otpStore.get(key);
};

export const updateAttempts = (key, attempts) => {
    const record = otpStore.get(key);
    if (record) {
        record.attempts = attempts;
        otpStore.set(key, record);
    }
};

export const deleteOTP = (key) => {
    otpStore.delete(key);
};