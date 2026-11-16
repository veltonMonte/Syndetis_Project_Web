export interface CheckoutRequest {
  orderId: string;
  requestId: string;
  amount: number;
  email: string;
  expiresAt: string;
}

export interface CheckoutResponse { preferenceId: string; checkoutUrl: string }

export interface ConfirmedPayment {
  paymentId: string;
  orderId: string;
  status: string;
  amount: number;
  currency: string;
  liveMode: boolean;
}

export interface PaymentProvider {
  createCheckout(request: CheckoutRequest): Promise<CheckoutResponse>;
  getPayment(id: string): Promise<ConfirmedPayment>;
  findPayments(orderId: string): Promise<ConfirmedPayment[]>;
}

export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');
