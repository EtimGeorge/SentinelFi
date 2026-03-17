import { Injectable, Logger } from '@nestjs/common';

/**
 * Iron-clad security guardrail service for the NestJS AI proxy layer.
 * This is a defense-in-depth layer BEFORE requests reach the Python AI agent.
 * 
 * Zero-tolerance policy:
 * - Credential/secret extraction attempts → HARD BLOCK
 * - Cross-tenant data fishing → HARD BLOCK  
 * - Prompt injection / jailbreak attempts → HARD BLOCK
 * - System maintenance issues → REDIRECT to SuperAdmin
 * - SQL/script injection patterns → HARD BLOCK
 */
@Injectable()
export class GuardrailsService {
  private readonly logger = new Logger(GuardrailsService.name);

  // Compiled regex patterns for performance
  private readonly HARD_BLOCK_PATTERNS: RegExp[] = [
    // Credential/secret probing
    /\b(password|passwd|pwd|secret|api[_\s]?key|private[_\s]key|token|credential|auth[_\s]?token|jwt)\b/i,
    // Environment variable probing
    /\b(\.env|process\.env|os\.environ|getenv|sys\.argv|environment\s+variable)\b/i,
    // Database introspection
    /(show\s+tables|show\s+databases|information_schema|pg_catalog|pg_tables|sqlite_master)/i,
    // SQL injection classic patterns
    /(drop\s+table|truncate\s+table|alter\s+table|delete\s+from\s+\w|insert\s+into|update\s+\w+\s+set)/i,
    /(union\s+select|select\s+\*\s+from|exec\s*\(|execute\s*\(|sp_executesql)/i,
    /(--|;--|\s\/\*|\*\/|xp_cmdshell|LOAD_FILE|INTO\s+OUTFILE)/i,
    // Prompt injection / jailbreak
    /ignore\s+(all\s+)?previous\s+instructions/i,
    /forget\s+(your\s+)?(system\s+)?prompt/i,
    /(you\s+are\s+now|act\s+as\s+if|pretend\s+(you\s+are|to\s+be))\s+/i,
    /(jailbreak|dan\s+mode|developer\s+mode|unrestricted\s+mode)/i,
    /(bypass\s+(all\s+)?(restrictions|rules|safety|guardrail)|disregard\s+your)/i,
    /(reveal\s+your\s+(system\s+)?prompt|what\s+are\s+your\s+(exact\s+)?instructions)/i,
    // Cross-tenant fishing
    /(other\s+(tenant|company|client|organization)|all\s+(tenants|companies|clients))/i,
    /(show\s+me\s+all\s+users|list\s+all\s+(companies|organizations|tenants))/i,
    // Infrastructure probing
    /(server\s+(ip|address|host|url)|database\s+(host|url|connection)|neon\.tech|supabase|redis)/i,
    // Script execution / code injection
    /(<script|javascript:|eval\s*\(|document\.cookie|window\.location)/i,
    /(import\s+os|import\s+sys|subprocess|os\.system|shell_exec)/i,
    // Encoding obfuscation tricks
    /(base64_decode|atob\s*\(|fromCharCode)/i,
  ];

  private readonly SUPERADMIN_REDIRECT_PATTERNS: RegExp[] = [
    /(server\s+(error|crash|is\s+down)|database\s+(error|is\s+down|connection\s+failed))/i,
    /(billing\s+issue|subscription\s+(expired|problem|canceled)|account\s+(locked|suspended|disabled))/i,
    /(user\s+access\s+(denied|revoked)|permission\s+(error|issue)|cannot\s+login|can't\s+log\s+in)/i,
    /(data\s+(loss|corruption|recovery)|backup\s+restore)/i,
    /(system\s+(maintenance|issue|bug|outage))/i,
  ];

  private readonly MAX_MESSAGE_LENGTH = 4000;

  /**
   * Scans a message for security violations.
   * Returns: { safe: boolean, reason: string | null, type: BlockType }
   */
  scan(message: string, context?: { sessionId?: string; userId?: string }): {
    safe: boolean;
    reason: string | null;
    type: 'SAFE' | 'HARD_BLOCK' | 'SUPERADMIN_REDIRECT';
  } {
    if (!message || typeof message !== 'string') {
      return { safe: true, reason: null, type: 'SAFE' };
    }

    // Length check
    if (message.length > this.MAX_MESSAGE_LENGTH) {
      this.logBlock('MESSAGE_TOO_LONG', message.substring(0, 50), context);
      return {
        safe: false,
        reason: 'Message is too long. Please be more concise (max 4000 characters).',
        type: 'HARD_BLOCK',
      };
    }

    // Hard block patterns
    for (const pattern of this.HARD_BLOCK_PATTERNS) {
      if (pattern.test(message)) {
        this.logBlock(`PATTERN_MATCH: ${pattern.source.substring(0, 40)}`, message.substring(0, 50), context);
        return {
          safe: false,
          reason:
            'I cannot process that request. I am designed exclusively for financial analysis within SentinelFi. ' +
            'If you believe this is a legitimate request, please contact your system administrator.',
          type: 'HARD_BLOCK',
        };
      }
    }

    // SuperAdmin redirect patterns
    for (const pattern of this.SUPERADMIN_REDIRECT_PATTERNS) {
      if (pattern.test(message)) {
        return {
          safe: false,
          reason:
            'This appears to be a system maintenance or access issue outside my scope. ' +
            'Please contact your **SuperAdmin** for assistance, or navigate to **Settings → Support** to raise a ticket.',
          type: 'SUPERADMIN_REDIRECT',
        };
      }
    }

    return { safe: true, reason: null, type: 'SAFE' };
  }

  /**
   * Strips sensitive keys from any context object before forwarding to the AI agent.
   */
  sanitizeContext(obj: Record<string, any>): Record<string, any> {
    const FORBIDDEN_KEYS = new Set([
      'password', 'secret', 'token', 'api_key', 'apiKey', 'connection_string',
      'connectionString', 'database_url', 'databaseUrl', 'db_url', 'jwt_secret',
      'jwtSecret', 'private_key', 'privateKey', 'auth_token', 'authToken',
      'refresh_token', 'refreshToken', 'access_token', 'accessToken',
    ]);

    const sanitize = (value: any): any => {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const clean: Record<string, any> = {};
        for (const [k, v] of Object.entries(value)) {
          const lk = k.toLowerCase();
          const isForbidden = FORBIDDEN_KEYS.has(k) || FORBIDDEN_KEYS.has(lk) ||
            Array.from(FORBIDDEN_KEYS).some(fk => lk.includes(fk));
          if (!isForbidden) {
            clean[k] = sanitize(v);
          }
        }
        return clean;
      }
      if (Array.isArray(value)) return value.map(sanitize);
      return value;
    };

    return sanitize(obj);
  }

  private logBlock(reason: string, snippet: string, context?: { sessionId?: string; userId?: string }) {
    this.logger.warn(`[SECURITY_BLOCK] ${reason}`, {
      userId: context?.userId ?? 'unknown',
      sessionId: context?.sessionId ?? 'unknown',
      snippet_hash: Buffer.from(snippet).toString('base64').substring(0, 20),
    });
  }
}
