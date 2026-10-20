import { createTheme, CssBaseline, GlobalStyles, styled, ThemeProvider, useMediaQuery, useTheme } from "@mui/material";
import { ThemeOptions } from "@mui/material/styles/createTheme";
import i18next from "i18next";
import { enqueueSnackbar, MaterialDesignContent, SnackbarProvider } from "notistack";
import { Suspense, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Outlet } from "react-router-dom";
import { useRegisterSW } from "virtual:pwa-register/react";
import FileIconSnackbar from "./component/Common/Snackbar/FileIconSnackbar.tsx";
import LoadingSnackbar from "./component/Common/Snackbar/LoadingSnackbar.tsx";
import { ServiceWorkerUpdateAction } from "./component/Common/Snackbar/snackbar.tsx";
import GlobalDialogs from "./component/Dialogs/GlobalDialogs.tsx";
import { GrowDialogTransition } from "./component/FileManager/Search/SearchPopup.tsx";
import Warning from "./component/Icons/Warning.tsx";
import { useAppSelector } from "./redux/hooks.ts";
import { changeThemeColor } from "./util";

import { applyStorFlowTheme, sf } from "./theme/storflow.ts";

/**
 * 把服务端下发的主题配置（只含 primary/secondary）叠加到 StorFlow 设计系统上。
 *
 * 管理端「外观」页面的主题预览也会调用这里，所以保持为纯函数、不依赖 React。
 * 形状/字体/组件质感全部来自 theme/storflow.ts，主题配置只负责换主色。
 */
export const applyThemeWithOverrides = (themeConfig: ThemeOptions): ThemeOptions => {
  const themed = applyStorFlowTheme(themeConfig);
  const components = themed.components ?? {};

  // 这两个默认值依赖 React 组件，留在 App 层，设计系统只负责样式。
  return {
    ...themed,
    components: {
      ...components,
      MuiDialog: {
        ...components.MuiDialog,
        defaultProps: {
          ...(components.MuiDialog as { defaultProps?: Record<string, unknown> } | undefined)?.defaultProps,
          TransitionComponent: GrowDialogTransition,
        },
      },
      MuiAlert: {
        ...components.MuiAlert,
        defaultProps: {
          ...(components.MuiAlert as { defaultProps?: Record<string, unknown> } | undefined)?.defaultProps,
          iconMapping: {
            warning: <Warning color={"inherit"} />,
          },
        },
      },
    },
  };
};

export const useGeneratedTheme = (preferedDark?: boolean, subTheme?: boolean) => {
  const themes = useAppSelector((state) => state.siteConfig.basic.config.themes);
  const defaultTheme = useAppSelector((state) => state.siteConfig.basic.config.default_theme);
  const preferredTheme = useAppSelector((state) => state.globalState.preferredTheme);
  let darkMode = useAppSelector((state) => state.globalState.darkMode);
  darkMode = darkMode;
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  const mode =
    preferedDark !== undefined
      ? preferedDark
        ? "dark"
        : "light"
      : darkMode === undefined
        ? prefersDarkMode
          ? "dark"
          : "light"
        : darkMode
          ? "dark"
          : "light";
  const theme = useMemo(() => {
    // Determine preferred theme
    var themeConfig = {} as ThemeOptions;
    if (themes) {
      try {
        const themeOptions = JSON.parse(themes) as themeOptions;
        themeConfig = getPreferredTheme(themeOptions, mode, preferredTheme, defaultTheme);
      } catch (e) {
        console.log("failed to parse theme config, using default", e);
      }
    }

    const t = createTheme(applyThemeWithOverrides({ ...themeConfig, palette: { ...themeConfig.palette, mode } }));
    if (!subTheme) {
      // 移动端浏览器地址栏颜色跟随画布，避免和侧边栏/卡片出现第三种底色。
      changeThemeColor(t.palette.background.default);
    }
    return t;
  }, [prefersDarkMode, preferredTheme, defaultTheme, themes, darkMode]);

  return theme;
};

const removeI18nCache = () => {
  Object.keys(localStorage).forEach(function (key) {
    if (key && key.startsWith("i18next_res_")) {
      localStorage.removeItem(key);
    }
  });
};

const bundleRefreshKey = "storflow_bundle_refreshed";

/**
 * 检查服务端当前的入口包是否已经和页面上运行的包不一致。
 *
 * 自建部署里 Service Worker 会把旧前端包长期留在 CacheStorage 中，导致「后端已经改完，
 * 页面还是旧的」（例如看到已经下线的 Pro 徽标、旧布局）。命中不一致时清掉 Service Worker
 * 与全部 CacheStorage，然后强制刷新一次（每个标签页最多一次，避免刷新循环）。
 */
const checkBundleFreshness = async () => {
  if (!import.meta.env.PROD || typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  let served: string | undefined;
  try {
    // 探测 SPA 的入口 HTML：`/` 现在是 Astro 渲染的官网首页，里面没有入口包引用，
    // 必须挑一个由内嵌 SPA 提供的路径（登录页总是可用，且与登录态无关）。
    const res = await fetch(`/session?bundle=${Date.now()}`, { cache: "no-store" });
    served = (await res.text()).match(/\/assets\/index-[A-Za-z0-9_-]+\.js/)?.[0];
  } catch (e) {
    return;
  }

  const loaded = Array.from(document.querySelectorAll("script[src]"))
    .map((script) => script.getAttribute("src") ?? "")
    .find((src) => /\/assets\/index-[A-Za-z0-9_-]+\.js/.test(src));

  // 按「服务端当前入口包」记一次刷新：同一标签页里连续多次发版也能各自生效，
  // 同时避免刷新循环（刷新后 loaded === served 就不会再进这里）。
  if (!served || !loaded || served === loaded || sessionStorage.getItem(bundleRefreshKey) === served) {
    return;
  }

  sessionStorage.setItem(bundleRefreshKey, served);

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
    if (typeof caches !== "undefined") {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch (e) {
    // 清理失败也继续刷新，至少让页面重新拉一次网络资源。
  }

  // 新包可能带来新的翻译键：连同 i18next 的 localStorage 缓存一起清掉，
  // 否则刷新后仍是旧词条（新键会直接显示成 "store.title" 这样的原始 key）。
  removeI18nCache();

  window.location.reload();
};

export const App = () => {
  const theme = useGeneratedTheme();
  const { t } = useTranslation();

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.log("SW registration error", error);
    },
  });

  // 每次进入应用时校验一次包是否过期（详见 checkBundleFreshness）。
  useEffect(() => {
    void checkBundleFreshness();
  }, []);

  useEffect(() => {
    if (needRefresh) {
      enqueueSnackbar({
        message: i18next.t("common:newVersionRefresh"),
        variant: "default",
        persist: true,
        action: ServiceWorkerUpdateAction(() => {
          updateServiceWorker(true);
          removeI18nCache();
        }),
      });
    }
  }, [needRefresh, updateServiceWorker]);

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ThemeProvider theme={theme}>
        <AppContent />
      </ThemeProvider>
    </Suspense>
  );
};

interface themeOptions {
  [key: string]: singleThemeOption;
}

interface singleThemeOption {
  light: ThemeOptions;
  dark?: ThemeOptions;
}

const getPreferredTheme = (
  opts: themeOptions,
  mode: "dark" | "light",
  preferredTheme?: string,
  defaultTheme?: string,
): ThemeOptions => {
  let themeConfig = {} as singleThemeOption;
  if (defaultTheme && opts[defaultTheme]) {
    themeConfig = opts[defaultTheme];
  }
  if (preferredTheme && opts[preferredTheme]) {
    themeConfig = opts[preferredTheme];
  }

  if (!themeConfig?.light) {
    themeConfig = Object.values(opts)[0];
  }

  if (mode === "dark" && themeConfig.dark) {
    return themeConfig.dark;
  }

  return themeConfig.light;
};

const StyledMaterialDesignContent = styled(MaterialDesignContent)(({ theme }) => ({
  "&.notistack-MuiContent": {
    borderRadius: 12,
  },
  "&.notistack-MuiContent-success": {
    backgroundColor: theme.palette.success.main,
  },
  "&.notistack-MuiContent-error": {
    backgroundColor: theme.palette.error.main,
  },
  "&.notistack-MuiContent-warning": {
    backgroundColor: theme.palette.warning.main,
  },
}));

const AppContent = () => {
  const title = useAppSelector((state) => state.siteConfig.basic.config.title);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const scrollBar = {
    "&::-webkit-scrollbar-button": {
      width: 0,
      height: 0,
    },
    "&::-webkit-scrollbar-corner": {
      background: "0 0",
    },
    "&::-webkit-scrollbar-thumb": {
      borderRadius: 4,
      backgroundColor: "transparent",
    },
    "&::-webkit-scrollbar-track": {
      borderRadius: 4,
    },
    "&::-webkit-scrollbar-track:hover": {
      backgroundColor: theme.palette.action.hover,
    },
    "&::-webkit-scrollbar-thumb:hover": {
      backgroundColor: theme.palette.primary.main + "!important",
    },
    "& :hover::-webkit-scrollbar-thumb,:hover>:first-child::-webkit-scrollbar-thumb": {
      backgroundColor: theme.palette.text.disabled,
    },
    "&::-webkit-scrollbar ": {
      width: 8,
      height: 8,
    },
  };

  useEffect(() => {
    const loader = document.getElementById("app-loader");
    if (loader) loader.style.display = "none";
  }, []);

  return (
    <>
      <CssBaseline />
      <GlobalStyles
        styles={() => ({
          html: {
            scrollbarWidth: isMobile ? "initial" : "thin",
            //scrollbarColor: theme.palette.action.selected + " transparent",
          },
          ...(isMobile ? undefined : scrollBar),
          // 注意：不要在这里全局隐藏 body 的纵向滚动（见 AppMain 的说明）。
          // body 的 overflow 会「传播」到视口（html 为 visible 时），一旦设为 hidden，
          // 公开页面（店铺前台 / 登录页）就无法用滚轮或触控板滚动。
          ".highlight-marker": {
            backgroundColor: "#ffc1079e",
            borderRadius: "4px",
            boxShadow: "0 0 0 2px #ffc1079e",
          },
        })}
      />
      <SnackbarProvider
        anchorOrigin={{
          horizontal: "left",
          vertical: "bottom",
        }}
        Components={{
          success: StyledMaterialDesignContent,
          error: StyledMaterialDesignContent,
          warning: StyledMaterialDesignContent,
          loading: LoadingSnackbar,
          default: StyledMaterialDesignContent,
          file: FileIconSnackbar,
        }}
      >
        <GlobalDialogs />
        <Outlet />
      </SnackbarProvider>
    </>
  );
};
