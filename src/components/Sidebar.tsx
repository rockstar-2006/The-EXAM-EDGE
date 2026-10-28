import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  GraduationCap, 
  LayoutDashboard, 
  Users, 
  FileText, 
  Bookmark, 
  LogOut, 
  Menu, 
  Sparkles, 
  Settings, 
  Building2, 
  KeyRound,
  X 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Check if current user is Super Admin
  const isAdmin = user?.role === 'admin' || user?.email === 'admin@gmail.com';

  // Dedicated navigation menus: Admin sees ONLY Admin Console and Account Settings
  const navItems = isAdmin
    ? [
        { icon: Building2, label: 'Campus Admin Portal', path: '/admin/dashboard', isAdminOnly: true },
        { icon: KeyRound, label: 'Admin Credentials', path: '/settings' },
      ]
    : [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: Users, label: 'Student Details', path: '/students' },
        { icon: FileText, label: 'Create Quiz', path: '/create-quiz' },
        { icon: FileText, label: 'Results', path: '/results' },
        { icon: Bookmark, label: 'Bookmarks', path: '/bookmarks' },
        { icon: Settings, label: 'Settings & AI Models', path: '/settings' },
      ];

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Close mobile drawer on resize to desktop
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border/50 flex items-center justify-between h-16">
        <AnimatePresence mode="wait">
          {(!isCollapsed || mobile) && (
            <motion.div
              key="logo"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center gap-3"
            >
              <div className="relative group">
                <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-glow transition-all duration-300">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <motion.div
                  className="absolute -top-1 -right-1"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles className="w-4 h-4 text-secondary" />
                </motion.div>
              </div>
              <div className="flex flex-col">
                <span className="font-black text-sm tracking-tighter uppercase italic">Faculty <span className="text-secondary">Quest</span></span>
                <span className="text-[10px] text-primary/60 font-black uppercase tracking-[0.2em]">
                  {isAdmin ? 'Campus Administration' : 'Faculty Portal'}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {mobile ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(false)}
            className="hover:bg-sidebar-accent/50 transition-colors ml-auto"
          >
            <X className="h-5 w-5 text-sidebar-foreground/70" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hover:bg-sidebar-accent/50 transition-colors"
          >
            <Menu className="h-5 w-5 text-sidebar-foreground/70" />
          </Button>
        )}
      </div>

      {/* User Profile */}
      {(!isCollapsed || mobile) && user && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={cn(
            "p-4 mx-2 mt-4 rounded-2xl border transition-all",
            isAdmin 
              ? "bg-indigo-950/20 border-indigo-900/30 text-indigo-200" 
              : "bg-gradient-to-br from-sidebar-accent/50 to-transparent border-sidebar-border/30"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center p-[2px]",
                isAdmin ? "bg-indigo-600" : "gradient-primary"
              )}>
                <div className="w-full h-full rounded-full bg-sidebar flex items-center justify-center overflow-hidden">
                  <span className="text-sm font-bold bg-gradient-to-br from-primary to-secondary bg-clip-text text-transparent">
                    {user.name.charAt(0)}
                  </span>
                </div>
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-sidebar rounded-full" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate tracking-tight">{user.name}</p>
              <p className={cn("text-[11px] truncate font-black uppercase tracking-wider", isAdmin ? "text-indigo-400" : "text-sidebar-foreground/50")}>
                {isAdmin ? 'Campus Administrator' : 'Faculty Member'}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-2 mt-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className="block relative group"
            >
              <motion.div
                whileHover={{ x: (isCollapsed && !mobile) ? 0 : 4 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 relative overflow-hidden',
                  item.isAdminOnly && !isActive && 'text-indigo-400/80 hover:text-indigo-300 hover:bg-indigo-950/30 border border-indigo-950/40',
                  isActive
                    ? 'text-white'
                    : !item.isAdminOnly && 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/30',
                  (isCollapsed && !mobile) && 'justify-center'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId={mobile ? "activeNavMobile" : "activeNav"}
                    className={cn("absolute inset-0 -z-10 shadow-lg", item.isAdminOnly ? "bg-indigo-600" : "gradient-primary")}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}

                <item.icon className={cn(
                  "h-5 w-5 flex-shrink-0 transition-colors duration-300",
                  isActive ? "text-white" : item.isAdminOnly ? "text-red-400" : "group-hover:text-primary"
                )} />

                {(!isCollapsed || mobile) && (
                  <span className="text-sm font-medium tracking-tight whitespace-nowrap">
                    {item.label}
                  </span>
                )}

                {isActive && (!isCollapsed || mobile) && (
                  <motion.div
                    layoutId={mobile ? "activeIndicatorMobile" : "activeIndicator"}
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]"
                  />
                )}
              </motion.div>
            </NavLink>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-sidebar-border/50">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className={cn(
            'w-full justify-start gap-3 hover:bg-destructive/10 hover:text-destructive group rounded-xl transition-all h-11',
            (isCollapsed && !mobile) && 'justify-center px-0'
          )}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {(!isCollapsed || mobile) && <span className="text-sm font-semibold">Logout</span>}
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-sidebar rounded-xl flex items-center justify-center shadow-lg border border-sidebar-border/50"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5 text-sidebar-foreground" />
      </button>

      {/* Mobile overlay backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="md:hidden fixed top-0 left-0 h-full w-[280px] z-50 bg-sidebar text-sidebar-foreground flex flex-col shadow-2xl overflow-hidden"
          >
            <SidebarContent mobile />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 70 : 260 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={cn(
          'hidden md:flex bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex-col relative z-20 shadow-xl overflow-hidden'
        )}
      >
        <SidebarContent />
      </motion.aside>
    </>
  );
}
