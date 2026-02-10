'use client'

import { useState, useEffect } from 'react'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js'
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js'
import {
  X, CreditCard, DollarSign, AlertCircle, CheckCircle,
  Lock, Loader2
} from 'lucide-react'
import { formatCurrency } from '@/types/billing'

// Initialize Stripe (client-side only)
const stripePromise = typeof window !== 'undefined'
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')
  : null

interface PaymentModalProps {
  invoice: {
    id: string
    invoice_number: string
    total_amount: number
    balance_due: number
  }
  onClose: () => void
  onSuccess: (paymentIntentId: string) => void
}

export default function PaymentModal({ invoice, onClose, onSuccess }: PaymentModalProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentAmount, setPaymentAmount] = useState(invoice.balance_due)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    createPaymentIntent()
  }, [])

  async function createPaymentIntent() {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_id: invoice.id,
          amount: paymentAmount
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment')
      }

      setClientSecret(data.client_secret)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize payment')
    } finally {
      setLoading(false)
    }
  }

  // Update payment intent when amount changes
  async function handleAmountChange(newAmount: number) {
    if (newAmount <= 0 || newAmount > invoice.balance_due) return

    setPaymentAmount(newAmount)

    // Recreate payment intent with new amount
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_id: invoice.id,
          amount: newAmount
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update payment')
      }

      setClientSecret(data.client_secret)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update payment')
    } finally {
      setLoading(false)
    }
  }

  const options: StripeElementsOptions = {
    clientSecret: clientSecret || undefined,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#2563eb',
        colorBackground: '#ffffff',
        colorText: '#1f2937',
        colorDanger: '#dc2626',
        fontFamily: 'system-ui, sans-serif',
        borderRadius: '8px'
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            <h3 className="font-medium text-gray-900">Pay Invoice</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Invoice info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Invoice</p>
                <p className="font-medium text-gray-900">
                  #{invoice.invoice_number}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Balance Due</p>
                <p className="text-xl font-semibold text-gray-900">
                  {formatCurrency(invoice.balance_due)}
                </p>
              </div>
            </div>
          </div>

          {/* Amount selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Amount
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="number"
                min="0.01"
                step="0.01"
                max={invoice.balance_due}
                value={paymentAmount}
                onChange={(e) => handleAmountChange(parseFloat(e.target.value) || 0)}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            {paymentAmount < invoice.balance_due && (
              <p className="mt-1 text-sm text-gray-500">
                Remaining after payment: {formatCurrency(invoice.balance_due - paymentAmount)}
              </p>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
              <p className="mt-2 text-sm text-gray-500">Initializing payment...</p>
            </div>
          ) : clientSecret && stripePromise ? (
            <Elements stripe={stripePromise} options={options}>
              <PaymentForm
                invoice={invoice}
                amount={paymentAmount}
                onSuccess={onSuccess}
                onError={setError}
              />
            </Elements>
          ) : null}

          {/* Security note */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Lock className="w-3 h-3" />
            <span>Secured by Stripe. Your payment info is encrypted.</span>
          </div>
        </div>
      </div>
    </div>
  )
}

interface PaymentFormProps {
  invoice: {
    id: string
    invoice_number: string
  }
  amount: number
  onSuccess: (paymentIntentId: string) => void
  onError: (error: string) => void
}

function PaymentForm({ invoice, amount, onSuccess, onError }: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [succeeded, setSucceeded] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setProcessing(true)
    onError('')

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/invoices/${invoice.id}/payment-success`
        },
        redirect: 'if_required'
      })

      if (error) {
        onError(error.message || 'Payment failed')
        setProcessing(false)
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        setSucceeded(true)
        setTimeout(() => {
          onSuccess(paymentIntent.id)
        }, 1500)
      }
    } catch (err) {
      onError('An unexpected error occurred')
      setProcessing(false)
    }
  }

  if (succeeded) {
    return (
      <div className="py-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h4 className="mt-4 text-lg font-semibold text-gray-900">
          Payment Successful!
        </h4>
        <p className="mt-1 text-sm text-gray-600">
          Thank you for your payment of {formatCurrency(amount)}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement
        options={{
          layout: 'tabs'
        }}
      />

      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full px-4 py-3 text-white bg-blue-600 rounded-lg
                 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                 flex items-center justify-center gap-2 font-medium"
      >
        {processing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Lock className="w-4 h-4" />
            Pay {formatCurrency(amount)}
          </>
        )}
      </button>
    </form>
  )
}
