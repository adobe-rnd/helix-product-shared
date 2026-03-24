
export type SchemaOrgAvailability = 'BackOrder' | 'Discontinued' | 'InStock' | 'InStoreOnly' | 'LimitedAvailability' | 'MadeToOrder' | 'OnlineOnly' | 'OutOfStock' | 'PreOrder' | 'PreSale' | 'Reserved' | 'SoldOut';

export type SchemaOrgItemCondition = 'DamagedCondition' | 'NewCondition' | 'RefurbishedCondition' | 'UsedCondition';

export interface SchemaOrgAggregateRating {
  ratingValue: number;
  reviewCount: number;
  bestRating?: number;
  worstRating?: number;
}

export interface ProductBusPrice {
  final: string;
  currency: string;
  regular?: string;
}

export interface ShippingDimensionValue {
  value: number;
  unit?: string;
}

export interface ShippingDimensions {
  weight?: ShippingDimensionValue;
  height?: ShippingDimensionValue;
  width?: ShippingDimensionValue;
  length?: ShippingDimensionValue;
}

export interface ProductBusVariant {
  sku: string;
  name: string;
  price?: ProductBusPrice;
  url: string;
  images: ProductBusImage[];
  availability: SchemaOrgAvailability;
  gtin?: string;
  description?: string;
  itemCondition?: SchemaOrgItemCondition;
  custom?: Record<string, unknown>;
  shippingDimensions?: ShippingDimensions;

  /**
   * Additional schema.org properties shallow-merged into this variant's Offer
   * in the auto-generated JSON-LD. Ignored when the product-level jsonld
   * override is used. Max 16,000 characters when serialized.
   */
  jsonldExtensions?: Record<string, unknown>;
}

export interface ProductBusImage {
  url: string;
  label?: string;
  filename?: string;
  roles?: string[];
}

export interface ProductBusOptionValue {
  id?: string;
  value: string;
}

export interface ProductBusOption {
  id?: string;
  label: string;
  position?: number;
  values: ProductBusOptionValue[];
}

export interface MerchantFeedShipping {
  country: string;
  region: string;
  service: string;
  price: string;
  min_handling_time: string;
  max_handling_time: string;
  min_transit_time: string;
  max_transit_time: string;
}

/**
 * Helix product-bus entry
 */
export interface ProductBusEntry {
  /**
   * Product data used to generate markup/json-ld
   */
  sku: string;
  path: string;
  urlKey: string;
  name: string; // used for product name in json-ld
  metaTitle?: string; // used for title in markup meta tag
  description?: string;
  metaDescription?: string;
  metadata?: Record<string, string>;
  url?: string;
  brand?: string;
  itemCondition?: SchemaOrgItemCondition;
  aggregateRating?: SchemaOrgAggregateRating;
  availability?: SchemaOrgAvailability;
  images?: ProductBusImage[];
  price?: ProductBusPrice;
  variants?: ProductBusVariant[];
  type?: string;
  gtin?: string;
  options?: ProductBusOption[];
  specifications?: string;

  /**
   * Override "escape hatch" for json-ld
   */
  jsonld?: string;

  /**
   * Additional schema.org properties shallow-merged into auto-generated JSON-LD.
   * Intended for additive fields (e.g. potentialAction, aggregateRating, review)
   * but can overwrite any pipeline-generated key.
   * For simple products (no variants), also spread into the single Offer.
   * Ignored when jsonld override is used. Max 32,000 characters when serialized.
   */
  jsonldExtensions?: Record<string, unknown>;

  /**
   * Additional data that can be retrieved via .json API
   */
  custom?: Record<string, unknown>;

  // below are properties that are used to generate indices, not belonging to JSON-LD

  /**
   * Shipping options, as string, object, or array of objects.
   * If an array, each object contains shipping information for one option.
   *
   * @example "US:CA:Overnight:16.00 USD:1:1:2:3"
   * @example { country: 'US', region: 'CA', service: 'Overnight', price: '16.00 USD', min_handling_time: '1', max_handling_time: '2', min_transit_time: '3', max_transit_time: '4' }
   * @example [
   *   { country: 'US', region: 'CA', service: 'Overnight', price: '16.00 USD', min_handling_time: '1', max_handling_time: '2', min_transit_time: '3', max_transit_time: '4' },
   *   { country: 'US', region: 'CA', service: '2-Day', price: '10.00 USD', min_handling_time: '1', max_handling_time: '2', min_transit_time: '3', max_transit_time: '4' }
   * ]
   */
  shipping?: string | MerchantFeedShipping | MerchantFeedShipping[];

  /** Physical dimensions used for shipping rate calculation. */
  shippingDimensions?: ShippingDimensions;
}

// ─── Order types ─────────────────────────────────────────────────────────────

export interface OrderAddress {
  name: string;
  email: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  company?: string;
  phone?: string;
  isDefault?: boolean;
}

export interface OrderCustomer {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

export interface OrderItem {
  sku: string;
  path: string;
  quantity: number;
  price: ProductBusPrice;
  name?: string;
  note?: string;
  shippingDimensions?: ShippingDimensions;
  custom?: Record<string, unknown>;
}

export interface Order {
  customer: OrderCustomer;
  shipping: OrderAddress;
  /** Optional billing address for payment AVS verification. Falls back to shipping if omitted. */
  billing?: OrderAddress;
  items: OrderItem[];
  locale?: string;
  /** ISO 3166-1 alpha-2 country code. Falls back to shipping.country if absent. */
  country?: string;
  /** Shipping method selected by the customer from the estimate rates. Required for order preview. */
  shippingMethod?: { id: string };
}

// ─── Estimate types ───────────────────────────────────────────────────────────

export interface TaxRate {
  country: string;
  state: string;
  /** Tax rate as a percentage, e.g. 12.0 for 12% */
  rate: number;
  id?: string;
}

export interface ShippingRate {
  /** Unique identifier from the shipping configuration sheet */
  id: string;
  /** Customer-facing label, e.g. "Standard Shipping: 8-10 Business Days" */
  label: string;
  /** Shipping method type, e.g. "standard" */
  type: string;
  /** Shipping cost as a decimal value */
  rate: number;
}

export interface OrderPreview {
  /** Order subtotal as a decimal string, e.g. "99.95" */
  subtotal: string;
  /** Calculated tax amount as a decimal string */
  taxAmount: string;
  /** Tax rate percentage used for the calculation, e.g. 12.0 for 12% */
  taxRate: number;
  /** The shipping method selected by the customer */
  shippingMethod: ShippingRate;
  /** Applied price/discount rules — format not yet defined */
  discounts: unknown[];
  /** Total (subtotal + tax + shipping) as a decimal string */
  total: string;
  /** Short-lived signed JWT encapsulating estimate results for order submission */
  estimateToken: string;
}
