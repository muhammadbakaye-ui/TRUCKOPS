import { motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function LandingNav({ onContinue }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 bg-sidebar-background/95 backdrop-blur-md border-b border-sidebar-border z-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-sidebar-primary rounded-lg flex items-center justify-center text-white font-bold">
              T
            </div>
            <span className="text-xl font-bold text-sidebar-primary-foreground">TruckOps</span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sidebar-foreground hover:text-sidebar-primary transition-colors text-sm font-medium">
              Features
            </a>
            <a href="#pricing" className="text-sidebar-foreground hover:text-sidebar-primary transition-colors text-sm font-medium">
              Pricing
            </a>
            <a href="#about" className="text-sidebar-foreground hover:text-sidebar-primary transition-colors text-sm font-medium">
              About
            </a>
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
            <a href="#features" className="block text-sidebar-foreground hover:text-sidebar-primary text-sm font-medium px-0 py-2">
              Features
            </a>
            <a href="#pricing" className="block text-sidebar-foreground hover:text-sidebar-primary text-sm font-medium px-0 py-2">
              Pricing
            </a>
            <a href="#about" className="block text-sidebar-foreground hover:text-sidebar-primary text-sm font-medium px-0 py-2">
              About
            </a>
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