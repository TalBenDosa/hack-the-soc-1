import Dashboard from './pages/Dashboard';
import Progress from './pages/Progress';
import Admin from './pages/Admin';
import Investigation from './pages/Investigation';
import Scenarios from './pages/Scenarios';
import LearningPath from './pages/LearningPath';
import Certificate from './pages/Certificate';
import InvestigationReport from './pages/InvestigationReport';
import AccessibilityStatement from './pages/AccessibilityStatement';
import QuizPage from './pages/QuizPage';
import TakeQuiz from './pages/TakeQuiz';
import PrivacyPolicy from './pages/PrivacyPolicy';
import CookiePolicy from './pages/CookiePolicy';
import DataRequestForm from './pages/DataRequestForm';
import DataBreachNotice from './pages/DataBreachNotice';
import CompletePrivacyCompliance from './pages/CompletePrivacyCompliance';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import TenantAdminDashboard from './pages/TenantAdminDashboard';
import SubscriptionPlans from './pages/SubscriptionPlans';
import JoinTenant from './pages/JoinTenant';
import StudentWelcome from './pages/StudentWelcome';
import UnassignedUserHandler from './pages/UnassignedUserHandler';
import GlobalContentDashboard from './pages/GlobalContentDashboard';
import BackupRecoveryDashboard from './pages/BackupRecoveryDashboard';
import AcceptAdminInvitation from './pages/AcceptAdminInvitation';
import AdminEnvironmentAccess from './pages/AdminEnvironmentAccess';
import StudentDetailedReport from './pages/StudentDetailedReport';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Progress": Progress,
    "Admin": Admin,
    "Investigation": Investigation,
    "Scenarios": Scenarios,
    "LearningPath": LearningPath,
    "Certificate": Certificate,
    "InvestigationReport": InvestigationReport,
    "AccessibilityStatement": AccessibilityStatement,
    "QuizPage": QuizPage,
    "TakeQuiz": TakeQuiz,
    "PrivacyPolicy": PrivacyPolicy,
    "CookiePolicy": CookiePolicy,
    "DataRequestForm": DataRequestForm,
    "DataBreachNotice": DataBreachNotice,
    "CompletePrivacyCompliance": CompletePrivacyCompliance,
    "SuperAdminDashboard": SuperAdminDashboard,
    "TenantAdminDashboard": TenantAdminDashboard,
    "SubscriptionPlans": SubscriptionPlans,
    "JoinTenant": JoinTenant,
    "StudentWelcome": StudentWelcome,
    "UnassignedUserHandler": UnassignedUserHandler,
    "GlobalContentDashboard": GlobalContentDashboard,
    "BackupRecoveryDashboard": BackupRecoveryDashboard,
    "AcceptAdminInvitation": AcceptAdminInvitation,
    "AdminEnvironmentAccess": AdminEnvironmentAccess,
    "StudentDetailedReport": StudentDetailedReport,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};