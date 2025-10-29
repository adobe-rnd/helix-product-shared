import { MerchantFeedShipping } from "./public";

/**
   * @link https://support.google.com/merchants/answer/7052112?hl=en
   */
export interface MerchantFeedEntry {
  /** 
   * sku
   */
  id: string;
  /**
   * name (include variant attributes like color/size)
   */
  title: string;

  /**
   * formatting like line breaks, lists, or italics are allowed
   */
  description: string;

  /**
   * PDP link, using prod host & protocol prefix
   */
  link: string;

  /**
   * The URL of your product’s main image
   */
  image_link: string;

  /**
   * Additional images
   * can include up to 10 additional images
   */
  additional_image_link?: string[];

  /**
   * Virtual model link
   * 360-degree view of the product
   */
  virtual_model_link?: string;

  /**
   * Mobile link
   * URL for the mobile version of your product’s landing page
   */
  mobile_link?: string;

  // === Price and Availability ===

  /**
   * Availability
   * in_stock, out_of_stock, preorder, backorder
   */
  availability: "in_stock" | "out_of_stock" | "preorder" | "backorder";

  /**
   * The date a preordered product becomes available for delivery
   * Required for preorder/backorder product availability
   * ISO 8601 format
   * 
   * @example "2016-02-24T11:07+0100"
   */
  availability_date?: string;

  /**
   * The costs associated with the sale of a particular product as defined by the accounting convention you set up
   * ISO 4217 format
   * 
   * @example "23.00 USD"
   */
  cost_of_goods_sold?: string;

  /**
   * The date a product expires
   * ISO 8601 format
   * 
   * @example "2016-02-24T11:07+0100"
   */
  expiration_date?: string;

  /**
   * The price of the product
   * ISO 4217 format
   * 
   * @example "10.00 USD"
   */
  price: string;

  /**
   * The sale price of the product
   * ISO 4217 format
   * 
   * @example "10.00 USD"
   */
  sale_price?: string;

  /**
   * The date range during which the sale price applies
   * ISO 8601 format
   * Separate start date and end date with /
   * 
   * @example "2016-02-24T11:07+0100/2016-02-24T11:07+0100"
   */
  sale_price_effective_date?: string;

  /**
   * The measure and dimension of your product as it is sold
   * Numerical value + unit of measure
   * Accepted units:
   * - Weight: oz, lb, mg, g, kg
   * - Volume US imperial: floz, pt, qt, gal
   * - Volume metric: ml, cl, l, cbm
   * - Length: in, ft, yd, cm, m
   * - Area: sqft, sqm
   * - Per unit: ct
   * 
   * @example "1.5kg"
   */
  unit_pricing_measure?: string;

  /**
   * The product’s base measure for pricing (for example, 100ml means the price is calculated based on a 100ml units)
   * Integer + unit
   * Supported integers: 1, 10, 100, 2, 4, 8
   * Supported units: see unit_pricing_measure
   * 
   * @example "100g"
   */
  unit_pricing_base_measure?: string;

  /**
   * Details of an installment payment plan
   * @example "6:30 EUR:199 EUR"
   */
  installment?: string;

  /**
   * Details a monthly or annual payment plan that bundles a communications service contract with a wireless product
   * @example "month:12:35.00USD"
   */
  subscription_cost?: string;

  /**
   * The loyalty program [loyalty_program] attribute allows setting up of member prices, loyalty points, and loyalty shipping.
   * @example "my_loyalty_program:silver:10 USD::10:"
   */
  loyalty_program?: string;

  /**
   * The lowest price to which a product's price can be reduced.
   * Google uses this information for features such as sale price suggestions, automated discounts or dynamic promotions.
   * ISO 4217 format
   * 
   * @example "10.00 USD"
   */
  auto_pricing_min_price?: string;

  /**
   * Your product’s price.
   * ISO 4217 format
   * 
   * @example "10.00 USD"
   */
  maximum_retail_price?: string;

  // === Product Category ===

  /**
   * The Google product category of your product
   * Either the string or category ID (recommended).
   * 
   * @example "Apparel & Accessories > Clothing > Outerwear > Coats & Jackets"
   * @example 371
   */
  google_product_category?: string | number;

  /**
   * Product category that you define for your product
   * 
   * @example "Home > Women > Dresses > Maxi Dresses"
   */
  product_type?: string;

  // === Product Identifiers ===

  /**
   * The brand of your product
   * Max 70 characters
   * 
   * @example "Google"
   */
  brand: string;

  /**
   * Global Trade Item Number
   * Max 50 numeric characters
   * Exclude dashes and spaces
   * Strongly recommended to include
   * 
   * Supported:
   * - UPC (North America / GTIN-12)
   * - EAN (Europe / GTIN-13)
   * - JAN (Japan / GTIN-8)
   * - ISBN (For books)
   * - ITF14 (For multipacks / GTIN-14)
   * 
   * @example "3234567890126"
   */
  gtin?: string;

  /**
   * Manufacturer Part Number
   * Max 70 alphanumeric characters
   * Must be included if product does not have a manufacturer assigned GTIN
   * 
   * @example "GO12345OOGLE"
   */
  mpn?: string;

  /**
   * Use to indicate whether or not the unique product identifiers (UPIs) GTIN, MPN, and brand are available for your product.
   * defaults to "yes" if not provided
   */
  identifier_exists?: "yes" | "no";

  // === Detailed product description ===

  /**
   * The condition of your product at time of sale
   * Required for used/refurbished products
   */
  condition?: "new" | "refurbished" | "used";

  /**
   * Indicate a product includes sexually suggestive content
   */
  adult: "yes" | "no";

  /**
   * The number of identical products sold within a merchant-defined multipack
   * Required for multipack products in Australia, Brazil, Czechia, France, Germany, Italy, Japan, Netherlands, Spain, Switzerland, the UK and the US
   * @example 10
   */
  multipack?: number;

  /**
   * Indicates a product is a merchant-defined custom group of different products featuring one main product
   * Required for bundles in Australia, Brazil, Czechia, France, Germany, Italy, Japan, Netherlands, Spain, Switzerland, the UK and the US
   */
  is_bundle?: "yes" | "no";

  /**
   * Certifications, such as energy efficiency ratings, associated with your product
   * Available for the EU and EFTA countries and the UK
   * 
   * Required for products that require certain certification information to be shown in your Shopping ads 
   * or free listings, for example due to local energy efficiency labeling regulations
   * 
   * @example "EC:EPREL:123456"
   */
  certification?: string;

  /**
   * Your product’s energy efficiency class
   * Supported values: A+++, A++, A+, A, B, C, D, E, F, G
   * Only available for products that target Switzerland, Norway, or the United Kingdom.
   */
  energy_efficiency_class?: string;

  /**
   * The minimum energy efficiency class in this products's category.
   * Only available for products that target Switzerland, Norway, or the United Kingdom.
   */
  min_energy_efficiency_class?: string;

  /**
   * The maximum energy efficiency class in this product's category.
   * Only available for products that target Switzerland, Norway, or the United Kingdom.
   */
  max_energy_efficiency_class?: string;

  /**
   * The demographic for which your product is intended
   * Required for all apparel products that are targeted to people in Brazil, France, Germany, Japan, the UK, and the US 
   * as well as all products with assigned age groups
   * 
   * Supported values:
   * - newborn
   * - infant
   * - toddler
   * - kids
   * - adult
   */
  age_group?: "newborn" | "infant" | "toddler" | "kids" | "adult";

  /**
   * Your product’s color(s)
   * Required for all apparel products that are targeted to Brazil, France, Germany, Japan, the UK, and the US 
   * as well as all products available in different colors
   * 
   * Max 100 characters
   * Max 40 characters per color
   * Separate colors with /
   *  
   * @example "Black"
   * @example "Red/Blue/Green"
   */
  color?: string;

  /**
   * The gender for which your product is intended
   * Required for all apparel items that are targeted to people in Brazil, France, Germany, Japan, the UK, and the US 
   * as well as all gender-specific products
   * 
   * @example "unisex"
   */
  gender?: "male" | "female" | "unisex";

  /**
   * Your product’s fabric or material
   * Required if relevant for distinguishing different products in a set of variants
   * 
   * Max 200 characters
   * Separate materials with /
   * 
   * @example "leather"
   */
  material?: string;

  /**
   * Your product’s pattern or graphic print
   * Required if relevant for distinguishing different products in a set of variants
   * 
   * Max 100 characters
   * 
   * @example "striped"
   * @example "polka dot"
   */
  pattern?: string;

  /**
   * Your product’s size
   * Required for all apparel products in Apparel & Accessories > Clothing (ID:1604) and Apparel & Accessories > Shoes (ID:187) categories
   * targeted to people in Brazil, France, Germany, Japan, the UK, and the US as well as all products available in different sizes
   * 
   * Max 100 characters
   * 
   * If your item is one size fits all or one size fits most, you can use one_size, OS, one_size fits_all, OSFA, one_size_fits_most, or OSFM
   * 
   * @example "XL"
   */
  size?: string;

  /**
   * Your apparel product’s cut
   * Defaults to "regular"
   * Up to 2 values
   */
  size_type?: ("regular" | "petite" | "maternity" | "big" | "tall" | "plus")[];

  /**
   * The country of the size system used by your product
   * Supported values:
   * - US
   * - UK
   * - EU
   * - DE
   * - FR
   * - JP
   * - CN
   * - IT
   * - BR
   * - MEX
   * - AU
   * 
   * @example "US"
   */
  size_system?: string;

  /**
   * ID for a group of products that come in different versions (variants)
   * Required for variants
   * Use parent sku where possible
   * 
   * Max 50 alphanumeric characters
   * 
   * @example "1234567890"
   */
  item_group_id?: string;

  // === Product shipping ===

  /**
   * Your product's shipping cost, shipping speeds, and the locations your product ships to
   * 
   * @example "US:CA:Overnight:16.00 USD:1:1:2:3"
   */
  shipping?: string | MerchantFeedShipping | MerchantFeedShipping[];
}

export interface StoredIndex {
  [sku: string]: {
    filters?: {
      noindex?: boolean;
      [key: string]: boolean | undefined;
    }
    data: {
      variants?: {
        [variantSku: string]: Record<string, any>;
      };
      [key: string]: string | Record<string, Record<string, any>> | undefined;
    };
  };
}

export interface StoredMerchantFeed extends StoredIndex {
  [sku: string]: {
    filters?: {
      noindex?: boolean;
      [key: string]: boolean | undefined;
    }
    data: MerchantFeedEntry & {
      variants?: {
        [variantSku: string]: MerchantFeedEntry;
      };
      [key: string]: string | Record<string, Record<string, any>> | undefined;
    };
  }
}

export interface StoredRegistry {
  [catalogKey: string]: {
    oaiOptedIn: boolean;
    gmcLastModified: number; // ms since epoch
    indexLastModified: number; // ms since epoch
  }
}