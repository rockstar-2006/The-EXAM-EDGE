import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { GraduationCap, LayoutDashboard, Users, FileText, Bookmark, LogOut, Menu, Sparkles, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Users, label: 'Student Details', path: '/students' },
  { icon: FileText, label: 'Create Quiz', path: '/create-quiz' },
  { icon: FileText, label: 'Results', path: '/results' },
  { icon: Bookmark, label: 'Bookmarks', path: '/bookmarks' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 70 : 260 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={cn(
        'bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col relative z-20 shadow-xl overflow-hidden'
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border/50 flex items-center justify-between h-16">
        <AnimatePresence mode="wait">
          {!isCollapsed && (
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
                <span className="text-[10px] text-primary/60 font-black uppercase tracking-[0.2em]">Faculty Portal</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hover:bg-sidebar-accent/50 transition-colors"
        >
          <Menu className="h-5 w-5 text-sidebar-foreground/70" />
        </Button>
      </div>

      {/* User Profile */}
      {!isCollapsed && user && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 mx-2 mt-4 rounded-2xl bg-gradient-to-br from-sidebar-accent/50 to-transparent border border-sidebar-border/30"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center p-[2px]">
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
              <p className="text-[11px] text-sidebar-foreground/50 truncate font-medium">Faculty Member</p>
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
                whileHover={{ x: isCollapsed ? 0 : 4 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 relative overflow-hidden',
                  isActive
                    ? 'text-white'
                    : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/30',
                  isCollapsed && 'justify-center'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 gradient-primary -z-10 shadow-lg"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}

                <item.icon className={cn(
                  "h-5 w-5 flex-shrink-0 transition-colors duration-300",
                  isActive ? "text-white" : "group-hover:text-primary"
                )} />

                {!isCollapsed && (
                  <span className="text-sm font-medium tracking-tight whitespace-nowrap">
                    {item.label}
                  </span>
                )}

                {isActive && !isCollapsed && (
                  <motion.div
                    layoutId="activeIndicator"
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
            isCollapsed && 'justify-center px-0'
          )}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!isCollapsed && <span className="text-sm font-semibold">Logout</span>}
        </Button>
      </div>
    </motion.aside>
  );
}

