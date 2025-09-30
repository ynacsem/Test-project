const app = require('./app');
const { initializeDb } = require('./db');
const { seedDatabase } = require('./seed');
require('dotenv').config();

const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    await initializeDb();
    
    await seedDatabase(false);
    
    if (require.main === module) {
      app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
        console.log('Database has been automatically seeded with fresh data');
      });
    }
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();

module.exports = app; 