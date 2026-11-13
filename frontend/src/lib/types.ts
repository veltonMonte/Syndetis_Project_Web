export type Role = 'CUSTOMER' | 'SELLER' | 'ADMIN'
export interface Tokens { accessToken: string; refreshToken: string; expiresIn: number }
export interface Session { accessToken: string; userId: string; email: string; role: Role }
export interface Page<T> { content: T[]; page: number; totalPages: number; totalElements: number }
export interface Store { id: string; name: string; slug: string; status: 'ACTIVE' | 'INACTIVE'; shippingFee: number; deliveryInstructions: string }
export interface Layout {
  schemaVersion: number
  templateId?: string
  theme: { brandName?: string; primaryColor: string; backgroundColor: string; textColor?: string; secondaryColor?: string; accentColor?: string; typeScale?: string; radius?: string; spacing?: string; headingFontFamily?: string; bodyFontFamily?: string; logoUrl?: string }
  sections: { type: string; id?: string; editorType?: string; title?: string; productId?: string; productIds?: string[]; imageFit?: 'cover' | 'contain'; imagePresentation?: 'photo' | 'cutout'; facts?: { label: string; value: string }[]; subtitle?: string; description?: string; body?: string; buttonText?: string; buttonUrl?: string; imageUrl?: string; imageAlt?: string; text?: string; copyright?: string }[]
}
export interface PublicStore extends Store { layout: Layout }
export interface Category { id: string; name: string; slug: string; position: number }
export interface Product { id: string; name: string; description: string | null; price: number; sku: string; imageUrl: string | null; categoryId?: string | null; active?: boolean; available?: number }
export interface Inventory { productId: string; quantity: number; reserved: number; available: number }
export interface Address { id: string; zipCode: string; street: string; number: string; complement?: string; city: string; state: string }
export type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELED'
export interface Order {
  id: string; storeId: string; status: OrderStatus; subtotal: number; shipping: number; total: number
  expiresAt: string; createdAt: string; deliveryAddress: string | null; deliveryInstructions: string; paymentReviewRequired: boolean
  items: { productId: string; productName: string; quantity: number; unitPrice: number; lineTotal: number }[]
  /** XXXX-XXXX, present once the payment is confirmed. */
  purchaseCode?: string | null
  /** Storefront of the order, on single-order reads (the payment return page goes back into it). */
  storeSlug?: string | null
}
export interface CartLine { product: Product; quantity: number }
/** What a purchase code reveals: store, items and pipeline status, never the buyer's personal data. */
export interface PublicOrderStatus {
  purchaseCode: string; storeName: string; storeSlug: string; status: OrderStatus
  createdAt: string; updatedAt: string; items: { productName: string; quantity: number }[]
}
