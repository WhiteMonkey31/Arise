/**
 * App-wide constants.
 */

export const SECTORS = [
  'IT Services',
  'Healthcare',
  'Logistics',
  'Construction',
  'Financial Services',
  'Other',
]

export const WORKSPACE_STATUSES = ['draft', 'analysing', 'in_review', 'submitted']

export const COMPLIANCE_STATUSES = ['pass', 'partial', 'gap']

export const SCORE_AXIS_LABELS = [
  'Budget Fit',
  'Compliance %',
  'Past Win Rate',
  'Response Time',
  'Sector Match',
  'Gap Penalty',
]

/** Maximum RFP file upload size in bytes (50 MB) */
export const MAX_UPLOAD_SIZE = 50 * 1024 * 1024

/** Backend base URL — read from Vite env at build time */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
