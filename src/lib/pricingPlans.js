import { Zap, Shield, Building2, Crown } from 'lucide-react';

/**
 * Per-plan limits for drivers, trucks, and simultaneous document uploads.
 * Infinity = unlimited.
 */
export const PLAN_LIMITS = {
  basic:        { driverLimit: 3,        truckLimit: 3,        uploadLimit: 8  },
  professional: { driverLimit: 10,       truckLimit: 10,       uploadLimit: 16 },
  enterprise:   { driverLimit: Infinity, truckLimit: Infinity, uploadLimit: 30 },
  lifetime:     { driverLimit: Infinity, truckLimit: Infinity, uploadLimit: 60 },
  // Preview / no-subscription: generous taste of the app at basic limits
  preview:      { driverLimit: 3,        truckLimit: 3,        uploadLimit: 8  },
};

export const PLANS = [
  {
    key: 'basic',
    name: 'Basic',
    price: 39,
    priceLabel: '$39/mo',
    icon: Zap,
    color: 'text-blue-500',
    border: 'border-blue-200',
    bg: 'bg-blue-50',
    description: 'Owner-operators & small fleets',
    bestFor: 'Solo operators or small 2–3 person teams who are just getting started',
    features: [
      'Up to 3 drivers & 3 trucks',
      'Max 8 document uploads at a time',
      'Load management',
      'Invoicing',
      'Company & driver directory',
      'Document uploads',
      'Driver portal',
    ],
  },
  {
    key: 'professional',
    name: 'Professional',
    price: 79,
    priceLabel: '$79/mo',
    icon: Shield,
    color: 'text-primary',
    border: 'border-primary/30',
    bg: 'bg-primary/5',
    description: 'Small trucking companies',
    popular: true,
    bestFor: 'Growing companies with up to 10 vehicles and dedicated dispatch & payroll needs',
    includedFrom: 'Basic',
    features: [
      'Up to 10 drivers & 10 trucks',
      'Max 16 document uploads at a time',
      'All current & future features',
    ],
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: 149,
    priceLabel: '$149/mo',
    icon: Building2,
    color: 'text-amber-500',
    border: 'border-amber-200',
    bg: 'bg-amber-50',
    description: 'Large trucking operations',
    bestFor: 'Established fleets that need unlimited scale and the highest document throughput',
    includedFrom: 'Professional',
    features: [
      'Unlimited drivers & trucks',
      'Max 30 document uploads at a time',
    ],
  },
  {
    key: 'lifetime',
    name: 'Lifetime',
    price: 499,
    priceLabel: '$499 one-time',
    oneTime: true,
    icon: Crown,
    color: 'text-emerald-500',
    border: 'border-emerald-200',
    bg: 'bg-emerald-50',
    description: 'Pay once, use forever',
    bestFor: 'Owners who want to avoid recurring charges and get every feature — now and in the future',
    includedFrom: 'Enterprise',
    features: [
      'Max 60 document uploads at a time',
      'All future features & updates forever',
      'Lifetime priority support',
    ],
  },
];