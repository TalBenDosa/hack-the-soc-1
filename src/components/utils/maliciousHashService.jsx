import { MaliciousHash } from '@/entities/MaliciousHash';

// Cache for loaded hashes to improve performance
let cachedHashes = null;
let lastCacheTime = null;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

class MaliciousHashService {
    
    // Load hashes from database with caching
    async loadHashes() {
        const now = Date.now();
        
        // Return cached hashes if they're still fresh
        if (cachedHashes && lastCacheTime && (now - lastCacheTime) < CACHE_DURATION) {
            console.log('[MALICIOUS HASH SERVICE] Using cached hashes');
            return cachedHashes;
        }

        try {
            console.log('[MALICIOUS HASH SERVICE] Loading hashes from database...');
            const hashes = await MaliciousHash.filter({ is_active: true });
            
            if (hashes && hashes.length > 0) {
                cachedHashes = hashes;
                lastCacheTime = now;
                console.log(`[MALICIOUS HASH SERVICE] Loaded ${hashes.length} active malicious hashes from database`);
                return hashes;
            }
        } catch (error) {
            console.warn('[MALICIOUS HASH SERVICE] Failed to load from database:', error);
        }

        // No valid hashes found
        console.warn('[MALICIOUS HASH SERVICE] No malicious hashes available');
        return [];
    }

    // Get a random malicious hash
    async getRandomMaliciousHash() {
        const hashes = await this.loadHashes();
        if (!hashes || hashes.length === 0) {
            console.warn('[MALICIOUS HASH SERVICE] No hashes available, returning null');
            return null;
        }
        
        const randomHash = hashes[Math.floor(Math.random() * hashes.length)];
        console.log(`[MALICIOUS HASH SERVICE] Selected random ${randomHash.malware_family} hash: ${randomHash.sha256.substring(0, 16)}...`);
        
        return {
            sha256: randomHash.sha256,
            file_name: randomHash.file_name,
            malware_family: randomHash.malware_family,
            threat_level: randomHash.threat_level,
            file_size: randomHash.file_size,
            description: randomHash.description,
            mitre_techniques: randomHash.mitre_techniques || []
        };
    }

    // Get hash by malware family
    async getMaliciousHashByType(malwareType) {
        const hashes = await this.loadHashes();
        if (!hashes || hashes.length === 0) {
            console.warn('[MALICIOUS HASH SERVICE] No hashes available for type filtering');
            return null;
        }

        const filteredHashes = hashes.filter(h => 
            h.malware_family?.toLowerCase() === malwareType.toLowerCase()
        );
        
        if (filteredHashes.length === 0) {
            console.log(`[MALICIOUS HASH SERVICE] No hashes found for type '${malwareType}', returning random hash`);
            return await this.getRandomMaliciousHash();
        }
        
        const selectedHash = filteredHashes[Math.floor(Math.random() * filteredHashes.length)];
        console.log(`[MALICIOUS HASH SERVICE] Selected ${malwareType} hash: ${selectedHash.sha256.substring(0, 16)}...`);
        
        return {
            sha256: selectedHash.sha256,
            file_name: selectedHash.file_name,
            malware_family: selectedHash.malware_family,
            threat_level: selectedHash.threat_level,
            file_size: selectedHash.file_size,
            description: selectedHash.description,
            mitre_techniques: selectedHash.mitre_techniques || []
        };
    }

    // Get hash by threat level
    async getMaliciousHashByThreatLevel(threatLevel) {
        const hashes = await this.loadHashes();
        if (!hashes || hashes.length === 0) {
            console.warn('[MALICIOUS HASH SERVICE] No hashes available for threat level filtering');
            return null;
        }

        const filteredHashes = hashes.filter(h => 
            h.threat_level?.toLowerCase() === threatLevel.toLowerCase()
        );
        
        if (filteredHashes.length === 0) {
            console.log(`[MALICIOUS HASH SERVICE] No hashes found for threat level '${threatLevel}', returning random hash`);
            return await this.getRandomMaliciousHash();
        }
        
        const selectedHash = filteredHashes[Math.floor(Math.random() * filteredHashes.length)];
        console.log(`[MALICIOUS HASH SERVICE] Selected ${threatLevel} threat level hash: ${selectedHash.sha256.substring(0, 16)}...`);
        
        return {
            sha256: selectedHash.sha256,
            file_name: selectedHash.file_name,
            malware_family: selectedHash.malware_family,
            threat_level: selectedHash.threat_level,
            file_size: selectedHash.file_size,
            description: selectedHash.description,
            mitre_techniques: selectedHash.mitre_techniques || []
        };
    }

    // Get multiple hashes (for scenarios with multiple malicious files)
    async getMultipleMaliciousHashes(count = 3) {
        const hashes = await this.loadHashes();
        if (!hashes || hashes.length === 0) {
            console.warn('[MALICIOUS HASH SERVICE] No hashes available for multiple selection');
            return [];
        }

        const selectedHashes = [];
        const shuffled = [...hashes].sort(() => 0.5 - Math.random());
        
        for (let i = 0; i < Math.min(count, shuffled.length); i++) {
            const hash = shuffled[i];
            selectedHashes.push({
                sha256: hash.sha256,
                file_name: hash.file_name,
                malware_family: hash.malware_family,
                threat_level: hash.threat_level,
                file_size: hash.file_size,
                description: hash.description,
                mitre_techniques: hash.mitre_techniques || []
            });
        }

        console.log(`[MALICIOUS HASH SERVICE] Selected ${selectedHashes.length} multiple hashes`);
        return selectedHashes;
    }

    // Clear cache (useful for testing or forced refresh)
    clearCache() {
        cachedHashes = null;
        lastCacheTime = null;
        console.log('[MALICIOUS HASH SERVICE] Cache cleared');
    }

    // Get statistics about available hashes
    async getHashStats() {
        const hashes = await this.loadHashes();
        if (!hashes || hashes.length === 0) {
            return { total: 0, by_family: {}, by_threat_level: {} };
        }

        const stats = {
            total: hashes.length,
            by_family: {},
            by_threat_level: {}
        };

        hashes.forEach(hash => {
            // Count by malware family
            if (hash.malware_family) {
                stats.by_family[hash.malware_family] = (stats.by_family[hash.malware_family] || 0) + 1;
            }
            
            // Count by threat level
            if (hash.threat_level) {
                stats.by_threat_level[hash.threat_level] = (stats.by_threat_level[hash.threat_level] || 0) + 1;
            }
        });

        console.log('[MALICIOUS HASH SERVICE] Hash statistics:', stats);
        return stats;
    }
}

// Export singleton instance
export const maliciousHashService = new MaliciousHashService();