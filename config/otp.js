export const OTP_CONFIG = {
    LENGTH: 6,
    EXPIRY_MINUTES: 5,
    MAX_ATTEMPTS: 3,
    RESEND_COOLDOWN_SECONDS: 60,
};

// Function to get email configuration from environment variables
export const getEmailConfig = () => {
    return {
        HOST: process.env.EMAIL_HOST || "smtp.gmail.com",
        PORT: process.env.EMAIL_PORT || 587,
        USER: process.env.EMAIL_USER,
        PASS: process.env.EMAIL_PASS,
    };
};