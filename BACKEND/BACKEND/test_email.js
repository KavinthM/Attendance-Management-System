require("dotenv").config();
const nodemailer = require("nodemailer");

async function testEmail() {
    console.log("Testing Email configuration...");
    console.log("EMAIL_USER:", process.env.EMAIL_USER ? "Set" : "Not Set");
    console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? "Set" : "Not Set");

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error("ERROR: EMAIL_USER or EMAIL_PASS not found in .env file.");
        return;
    }

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_USER, // Send to self used in config
        subject: "Test Email from Smart Alert",
        text: "If you receive this, your email configuration is correct!",
    };

    try {
        console.log(`Attempting to send test email to ${process.env.EMAIL_USER}...`);
        const info = await transporter.sendMail(mailOptions);
        console.log("✅ Email sent successfully!");
        console.log("Message ID:", info.messageId);
    } catch (error) {
        console.error("❌ Failed to send email.");
        console.error("Error:", error.message);
        if (error.code === 'EAUTH') {
            console.error("Hint: Check your App Password or 2FA settings.");
        }
    }
}

testEmail();
