const fs = require('fs');
const p = 'frontend/lib/navigationMap.ts';
let t = fs.readFileSync(p, 'utf8');
const reps = [
  ["icon: Receipt,", "icon: Banknote,"],
  ["name: 'Project Ledger (CAPEX)',\n            icon: ClipboardCheck,", "name: 'Project Ledger (CAPEX)',\n            icon: Files,"],
  ["name: 'Operational Expense Run-Rate',\n            icon: ClipboardCheck,", "name: 'Operational Expense Run-Rate',\n            icon: TrendingDown,"],
  ["name: 'Board Report',\n            icon: Files,", "name: 'Board Report',\n            icon: Newspaper,"],
  ["name: 'Landlord Support',\n            icon: Shield,", "name: 'Landlord Support',\n            icon: LifeBuoy,"],
  ["name: 'HR Management',\n    icon: Building,", "name: 'HR Management',\n    icon: TentTree,"],
  ["name: 'Tenant Management',\n    icon: Building2,", "name: 'Tenant Management',\n    icon: Globe,"],
  ["name: 'Security Audit Log',\n            icon: ClipboardCheck,", "name: 'Security Audit Log',\n            icon: ScrollText,"],
  ["name: 'Platform Audit Logs',\n    icon: ClipboardCheck,", "name: 'Platform Audit Logs',\n    icon: ScrollText,"],
  ["  Cog,\n", ""],
];
for (const [oldS, newS] of reps) {
  const n = t.split(oldS).length - 1;
  console.log(JSON.stringify(oldS.slice(0, 45)), 'count=', n);
  if (n >= 1) { t = t.split(oldS).join(newS); console.log('  applied to all'); }
}
fs.writeFileSync(p, t);
console.log('done nav rewrite');
