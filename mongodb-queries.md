# MongoDB Compass Queries for FeedbackHub

## Database: complaintDB

### 1. View All Users
```javascript
// Find all users
db.users.find({})

// Find users by role
db.users.find({ role: "admin" })
db.users.find({ role: "user" })

// Count total users
db.users.countDocuments()
```

### 2. View All Complaints
```javascript
// Find all complaints
db.complaints.find({})

// Find complaints by status
db.complaints.find({ status: "Open" })
db.complaints.find({ status: "Resolved" })
db.complaints.find({ status: "In Progress" })

// Find complaints by category
db.complaints.find({ category: "Technical" })
db.complaints.find({ category: "Service" })

// Count total complaints
db.complaints.countDocuments()
```

### 3. Recent Complaints (Last 7 days)
```javascript
db.complaints.find({
    date: {
        $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    }
}).sort({ date: -1 })
```

### 4. Complaints Statistics
```javascript
// Count complaints by status
db.complaints.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } }
])

// Count complaints by category
db.complaints.aggregate([
    { $group: { _id: "$category", count: { $sum: 1 } } }
])

// Count complaints by date (daily)
db.complaints.aggregate([
    {
        $group: {
            _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$date" }
            },
            count: { $sum: 1 }
        }
    },
    { $sort: { "_id": -1 } }
])
```

### 5. User Activity
```javascript
// Find users with their complaint count
db.users.aggregate([
    {
        $lookup: {
            from: "complaints",
            localField: "_id",
            foreignField: "userId",
            as: "userComplaints"
        }
    },
    {
        $project: {
            username: 1,
            email: 1,
            role: 1,
            complaintCount: { $size: "$userComplaints" },
            createdAt: 1
        }
    },
    { $sort: { complaintCount: -1 } }
])
```

### 6. Update Complaint Status
```javascript
// Update a specific complaint status
db.complaints.updateOne(
    { _id: ObjectId("YOUR_COMPLAINT_ID") },
    { $set: { status: "Resolved" } }
)

// Update multiple complaints
db.complaints.updateMany(
    { status: "Open", category: "Technical" },
    { $set: { status: "In Progress" } }
)
```

### 7. Delete Operations (Use with caution)
```javascript
// Delete a specific complaint
db.complaints.deleteOne({ _id: ObjectId("YOUR_COMPLAINT_ID") })

// Delete old resolved complaints (older than 30 days)
db.complaints.deleteMany({
    status: "Resolved",
    date: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
})
```

### 8. Create Indexes (for better performance)
```javascript
// Create index on user email (for login)
db.users.createIndex({ email: 1 }, { unique: true })

// Create index on complaint status
db.complaints.createIndex({ status: 1 })

// Create index on complaint category
db.complaints.createIndex({ category: 1 })

// Create index on complaint date
db.complaints.createIndex({ date: -1 })

// Create compound index for user complaints
db.complaints.createIndex({ userId: 1, date: -1 })
```

### 9. Backup and Export
```javascript
// Export users collection
mongoexport --db complaintDB --collection users --out users.json

// Export complaints collection
mongoexport --db complaintDB --collection complaints --out complaints.json

// Import data
mongoimport --db complaintDB --collection users --file users.json
mongoimport --db complaintDB --collection complaints --file complaints.json
```

### 10. Database Maintenance
```javascript
// Check database stats
db.stats()

// Check collection stats
db.users.stats()
db.complaints.stats()

// List all collections
db.getCollectionNames()

// Drop collection (dangerous!)
db.complaints.drop()
```

## Sample Data for Testing

### Insert Sample Users
```javascript
db.users.insertMany([
    {
        username: "johndoe",
        email: "john@example.com",
        password: "$2a$10$hashedpassword", // bcrypt hash
        role: "user",
        createdAt: new Date()
    },
    {
        username: "admin",
        email: "admin@feedbackhub.com",
        password: "$2a$10$hashedpassword", // bcrypt hash
        role: "admin",
        createdAt: new Date()
    }
])
```

### Insert Sample Complaints
```javascript
db.complaints.insertMany([
    {
        name: "John Doe",
        email: "john@example.com",
        category: "Technical",
        message: "Website is running slow",
        status: "Open",
        date: new Date(),
        userId: ObjectId("USER_ID_HERE")
    },
    {
        name: "Jane Smith",
        email: "jane@example.com",
        category: "Service",
        message: "Great customer support!",
        status: "Resolved",
        date: new Date(),
        userId: ObjectId("USER_ID_HERE")
    }
])
```