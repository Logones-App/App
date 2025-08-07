// Fichier centralisé pour toutes les permissions disponibles
// Facilement extensible - ajoutez de nouvelles permissions ici !

export const MOBILE_USER_PERMISSIONS = {
  // Permissions Réservations
  BOOKINGS: {
    READ: "bookings:read",
    CREATE: "bookings:create",
    UPDATE: "bookings:update",
    CANCEL: "bookings:cancel",
  },

  // Permissions Commandes
  ORDERS: {
    READ: "orders:read",
    CREATE: "orders:create",
    UPDATE: "orders:update",
    CANCEL: "orders:cancel",
  },

  // Permissions Menu
  MENU: {
    READ: "menu:read",
    UPDATE: "menu:update",
  },

  // Permissions Stock
  STOCK: {
    READ: "stock:read",
    UPDATE: "stock:update",
  },

  // Permissions Utilisateurs
  USERS: {
    READ: "users:read",
    MANAGE: "users:manage",
  },

  // Permissions Rapports
  REPORTS: {
    READ: "reports:read",
    GENERATE: "reports:generate",
  },

  // Permissions Paramètres
  SETTINGS: {
    READ: "settings:read",
    UPDATE: "settings:update",
  },

  // Nouvelles permissions - Extensibles
  ANALYTICS: {
    EXPORT: "analytics:export",
    VIEW: "analytics:view",
  },

  NOTIFICATIONS: {
    SEND: "notifications:send",
    READ: "notifications:read",
  },

  PAYMENTS: {
    PROCESS: "payments:process",
    REFUND: "payments:refund",
  },

  INVENTORY: {
    MANAGE: "inventory:manage",
    ALERT: "inventory:alert",
  },

  CUSTOMERS: {
    VIEW: "customers:view",
    EDIT: "customers:edit",
  },

  DELIVERY: {
    TRACK: "delivery:track",
    ASSIGN: "delivery:assign",
  },

  KITCHEN: {
    ORDERS: "kitchen:orders",
    STATUS: "kitchen:status",
  },

  WAITER: {
    ASSIGN: "waiter:assign",
    MANAGE: "waiter:manage",
  },

  TABLE: {
    RESERVE: "table:reserve",
    MANAGE: "table:manage",
  },

  LOYALTY: {
    POINTS: "loyalty:points",
    REWARDS: "loyalty:rewards",
  },

  DISCOUNT: {
    APPLY: "discount:apply",
    MANAGE: "discount:manage",
  },

  TAX: {
    CALCULATE: "tax:calculate",
    MANAGE: "tax:manage",
  },

  TIP: {
    DISTRIBUTE: "tip:distribute",
    MANAGE: "tip:manage",
  },

  SHIFT: {
    SCHEDULE: "shift:schedule",
    MANAGE: "shift:manage",
  },

  MAINTENANCE: {
    REQUEST: "maintenance:request",
    APPROVE: "maintenance:approve",
  },

  SUPPLIER: {
    CONTACT: "supplier:contact",
    MANAGE: "supplier:manage",
  },

  QUALITY: {
    CHECK: "quality:check",
    REPORT: "quality:report",
  },

  TEMPERATURE: {
    MONITOR: "temperature:monitor",
    ALERT: "temperature:alert",
  },

  EXPENSES: {
    APPROVE: "expenses:approve",
    MANAGE: "expenses:manage",
  },
} as const;

// Fonction pour obtenir toutes les permissions
export function getAllPermissions(): string[] {
  const permissions: string[] = [];

  Object.values(MOBILE_USER_PERMISSIONS).forEach((category) => {
    Object.values(category).forEach((permission) => {
      permissions.push(permission);
    });
  });

  return permissions;
}

// Fonction pour obtenir les permissions par catégorie
export function getPermissionsByCategory(category: keyof typeof MOBILE_USER_PERMISSIONS): string[] {
  return Object.values(MOBILE_USER_PERMISSIONS[category]);
}

// Fonction pour vérifier si une permission existe
export function isValidPermission(permission: string): boolean {
  return getAllPermissions().includes(permission);
}
