const db = require('../../config/db'); // Adjust the path based on your project structure

/**
 * Function to delete all brand images from the database
 * (Fire-and-forget implementation)
 */
const deleteAllBrandImages = () => {
  const query = `DELETE FROM brand_images`;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Database delete error:', err);
    } else {
      console.log('All brand images deleted successfully. Affected rows:', results.affectedRows);
    }
  });
};

module.exports = deleteAllBrandImages;
