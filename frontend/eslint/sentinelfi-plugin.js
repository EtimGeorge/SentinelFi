'use strict';

const GRADIENT_ALLOW = /(landing|login|pages(?:\/|\\)index\.tsx|brand\.tsx|components(?:\/|\\)ai[\/\\])/i;

const BANNED = [
  { re: /text-\[(?:8|9|10)px\]/g, label: 'micro font size (use the text-xs / text-label floor)' },
  { re: /tracking-(?:widest|wide|wider)/g, label: 'tracking-token (AI-generated tell)' },
  { re: /shadow-(?:2xl|xl|lg|md|sm)/g, label: 'raw shadow class (use elev-none/sm/md/lg/xl)', glowOk: true },
];

const BANNED_GRADIENT = [{ re: /bg-gradient-to-/g, label: 'decorative gradient (use solid fills)' }];

function scan(node, value, allowedGradients, context) {
  if (!value) return;
  const rules = allowedGradients ? BANNED : BANNED.concat(BANNED_GRADIENT);
  for (const rule of rules) {
    rule.re.lastIndex = 0;
    let m;
    while ((m = rule.re.exec(value)) !== null) {
      if (rule.glowOk && /\sshadow-brand-[a-z-]+\/\d+/.test(value)) continue;
      context.report({
        node,
        messageId: 'tell',
        data: { token: m[0], note: rule.label },
      });
    }
  }
}

function collectStrings(node, out) {
  if (!node) return;
  switch (node.type) {
    case 'Literal':
      if (typeof node.value === 'string') out.push(node.value);
      break;
    case 'TemplateLiteral':
      out.push(node.quasis.map((q) => q.value.cooked || '').join(' '));
      node.expressions.forEach((e) => collectStrings(e, out));
      break;
    case 'ConditionalExpression':
      collectStrings(node.consequent, out);
      collectStrings(node.alternate, out);
      break;
    case 'LogicalExpression':
    case 'BinaryExpression':
    case 'JSXExpressionContainer':
      collectStrings(node.left || node.expression, out);
      if (node.right) collectStrings(node.right, out);
      break;
    default:
      break;
  }
}

module.exports = {
  rules: {
    'no-ai-tells': {
      meta: {
        type: 'suggestion',
        docs: {
          description: 'Fails on design-token regressions (micro font sizes, tracking tokens, raw shadows, decorative gradients) in dashboard surfaces.',
        },
        messages: {
          tell: 'Design-token guard: `{{token}}` {{note}}.',
        },
        schema: [],
      },
      create(context) {
        const filename = context.getFilename().replace(/\\/g, '/');
        const allowedGradients = GRADIENT_ALLOW.test(filename);
        return {
          JSXAttribute(node) {
            const attrName = node.name && node.name.name;
            if (attrName !== 'className' && attrName !== 'class') return;
            if (node.value && node.value.type === 'Literal') {
              scan(node.value, String(node.value.value), allowedGradients, context);
            } else if (node.value && node.value.type === 'JSXExpressionContainer') {
              const strings = [];
              collectStrings(node.value.expression, strings);
              scan(node, strings.join(' '), allowedGradients, context);
            }
          },
        };
      },
    },
  },
  configs: {
    recommended: {
      plugins: ['sentinelfi'],
      rules: {
        'sentinelfi/no-ai-tells': 'warn',
      },
    },
  },
};