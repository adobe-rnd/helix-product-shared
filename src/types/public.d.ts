
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

/**
 * Price carried on a bundle item entry. Narrower than {@link ProductBusPrice}:
 * bundle items declare the final tax-relevant amount and optionally a
 * `regular` price for display (e.g., showing a discount). Currency comes from
 * the parent line item at order time.
 */
export interface BundleItemPrice {
  final: string;
  regular?: string;
}

/**
 * Option pair on a configurable bundle item variant. The server resolves which
 * variant to ship by matching every entry here against the parent line item's
 * `selectedOptions`, comparing `id` to `id`, and this `name` to the parent's
 * `value`. The shape differs from the parent's `selectedOptions` intentionally:
 * `selectedOptions` carries semantic values, bundle item variants carry the
 * Product Bus option-label format.
 */
export interface BundleItemVariantOption {
  id: string;
  name: string;
}

/**
 * One variant of a configurable bundle item. The server picks the variant
 * whose `options` are all satisfied by the parent line item's `selectedOptions`;
 * zero or multiple matches reject the preview.
 */
export interface BundleItemVariant {
  sku: string;
  name?: string;
  price: BundleItemPrice;
  options: BundleItemVariantOption[];
}

/**
 * Simple bundle item — a single SKU regardless of the parent's options.
 */
export interface BundleItemSimple {
  sku: string;
  name: string;
  price: BundleItemPrice;
}

/**
 * Configurable bundle item — the server selects one variant at preview time
 * based on the parent's `selectedOptions`.
 */
export interface BundleItemConfigurable {
  variants: BundleItemVariant[];
}

/**
 * One entry in a bundle product's composition. Either a simple SKU or a
 * configurable variant set. Presence of the parent product's `bundleItems`
 * array (not its contents) marks the parent as a bundle; the field is
 * additive alongside the existing `variants` and `options`. Bundle item
 * prices must sum to the parent product's price — server-enforced at order
 * preview.
 */
export type BundleItem = BundleItemSimple | BundleItemConfigurable;

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
  country?: string;
  locale?: string;
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
   * Bundle composition. When present (regardless of contents), marks this
   * product as a bundle: the cart treats it as a single purchasable SKU, and
   * the Commerce API expands it into component line items at order preview
   * for tax calculation. Bundle item prices must sum to this product's price.
   */
  bundleItems?: BundleItem[];

  /**
   * Override "escape hatch" for json-ld
   */
  jsonld?: string;

  /**
   * Additional schema.org properties shallow-merged into the auto-generated
   * Product JSON-LD object. Intended for additive fields (e.g. potentialAction,
   * aggregateRating, review) but can overwrite any pipeline-generated key.
   * Ignored when jsonld override is used. Max 32,000 characters when serialized.
   */
  jsonldExtensions?: Record<string, unknown>;

  /**
   * Additional data that can be retrieved via .json API
   */
  custom?: Record<string, unknown>;

  /**
   * Tax classification code for this product.
   */
  taxCode?: string;

  /**
   * Free-form map of supplementary tax data
   */
  taxData?: Record<string, unknown>;

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
  imageUrl?: string;
  productUrl?: string;
  shippingDimensions?: ShippingDimensions;
  custom?: Record<string, unknown>;

  /**
   * Semantic option pairs selected by the customer (e.g. `{id: 'color', value: 'Red'}`).
   * Used at order preview to resolve which variant of each configurable bundle
   * item to ship — matched against `bundleItem.variants[].options[].name`.
   */
  selectedOptions?: Array<{ id: string; value: string }>;

  /**
   * For bundle parents: the resolved component line items, nested on the parent.
   * Each entry is a concrete line item (one variant picked per configurable
   * source entry, price set). Components contribute to fulfillment and to the
   * tax projection at preview time; they are **not** included in the order's
   * charged subtotal — the parent line's `price` represents the chargeable
   * value.
   *
   * Distinct from `ProductBusEntry.bundleItems`, which is the template form
   * (can include configurable `variants`).
   */
  bundleItems?: OrderItem[];
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
  /** Optional estimate token from order preview. Used to lock in estimates at order creation time. */
  estimateToken?: string;
  /** Optional gift message to include with the order. Max 250 characters. */
  giftMessage?: string;
  /** Customer-defined key/value pairs for linking the order to external systems. */
  custom?: Record<string, string>;
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

// ─── Journal entry types ────────────────────────────────────────────────────

/** Common envelope shared by all journal entry types */
export interface JournalEntry {
  /** Unique entry identifier */
  id: string;
  /** ISO 8601 timestamp of the event */
  timestamp: string;
  /** Which journal this entry belongs to */
  journal: 'orders' | 'general';
  /** Event type (e.g. 'create', 'updateState', 'subrequest', 'update', 'add', 'remove') */
  event: string;
  /** Owning org */
  org: string;
  /** Owning site */
  site: string;
}

/** Base interface shared by all order journal entries */
export interface BaseOrderJournalEntry extends JournalEntry {
  journal: 'orders';
  /** The order this entry is for */
  orderId: string;
}

/** Emitted when an order is created or a merchant/system updates its state */
export interface OrderStateJournalEntry extends BaseOrderJournalEntry {
  event: 'create' | 'state_updated';
  /** New order state */
  state: string;
  /** Who triggered the event (e.g. "customer", "admin:ops@example.com") */
  actor: string;
  /** Human-readable reason for the state change */
  reason?: string;
}

/** Emitted for payment provider interactions (initiate, callback, cancel) */
export interface PaymentOrderJournalEntry extends BaseOrderJournalEntry {
  event: 'payment_initiated' | 'payment_completed' | 'payment_cancelled';
  /** Payment provider name (e.g. "chase") */
  provider: string;
  /** Payment attempt identifier */
  attemptId?: string;
  /** Idempotency key used for the payment request */
  idempotencyKey?: string;
  /** Payment method (e.g. "Visa", "Mastercard") */
  paymentMethod?: string;
  /** Outgoing request to the provider */
  request?: Record<string, unknown>;
  /** Provider response */
  response?: Record<string, unknown>;
  /** Time the provider call took in milliseconds */
  durationMs?: number;
}

/** Emitted when order custom data is updated via the custom API */
export interface OrderCustomUpdatedJournalEntry extends BaseOrderJournalEntry {
  event: 'custom_updated';
  /** The full custom data after the update */
  custom: Record<string, string>;
  /** Who triggered the event (e.g. "service-token:my-integration") */
  actor?: string;
}

/** Discriminated union of all order journal entry types */
export type OrderJournalEntry = OrderStateJournalEntry | PaymentOrderJournalEntry | OrderCustomUpdatedJournalEntry;

/** General journal entry — emitted for non-order actions */
export interface GeneralJournalEntry extends JournalEntry {
  journal: 'general';
  /** Entity type */
  type: 'product' | 'coupon' | 'config';
  /** Identifier of the entity that was changed */
  entityId: string;
  /** Who triggered the event */
  actor: string;
  /** Changed fields with before/after values */
  changes?: Record<string, unknown>;
  /** Full data payload (used when a changes map is not applicable) */
  data?: Record<string, unknown>;
}

// ─── Price rule types ─────────────────────────────────────────────────────────

export type ProductCondition = string | { path: string; sku?: string };

export interface VariantPriceRule {
  sku: string;
  price: string;
  start?: string;
  end?: string;
  metadata?: Record<string, string>;
}

export interface CatalogPriceRule {
  path: string;
  price: string;
  start?: string;
  end?: string;
  metadata?: Record<string, string>;
  /** Per-SKU overrides. Variants not listed inherit the parent product price. */
  variants?: Record<string, VariantPriceRule>;
}

export interface CatalogPromotion {
  id: string;
  name: string;
  rules: CatalogPriceRule[];
  country?: string;
  locale?: string;
  /** When present, the promotion is conditional and must not be applied during pipeline rendering.
   *  It is evaluated at cart/order estimate time against the current cart. */
  conditions?: CartPriceRuleConditions;
}

export interface CatalogPriceRules {
  promotions: CatalogPromotion[];
}

export interface CartPriceRuleConditions {
  minimumSubtotal?: number;
  requiredProducts?: ProductCondition[];
  excludedProducts?: ProductCondition[];
  requiredCategories?: string[];
  excludedCategories?: string[];
}

export interface CartPriceRuleActions {
  percentOff: number | null;
  fixedOff: number | null;
  freeShipping: boolean;
}

export interface CartPriceRule {
  id: string;
  name: string;
  priority: number;
  conditions: CartPriceRuleConditions;
  actions: CartPriceRuleActions;
  stackable: boolean;
  incompatibleTypes: string[];
}

/** Cart price rules — array of auto-discount rules consumed by applyAutoRules */
export type CartPriceRules = CartPriceRule[];

/**
 * Configuration for order friendly ID generation.
 * The friendly ID is the short human-readable suffix appended to every orderId.
 */
export interface FriendlyIdConfig {
  /**
   * Character set for the friendly ID. Either a named preset or a literal string
   * where every character in the string is allowed.
   *
   * Named presets:
   *   "default" / omitted         – Crockford Base32 (0-9 A-Z minus I/L/O/U), uppercase
   *   "numeric"                   – 0-9
   *   "alphabetic"                – A-Z  (same as "alphabetic_uppercase")
   *   "alphabetic_uppercase"      – A-Z
   *   "alphabetic_lowercase"      – a-z
   *   "alphabetic_anycase"        – A-Za-z
   *   "alphanumeric"              – A-Z0-9  (same as "alphanumeric_uppercase")
   *   "alphanumeric_uppercase"    – A-Z0-9
   *   "alphanumeric_lowercase"    – a-z0-9
   *   "alphanumeric_anycase"      – A-Za-z0-9
   *
   * Literal charset: every character in the string is an allowed character.
   *   Must not contain "/".
   *   Must contain at least 2 distinct characters.
   */
  characters?: string;
  /**
   * Length of the friendly ID. Integer between 4 and 32 inclusive. Default: 8.
   */
  length?: number;
  /**
   * Literal string prepended to every generated friendly ID. Maximum 8 characters.
   * Same character restrictions as `characters` (no /?#&%<> or space).
   * Example: prefix "order" with characters "numeric" and length 10 produces "order1234567890".
   */
  prefix?: string;
}
