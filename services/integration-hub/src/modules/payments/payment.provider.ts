export interface CheckoutRequest {
  orderId: string;
  requestId: string;
  amount: number;
  email: string;
  expiresAt: string;
  /** The store's own Mercado Pago token (OAuth). Without it, the platform account is used. */
  sellerAccessToken?: string;
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
  findPayments(orderId: string, sellerAccessToken?: string): Promise<ConfirmedPayment[]>;
}

export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');
