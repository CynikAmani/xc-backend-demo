// -----------------------------------------------------------------------------
// Load Environment Variables
// -----------------------------------------------------------------------------
const dotenv = require("dotenv");
dotenv.config();

// -----------------------------------------------------------------------------
// Import App and DB
// -----------------------------------------------------------------------------
const app = require("./app");
const { dbInitialized } = require("./config/db");

// -----------------------------------------------------------------------------
// Load Scheduled Tasks
// -----------------------------------------------------------------------------

// This module sets up scheduled loan status updates
require("./routes/admins/configurations/messeges/updateLoanStatusOnScheduleRoutes");

// -----------------------------------------------------------------------------
// Server Configuration
// -----------------------------------------------------------------------------
const PORT = process.env.PORT || 9999;

// -----------------------------------------------------------------------------
// Start Server After DB Initialization
// -----------------------------------------------------------------------------
dbInitialized
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Database initialization failed:", err);
    process.exit(1);
  });