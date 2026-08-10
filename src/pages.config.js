import AcceptAdminInvitation from './pages/AcceptAdminInvitation';
import CTFChallenges from './pages/CTFChallenges';
import CTFChallenge from './pages/CTFChallenge';
import AccessibilityStatement from './pages/AccessibilityStatement';
import Admin from './pages/Admin';
import AdminEnvironmentAccess from './pages/AdminEnvironmentAccess';
import BackupRecoveryDashboard from './pages/BackupRecoveryDashboard';
import Certificate from './pages/Certificate';
import CompletePrivacyCompliance from './pages/CompletePrivacyCompliance';
import CookiePolicy from './pages/CookiePolicy';
import Dashboard from './pages/Dashboard';
import DataBreachNotice from './pages/DataBreachNotice';
import DataRequestForm from './pages/DataRequestForm';
import GlobalContentDashboard from './pages/GlobalContentDashboard';
import Home from './pages/Home';
import Investigation from './pages/Investigation';
import InvestigationReport from './pages/InvestigationReport';
import JoinTenant from './pages/JoinTenant';
import LearningPath from './pages/LearningPath';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Progress from './pages/Progress';
import QuizPage from './pages/QuizPage';
import Scenarios from './pages/Scenarios';
import StudentDetailedReport from './pages/StudentDetailedReport';
import StudentWelcome from './pages/StudentWelcome';
import SubscriptionPlans from './pages/SubscriptionPlans';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import TakeQuiz from './pages/TakeQuiz';
import TenantAdminDashboard from './pages/TenantAdminDashboard';
import UnassignedUserHandler from './pages/UnassignedUserHandler';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AcceptAdminInvitation": AcceptAdminInvitation,
    "CTFChallenges": CTFChallenges,
    "CTFChallenge": CTFChallenge,
    "AccessibilityStatement": AccessibilityStatement,
    "Admin": Admin,
    "AdminEnvironmentAccess": AdminEnvironmentAccess,
    "BackupRecoveryDashboard": BackupRecoveryDashboard,
    "Certificate": Certificate,
    "CompletePrivacyCompliance": CompletePrivacyCompliance,
    "CookiePolicy": CookiePolicy,
    "Dashboard": Dashboard,
    "DataBreachNotice": DataBreachNotice,
    "DataRequestForm": DataRequestForm,
    "GlobalContentDashboard": GlobalContentDashboard,
    "Home": Home,
    "Investigation": Investigation,
    "InvestigationReport": InvestigationReport,
    "JoinTenant": JoinTenant,
    "LearningPath": LearningPath,
    "PrivacyPolicy": PrivacyPolicy,
    "Progress": Progress,
    "QuizPage": QuizPage,
    "Scenarios": Scenarios,
    "StudentDetailedReport": StudentDetailedReport,
    "StudentWelcome": StudentWelcome,
    "SubscriptionPlans": SubscriptionPlans,
    "SuperAdminDashboard": SuperAdminDashboard,
    "TakeQuiz": TakeQuiz,
    "TenantAdminDashboard": TenantAdminDashboard,
    "UnassignedUserHandler": UnassignedUserHandler,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};