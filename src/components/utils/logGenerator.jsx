import { LogTemplate } from '@/entities/LogTemplate';
import { generateEDRLog } from './enhancedEdrLogGenerator';
import { generateFirewallLog } from './firewallLogGenerator';
import { generateOffice365Log } from './office365LogGenerator';
import { generateDlpLog } from './dlpLogGenerator';
import { generateNidsLog } from './nidsLogGenerator';
import { generateNacLog } from './nacLogGenerator';
import { generateDomainControllerLog } from './dcLogGenerator';
import { generateAntivirusLog } from './antivirusLogGenerator';
import { generateWAFLog } from './wafLogGenerator';
import { generateProxyLog } from './proxyLogGenerator';
import { generateVPNLog } from './vpnLogGenerator';
import { generateDHCPLog } from './dhcpLogGenerator';
import { generateActiveDirectoryLog } from './adLogGenerator';

// A simple in-memory cache for templates
let templateCache = null;
let lastCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Fallback data in case no templates are available
const fallbackUsernames = [
  'sarah.cohen', 'david.miller', 'noa.halevi', 'michael.brown', 'rachel.garcia',
  'john.smith', 'anna.wilson', 'alex.johnson', 'maria.rodriguez', 'james.davis'
];

const fallbackIPs = [
  '185.101.22.33', '45.77.129.211', '213.8.49.105', '203.0.113.45',
  '198.51.100.42', '192.0.2.156', '172.16.254.1', '89.248.165.2'
];

const fallbackHostnames = [
  'HR-LAPTOP-07', 'FINANCE-PC02', 'IT-WORKSTATION-15', 'SALES-DESKTOP-09',
  'DEV-MACHINE-23', 'ACCOUNTING-PC-11', 'MARKETING-LAPTOP-04', 'EXEC-WORKSTATION-01'
];

// Expanded supported log source types for rich scenario generation
const sourceTypes = [
    "Active Directory", "EDR", "Firewall", "Office 365", "Network IDS",
    "Windows Security", "DLP", "DC", "Antivirus", "WAF", "Proxy", "VPN", "DHCP"
];

const realisticSourceTypes = [
    { type: 'Active Directory', weight: 15 },
    { type: 'EDR', weight: 20 },
    { type: 'Firewall', weight: 25 },
    { type: 'Office 365', weight: 10 },
    { type: 'Network IDS', weight: 15 },
    { type: 'Windows Security', weight: 10 },
    { type: 'DLP', weight: 5 },
    { type: 'DC', weight: 12 },
    { type: 'Antivirus', weight: 8 },
    { type: 'WAF', weight: 6 },
    { type: 'Proxy', weight: 7 },
    { type: 'VPN', weight: 4 },
    { type: 'DHCP', weight: 3 }
];

// Load templates from database with caching
const loadTemplates = async () => {
  const now = Date.now();
  if (templateCache !== null && (now - lastCacheTime) < CACHE_DURATION) {
    return templateCache;
  }

  try {
    const templates = await LogTemplate.filter({ is_active: true });
    if (templates && templates.length > 0) {
      templateCache = templates;
      lastCacheTime = now;
      return templates;
    }
  } catch (error) {
    console.warn('Could not load log templates, using fallback data:', error);
  }

  // Return empty array if no templates - will use fallback generation
  templateCache = []; // Ensure cache is an empty array if no templates were loaded successfully
  lastCacheTime = now; // Update time even if empty to respect cache duration
  return [];
};

// Generate weighted random selection
const selectRandomTemplate = (templates) => {
  if (!templates || templates.length === 0) return null;

  const totalWeight = templates.reduce((sum, t) => sum + (t.generation_weight || 1), 0);
  let randomNum = Math.random() * totalWeight;

  for (const template of templates) {
    randomNum -= (template.generation_weight || 1);
    if (randomNum <= 0) {
      return template;
    }
  }

  return templates[0]; // Fallback
};

// Replace placeholders in template strings
const replacePlaceholders = (template, sampleData) => {
  if (!template || typeof template !== 'string') return template;

  return template.replace(/\{(\w+)\}/g, (match, key) => {
    if (sampleData && sampleData[key] !== undefined) {
      return sampleData[key];
    }

    // Fallback replacements
    switch (key.toLowerCase()) {
      case 'username':
      case 'user':
        return fallbackUsernames[Math.floor(Math.random() * fallbackUsernames.length)];
      case 'source_ip':
      case 'src_ip':
      case 'ip':
        return fallbackIPs[Math.floor(Math.random() * fallbackIPs.length)];
      case 'hostname':
      case 'computer':
        return fallbackHostnames[Math.floor(Math.random() * fallbackHostnames.length)];
      default:
        return match; // Return original placeholder if no replacement found
    }
  });
};

// Generate log from template
const generateLogFromTemplate = (template) => {
  if (!template) return null;

  const baseLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    timestamp: new Date().toISOString(),
    source_type: template.source_type,
    agent: {
      name: template.sample_data?.agent_name || `${template.source_type}-Agent-${Math.floor(Math.random() * 10) + 1}`
    },
    rule: {
      id: template.rule_id || `RULE_${Math.floor(Math.random() * 9000) + 1000}`,
      level: template.severity_level,
      description: replacePlaceholders(template.description_template, template.sample_data)
    },
    data: {}
  };

  // Process sample data with placeholder replacement
  if (template.sample_data && typeof template.sample_data === 'object') {
    const processedData = {};
    for (const [key, value] of Object.entries(template.sample_data)) {
      if (typeof value === 'string') {
        processedData[key] = replacePlaceholders(value, template.sample_data);
      } else {
        processedData[key] = value;
      }
    }
    baseLog.data = processedData;
  }

  return baseLog;
};

// Fallback log generation when no templates available
const generateFallbackLog = () => {
  const logTypes = [
    {
      source_type: "Active Directory",
      severity: 7,
      description: "User logon failure",
      data: {
        event_id: 4625,
        username: fallbackUsernames[Math.floor(Math.random() * fallbackUsernames.length)],
        source_ip: fallbackIPs[Math.floor(Math.random() * fallbackIPs.length)],
        failure_reason: "Bad password"
      }
    },
    {
      source_type: "EDR",
      severity: 6,
      description: "Suspicious process execution",
      data: {
        process_name: "powershell.exe",
        command_line: "powershell -enc base64command",
        hostname: fallbackHostnames[Math.floor(Math.random() * fallbackHostnames.length)]
      }
    },
    {
      source_type: "Firewall",
      severity: 4,
      description: "Connection denied",
      data: {
        src_ip: fallbackIPs[Math.floor(Math.random() * fallbackIPs.length)],
        dst_ip: "10.0.1.100",
        dst_port: 443,
        action: "denied"
      }
    }
  ];

  const selectedType = logTypes[Math.floor(Math.random() * logTypes.length)];

  return {
    id: `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    timestamp: new Date().toISOString(),
    source_type: selectedType.source_type,
    agent: {
      name: `${selectedType.source_type.replace(/\s+/g, '-')}-01`
    },
    rule: {
      id: `RULE_${Math.floor(Math.random() * 9000) + 1000}`,
      level: selectedType.severity,
      description: selectedType.description
    },
    data: selectedType.data
  };
};

// Main function to generate a single realistic log
export const generateRealisticLog = async () => {
  try {
    const templates = await loadTemplates();

    if (templates && templates.length > 0) {
      const selectedTemplate = selectRandomTemplate(templates);
      const log = generateLogFromTemplate(selectedTemplate);
      if (log) return log;
    }

    // Fallback to hardcoded generation
    return generateFallbackLog();
  } catch (error) {
    console.warn('Error in log generation, using fallback:', error);
    return generateFallbackLog();
  }
};

// Generate batch of logs
export const generateRealisticLogBatch = async (count = 1) => {
  const allTemplates = await loadTemplates(); // Use loadTemplates to benefit from caching
  if (allTemplates.length === 0) {
    console.warn("No active log templates found for generation, generating fallback logs.");
    const fallbackLogs = [];
    for (let i = 0; i < count; i++) {
        fallbackLogs.push(generateFallbackLog());
    }
    return fallbackLogs;
  }

  const generatedLogs = [];
  const baseBatchTime = Date.now(); // For consistent timestamp spreading

  for (let i = 0; i < count; i++) {
    const activeTemplates = allTemplates.filter(t => t.is_active);
    if (activeTemplates.length === 0) {
      console.warn("No active templates left after filtering.");
      break;
    }

    // Weighted random selection based on generation_weight
    const totalWeight = activeTemplates.reduce((sum, t) => sum + (t.generation_weight || 1), 0);
    let randomNum = Math.random() * totalWeight;
    let selectedTemplate = null;
    for (const template of activeTemplates) {
      randomNum -= (template.generation_weight || 1);
      if (randomNum <= 0) {
        selectedTemplate = template;
        break;
      }
    }

    if (!selectedTemplate) {
      selectedTemplate = activeTemplates[Math.floor(Math.random() * activeTemplates.length)];
    }

    // --- Generate data for the new log object structure ---

    // Timestamp with slight variation for realism within the batch
    const timestamp = new Date(baseBatchTime - (i * 1000 * Math.random() * 30)).toISOString();

    // Process description template
    const populatedDescription = replacePlaceholders(selectedTemplate.description_template, selectedTemplate.sample_data);

    // Process sample data with placeholder replacement
    const populatedSampleData = {};
    if (selectedTemplate.sample_data && typeof selectedTemplate.sample_data === 'object') {
      for (const [key, value] of Object.entries(selectedTemplate.sample_data)) {
        if (typeof value === 'string') {
          populatedSampleData[key] = replacePlaceholders(value, selectedTemplate.sample_data);
        } else {
          populatedSampleData[key] = value;
        }
      }
    }

    // Generate rule ID
    const rule_id = selectedTemplate.rule_id || `RULE_${Math.floor(Math.random() * 9000) + 1000}`;

    // Generate / extract common fields, prioritizing sample_data values
    const randomUser = populatedSampleData.username || fallbackUsernames[Math.floor(Math.random() * fallbackUsernames.length)];
    const randomHost = populatedSampleData.hostname || fallbackHostnames[Math.floor(Math.random() * fallbackHostnames.length)];
    const randomIp = populatedSampleData.source_ip || populatedSampleData.src_ip || populatedSampleData.ip || fallbackIPs[Math.floor(Math.random() * fallbackIPs.length)];

    const generatedLog = {
      id: "gen_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
      timestamp,
      rule: {
        description: populatedDescription,
        level: selectedTemplate.severity_level,
        id: rule_id
      },
      rule_description: populatedDescription,
      source_type: selectedTemplate.source_type,
      severity: selectedTemplate.severity_level,
      username: randomUser,
      hostname: randomHost,
      ip_address: randomIp,
      raw_log_data: populatedSampleData,
      admin_notes: selectedTemplate.admin_notes || "",
      default_classification: selectedTemplate.default_classification || null,
      data: populatedSampleData,
      agent: {
        name: randomHost,
        ip: randomIp
      }
    };

    generatedLogs.push(generatedLog);
  }

  return generatedLogs;
};

// Force refresh template cache (useful after admin updates)
export const refreshTemplateCache = () => {
  templateCache = null;
  lastCacheTime = 0;
};

const generateLogId = () => `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

const generateRandomIP = () => {
  return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
};

const getRandomSourceType = () => {
  const totalWeight = realisticSourceTypes.reduce((sum, item) => sum + item.weight, 0);
  let randomNum = Math.random() * totalWeight;

  for (const item of realisticSourceTypes) {
    randomNum -= item.weight;
    if (randomNum <= 0) {
      return item.type;
    }
  }
  return realisticSourceTypes[0].type; // Fallback
};

export const generateRandomLog = (options = {}) => {
  const sourceType = options.sourceType || getRandomSourceType();

  switch (sourceType) {
    case "Active Directory":
      return generateActiveDirectoryLog(options);
    case "EDR":
      return generateEDRLog(options);
    case "Firewall":
      return generateFirewallLog(options);
    case "Office 365":
      return generateOffice365Log(options);
    case "Network IDS":
      return generateNidsLog(options);
    case "Windows Security":
      return generateEDRLog(options); // Windows Security logs use EDR generator
    case "DLP":
      return generateDlpLog(options);
    case "DC":
      return generateDomainControllerLog(options);
    case "Antivirus":
      return generateAntivirusLog(options);
    case "WAF":
      return generateWAFLog(options);
    case "Proxy":
      return generateProxyLog(options);
    case "VPN":
      return generateVPNLog(options);
    case "DHCP":
      return generateDHCPLog(options);
    default:
      // Fallback to EDR if unknown source type
      return generateEDRLog(options);
  }
};

export default generateRealisticLogBatch;