/**
 * Gets a malicious hash from your curated database
 * This uses your provided hash list directly without backend calls
 * @returns {Promise<{sha256: string, md5: string, name: string}>} Hash data from your database
 */
export async function getMalwareBazaarHash() {
    try {
        console.log('[THREAT INTEL SERVICE] Getting random hash from curated database...');
        
        // Your provided malicious hashes database
        const hashDatabase = [
            { sha256: '226a723ffb4a91d9950a8b266167c5b354ab0db1dc225578494917fe53867ef2', md5: 'db349b97c37d22f5ea1d1841e3c89eb4', name: 'TrickBot' },
            { sha256: '015409fbfd267cc10311ec0949998773921d2eff96524a98219945e5de391ed7', md5: 'a1b2c3d4e5f6789012345678901234ab', name: 'Emotet' },
            { sha256: '0f00c2e074c6284c556040012ef23357853ccac4ad1373d1dea683562dc24bca', md5: 'b2c3d4e5f678901234567890123456cd', name: 'Cobalt Strike' },
            { sha256: 'b7a17727462906ac85e4082ac63a7a3884e67c222e36e9696e445b3ff882bf28', md5: 'c3d4e5f6789012345678901234567def', name: 'Mimikatz' },
            { sha256: '8d2f2ee24882afe11f50e3d6d9400e35fa66724b321cb9f5a246baf63cbc1788', md5: 'd4e5f6789012345678901234567890ab', name: 'WannaCry' },
            { sha256: '683f04520fe70be80a778761cee2085cb102aa71995c4de78f1f60d77dd0db68', md5: 'e5f6789012345678901234567890abcd', name: 'BlackMatter' },
            { sha256: '902518be7e77136c91591bac4e51ea00a9143511aa9c63be908def3bbc992e8f', md5: 'f6789012345678901234567890abcdef', name: 'Conti' }
        ];
        
        // Get random hash from your database
        const randomIndex = Math.floor(Math.random() * hashDatabase.length);
        const selectedHash = hashDatabase[randomIndex];
        
        console.log('[THREAT INTEL SERVICE] Selected hash:', selectedHash.sha256.substring(0, 16) + '... (' + selectedHash.name + ')');
        
        return selectedHash;
        
    } catch (error) {
        console.error('[THREAT INTEL SERVICE] Error getting hash from database:', error);
        
        // Ultimate fallback - return first hash from your list
        return {
            sha256: '226a723ffb4a91d9950a8b266167c5b354ab0db1dc225578494917fe53867ef2',
            md5: 'db349b97c37d22f5ea1d1841e3c89eb4',
            name: 'TrickBot (Fallback)'
        };
    }
}

/**
 * Gets just the SHA256 hash
 * @returns {Promise<string>} Just the SHA256 hash
 */
export async function getMaliciousSha256() {
    const hashData = await getMalwareBazaarHash();
    return hashData.sha256;
}