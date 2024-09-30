const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const session = require('express-session');
const cron = require('node-cron'); //scheduler 
require('./routes/admins/configurations/messeges/sendSMSOnScheduleRoutes.js')

dotenv.config();

const app = express();

// Middleware
const corsOptions = {
    origin: ['https://www.xandercreditors.com', 'http://localhost:3000'],
    credentials: true,
  };
app.use(cors(corsOptions));
app.use(express.json());
app.use('/var/data/uploads', express.static(path.join(__dirname, 'uploads')));

// Session setup
// Session setup
app.use(session({
    secret: process.env.SESSION_SECRET || 'HSHGHJHBAJD7999799DJSGD6565shvdhhsuYUHUWBQHGE#$#@^%%&*&(445SNH',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set secure: true in production with HTTPS
}));


// Routes
const test = require('./auth/test.js');

const loginRoutes = require('./auth/login.js');
const updateLoginCredentialsRoures = require('./auth/updateLoginCredentialsRoures.js');
const logoutRoutes = require('./auth/logout.js');
const resetPassword = require('./auth/resetPassword.js');
const registerUserRoutes = require('./routes/generics/registerUserRoutes.js');
const getGendersRoutes = require('./routes/generics/getGendersRoutes.js');
const updateProfileRoutes = require('./routes/generics/updateProfileRoutes.js');
const getUsersRoutes = require('./routes/generics/getUsersRoutes.js');
const toggleAdminRoleRoutes = require('./routes/admins/toggleAdminRoleRoutes.js');
const toggleBlockUserRoutes = require('./routes/admins/toggleBlockUserRoutes.js');
const savePaymentDetailsRoutes = require('./routes/admins/configurations/savePaymentDetailsRoutes.js');
const getPaymentDetailsRoutes = require('./routes/admins/configurations/getPaymentDetailsRoutes.js');
const deletePaymentDetailsRoutes = require('./routes/admins/configurations/deletePaymentDetailsRoutes.js');
const saveLoanTypeRoutes = require('./routes/admins/configurations/saveLoanTypeRoutes.js');
const getLoanTypesRoutes = require('./routes/admins/configurations/getLoanTypesRoutes.js');
const deleteLoanTypeRoutes = require('./routes/admins/configurations/deleteLoanTypeRoutes.js');
const saveInterestRatesRoutes = require('./routes/admins/configurations/saveInterestRatesRoutes.js');
const getInterestRatesRoutes = require('./routes/admins/configurations/getInterestRatesRoutes.js');
const deleteInterestRatesRoutes = require('./routes/admins/configurations/deleteInterestRatesRoutes.js');
const saveTermsAndConditionsRoutes = require('./routes/admins/configurations/saveTermsAndConditionsRoutes.js');
const getTermsAndConditionsRoutes = require('./routes/admins/configurations/getTermsAndConditionsRoutes.js');
const deleteTermsAndConditionsRoutes = require('./routes/admins/configurations/deleteTermsAndConditionsRoutes.js');
const getNumWeeksRoutes = require('./routes/admins/loanManagement/newLoans/getNumWeeksRoutes.js');
const saveNewLoanRoutes = require('./routes/admins/loanManagement/newLoans/saveNewLoanRoutes.js');
const getUnclearedLoansRoutes = require('./routes/admins/loanManagement/newLoans/getUnclearedLoansRoutes.js');
const getOverdueLoansRoutes = require('./routes/admins/loanManagement/newLoans/getOverdueLoansRoutes.js');
const deleteLoanRoutes = require('./routes/admins/loanManagement/newLoans/deleteLoanRoutes.js');
const loanRepaymentsRoutes = require('./routes/admins/loanManagement/loanRepayments/loanRepaymentsRoutes.js');
const getLoanBalanceRoutes = require('./routes/admins/loanManagement/loanRepayments/getLoanBalanceRoutes.js');
const getClearedLoansRoutes = require('./routes/admins/loanManagement/clearedLoans/getClearedLoansRoutes.js');
const saveLoanApplicationRoutes = require('./routes/customers/loans/loanApplications/saveLoanApplicationRoutes.js');
const deleteLoanApplicationRoutes = require('./routes/customers/loans/loanApplications/deleteLoanApplicationRoutes.js');
const getLoanApplicationsRoutes = require('./routes/customers/loans/loanApplications/getLoanApplicationsRoutes.js');
const getLoanApplicationsAsAdminRoutes = require('./routes/admins/loanManagement/loanApplications/getLoanApplicationsAsAdminRoutes.js');
const declineLoanApplicationRoutes = require('./routes/admins/loanManagement/loanApplications/declineLoanApplicationRoutes.js');
const approveLoanRoutes = require('./routes/admins/loanManagement/loanApplications/approveLoanRoutes.js');
const getCustomerLoansRoutes = require('./routes/customers/loans/customerLoans/getCustomerLoansRoutes.js');
const getMessagesRoutes = require('./routes/admins/configurations/messeges/getMessagesRoutes.js');
const updateMessageRoutes = require('./routes/admins/configurations/messeges/updateMessageRoutes.js');
const setSystemAttributesRoutes = require('./routes/admins/configurations/system/setSystemAttributesRoutes.js');
const getSystemAttributesRoutes = require('./routes/admins/configurations/system/getSystemAttributesRoutes.js');
const getUserDetailsRoutes = require('./routes/generics/getUserDetailsRoutes.js');
const updateDPRoutes = require('./routes/generics/updateDPRoutes.js');
const sendSMSRoutes = require('./routes/admins/configurations/messeges/sendSMSROutes.js');
const getCustomerLoansStatsRoutes = require('./routes/customers/dashboard/getCustomerLoansStatsRoutes.js');
const getAdminLoanStatsRoutes = require('./routes/admins/dashboard/getAdminLoanStatsRoutes.js');
const getUserTypeRoutes = require('./routes/generics/getUserTypeRoutes.js');
const getUserNotificationsRoutes = require('./routes/generics/getUserNotificationsRoutes.js');
const deleteNotificationRoutes = require('./routes/generics/deleteNotificationRoutes.js');
const deleteNotificationsRoutes = require('./routes/generics/deleteNotificationsRoutes.js');
const getCustomerIdsRoutes = require('./routes/admins/loanManagement/newLoans/getCustomerIdsRoutes.js');

// Use Routes
app.use('/api', test);

app.use('/api/auth/login', loginRoutes);
app.use('/api/auth/updateLoginCredentials', updateLoginCredentialsRoures);
app.use('/api/auth/logout', logoutRoutes);
app.use('/api/auth/resetPassword', resetPassword);
app.use('/api/registerUser', registerUserRoutes);
app.use('/api/getGenders', getGendersRoutes);
app.use('/api/updateProfile', updateProfileRoutes);
app.use('/api/getUsers', getUsersRoutes);
app.use('/api/toggleAdminRole', toggleAdminRoleRoutes);
app.use('/api/toggleBlockUser', toggleBlockUserRoutes);
app.use('/api/savePaymentDetails', savePaymentDetailsRoutes);
app.use('/api/getPaymentDetails', getPaymentDetailsRoutes);
app.use('/api/deletePaymentDetails', deletePaymentDetailsRoutes);
app.use('/api/saveLoanType', saveLoanTypeRoutes);
app.use('/api/getLoanTypes', getLoanTypesRoutes);
app.use('/api/deleteLoanType', deleteLoanTypeRoutes);
app.use('/api/saveInterestRates', saveInterestRatesRoutes);
app.use('/api/getInterestRates', getInterestRatesRoutes);
app.use('/api/deleteInterestRates', deleteInterestRatesRoutes);
app.use('/api/saveTermsAndConditions', saveTermsAndConditionsRoutes);
app.use('/api/getTermsAndConditions', getTermsAndConditionsRoutes);
app.use('/api/deleteTermsAndConditions', deleteTermsAndConditionsRoutes);
app.use('/api/getNumWeeks', getNumWeeksRoutes);
app.use('/api/saveNewLoan', saveNewLoanRoutes);
app.use('/api/getUnclearedLoans', getUnclearedLoansRoutes);
app.use('/api/getOverdueLoans', getOverdueLoansRoutes);
app.use('/api/deleteLoan', deleteLoanRoutes);
app.use('/api/loanRepayments', loanRepaymentsRoutes);
app.use('/api/getLoanBalance', getLoanBalanceRoutes);
app.use('/api/getClearedLoans', getClearedLoansRoutes);
app.use('/api/saveLoanApplication', saveLoanApplicationRoutes);
app.use('/api/deleteLoanApplication', deleteLoanApplicationRoutes);
app.use('/api/getLoanApplications', getLoanApplicationsRoutes);
app.use('/api/getLoanApplicationsAsAdmin', getLoanApplicationsAsAdminRoutes);
app.use('/api/declineLoanApplication', declineLoanApplicationRoutes);
app.use('/api/approveLoan', approveLoanRoutes);
app.use('/api/getCustomerLoans', getCustomerLoansRoutes);
app.use('/api/getMessages', getMessagesRoutes);
app.use('/api/updateMessage', updateMessageRoutes);
app.use('/api/setSystemAttributes', setSystemAttributesRoutes);
app.use('/api/getSystemAttributes', getSystemAttributesRoutes);
app.use('/api/getUserDetails', getUserDetailsRoutes);
app.use('/api/updateDP', updateDPRoutes);
app.use('/api/sendSMS', sendSMSRoutes);
app.use('/api/getCustomerLoansStats', getCustomerLoansStatsRoutes);
app.use('/api/getAdminLoanStats', getAdminLoanStatsRoutes);
app.use('/api/getUserType', getUserTypeRoutes);
app.use('/api/getUserNotifications', getUserNotificationsRoutes);
app.use('/api/deleteNotification', deleteNotificationRoutes);
app.use('/api/deleteNotifications', deleteNotificationsRoutes);
app.use('/api/getCustomerIds', getCustomerIdsRoutes);



// Global Error Handling Middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error occurred:', err.stack);
    res.status(500).json({
        message: 'An unexpected error occurred. Please try again later.',
        error: err.message
    });
});

// Handle 404 (Not Found)
app.use((req, res) => {
    res.status(404).json({
        message: 'Resource not found.'
    });
});

// Define Port
const PORT = process.env.PORT || 9999;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
