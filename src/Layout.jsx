import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { User } from '@/entities/User';
import {
  LayoutDashboard,
  BarChart2,
  BookOpen,
  Target,
  Shield,
  Settings,
  LogOut,
  UserCircle,
  Menu,
  X,
  ClipboardList,
  Swords,
} from 'lucide-react';

const Sidebar = ({ isOpen, setIsOpen, user, handleLogout, isAdmin }) => {
  const location = useLocation();

  const navLinks = [
    { name: 'SOC Dashboard', href: createPageUrl('Dashboard'), icon: LayoutDashboard },
    { name: 'Learning Path', href: createPageUrl('LearningPath'), icon: BookOpen },
    { name: 'Progress', href: createPageUrl('Progress'), icon: BarChart2 },
    { name: 'Scenarios', href: createPageUrl('Scenarios'), icon: Target },
    { name: 'Quizzes', href: createPageUrl('QuizPage'), icon: ClipboardList },
    { name: 'CTF Lab', href: '/CTF', icon: Swords },
  ];

  const adminLinks = isAdmin ? [
    { name: 'Admin Panel', href: createPageUrl('Admin'), icon: Settings }
  ] : [];

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
        </nav>

        <div className="mt-auto p-4 border-t border-slate-800">
          <p className="px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">User</p>
          {user ? (
            <div className="space-y-3 text-sm text-slate-300 px-2">
                <div className="flex items-center gap-2 truncate">
                    <UserCircle className="w-4 h-4 text-teal-400 flex-shrink-0" />
                    <span className="truncate font-medium text-white" title={user.full_name}>
                        {user.full_name}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-teal-400 flex-shrink-0" />
                    <span className="text-slate-300">
                        {isAdmin ? 'Admin' : 'User'}
                    </span>
                </div>
            </div>
          ) : (
             <div className="text-sm text-slate-400 px-2">Loading...</div>
          )}
        </div>
      </div>
    </>
  );
};

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);
      } catch (error) {
        console.error("User not authenticated:", error);
      }
    };

    fetchUser();
  }, [currentPageName]);

  const handleLogout = async () => {
    await User.logout();
    window.location.href = '/';
  };

  const noLayoutPages = [
    'StudentWelcome', 'UnassignedUserHandler', 'JoinTenant', 'AcceptAdminInvitation', 
    'AdminEnvironmentAccess', 'CompletePrivacyCompliance',
    'PrivacyPolicy', 'CookiePolicy', 'AccessibilityStatement', 'DataRequestForm',
  ];

  if (noLayoutPages.includes(currentPageName)) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-slate-950">
      {user && (
          <Sidebar
              isOpen={isSidebarOpen}
              setIsOpen={setIsSidebarOpen}
              user={user}
              handleLogout={handleLogout}
              isAdmin={isAdmin}
          />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-slate-900/50 backdrop-blur-sm border-b border-slate-800 p-4 flex items-center justify-between lg:justify-end">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden text-slate-300 hover:text-white"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-4">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-950 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}