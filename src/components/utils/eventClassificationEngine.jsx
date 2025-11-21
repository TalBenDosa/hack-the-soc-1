/**
 * Event Classification Engine - סכמת סיווג לוגים מחודשת
 * 
 * סוגי סיווג:
 * 1. True Positive (TP) - אירוע זדוני אמיתי שחלק משרשרת מתקפה
 * 2. False Positive (FP) - אירוע שנראה חשוד אך בפועל לגיטימי, או אירוע רקע תקין.
 */

/**
 * מאפייני סיווג לכל סוג אירוע
 */
const EVENT_CLASSIFICATION_SCHEMA = {
    // ✅ TRUE POSITIVE - אירועים זדוניים מובהקים
    TRUE_POSITIVE_INDICATORS: {
        'PHISHING_EMAIL_RECEIVED': {
            classification: 'True Positive',
            reasoning: 'מייל פישינג עם קישור זדוני - איום מזוהה בבירור',
            reasoning_en: 'Phishing email with a malicious link received - threat clearly identified.',
            confidence: 'High',
            expected_analyst_action: 'לזהות כאירוע זדוני ולסווג כ-TP'
        },
        'EDR_MALICIOUS_FILE_DETECTED': {
            classification: 'True Positive', 
            reasoning: 'זיהוי קובץ זדוני ב-EDR עם hash מוכר - איום מובהק',
            reasoning_en: 'Malicious file with a known hash detected by EDR - clear threat.',
            confidence: 'High',
            expected_analyst_action: 'לזהות כאירוע זדוני ולסווג כ-TP'
        },
        'SUSPICIOUS_LINK_CLICKED': {
            classification: 'True Positive',
            reasoning: 'משתמש הוריד קובץ זדוני מדומיין זדוני - חלק משרשרת מתקפה',
            reasoning_en: 'User downloaded a malicious file from a malicious domain - part of the attack chain.',
            confidence: 'High', 
            expected_analyst_action: 'לזהות כאירוע זדוני ולסווג כ-TP'
        },
        'BRUTE_FORCE_ATTEMPT': {
            classification: 'True Positive',
            reasoning: 'ניסיון התחברות לחשבון משתמש לא מורשה - איום מזוהה',
            reasoning_en: 'Unauthorized login attempt to a user account - threat identified.',
            confidence: 'High',
            expected_analyst_action: 'לזהות כאירוע זדוני ולסווג כ-TP'
        }
    },

    // ✅ FALSE POSITIVE - אירועים לגיטימיים, חשודים-אך-לגיטימיים, או אירועי רקע
    FALSE_POSITIVE_INDICATORS: {
        'ADMIN_SCRIPT_EXECUTION': {
            classification: 'False Positive',
            reasoning: 'סקריפט אדמין מריץ פעולות רגילות אך נראה חשוד - פעילות לגיטימית',
            reasoning_en: 'Admin script running normal operations, but appears suspicious - legitimate activity.',
            confidence: 'High',
            expected_analyst_action: 'לזהות כאירוע לא-זדוני ולסווג כ-FP'
        },
        'SOFTWARE_UPDATE': {
            classification: 'False Positive', 
            reasoning: 'עדכון תוכנה אוטומטי שגורם להתרעות זמניות ב-EDR - תחזוקה רגילה',
            reasoning_en: 'Automated software update causing temporary alerts in EDR - normal maintenance.',
            confidence: 'High',
            expected_analyst_action: 'לזהות כאירוע לא-זדוני ולסווג כ-FP'
        },
        'INTERNAL_APP_ACCESS': {
            classification: 'False Positive',
            reasoning: 'גיבוי מתוזמן שמופיע בדו"ח אבטחה - תהליך עסקי רגיל',
            reasoning_en: 'Scheduled backup appearing in security report - normal business process.',
            confidence: 'Medium',
            expected_analyst_action: 'לזהות כאירוע לא-זדוני ולסווג כ-FP'
        },
        // Events that were previously "Escalate" are now considered False Positives
        'SUSPICIOUS_LOGIN_OFFHOURS': {
            classification: 'False Positive',
            reasoning: 'התחברות חשודה עם הרשאות גבוהות או ממיקום לא רגיל, אך לא חלק ממתקפה.',
            reasoning_en: 'Suspicious login with high privileges or from an unusual location, but not part of the simulated attack.',
            confidence: 'Medium',
            expected_analyst_action: 'לזהות כאירוע לא-זדוני ולסווג כ-FP'
        },
        'PORT_SCAN_DETECTED': {
            classification: 'False Positive',
            reasoning: 'פעילות רשת חשודה, אך לא קשורה למתקפה הנוכחית.',
            reasoning_en: 'Suspicious network activity, but not related to the current attack.',
            confidence: 'Medium',
            expected_analyst_action: 'לזהות כאירוע לא-זדוני ולסווג כ-FP'
        },
        'FW_SUSPICIOUS_CONNECTION': {
            classification: 'False Positive',
            reasoning: 'התראת Firewall כללית שלא קשורה למתקפה הפעילה.',
            reasoning_en: 'General firewall alert not related to the active attack scenario.',
            confidence: 'Medium',
            expected_analyst_action: 'לזהות כאירוע לא-זדוני ולסווג כ-FP'
        },
        'AD_USER_ADDED_TO_ADMIN_GROUP': {
            classification: 'False Positive',
            reasoning: 'שינוי הרשאות לגיטימי שנראה חשוד.',
            reasoning_en: 'A legitimate permission change that appears suspicious.',
            confidence: 'Medium',
            expected_analyst_action: 'לזהות כאירוע לא-זדוני ולסווג כ-FP'
        },
        'AD_ACCOUNT_LOCKOUT': {
            classification: 'False Positive', 
            reasoning: 'נעילת חשבון לגיטימית (למשל, משתמש שכח סיסמה).',
            reasoning_en: 'Legitimate account lockout (e.g., user forgot password).',
            confidence: 'Medium',
            expected_analyst_action: 'לזהות כאירוע לא-זדוני ולסווג כ-FP'
        },
        'PROXY_MALICIOUS_DOWNLOAD_BLOCKED': {
            classification: 'False Positive',
            reasoning: 'שרת פרוקסי חסם הורדה, המערכת פעלה כמצופה.',
            reasoning_en: 'Proxy server blocked a download, system worked as expected.',
            confidence: 'Medium',  
            expected_analyst_action: 'לזהות כאירוע לא-זדוני ולסווג כ-FP'
        },
        // Benign events are also False Positives in this new model
        'SUCCESSFUL_LOGIN_NORMAL': {
            classification: 'False Positive',
            reasoning: 'התחברות משתמש רגילה ותקינה.',
            reasoning_en: 'Normal and legitimate user login.',
            confidence: 'High',
            expected_analyst_action: 'לזהות כאירוע לא-זדוני ולסווג כ-FP'
        }
    }
};

/**
 * פונקציית סיווג מרכזית - קובעת את הסיווג הנכון לאירוע
 * @param {string} eventType - סוג האירוע (למשל 'PHISHING_EMAIL_RECEIVED')
 * @param {Object} eventContext - הקשר נוסף על האירוע (אופציונלי)
 * @returns {Object} אובייקט המכיל את הסיווג, הנימוק והביטחון
 */
export const classifyEvent = (eventType, eventContext = {}) => {
    console.log(`[Event Classification Engine] Classifying event type: ${eventType}`);
    
    // בדיקה אם זה True Positive
    if (EVENT_CLASSIFICATION_SCHEMA.TRUE_POSITIVE_INDICATORS[eventType]) {
        const classification = EVENT_CLASSIFICATION_SCHEMA.TRUE_POSITIVE_INDICATORS[eventType];
        console.log(`[Event Classification Engine] Classified as TRUE POSITIVE: ${classification.reasoning}`);
        return {
            verdict: 'TP',
            classification: 'True Positive',
            reasoning: classification.reasoning,
            confidence: classification.confidence,
            expected_analyst_action: classification.expected_analyst_action,
            admin_notes: `Verdict: TP. Description: ${classification.reasoning_en}`,
            default_classification: 'True Positive'
        };
    }
    
    // כל השאר הם False Positive
    const classification = EVENT_CLASSIFICATION_SCHEMA.FALSE_POSITIVE_INDICATORS[eventType] || {
        classification: 'False Positive',
        reasoning: 'אירוע רקע תקין או אירוע לא מזוהה.',
        reasoning_en: 'Benign background event or unrecognized event.',
        confidence: 'Low',
        expected_analyst_action: 'לזהות כאירוע לא-זדוני ולסווג כ-FP'
    };
    
    console.log(`[Event Classification Engine] Classified as FALSE POSITIVE: ${classification.reasoning}`);
    return {
        verdict: 'FP', 
        classification: 'False Positive',
        reasoning: classification.reasoning,
        confidence: classification.confidence,
        expected_analyst_action: classification.expected_analyst_action,
        admin_notes: `Verdict: FP. Description: ${classification.reasoning_en}`,
        default_classification: 'False Positive'
    };
};

/**
 * פונקציית עזר לוודא איזון נכון בתרחיש (מספר TP, והיתר FP)
 * @param {Array} events - רשימת האירועים בתרחיש
 * @returns {Object} סטטיסטיקת הסיווג
 */
export const validateScenarioBalance = (events) => {
    const stats = {
        truePositives: 0,
        falsePositives: 0,
        totalEvents: events.length
    };
    
    events.forEach(event => {
        const classification = classifyEvent(event.type || event.eventType);
        if (classification.verdict === 'TP') stats.truePositives++;
        else if (classification.verdict === 'FP') stats.falsePositives++;
    });
    
    console.log('[Event Classification Engine] Scenario balance:', stats);
    
    const isBalanced = stats.truePositives >= 3 && stats.falsePositives > 0;
    
    return {
        ...stats,
        isBalanced,
        recommendations: isBalanced ? [] : [
            stats.truePositives < 3 ? `יש רק ${stats.truePositives} TP, רצוי לפחות 3` : null,
            stats.falsePositives === 0 ? `אין FP, יש להוסיף אירועי רקע` : null
        ].filter(Boolean)
    };
};