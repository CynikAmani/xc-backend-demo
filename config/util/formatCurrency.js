// formatCurrency.js
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'MWK',
    }).format(amount);
  }
  
  module.exports = formatCurrency;  // Export the function for use in other files
  