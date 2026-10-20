/**
 * 小店内置默认素材（位于 `public/static/img/shop/`，线上路径 `/static/img/shop/...`）。
 *
 * 卖家没有上传装修图时使用这些资源，保证「零配置」开店时前台与商店页依然有完整的
 * 商业外观：hero 有横幅、页头有店铺标识、画布有浅色底纹，而不是空白或纯色占位。
 * 所有素材都不含文字与站点品牌，可安全用于任意卖家的小店。
 */

/** 店铺前台默认横幅（`default` / `magazine` 模版的 hero 背景，深蓝渐变，白色标题可读）。 */
export const defaultShopBanner = "/static/img/shop/banner.jpg";

/** 默认商品封面：卖家未设置商品图时使用，前台 / 商品卡 / 商店页共用同一张。 */
export const defaultShopProduct = "/static/img/shop/product.jpg";

/** 店铺前台默认底纹（仅浅色模式使用，极低对比度，不影响正文可读性）。 */
export const defaultShopBackground = "/static/img/shop/background.jpg";

/** 默认店铺标识：卖家未设置头像 / Logo 时的方形容器素材。 */
export const defaultShopLogo = "/static/img/shop/logo.webp";
