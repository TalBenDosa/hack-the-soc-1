import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { User } from '@/entities/User';
import { Tenant } from '@/entities/Tenant';
import { TenantUser } from '@/entities/TenantUser';
import TenantMiddleware from './components/auth/TenantMiddleware';
import {
  LayoutDashboard,
  BarChart2,
  BookOpen,
  Target,
  Shield,
  Settings,
  LogOut,
  Facebook,
  Linkedin,
  Twitter,
  Instagram,
  UserCircle,
  Menu,
  X,
  ShieldCheck, // for SuperAdmin
  ClipboardList, // Restoring Quizzes icon
  Star, // Added for Tier icon
} from 'lucide-react';
import { RoleGuard } from './components/auth/RoleBasedAccess';

const Sidebar = ({ isOpen, setIsOpen, userContext, handleLogout, featureAccess, isSuperAdmin }) => {
  const location = useLocation();

  // featureAccess and isSuperAdmin are now passed as props from Layout

  // **BASIC NAVIGATION** - Always available
  const navLinks = [
    { name: 'SOC Dashboard', href: createPageUrl('Dashboard'), icon: LayoutDashboard },
    { name: 'Learning Path', href: createPageUrl('LearningPath'), icon: BookOpen },
  ];

  // SIEM Learning Path has been removed completely from navigation

  // **CONDITIONAL NAVIGATION** - Based on subscription tier
  const conditionalLinks = [];

  if (featureAccess.progress_tracking) {
    conditionalLinks.push({ name: 'Progress', href: createPageUrl('Progress'), icon: BarChart2 });
  }

  if (featureAccess.scenarios) {
    conditionalLinks.push({ name: 'Scenarios', href: createPageUrl('Scenarios'), icon: Target });
  }

  // **ADMIN LINKS** - Only for admins and tenant admins
  const adminLinks = [];
  if (isSuperAdmin || userContext?.role === 'Environment Admin') {
    adminLinks.push({ name: 'Admin Panel', href: createPageUrl('Admin'), icon: Settings });
  }

  // **SUPER ADMIN LINKS** - Only for Super Admin
  const superAdminLinks = [];
  if (isSuperAdmin) {
    superAdminLinks.push({ name: 'SuperAdmin', href: createPageUrl('SuperAdminDashboard'), icon: ShieldCheck });
  }

  return (
    <>
      {/* Mobile Menu Backdrop */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-30 transition-opacity lg:hidden ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
      ></div>

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full bg-slate-900 text-white w-64 transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:-translate-x-0 lg:relative lg:w-60 flex-shrink-0 transition-transform duration-300 ease-in-out z-40 border-r border-slate-800 flex flex-col`}
      >
        <div className="p-4 flex items-center justify-between border-b border-slate-800">
          <Link to={createPageUrl('Dashboard')} className="flex items-center gap-2">
            <div className="bg-teal-500 p-1.5 rounded-md">
              <Shield className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg">Hack The SOC</span>
          </Link>
          <button onClick={() => setIsOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-grow px-2 py-4 space-y-2">
          <p className="px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Navigation</p>

          {/* Always Available Links */}
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.href}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                location.pathname === link.href ? 'bg-teal-500/10 text-teal-400' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <link.icon className="w-5 h-5" />
              {link.name}
              {/* Removed link.premium check as SIEM Learning Path is removed and it was the only link with this property */}
            </Link>
          ))}

          {/* Conditional Links Based on Subscription */}
          {conditionalLinks.map((link) => (
            <Link
              key={link.name}
              to={link.href}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                location.pathname === link.href ? 'bg-teal-500/10 text-teal-400' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <link.icon className="w-5 h-5" />
              {link.name}
            </Link>
          ))}

          {/* Quizzes Link - Only if feature enabled */}
          {featureAccess.quizzes && (
            <Link
              to={createPageUrl('QuizPage')}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                location.pathname === createPageUrl('QuizPage') ? 'bg-teal-500/10 text-teal-400' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <ClipboardList className="w-5 h-5" />
              Quizzes
            </Link>
          )}

          {/* Admin Links */}
          {adminLinks.map((link) => (
            <Link
              key={link.name}
              to={link.href}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                location.pathname === link.href ? 'bg-teal-500/10 text-teal-400' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <link.icon className="w-5 h-5" />
              {link.name}
            </Link>
          ))}

          {/* Super Admin Links */}
          {superAdminLinks.map((link) => (
            <Link
              key={link.name}
              to={link.href}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                location.pathname === link.href ? 'bg-teal-500/10 text-teal-400' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <link.icon className="w-5 h-5" />
              {link.name}
            </Link>
          ))}
        </nav>

        <div className="mt-auto p-4 border-t border-slate-800">
          <p className="px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">User Status</p>
          {userContext ? (
            <div className="space-y-3 text-sm text-slate-300 px-2">
                <div className="flex items-center gap-2 truncate">
                    <UserCircle className="w-4 h-4 text-teal-400 flex-shrink-0" />
                    <span className="truncate font-medium text-white" title={userContext.user.full_name}>
                        {userContext.user.full_name}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-teal-400 flex-shrink-0" />
                    <span className={userContext.isImpersonating ? 'text-yellow-300' : 'text-slate-300'}>
                        {userContext.role}
                    </span>
                </div>

                {/* **ENHANCED**: Special display for Super Admin impersonation */}
                {userContext.isImpersonating && userContext.impersonatedTenant && (
                    <div className="bg-yellow-600/30 p-3 rounded-lg border border-yellow-600/50">
                        <div className="flex items-center gap-2 mb-2">
                            <ShieldCheck className="w-4 h-4 text-yellow-400" />
                            <span className="text-yellow-300 text-xs font-semibold">🔒 IMPERSONATING CLIENT:</span>
                        </div>
                        <div className="text-yellow-100 font-bold text-sm">{userContext.impersonatedTenant.name}</div>
                        <div className="text-yellow-300 text-xs">Domain: {userContext.impersonatedTenant.domain}</div>
                        <div className="text-yellow-300 text-xs">Tier: {userContext.impersonatedTenant.subscription_tier}</div>
                    </div>
                )}

                {/* Show organization details for non-super admins or when not impersonating */}
                {((!userContext.isImpersonating && userContext.user.role !== 'admin' && userContext.tenant) ||
                  (userContext.isImpersonating && userContext.impersonatedTenant)) && (
                    <>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 flex items-center justify-center">
                                <div className="w-2 h-2 bg-teal-400 rounded-full"></div>
                            </div>
                            <span className="text-slate-400 text-xs">Organization:</span>
                        </div>
                        <div className="pl-6 -mt-2">
                            <span className="text-white font-medium">
                                {userContext.isImpersonating ? userContext.impersonatedTenant.name : userContext.tenant.name}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <Star className="w-4 h-4 text-teal-400 flex-shrink-0" />
                            <span className="text-slate-400 text-xs">Subscription:</span>
                        </div>
                        <div className="pl-6 -mt-2">
                            <span className="text-teal-300 font-medium capitalize">
                                {userContext.isImpersonating ? userContext.impersonatedTenant.subscription_tier : userContext.tenant.subscription_tier} Tier
                            </span>
                        </div>
                    </>
                )}
            </div>
          ) : (
             <div className="text-sm text-slate-400 px-2">Loading...</div>
          )}

          <div className="flex justify-center space-x-4 mt-6">
              <a href="#" className="text-slate-500 hover:text-white"><Facebook className="w-4 h-4"/></a>
              <a href="#" className="text-slate-500 hover:text-white"><Linkedin className="w-4 h-4"/></a>
              <a href="#" className="text-slate-500 hover:text-white"><Twitter className="w-4 h-4"/></a>
              <a href="#" className="text-slate-500 hover:text-white"><Instagram className="w-4 h-4"/></a>
          </div>
        </div>
      </div>
    </>
  );
};

export default function Layout({ children, currentPageName }) {
  const [userContext, setUserContext] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  // Get feature access based on tenant subscription
  const getTenantFeatureAccess = () => {
    if (!userContext?.impersonatedTenant && !userContext?.tenant) {
      // No tenant context - show basic features and default quizzes to true
      return {
        dashboard_logs: true,
        theoretical_lessons: true,
        quizzes: true,
        scenarios: true,
        progress_tracking: true,
        certificates: false,
        // siem_learning_path is removed
      };
    }

    const currentTenant = userContext.impersonatedTenant || userContext.tenant;
    // If tenant.feature_access exists, use it. Otherwise, default to these settings.
    const baseAccess = currentTenant.feature_access || {
      dashboard_logs: true,
      theoretical_lessons: true,
      quizzes: true,
      scenarios: true,
      progress_tracking: true,
      certificates: false
    };

    // SIEM Learning Path availability logic is removed
    return {
      ...baseAccess,
      // siem_learning_path: currentTenant.subscription_tier === 'full' // Removed
    };
  };

  // Calculate featureAccess and isSuperAdmin based on userContext state
  const featureAccess = userContext
    ? getTenantFeatureAccess()
    : { // Default access if userContext is null (e.g., initial render)
        dashboard_logs: true,
        theoretical_lessons: true,
        quizzes: true,
        scenarios: true,
        progress_tracking: true,
        certificates: false,
        // siem_learning_path is removed
      };

  const isSuperAdmin = userContext?.user?.role === 'admin';


  useEffect(() => {
    const fetchUserContext = async () => {
      try {
        const user = await User.me();
        let tenant = null;
        let role = user.role;
        let tenantContext = null;
        let impersonatedTenant = null;
        const isImpersonating = sessionStorage.getItem('superadmin_impersonation') !== null;

        if (isImpersonating) {
          const impersonationData = JSON.parse(sessionStorage.getItem('superadmin_impersonation'));
          const targetTenantId = impersonationData.target_tenant_id;
          const tenants = await Tenant.filter({ id: targetTenantId });
          if (tenants.length > 0) {
            impersonatedTenant = tenants[0];
            role = `Super Admin → ${impersonatedTenant.name}`;
          }
        } else if (user.role !== 'admin') {
          const tenantUsers = await TenantUser.filter({ user_id: user.id, status: 'active' });
          if (tenantUsers.length > 0) {
            tenantContext = tenantUsers[0];
            const tenants = await Tenant.filter({ id: tenantContext.tenant_id });
            if (tenants.length > 0) {
              tenant = tenants[0];
              role = tenantContext.role === 'tenant_admin' ? 'Environment Admin' : 'Student';
            } else {
              role = 'Unassigned'; // User logged in but tenant not found
            }
          } else {
            role = 'Unassigned'; // User logged in but not assigned to an active tenant
          }
        } else {
            role = "Super Admin";
        }

        setUserContext({
          user,
          tenant,
          role,
          tenantContext,
          isImpersonating,
          impersonatedTenant
        });
      } catch (error) {
        console.error("User not authenticated or error fetching context:", error);
        // Redirect to login if user not authenticated, unless on specific allowed public pages
        if (currentPageName && !['PrivacyPolicy', 'CookiePolicy', 'AccessibilityStatement', 'DataRequestForm', 'CompletePrivacyCompliance', 'JoinTenant'].includes(currentPageName)) {
            window.location.href = '/';
        }
      }
    };

    fetchUserContext();

    const handleStorageChange = () => {
      console.log('[Layout] Storage changed, refetching user context...');
      fetchUserContext();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [currentPageName]); // Added currentPageName as a dependency

  // This useEffect handles the welcome screen redirection.
  // It runs whenever the user context is updated or the page changes.
  useEffect(() => {
    if (userContext?.user) {
      const welcomeShown = sessionStorage.getItem('session_welcome_shown');

      // Only redirect if user is a regular user (not Super Admin), not currently impersonating,
      // the welcome screen hasn't been shown in this session, and they aren't already on the welcome page.
      if (
        userContext.user.role !== 'admin' &&
        !userContext.isImpersonating &&
        !welcomeShown &&
        currentPageName !== 'StudentWelcome'
      ) {
        sessionStorage.setItem('session_welcome_shown', 'true');
        console.log('[Layout] New session for student/tenant-admin. Redirecting to Welcome Screen.');
        navigate(createPageUrl('StudentWelcome'));
      }
    }
  }, [userContext, currentPageName, navigate]);


  const handleLogout = async () => {
    // Clear session storage on logout to ensure welcome screen shows next time
    sessionStorage.removeItem('session_welcome_shown');
    sessionStorage.removeItem('superadmin_impersonation'); // Also clear impersonation just in case
    localStorage.removeItem('tenant_context'); // Clear any cached tenant context too
    await User.logout();
    window.location.href = '/'; // Force a reload to the login page
  };

  const handleExitImpersonation = () => {
    console.log('[Layout] Exiting impersonation mode.');
    sessionStorage.removeItem('superadmin_impersonation');
    localStorage.removeItem('tenant_context');
    // Force a navigation and reload to the Super Admin dashboard
    window.location.href = createPageUrl('SuperAdminDashboard');
  };

  // Exclude layout for specific pages
  const noLayoutPages = [
    'StudentWelcome', 'UnassignedUserHandler', 'JoinTenant', 'AcceptAdminInvitation', 'AdminEnvironmentAccess', 'CompletePrivacyCompliance',
    'PrivacyPolicy', 'CookiePolicy', 'AccessibilityStatement', 'DataRequestForm',
  ];

  if (noLayoutPages.includes(currentPageName)) {
    return <>{children}</>;
  }

  return (
    <TenantMiddleware>
      <div className="flex h-screen bg-slate-950">
        {/* Render Sidebar only if userContext is available (meaning user is logged in and context loaded) */}
        {userContext && (
            <Sidebar
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
                userContext={userContext}
                handleLogout={handleLogout}
                featureAccess={featureAccess} // Pass featureAccess derived in Layout
                isSuperAdmin={isSuperAdmin}   // Pass isSuperAdmin derived in Layout
            />
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
          {userContext?.isImpersonating && userContext.impersonatedTenant && (
            <div className="bg-yellow-500 text-black text-center p-2 font-bold text-sm shadow-lg flex items-center justify-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              You are logged in as SuperAdmin to the "{userContext.impersonatedTenant.name}" environment.
            </div>
          )}
          <header className="bg-slate-900/50 backdrop-blur-sm border-b border-slate-800 p-4 flex items-center justify-between lg:justify-end">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden text-slate-300 hover:text-white"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-4">
              {userContext?.isImpersonating ? (
                <button
                  onClick={handleExitImpersonation}
                  className="flex items-center gap-2 text-sm text-yellow-300 hover:text-yellow-200 transition-colors bg-yellow-500/10 px-3 py-2 rounded-md"
                >
                  <LogOut className="w-4 h-4" />
                  Exit Client View
                </button>
              ) : (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              )}
            </div>
          </header>
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-950 p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </TenantMiddleware>
  );
}