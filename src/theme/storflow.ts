/**
 * StorFlow design system.
 *
 * 这里是整个控制台视觉的唯一真源：品牌色板、字体、圆角、阴影以及 MUI 组件样式覆盖。
 * App.tsx 用 `storflowThemeOptions()` 生成基础主题，再叠加服务端下发的主题配置
 * （主题配置只负责覆盖 primary/secondary，其余仍由本文件决定）。
 *
 * 约定：
 *  - 所有颜色/尺寸都从 `sf` 令牌取，避免散落魔法值。
 *  - 组件覆盖写成 `mode` 的函数，深浅色各自成立。
 */
import { ThemeOptions } from "@mui/material";
import { alpha } from "@mui/material/styles";

export type StorFlowMode = "light" | "dark";

/** 品牌令牌：深青翡翠（与 StorFlow 图标渐变一致）。 */
export const sf = {
  ink: "#111827",
  inkSoft: "#1A2233",
  inkLine: "#232A3D",
  navy: "#0A0F1F",
  brandDeep: "#2B45C9",
  brand: "#4D6BFE",
  brandBright: "#7C90FF",
  brandSoft: "#A5B4FF",
  brandMist: "#EEF1FF",
  mist: "#F7F8FC",
  surface: "#FFFFFF",
  line: "#E6E8F0",
  text: "#111827",
  textMuted: "#5B6478",
  textFaint: "#9AA3B5",
  darkCanvas: "#0B0E14",
  darkSurface: "#141822",
  darkText: "#E8EAF2",
  darkTextMuted: "#9BA3B5",
  success: "#16A34A",
  warning: "#D97706",
  error: "#DC2626",
  info: "#2563EB",
} as const;

/** 品牌渐变。 */
export const sfGradients = {
  /** 主品牌渐变（logo / 营销面板底图）。 */
  brand: "linear-gradient(135deg, #2B3A8F 0%, #4D6BFE 55%, #7C90FF 100%)",
  /** 强调渐变（按钮 / 进度条 / 高亮条）。 */
  accent: "linear-gradient(120deg, #4D6BFE 0%, #7C90FF 100%)",
  /** 侧边栏面板渐变。 */
  sidebar: "linear-gradient(180deg, #0A0F1F 0%, #131A33 45%, #1B2450 100%)",
  /** 浅色高亮底（选中态 / 标签）。 */
  tint: "linear-gradient(135deg, rgba(77,107,254,0.10) 0%, rgba(124,144,255,0.16) 100%)",
  /** 卡片顶部装饰线。 */
  hairline: "linear-gradient(90deg, rgba(77,107,254,0) 0%, rgba(124,144,255,0.55) 50%, rgba(77,107,254,0) 100%)",
} as const;

/** 阴影：低饱和的中性柔和投影。 */
export const sfShadow = {
  card: "0 1px 2px rgba(17,24,39,0.04), 0 8px 24px -12px rgba(17,24,39,0.10)",
  cardHover: "0 2px 4px rgba(17,24,39,0.05), 0 18px 40px -18px rgba(17,24,39,0.18)",
  float: "0 8px 16px -8px rgba(17,24,39,0.18), 0 24px 56px -24px rgba(17,24,39,0.28)",
  pop: "0 12px 32px -12px rgba(17,24,39,0.24)",
} as const;

/** 圆角令牌。 */
export const sfRadius = {
  control: 10,
  surface: 16,
  panel: 18,
  pill: 999,
} as const;

/** 字体栈：Inter 变量字体优先，中文回落到系统黑体。 */
export const sfFontFamily = [
  '"Inter Variable"',
  "Inter",
  "-apple-system",
  "BlinkMacSystemFont",
  '"Segoe UI"',
  '"PingFang SC"',
  '"Hiragino Sans GB"',
  '"Microsoft YaHei"',
  '"Noto Sans SC"',
  "Roboto",
  '"Helvetica Neue"',
  "Arial",
  "sans-serif",
].join(", ");

/** 等宽字体（代码 / 密钥展示）。 */
export const sfMonoFamily = [
  '"SF Mono"',
  "SFMono-Regular",
  "ui-monospace",
  '"JetBrains Mono"',
  "Menlo",
  "Consolas",
  '"Liberation Mono"',
  "monospace",
].join(", ");

/** 基础色板（服务端主题配置会覆盖 primary / secondary）。 */
export const storflowPalette = (mode: StorFlowMode): ThemeOptions["palette"] => {
  if (mode === "dark") {
    return {
      mode,
      primary: {
        main: sf.brandBright,
        light: sf.brandSoft,
        dark: sf.brand,
        contrastText: "#0A0F1F",
      },
      secondary: {
        main: "#A5B4FC",
        light: "#C7D2FE",
        dark: "#818CF8",
        contrastText: "#0A0F1F",
      },
      background: {
        default: sf.darkCanvas,
        paper: sf.darkSurface,
      },
      text: {
        primary: sf.darkText,
        secondary: sf.darkTextMuted,
        disabled: "#5A6274",
      },
      divider: sf.inkLine,
      success: { main: "#4ADE80" },
      warning: { main: "#FBBF24" },
      error: { main: "#F87171" },
      info: { main: "#60A5FA" },
    };
  }

  return {
    mode,
    primary: {
      main: sf.brand,
      light: sf.brandBright,
      dark: sf.brandDeep,
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: "#6366F1",
      light: "#818CF8",
      dark: "#4338CA",
      contrastText: "#FFFFFF",
    },
    background: {
      default: sf.mist,
      paper: sf.surface,
    },
    text: {
      primary: sf.text,
      secondary: sf.textMuted,
      disabled: sf.textFaint,
    },
    divider: sf.line,
    success: { main: sf.success },
    warning: { main: sf.warning },
    error: { main: sf.error },
    info: { main: sf.info },
  };
};

/** 排版：比 MUI 默认更紧凑、字重更高，标题带负字距。 */
export const storflowTypography: ThemeOptions["typography"] = {
  fontFamily: sfFontFamily,
  fontWeightLight: 300,
  fontWeightRegular: 400,
  fontWeightMedium: 500,
  fontWeightBold: 700,
  h1: { fontSize: "2.125rem", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2 },
  h2: { fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.25 },
  h3: { fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.015em", lineHeight: 1.3 },
  h4: { fontSize: "1.25rem", fontWeight: 650, letterSpacing: "-0.012em", lineHeight: 1.35 },
  h5: { fontSize: "1.0625rem", fontWeight: 650, letterSpacing: "-0.01em", lineHeight: 1.4 },
  h6: { fontSize: "0.95rem", fontWeight: 600, letterSpacing: "-0.005em", lineHeight: 1.45 },
  subtitle1: { fontSize: "0.9rem", fontWeight: 600, lineHeight: 1.5 },
  subtitle2: { fontSize: "0.8125rem", fontWeight: 600, lineHeight: 1.5 },
  body1: { fontSize: "0.9rem", lineHeight: 1.65, letterSpacing: "-0.003em" },
  body2: { fontSize: "0.8125rem", lineHeight: 1.6, letterSpacing: "-0.002em" },
  button: { fontSize: "0.8125rem", fontWeight: 600, letterSpacing: 0, textTransform: "none" },
  caption: { fontSize: "0.75rem", lineHeight: 1.5 },
  overline: {
    fontSize: "0.6875rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
    lineHeight: 1.6,
    textTransform: "uppercase",
  },
};

/**
 * 组件样式覆盖。
 *
 * `themeConfig` 只提供色板，因此这里只做形状/间距/质感，颜色一律走 theme.palette。
 */
export const storflowComponentOverrides = (mode: StorFlowMode): ThemeOptions["components"] => {
  const dark = mode === "dark";
  const canvas = dark ? sf.darkCanvas : sf.mist;
  const surface = dark ? sf.darkSurface : sf.surface;
  const line = dark ? sf.inkLine : sf.line;
  const fieldBg = dark ? alpha("#FFFFFF", 0.03) : alpha(sf.ink, 0.02);
  const fieldBgHover = dark ? alpha("#FFFFFF", 0.06) : alpha(sf.ink, 0.04);

  return {
    MuiCssBaseline: {
      styleOverrides: {
        ":root": {
          colorScheme: dark ? "dark" : "light",
          "--sf-brand-gradient": sfGradients.brand,
          "--sf-accent-gradient": sfGradients.accent,
          "--sf-sidebar-gradient": sfGradients.sidebar,
          "--sf-surface": surface,
          "--sf-canvas": canvas,
          "--sf-line": line,
          "--sf-radius-control": `${sfRadius.control}px`,
          "--sf-radius-surface": `${sfRadius.surface}px`,
          "--sf-shadow-card": sfShadow.card,
          "--sf-shadow-float": sfShadow.float,
        },
        html: {
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
          textRendering: "optimizeLegibility",
        },
        body: {
          backgroundColor: canvas,
          overscrollBehavior: "none",
        },
        "::selection": {
          backgroundColor: alpha(sf.brandBright, dark ? 0.34 : 0.22),
        },
        ":focus-visible": {
          outline: `2px solid ${alpha(sf.brandBright, 0.55)}`,
          outlineOffset: 2,
        },
        code: { fontFamily: sfMonoFamily },
        "kbd, pre, samp": { fontFamily: sfMonoFamily },
        "*::-webkit-scrollbar": { width: 10, height: 10 },
        "*::-webkit-scrollbar-track": { background: "transparent" },
        "*::-webkit-scrollbar-thumb": {
          backgroundColor: dark ? alpha("#FFFFFF", 0.16) : alpha(sf.ink, 0.16),
          borderRadius: sfRadius.pill,
          border: "2px solid transparent",
          backgroundClip: "content-box",
        },
        "*::-webkit-scrollbar-thumb:hover": {
          backgroundColor: dark ? alpha("#FFFFFF", 0.28) : alpha(sf.ink, 0.3),
          backgroundClip: "content-box",
        },
        "*": { scrollbarColor: `${dark ? alpha("#FFFFFF", 0.2) : alpha(sf.ink, 0.2)} transparent` },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: "none",
          borderRadius: sfRadius.surface,
          border: `1px solid ${line}`,
        },
        rounded: { borderRadius: sfRadius.surface },
        elevation1: { boxShadow: sfShadow.card },
        elevation2: { boxShadow: sfShadow.card },
        elevation3: { boxShadow: sfShadow.card },
        elevation4: { boxShadow: sfShadow.float },
        elevation8: { boxShadow: sfShadow.float },
        elevation16: { boxShadow: sfShadow.float },
        elevation24: { boxShadow: sfShadow.float },
      },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: "transparent" },
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backgroundColor: alpha(surface, 0.82),
          backdropFilter: "blur(14px) saturate(160%)",
          color: dark ? sf.darkText : sf.text,
          borderBottom: `1px solid ${line}`,
          boxShadow: "none",
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: { minHeight: 60, "@media (min-width:0px)": { minHeight: 60 } },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          border: "none",
          borderRadius: 0,
          backgroundImage: sfGradients.sidebar,
          backgroundColor: sf.navy,
          color: sf.darkText,
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true, disableRipple: false },
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          borderRadius: sfRadius.control,
          paddingInline: 16,
          minHeight: 36,
          transition:
            "background-color 160ms ease, box-shadow 160ms ease, transform 160ms ease, border-color 160ms ease",
        },
        sizeSmall: { minHeight: 30, paddingInline: 12, fontSize: "0.78rem" },
        sizeLarge: { minHeight: 42, paddingInline: 22, fontSize: "0.875rem" },
        containedPrimary: {
          backgroundImage: sfGradients.accent,
          boxShadow: `0 6px 18px -10px ${alpha(sf.brand, dark ? 0.9 : 0.8)}`,
          "&:hover": {
            backgroundImage: "linear-gradient(120deg, #3A55E8 0%, #6E85FF 100%)",
            boxShadow: `0 10px 24px -10px ${alpha(sf.brand, 0.75)}`,
            transform: "translateY(-1px)",
          },
          "&:active": { transform: "translateY(0)" },
        },
        containedSecondary: { backgroundImage: "linear-gradient(120deg, #4F46E5 0%, #6366F1 100%)" },
        outlined: {
          borderColor: line,
          "&:hover": { borderColor: sf.brandBright, backgroundColor: alpha(sf.brandBright, 0.06) },
        },
        text: { "&:hover": { backgroundColor: alpha(sf.brandBright, dark ? 0.14 : 0.1) } },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: sfRadius.control,
          transition: "background-color 160ms ease, color 160ms ease",
          "&:hover": { backgroundColor: alpha(sf.brandBright, dark ? 0.16 : 0.12) },
        },
        sizeSmall: { padding: 6 },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: sfRadius.control,
          border: `1px solid ${line}`,
          padding: "4px 10px",
          color: dark ? sf.darkTextMuted : sf.textMuted,
          "&.Mui-selected": {
            backgroundColor: alpha(sf.brandBright, dark ? 0.2 : 0.14),
            color: dark ? sf.brandSoft : sf.brandDeep,
            borderColor: alpha(sf.brandBright, 0.5),
            "&:hover": { backgroundColor: alpha(sf.brandBright, dark ? 0.26 : 0.2) },
          },
        },
      },
    },
    MuiToggleButtonGroup: {
      styleOverrides: {
        grouped: { "&:not(:first-of-type)": { marginLeft: 6, borderLeft: `1px solid ${line}` } },
        root: { gap: 0 },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: sfRadius.control,
          transition: "background-color 160ms ease",
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          fontSize: "0.8125rem",
          minHeight: 40,
          letterSpacing: 0,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: { minHeight: 40 },
        indicator: { height: 3, borderRadius: sfRadius.pill, background: sfGradients.accent },
      },
    },
    MuiSkeleton: {
      defaultProps: { animation: "wave" },
      styleOverrides: {
        root: { borderRadius: 8, backgroundColor: dark ? alpha("#FFFFFF", 0.06) : alpha(sf.ink, 0.06) },
      },
    },
    MuiMenu: {
      defaultProps: { slotProps: { paper: { elevation: 0 } } },
      styleOverrides: {
        paper: {
          borderRadius: 14,
          border: `1px solid ${line}`,
          boxShadow: sfShadow.float,
          marginTop: 6,
          minWidth: 180,
        },
        list: { padding: "6px 6px" },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 9,
          margin: "1px 0",
          padding: "8px 10px",
          fontSize: "0.8125rem",
          gap: 10,
          "&.Mui-selected": {
            backgroundColor: alpha(sf.brandBright, dark ? 0.2 : 0.13),
            color: dark ? sf.brandSoft : sf.brandDeep,
            "&:hover": { backgroundColor: alpha(sf.brandBright, dark ? 0.26 : 0.19) },
          },
        },
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: { borderRadius: 14, border: `1px solid ${line}`, boxShadow: sfShadow.float },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: sfRadius.panel, border: `1px solid ${line}`, boxShadow: sfShadow.float },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: { fontSize: "1.0625rem", fontWeight: 650, padding: "18px 24px 10px" },
      },
    },
    MuiDialogContent: {
      styleOverrides: { root: { paddingTop: 0 } },
    },
    MuiDialogActions: {
      styleOverrides: { root: { padding: "12px 20px 18px" } },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: sfRadius.surface,
          border: `1px solid ${line}`,
          boxShadow: sfShadow.card,
          transition: "box-shadow 200ms ease, transform 200ms ease, border-color 200ms ease",
        },
      },
    },
    MuiCardActionArea: {
      styleOverrides: { root: { borderRadius: sfRadius.surface } },
    },
    MuiAccordion: {
      defaultProps: { elevation: 0, disableGutters: true },
      styleOverrides: {
        root: {
          border: `1px solid ${line}`,
          borderRadius: `${sfRadius.surface}px !important`,
          boxShadow: "none",
          backgroundImage: "none",
          "&:before": { display: "none" },
          "&.Mui-expanded": { margin: 0 },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
          fontSize: "0.75rem",
          height: 24,
        },
        sizeSmall: { height: 22, fontSize: "0.72rem" },
        label: { paddingInline: 8 },
        filledPrimary: {
          backgroundColor: alpha(sf.brandBright, dark ? 0.22 : 0.14),
          color: dark ? sf.brandSoft : sf.brandDeep,
        },
      },
    },
    MuiTextField: {
      defaultProps: { size: "small", variant: "outlined" },
    },
    MuiFormControl: {
      defaultProps: { size: "small" },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: sfRadius.control,
          backgroundColor: fieldBg,
          transition: "background-color 160ms ease, box-shadow 160ms ease",
          "& .MuiOutlinedInput-notchedOutline": { borderColor: line },
          "&:hover": { backgroundColor: fieldBgHover },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: alpha(sf.brandBright, 0.55) },
          "&.Mui-focused": {
            backgroundColor: dark ? alpha("#FFFFFF", 0.05) : "#FFFFFF",
            boxShadow: `0 0 0 3px ${alpha(sf.brandBright, dark ? 0.22 : 0.18)}`,
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: sf.brandBright, borderWidth: 1 },
        },
        input: { fontSize: "0.85rem" },
        multiline: { padding: 0 },
      },
    },
    MuiFilledInput: {
      styleOverrides: {
        root: {
          borderRadius: sfRadius.control,
          backgroundColor: fieldBg,
          "&::before, &::after": { borderBottom: "none" },
          "&:hover:not(.Mui-disabled, .Mui-error):before": { borderBottom: "none" },
          "&.Mui-focused": { backgroundColor: dark ? alpha("#FFFFFF", 0.05) : "#FFFFFF" },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: { fontSize: "0.85rem" },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: { fontSize: "0.8125rem", fontWeight: 500 },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: { fontSize: "0.8125rem", fontWeight: 600 },
      },
    },
    MuiFormHelperText: {
      styleOverrides: { root: { fontSize: "0.72rem", marginLeft: 4, lineHeight: 1.5 } },
    },
    MuiSelect: {
      styleOverrides: { select: { fontSize: "0.85rem" } },
    },
    MuiAutocomplete: {
      styleOverrides: {
        paper: { borderRadius: 14, border: `1px solid ${line}`, boxShadow: sfShadow.float },
        option: { borderRadius: 9, margin: "1px 4px", fontSize: "0.8125rem" },
        inputRoot: { borderRadius: sfRadius.control },
      },
    },
    MuiTableContainer: {
      styleOverrides: { root: { borderRadius: sfRadius.surface } },
    },
    MuiTable: {
      styleOverrides: { root: { borderCollapse: "separate", borderSpacing: 0 } },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          "& .MuiTableCell-root": {
            backgroundColor: dark ? alpha("#FFFFFF", 0.03) : alpha(sf.ink, 0.02),
            color: dark ? sf.darkTextMuted : sf.textMuted,
            fontSize: "0.7rem",
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            borderBottom: `1px solid ${line}`,
            whiteSpace: "nowrap",
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${line}`,
          padding: "10px 14px",
          fontSize: "0.8125rem",
        },
        sizeSmall: { padding: "6px 10px" },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: "background-color 140ms ease",
          "&:hover": { backgroundColor: alpha(sf.brandBright, dark ? 0.07 : 0.05) },
          "&.Mui-selected": {
            backgroundColor: alpha(sf.brandBright, dark ? 0.14 : 0.1),
            "&:hover": { backgroundColor: alpha(sf.brandBright, dark ? 0.18 : 0.14) },
          },
        },
      },
    },
    MuiTooltip: {
      defaultProps: { enterDelay: 500, arrow: false },
      styleOverrides: {
        tooltip: {
          backgroundColor: dark ? sf.darkText : sf.ink,
          color: dark ? sf.ink : "#FFFFFF",
          borderRadius: 8,
          fontSize: "0.72rem",
          fontWeight: 500,
          padding: "6px 10px",
          boxShadow: sfShadow.pop,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          height: 6,
          borderRadius: sfRadius.pill,
          backgroundColor: dark ? alpha("#FFFFFF", 0.08) : alpha(sf.ink, 0.07),
        },
        bar: { borderRadius: sfRadius.pill, backgroundImage: sfGradients.accent },
      },
    },
    MuiCircularProgress: {
      styleOverrides: { circle: { strokeLinecap: "round" } },
    },
    MuiSwitch: {
      styleOverrides: {
        root: { padding: 8 },
        track: { borderRadius: sfRadius.pill, opacity: dark ? 0.28 : 0.22 },
        thumb: { boxShadow: "0 2px 6px rgba(17,24,39,0.25)" },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: { height: 4 },
        rail: { borderRadius: sfRadius.pill, opacity: 0.3 },
        track: { border: "none", backgroundImage: sfGradients.accent },
        thumb: { boxShadow: `0 0 0 4px ${alpha(sf.brandBright, 0.18)}` },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 12, border: `1px solid ${line}`, fontSize: "0.8125rem", alignItems: "center" },
        standardSuccess: {
          backgroundColor: alpha(sf.success, dark ? 0.16 : 0.09),
          color: dark ? "#6EE7B7" : "#065F46",
        },
        standardInfo: { backgroundColor: alpha(sf.info, dark ? 0.16 : 0.09), color: dark ? "#7DD3FC" : "#075985" },
        standardWarning: {
          backgroundColor: alpha(sf.warning, dark ? 0.16 : 0.11),
          color: dark ? "#FCD34D" : "#92400E",
        },
        standardError: { backgroundColor: alpha(sf.error, dark ? 0.16 : 0.08), color: dark ? "#FCA5A5" : "#991B1B" },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: { borderRadius: 12, fontWeight: 600, fontSize: "0.85rem" },
      },
    },
    MuiAvatarGroup: {
      styleOverrides: { avatar: { borderColor: surface } },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: line } },
    },
    MuiLink: {
      defaultProps: { underline: "hover" },
      styleOverrides: {
        root: { fontWeight: 500, textUnderlineOffset: 3 },
      },
    },
    MuiBreadcrumbs: {
      styleOverrides: { separator: { color: dark ? sf.darkTextMuted : sf.textFaint } },
    },
    MuiPagination: {
      styleOverrides: { root: { "& .MuiPaginationItem-root": { borderRadius: 9 } } },
    },
    MuiBadge: {
      styleOverrides: {
        badge: { fontWeight: 700, fontSize: "0.68rem", border: `2px solid ${surface}` },
      },
    },
    MuiBackdrop: {
      styleOverrides: {
        root: { backgroundColor: alpha(sf.ink, 0.42), backdropFilter: "blur(3px)" },
      },
    },
    MuiFab: {
      styleOverrides: { root: { borderRadius: 16, boxShadow: sfShadow.float } },
    },
    MuiSnackbarContent: {
      styleOverrides: { root: { borderRadius: 12, fontSize: "0.8125rem" } },
    },
    MuiListItemText: {
      styleOverrides: { primary: { fontSize: "0.8125rem" }, secondary: { fontSize: "0.72rem" } },
    },
    MuiFormControlLabel: {
      styleOverrides: { label: { fontSize: "0.8125rem" } },
    },
    MuiRadio: {
      styleOverrides: { root: { padding: 6 } },
    },
    MuiCheckbox: {
      styleOverrides: { root: { padding: 6, borderRadius: 6 } },
    },
    MuiSvgIcon: {
      styleOverrides: { fontSizeSmall: { fontSize: "1.1rem" } },
    },
    MuiSpeedDial: {
      styleOverrides: { fab: { borderRadius: 16 } },
    },
    MuiStepper: {
      styleOverrides: { root: { padding: "12px 0" } },
    },
    MuiStepLabel: {
      styleOverrides: { label: { fontSize: "0.8125rem", fontWeight: 600 } },
    },
    MuiImageListItemBar: {
      styleOverrides: { root: { borderRadius: "0 0 12px 12px" } },
    },
  } as ThemeOptions["components"];
};

/**
 * 把 StorFlow 设计系统应用到一份 ThemeOptions 上。
 *
 * 传入的 `themeConfig` 可以来自服务端主题设置（只含 primary/secondary），
 * 也可以来自管理端的主题预览，这里只补齐 shape / typography / components 并保证色板完整。
 */
export const applyStorFlowTheme = (
  themeConfig: ThemeOptions,
  mode: StorFlowMode = themeConfig.palette?.mode === "dark" ? "dark" : "light",
): ThemeOptions => {
  const base = storflowPalette(mode);
  // 服务端下发的 typography 允许是回调形式，这里只吃对象形态。
  const typographyConfig = typeof themeConfig.typography === "function" ? undefined : themeConfig.typography;
  return {
    ...themeConfig,
    shape: { borderRadius: sfRadius.control, ...themeConfig.shape },
    // 顶部工具栏统一 60px，DrawerHeaderContainer 的占位（theme.mixins.toolbar）必须一致。
    mixins: {
      ...themeConfig.mixins,
      toolbar: { minHeight: 60, ...themeConfig.mixins?.toolbar },
    },
    typography: {
      ...storflowTypography,
      ...typographyConfig,
      fontFamily: typographyConfig?.fontFamily ?? sfFontFamily,
    },
    palette: {
      ...base,
      ...themeConfig.palette,
      mode,
      background: { ...base?.background, ...themeConfig.palette?.background },
      text: { ...base?.text, ...themeConfig.palette?.text },
      primary: { ...base?.primary, ...themeConfig.palette?.primary },
      secondary: { ...base?.secondary, ...themeConfig.palette?.secondary },
    },
    components: {
      ...storflowComponentOverrides(mode),
      ...themeConfig.components,
    },
  };
};
