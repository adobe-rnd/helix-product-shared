
/** Stock status using schema.org availability vocabulary. */
export type SchemaOrgAvailability = 'BackOrder' | 'Discontinued' | 'InStock' | 'InStoreOnly' | 'LimitedAvailability' | 'MadeToOrder' | 'OnlineOnly' | 'OutOfStock' | 'PreOrder' | 'PreSale' | 'Reserved' | 'SoldOut';

/**
 * Per-value meanings for {@link SchemaOrgAvailability}. Types-only doc carrier
 * (no runtime value) so documentation tooling can read each value's meaning.
 */
export type SchemaOrgAvailabilityValues = {
  /** Product is available for order but currently out of stock. */
  BackOrder: 'BackOrder';
  /** Product is no longer being manufactured or sold. */
  Discontinued: 'Discontinued';
  /** Product is available for immediate purchase. */
  InStock: 'InStock';
  /** Product is only available for purchase in physical stores. */
  InStoreOnly: 'InStoreOnly';
  /** Product has limited stock available. */
  LimitedAvailability: 'LimitedAvailability';
  /** Product is manufactured upon order placement. */
  MadeToOrder: 'MadeToOrder';
  /** Product is only available for online purchase. */
  OnlineOnly: 'OnlineOnly';
  /** Product is temporarily out of stock. */
  OutOfStock: 'OutOfStock';
  /** Product can be ordered before official release. */
  PreOrder: 'PreOrder';
  /** Product is available for pre-sale purchase. */
  PreSale: 'PreSale';
  /** Product is reserved and not available for general purchase. */
  Reserved: 'Reserved';
  /** Product has sold out completely. */
  SoldOut: 'SoldOut';
};

/** Product condition using schema.org item condition vocabulary. */
export type SchemaOrgItemCondition = 'DamagedCondition' | 'NewCondition' | 'RefurbishedCondition' | 'UsedCondition';

/**
 * Per-value meanings for {@link SchemaOrgItemCondition}. Types-only doc carrier
 * (no runtime value) so documentation tooling can read each value's meaning.
 */
export type SchemaOrgItemConditionValues = {
  /** Product has damage or defects. */
  DamagedCondition: 'DamagedCondition';
  /** Product is brand new and unused. */
  NewCondition: 'NewCondition';
  /** Product has been professionally restored to working condition. */
  RefurbishedCondition: 'RefurbishedCondition';
  /** Product has been previously used. */
  UsedCondition: 'UsedCondition';
};

/** Weight unit. Maps to UN/CEFACT codes in JSON-LD output. */
export type WeightUnit = 'kg' | 'g' | 'lb' | 'oz';

/** Dimension unit for height/width/depth. Maps to UN/CEFACT codes in JSON-LD. */
export type DimensionsUnit = 'cm' | 'mm' | 'in';

/** Product weight for JSON-LD structured data. */
export interface ProductBusWeight {
  /** Numeric weight value. */
  value: number;
  /** Weight unit. Maps to UN/CEFACT codes in JSON-LD output. */
  unit: WeightUnit;
}

/** Product review and rating information. */
export interface SchemaOrgAggregateRating {
  /** Average rating, e.g. "4.5". */
  ratingValue: number;
  /** Number of reviews; converts to an integer in JSON-LD. */
  reviewCount: number;
  /** Maximum possible rating, e.g. "5". */
  bestRating?: number;
  /** Minimum possible rating, e.g. "1". */
  worstRating?: number;
}

/** Price information for a product or variant. */
export interface ProductBusPrice {
  /** Final price the customer pays, as a decimal string (e.g. "19.99"). */
  final: string;
  /** ISO 4217 currency code, e.g. "USD". */
  currency: string;
  /** Original price before any discount, as a decimal string. */
  regular?: string;
}

/** Product shipping dimensions emitted as Offer.shippingDetails in JSON-LD. */
export interface ShippingDimensions {
  /** Package weight. */
  weight?: ProductBusWeight;
  /** Package height. */
  height?: number;
  /** Package width. */
  width?: number;
  /** Package depth. */
  depth?: number;
  /** Unit for height, width, and depth. Maps to UN/CEFACT codes in JSON-LD. */
  dimensionsUnit?: DimensionsUnit;
}

/** A variant of a configurable product. */
export interface ProductBusVariant {
  /** Unique variant identifier. */
  sku: string;
  /** Display name for the variant. */
  name: string;
  /** Variant-specific pricing; falls back to the parent product price when omitted. */
  price?: ProductBusPrice;
  /** Canonical variant page URL. */
  url: string;
  /** Media gallery for the variant. */
  images: ProductBusImage[];
  /** Stock status using schema.org availability vocabulary. */
  availability: SchemaOrgAvailability;
  /** Barcode or Global Trade Item Number for the variant. */
  gtin?: string;
  /** Variant-specific description. HTML content is supported. */
  description?: string;
  /** Variant condition using schema.org item condition vocabulary. */
  itemCondition?: SchemaOrgItemCondition;
  /** Variant weight; inherits the parent product value when omitted. */
  weight?: ProductBusWeight;
  /** Custom data bag for variant-specific data. */
  custom?: Record<string, unknown>;
  /** Variant shipping dimensions; inherits the parent product value when omitted. */
  shippingDimensions?: ShippingDimensions;
  /** Selected option values that identify this variant. */
  options?: ProductBusOption[];

  /**
   * Additional schema.org properties shallow-merged into this variant's Offer
   * in the generated JSON-LD. Ignored when the product-level `jsonld` override
   * is used.
   */
  jsonldExtensions?: Record<string, unknown>;
}

/** Media asset (image or video) associated with a product. */
export interface ProductBusImage {
  /** Media URL (external or relative path after processing). */
  url: string;
  /** Label or alt text. */
  label?: string;
  /** Human-readable filename segment for the rendered media URL. */
  filename?: string;
  /** Roles such as "thumbnail", "small", or "large". */
  roles?: string[];
  /** Associated video URL. */
  video?: string;
}

/** A selectable value for a configurable option. */
export interface ProductBusOptionValue {
  /** Option value identifier. */
  id?: string;
  /** Value name. */
  value: string;
}

/** Configurable product option, such as color or size. */
export interface ProductBusOption {
  /** Option identifier. */
  id?: string;
  /** Display label. */
  label: string;
  /** Sort order. */
  position?: number;
  /** Available option values. */
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
 *
 * `taxCode` and `taxData` are optional per-variant overrides of the bundle
 * parent's tax classification. When present, the Commerce API uses them for
 * the variant's line in the tax-provider projection; when absent, the
 * projection falls back to the bundle parent's `taxCode` / `taxData`.
 */
export interface BundleItemVariant {
  sku: string;
  name?: string;
  price: BundleItemPrice;
  options: BundleItemVariantOption[];
  taxCode?: string;
  taxData?: Record<string, unknown>;
}

/**
 * Simple bundle item — a single SKU regardless of the parent's options.
 *
 * `taxCode` and `taxData` are optional per-component overrides of the bundle
 * parent's tax classification. When present, the Commerce API uses them for
 * the component's line in the tax-provider projection; when absent, the
 * projection falls back to the bundle parent's `taxCode` / `taxData`.
 */
export interface BundleItemSimple {
  sku: string;
  name: string;
  price: BundleItemPrice;
  taxCode?: string;
  taxData?: Record<string, unknown>;
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

/** Common feed settings shared across product distribution channels. */
export interface ProductBusFeedCommon {
  /** Target countries for product feeds. */
  geoTargetCountries?: string[];
  /** Store country for feed generation. */
  geoStoreCountry?: string;
}

/** Product feed eligibility for the OpenAI / agentic commerce feed. */
export interface ProductBusFeedOpenAI {
  /** Whether the product is eligible for search feeds. */
  isEligibleForSearch: boolean;
  /** Whether the product supports checkout via feeds. */
  isEligibleForCheckout: boolean;
}

/** Feed configuration for product distribution. */
export interface ProductBusFeeds {
  /** Common feed settings. */
  common?: ProductBusFeedCommon;
  /** OpenAI / agentic commerce feed eligibility. */
  oai?: ProductBusFeedOpenAI;
}

/**
 * Helix product-bus entry
 */
export interface ProductBusEntry {
  /** Unique product identifier. */
  sku: string;
  /** Product URL path used for path-based storage. */
  path: string;
  /** Human-readable product identifier for URL generation. */
  urlKey: string;
  /** Display name for the product. */
  name: string;
  /** SEO title tag content. */
  metaTitle?: string;
  /** Full product description. HTML content is supported. */
  description?: string;
  /** SEO meta description. */
  metaDescription?: string;
  /** Country code for country-scoped product data. */
  country?: string;
  /** Locale code for locale-scoped product data. */
  locale?: string;
  /** Generic metadata map rendered as meta tags in HTML output. */
  metadata?: Record<string, string>;
  /** Canonical product page URL; used directly in sitemap output when present. */
  url?: string;
  /** Brand or manufacturer name. */
  brand?: string;
  /** Product condition using schema.org item condition vocabulary. */
  itemCondition?: SchemaOrgItemCondition;
  /** Product review and rating information. */
  aggregateRating?: SchemaOrgAggregateRating;
  /** Stock status using schema.org availability vocabulary. */
  availability?: SchemaOrgAvailability;
  /** Date when the product becomes available. */
  availabilityDate?: string;
  /** Media gallery for product images and videos. */
  images?: ProductBusImage[];
  /** Price information for the product. */
  price?: ProductBusPrice;
  /** Product variants for configurable products. */
  variants?: ProductBusVariant[];
  /** Product type classification. */
  type?: string;
  /** Barcode or Global Trade Item Number. */
  gtin?: string;
  /** Configurable product options, such as color or size. */
  options?: ProductBusOption[];
  /** Product specifications content. */
  specifications?: string;

  /**
   * Bundle composition. When present, marks this product as a bundle: it is
   * treated as a single purchasable SKU and expanded into component line items
   * at order time for tax calculation. Bundle item prices must sum to this
   * product's price.
   */
  bundleItems?: BundleItem[];

  /** schema.org JSON-LD override; replaces the generated JSON-LD entirely. */
  jsonld?: string;

  /**
   * Additional schema.org properties shallow-merged into the generated Product
   * JSON-LD. Intended for additive fields but can overwrite generated keys.
   * Ignored when the `jsonld` override is used.
   */
  jsonldExtensions?: Record<string, unknown>;

  /** Custom data bag preserved in responses; not validated or indexed. */
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

  /** Feed configuration for product distribution. */
  feeds?: ProductBusFeeds;

  /** Product weight for display and JSON-LD structured data. */
  weight?: ProductBusWeight;

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
  isValidated?: boolean;
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
  /** IANA timezone captured from the shopper's browser at checkout. */
  customerTimezone?: string;
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
