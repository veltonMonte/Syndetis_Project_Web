export type Role = 'CUSTOMER' | 'SELLER' | 'ADMIN'
export interface Tokens { accessToken: string; refreshToken: string; expiresIn: number }
export interface Session { accessToken: string; userId: string; email: string; role: Role }
export interface Page<T> { content: T[]; page: number; totalPages: number; totalElements: number }
export interface Store { id: string; name: string; slug: string; status: 'ACTIVE' | 'INACTIVE'; shippingFee: number; deliveryInstructions: string }
export interface Layout { schemaVersion: number; theme: { primaryColor: string; backgroundColor: string }; sections: { type: string; title?: string }[] }
export interface PublicStore extends Store { layout: Layout }
export interface Product { id: string; name: string; description: string | null; price: number; sku: string; imageUrl: string | null }
export interface Inventory { productId: string; quantity: number; reserved: number; available: number }
export interface Address { id: string; zipCode: string; street: string; number: string; complement?: string; city: string; state: string }
export type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELED'
export interface Order {
  id: string; storeId: string; status: OrderStatus; subtotal: number; shipping: number; total: number
  expiresAt: string; createdAt: string; deliveryAddress: string | null; deliveryInstructions: string; paymentReviewRequired: boolean
  items: { productId: string; productName: string; quantity: number; unitPrice: number; lineTotal: number }[]
}
export interface CartLine { product: Product; quantity: number }
