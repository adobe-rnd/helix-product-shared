# helix-product-shared

## Cache keys

Response-key builders select the keys attached as tags to cached responses. They
include group and dependency keys so intentional broader purges remain possible.
Purge-key selection uses the same individual key generators, but selects only the
keys affected by a change.

| Response-key builder | Deprecated alias |
| --- | --- |
| `computeProductResponseKeys` | `computeProductKeys` |
| `computeIndexResponseKeys` | `computeIndexKeys` |
| `computeSitemapResponseKeys` | `computeSitemapKeys` |
| `computeMediaResponseKeys` | `computeMediaKeys` |

The deprecated exports are aliases to the same functions. Existing arguments,
return values, and key ordering are unchanged.

Use `computePurgeKeys(org, site, path, { contentBusId } = {})` to select keys for:

| Changed resource | Purge keys |
| --- | --- |
| Product path, extensionless or `.json` | Both product path variants, plus the supplied path's authored-content key when `contentBusId` is configured |
| Path ending in `/index.json` or `/sitemap.xml` | The exact resource-path key only |
| `/_pricerules` | The price-rules group key |

The purge helper never includes the site-wide key. It does not support media or
other resource types and does not validate inputs. Unrecognized paths are treated
as product paths, not rejected. Callers must supply supported paths. It only
computes keys. Batching, deduplication, and CDN requests belong to the caller.

Individual generators such as `computeProductPathKey`, `computeAuthoredContentKey`,
`computeSiteKey`, `compute404Key`, and `computePriceRulesKey` remain available for
both response tagging and explicit purge operations.