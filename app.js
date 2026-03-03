const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");

const { createSessionMiddleware } = require("./config/sessionSetup");
const registerRoutes = require("./routes");

const app = express();

// -----------------------------------------------------------------------------
// App Settings
// -----------------------------------------------------------------------------

// Trust proxy when running in production (needed for secure cookies, etc.)
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// -----------------------------------------------------------------------------
// Security Middleware
// -----------------------------------------------------------------------------

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
  })
);

// -----------------------------------------------------------------------------
// Logging Middleware
// -----------------------------------------------------------------------------

app.use(morgan("dev"));

// -----------------------------------------------------------------------------
// Body Parsing
// -----------------------------------------------------------------------------

app.use(express.json());

// -----------------------------------------------------------------------------
// CORS Configuration
// -----------------------------------------------------------------------------

// Parse allowed origins from CORS_ORIGIN env variable
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map(origin => origin.trim())
  : [];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (Postman, mobile apps, etc.)
      if (!origin) return callback(null, true);

      // Allow only whitelisted origins
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true, // Required for sending cookies
  })
);

// -----------------------------------------------------------------------------
// Session Middleware
// -----------------------------------------------------------------------------

app.use(createSessionMiddleware());

// -----------------------------------------------------------------------------
// Static File Serving
// -----------------------------------------------------------------------------

const uploadPath = process.env.UPLOAD_PATH || path.join(__dirname, "uploads");
app.use("/uploads", express.static(uploadPath));

// -----------------------------------------------------------------------------
// Routes
// -----------------------------------------------------------------------------

registerRoutes(app);

// -----------------------------------------------------------------------------
// Error Handling
// -----------------------------------------------------------------------------

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Unexpected error occurred." });
});

// 404 handler (resource not found)
app.use((req, res) => {
  res.status(404).json({ message: "Resource not found." });
});

module.exports = app;