import { motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function LandingNav({ onContinue }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogoClick = () => {
    if (location.pathname === '/') {
      window.location.reload();
    } else {
      navigate('/');
    }
  };

  const handleNavClick = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 bg-very-dark/95 backdrop-blur-md border-b border-sidebar-border z-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo - Clickable */}
          <button
            onClick={handleLogoClick}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <div className="h-8 w-8 bg-sidebar-primary rounded-lg flex items-center justify-center text-white font-bold">
              T
            </div>
            <span className="text-xl font-bold text-sidebar-primary-foreground">TruckOps</span>
          </button>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <button
              onClick={() => handleNavClick('/features')}
              className="text-sidebar-foreground hover:text-sidebar-primary transition-colors text-sm font-medium"
            >
              Features
            </button>
            <button
              onClick={() => handleNavClick('/pricing')}
              className="text-sidebar-foreground hover:text-sidebar-primary transition-colors text-sm font-medium"
            >
              Pricing
            </button>
            <button
              onClick={() => handleNavClick('/about')}
              className="text-sidebar-foreground hover:text-sidebar-primary transition-colors text-sm font-medium"
            >
              About
            </button>
            <Button
              onClick={onContinue}
              variant="default"
              className="bg-sidebar-primary hover:bg-sidebar-primary/90"
            >
              Get Started
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-sidebar-foreground hover:text-sidebar-primary"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden border-t border-sidebar-border py-4 space-y-3"
          >
            <button
              onClick={() => handleNavClick('/features')}
              className="block text-sidebar-foreground hover:text-sidebar-primary text-sm font-medium px-0 py-2 w-full text-left"
            >
              Features
            </button>
            <button
              onClick={() => handleNavClick('/pricing')}
              className="block text-sidebar-foreground hover:text-sidebar-primary text-sm font-medium px-0 py-2 w-full text-left"
            >
              Pricing
            </button>
            <button
              onClick={() => handleNavClick('/about')}
              className="block text-sidebar-foreground hover:text-sidebar-primary text-sm font-medium px-0 py-2 w-full text-left"
            >
              About
            </button>
            <Button
              onClick={onContinue}
              variant="default"
              className="w-full bg-sidebar-primary hover:bg-sidebar-primary/90"
            >
              Get Started
            </Button>
          </motion.div>
        )}
      </div>
    </motion.nav>
  );
}