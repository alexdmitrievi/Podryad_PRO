export const CRM_STATUSES = ['new', 'analyzed', 'cp_drafted', 'cp_approved', 'sent', 'replied', 'call', 'won', 'lost'] as const;
export type CrmStatus = (typeof CRM_STATUSES)[number];
