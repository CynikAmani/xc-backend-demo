const { db, dbInitialized } = require("./config/db.js");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const session = require("express-session");
const cron = require("node-cron"); //scheduler

dotenv.config();

const app = express();

// Middleware
const corsOptions = {
  origin: [
    process.env.CORS_ORIGIN || "http://localhost:3000"
  ],
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());

const uploadPath = process.env.UPLOAD_PATH || path.join(__dirname, "uploads");

// Serve static files from the configured path
app.use("/uploads", express.static(uploadPath));

// Session setup
app.use(
  session({
    secret:
      process.env.SESSION_SECRET ||
      "HSHGHJHBAJD7999799DJSGD6565shvdhhsuYUHUWBQHGE#$#@^%%&*&(445SNH",
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false,
    },
  }),
);

// Routes
const test = require("./auth/test.js");

const loginRoutes = require("./auth/login.js");
const updateLoginCredentialsRoures = require("./auth/updateLoginCredentialsRoures.js");
const logoutRoutes = require("./auth/logout.js");
const checkUsername = require("./auth/checkUsername.js");
const resetPassword = require("./auth/resetPassword.js");
const registerUserRoutes = require("./routes/generics/registerUserRoutes.js");
const getGendersRoutes = require("./routes/generics/getGendersRoutes.js");
const updateProfileRoutes = require("./routes/generics/updateProfileRoutes.js");
const getUsersRoutes = require("./routes/generics/getUsersRoutes.js");
const toggleAdminRoleRoutes = require("./routes/admins/toggleAdminRoleRoutes.js");
const toggleBlockUserRoutes = require("./routes/admins/toggleBlockUserRoutes.js");
const savePaymentDetailsRoutes = require("./routes/admins/configurations/savePaymentDetailsRoutes.js");
const getPaymentDetailsRoutes = require("./routes/admins/configurations/getPaymentDetailsRoutes.js");
const deletePaymentDetailsRoutes = require("./routes/admins/configurations/deletePaymentDetailsRoutes.js");
const saveLoanTypeRoutes = require("./routes/admins/configurations/saveLoanTypeRoutes.js");
const getLoanTypesRoutes = require("./routes/admins/configurations/getLoanTypesRoutes.js");
const deleteLoanTypeRoutes = require("./routes/admins/configurations/deleteLoanTypeRoutes.js");
const saveInterestRatesRoutes = require("./routes/admins/configurations/saveInterestRatesRoutes.js");
const getInterestRatesRoutes = require("./routes/admins/configurations/getInterestRatesRoutes.js");
const deleteInterestRatesRoutes = require("./routes/admins/configurations/deleteInterestRatesRoutes.js");
const saveTermsAndConditionsRoutes = require("./routes/admins/configurations/saveTermsAndConditionsRoutes.js");
const getTermsAndConditionsRoutes = require("./routes/admins/configurations/getTermsAndConditionsRoutes.js");
const deleteTermsAndConditionsRoutes = require("./routes/admins/configurations/deleteTermsAndConditionsRoutes.js");
const getNumWeeksRoutes = require("./routes/admins/loanManagement/newLoans/getNumWeeksRoutes.js");
const saveNewLoanRoutes = require("./routes/admins/loanManagement/newLoans/saveNewLoanRoutes.js");
const getUnclearedLoansRoutes = require("./routes/admins/loanManagement/newLoans/getUnclearedLoansRoutes.js");
const getOverdueLoansRoutes = require("./routes/admins/loanManagement/newLoans/getOverdueLoansRoutes.js");
const deleteLoanRoutes = require("./routes/admins/loanManagement/newLoans/deleteLoanRoutes.js");
const loanRepaymentsRoutes = require("./routes/admins/loanManagement/loanRepayments/loanRepaymentsRoutes.js");
const renewLoanRoutes = require("./routes/admins/loanManagement/loanRepayments/renewLoanRoutes.js");
const getLoanBalanceRoutes = require("./routes/admins/loanManagement/loanRepayments/getLoanBalanceRoutes.js");
const getClearedLoansRoutes = require("./routes/admins/loanManagement/clearedLoans/getClearedLoansRoutes.js");
const saveLoanApplicationRoutes = require("./routes/customers/loans/loanApplications/saveLoanApplicationRoutes.js");
const deleteLoanApplicationRoutes = require("./routes/customers/loans/loanApplications/deleteLoanApplicationRoutes.js");
const getLoanApplicationsRoutes = require("./routes/customers/loans/loanApplications/getLoanApplicationsRoutes.js");
const getLoanApplicationsAsAdminRoutes = require("./routes/admins/loanManagement/loanApplications/getLoanApplicationsAsAdminRoutes.js");
const declineLoanApplicationRoutes = require("./routes/admins/loanManagement/loanApplications/declineLoanApplicationRoutes.js");
const approveLoanRoutes = require("./routes/admins/loanManagement/loanApplications/approveLoanRoutes.js");
const getCustomerLoansRoutes = require("./routes/customers/loans/customerLoans/getCustomerLoansRoutes.js");
const getMessagesRoutes = require("./routes/admins/configurations/messeges/getMessagesRoutes.js");
const updateMessageRoutes = require("./routes/admins/configurations/messeges/updateMessageRoutes.js");
const setSystemAttributesRoutes = require("./routes/admins/configurations/system/setSystemAttributesRoutes.js");
const getSystemAttributesRoutes = require("./routes/admins/configurations/system/getSystemAttributesRoutes.js");
const getUserDetailsRoutes = require("./routes/generics/getUserDetailsRoutes.js");
const updateDPRoutes = require("./routes/generics/updateDPRoutes.js");
const sendSMSRoutes = require("./routes/admins/configurations/messeges/sendSMSROutes.js");
const getCustomerLoansStatsRoutes = require("./routes/customers/dashboard/getCustomerLoansStatsRoutes.js");
const getAdminLoanStatsRoutes = require("./routes/admins/dashboard/getAdminLoanStatsRoutes.js");
const getUserTypeRoutes = require("./routes/generics/getUserTypeRoutes.js");
const getUserNotificationsRoutes = require("./routes/generics/getUserNotificationsRoutes.js");
const markViewedNotificationsRoutes = require("./routes/generics/markViewedNotificationsRoutes.js");
const getNumNewNotificationsRoutes = require("./routes/generics/getNumNewNotificationsRoutes.js");
const deleteNotificationRoutes = require("./routes/generics/deleteNotificationRoutes.js");
const deleteNotificationsRoutes = require("./routes/generics/deleteNotificationsRoutes.js");
const getCustomerIdsRoutes = require("./routes/admins/loanManagement/newLoans/getCustomerIdsRoutes.js");
const setAboutRoutes = require("./routes/admins/configurations/about/setAboutRoutes.js");
const getAboutInfoRoutes = require("./routes/admins/configurations/about/getAboutInfoRoutes.js");
const insertUpdateAdvertRoutes = require("./routes/admins/configurations/adverts/insertUpdateAdvertRoutes.js");
const getAdvertRoutes = require("./routes/admins/configurations/adverts/getAdvertRoutes.js");
const insertBrandImageRoutes = require("./routes/admins/configurations/adverts/insertBrandImageRoutes.js");
const getBrandImagesRoutes = require("./routes/admins/configurations/adverts/getBrandImagesRoutes.js");
const deleteBrandImageRoutes = require("./routes/admins/configurations/adverts/deleteBrandImageRoutes.js");
const resetInterestRatesRoutes = require("./routes/admins/configurations/promotions/resetInterestRatesRoutes.js");
const setDiscountRateRoutes = require("./routes/admins/configurations/promotions/setDiscountRateRoutes.js");
const setSpecialOfferRoutes = require("./routes/admins/configurations/offers/setSpecialOfferRoutes.js");
const getSpecialOffersRoutes = require("./routes/admins/configurations/offers/getSpecialOffersRoutes.js");
const getCustomerSpecialOffersRoutes = require("./routes/admins/configurations/offers/getCustomerSpecialOffersRoutes.js");
const saveFeedbackCategoryRoutes = require("./routes/admins/configurations/feedbacks/saveFeedbackCategoryRoutes.js");
const getFeedbackCategoriesRoutes = require("./routes/admins/configurations/feedbacks/getFeedbackCategoriesRoutes.js");
const saveCustomerFeedbackRoutes = require("./routes/admins/configurations/feedbacks/saveCustomerFeedbackRoutes.js");
const getCustomerFeedbacksRoutes = require("./routes/admins/configurations/feedbacks/getCustomerFeedbacksRoutes.js");
const getInsightsRoutes = require("./routes/admins/dashboard/getInsightsRoutes.js");
const setAgreementRefsRoutes = require("./routes/generics/setAgreementRefsRoutes.js");
const getAgreementRefsRoutes = require("./routes/generics/getAgreementRefsRoutes.js");
const getAgreementInfoRoutes = require("./routes/customers/loans/loanApplications/getAgreementInfoRoutes.js");
const getApplicantAgreementInfoRoutes = require("./routes/admins/loanManagement/loanApplications/getApplicantAgreementInfoRoutes.js");
const getDistrictsRoutes = require("./routes/generics/getDistrictsRoutes.js");
const setResidentialDistrictRoutes = require("./routes/customers/dashboard/setResidentialDistrictRoutes.js");
const getDashboardAnalysisRoutes = require("./routes/admins/dashboard/getDashboardAnalysisRoutes.js");

const setFeedbackReplyRoutes = require("./routes/generics/feedbackReplies/addFeedbackReplyRoutes.js");
const getUserFeedbackRoutes = require("./routes/customers/feedbacks/getUserFeedbackRoutes.js");
const getNumNewFeedbackRepliesRoutes = require("./routes/customers/feedbacks/getNumNewFeedbackRepliesRoutes.js");
const markFeedbackRepliesAsReadRoutes = require("./routes/generics/feedbackReplies/markFeedbackRepliesAsReadRoutes.js");
const getAdminNumNewFeedbackRepliesRoutes = require("./routes/admins/configurations/feedbacks/getAdminNumNewFeedbackRepliesRoutes.js");
const markCustomerFeedbacksAndRepliesAsReadRoutes = require("./routes/admins/configurations/feedbacks/markCustomerFeedbacksAndRepliesAsReadRoutes.js");
const getMonthlyProfitRoutes = require("./routes/admins/dashboard/getMonthlyProfitRoutes.js");

// Savings Application Routes
const saveSavingsApplicationRoutes = require("./routes/customers/savings/setSavingsApplicationRoutes.js");
const getCustomerSavingsApplicationsRoutes = require("./routes/customers/savings/getSavingsApplicationsRoutes.js");
const getSavingsApplicationsRoutes = require("./routes/admins/savings/savings-applications/getSavingsApplicationsRountes.js");
const declineSavingsApplicationRoutes = require("./routes/admins/savings/savings-applications/declineSavingsApplicationRoutes.js");
const approveSavingsApplicationRoutes = require("./routes/admins/savings/savings-records/approveSavingsApplicationROutes.js");
const getSavingsRecordsRoutes = require("./routes/admins/savings/savings-records/getSavingsRecordsRoutes.js");
const withdrawMaturedSavingsROutes = require("./routes/admins/savings/savings-records/withdrawMaturedSavingsROutes.js");
const getSavingsAuditTrailRoutes = require("./routes/admins/savings/audit-trails/getSavingsAutiTrailRoutes.js");
const getSavingsAnalyticsRoutes = require("./routes/admins/savings/analytics/getSavingsAbalyticsRoutes.js");
const fetchConfigRecordRoutes = require("./routes/admins/savings/config/fetchConfigRecordRoutes.js");
const setNewConfigurationsRoutes = require("./routes/admins/savings/config/setNewConfigurationsRoutes.js");
const getNumSavingsApplicationsRoutes = require("./routes/admins/savings/savings-applications/getNumSavingsApplicationsRoutes.js");
const getCustomerApprovedSavingsRoutes = require("./routes/customers/savings/getCustomerApprovedSavingsRoutes.js");
const getCustomerSavingsInsightsRoutes = require("./routes/customers/savings/getCustomerSavingsInsightsRoutes.js");




// Use Routes
app.use("/api", test);

app.use("/api/auth/login", loginRoutes);
app.use("/api/auth/updateLoginCredentials", updateLoginCredentialsRoures);
app.use("/api/auth/logout", logoutRoutes);
app.use("/api/auth/checkUsername", checkUsername);
app.use("/api/auth/resetPassword", resetPassword);
app.use("/api/registerUser", registerUserRoutes);
app.use("/api/getGenders", getGendersRoutes);
app.use("/api/updateProfile", updateProfileRoutes);
app.use("/api/getUsers", getUsersRoutes);
app.use("/api/toggleAdminRole", toggleAdminRoleRoutes);
app.use("/api/toggleBlockUser", toggleBlockUserRoutes);
app.use("/api/savePaymentDetails", savePaymentDetailsRoutes);
app.use("/api/getPaymentDetails", getPaymentDetailsRoutes);
app.use("/api/deletePaymentDetails", deletePaymentDetailsRoutes);
app.use("/api/saveLoanType", saveLoanTypeRoutes);
app.use("/api/getLoanTypes", getLoanTypesRoutes);
app.use("/api/deleteLoanType", deleteLoanTypeRoutes);
app.use("/api/saveInterestRates", saveInterestRatesRoutes);
app.use("/api/getInterestRates", getInterestRatesRoutes);
app.use("/api/deleteInterestRates", deleteInterestRatesRoutes);
app.use("/api/saveTermsAndConditions", saveTermsAndConditionsRoutes);
app.use("/api/getTermsAndConditions", getTermsAndConditionsRoutes);
app.use("/api/deleteTermsAndConditions", deleteTermsAndConditionsRoutes);
app.use("/api/getNumWeeks", getNumWeeksRoutes);
app.use("/api/saveNewLoan", saveNewLoanRoutes);
app.use("/api/getUnclearedLoans", getUnclearedLoansRoutes);
app.use("/api/getOverdueLoans", getOverdueLoansRoutes);
app.use("/api/deleteLoan", deleteLoanRoutes);
app.use("/api/loanRepayments", loanRepaymentsRoutes);
app.use("/api/renewLoan", renewLoanRoutes);
app.use("/api/getLoanBalance", getLoanBalanceRoutes);
app.use("/api/getClearedLoans", getClearedLoansRoutes);
app.use("/api/saveLoanApplication", saveLoanApplicationRoutes);
app.use("/api/deleteLoanApplication", deleteLoanApplicationRoutes);
app.use("/api/getLoanApplications", getLoanApplicationsRoutes);
app.use("/api/getLoanApplicationsAsAdmin", getLoanApplicationsAsAdminRoutes);
app.use("/api/declineLoanApplication", declineLoanApplicationRoutes);
app.use("/api/approveLoan", approveLoanRoutes);
app.use("/api/getCustomerLoans", getCustomerLoansRoutes);
app.use("/api/getMessages", getMessagesRoutes);
app.use("/api/updateMessage", updateMessageRoutes);
app.use("/api/setSystemAttributes", setSystemAttributesRoutes);
app.use("/api/getSystemAttributes", getSystemAttributesRoutes);
app.use("/api/getUserDetails", getUserDetailsRoutes);
app.use("/api/updateDP", updateDPRoutes);
app.use("/api/sendSMS", sendSMSRoutes);
app.use("/api/getCustomerLoansStats", getCustomerLoansStatsRoutes);
app.use("/api/getAdminLoanStats", getAdminLoanStatsRoutes);
app.use("/api/getUserType", getUserTypeRoutes);
app.use("/api/getUserNotifications", getUserNotificationsRoutes);
app.use("/api/markViewedNotifications", markViewedNotificationsRoutes);
app.use("/api/getNumNewNotifications", getNumNewNotificationsRoutes);
app.use("/api/deleteNotification", deleteNotificationRoutes);
app.use("/api/deleteNotifications", deleteNotificationsRoutes);
app.use("/api/getCustomerIds", getCustomerIdsRoutes);
app.use("/api/setAbout", setAboutRoutes);
app.use("/api/getAboutInfo", getAboutInfoRoutes);
app.use("/api/insertUpdateAdvert", insertUpdateAdvertRoutes);
app.use("/api/getAdvert", getAdvertRoutes);
app.use("/api/insertBrandImage", insertBrandImageRoutes);
app.use("/api/getBrandImagesRoutes", getBrandImagesRoutes);
app.use("/api/deleteBrandImage", deleteBrandImageRoutes);
app.use("/api/resetInterestRates", resetInterestRatesRoutes);
app.use("/api/setDiscountRate", setDiscountRateRoutes);
app.use("/api/setSpecialOffer", setSpecialOfferRoutes);
app.use("/api/getSpecialOffers", getSpecialOffersRoutes);
app.use("/api/getCustomerSpecialOffers", getCustomerSpecialOffersRoutes);
app.use("/api/saveFeedbackCategory", saveFeedbackCategoryRoutes);
app.use("/api/getFeedbackCategories", getFeedbackCategoriesRoutes);
app.use("/api/saveCustomerFeedback", saveCustomerFeedbackRoutes);
app.use("/api/getCustomerFeedbacks", getCustomerFeedbacksRoutes);
app.use("/api/getInsights", getInsightsRoutes);
app.use("/api/setAgreementRefs", setAgreementRefsRoutes);
app.use("/api/getAgreementRefs", getAgreementRefsRoutes);
app.use("/api/getAgreementInfo", getAgreementInfoRoutes);
app.use("/api/getApplicantAgreementInfo", getApplicantAgreementInfoRoutes);
app.use("/api/getDistricts", getDistrictsRoutes);
app.use("/api/setResidentialDistrict", setResidentialDistrictRoutes);
app.use("/api/getDashboardAnalysis", getDashboardAnalysisRoutes);

app.use("/api/setFeedbackReply", setFeedbackReplyRoutes);
app.use("/api/getUserFeedbacks", getUserFeedbackRoutes);
app.use("/api/getNumNewFeedbackReplies", getNumNewFeedbackRepliesRoutes);
app.use("/api/markFeedbackRepliesAsRead", markFeedbackRepliesAsReadRoutes);
app.use("/api/getAdminNumNewFeedbackReplies", getAdminNumNewFeedbackRepliesRoutes);
app.use("/api/markCustomerFeedbacksAndRepliesAsRead", markCustomerFeedbacksAndRepliesAsReadRoutes);
app.use("/api/getMonthlyProfits", getMonthlyProfitRoutes);

// Savings Application Routes
app.use("/api/saveSavingsApplication", saveSavingsApplicationRoutes);
app.use("/api/getSavingsApplications", getCustomerSavingsApplicationsRoutes);
app.use("/api/getSavingsApplicationsForManagement", getSavingsApplicationsRoutes);
app.use("/api/declineSavingsApplication", declineSavingsApplicationRoutes);
app.use("/api/approveSavingsApplication", approveSavingsApplicationRoutes);
app.use("/api/getSavingsRecords", getSavingsRecordsRoutes);
app.use("/api/withdrawMaturedSavings", withdrawMaturedSavingsROutes);
app.use("/api/getSavingsAuditTrail", getSavingsAuditTrailRoutes);
app.use("/api/getSavingsAnalytics", getSavingsAnalyticsRoutes);
app.use("/api/fetchSavingsConfig", fetchConfigRecordRoutes);
app.use("/api/setSavingsConfigurations", setNewConfigurationsRoutes);
app.use("/api/getNumSavingsApplications", getNumSavingsApplicationsRoutes);
app.use("/api/getCustomerApprovedSavings", getCustomerApprovedSavingsRoutes);
app.use("/api/getCustomerSavingsInsights", getCustomerSavingsInsightsRoutes);





// Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error occurred:", err.stack);
  res.status(500).json({
    message: "An unexpected error occurred. Please try again later.",
    error: err.message,
  });
});

// Handle 404 (Not Found)
app.use((req, res) => {
  res.status(404).json({
    message: "Resource not found.",
  });
});

// Define Port
const PORT = process.env.PORT || 9999;

// Wait for DB initialization before starting server
dbInitialized
  .then(() => {
    require("./routes/admins/configurations/messeges/updateLoanStatusOnScheduleRoutes.js"); // Schedule loan reminders
    app.listen(PORT, () =>
      console.log(`Server now ready to serve, running on port ${PORT}`),
    );
  })
  .catch((err) => {
    console.error("Database initialization failed:", err);
    process.exit(1);
  });
