import { Alert, Box, Button, Chip, Container, Divider, Stack, Typography, useTheme } from "@mui/material";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ShopProductSummary, ShopStorefront as ShopStorefrontView } from "../../../api/shop.ts";
import PageTitle from "../../../router/PageTitle.tsx";
import { useShopOutlet } from "../../Frame/ShopFrame.tsx";
import Globe from "../../Icons/Globe.tsx";
import Person from "../../Icons/Person.tsx";
import { ProductCard, ShopEmpty } from "./ShopShared.tsx";
import { resolveShopTemplate, ShopTemplateSpec } from "./ShopTemplates.ts";
import { defaultShopBanner, defaultShopLogo } from "./shopAssets.ts";

const defaultLayout = ["banner", "notice", "products", "about", "links", "contact"];

/**
 * 店铺前台：三套装修模版共享同一份内容（店名/头像/slogan/公告/商品/关于/链接/联系），
 * 但**骨架不同**。差异全部来自 `ShopTemplates.ts` 的 SHOP_TEMPLATES 配置，
 * 这里只按 spec 组装，不再出现 `template === "…"` 的散落判断。
 *
 * 模版差异速查：
 *  · default  —— 大图 hero（有封面图时铺满 + 暗色渐变）、头像 + 店名 + 统计 Chip、卡片区块、minmax(260px) 网格。
 *  · minimal  —— 无大图 hero（顶部 4px 主色线 + 居中头像/店名）、无统计 Chip、窄容器 md、
 *                公告与区块去卡片化为 hairline 文字块、minmax(190px) 扁平商品卡。
 *  · magazine —— 全宽高封面、超大标题 + 副标题、一行小字统计、主色通栏公告、
 *                头条大卡跨两列、minmax(300px) 网格、about 两栏。
 */
interface HeroProps {
  shop: ShopStorefrontView;
  primary: string;
  bannerImage?: string;
  totalSales: number;
  spec: ShopTemplateSpec;
}

const StoreAvatar = ({
  shop,
  size,
  border,
}: {
  shop: ShopStorefrontView;
  /** 保留在主色兜底时代使用；当前兜底改用内置默认素材。 */
  primary?: string;
  size: number;
  border: number;
}) => (
  <Box
    data-shop-avatar={size}
    sx={{
      width: size,
      height: size,
      borderRadius: "50%",
      border: `${border}px solid`,
      borderColor: "background.paper",
      bgcolor: "background.paper",
      overflow: "hidden",
      flexShrink: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    {shop.avatar ? (
      <Box
        component={"img"}
        src={shop.avatar}
        alt={shop.name}
        sx={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    ) : (
      <Box
        component={"img"}
        src={defaultShopLogo}
        alt={shop.name}
        loading={"lazy"}
        sx={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    )}
  </Box>
);

/** default：大图 hero。有封面图时铺满 + 暗色渐变，没有则整块主色淡底。 */
const CoverHero = ({ shop, primary, bannerImage, totalSales, spec }: HeroProps) => {
  const { t } = useTranslation();
  const showImage = !!bannerImage;

  return (
    <Box
      data-shop-hero={"cover"}
      sx={{
        position: "relative",
        minHeight: showImage ? spec.heroHeight : undefined,
        backgroundImage: showImage ? `url(${bannerImage})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: showImage ? undefined : `${primary}14`,
      }}
    >
      {showImage && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 100%)",
          }}
        />
      )}
      <Container maxWidth={spec.container} sx={{ position: "relative" }}>
        <Box
          sx={{
            pt: showImage ? { xs: 6, md: 10 } : 4,
            pb: 4,
            display: "flex",
            alignItems: "flex-end",
            gap: 3,
            flexWrap: "wrap",
          }}
        >
          <StoreAvatar shop={shop} primary={primary} size={spec.avatarSize} border={spec.avatarBorder} />
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography
              component={"h1"}
              variant={spec.titleVariant}
              sx={{
                ...spec.titleSx,
                color: showImage ? "#fff" : "text.primary",
                textShadow: showImage ? "0 1px 12px rgba(0,0,0,0.35)" : undefined,
                overflowWrap: "anywhere",
              }}
            >
              {shop.name}
            </Typography>
            {shop.theme?.slogan && (
              <Typography
                variant={"subtitle1"}
                sx={{
                  color: showImage ? "rgba(255,255,255,0.9)" : "text.secondary",
                  mt: 0.5,
                  overflowWrap: "anywhere",
                }}
              >
                {shop.theme.slogan}
              </Typography>
            )}
            <Stack direction={"row"} spacing={1} sx={{ mt: 1.5, flexWrap: "wrap" }} data-shop-stats={"chips"}>
              <Chip
                size={"small"}
                label={t("shop.store.productCount", { count: shop.products.length })}
                sx={{ bgcolor: "background.paper" }}
              />
              <Chip
                size={"small"}
                label={t("shop.store.salesCount", { count: totalSales })}
                sx={{ bgcolor: "background.paper" }}
              />
            </Stack>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

/**
 * minimal：紧凑居中头部。**不展示封面图**（即使 theme.banner / cover 有值），
 * 也没有统计 Chip —— 信息收在一条 4px 主色细线之下，视觉重心只有头像 + 店名 + slogan。
 */
const CompactHero = ({ shop, primary, spec }: HeroProps) => (
  <Box data-shop-hero={"compact"} sx={{ borderTop: `4px solid ${primary}` }}>
    <Container maxWidth={spec.container}>
      <Box
        sx={{
          py: { xs: 5, md: 6 },
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: 1.5,
        }}
      >
        <StoreAvatar shop={shop} primary={primary} size={spec.avatarSize} border={spec.avatarBorder} />
        <Box sx={{ minWidth: 0 }}>
          <Typography
            component={"h1"}
            variant={spec.titleVariant}
            sx={{ ...spec.titleSx, color: "text.primary", overflowWrap: "anywhere" }}
          >
            {shop.name}
          </Typography>
          {shop.theme?.slogan && (
            <Typography
              variant={"body2"}
              sx={{ color: "text.secondary", mt: 0.75, letterSpacing: "0.02em", overflowWrap: "anywhere" }}
            >
              {shop.theme.slogan}
            </Typography>
          )}
        </Box>
      </Box>
    </Container>
  </Box>
);

/** magazine：全宽封面 + 超大标题 + 副标题 + 一行小字统计（杂志的署名行）。 */
const MagazineHero = ({ shop, primary, bannerImage, totalSales, spec }: HeroProps) => {
  const { t } = useTranslation();
  const showImage = !!bannerImage;

  return (
    <Box
      data-shop-hero={"magazine"}
      sx={{
        position: "relative",
        minHeight: spec.heroHeight,
        backgroundImage: showImage ? `url(${bannerImage})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: showImage ? undefined : primary,
        display: "flex",
        alignItems: "flex-end",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background: showImage
            ? "linear-gradient(180deg, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.86) 100%)"
            : "linear-gradient(200deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.86) 100%)",
        }}
      />
      <Container maxWidth={spec.container} sx={{ position: "relative", py: { xs: 4, md: 5 } }}>
        <Typography
          component={"h1"}
          variant={spec.titleVariant}
          sx={{
            ...spec.titleSx,
            color: "#fff",
            textShadow: "0 2px 28px rgba(0,0,0,0.45)",
            overflowWrap: "anywhere",
            maxWidth: "18ch",
          }}
        >
          {shop.name}
        </Typography>
        {shop.theme?.slogan && (
          <Typography
            variant={"h6"}
            sx={{
              mt: 1.5,
              color: "rgba(255,255,255,0.88)",
              fontWeight: 400,
              maxWidth: 720,
              textShadow: "0 1px 14px rgba(0,0,0,0.5)",
              overflowWrap: "anywhere",
            }}
          >
            {shop.theme.slogan}
          </Typography>
        )}
        <Box
          data-shop-stats={"inline"}
          sx={{ mt: 3, display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", minWidth: 0 }}
        >
          <StoreAvatar shop={shop} primary={primary} size={spec.avatarSize} border={spec.avatarBorder} />
          <Typography
            variant={"caption"}
            sx={{
              color: "rgba(255,255,255,0.92)",
              letterSpacing: "0.08em",
              textShadow: "0 1px 10px rgba(0,0,0,0.5)",
              overflowWrap: "anywhere",
            }}
          >
            {t("shop.store.productCount", { count: shop.products.length })}
            {" · "}
            {t("shop.store.salesCount", { count: totalSales })}
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

const HEROES: Record<ShopTemplateSpec["hero"], React.FC<HeroProps>> = {
  cover: CoverHero,
  compact: CompactHero,
  magazine: MagazineHero,
};

/** 商品区标题：default 用「标题 + 分割线」，minimal 居中 overline，magazine 大字 + 主色短线。 */
const ProductsHeader = ({ spec, primary }: { spec: ShopTemplateSpec; primary: string }) => {
  const { t } = useTranslation();

  if (spec.productsHeader === "plain") {
    return (
      <Box
        sx={{
          textAlign: "center",
          borderTop: "1px solid",
          borderBottom: "1px solid",
          borderColor: "divider",
          py: 1.5,
          mb: 3,
        }}
      >
        <Typography variant={"overline"} sx={{ color: "text.secondary", letterSpacing: "0.18em" }}>
          {t("shop.store.products")}
        </Typography>
      </Box>
    );
  }

  if (spec.productsHeader === "masthead") {
    return (
      <Box sx={{ mb: 3 }}>
        <Typography component={"h2"} variant={"h5"} sx={{ fontWeight: 700 }}>
          {t("shop.store.products")}
        </Typography>
        <Box sx={{ width: 56, height: 3, bgcolor: primary, mt: 1 }} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
      <Typography component={"h2"} variant={"h6"} sx={{ fontWeight: 600 }}>
        {t("shop.store.products")}
      </Typography>
      <Divider sx={{ flexGrow: 1 }} />
    </Box>
  );
};

/**
 * 商品网格：轨道由模版的 gridMin 决定（长标题换行不挤压），入场带 40ms 阶梯。
 * 头条大卡（magazine 第一个商品）的跨列放在**网格项**上，卡片自身不再是网格项。
 */
const ProductGrid = ({
  products,
  slug,
  primary,
  spec,
}: {
  products: ShopProductSummary[];
  slug: string;
  primary: string;
  spec: ShopTemplateSpec;
}) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  if (products.length === 0) {
    return null;
  }

  const hasHeadline = spec.headline && products.length > 1;

  return (
    <Box
      data-shop-grid={spec.gridMin}
      sx={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fill, minmax(${spec.gridMin}px, 1fr))`,
        gap: spec.gridGap,
        alignItems: "stretch",
      }}
    >
      {products.map((product, index) => {
        const headline = hasHeadline && index === 0;
        return (
          <Box
            key={product.id}
            data-shop-headline={headline ? "1" : undefined}
            sx={{
              display: "flex",
              minWidth: 0,
              gridColumn: headline ? { xs: "span 1", md: "span 2" } : undefined,
              opacity: mounted ? 1 : 0,
              transform: mounted ? "none" : "translateY(8px)",
              transition: `opacity 220ms cubic-bezier(0.2, 0.8, 0.2, 1) ${
                index * 40
              }ms, transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1) ${index * 40}ms`,
              "@media (prefers-reduced-motion: reduce)": {
                transition: "none",
                opacity: 1,
                transform: "none",
              },
              "& > *": { width: "100%" },
            }}
          >
            <ProductCard product={product} slug={slug} primary={primary} featured={headline} variant={spec.card} />
          </Box>
        );
      })}
    </Box>
  );
};

/** 公告：default = Alert 卡片，minimal = 居中文字 + 上下 hairline（容器内），magazine = 主色通栏条带。 */
const NoticeSection = ({
  shop,
  primary,
  spec,
}: {
  shop: ShopStorefrontView;
  primary: string;
  spec: ShopTemplateSpec;
}) => {
  const theme = useTheme();
  const notice = shop.theme?.notice;

  if (!notice) {
    return null;
  }

  if (spec.notice === "band") {
    return (
      <Box data-shop-notice={"band"} sx={{ bgcolor: primary, color: theme.palette.getContrastText(primary), mt: 0 }}>
        <Container maxWidth={spec.container} sx={{ py: 1.5 }}>
          <Typography
            variant={"body2"}
            sx={{ fontWeight: 600, textAlign: "center", letterSpacing: "0.02em", overflowWrap: "anywhere" }}
          >
            {notice}
          </Typography>
        </Container>
      </Box>
    );
  }

  if (spec.notice === "plain") {
    return (
      <Container data-shop-notice={"plain"} maxWidth={spec.container} sx={{ mt: spec.sectionGap }}>
        <Box
          sx={{
            borderTop: "1px solid",
            borderBottom: "1px solid",
            borderColor: "divider",
            py: 2,
            textAlign: "center",
          }}
        >
          <Typography
            variant={"body2"}
            sx={{ color: "text.secondary", letterSpacing: "0.04em", overflowWrap: "anywhere" }}
          >
            {notice}
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container data-shop-notice={"alert"} maxWidth={spec.container} sx={{ mt: 3 }}>
      <Alert severity={"info"} variant={"outlined"} sx={{ borderRadius: 3, bgcolor: "background.paper" }}>
        {notice}
      </Alert>
    </Container>
  );
};

/** 卡片式区块（default / magazine）：白底 + 12px 圆角 + 1px 分隔线。 */
const cardSx = {
  bgcolor: "background.paper",
  border: "1px solid",
  borderColor: "divider",
  borderRadius: 3,
  p: 3,
} as const;

/** 去卡片化的区块标题（minimal）：overline + 细分隔线，纯文字块。 */
const PlainSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Box sx={{ borderTop: "1px solid", borderColor: "divider", pt: 2.5 }}>
    <Typography variant={"overline"} sx={{ display: "block", color: "text.secondary", letterSpacing: "0.18em" }}>
      {title}
    </Typography>
    <Box sx={{ mt: 1, minWidth: 0 }}>{children}</Box>
  </Box>
);

/** about：default 竖排卡片，minimal 纯文字块，magazine 左标题 + 右正文两栏（窄屏堆叠）。 */
const AboutSection = ({
  shop,
  primary,
  spec,
}: {
  shop: ShopStorefrontView;
  primary: string;
  spec: ShopTemplateSpec;
}) => {
  const { t } = useTranslation();

  if (!shop.description) {
    return null;
  }

  return (
    <Container maxWidth={spec.container} sx={{ pt: spec.sectionGap }} data-shop-section={"about"}>
      {spec.about === "columns" ? (
        <Box
          sx={{
            borderTop: "2px solid",
            borderColor: "divider",
            pt: 3,
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "minmax(120px, 220px) minmax(0, 1fr)" },
            columnGap: 4,
            rowGap: 1.5,
            alignItems: "start",
          }}
        >
          <Box>
            <Typography component={"h2"} variant={"h5"} sx={{ fontWeight: 700 }}>
              {t("shop.store.about")}
            </Typography>
            <Box sx={{ width: 40, height: 3, bgcolor: primary, mt: 1 }} />
          </Box>
          <Typography variant={"body1"} sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", lineHeight: 1.8 }}>
            {shop.description}
          </Typography>
        </Box>
      ) : spec.section === "card" ? (
        <Box sx={cardSx}>
          <Typography component={"h2"} variant={"h6"} sx={{ fontWeight: 600, mb: 1 }}>
            {t("shop.store.about")}
          </Typography>
          <Typography variant={"body2"} sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {shop.description}
          </Typography>
        </Box>
      ) : (
        <PlainSection title={t("shop.store.about")}>
          <Typography variant={"body2"} sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {shop.description}
          </Typography>
        </PlainSection>
      )}
    </Container>
  );
};

const LinksSection = ({ shop, spec }: { shop: ShopStorefrontView; spec: ShopTemplateSpec }) => {
  const { t } = useTranslation();
  const links = shop.theme?.links ?? [];

  if (links.length === 0) {
    return null;
  }

  const body = (
    <Stack
      direction={"row"}
      spacing={1}
      sx={{ flexWrap: "wrap", gap: 1, ...(spec.section === "plain" ? { mt: 1.5 } : { mt: 1 }) }}
    >
      {links.map((link) => (
        <Button
          key={`${link.label}-${link.url}`}
          variant={"outlined"}
          size={"small"}
          href={link.url}
          target={"_blank"}
          rel={"noreferrer noopener"}
          startIcon={<Globe sx={{ fontSize: 16 }} />}
          sx={{ borderColor: "divider", borderRadius: spec.section === "plain" ? 0 : undefined }}
        >
          {link.label}
        </Button>
      ))}
    </Stack>
  );

  return (
    <Container maxWidth={spec.container} sx={{ pt: spec.sectionGap }} data-shop-section={"links"}>
      {spec.section === "card" ? (
        <Box sx={cardSx}>
          <Typography component={"h2"} variant={"h6"} sx={{ fontWeight: 600, mb: 1 }}>
            {t("shop.store.links")}
          </Typography>
          {body}
        </Box>
      ) : (
        <PlainSection title={t("shop.store.links")}>{body}</PlainSection>
      )}
    </Container>
  );
};

const ContactSection = ({ shop, spec }: { shop: ShopStorefrontView; spec: ShopTemplateSpec }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const body = (
    <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", minWidth: 0 }}>
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          overflow: "hidden",
          bgcolor: "action.hover",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {shop.owner?.avatar ? (
          <Box
            component={"img"}
            src={shop.owner.avatar}
            alt={shop.owner.nickname}
            sx={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <Person sx={{ fontSize: 26, color: "text.secondary" }} />
        )}
      </Box>
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Typography variant={"body2"} color={"text.secondary"}>
          {t("shop.store.contact")}
        </Typography>
        <Typography variant={"subtitle1"} sx={{ fontWeight: 600, overflowWrap: "anywhere" }}>
          {shop.owner?.nickname}
        </Typography>
      </Box>
      {shop.owner?.id && (
        <Button size={"small"} variant={"text"} onClick={() => navigate(`/profile/${shop.owner.id}`)}>
          {t("shop.store.viewProfile")}
        </Button>
      )}
    </Box>
  );

  return (
    <Container maxWidth={spec.container} sx={{ pt: spec.sectionGap }} data-shop-section={"contact"}>
      {spec.section === "card" ? (
        <Box sx={cardSx}>{body}</Box>
      ) : (
        <PlainSection title={t("shop.store.contact")}>{body}</PlainSection>
      )}
    </Container>
  );
};

const ShopStorefront = () => {
  const { shop, primary } = useShopOutlet();
  const { t } = useTranslation();

  const spec = useMemo(() => resolveShopTemplate(shop.theme?.template), [shop.theme?.template]);

  const layout = useMemo(() => {
    const configured = shop.theme?.layout?.filter((section) => defaultLayout.includes(section)) ?? [];
    return configured.length > 0 ? configured : defaultLayout;
  }, [shop.theme?.layout]);

  // 未装修封面时使用内置横幅，避免 hero 退化成纯色块（minimal 模版本身不渲染封面图）。
  const bannerImage = shop.theme?.banner || shop.cover || defaultShopBanner;
  const totalSales = shop.products.reduce((sum, product) => sum + product.sales, 0);
  const Hero = HEROES[spec.hero];

  const sections: Record<string, React.ReactNode> = {
    banner: (
      <Hero
        key={"banner"}
        shop={shop}
        primary={primary}
        bannerImage={bannerImage}
        totalSales={totalSales}
        spec={spec}
      />
    ),
    notice: <NoticeSection key={"notice"} shop={shop} primary={primary} spec={spec} />,
    products: (
      <Container maxWidth={spec.container} key={"products"} sx={{ pt: spec.sectionGap }} data-shop-section={"products"}>
        <ProductsHeader spec={spec} primary={primary} />
        {shop.products.length === 0 ? (
          <ShopEmpty title={t("shop.store.emptyProducts")} description={t("shop.store.emptyProductsHint")} />
        ) : (
          <ProductGrid products={shop.products} slug={shop.slug} primary={primary} spec={spec} />
        )}
      </Container>
    ),
    about: <AboutSection key={"about"} shop={shop} primary={primary} spec={spec} />,
    links: <LinksSection key={"links"} shop={shop} spec={spec} />,
    contact: <ContactSection key={"contact"} shop={shop} spec={spec} />,
  };

  return (
    <Box data-shop-template={spec.name} sx={{ pb: 4 }}>
      <PageTitle title={shop.name} />
      {layout.map((section) => sections[section])}
    </Box>
  );
};

export default ShopStorefront;
