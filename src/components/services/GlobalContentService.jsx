// Global Content Management Service
// Handles content inheritance, overlays, and propagation

import { GlobalContent, ContentOverlay, ContentPropagationLog, Tenant, TenantUser, User } from '@/entities/all';

export class GlobalContentService {
    
    /**
     * Create or update global content (Super Admin only)
     */
    static async createGlobalContent(contentType, contentData, superAdminId) {
        try {
            const version = this.generateVersion();
            
            const globalContent = await GlobalContent.create({
                content_type: contentType,
                content_id: contentData.id || this.generateId(),
                content_data: contentData,
                version: version,
                is_active: true,
                propagation_status: 'pending',
                created_by_super_admin: true,
                metadata: this.extractMetadata(contentData)
            });

            // Trigger propagation to all active tenants
            await this.propagateToAllTenants(globalContent.id, 'create', superAdminId);
            
            return globalContent;
        } catch (error) {
            console.error('[GLOBAL CONTENT] Error creating global content:', error);
            throw error;
        }
    }

    /**
     * Update existing global content and propagate changes
     */
    static async updateGlobalContent(globalContentId, updates, superAdminId) {
        try {
            const version = this.generateVersion();
            
            const updatedContent = await GlobalContent.update(globalContentId, {
                content_data: updates,
                version: version,
                propagation_status: 'pending'
            });

            // Propagate to all tenants
            await this.propagateToAllTenants(globalContentId, 'update', superAdminId);
            
            return updatedContent;
        } catch (error) {
            console.error('[GLOBAL CONTENT] Error updating global content:', error);
            throw error;
        }
    }

    /**
     * Propagate global content to all customer environments
     */
    static async propagateToAllTenants(globalContentId, action, superAdminId) {
        try {
            console.log(`[PROPAGATION] Starting ${action} propagation for global content:`, globalContentId);
            
            const globalContent = await GlobalContent.filter({ id: globalContentId });
            if (globalContent.length === 0) return;

            const content = globalContent[0];
            const allTenants = await Tenant.filter({ status: 'active' });

            // Update propagation status
            await GlobalContent.update(globalContentId, { 
                propagation_status: 'propagating',
                last_propagated: new Date().toISOString()
            });

            let successCount = 0;
            let failCount = 0;

            for (const tenant of allTenants) {
                try {
                    const result = await this.propagateToTenant(content, tenant.id, action, superAdminId);
                    if (result.success) successCount++;
                    else failCount++;
                } catch (error) {
                    console.error(`[PROPAGATION] Failed to propagate to tenant ${tenant.id}:`, error);
                    failCount++;
                }
            }

            // Update final status
            const finalStatus = failCount === 0 ? 'completed' : failCount < allTenants.length ? 'partial' : 'failed';
            await GlobalContent.update(globalContentId, { 
                propagation_status: finalStatus 
            });

            console.log(`[PROPAGATION] Completed: ${successCount} success, ${failCount} failed`);
            return { success: successCount, failed: failCount };

        } catch (error) {
            console.error('[PROPAGATION] Error in bulk propagation:', error);
            await GlobalContent.update(globalContentId, { propagation_status: 'failed' });
            throw error;
        }
    }

    /**
     * Propagate content to a specific tenant
     */
    static async propagateToTenant(globalContent, tenantId, action, superAdminId) {
        const startTime = Date.now();
        
        try {
            // Check if tenant has local overlays
            const existingOverlays = await ContentOverlay.filter({
                tenant_id: tenantId,
                global_content_id: globalContent.id,
                is_active: true
            });

            const logEntry = {
                global_content_id: globalContent.id,
                target_tenant_id: tenantId,
                propagation_type: action,
                propagated_by: superAdminId,
                duration_ms: 0,
                conflicts_detected: [],
                resolution_strategy: 'global_wins',
                details: {}
            };

            if (existingOverlays.length > 0) {
                // Handle conflicts - global content takes precedence but preserve local changes
                logEntry.conflicts_detected = existingOverlays.map(overlay => 
                    `Local overlay detected for fields: ${overlay.fields_modified.join(', ')}`
                );
                logEntry.resolution_strategy = 'merge';
            }

            // The propagation doesn't actually modify tenant data directly
            // Instead, when content is requested, we merge global + local
            logEntry.status = 'success';
            logEntry.duration_ms = Date.now() - startTime;
            logEntry.details = {
                content_type: globalContent.content_type,
                version: globalContent.version,
                overlays_count: existingOverlays.length
            };

            await ContentPropagationLog.create(logEntry);
            
            return { success: true, conflicts: existingOverlays.length };

        } catch (error) {
            await ContentPropagationLog.create({
                global_content_id: globalContent.id,
                target_tenant_id: tenantId,
                propagation_type: action,
                status: 'failed',
                propagated_by: superAdminId,
                duration_ms: Date.now() - startTime,
                details: { error: error.message }
            });
            
            return { success: false, error: error.message };
        }
    }

    /**
     * Get merged content for a tenant (Global + Local Overlays)
     */
    static async getMergedContentForTenant(tenantId, contentType, contentId = null) {
        try {
            // Get all global content for this type
            const globalContentQuery = { content_type: contentType, is_active: true };
            if (contentId) {
                globalContentQuery.content_id = contentId;
            }
            
            const globalContents = await GlobalContent.filter(globalContentQuery);
            
            if (globalContents.length === 0) {
                return [];
            }

            const mergedContents = [];

            for (const globalContent of globalContents) {
                // Get local overlays for this content
                const overlays = await ContentOverlay.filter({
                    tenant_id: tenantId,
                    global_content_id: globalContent.id,
                    is_active: true
                });

                // Start with global content as base
                let mergedContent = { 
                    ...globalContent.content_data,
                    _global_id: globalContent.id,
                    _global_version: globalContent.version,
                    _has_local_changes: overlays.length > 0,
                    _local_modifications: overlays.length > 0 ? overlays.map(o => o.fields_modified).flat() : []
                };

                // Apply overlays in order
                for (const overlay of overlays) {
                    mergedContent = this.applyOverlay(mergedContent, overlay.overlay_data, overlay.fields_modified);
                }

                mergedContents.push(mergedContent);
            }

            return contentId ? (mergedContents[0] || null) : mergedContents;

        } catch (error) {
            console.error('[GLOBAL CONTENT] Error getting merged content:', error);
            throw error;
        }
    }

    /**
     * Create or update local overlay for tenant content
     */
    static async createLocalOverlay(tenantId, globalContentId, overlayData, modifiedFields, userId) {
        try {
            const globalContent = await GlobalContent.filter({ id: globalContentId });
            if (globalContent.length === 0) {
                throw new Error('Global content not found');
            }

            // Check if overlay already exists
            const existingOverlays = await ContentOverlay.filter({
                tenant_id: tenantId,
                global_content_id: globalContentId
            });

            if (existingOverlays.length > 0) {
                // Update existing overlay
                return await ContentOverlay.update(existingOverlays[0].id, {
                    overlay_data: overlayData,
                    fields_modified: modifiedFields,
                    version_compatibility: globalContent[0].version,
                    last_sync: new Date().toISOString()
                });
            } else {
                // Create new overlay
                return await ContentOverlay.create({
                    tenant_id: tenantId,
                    global_content_id: globalContentId,
                    content_type: globalContent[0].content_type,
                    overlay_data: overlayData,
                    overlay_type: 'modification',
                    fields_modified: modifiedFields,
                    is_active: true,
                    version_compatibility: globalContent[0].version,
                    last_sync: new Date().toISOString(),
                    created_by: userId
                });
            }

        } catch (error) {
            console.error('[GLOBAL CONTENT] Error creating local overlay:', error);
            throw error;
        }
    }

    /**
     * Apply overlay data to base content
     */
    static applyOverlay(baseContent, overlayData, modifiedFields) {
        const merged = { ...baseContent };
        
        for (const field of modifiedFields) {
            if (overlayData.hasOwnProperty(field)) {
                if (typeof overlayData[field] === 'object' && overlayData[field] !== null && !Array.isArray(overlayData[field])) {
                    // Deep merge for objects
                    merged[field] = { ...merged[field], ...overlayData[field] };
                } else {
                    // Direct replacement for primitives and arrays
                    merged[field] = overlayData[field];
                }
            }
        }

        return merged;
    }

    /**
     * Check if user is Super Admin
     */
    static async isSuperAdmin(userId) {
        try {
            const user = await User.filter({ id: userId });
            return user.length > 0 && user[0].role === 'admin' && user[0].email === 'Tal14997@gmail.com';
        } catch {
            return false;
        }
    }

    /**
     * Utility functions
     */
    static generateVersion() {
        const now = new Date();
        return `v${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}.${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    }

    static generateId() {
        return `global-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }

    static extractMetadata(contentData) {
        return {
            tags: contentData.tags || [],
            category: contentData.category || '',
            difficulty: contentData.difficulty || '',
            estimated_time: contentData.estimated_time || contentData.estimated_reading_time || 0
        };
    }

    /**
     * Get propagation status for Super Admin dashboard
     */
    static async getPropagationStatus() {
        try {
            const recentLogs = await ContentPropagationLog.list('-created_date', 50);
            const globalContents = await GlobalContent.list('-created_date', 20);
            
            return {
                recent_propagations: recentLogs,
                pending_propagations: globalContents.filter(gc => gc.propagation_status === 'pending'),
                failed_propagations: globalContents.filter(gc => gc.propagation_status === 'failed')
            };
        } catch (error) {
            console.error('[GLOBAL CONTENT] Error getting propagation status:', error);
            return { recent_propagations: [], pending_propagations: [], failed_propagations: [] };
        }
    }
}

export default GlobalContentService;