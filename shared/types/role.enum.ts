// Maps directly to the Role-Based Access Control (RBAC) Matrix
export enum Role {
  // Executive Tier
  SuperAdmin = 'SuperAdmin',       // Platform Owner
  CEO = 'CEO',                    // Company Head / Managing Director
  
  // Director Tier (DOA Level 3)
  CFO = 'CFO',                    // Chief Financial Officer / Finance Director
  AdminDirector = 'Admin Director', // General Manager / Admin Head
  OperationalDirector = 'Operational Director',
  TechnicalDirector = 'Technical Director', // Formerly IT Head
  
  // Management Tier (DOA Level 2)
  FinanceManager = 'Finance Manager', 
  AdminManager = 'Admin Manager',
  ProjectManager = 'Project Manager',
  
  // Operational Tier (DOA Level 1)
  FinanceOfficer = 'Finance Officer',
  AdminOfficer = 'Admin Officer',
  AssignedProjectUser = 'Assigned Project User',
}
