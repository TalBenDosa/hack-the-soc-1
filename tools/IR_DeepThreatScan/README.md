# SDEMA IRT : Deep Threat Scan — v9.0

כלי Live-Response לבדיקת חשד לחדירה (Compromise Assessment) בעמדת/שרת Windows בודד.
הכלי **קורא בלבד**: הוא לא משנה, לא מסגר (quarantine) ולא מוחק שום דבר במחשב.

* **אין צורך ב-Python** ולא בשום Runtime נוסף. הכלי כתוב ב-PowerShell בלבד, ורץ על Windows PowerShell 5.1 (מובנה ב-Windows 10/11 וב-Server 2016 ומעלה) או על PowerShell 7.
* אפשר להריץ אותו כקובץ `.ps1`, או לארוז ל-EXE עצמאי (כמו המקור) עם `Build-Exe.ps1`.

---

## 1. מיפוי הכלי המקורי (v8.6)

הקובץ `IR_DeepThreatScan_v8.6.exe` הוא **עטיפת PS2EXE** (‏‎.NET 32-bit console) סביב סקריפט PowerShell. הסקריפט חולץ מהבינארי ונשמר ב-`original/IR_DeepThreatScan_v8.6.ps1` כדי לאפשר השוואה.

| רכיב | מה עשה ב-v8.6 |
|---|---|
| מאגר IoC | 8 כתובות IP של C2, 7 דומיינים (שירותי Temp-mail / Pastebin), רשימת hashes ריקה, 16 כלי תקיפה, שמות שירותים, חוקי מיקום ותהליכי הורה-ילד, פורטים חשודים |
| איסוף | 15 פונקציות: Sysmon 8 ו-11, ‏4104, ‏4688, ‏7045, ‏4625, ‏47xx, חיבורי TCP, שירותים, Run keys ו-IFEO, תיקיות Startup, משימות מתוזמנות, דרייברים, קבצים חשודים, פתקי כופרה |
| ניקוד | Impact × Confidence (סולם 1–10) על מטריצה 5×5 בסגנון NIST 800-30, עם תקרה Moderate כש-Confidence < 7 |
| קורלציה | תהליך חשוד ↔ חיבור רשת חשוד, באותו PID |
| פלט | HTML (תלוי ב-Google Charts מהאינטרנט), JSON, CSV של IoC |

### באגים שנמצאו במקור (ואומתו בהרצה)

| # | חומרה | באג | השפעה |
|---|---|---|---|
| 1 | **קריטי** | שימוש ב-`$script:processedEventHashes` (משתנה שלא קיים) במקום `$script:collections.processedEventHashes` | סריקות 4104, ‏4688 ו-7045 **נעצרו כבר באירוע הראשון** והציגו הודעה מטעה ("ודא שה-logging מופעל"). בפועל, זיהוי פקודות כופרה ו-PowerShell זדוני מהלוגים לא עבד בכלל |
| 2 | **קריטי** | `continue` בתוך `ForEach-Object` | ב-PowerShell זה מדלג על כל שאר הפונקציה ולא רק על האירוע הנוכחי |
| 3 | גבוה | אינדקסים קבועים של `Properties[]` באירועים | ב-4688 נבדק שם התהליך במקום שורת הפקודה (index 5 במקום 8). ב-Sysmon 8 ו-11 נשלפו PID ושעה שגויים. ב-4732 נרשם המבצע הלא נכון |
| 4 | גבוה | `Group-Object -Property @($_....)` מחוץ ל-pipeline | גילוי "הצפנה המונית" (Sysmon 11) לא עבד |
| 5 | גבוה | ערכים מהמחשב הוכנסו ל-HTML **ללא קידוד** בטבלת העדיפויות | שורת פקודה זדונית יכלה להזריק JavaScript לדו"ח של האנליסט (XSS) |
| 6 | בינוני | `$riskMap` לא מוגדר בסקופ של יצירת הדו"ח | טבלת "Top Priority" ממוינת לא נכון (Low לפני Critical) |
| 7 | בינוני | בדיקת דומיין עם `-like` על מחרוזת שעברה regex-escape | לעולם לא מתאים. בנוסף, הבדיקה לא נקראה מאף מקום |
| 8 | בינוני | כל ערך IFEO וכל Run key סומנו 9/8 או 8/5 | המון התראות שווא (למשל `MitigationOptions`, תוכנות לגיטימיות) |
| 9 | בינוני | `README.txt` ברשימת פתקי הכופרה, עם Confidence 10 | כל README בתיקיית Downloads הקפיץ Critical |
| 10 | בינוני | TeamViewer/AnyDesk/OpenSSH סווגו "Known Malicious Service" | High על כלי ניהול לגיטימיים |
| 11 | נמוך | `-Exclude` של `Get-ChildItem` עובד על שמות קבצים בלבד | תיקיות כמו `node_modules` לא הוחרגו בפועל |
| 12 | נמוך | אנטרופיה דרך `Group-Object` על כל בייטי הקובץ | איטי מאוד בקבצים גדולים |
| 13 | נמוך | שמות קבצי הפלט `v8.8` בכלי v8.6, ו-`Get-WmiObject` (לא קיים ב-PS7) | — |

---

## 2. מה חדש ב-v9.0

### יכולות זיהוי (22 אוספים במקום 15)

| תחום | חדש / משופר |
|---|---|
| **לוגים** | פענוח שדות **לפי שם** (XML) במקום לפי אינדקס · Brute-force ו-Password Spraying מצרפיים לפי מקור (4625) · התחברויות RDP/רשת מכתובות חיצוניות (4624) · ניקוי לוגים (1102/104) · יצירת משתמשים והוספה לקבוצות מורשות (4720/4728/4732/4756) · משימות שנוצרו (4698) · Kerberoasting בבקר תחום (4769) · כיבוי שירותי אבטחה (7040) · PowerShell 400 (שורת פקודה גם בלי 4104 + גילוי downgrade ל-v2) |
| **Sysmon** | EID 1 (כולל זיהוי **כלי שהוחלף שמו** לפי `OriginalFileName` והתאמת hash), ‏3, ‏8, ‏**10 (גישה ל-LSASS)**, ‏11 (הצפנה המונית ופתקי כופרה), ‏**22 (DNS)** |
| **Defender** | מצב הגנה, Tamper Protection, גיל חתימות · **החרגות מסוכנות** · היסטוריית זיהויים (כולל "לא טופל") · אירועים 1119/5001/5007/5010/5012/5013 |
| **תהליכים** | בדיקת PPID מול זמן יצירה (מניעת שגיאות של PID reuse) · זיהוי **Typosquatting** (`svch0st.exe`) · חוקי הורה-ילד מורחבים (Office, Web shell, SQL xp_cmdshell, WMI, script hosts) · חתימה דיגיטלית עם allow-list מדויק לפי שדה `O=` |
| **רשת** | IPv4 ו-IPv6 פרטי/חיצוני מדויק · מאזינים חשודים · **DNS cache** מול IoC · LOLBins עם חיבור חיצוני · **Named Pipes** של Cobalt Strike, Metasploit, Covenant ו-PsExec |
| **התמדה** | Run keys של **כל המשתמשים** (HKU) · Winlogon Shell/Userinit · AppInit · **LSA packages ו-Password filters** · IFEO Debugger ו-SilentProcessExit (רק ערכים רלוונטיים) · **Sticky-keys backdoor** (גם החלפת קובץ) · Netsh helpers · BootExecute · Office Test · Screensaver · cmd AutoRun · **WMI Event Subscriptions** · **BITS** · Startup של כל המשתמשים (כולל פענוח LNK) · משימות מתוזמנות (SYSTEM מנתיב כתיב, הסוואה תחת `\Microsoft\`, משימות מוסתרות) · שירותים (svchost ServiceDll, נתיב ללא מירכאות, שירות על ADMIN$) |
| **ראיות ביצוע** | **Prefetch** (ריצה של כלי תקיפה גם אם נמחק) · **היסטוריית PowerShell** (PSReadLine) של כל המשתמשים |
| **קבצים** | סריקה מהירה ומוגבלת בעומק (מדלגת על junctions ו-caches) · RTLO · Double extension · אנטרופיה מהירה (C#) · **Mark-of-the-Web**: מאיפה הקובץ הורד · SHA256 עם קישור VirusTotal · סריקת תוכן סקריפטים |
| **כופרה** | פתקים מקובצים לפי שם ומספר תיקיות (בלי README גנרי) · סיומות מוצפנות מקובצות · כונני נתונים נוספים בפרופיל Deep · Shadow copies |
| **מצב אבטחה** | Firewall, ‏RDP/NLA, ‏UAC, ‏LSA PPL, ‏Credential Guard, ‏**WDigest**, ‏SMBv1, מנהלים מקומיים, Guest, עדכונים, **כיסוי טלמטריה** (Sysmon, ‏4104, ‏4688, שמירת Security log) |
| **IoC חיצוני** | `-IocFile` מקבל JSON או TXT/CSV (זיהוי אוטומטי של IP, דומיין, MD5, SHA1, SHA256 ושמות כלים) |

### מנוע ניקוד וקורלציה
* נשמרה מטריצת NIST 5×5 ונשמר הכלל "Confidence < 7 → לכל היותר Moderate".
* **אישוש (Corroboration):** כל אות עצמאי נוסף על אותו ארטיפקט מוסיף +1 ל-Confidence (עד +2).
* ממצאי **Posture** (הקשחה) מופרדים מממצאי **Threat** ולא מנפחים את רמת הסיכון הכוללת.
* כללי קורלציה: תהליך ↔ C2 · מנגנון התמדה ↔ בינארי מסומן · הזרקה מבינארי מסומן · **תבנית כופרה** (2+ סממנים) · **תבנית גניבת זהויות** · **Brute-force שהצליח** (4625 ואחריו 4624 מאותו מקור) · עקיפת הגנות יחד עם פעילות בסיכון גבוה.
* **הגנה מזיהוי-עצמי:** חוקי הזיהוי כתובים כך שהסקריפט לא "יתפוס את עצמו" בלוג 4104. אירועים של הסורק עצמו מזוהים לפי `ScriptBlockId` ומסוננים.
* כשרוב האוספים נכשלו (למשל הרצה ללא הרשאות), הכלי מדווח **INCONCLUSIVE** ולא "לא נמצאה חדירה".

### הדו"ח
| קובץ | תוכן |
|---|---|
| `ThreatScan_<HOST>_<TS>.html` | דו"ח אינטראקטיבי **עצמאי לגמרי** (ללא CDN, עובד ברשת מבודדת), בהיר/כהה, מותאם להדפסה ו-PDF ולמובייל |
| `...json` | ייצוא מלא (findings, evidence, inventory). אפשר לרנדר ממנו מחדש עם `-ReportFromJson` |
| `..._Findings.csv` / `..._IoC.csv` | לייבוא ל-SIEM או ל-Excel |
| `..._ExecutiveSummary.md` | תקציר מנהלים מוכן להדבקה בכרטיס/טיקט |
| `ScanLog.txt` | לוג ההרצה (transcript) |
| `manifest.sha256.txt` | SHA-256 של כל קבצי הפלט (שרשרת משמורת) |

**מבנה ה-HTML:** תקציר מנהלים (רמת סיכון, כותרת הערכה, נימוק, KPI) ← **פעולות תגובה מתועדפות** (עם צ'קבוקס) ← ממצאים מרכזיים (למה סומן ומה לעשות) ← **מטריצת MITRE ATT&CK** ← **ציר זמן** ← טבלת כל הממצאים (חיפוש, סינון לפי חומרה וקטגוריה, מיון, ראיות מלאות, ייצוא CSV) ← IoC ← מצב אבטחה וטלמטריה ← **כיסוי הסריקה** (מה נאסף ומה לא) ← מלאי ארטיפקטים גולמי ← מתודולוגיה.

כל הנתונים מוצגים דרך `textContent` ומוטמעים כ-JSON מקודד, כך שתוכן מהמחשב הנבדק לא יכול להריץ קוד בדפדפן של האנליסט.

דו"ח לדוגמה (נתונים סינתטיים): [`samples/ThreatScan_SAMPLE.html`](samples/ThreatScan_SAMPLE.html).

---

## 3. שימוש

```powershell
# הרצה רגילה (מומלץ: PowerShell כמנהל)
powershell -ExecutionPolicy Bypass -File .\IR_DeepThreatScan_v9.0.ps1 -CaseId IR-2026-114

# סריקה עמוקה עם פיד IoC של הארגון
.\IR_DeepThreatScan_v9.0.ps1 -ScanProfile Deep -LookbackHours 168 -IocFile .\samples\iocs.example.json

# טריאז' מהיר בלי סריקת קבצים
.\IR_DeepThreatScan_v9.0.ps1 -ScanProfile Quick -SkipFileScan

# רינדור מחדש של דו"ח מ-JSON (למשל על מחשב האנליסט)
.\IR_DeepThreatScan_v9.0.ps1 -ReportFromJson .\ThreatScan_PC01_20261018_101500.json
```

| פרמטר | ברירת מחדל | תיאור |
|---|---|---|
| `-OutputPath` | `C:\SDEMAAuditReport` | כל הרצה נכתבת לתת-תיקייה `<HOST>_<timestamp>` |
| `-ScanProfile` | `Standard` | `Quick` / `Standard` / `Deep`: נפח אירועים, עומק קבצים, hash לכל קובץ |
| `-LookbackHours` | `72` | חלון הזמן לאירועים |
| `-FileLookbackDays` | `30` | נבדקים רק קבצים שנוצרו או שונו בחלון הזה |
| `-IocFile` | — | פיד IoC בפורמט JSON או TXT/CSV |
| `-CaseId`, `-Analyst` | — | מופיעים בדו"ח |
| `-NoOpen` | — | לא לפתוח את הדו"ח בסוף |
| `-SkipFileScan` | — | דילוג על סריקות הקבצים |
| `-ReportFromJson` | — | רינדור דו"ח בלבד, בלי סריקה |

### בניית EXE
```powershell
Install-Module ps2exe -Scope CurrentUser      # פעם אחת
.\Build-Exe.ps1                               # -> dist\IR_DeepThreatScan_v9.0.exe (x64, דורש Admin)
.\Build-Exe.ps1 -SignCertThumbprint <thumb>   # מומלץ: חתימה כדי ש-EDR לא יחסום
```

### בדיקות
```powershell
pwsh -File .\tests\Test-DeepThreatScan.ps1
```
67 בדיקות: חוקי זיהוי (חיוביים, שליליים ו-obfuscation), הגנה מזיהוי-עצמי, מטריצת סיכון, פונקציות עזר, ייבוא פיד IoC, קורלציה, יצירת JSON/HTML/MD/CSV ובדיקת הגנה מ-XSS. הבדיקות רצות גם ב-Linux/macOS עם PowerShell 7.

---

## 4. מגבלות ידועות
* סריקה נקודתית (point-in-time). היעדר ממצאים אינו הוכחה להיעדר חדירה. ראו את מקטעי "Visibility limits" ו-"Scan coverage" בדו"ח.
* ללא הרשאות מנהל אין גישה ל-Security log, ל-Prefetch, להחרגות Defender ולחלק מפרטי התהליכים.
* Sysmon, ‏4104 ו-4688 עם שורת פקודה מרחיבים מאוד את הכיסוי. הדו"ח מציין אם הם חסרים.
* שמות Named Pipes ו-BYOVD מבוססים על ברירות מחדל ידועות. תוקף מתוחכם יכול לשנות אותם.
