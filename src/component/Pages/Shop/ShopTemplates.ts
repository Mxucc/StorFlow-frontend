/**
 * 店名排版：只收窄到 sx 里真实用到的排版字段，方便渲染层用 `...spec.titleSx` 展开
 * （SxProps 允许函数/数组，直接展开会丢类型，所以这里固定成纯对象）。
 */
export interface ShopTitleStyle {
  fontSize?: string | number;
  fontWeight?: number;
  lineHeight?: number | string;
  letterSpacing?: string;
}

/**
 * 小店装修模版（design tokens per template）
 * ─────────────────────────────────────────────────────────────────────────────
 * 问题：`theme.template` 之前只影响「是否显示 banner 图」和「第一个商品是否
 * featured」，店铺没配 banner 时三套模版视觉完全一致，商家因此反馈
 * 「选了感觉一点变化都没有」。
 *
 * 解决：把模版的**骨架差异**（容器宽、hero 形态、字号、网格最小列宽、卡片外观、
 * 区块密度、公告形态）全部收敛到这里，渲染层只读配置，不再到处写 `template === …`。
 *
 * 三套模版的定位：
 *  · default  —— 标准店铺：大图 hero + 头像 + 统计 Chip + 卡片区块。
 *  · minimal  —— 极简文字：无大图 hero、无统计 Chip、窄容器、扁平商品卡、去卡片化的文字区块。
 *  · magazine —— 杂志头版：全宽高封面 + 超大标题 + 一行小字统计 + 主色通栏公告 + 头条大卡 + 两栏 about。
 *
 * 颜色一律走主题语义（text.primary / divider / background.paper）+ 店铺主色，
 * 亮色与暗色主题都不硬编码。
 */
export type ShopTemplateName = "default" | "minimal" | "magazine";

export const SHOP_TEMPLATE_NAMES: ShopTemplateName[] = ["default", "minimal", "magazine"];

export interface ShopTemplateSpec {
  name: ShopTemplateName;
  /** 主内容容器宽度（MUI Container maxWidth）：md = 900px，lg = 1200px。 */
  container: "md" | "lg";
  /** hero 骨架：大图 / 紧凑居中 / 杂志封面。 */
  hero: "cover" | "compact" | "magazine";
  /** hero 最小高度；compact 不使用固定高度，按内容撑开。 */
  heroHeight?: { xs: number; md: number };
  /** 头像尺寸与描边宽度。 */
  avatarSize: number;
  avatarBorder: number;
  /** 店名排版。 */
  titleVariant: "h4" | "h5";
  titleSx: ShopTitleStyle;
  /** 统计信息形态：胶囊 Chip / 不展示 / 一行小字。 */
  stats: "chips" | "hidden" | "inline";
  /** 公告形态：Alert 卡片 / 居中纯文字 hairline / 主色通栏条带。 */
  notice: "alert" | "plain" | "band";
  /** 商品区标题形态。 */
  productsHeader: "rule" | "plain" | "masthead";
  /** 中栏区块（about/links/contact）是否用白底圆角卡。 */
  section: "card" | "plain";
  /** about 排版：竖排 / 左标题 + 右正文两栏。 */
  about: "stack" | "columns";
  /** 商品网格最小列宽（px）与列间距（spacing 单位）。 */
  gridMin: number;
  gridGap: number;
  /** 商品卡外观：白底圆角卡 / 扁平（无阴影无圆角，1px 边框）。 */
  card: "card" | "flat";
  /** 首个商品是否作为头条大卡（跨两列、更高）。 */
  headline: boolean;
  /** 区块之间的垂直间距（spacing 单位）。 */
  sectionGap: number;
}

export const SHOP_TEMPLATES: Record<ShopTemplateName, ShopTemplateSpec> = {
  default: {
    name: "default",
    container: "lg",
    hero: "cover",
    heroHeight: { xs: 200, md: 300 },
    avatarSize: 84,
    avatarBorder: 3,
    titleVariant: "h4",
    titleSx: { fontWeight: 700 },
    stats: "chips",
    notice: "alert",
    productsHeader: "rule",
    section: "card",
    about: "stack",
    gridMin: 260,
    gridGap: 3,
    card: "card",
    headline: false,
    sectionGap: 4,
  },
  minimal: {
    name: "minimal",
    container: "md",
    hero: "compact",
    avatarSize: 56,
    avatarBorder: 1,
    titleVariant: "h5",
    titleSx: { fontWeight: 600, letterSpacing: "-0.01em" },
    stats: "hidden",
    notice: "plain",
    productsHeader: "plain",
    section: "plain",
    about: "stack",
    gridMin: 190,
    gridGap: 2,
    card: "flat",
    headline: false,
    sectionGap: 5,
  },
  magazine: {
    name: "magazine",
    container: "lg",
    hero: "magazine",
    heroHeight: { xs: 280, md: 440 },
    avatarSize: 40,
    avatarBorder: 1,
    titleVariant: "h5",
    titleSx: {
      fontSize: "clamp(2rem, 5vw, 3.5rem)",
      fontWeight: 800,
      lineHeight: 1.04,
      letterSpacing: "-0.02em",
    },
    stats: "inline",
    notice: "band",
    productsHeader: "masthead",
    section: "card",
    about: "columns",
    gridMin: 300,
    gridGap: 3,
    card: "card",
    headline: true,
    sectionGap: 5,
  },
};

/** 未知 / 空 template 一律回落 default，保证旧数据与手写配置向后兼容。 */
export const resolveShopTemplate = (template?: string | null): ShopTemplateSpec =>
  SHOP_TEMPLATES[(template ?? "") as ShopTemplateName] ?? SHOP_TEMPLATES.default;
