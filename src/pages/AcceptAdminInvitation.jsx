import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { User, TenantUser } from '@/entities/all';
import { secureInvitationService } from '../components/admin/SecureInvitationService';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, CheckCircle, AlertTriangle, Loader2, Key } from 'lucide-react';
import { createPageUrl } from "@/utils";

export default function AcceptAdminInvitation() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [token] = useState(searchParams.get('token'));
    
    const [loading, setLoading] = useState(true);
    const [validationResult, setValidationResult] = useState(null);
    const [step, setStep] = useState('validating'); // validating, login_required, setup_account, accepting, completed, error
    
    const [loginForm, setLoginForm] = useState({ email: '', password: '' });
    const [setupForm, setSetupForm] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        mfaCode: '',
        acceptTerms: false
    });
    const [error, setError] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (token) {
            validateInvitation();
        } else {
            setError('No invitation token provided');
            setStep('error');
            setLoading(false);
        }
    }, [token]);

    const validateInvitation = async () => {
        try {
            setLoading(true);
            console.log('[INVITATION] Validating invitation token...');
            
            const result = await secureInvitationService.validateInvitationToken(token);
            
            if (result.success) {
                setValidationResult(result);
                
                // Check if user is already logged in
                try {
                    const currentUser = await User.me();
                    if (currentUser && currentUser.email === result.invitation.invited_email) {
                        setStep('accepting');
                        await acceptInvitation(currentUser.id);
                    } else if (currentUser) {
                        setError(`You are logged in as ${currentUser.email}, but this invitation is for ${result.invitation.invited_email}. Please log out and try again.`);
                        setStep('error');
                    } else {
                        setStep('login_required');
                        setSetupForm(prev => ({ ...prev, email: result.invitation.invited_email }));
                    }
                } catch (userError) {
                    // User not logged in - show login/setup form
                    setStep('login_required');
                    setSetupForm(prev => ({ ...prev, email: result.invitation.invited_email }));
                }
            } else {
                setError(result.error);
                setStep('error');
            }
        } catch (error) {
            console.error('[INVITATION] Validation failed:', error);
            setError('Failed to validate invitation. Please try again.');
            setStep('error');
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setProcessing(true);
        setError('');

        try {
            // In a real implementation, this would authenticate the user
            // For now, we'll simulate login success
            console.log('[INVITATION] User login attempt:', loginForm.email);
            
            if (loginForm.email !== validationResult.invitation.invited_email) {
                throw new Error('Email does not match invitation');
            }

            // Simulate successful login and get user ID
            // In production, this would return the actual logged-in user
            const mockUserId = 'user_' + Date.now();
            
            setStep('accepting');
            await acceptInvitation(mockUserId);
            
        } catch (error) {
            setError(error.message || 'Login failed. Please check your credentials.');
        } finally {
            setProcessing(false);
        }
    };

    const handleSetupAccount = async (e) => {
        e.preventDefault();
        setProcessing(true);
        setError('');

        try {
            // Validate form
            if (setupForm.password !== setupForm.confirmPassword) {
                throw new Error('Passwords do not match');
            }

            if (setupForm.password.length < 8) {
                throw new Error('Password must be at least 8 characters long');
            }

            if (!setupForm.acceptTerms) {
                throw new Error('You must accept the terms and conditions');
            }

            if (setupForm.email !== validationResult.invitation.invited_email) {
                throw new Error('Email does not match invitation');
            }

            console.log('[INVITATION] Setting up new admin account:', setupForm.email);
            
            // In production, create the user account here
            const newUser = {
                id: 'user_' + Date.now(),
                email: setupForm.email,
                full_name: setupForm.email.split('@')[0], // Temporary name
                role: 'user' // Will be elevated to tenant_admin
            };

            setStep('accepting');
            await acceptInvitation(newUser.id);
            
        } catch (error) {
            setError(error.message || 'Account setup failed. Please try again.');
        } finally {
            setProcessing(false);
        }
    };

    const acceptInvitation = async (userId) => {
        try {
            console.log('[INVITATION] Accepting invitation for user:', userId);
            
            const result = await secureInvitationService.acceptInvitation(token, userId);
            
            if (result.success) {
                // Create TenantUser record with admin privileges
                await TenantUser.create({
                    tenant_id: result.tenant.id,
                    user_id: userId,
                    invited_email: result.invitation.invited_email,
                    role: 'tenant_admin',
                    status: 'active',
                    permissions: ['create_lessons', 'create_quizzes', 'create_scenarios', 'create_live_logs', 'invite_students'],
                    invited_by: result.invitation.invited_by_user_id,
                    join_date: new Date().toISOString()
                });

                setStep('completed');
                
                // Redirect after success message
                setTimeout(() => {
                    navigate(createPageUrl('Dashboard'));
                }, 3000);
                
            } else {
                setError(result.error);
                setStep('error');
            }
        } catch (error) {
            console.error('[INVITATION] Failed to accept invitation:', error);
            setError('Failed to accept invitation. Please contact support.');
            setStep('error');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <Card className="w-full max-w-md bg-slate-900 border-slate-700">
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center space-y-4">
                            <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
                            <p className="text-white">Validating invitation...</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg bg-slate-900 border-slate-700">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="bg-teal-500 p-3 rounded-full">
                            <Shield className="w-8 h-8 text-white" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl text-white">
                        {step === 'completed' ? 'Welcome, Environment Admin!' : 'Admin Invitation'}
                    </CardTitle>
                    {validationResult && (
                        <p className="text-slate-400 mt-2">
                            You've been invited to become an Environment Admin for{' '}
                            <span className="text-teal-400 font-semibold">
                                {validationResult.tenant.name}
                            </span>
                        </p>
                    )}
                </CardHeader>

                <CardContent>
                    {error && (
                        <Alert className="mb-6 border-red-600 bg-red-600/10">
                            <AlertTriangle className="h-4 w-4 text-red-400" />
                            <AlertDescription className="text-red-400">
                                {error}
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Step: Login Required */}
                    {step === 'login_required' && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <p className="text-slate-300 mb-4">
                                    Please log in with your existing account or set up a new account.
                                </p>
                                <div className="flex gap-2 justify-center">
                                    <Button
                                        onClick={() => setStep('setup_account')}
                                        className="bg-teal-600 hover:bg-teal-700"
                                    >
                                        Set Up New Account
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setStep('existing_login')}
                                        className="border-slate-600 text-slate-300"
                                    >
                                        Login with Existing Account
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step: Existing Login */}
                    {step === 'existing_login' && (
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <Label className="text-slate-300">Email</Label>
                                <Input
                                    type="email"
                                    value={loginForm.email}
                                    onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                                    className="bg-slate-800 border-slate-600 text-white"
                                    required
                                />
                            </div>
                            <div>
                                <Label className="text-slate-300">Password</Label>
                                <Input
                                    type="password"
                                    value={loginForm.password}
                                    onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                                    className="bg-slate-800 border-slate-600 text-white"
                                    required
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="bg-teal-600 hover:bg-teal-700 flex-1"
                                >
                                    {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    Login & Accept Invitation
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setStep('login_required')}
                                    className="border-slate-600 text-slate-300"
                                >
                                    Back
                                </Button>
                            </div>
                        </form>
                    )}

                    {/* Step: Setup Account */}
                    {step === 'setup_account' && (
                        <form onSubmit={handleSetupAccount} className="space-y-4">
                            <div>
                                <Label className="text-slate-300">Email</Label>
                                <Input
                                    type="email"
                                    value={setupForm.email}
                                    readOnly
                                    className="bg-slate-800 border-slate-600 text-slate-400"
                                />
                            </div>
                            <div>
                                <Label className="text-slate-300">Password</Label>
                                <Input
                                    type="password"
                                    value={setupForm.password}
                                    onChange={(e) => setSetupForm(prev => ({ ...prev, password: e.target.value }))}
                                    className="bg-slate-800 border-slate-600 text-white"
                                    required
                                    minLength={8}
                                />
                            </div>
                            <div>
                                <Label className="text-slate-300">Confirm Password</Label>
                                <Input
                                    type="password"
                                    value={setupForm.confirmPassword}
                                    onChange={(e) => setSetupForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                    className="bg-slate-800 border-slate-600 text-white"
                                    required
                                />
                            </div>
                            
                            {validationResult?.invitation?.mfa_required && (
                                <div>
                                    <Label className="text-slate-300 flex items-center gap-2">
                                        <Key className="w-4 h-4" />
                                        MFA Setup Code (Optional for now)
                                    </Label>
                                    <Input
                                        type="text"
                                        value={setupForm.mfaCode}
                                        onChange={(e) => setSetupForm(prev => ({ ...prev, mfaCode: e.target.value }))}
                                        className="bg-slate-800 border-slate-600 text-white"
                                        placeholder="Enter MFA code if available"
                                    />
                                </div>
                            )}

                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="accept-terms"
                                    checked={setupForm.acceptTerms}
                                    onChange={(e) => setSetupForm(prev => ({ ...prev, acceptTerms: e.target.checked }))}
                                    className="rounded border-slate-600 bg-slate-800"
                                    required
                                />
                                <label htmlFor="accept-terms" className="text-sm text-slate-300">
                                    I accept the Terms of Service and Privacy Policy
                                </label>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="bg-teal-600 hover:bg-teal-700 flex-1"
                                >
                                    {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    Create Account & Accept
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setStep('login_required')}
                                    className="border-slate-600 text-slate-300"
                                >
                                    Back
                                </Button>
                            </div>
                        </form>
                    )}

                    {/* Step: Accepting */}
                    {step === 'accepting' && (
                        <div className="text-center space-y-4">
                            <Loader2 className="w-8 h-8 text-teal-400 animate-spin mx-auto" />
                            <p className="text-white">Accepting invitation and setting up your admin access...</p>
                        </div>
                    )}

                    {/* Step: Completed */}
                    {step === 'completed' && (
                        <div className="text-center space-y-4">
                            <CheckCircle className="w-12 h-12 text-green-400 mx-auto" />
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-2">
                                    Congratulations!
                                </h3>
                                <p className="text-slate-300 mb-4">
                                    You are now an Environment Admin for{' '}
                                    <span className="text-teal-400 font-semibold">
                                        {validationResult?.tenant?.name}
                                    </span>
                                </p>
                                <div className="bg-slate-800 p-4 rounded-lg">
                                    <h4 className="text-white font-medium mb-2">Your Admin Privileges:</h4>
                                    <ul className="text-sm text-slate-300 space-y-1 text-left">
                                        <li>• Create and manage lessons, quizzes, and scenarios</li>
                                        <li>• Invite and manage users in your environment</li>
                                        <li>• Access the Admin Panel with full content creation tools</li>
                                        <li>• Manage live feed and log templates</li>
                                    </ul>
                                </div>
                                <p className="text-sm text-slate-400 mt-4">
                                    Redirecting to your dashboard in a few seconds...
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Step: Error */}
                    {step === 'error' && (
                        <div className="text-center">
                            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-white mb-2">
                                Invalid or Expired Invitation
                            </h3>
                            <p className="text-slate-300 mb-4">
                                This invitation link is no longer valid. Please contact your administrator for a new invitation.
                            </p>
                            <Button
                                onClick={() => navigate(createPageUrl('Dashboard'))}
                                className="bg-teal-600 hover:bg-teal-700"
                            >
                                Go to Dashboard
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}