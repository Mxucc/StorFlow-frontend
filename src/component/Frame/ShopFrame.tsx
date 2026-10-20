import { Box, Button, CircularProgress, Container, Stack, Typography, useTheme } from "@mui/material";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { AppError, Code } from "../../api/request.ts";
import { getStorefront, isRateLimitedError, ShopStorefront } from "../../api/shop.ts";
import { useAppDispatch, useAppSelector } from "../../redux/hooks.ts";
import SessionManager from "../../session";
import Logo from "../Common/Logo.tsx";
import LanguageSwitcher from "../Common/LanguageSwitcher.tsx";
import { ShopEmpty, shopPrimary } from "../Pages/Shop/ShopShared.tsx";
import { defaultShopBackground, defaultShopLogo } from "../Pages/Shop/shopAssets.ts";

export interface ShopOutletContext {
  shop: ShopStorefront;
  primary: string;
  reload: () => void;
}

/** 公开店铺页面的上下文（由 ShopFrame 提供，子页面用 useShopOutlet 读取）。 */
export const useShopOutlet = () => useOutletContext<ShopOutletContext>();

/**
 * ShopFrame —— 公开店铺框架。
 *
 * 与 `HeadlessFrame` 同属「无需登录」的公开框架，但店铺前台需要整幅画布
 * （banner/商品网格/页脚），所以不复用登录用的窄 Paper 容器：
 * 这里提供满宽画布 + 店铺装修注入（主色、背景色、公告、页脚）。
 * 买家/卖家/后台页面仍然挂在需要登录的 AutoNavbarFrame 下。
 */
const ShopFrame = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { slug = "" } = useParams();
  const siteName = useAppSelector((state) => state.siteConfig.basic.config.title);

  const [shop, setShop] = useState<ShopStorefront | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<"notfound" | "ratelimited" | "error" | undefined>();

  const load = useCallback(() => {
    if (!slug) {
      setError("notfound");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(undefined);
    dispatch(getStorefront(slug))
      .then((res) => setShop(res))
      .catch((e) => {
        setShop(undefined);
        setError(
          isRateLimitedError(e)
            ? "ratelimited"
            : e instanceof AppError && e.code === Code.NodeFound
              ? "notfound"
              : "error",
        );
      })
      .finally(() => setLoading(false));
  }, [dispatch, slug]);

  useEffect(() => {
    load();
  }, [load]);

  const primary = shopPrimary(theme, shop?.theme?.primary_color);
  const background = shop?.theme?.background_color;
  // 未装修底图时使用内置底纹；深色模式下不铺浅色图，避免刺眼。
  const backgroundImage =
    shop?.theme?.background_image || (theme.palette.mode === "light" ? defaultShopBackground : "");
  const footer = shop?.theme?.footer;
  const loggedIn = !!SessionManager.currentLoginOrNull();

  if (loading && !shop) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: (t) => (t.palette.mode === "light" ? t.palette.grey[100] : t.palette.grey[900]),
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!shop) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 2,
          bgcolor: (t) => (t.palette.mode === "light" ? t.palette.grey[100] : t.palette.grey[900]),
        }}
      >
        <Box sx={{ maxWidth: 480, width: "100%" }}>
          <ShopEmpty
            title={
              error === "notfound"
                ? t("shop.store.notFound")
                : error === "ratelimited"
                  ? t("shop.store.rateLimited")
                  : t("shop.store.loadFailed")
            }
            description={
              error === "notfound"
                ? t("shop.store.notFoundHint")
                : error === "ratelimited"
                  ? t("shop.store.rateLimitedHint")
                  : t("shop.store.loadFailedHint")
            }
          />
          <Stack direction={"row"} spacing={1} justifyContent={"center"} sx={{ mt: 2 }}>
            <Button variant={"contained"} onClick={() => window.location.assign("/")}>
              {t("shop.store.backToSite")}
            </Button>
            {error !== "notfound" && (
              <Button variant={"outlined"} onClick={load}>
                {t("shop.store.retry")}
              </Button>
            )}
          </Stack>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        bgcolor: background || ((t) => (t.palette.mode === "light" ? t.palette.grey[100] : t.palette.grey[900])),
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
        color: "text.primary",
      }}
    >
      <Box
        component={"header"}
        sx={{
          position: "sticky",
          top: 0,
          zIndex: (t) => t.zIndex.appBar,
          bgcolor: (t) => (t.palette.mode === "light" ? "rgba(255,255,255,0.88)" : "rgba(18,18,18,0.88)"),
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Container maxWidth={"lg"}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, minHeight: 64 }}>
            <Box
              component={"a"}
              href={`/shop/${shop.slug}`}
              // 店铺首页由 Astro 输出静态 HTML，整页跳转而不是 SPA 软导航。
              onClick={(e) => {
                e.preventDefault();
                window.location.assign(`/shop/${shop.slug}`);
              }}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                textDecoration: "none",
                color: "inherit",
                minWidth: 0,
                "&:focus-visible": { outline: "2px solid", outlineColor: primary, outlineOffset: 4 },
              }}
            >
              {shop.theme?.logo ? (
                <Box
                  component={"img"}
                  src={shop.theme.logo}
                  alt={shop.name}
                  sx={{ height: 32, maxWidth: 160, objectFit: "contain", display: "block" }}
                />
              ) : shop.avatar ? (
                <Box
                  component={"img"}
                  src={shop.avatar}
                  alt={shop.name}
                  sx={{ width: 32, height: 32, borderRadius: "8px", objectFit: "cover", display: "block" }}
                />
              ) : (
                <Box
                  component={"img"}
                  src={defaultShopLogo}
                  alt={shop.name}
                  sx={{ width: 32, height: 32, borderRadius: "8px", objectFit: "cover", display: "block" }}
                />
              )}
              <Typography
                variant={"subtitle1"}
                sx={{
                  fontWeight: 600,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {shop.name}
              </Typography>
            </Box>
            <Box sx={{ flexGrow: 1 }} />
            {shop.theme?.links && shop.theme.links.length > 0 && (
              <Stack direction={"row"} spacing={2} sx={{ display: { xs: "none", md: "flex" } }}>
                {shop.theme.links.map((link) => (
                  <Typography
                    key={`${link.label}-${link.url}`}
                    component={"a"}
                    href={link.url}
                    target={"_blank"}
                    rel={"noreferrer noopener"}
                    variant={"body2"}
                    sx={{
                      color: "text.secondary",
                      textDecoration: "none",
                      "&:hover": { color: primary },
                      "&:focus-visible": { outline: "2px solid", outlineColor: primary, outlineOffset: 2 },
                    }}
                  >
                    {link.label}
                  </Typography>
                ))}
              </Stack>
            )}
            <LanguageSwitcher />
            {loggedIn ? (
              <Button size={"small"} variant={"outlined"} onClick={() => navigate("/home")}>
                {t("shop.store.goToDrive")}
              </Button>
            ) : (
              <Button
                size={"small"}
                variant={"contained"}
                sx={{ bgcolor: primary, "&:hover": { bgcolor: primary, filter: "brightness(0.92)" } }}
                onClick={() => window.location.assign(`/session?redirect=${encodeURIComponent(`/shop/${shop.slug}`)}`)}
              >
                {t("shop.store.signIn")}
              </Button>
            )}
          </Box>
        </Container>
      </Box>

      <Box component={"main"} sx={{ flexGrow: 1 }}>
        <Outlet context={{ shop, primary, reload: load } satisfies ShopOutletContext} />
      </Box>

      <Box component={"footer"} sx={{ borderTop: "1px solid", borderColor: "divider", mt: 6, py: 3 }}>
        <Container maxWidth={"lg"}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              flexWrap: "wrap",
              justifyContent: "space-between",
            }}
          >
            <Typography variant={"body2"} color={"text.secondary"} sx={{ overflowWrap: "anywhere" }}>
              {footer || t("shop.store.footerDefault", { site: siteName ?? "", shop: shop.name })}
            </Typography>
            <Logo sx={{ maxHeight: 24, opacity: 0.6 }} />
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default ShopFrame;
