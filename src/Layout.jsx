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
  ShieldCheck,
  ClipboardList,
  Star,
} from 'lucide-react';
import { RoleGuard } from './components/auth/RoleBasedAccess';

const Sidebar = ({ isOpen, setIsOpen, userContext, handleLogout, featureAccess, isSuperAdmin }) => {
  const location = useLocation();

  // **ALL FEATURES ALWAYS AVAILABLE**
  const navLinks = [
    { name: 'SOC Dashboard', href: createPageUrl('Dashboard'), icon: LayoutDashboard },
    { name: 'Learning Path', href: createPageUrl('LearningPath'), icon: BookOpen },
    { name: 'Progress', href: createPageUrl('Progress'), icon: BarChart2 },
    { name: 'Scenarios', href: createPageUrl('Scenarios'), icon: Target },
    { name: 'Quizzes', href: createPageUrl('QuizPage'), icon: ClipboardList },
  ];

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

          {/* All Links - Always Available */}
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
            </Link>
          ))}

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

                {userContext.tenant && (
                    <>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 flex items-center justify-center">
                                <div className="w-2 h-2 bg-teal-400 rounded-full"></div>
                            </div>
                            <span className="text-slate-400 text-xs">Organization:</span>
                        </div>
                        <div className="pl-6 -mt-2">
                            <span className="text-white font-medium">
                                {userContext.tenant.name}
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

  // **ALL FEATURES ALWAYS ENABLED**
  const featureAccess = {
    dashboard_logs: true,
    theoretical_lessons: true,
    quizzes: true,
    scenarios: true,
    progress_tracking: true,
    certificates: true,
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
            }
          } else {
            // User not assigned to tenant - full public access
            role = 'Unassigned';
            console.log('[Layout] ✅ User has no tenant assignment - PUBLIC ACCESS GRANTED');
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
        // REMOVED: Don't redirect to login - let authenticated users access content even without tenant
      }
    };

    fetchUserContext();

    const handleStorageChange = () => {
      console.log('[Layout] Storage changed, refetching user context...');
      fetchUserContext();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [currentPageName]);

  useEffect(() => {
    // REMOVED: No automatic redirects to welcome screen - let users access all content freely
  }, [userContext, currentPageName, navigate]);

  const handleLogout = async () => {
    sessionStorage.removeItem('session_welcome_shown');
    sessionStorage.removeItem('superadmin_impersonation');
    localStorage.removeItem('tenant_context');
    await User.logout();
    window.location.href = '/';
  };

  const handleExitImpersonation = () => {
    console.log('[Layout] Exiting impersonation mode.');
    sessionStorage.removeItem('superadmin_impersonation');
    localStorage.removeItem('tenant_context');
    window.location.href = createPageUrl('SuperAdminDashboard');
  };

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
        {userContext && (
            <Sidebar
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
                userContext={userContext}
                handleLogout={handleLogout}
                featureAccess={featureAccess}
                isSuperAdmin={isSuperAdmin}
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