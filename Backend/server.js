
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./src/config/db");
const { errorHandler, notFound } = require("./src/middleware/errorHandler");

const app = express();

// CORS - Allow all origins in development
app.use(cors());
app.options('*', cors());

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Connect to database
connectDB();

// API Routes
app.use("/api/auth", require("./src/routes/auth"));
app.use("/api/beneficiaries", require("./src/routes/beneficiary"));
app.use("/api/donors", require("./src/routes/donor"));
app.use("/api/locations", require("./src/routes/location"));
app.use("/api/stock-in", require("./src/routes/stockIn"));
app.use("/api/stock-out", require("./src/routes/stockOut"));
app.use("/api/reports", require("./src/routes/report"));
app.use("/api/dashboard", require("./src/routes/dashboard"));

// Health check
app.get("/api/health", (req, res) => {
    res.json({ 
        success: true, 
        message: "Server is running",
        timestamp: new Date().toISOString()
    });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
