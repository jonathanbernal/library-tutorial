const mongoose = require('mongoose');

const Database = async () => {
    try {
        const connection = await mongoose.connect(
            process.env.MONGO_URI, {
                useNewUrlParser: true, 
                useUnifiedTopology: true,
            }
        );
        console.log(`Successfully connected to MongoDB cluster`);
        return connection;
    } catch(err) {
        console.log(`MongoDB connection error: ${err}`);
    }
}

module.exports = Database();

