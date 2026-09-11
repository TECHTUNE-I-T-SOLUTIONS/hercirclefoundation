/**
 * Paystack API integration utilities
 * Handles payment initialization, verification, and webhook processing
 */

export interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
    message: string | null;
    gateway_response: string;
    paid_at: string | null;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    fees: number;
    customer: {
      id: number;
      customer_code: string;
      first_name: string;
      last_name: string;
      email: string;
      customer_id: number;
    };
    plan: any;
    integration: number;
    metadata: any;
    transaction: any;
  };
}

export interface PaymentInitializeData {
  email: string;
  amount: number; // in kobo (smallest currency unit)
  reference: string;
  metadata?: {
    custom_fields?: Array<{
      display_name: string;
      variable_name: string;
      value: string;
    }>;
    [key: string]: any;
  };
  callback_url?: string;
}

/**
 * Initialize a Paystack transaction
 */
export async function initializePayment(
  data: PaymentInitializeData
): Promise<PaystackInitializeResponse> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  
  if (!secretKey) {
    throw new Error('PAYSTACK_SECRET_KEY is not configured');
  }

  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: data.email,
      amount: data.amount, // Amount in kobo
      reference: data.reference,
      metadata: data.metadata,
      callback_url: data.callback_url || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/donate/callback`,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Failed to initialize payment');
  }

  return result;
}

/**
 * Verify a Paystack transaction
 */
export async function verifyTransaction(reference: string): Promise<PaystackVerifyResponse> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  
  if (!secretKey) {
    throw new Error('PAYSTACK_SECRET_KEY is not configured');
  }

  const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Failed to verify transaction');
  }

  return result;
}

/**
 * Re-verify a transaction (useful for admin operations)
 */
export async function reverifyTransaction(reference: string): Promise<PaystackVerifyResponse> {
  return verifyTransaction(reference);
}

/**
 * Generate a unique payment reference
 */
export function generatePaymentReference(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `HER-${timestamp}-${random}`.toUpperCase();
}

/**
 * Validate Paystack webhook signature
 */
export function validateWebhookSignature(
  payload: string,
  signature: string
): boolean {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  
  if (!secretKey) {
    console.error('PAYSTACK_SECRET_KEY is not configured');
    return false;
  }

  const crypto = require('crypto');
  const hash = crypto
    .createHmac('sha512', secretKey)
    .update(payload)
    .digest('hex');

  return hash === signature;
}

/**
 * Process Paystack webhook event
 */
export interface WebhookEvent {
  event: string;
  data: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
    message: string | null;
    gateway_response: string;
    paid_at: string | null;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    fees: number;
    customer: {
      id: number;
      customer_code: string;
      first_name: string;
      last_name: string;
      email: string;
      customer_id: number;
    };
    plan: any;
    integration: number;
    metadata: any;
    transaction: any;
  };
}

export function isSuccessfulPaymentEvent(event: WebhookEvent): boolean {
  return event.event === 'charge.success' && event.data.status === 'success';
}

export function isFailedPaymentEvent(event: WebhookEvent): boolean {
  return event.event === 'charge.failed' || event.data.status === 'failed';
}
