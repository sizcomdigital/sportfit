const mongoose = require('mongoose');
const connectDB = async () => {
    try {
        const dbOptions = {
            dbName: process.env.DB_NAME,
        };
        await mongoose.connect(process.env.DB_URL, dbOptions);
        console.log("Database connected...");
    } catch (error) {
        console.error("Database connection error", error);
        process.exit(1);
    }
};
module.exports = connectDB;