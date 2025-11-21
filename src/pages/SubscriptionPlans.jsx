
import React, { useState, useEffect } from 'react';
import { User } from '@/entities/User';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Star, Zap, Crown, ArrowRight, Settings, CreditCard } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { RoleGuard } from '../components/auth/RoleBasedAccess';

const SUBSCRIPTION_PLANS = {
  basic: {
    name: "Basic",
    icon: Star,
    price: "Free",
    monthlyPrice: 0,
    description: "Perfect for getting started with cybersecurity training",
    color: "border-blue-500",
    features: [
      "Access to dashboard logs",
      "Access to theoretical lessons", 
      "Basic progress tracking",
      "Community support"
    ]
  },
  intermediate: {
    name: "Intermediate",
    icon: Zap, 
    price: "$29/month",
    monthlyPrice: 29,
    description: "Enhanced learning with interactive assessments",
    color: "border-purple-500",
    popular: true,
    features: [
      "Everything in Basic",
      "Multiple-choice questionnaires",
      "Advanced analytics dashboard",
      "Performance insights",
      "Email support",
      "Downloadable certificates"
    ]
  },
  full: {
    name: "Full",
    icon: Crown,
    price: "$99/month", 
    monthlyPrice: 99,
    description: "Complete SOC analyst training experience",
    color: "border-amber-500",
    features: [
      "Everything in Intermediate",
      "Full scenarios page access",
      "Simulated attack/defense scenarios",
      "Advanced SOC investigations",
      "Priority support",
      "Custom reporting",
      "1-on-1 mentoring sessions"
    ]
  }
};

export default function SubscriptionPlans() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(null);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    setLoading(true);
    try {
      const user = await User.me();
      setCurrentUser(user);
    } catch (error) {
      console.error("Failed to fetch user:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTierChange = async (newTier) => {
    if (!currentUser || processing) return;

    const currentTier = currentUser.subscription_tier || 'basic';
    if (newTier === currentTier) return;

    setProcessing(newTier);

    try {
      // Immediate tier change (in real app, this would integrate with payment processor)
      await User.updateMyUserData({
        subscription_tier: newTier,
        subscription_start_date: new Date().toISOString(),
        subscription_end_date: null, // null = permanent/active subscription
        payment_status: 'active'
      });

      // Refresh user data
      await fetchUser();
      
      const isUpgrade = SUBSCRIPTION_PLANS[newTier].monthlyPrice > SUBSCRIPTION_PLANS[currentTier].monthlyPrice;
      alert(`Successfully ${isUpgrade ? 'upgraded' : 'changed'} to ${SUBSCRIPTION_PLANS[newTier].name} plan!`);

    } catch (error) {
      console.error("Failed to change subscription:", error);
      alert("Failed to update subscription. Please try again.");
    } finally {
      setProcessing(null);
      setShowConfirmDialog(null);
    }
  };

  const requestTierChange = (tier) => {
    setShowConfirmDialog(tier);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400 mx-auto"></div>
          <p className="mt-4 text-white">Loading subscription plans...</p>
        </div>
      </div>
    );
  }

  const currentTier = currentUser?.subscription_tier || 'basic';
  const currentPlan = SUBSCRIPTION_PLANS[currentTier];

  return (
    <RoleGuard permission="create_lessons">
      <div className="min-h-screen bg-slate-900 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Manage Your Subscription
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-6">
              Upgrade, downgrade, or manage your cybersecurity training plan
            </p>
            
            {/* Current Subscription Status */}
            <Card className="bg-slate-800 border-slate-700 max-w-md mx-auto mb-8">
              <CardContent className="p-6">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className={`p-2 rounded-full ${currentPlan.color.replace('border-', 'bg-').replace('500', '500/20')}`}>
                    <currentPlan.icon className="w-6 h-6 text-teal-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Current Plan</h3>
                    <Badge className="bg-teal-600 text-white mt-1">
                      {currentPlan.name} - {currentPlan.price}
                    </Badge>
                  </div>
                </div>
                {currentUser?.subscription_start_date && (
                  <p className="text-sm text-slate-400">
                    Active since {new Date(currentUser.subscription_start_date).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Subscription Plans */}
          <div className="grid md:grid-cols-3 gap-8">
            {Object.entries(SUBSCRIPTION_PLANS).map(([tier, plan]) => {
              const Icon = plan.icon;
              const isCurrentPlan = tier === currentTier;
              const isUpgrade = plan.monthlyPrice > SUBSCRIPTION_PLANS[currentTier].monthlyPrice;
              const isDowngrade = plan.monthlyPrice < SUBSCRIPTION_PLANS[currentTier].monthlyPrice && plan.monthlyPrice >= 0;
              const canChange = tier !== currentTier;
              
              return (
                <Card key={tier} className={`bg-slate-800 ${plan.color} relative ${plan.popular ? 'ring-2 ring-purple-500' : ''} ${isCurrentPlan ? 'ring-2 ring-teal-500' : ''}`}>
                  {plan.popular && !isCurrentPlan && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-purple-600 text-white px-4 py-1">
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  
                  {isCurrentPlan && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-teal-600 text-white px-4 py-1">
                        Current Plan
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className="text-center pb-2">
                    <div className="mx-auto w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mb-4">
                      <Icon className="w-8 h-8 text-teal-400" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-white">
                      {plan.name}
                    </CardTitle>
                    <div className="text-3xl font-bold text-teal-400 mt-2">
                      {plan.price}
                    </div>
                    <p className="text-slate-400 mt-2">
                      {plan.description}
                    </p>
                  </CardHeader>
                  
                  <CardContent>
                    <ul className="space-y-3 mb-8">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-teal-400 mt-0.5 flex-shrink-0" />
                          <span className="text-slate-300">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <div className="space-y-3">
                      {isCurrentPlan ? (
                        <Button disabled className="w-full bg-teal-600">
                          <Settings className="w-4 h-4 mr-2" />
                          Current Plan
                        </Button>
                      ) : canChange ? (
                        <Button 
                          onClick={() => requestTierChange(tier)}
                          disabled={processing === tier}
                          className={`w-full ${
                            isUpgrade 
                              ? 'bg-teal-600 hover:bg-teal-700' 
                              : 'bg-slate-600 hover:bg-slate-700'
                          }`}
                        >
                          {processing === tier ? (
                            "Processing..."
                          ) : (
                            <>
                              <CreditCard className="w-4 h-4 mr-2" />
                              {isUpgrade ? 'Upgrade' : 'Switch'} to {plan.name}
                              {!isDowngrade && <ArrowRight className="w-4 h-4 ml-2" />}
                            </>
                          )}
                        </Button>
                      ) : null}
                      
                      {tier === 'basic' && !isCurrentPlan && (
                        <p className="text-xs text-center text-slate-500">
                          Downgrade to free plan
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Billing Information */}
          {currentUser?.subscription_tier && currentUser.subscription_tier !== 'basic' && (
            <Card className="bg-slate-800 border-slate-700 mt-12 max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-teal-400" />
                  Billing Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Current Plan:</span>
                    <span className="text-white font-semibold">{currentPlan.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Monthly Cost:</span>
                    <span className="text-white font-semibold">{currentPlan.price}</span>
                  </div>
                  {currentUser.subscription_start_date && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">Billing Started:</span>
                      <span className="text-white">
                        {new Date(currentUser.subscription_start_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Status:</span>
                    <Badge className="bg-green-600 text-white">
                      {currentUser.payment_status || 'Active'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Contact Section */}
          <div className="mt-16 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">
              Need Help or Custom Solutions?
            </h2>
            <p className="text-slate-400 mb-6">
              Contact our team for enterprise pricing, custom training programs, or billing support
            </p>
            <Button variant="outline" className="border-teal-400 text-teal-400 hover:bg-teal-400 hover:text-slate-900">
              Contact Support
            </Button>
          </div>
        </div>

        {/* Confirmation Dialog */}
        {showConfirmDialog && (
          <Dialog open={true} onOpenChange={() => setShowConfirmDialog(null)}>
            <DialogContent className="bg-slate-800 border-slate-700 text-white">
              <DialogHeader>
                <DialogTitle>
                  Confirm Subscription Change
                </DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p className="text-slate-300">
                  Are you sure you want to {SUBSCRIPTION_PLANS[showConfirmDialog].monthlyPrice > SUBSCRIPTION_PLANS[currentTier].monthlyPrice ? 'upgrade' : 'change'} to the <strong>{SUBSCRIPTION_PLANS[showConfirmDialog].name}</strong> plan?
                </p>
                {SUBSCRIPTION_PLANS[showConfirmDialog].monthlyPrice > 0 && (
                  <p className="text-sm text-slate-400 mt-2">
                    Your billing will be updated to ${SUBSCRIPTION_PLANS[showConfirmDialog].monthlyPrice}/month.
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowConfirmDialog(null)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => handleTierChange(showConfirmDialog)}
                  className="bg-teal-600 hover:bg-teal-700"
                  disabled={processing}
                >
                  {processing ? 'Processing...' : 'Confirm'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </RoleGuard>
  );
}
