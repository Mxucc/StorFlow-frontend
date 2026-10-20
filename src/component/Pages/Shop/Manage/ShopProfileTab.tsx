import {
  Alert,
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useSnackbar } from "notistack";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppError } from "../../../../api/request.ts";
import {
  setShopStatus,
  ShopLayoutSections,
  ShopTheme,
  ShopThemeLink,
  ShopView,
  updateShop,
  uploadShopAsset,
} from "../../../../api/shop.ts";
import { useAppDispatch } from "../../../../redux/hooks.ts";
import ShopImageField, { ShopImageShape } from "../../../Common/Shop/ShopImageField.tsx";
import { DefaultCloseAction } from "../../../Common/Snackbar/snackbar.tsx";
import { SecondaryButton } from "../../../Common/StyledComponents.tsx";
import Add from "../../../Icons/Add.tsx";
import Sparkle from "../../../Icons/Sparkle.tsx";
import CaretDown from "../../../Icons/CaretDown.tsx";
import CaretRight from "../../../Icons/CaretRight.tsx";
import Delete from "../../../Icons/Delete.tsx";
import { CopyableText, InfoRow } from "../ShopShared.tsx";
import { defaultShopBackground, defaultShopBanner, defaultShopLogo } from "../shopAssets.ts";
import { SHOP_TEMPLATE_NAMES } from "../ShopTemplates.ts";
import { copyToClipboard } from "../../../../util";

/** 模版列表与前台共用一份来源（ShopTemplates.ts），避免装修页与前台枚举漂移。 */
const templates = SHOP_TEMPLATE_NAMES;

/** 小店控制台统一的卡片容器：白底 + 细分隔线 + 12px 圆角。 */
const cardSx = {
  border: "1px solid",
  borderColor: "divider",
  borderRadius: 3,
  bgcolor: "background.paper",
  p: { xs: 2, md: 3 },
  display: "flex",
  flexDirection: "column",
  gap: 2,
  minWidth: 0,
} as const;

/** 表单字段统一使用 outlined + small：与页面里的只读信息框视觉一致。 */
const fieldProps = { variant: "outlined", size: "small", fullWidth: true } as const;

const ColorField = ({
  label,
  value,
  onChange,
  helperText,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helperText?: string;
}) => (
  <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
    <Box
      component={"input"}
      type={"color"}
      aria-label={label}
      value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#377dff"}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      sx={{
        width: 40,
        height: 40,
        p: 0,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: "10px",
        bgcolor: "transparent",
        cursor: "pointer",
        flexShrink: 0,
      }}
    />
    <TextField
      {...fieldProps}
      label={label}
      placeholder={"#377dff"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      helperText={helperText}
      FormHelperTextProps={{ sx: { mx: 0 } }}
      inputProps={{ maxLength: 7 }}
      error={value !== "" && !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)}
    />
  </Box>
);

const ShopProfileTab = ({ shop, onUpdated }: { shop: ShopView; onUpdated: (shop: ShopView) => void }) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useSnackbar();

  const [name, setName] = useState(shop.name);
  const [slug, setSlug] = useState(shop.slug);
  const [description, setDescription] = useState(shop.description ?? "");
  const [avatar, setAvatar] = useState(shop.avatar ?? "");
  const [cover, setCover] = useState(shop.cover ?? "");
  const [referrerRate, setReferrerRate] = useState(shop.referrer_rate?.toString() ?? "0");
  const [theme, setTheme] = useState<ShopTheme>(shop.theme ?? {});
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [linksOpen, setLinksOpen] = useState(false);
  const [applyingDefaults, setApplyingDefaults] = useState(false);

  useEffect(() => {
    setName(shop.name);
    setSlug(shop.slug);
    setDescription(shop.description ?? "");
    setAvatar(shop.avatar ?? "");
    setCover(shop.cover ?? "");
    setReferrerRate(shop.referrer_rate?.toString() ?? "0");
    setTheme(shop.theme ?? {});
  }, [shop]);

  const layout = useMemo(() => {
    const configured = (theme.layout ?? []).filter((section) =>
      (ShopLayoutSections as readonly string[]).includes(section),
    );
    const missing = ShopLayoutSections.filter((section) => !configured.includes(section));
    return [...configured, ...missing];
  }, [theme.layout]);

  const patchTheme = (patch: Partial<ShopTheme>) => setTheme((prev) => ({ ...prev, ...patch }));

  /**
   * 一键套用内置默认素材：把 `/static/img/shop/*` 走一遍正常上传，得到站内素材 URL 后
   * 写进装修字段。这样「默认图」与卖家自己上传的图完全同构，保存后立刻可在前台看到。
   */
  const applyDefaultAssets = () => {
    setApplyingDefaults(true);
    setError(undefined);
    const sources: { key: "logo" | "banner" | "background_image"; url: string; name: string }[] = [
      { key: "logo", url: defaultShopLogo, name: "shop-default-logo.webp" },
      { key: "banner", url: defaultShopBanner, name: "shop-default-banner.jpg" },
      { key: "background_image", url: defaultShopBackground, name: "shop-default-background.jpg" },
    ];
    Promise.all(
      sources.map(async (source) => {
        const res = await fetch(source.url);
        if (!res.ok) {
          throw new AppError({ code: res.status, msg: t("shop.manage.theme.applyDefaultsFailed"), data: null });
        }
        const blob = await res.blob();
        const file = new File([blob], source.name, { type: blob.type || "image/jpeg" });
        const asset = await dispatch(uploadShopAsset(file));
        return { key: source.key, url: asset.url };
      }),
    )
      .then((results) => {
        const patch: Partial<ShopTheme> = {};
        results.forEach((item) => {
          patch[item.key] = item.url;
        });
        patchTheme(patch);
        enqueueSnackbar({
          message: t("shop.manage.theme.applyDefaultsDone"),
          variant: "success",
          action: DefaultCloseAction,
        });
      })
      .catch((e) => setError(e instanceof AppError ? e.message : t("shop.manage.theme.applyDefaultsFailed")))
      .finally(() => setApplyingDefaults(false));
  };

  const toggleSection = (section: string, enabled: boolean) => {
    const enabledSections = layout.filter((item) => (item === section ? enabled : (theme.layout ?? []).includes(item)));
    patchTheme({ layout: enabledSections });
  };

  const moveSection = (section: string, direction: -1 | 1) => {
    const enabledSections = layout.filter((item) => (theme.layout ?? []).includes(item));
    const index = enabledSections.indexOf(section);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= enabledSections.length) {
      return;
    }
    const next = [...enabledSections];
    [next[index], next[target]] = [next[target], next[index]];
    patchTheme({ layout: next });
  };

  const setLink = (index: number, patch: Partial<ShopThemeLink>) => {
    const links = [...(theme.links ?? [])];
    links[index] = { ...links[index], ...patch };
    patchTheme({ links });
  };

  const save = () => {
    if (!name.trim()) {
      setError(t("shop.manage.create.nameRequired"));
      return;
    }
    const rate = Number(referrerRate);
    if (!Number.isInteger(rate) || rate < 0 || rate > 10000) {
      setError(t("shop.manage.profile.rateInvalid"));
      return;
    }
    setSaving(true);
    setError(undefined);
    dispatch(
      updateShop({
        name: name.trim(),
        slug: slug.trim(),
        description,
        avatar,
        cover,
        referrer_rate: rate,
        theme: {
          ...theme,
          layout: layout.filter((section) => (theme.layout ?? []).includes(section)),
          links: (theme.links ?? []).filter((link) => link.label.trim() && link.url.trim()),
        },
      }),
    )
      .then((res) => {
        onUpdated(res);
        enqueueSnackbar({
          message: t("shop.manage.profile.saved"),
          variant: "success",
          action: DefaultCloseAction,
        });
      })
      .catch((e) => setError(e instanceof AppError ? e.message : t("shop.manage.profile.saveFailed")))
      .finally(() => setSaving(false));
  };

  const toggleStatus = () => {
    const nextEnabled = shop.status !== "active";
    setToggling(true);
    dispatch(setShopStatus(nextEnabled))
      .then((res) => {
        onUpdated(res);
        enqueueSnackbar({
          message: nextEnabled ? t("shop.manage.profile.opened") : t("shop.manage.profile.closed"),
          variant: "success",
          action: DefaultCloseAction,
        });
      })
      .finally(() => setToggling(false));
  };

  const storeURL = shop.url || `${window.location.origin}/shop/${shop.slug}`;

  return (
    <Box sx={{ maxWidth: 1080, mx: "auto", width: "100%" }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) 300px" },
          gap: 3,
          alignItems: "start",
        }}
      >
        {/* 左列：资料 + 装修 + 布局 + 链接 */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
          <Box sx={cardSx}>
            <Box>
              <Typography variant={"subtitle1"} sx={{ fontWeight: 600 }}>
                {t("shop.manage.profile.basic")}
              </Typography>
              <Typography variant={"caption"} color={"text.secondary"}>
                {t("shop.manage.profile.basicHint")}
              </Typography>
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
              <TextField
                {...fieldProps}
                required
                label={t("shop.manage.fields.name")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                inputProps={{ maxLength: 64 }}
              />
              <TextField
                {...fieldProps}
                label={t("shop.manage.fields.slug")}
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                inputProps={{ maxLength: 64 }}
                helperText={t("shop.manage.create.slugHint")}
                FormHelperTextProps={{ sx: { mx: 0 } }}
              />
            </Box>
            <TextField
              {...fieldProps}
              multiline
              minRows={3}
              label={t("shop.manage.fields.description")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              inputProps={{ maxLength: 512 }}
            />
            <ShopImageField
              label={t("shop.manage.fields.avatar")}
              shape={ShopImageShape.square}
              value={avatar}
              onChange={setAvatar}
              helperText={t("shop.manage.fields.imageHint")}
            />
            <ShopImageField
              label={t("shop.manage.fields.cover")}
              shape={ShopImageShape.banner}
              value={cover}
              onChange={setCover}
              helperText={t("shop.manage.fields.imageHint")}
            />
            <Box sx={{ maxWidth: 320 }}>
              <TextField
                {...fieldProps}
                label={t("shop.manage.profile.referrerRate")}
                value={referrerRate}
                onChange={(e) => setReferrerRate(e.target.value.replace(/[^\d]/g, ""))}
                inputProps={{ inputMode: "numeric" }}
                helperText={t("shop.manage.profile.referrerRateHint")}
                FormHelperTextProps={{ sx: { mx: 0 } }}
              />
            </Box>
          </Box>

          <Box sx={cardSx}>
            <Box>
              <Typography variant={"subtitle1"} sx={{ fontWeight: 600 }}>
                {t("shop.manage.profile.decoration")}
              </Typography>
              <Typography variant={"caption"} color={"text.secondary"}>
                {t("shop.manage.profile.decorationHint")}
              </Typography>
            </Box>

            <Box>
              <Typography variant={"body2"} color={"text.secondary"} sx={{ mb: 1 }}>
                {t("shop.manage.theme.template")}
              </Typography>
              <Box
                role={"radiogroup"}
                aria-label={t("shop.manage.theme.template")}
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" },
                  gap: 1,
                  alignItems: "stretch",
                }}
              >
                {templates.map((item) => {
                  const selected = theme.template === item || (!theme.template && item === "default");
                  return (
                    <Box
                      key={item}
                      component={"button"}
                      type={"button"}
                      role={"radio"}
                      aria-checked={selected}
                      onClick={() => patchTheme({ template: item })}
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        gap: 0.5,
                        m: 0,
                        p: 1.5,
                        minWidth: 0,
                        textAlign: "left",
                        font: "inherit",
                        color: "text.primary",
                        cursor: "pointer",
                        borderRadius: 2,
                        border: "1px solid",
                        borderColor: selected ? "primary.main" : "divider",
                        bgcolor: selected ? "action.selected" : "background.paper",
                        transition:
                          "border-color 140ms cubic-bezier(0.2, 0.8, 0.2, 1), background-color 140ms cubic-bezier(0.2, 0.8, 0.2, 1)",
                        "&:hover": { borderColor: "primary.main" },
                        "&:active": { bgcolor: "action.hover" },
                        "&:focus-visible": {
                          outline: "2px solid",
                          outlineColor: "primary.main",
                          outlineOffset: 2,
                        },
                        "@media (prefers-reduced-motion: reduce)": { transition: "none" },
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, width: "100%", minWidth: 0 }}>
                        <Typography variant={"body2"} sx={{ fontWeight: 600 }}>
                          {t(`shop.manage.theme.templateOptions.${item}`)}
                        </Typography>
                        {selected && (
                          <Typography
                            variant={"caption"}
                            sx={{
                              ml: "auto",
                              px: 0.75,
                              borderRadius: "999px",
                              bgcolor: "primary.main",
                              color: "primary.contrastText",
                              fontWeight: 600,
                              lineHeight: 1.6,
                              flexShrink: 0,
                            }}
                          >
                            {t("shop.manage.theme.templateCurrent")}
                          </Typography>
                        )}
                      </Box>
                      <Typography
                        variant={"caption"}
                        color={"text.secondary"}
                        sx={{ display: "block", overflowWrap: "anywhere" }}
                      >
                        {t(`shop.manage.theme.templateHints.${item}`)}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
              <ColorField
                label={t("shop.manage.theme.primaryColor")}
                value={theme.primary_color ?? ""}
                onChange={(value) => patchTheme({ primary_color: value })}
                helperText={t("shop.manage.theme.colorHint")}
              />
              <ColorField
                label={t("shop.manage.theme.backgroundColor")}
                value={theme.background_color ?? ""}
                onChange={(value) => patchTheme({ background_color: value })}
                helperText={t("shop.manage.theme.colorHint")}
              />
            </Box>

            <ShopImageField
              label={t("shop.manage.theme.logo")}
              shape={ShopImageShape.square}
              value={theme.logo ?? ""}
              onChange={(value) => patchTheme({ logo: value })}
              helperText={t("shop.manage.theme.urlHint")}
            />
            <ShopImageField
              label={t("shop.manage.theme.banner")}
              shape={ShopImageShape.banner}
              value={theme.banner ?? ""}
              onChange={(value) => patchTheme({ banner: value })}
              helperText={t("shop.manage.theme.urlHint")}
            />
            <ShopImageField
              label={t("shop.manage.theme.backgroundImage")}
              shape={ShopImageShape.banner}
              value={theme.background_image ?? ""}
              onChange={(value) => patchTheme({ background_image: value })}
              helperText={t("shop.manage.theme.urlHint")}
            />

            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              <SecondaryButton
                variant={"contained"}
                startIcon={<Sparkle />}
                disabled={applyingDefaults}
                onClick={applyDefaultAssets}
              >
                {t("shop.manage.theme.applyDefaults")}
              </SecondaryButton>
              <Typography variant={"caption"} color={"text.secondary"} sx={{ overflowWrap: "anywhere" }}>
                {t("shop.manage.theme.applyDefaultsHint")}
              </Typography>
            </Box>
            <TextField
              {...fieldProps}
              label={t("shop.manage.theme.slogan")}
              value={theme.slogan ?? ""}
              onChange={(e) => patchTheme({ slogan: e.target.value })}
              inputProps={{ maxLength: 512 }}
            />
            <TextField
              {...fieldProps}
              multiline
              minRows={2}
              label={t("shop.manage.theme.notice")}
              value={theme.notice ?? ""}
              onChange={(e) => patchTheme({ notice: e.target.value })}
              inputProps={{ maxLength: 512 }}
            />
            <TextField
              {...fieldProps}
              multiline
              minRows={2}
              label={t("shop.manage.theme.footer")}
              value={theme.footer ?? ""}
              onChange={(e) => patchTheme({ footer: e.target.value })}
              inputProps={{ maxLength: 512 }}
            />
          </Box>

          <Box sx={cardSx}>
            <Typography variant={"subtitle1"} sx={{ fontWeight: 600 }}>
              {t("shop.manage.theme.layout")}
            </Typography>
            <Box
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                p: 1,
                display: "flex",
                flexDirection: "column",
              }}
            >
              {layout.map((section, index) => {
                const included = (theme.layout ?? []).includes(section);
                const enabledOrder = layout.filter((item) => (theme.layout ?? []).includes(item));
                const enabledIndex = enabledOrder.indexOf(section);
                return (
                  <Box
                    key={section}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      px: 1,
                      py: 0.5,
                      borderRadius: 1.5,
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                  >
                    <FormControlLabel
                      sx={{ flexGrow: 1, minWidth: 0, m: 0 }}
                      control={
                        <Checkbox
                          size={"small"}
                          checked={included}
                          onChange={(e) => toggleSection(section, e.target.checked)}
                        />
                      }
                      label={
                        <Typography variant={"body2"}>
                          {t(`shop.manage.theme.sections.${section}`)}
                          {included ? ` · ${enabledIndex + 1}` : ""}
                        </Typography>
                      }
                    />
                    {included && (
                      <>
                        <IconButton
                          size={"small"}
                          disabled={enabledIndex <= 0}
                          aria-label={t("shop.manage.theme.moveUp")}
                          onClick={() => moveSection(section, -1)}
                        >
                          <CaretDown sx={{ fontSize: 18, transform: "rotate(180deg)" }} />
                        </IconButton>
                        <IconButton
                          size={"small"}
                          disabled={enabledIndex === enabledOrder.length - 1}
                          aria-label={t("shop.manage.theme.moveDown")}
                          onClick={() => moveSection(section, 1)}
                        >
                          <CaretDown sx={{ fontSize: 18 }} />
                        </IconButton>
                      </>
                    )}
                    <Typography variant={"caption"} color={"text.secondary"} sx={{ width: 28, textAlign: "right" }}>
                      #{index + 1}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>

          <Box sx={cardSx}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              <Typography variant={"subtitle1"} sx={{ fontWeight: 600, flexGrow: 1 }}>
                {t("shop.manage.theme.links")}
              </Typography>
              <Button
                size={"small"}
                startIcon={<CaretRight sx={{ fontSize: 16 }} />}
                onClick={() => setLinksOpen((v) => !v)}
              >
                {linksOpen ? t("shop.manage.theme.collapse") : t("shop.manage.theme.expand")}
              </Button>
              <Button
                size={"small"}
                startIcon={<Add sx={{ fontSize: 16 }} />}
                disabled={(theme.links ?? []).length >= 12}
                onClick={() => patchTheme({ links: [...(theme.links ?? []), { label: "", url: "" }] })}
              >
                {t("shop.manage.theme.addLink")}
              </Button>
            </Box>
            {linksOpen && (
              <Stack spacing={1.5}>
                {(theme.links ?? []).length === 0 && (
                  <Typography variant={"caption"} color={"text.secondary"}>
                    {t("shop.manage.theme.noLinks")}
                  </Typography>
                )}
                {(theme.links ?? []).map((link, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "minmax(0, 1fr) 40px", sm: "minmax(0, 160px) minmax(0, 1fr) 40px" },
                      gap: 1,
                      alignItems: "center",
                    }}
                  >
                    <TextField
                      {...fieldProps}
                      label={t("shop.manage.theme.linkLabel")}
                      value={link.label}
                      onChange={(e) => setLink(index, { label: e.target.value })}
                      inputProps={{ maxLength: 32 }}
                    />
                    <TextField
                      {...fieldProps}
                      label={t("shop.manage.theme.linkUrl")}
                      value={link.url}
                      onChange={(e) => setLink(index, { url: e.target.value })}
                      error={link.url !== "" && !/^https?:\/\/.+/.test(link.url)}
                      helperText={
                        link.url !== "" && !/^https?:\/\/.+/.test(link.url) ? t("shop.manage.theme.urlHint") : undefined
                      }
                      FormHelperTextProps={{ sx: { mx: 0 } }}
                    />
                    <IconButton
                      aria-label={t("shop.manage.theme.removeLink")}
                      onClick={() => patchTheme({ links: (theme.links ?? []).filter((_, i) => i !== index) })}
                    >
                      <Delete sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        </Box>

        {/* 右列：保存 + 店铺状态，滚动时跟随 */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, position: { lg: "sticky" }, top: { lg: 88 } }}>
          <Box sx={cardSx}>
            <Stack spacing={1}>
              <Button variant={"contained"} onClick={save} disabled={saving} fullWidth>
                {t("shop.manage.profile.save")}
              </Button>
              <SecondaryButton
                variant={"outlined"}
                fullWidth
                onClick={() => window.location.assign(`/shop/${shop.slug}`)}
              >
                {t("shop.manage.viewStore")}
              </SecondaryButton>
            </Stack>
            {error && (
              <Alert severity={"error"} sx={{ borderRadius: 2 }}>
                {error}
              </Alert>
            )}
          </Box>

          <Box sx={cardSx}>
            <Typography variant={"subtitle1"} sx={{ fontWeight: 600 }}>
              {t("shop.manage.profile.statusTitle")}
            </Typography>
            <Box>
              <InfoRow label={t("shop.manage.profile.status")}>
                <Typography variant={"body2"}>
                  {shop.status === "active"
                    ? t("shop.manage.profile.statusActive")
                    : t("shop.manage.profile.statusDisabled")}
                </Typography>
              </InfoRow>
              <InfoRow label={t("shop.manage.profile.products")}>
                <Typography variant={"body2"}>{shop.product_count}</Typography>
              </InfoRow>
              <InfoRow label={t("shop.manage.profile.sales")}>
                <Typography variant={"body2"}>{shop.sales}</Typography>
              </InfoRow>
            </Box>
            <Divider />
            <Box>
              <Typography variant={"caption"} color={"text.secondary"}>
                {t("shop.manage.profile.storeUrl")}
              </Typography>
              <CopyableText
                text={storeURL}
                onCopy={() => copyToClipboard(storeURL)}
                copyLabel={t("shop.manage.profile.copyLink")}
                copiedLabel={t("shop.manage.profile.copied")}
              />
            </Box>
            <Box>
              <Button
                fullWidth
                variant={shop.status === "active" ? "outlined" : "contained"}
                color={shop.status === "active" ? "warning" : "primary"}
                disabled={toggling}
                onClick={toggleStatus}
              >
                {shop.status === "active" ? t("shop.manage.profile.closeShop") : t("shop.manage.profile.openShop")}
              </Button>
              <Typography variant={"caption"} color={"text.secondary"} sx={{ display: "block", mt: 1 }}>
                {t("shop.manage.profile.statusHint")}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default ShopProfileTab;
