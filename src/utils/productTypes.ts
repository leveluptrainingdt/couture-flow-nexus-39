
export const PRODUCT_TYPES = [
  'Lehenga Fabric',
  'Silk Thread',
  'Cotton Fabric',
  'Men\'s Kurta Fabric',
  'Blouse Lace',
  'Embroidery Thread',
  'Zari Border',
  'Dupatta Fabric',
  'Lining Fabric',
  'Buttons',
  'Zippers',
  'Elastic',
  'Hooks & Eyes',
  'Beads',
  'Sequins',
  'Mirror Work',
  'Other'
] as const;

export type ProductType = typeof PRODUCT_TYPES[number];

export const CATEGORIES = [
  'Fabrics',
  'Threads',
  'Accessories',
  'Embellishments',
  'Hardware',
  'Tools',
  'Other'
] as const;

export type Category = typeof CATEGORIES[number];
