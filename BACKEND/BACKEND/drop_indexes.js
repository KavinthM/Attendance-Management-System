const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGO_URI || "mongodb+srv://Admin:n3AK0A9ujJWgb9dD@cluster0.rejzequ.mongodb.net/smart-alert-db";

console.log('Using Mongo URI:', uri.replace(/:([^:@]+)@/, ':****@'));

mongoose.connect(uri)
    .then(async () => {
        console.log('Connected to MongoDB');
        try {
            const collections = await mongoose.connection.db.listCollections().toArray();
            console.log('Collections in ' + mongoose.connection.name + ':', collections.map(c => c.name));

            // Find student collection
            const studentCol = collections.find(c => c.name.toLowerCase().includes('student'));
            if (studentCol) {
                console.log(`Found collection: ${studentCol.name}. Checking indexes...`);
                const collection = mongoose.connection.db.collection(studentCol.name);
                const indexes = await collection.indexes();
                console.log('Indexes:', indexes);

                // Drop email index if exists
                const emailIndex = indexes.find(idx => idx.key.email);
                if (emailIndex) {
                    console.log('Dropping email index:', emailIndex.name);
                    await collection.dropIndex(emailIndex.name);
                    console.log('Dropped email index successfully.');
                } else {
                    console.log('No email index found.');
                }

                // Check for phone index
                const phoneIndex = indexes.find(idx => idx.key.parentPhoneNum);
                if (phoneIndex) {
                    console.log('Dropping parentPhoneNum index:', phoneIndex.name);
                    await collection.dropIndex(phoneIndex.name);
                    console.log('Dropped parentPhoneNum index successfully.');
                }

                // Just for safety, check if there are other unique indexes that might conflict (excluding _id and maybe std_index)
                // But we keep std_index unique.

            } else {
                console.log("No 'student' collection found.");
            }

        } catch (err) {
            console.error('Error:', err);
        } finally {
            await mongoose.disconnect();
            console.log('Disconnected');
        }
    })
    .catch(err => {
        console.error('Connection error:', err);
        process.exit(1);
    });
