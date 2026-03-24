const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Connect to MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/complaintDB")
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

// User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: "user", enum: ["user", "admin"] },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", userSchema);

// Create default admin user
async function createAdminUser() {
    try {
        // Check if admin already exists
        const existingAdmin = await User.findOne({ role: "admin" });
        if (existingAdmin) {
            console.log("Admin user already exists");
            return;
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash("admin123", salt);

        // Create admin user
        const adminUser = new User({
            username: "admin",
            email: "admin@feedbackhub.com",
            password: hashedPassword,
            role: "admin"
        });

        await adminUser.save();
        console.log("Default admin user created:");
        console.log("Username: admin");
        console.log("Email: admin@feedbackhub.com");
        console.log("Password: admin123");
        console.log("Please change the password after first login!");

    } catch (error) {
        console.error("Error creating admin user:", error);
    } finally {
        mongoose.connection.close();
    }
}

createAdminUser();