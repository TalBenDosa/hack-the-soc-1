// שירות לטעינת hashes זדוניים מהבקאנד
export class MaliciousHashesService {
    constructor() {
        this.cachedHashes = null;
        this.lastCacheTime = 0;
        this.cacheValidityTime = 1000 * 60 * 30; // 30 דקות
    }

    async getMaliciousHashes() {
        // בדיקה אם יש cache תקף
        const now = Date.now();
        if (this.cachedHashes && (now - this.lastCacheTime) < this.cacheValidityTime) {
            console.log('[MaliciousHashesService] משתמש בנתונים מ-cache');
            return this.cachedHashes;
        }

        try {
            console.log('[MaliciousHashesService] טוען hashes זדוניים מהבקאנד...');
            
            const response = await fetch('/api/backend-functions/getMaliciousHashes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    count: 100 // מספר hashes לבקש
                })
            });

            if (!response.ok) {
                throw new Error(`שגיאה בקבלת תגובה מהבקאנד: ${response.status}`);
            }

            const data = await response.json();
            console.log('[MaliciousHashesService] התקבלו נתוני איום:', data);

            // עדכון cache
            this.cachedHashes = data;
            this.lastCacheTime = now;

            return data;
        } catch (error) {
            console.error('[MaliciousHashesService] שגיאה בטעינת hashes זדוניים:', error);
            
            // החזרת נתונים בסיסיים במקרה של שגיאה
            const fallbackData = {
                malicious_hashes: [
                    'sha256-a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890',
                    'md5-12345678901234567890123456789012',
                    'sha1-1234567890123456789012345678901234567890'
                ],
                malicious_ips: ['185.203.118.45', '198.51.100.10', '103.45.12.15'],
                malicious_domains: ['evil-phish.com', 'malicious-domain.net', 'bad-actor.org'],
                malicious_urls: [
                    'http://evil-phish.com/payload.exe',
                    'https://malicious-domain.net/download.zip'
                ]
            };

            this.cachedHashes = fallbackData;
            this.lastCacheTime = now;
            
            return fallbackData;
        }
    }

    getRandomMaliciousHash() {
        if (this.cachedHashes && this.cachedHashes.malicious_hashes) {
            const hashes = this.cachedHashes.malicious_hashes;
            return hashes[Math.floor(Math.random() * hashes.length)];
        }
        return 'sha256-a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890';
    }

    getRandomMaliciousIP() {
        if (this.cachedHashes && this.cachedHashes.malicious_ips) {
            const ips = this.cachedHashes.malicious_ips;
            return ips[Math.floor(Math.random() * ips.length)];
        }
        return '185.203.118.45';
    }

    getRandomMaliciousDomain() {
        if (this.cachedHashes && this.cachedHashes.malicious_domains) {
            const domains = this.cachedHashes.malicious_domains;
            return domains[Math.floor(Math.random() * domains.length)];
        }
        return 'evil-phish.com';
    }
}

// יצוא instance גלובלי
export const maliciousHashesService = new MaliciousHashesService();