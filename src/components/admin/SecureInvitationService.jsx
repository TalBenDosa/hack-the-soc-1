import React from 'react';
import { AdminInvitation, Tenant, User } from '@/entities/all';

/**
 * Secure Admin Invitation Service
 * Handles JWT token generation, validation, and secure invitation workflows
 */
class SecureInvitationService {
    constructor() {
        this.TOKEN_EXPIRY_HOURS = 24;
        this.MAX_VALIDATION_ATTEMPTS = 5;
        this.ALGORITHM = 'HS256'; // In production, use RS256 with proper key management
    }

    /**
     * Generate a cryptographically secure JWT token for admin invitation
     */
    generateSecureToken(payload) {
        // In a real implementation, this would use a proper JWT library and secure key
        // For demo purposes, we'll simulate a secure token structure
        const header = {
            alg: this.ALGORITHM,
            typ: 'JWT',
            version: '1.0'
        };

        const tokenPayload = {
            ...payload,
            iat: Math.floor(Date.now() / 1000), // Issued at
            exp: Math.floor(Date.now() / 1000) + (this.TOKEN_EXPIRY_HOURS * 3600), // Expires
            jti: this.generateJTI(), // JWT ID for uniqueness
            iss: 'hack-the-soc-admin-system', // Issuer
            aud: 'environment-admin-invitation' // Audience
        };

        // Simulate JWT encoding (in production, use proper JWT library)
        const encodedHeader = btoa(JSON.stringify(header));
        const encodedPayload = btoa(JSON.stringify(tokenPayload));
        const signature = this.generateSignature(`${encodedHeader}.${encodedPayload}`);
        
        return `${encodedHeader}.${encodedPayload}.${signature}`;
    }

    /**
     * Generate a unique JWT ID to prevent token reuse
     */
    generateJTI() {
        const timestamp = Date.now().toString(36);
        const randomBytes = Array.from(crypto.getRandomValues(new Uint8Array(16)))
            .map(b => b.toString(16).padStart(2, '0')).join('');
        return `${timestamp}-${randomBytes}`;
    }

    /**
     * Generate a cryptographic signature for the token
     */
    generateSignature(data) {
        // Simulate secure signature generation
        // In production, use proper HMAC-SHA256 or RSA signing
        const hash = Array.from(new TextEncoder().encode(data + 'secure-secret-key'))
            .reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '');
        return btoa(hash).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
    }

    /**
     * Create a secure admin invitation
     */
    async createSecureInvitation(tenantId, invitedEmail, superAdminUser) {
        try {
            console.log('[SECURE INVITATION] Creating invitation for:', invitedEmail, 'Tenant:', tenantId);

            // Validate inputs
            if (!tenantId || !invitedEmail || !superAdminUser) {
                throw new Error('Missing required parameters for invitation creation');
            }

            // Get tenant information for validation
            const tenant = await Tenant.filter({ id: tenantId });
            if (tenant.length === 0) {
                throw new Error('Invalid tenant ID provided');
            }

            // Check for existing pending invitations for this email/tenant combo
            const existingInvitations = await AdminInvitation.filter({
                tenant_id: tenantId,
                invited_email: invitedEmail,
                status: 'pending'
            });

            // Revoke any existing pending invitations
            for (const existing of existingInvitations) {
                await AdminInvitation.update(existing.id, {
                    status: 'revoked',
                    security_metadata: {
                        ...existing.security_metadata,
                        revoked_reason: 'new_invitation_created',
                        revoked_at: new Date().toISOString()
                    }
                });
            }

            // Generate secure token
            const tokenPayload = {
                tenant_id: tenantId,
                invited_email: invitedEmail,
                invited_by: superAdminUser.id,
                invitation_type: 'environment_admin',
                security_level: 'high'
            };

            const secureToken = this.generateSecureToken(tokenPayload);
            const expiresAt = new Date(Date.now() + (this.TOKEN_EXPIRY_HOURS * 60 * 60 * 1000));

            // Create invitation record
            const invitationData = {
                invitation_token: secureToken,
                tenant_id: tenantId,
                invited_email: invitedEmail,
                invited_by_user_id: superAdminUser.id,
                invited_by_email: superAdminUser.email,
                token_expires_at: expiresAt.toISOString(),
                status: 'pending',
                ip_address_created: 'N/A', // In production, get real IP
                user_agent_created: navigator.userAgent,
                mfa_required: true,
                security_metadata: {
                    token_version: '1.0',
                    encryption_algorithm: this.ALGORITHM,
                    validation_attempts: 0,
                    created_timestamp: new Date().toISOString()
                }
            };

            const invitation = await AdminInvitation.create(invitationData);

            // Generate secure invitation link
            const baseUrl = window.location.origin;
            const invitationLink = `${baseUrl}/AcceptAdminInvitation?token=${encodeURIComponent(secureToken)}`;

            console.log('[SECURE INVITATION] Created secure invitation:', invitation.id);

            return {
                success: true,
                invitation,
                invitationLink,
                tenantName: tenant[0].name,
                expiresAt: expiresAt.toISOString()
            };

        } catch (error) {
            console.error('[SECURE INVITATION] Failed to create invitation:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Validate and parse a secure invitation token
     */
    async validateInvitationToken(token) {
        try {
            console.log('[SECURE INVITATION] Validating token...');

            if (!token) {
                throw new Error('No invitation token provided');
            }

            // Find invitation by token
            const invitations = await AdminInvitation.filter({ invitation_token: token });
            
            if (invitations.length === 0) {
                throw new Error('Invalid invitation token');
            }

            const invitation = invitations[0];

            // Update validation attempts
            const attempts = (invitation.security_metadata?.validation_attempts || 0) + 1;
            await AdminInvitation.update(invitation.id, {
                security_metadata: {
                    ...invitation.security_metadata,
                    validation_attempts: attempts,
                    last_validation_attempt: new Date().toISOString()
                }
            });

            // Check max validation attempts
            if (attempts > this.MAX_VALIDATION_ATTEMPTS) {
                await AdminInvitation.update(invitation.id, {
                    status: 'revoked'
                });
                throw new Error('Too many validation attempts - invitation revoked');
            }

            // Check invitation status
            if (invitation.status !== 'pending') {
                throw new Error(`Invitation is ${invitation.status}`);
            }

            // Check expiration
            const now = new Date();
            const expiresAt = new Date(invitation.token_expires_at);
            if (now > expiresAt) {
                await AdminInvitation.update(invitation.id, {
                    status: 'expired'
                });
                throw new Error('Invitation has expired');
            }

            // Get tenant information
            const tenant = await Tenant.filter({ id: invitation.tenant_id });
            if (tenant.length === 0) {
                throw new Error('Associated tenant not found');
            }

            console.log('[SECURE INVITATION] Token validation successful');

            return {
                success: true,
                invitation,
                tenant: tenant[0]
            };

        } catch (error) {
            console.error('[SECURE INVITATION] Token validation failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Accept and consume a secure invitation
     */
    async acceptInvitation(token, userId) {
        try {
            console.log('[SECURE INVITATION] Accepting invitation...');

            // First validate the token
            const validation = await this.validateInvitationToken(token);
            if (!validation.success) {
                return validation;
            }

            const { invitation, tenant } = validation;

            // Mark invitation as used
            await AdminInvitation.update(invitation.id, {
                status: 'accepted',
                used_at: new Date().toISOString(),
                used_by_user_id: userId,
                ip_address_used: 'N/A', // In production, get real IP
                user_agent_used: navigator.userAgent
            });

            console.log('[SECURE INVITATION] Invitation accepted successfully');

            return {
                success: true,
                invitation,
                tenant,
                message: `Welcome as Environment Admin to ${tenant.name}`
            };

        } catch (error) {
            console.error('[SECURE INVITATION] Failed to accept invitation:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Revoke an invitation (Super Admin only)
     */
    async revokeInvitation(invitationId, reason = 'admin_revoked') {
        try {
            const invitation = await AdminInvitation.filter({ id: invitationId });
            if (invitation.length === 0) {
                throw new Error('Invitation not found');
            }

            await AdminInvitation.update(invitationId, {
                status: 'revoked',
                security_metadata: {
                    ...invitation[0].security_metadata,
                    revoked_reason: reason,
                    revoked_at: new Date().toISOString()
                }
            });

            return { success: true };

        } catch (error) {
            console.error('[SECURE INVITATION] Failed to revoke invitation:', error);
            return { success: false, error: error.message };
        }
    }
}

// Create singleton instance
export const secureInvitationService = new SecureInvitationService();

export default SecureInvitationService;