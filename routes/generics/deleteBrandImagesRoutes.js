const { db } = require('../../config/db');

const deleteAllBrandImages = () => {
  db.query(`DELETE FROM brand_images`, (err, result) => {
    if (err) {
      console.error('Error deleting brand images:', err);
      return;
    }
  });
};

module.exports = deleteAllBrandImages;
