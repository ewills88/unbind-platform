// Payment Processing & Trust Account Types
// Session 11 Checkpoint 2

// Payment method types
export type PaymentMethod =
  | 'credit_card'
  | 'ach'
  | 'check'
  | 'cash'
  | 'wire'
  | 'other'

// Payment status
export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'refunded'
  | 'partially_refunded'
  | 'cancelled'

// Trust transaction types
export type TrustTransactionType =
  | 'deposit'
  | 'withdrawal'
  | 'adjustment'
  | 'interest'
  | 'refund'
  | 'fee'

// Payment record
export interface Payment {
  id: string
  invoice_id: string

  payment_method: PaymentMethod
  amount: number
  payment_date: string

  stripe_payment_intent_id?: string
  stripe_charge_id?: string
  stripe_refund_id?: string

  status: PaymentStatus
  failure_reason?: string

  refund_amount: number
  refunded_at?: string

  transaction_fee: number
  net_amount: number

  check_number?: string
  bank_name?: string

  notes?: string

  created_by?: string
  created_at: string
  updated_at: string

  // Joined
  invoice?: {
    id: string
    invoice_number: string
    total_amount: number
    balance_due: number
  }
}

// Saved payment method
export interface SavedPaymentMethod {
  id: string
  user_id: string

  stripe_payment_method_id: string
  stripe_customer_id?: string

  card_brand?: string
  card_last_four?: string
  card_exp_month?: number
  card_exp_year?: number

  is_default: boolean
  nickname?: string

  created_at: string
  updated_at: string
}

// Trust account
export interface TrustAccount {
  id: string
  case_id: string

  opening_balance: number
  current_balance: number

  total_deposits: number
  total_withdrawals: number
  total_interest: number

  last_transaction_date?: string
  last_reconciled_at?: string
  last_reconciled_by?: string

  minimum_balance: number

  created_at: string
  updated_at: string

  // Joined
  case?: {
    id: string
    case_number: string
    client_name: string
  }
  transactions?: TrustTransaction[]
}

// Trust transaction
export interface TrustTransaction {
  id: string
  trust_account_id: string
  case_id: string

  transaction_type: TrustTransactionType
  amount: number
  balance_after: number

  transaction_date: string
  description: string

  reference_invoice_id?: string
  reference_payment_id?: string

  requires_approval: boolean
  approved_by?: string
  approved_at?: string

  created_by: string
  created_at: string

  // Joined
  invoice?: {
    id: string
    invoice_number: string
  }
  payment?: {
    id: string
    amount: number
  }
}

// Payment receipt
export interface PaymentReceipt {
  id: string
  payment_id: string

  receipt_number: string
  pdf_path?: string

  sent_at?: string
  sent_to_email?: string

  created_at: string
}

// Display constants

export const PAYMENT_METHOD_INFO: Record<PaymentMethod, {
  label: string
  icon: string
}> = {
  credit_card: { label: 'Credit Card', icon: 'CreditCard' },
  ach: { label: 'Bank Transfer (ACH)', icon: 'Building' },
  check: { label: 'Check', icon: 'FileText' },
  cash: { label: 'Cash', icon: 'Banknote' },
  wire: { label: 'Wire Transfer', icon: 'ArrowRightLeft' },
  other: { label: 'Other', icon: 'CircleDollarSign' }
}

export const PAYMENT_STATUS_INFO: Record<PaymentStatus, {
  label: string
  color: string
  bgColor: string
}> = {
  pending: { label: 'Pending', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  processing: { label: 'Processing', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  succeeded: { label: 'Succeeded', color: 'text-green-600', bgColor: 'bg-green-100' },
  failed: { label: 'Failed', color: 'text-red-600', bgColor: 'bg-red-100' },
  refunded: { label: 'Refunded', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  partially_refunded: { label: 'Partially Refunded', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  cancelled: { label: 'Cancelled', color: 'text-gray-400', bgColor: 'bg-gray-50' }
}

export const TRUST_TRANSACTION_INFO: Record<TrustTransactionType, {
  label: string
  color: string
  isCredit: boolean
}> = {
  deposit: { label: 'Deposit', color: 'text-green-600', isCredit: true },
  withdrawal: { label: 'Withdrawal', color: 'text-red-600', isCredit: false },
  adjustment: { label: 'Adjustment', color: 'text-blue-600', isCredit: true },
  interest: { label: 'Interest', color: 'text-green-600', isCredit: true },
  refund: { label: 'Refund', color: 'text-red-600', isCredit: false },
  fee: { label: 'Fee', color: 'text-red-600', isCredit: false }
}

// Payment Plan types
export type PaymentPlanFrequency = 'weekly' | 'biweekly' | 'monthly'
export type PaymentPlanStatus = 'active' | 'completed' | 'cancelled' | 'defaulted'
export type ReminderType = 'upcoming' | 'due_today' | 'past_due_7' | 'past_due_30' | 'final_notice'
export type ReminderStatus = 'pending' | 'sent' | 'failed'

export interface PaymentPlan {
  id: string
  invoice_id: string
  case_id: string

  total_amount: number
  installment_count: number
  installment_amount: number
  frequency: PaymentPlanFrequency

  first_payment_date: string
  next_payment_date: string | null
  last_payment_date: string | null

  payments_made: number
  amount_paid: number

  status: PaymentPlanStatus

  auto_charge: boolean
  saved_payment_method_id: string | null

  created_by: string
  created_at: string
  updated_at: string

  // Joined
  invoice?: {
    id: string
    invoice_number: string
    total_amount: number
    balance_due: number
  }
}

export interface PaymentReminder {
  id: string
  invoice_id: string
  reminder_type: ReminderType
  scheduled_date: string
  sent_at: string | null
  status: ReminderStatus
  error_message: string | null
  created_at: string
}

export interface TrustReconciliation {
  id: string
  reconciliation_month: string
  bank_beginning_balance: number
  bank_ending_balance: number
  register_beginning_balance: number
  register_ending_balance: number
  total_deposits: number
  total_withdrawals: number
  sum_client_balances: number
  is_reconciled: boolean
  discrepancy: number
  notes: string | null
  bank_statement_path: string | null
  reconciled_by: string
  created_at: string
  updated_at: string
}

export const PAYMENT_PLAN_FREQUENCY_INFO: Record<PaymentPlanFrequency, { label: string }> = {
  weekly: { label: 'Weekly' },
  biweekly: { label: 'Bi-weekly' },
  monthly: { label: 'Monthly' },
}

export const PAYMENT_PLAN_STATUS_INFO: Record<PaymentPlanStatus, {
  label: string
  color: string
  bgColor: string
}> = {
  active: { label: 'Active', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  completed: { label: 'Completed', color: 'text-green-600', bgColor: 'bg-green-100' },
  cancelled: { label: 'Cancelled', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  defaulted: { label: 'Defaulted', color: 'text-red-600', bgColor: 'bg-red-100' },
}

export const REMINDER_TYPE_INFO: Record<ReminderType, {
  label: string
  subject: string
}> = {
  upcoming: { label: 'Upcoming', subject: 'Reminder: Invoice due in 3 days' },
  due_today: { label: 'Due Today', subject: 'Payment due today' },
  past_due_7: { label: 'Past Due (7 days)', subject: 'Past Due: Invoice' },
  past_due_30: { label: 'Past Due (30 days)', subject: 'Seriously Past Due: Invoice' },
  final_notice: { label: 'Final Notice', subject: 'FINAL NOTICE: Invoice' },
}

// API Request types

export interface CreatePaymentIntentRequest {
  invoice_id: string
  amount: number
  save_payment_method?: boolean
}

export interface CreatePaymentIntentResponse {
  client_secret: string
  payment_intent_id: string
}

export interface RecordManualPaymentRequest {
  invoice_id: string
  payment_method: PaymentMethod
  amount: number
  payment_date?: string
  check_number?: string
  bank_name?: string
  notes?: string
}

export interface TrustDepositRequest {
  case_id: string
  amount: number
  description?: string
  payment_method?: PaymentMethod
  check_number?: string
}

export interface TrustWithdrawalRequest {
  case_id: string
  amount: number
  description: string
  invoice_id?: string
}

export interface EarnRetainerRequest {
  invoice_id: string
  amount?: number // If not provided, earn maximum available
}

// Helper functions

export function formatCardBrand(brand: string): string {
  const brands: Record<string, string> = {
    visa: 'Visa',
    mastercard: 'Mastercard',
    amex: 'American Express',
    discover: 'Discover',
    diners: 'Diners Club',
    jcb: 'JCB',
    unionpay: 'UnionPay'
  }
  return brands[brand.toLowerCase()] || brand
}

export function formatCardExpiry(month: number, year: number): string {
  return `${month.toString().padStart(2, '0')}/${year.toString().slice(-2)}`
}

export function calculateStripeFee(amount: number): number {
  // Stripe fee: 2.9% + $0.30
  return (amount * 0.029) + 0.30
}

export function calculateNetAmount(amount: number, fee: number): number {
  return amount - fee
}

export function isPaymentSuccessful(status: PaymentStatus): boolean {
  return status === 'succeeded'
}

export function canRefundPayment(payment: Payment): boolean {
  return payment.status === 'succeeded' && payment.refund_amount < payment.amount
}

export function getRemainingRefundAmount(payment: Payment): number {
  return payment.amount - payment.refund_amount
}
