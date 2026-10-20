import { Box, createTheme, Paper, Stack, ThemeProvider, Typography, useTheme } from "@mui/material";
import { useMemo } from "react";
import { Outlet, useNavigation } from "react-router-dom";
import { useAppSelector } from "../../redux/hooks.ts";
import AutoHeight from "../Common/AutoHeight.tsx";
import CircularProgress from "../Common/CircularProgress.tsx";
import LanguageSwitcher from "../Common/LanguageSwitcher.tsx";
import PoweredBy from "./PoweredBy.tsx";
import Logo from "../Common/Logo.tsx";
import { ConnectingLine, OAuthAppCard } from "./OauthAppCard.tsx";
import { useTranslation } from "react-i18next";
import CheckmarkCircleFilled from "../Icons/CheckmarkCircleFilled.tsx";

const Loading = () => {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        pt: 7,
        pb: 9,
      }}
    >
      <CircularProgress />
    </Box>
  );
};

const BrandPoint = ({ children }: { children: React.ReactNode }) => (
  <Stack direction={"row"} spacing={1.5} alignItems={"center"}>
    <Box
      sx={{
        width: 22,
        height: 22,
        borderRadius: "7px",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(124,144,255,0.18)",
        color: "#7C90FF",
      }}
    >
      <CheckmarkCircleFilled sx={{ fontSize: 14 }} />
    </Box>
    <Typography variant={"body2"} sx={{ color: "rgba(234,242,247,0.78)" }}>
      {children}
    </Typography>
  </Stack>
);

/**
 * 登录页左侧品牌面板（桌面端）。
 *
 * 面板恒为深色，因此套一层只改 mode 的嵌套主题：Logo 组件据此选浅色版本。
 * 面板内的文字颜色全部显式指定，不依赖外层主题。
 */
const BrandPanel = () => {
  const { t } = useTranslation();
  const outer = useTheme();
  const darkTheme = useMemo(() => createTheme(outer, { palette: { mode: "dark" } }), [outer]);
  const title = useAppSelector((state) => state.siteConfig.basic.config.title);

  return (
    <ThemeProvider theme={darkTheme}>
      <Box
        sx={{
          display: { xs: "none", md: "flex" },
          flexDirection: "column",
          justifyContent: "space-between",
          width: { md: "42%", lg: "38%" },
          maxWidth: 620,
          flexShrink: 0,
          position: "sticky",
          top: 0,
          height: "100vh",
          p: { md: 5, lg: 7 },
          color: "#EAF2F7",
          backgroundImage:
            "linear-gradient(180deg, rgba(10,15,31,0.88) 0%, rgba(19,26,51,0.72) 45%, rgba(27,36,80,0.90) 100%)," +
            "url(/static/img/brand/login-panel.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Logo sx={{ height: 32, maxWidth: 200, objectFit: "contain", objectPosition: "left" }} />
        </Box>
        <Box>
          <Typography variant={"h3"} sx={{ fontWeight: 700, letterSpacing: "-0.02em", mb: 1.5 }}>
            {title}
          </Typography>
          <Typography variant={"body1"} sx={{ color: "rgba(234,242,247,0.76)", maxWidth: 420, mb: 4 }}>
            {t("login.brandTagline")}
          </Typography>
          <Stack spacing={1.75} sx={{ maxWidth: 420 }}>
            <BrandPoint>{t("login.brandPoint1")}</BrandPoint>
            <BrandPoint>{t("login.brandPoint2")}</BrandPoint>
            <BrandPoint>{t("login.brandPoint3")}</BrandPoint>
          </Stack>
        </Box>
        <Typography variant={"caption"} sx={{ color: "rgba(234,242,247,0.45)" }}>
          {`© ${new Date().getFullYear()} ${title}`}
        </Typography>
      </Box>
    </ThemeProvider>
  );
};

/** 移动端的品牌横幅：桌面端隐藏。 */
const BrandBanner = () => {
  const outer = useTheme();
  const darkTheme = useMemo(() => createTheme(outer, { palette: { mode: "dark" } }), [outer]);
  return (
    <ThemeProvider theme={darkTheme}>
      <Box
        sx={{
          display: { xs: "flex", md: "none" },
          height: 136,
          flexShrink: 0,
          alignItems: "flex-end",
          px: 2.5,
          py: 2,
          backgroundImage:
            "linear-gradient(180deg, rgba(10,15,31,0.42) 0%, rgba(10,15,31,0.92) 100%), url(/static/img/brand/login-banner.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <Logo sx={{ height: 26, maxWidth: 170, objectFit: "contain", objectPosition: "left" }} />
      </Box>
    </ThemeProvider>
  );
};

const HeadlessFrame = () => {
  const { t } = useTranslation();
  const loading = useAppSelector((state) => state.globalState.loading.headlessFrame);
  const { headless_footer, headless_bottom } = useAppSelector(
    (state) => state.siteConfig.basic?.config?.custom_html ?? {},
  );
  const oauthApp = useAppSelector((state) => state.globalState.oauthApp);
  const oauthAppLoading = useAppSelector((state) => state.globalState.oauthAppLoading);
  let navigation = useNavigation();

  const showOAuthCard = oauthApp || oauthAppLoading;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "stretch",
        minHeight: "100vh",
        backgroundColor: "background.default",
        overflow: "auto",
      }}
    >
      <BrandPanel />
      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <BrandBanner />
        <Box
          sx={{
            flexGrow: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            px: { xs: 2, sm: 4, md: 6 },
            py: { xs: 3, md: 5 },
          }}
        >
          <Box sx={{ width: "100%", maxWidth: 400 }}>
            {/* OAuth App Card - shown above the login panel */}
            {showOAuthCard && (
              <>
                <OAuthAppCard app={oauthApp} loading={!!oauthAppLoading && !oauthApp} />
                <ConnectingLine />
              </>
            )}
            <Paper
              sx={{
                padding: (theme) => `${theme.spacing(2.5)} ${theme.spacing(3)} ${theme.spacing(3)}`,
                borderRadius: 4,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 2,
                }}
              >
                <Logo
                  sx={{
                    maxWidth: "40%",
                    maxHeight: "40px",
                  }}
                />
                <Stack direction={"row"} alignItems={"center"} spacing={1.5}>
                  {/* 官网首页由 Astro 服务端渲染，必须整页跳转：SPA 内的 `/` 路由会被
                      HomeRedirect 接管，软导航过去只会回到控制台或登录页。 */}
                  <Box
                    component={"a"}
                    href={"/"}
                    sx={{
                      fontSize: 13,
                      lineHeight: 1,
                      whiteSpace: "nowrap",
                      color: "text.secondary",
                      textDecoration: "none",
                      "&:hover": { color: "primary.main", textDecoration: "underline" },
                    }}
                  >
                    {t("navbar.siteHome")}
                  </Box>
                  {/* 语言切换按钮 */}
                  <LanguageSwitcher />
                </Stack>
              </Box>
              <AutoHeight>
                <div>
                  <Box
                    sx={{
                      display: loading || navigation.state !== "idle" ? "none" : "block",
                    }}
                  >
                    <Outlet />
                    {headless_bottom && (
                      <Box sx={{ width: "100%" }}>
                        <div dangerouslySetInnerHTML={{ __html: headless_bottom }} />
                      </Box>
                    )}
                  </Box>
                  {(loading || navigation.state !== "idle") && <Loading />}
                </div>
              </AutoHeight>
            </Paper>
            <PoweredBy sx={{ mt: 2.5, display: "flex", justifyContent: "center" }} />
            {headless_footer && (
              <Box sx={{ width: "100%", mb: 2 }}>
                <div dangerouslySetInnerHTML={{ __html: headless_footer }} />
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default HeadlessFrame;
