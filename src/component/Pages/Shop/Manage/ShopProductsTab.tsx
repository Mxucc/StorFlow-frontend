import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { useSnackbar } from "notistack";
import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getFileInfo } from "../../../../api/api.ts";
import { FileType } from "../../../../api/explorer.ts";
import { AppError } from "../../../../api/request.ts";
import {
  createShopProduct,
  displayMoney,
  formatMoney,
  getStorefrontProduct,
  listShopProducts,
  parseMoney,
  setShopProductStatus,
  signShopProductAsset,
  ShopDescriptionVisibility,
  ShopProductProps,
  ShopProductSummary,
  ShopProductStatus,
  ShopView,
  updateShopProduct,
} from "../../../../api/shop.ts";
import ShopImageField, { ShopImageShape } from "../../../Common/Shop/ShopImageField.tsx";
import { useAppDispatch } from "../../../../redux/hooks.ts";
import { selectPath } from "../../../../redux/thunks/dialog.ts";
import { DenseFilledTextField, DenseSelect, SecondaryButton } from "../../../Common/StyledComponents.tsx";
import { SquareMenuItem } from "../../../FileManager/ContextMenu/ContextMenu.tsx";
import { DefaultCloseAction } from "../../../Common/Snackbar/snackbar.tsx";
import Add from "../../../Icons/Add.tsx";
import ArrowClockwise from "../../../Icons/ArrowClockwise.tsx";
import Folder from "../../../Icons/Folder.tsx";
import Edit from "../../../Icons/Edit.tsx";
import { Money, ProductStatusChip, ShopEmpty, useUnixTime } from "../ShopShared.tsx";
import CrUri, { Filesystem } from "../../../../util/uri.ts";
import type { MDXEditorMethods } from "@mdxeditor/editor";

// mdxeditor 体积不小，只有打开商品编辑对话框时才需要它。
const MarkdownEditor = lazy(() => import("../../../Viewers/MarkdownEditor/Editor.tsx"));

interface ProductFormState {
  uri: string;
  name: string;
  description: string;
  cover: string;
  price: string;
  status: string;
  summary: string;
  tags: string;
  transfer_name: string;
  allow_preview: boolean;
  preview_limit: string;
  sort: string;
  discount: string;
  discount_end: string;
  /** 商品介绍里嵌的素材可见范围。 */
  description_visibility: ShopDescriptionVisibility;
}

const emptyForm: ProductFormState = {
  uri: "",
  name: "",
  description: "",
  cover: "",
  price: "",
  status: ShopProductStatus.onsale,
  summary: "",
  tags: "",
  transfer_name: "",
  allow_preview: true,
  preview_limit: "",
  sort: "0",
  discount: "0",
  discount_end: "",
  description_visibility: "public",
};

const toLocalInput = (unix?: number) => {
  if (!unix) {
    return "";
  }
  const date = new Date(unix * 1000);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`;
};

const fromLocalInput = (value: string) => {
  if (!value) {
    return 0;
  }
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : Math.floor(time / 1000);
};

const ShopProductsTab = ({ shop }: { shop: ShopView }) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const formatTime = useUnixTime();

  const [products, setProducts] = useState<ShopProductSummary[] | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState<string | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ShopProductSummary | undefined>();
  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [formError, setFormError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [picking, setPicking] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(undefined);
    dispatch(listShopProducts({ limit: 100, offset: 0 }))
      .then((res) => setProducts(res ?? []))
      .catch((e) => {
        setProducts([]);
        setError(e instanceof AppError ? e.message : t("shop.manage.products.loadFailed"));
      })
      .finally(() => setLoading(false));
  }, [dispatch, t]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(undefined);
    setForm(emptyForm);
    setFormError(undefined);
    setDialogOpen(true);
  };

  const openEdit = (product: ShopProductSummary) => {
    setEditing(product);
    setForm({
      ...emptyForm,
      name: product.name,
      description: "",
      cover: product.cover ?? "",
      price: formatMoney(product.price),
      status: product.status,
      summary: product.summary ?? "",
      tags: (product.tags ?? []).join(", "),
      discount: (product.discount ?? 0).toString(),
      discount_end: toLocalInput(product.discount_end),
    });
    setFormError(undefined);
    setDialogOpen(true);
    // 商品列表不含描述与 props，编辑时从店铺详情接口补齐（店主可见自己的下架商品）。
    dispatch(getStorefrontProduct(shop.slug, product.id))
      .then((detail) => {
        const productProps = (detail as unknown as { props?: ShopProductProps }).props;
        setForm((prev) => ({
          ...prev,
          description: detail.description ?? "",
          description_visibility: detail.description_visibility ?? "public",
          summary: productProps?.summary ?? prev.summary,
          tags: (productProps?.tags ?? product.tags ?? []).join(", "),
          transfer_name: productProps?.transfer_name ?? "",
          allow_preview: productProps?.allow_preview !== false,
          preview_limit: productProps?.preview_limit ? productProps.preview_limit.toString() : "",
          sort: (productProps?.sort ?? 0).toString(),
        }));
      })
      .catch(() => undefined);
  };

  const pickFolder = () => {
    setPicking(true);
    dispatch(selectPath("shopProduct"))
      .then((uri) => {
        setForm((prev) => ({ ...prev, uri }));
        setFormError(undefined);
      })
      .catch(() => undefined)
      .finally(() => setPicking(false));
  };

  const validateUri = async (uri: string): Promise<string | undefined> => {
    if (!uri.trim()) {
      return t("shop.manage.products.uriRequired");
    }
    try {
      const parsed = new CrUri(uri.trim());
      if (parsed.fs() !== Filesystem.my) {
        return t("shop.manage.products.uriMustBeMy");
      }
    } catch {
      return t("shop.manage.products.uriInvalid");
    }
    try {
      const file = await dispatch(getFileInfo({ uri: uri.trim() }, true));
      if (file.type !== FileType.folder) {
        return t("shop.manage.products.uriNotFolder");
      }
    } catch (e) {
      return e instanceof AppError ? e.message : t("shop.manage.products.uriInvalid");
    }
    return undefined;
  };

  const editorRef = useRef<MDXEditorMethods>(null);

  /**
   * 从网盘挑一个图片 / 视频 / 音频，签成长期直链后插进商品介绍。
   *
   * 必须已经保存过才有商品 ID：签名是按商品维度的，商品下架或删除后素材一起失效，
   * 不会留下一个能绕过商品的公开地址。
   */
  const insertAsset = useCallback(async () => {
    if (!editing) {
      enqueueSnackbar({
        message: t("shop.manage.products.assetNeedSave"),
        variant: "warning",
        action: DefaultCloseAction,
      });
      return;
    }

    let uri: string;
    try {
      uri = await dispatch(selectPath("pickFile"));
    } catch {
      // 用户取消选择。
      return;
    }

    try {
      const asset = await dispatch(signShopProductAsset(editing.id, uri));
      // 图片用标准图片语法；视频 / 音频带一个 kind 提示，渲染时换成播放器。
      const suffix = asset.kind === "image" ? "" : `?k=${asset.kind}`;
      editorRef.current?.insertMarkdown(`![${asset.name}](${asset.url}${suffix})`);
      enqueueSnackbar({
        message: t("shop.manage.products.assetInserted", { name: asset.name }),
        variant: "success",
        action: DefaultCloseAction,
      });
    } catch (e) {
      enqueueSnackbar({
        message: e instanceof AppError ? e.message : t("shop.manage.products.assetInsertFailed"),
        variant: "error",
        action: DefaultCloseAction,
      });
    }
  }, [dispatch, editing, enqueueSnackbar, t]);

  const buildProps = (): ShopProductProps => ({
    description_visibility: form.description_visibility,
    summary: form.summary.trim() || undefined,
    tags: form.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 8),
    transfer_name: form.transfer_name.trim() || undefined,
    allow_preview: form.allow_preview,
    preview_limit: form.preview_limit ? Number(form.preview_limit) : undefined,
    sort: form.sort ? Number(form.sort) : undefined,
  });

  const submit = async () => {
    setFormError(undefined);
    const price = parseMoney(form.price);
    if (Number.isNaN(price) || price < 1) {
      setFormError(t("shop.manage.products.priceInvalid"));
      return;
    }
    const discount = Number(form.discount || "0");
    if (!Number.isInteger(discount) || discount < 0 || discount > 99) {
      setFormError(t("shop.manage.products.discountInvalid"));
      return;
    }

    setSubmitting(true);
    try {
      if (editing) {
        const res = await dispatch(
          updateShopProduct(editing.id, {
            name: form.name.trim(),
            cover: form.cover.trim(),
            price,
            discount,
            discount_end: fromLocalInput(form.discount_end),
            status: form.status,
            props: buildProps(),
          }),
        );
        setProducts((prev) => prev?.map((item) => (item.id === res.id ? res : item)));
      } else {
        const uriError = await validateUri(form.uri);
        if (uriError) {
          setFormError(uriError);
          setSubmitting(false);
          return;
        }
        const res = await dispatch(
          createShopProduct({
            uri: form.uri.trim(),
            name: form.name.trim() || undefined,
            description: form.description,
            cover: form.cover.trim() || undefined,
            price,
            status: form.status,
            props: buildProps(),
          }),
        );
        setProducts((prev) => [res, ...(prev ?? [])]);
      }
      setDialogOpen(false);
      enqueueSnackbar({
        message: editing ? t("shop.manage.products.updated") : t("shop.manage.products.created"),
        variant: "success",
        action: DefaultCloseAction,
      });
    } catch (e) {
      setFormError(e instanceof AppError ? e.message : t("shop.manage.products.saveFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const changeStatus = (product: ShopProductSummary, status: string) => {
    setBusy(product.id);
    dispatch(setShopProductStatus(product.id, status))
      .then((res) => setProducts((prev) => prev?.map((item) => (item.id === res.id ? res : item))))
      .finally(() => setBusy(undefined));
  };

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2, flexWrap: "wrap" }}>
        <Typography variant={"body2"} color={"text.secondary"} sx={{ flexGrow: 1 }}>
          {t("shop.manage.products.hint")}
        </Typography>
        <SecondaryButton
          variant={"outlined"}
          size={"small"}
          startIcon={<ArrowClockwise sx={{ fontSize: 16 }} />}
          onClick={load}
        >
          {t("shop.manage.refresh")}
        </SecondaryButton>
        <Button variant={"contained"} size={"small"} startIcon={<Add sx={{ fontSize: 16 }} />} onClick={openCreate}>
          {t("shop.manage.products.create")}
        </Button>
      </Box>

      {error && (
        <Alert severity={"error"} sx={{ mb: 2, borderRadius: 3 }}>
          {error}
        </Alert>
      )}

      {products && products.length === 0 && !loading ? (
        <ShopEmpty title={t("shop.manage.products.empty")} description={t("shop.manage.products.emptyHint")} />
      ) : (
        <Box
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 3,
            bgcolor: "background.paper",
            overflowX: "auto",
          }}
        >
          <Table size={"small"} sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow>
                <TableCell>{t("shop.manage.products.fields.name")}</TableCell>
                <TableCell width={110}>{t("shop.manage.products.fields.status")}</TableCell>
                <TableCell width={150} align={"right"}>
                  {t("shop.manage.products.fields.price")}
                </TableCell>
                <TableCell width={110} align={"right"}>
                  {t("shop.manage.products.fields.sales")}
                </TableCell>
                <TableCell width={160}>{t("shop.manage.products.fields.createdAt")}</TableCell>
                <TableCell width={260} align={"right"}>
                  {t("shop.manage.products.fields.actions")}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products?.map((product) => (
                <TableRow key={product.id} hover>
                  <TableCell sx={{ maxWidth: 0 }}>
                    <Typography variant={"body2"} sx={{ fontWeight: 600, overflowWrap: "anywhere" }}>
                      {product.name}
                    </Typography>
                    <Typography variant={"caption"} color={"text.secondary"} sx={{ overflowWrap: "anywhere" }}>
                      {product.summary || product.id}
                    </Typography>
                    {(product.tags ?? []).length > 0 && (
                      <Stack direction={"row"} spacing={0.5} sx={{ mt: 0.5, flexWrap: "wrap", gap: 0.5 }}>
                        {(product.tags ?? []).map((tag) => (
                          <Chip key={tag} size={"small"} label={tag} sx={{ height: 18, fontSize: "0.65rem" }} />
                        ))}
                      </Stack>
                    )}
                  </TableCell>
                  <TableCell>
                    <ProductStatusChip status={product.status} />
                  </TableCell>
                  <TableCell align={"right"}>
                    <Money cents={product.final_price} bold />
                    {(product.discount ?? 0) > 0 && (
                      <Typography
                        variant={"caption"}
                        color={"text.disabled"}
                        sx={{ display: "block", textDecoration: "line-through" }}
                      >
                        {displayMoney(product.price)}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align={"right"}>
                    <Typography variant={"body2"} sx={{ fontVariantNumeric: "tabular-nums" }}>
                      {product.sales}
                    </Typography>
                    <Typography variant={"caption"} color={"text.secondary"}>
                      {t("shop.manage.products.views", { count: product.views })}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant={"caption"} color={"text.secondary"}>
                      {formatTime(product.created_at)}
                    </Typography>
                  </TableCell>
                  <TableCell align={"right"}>
                    <Stack direction={"row"} spacing={0.5} justifyContent={"flex-end"} sx={{ flexWrap: "wrap" }}>
                      <Tooltip title={t("shop.manage.products.edit")}>
                        <IconButton
                          size={"small"}
                          onClick={() => openEdit(product)}
                          aria-label={t("shop.manage.products.edit")}
                        >
                          <Edit sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                      {product.status === ShopProductStatus.onsale ? (
                        <Button
                          size={"small"}
                          disabled={busy === product.id}
                          onClick={() => changeStatus(product, ShopProductStatus.offsale)}
                        >
                          {t("shop.manage.products.takeOff")}
                        </Button>
                      ) : (
                        <Button
                          size={"small"}
                          disabled={busy === product.id || product.status === ShopProductStatus.removed}
                          onClick={() => changeStatus(product, ShopProductStatus.onsale)}
                        >
                          {t("shop.manage.products.putOn")}
                        </Button>
                      )}
                      <Button
                        size={"small"}
                        href={`/shop/${shop.slug}/product/${product.id}`}
                        target={"_blank"}
                        rel={"noreferrer noopener"}
                      >
                        {t("shop.manage.products.view")}
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      <Dialog open={dialogOpen} onClose={() => !submitting && setDialogOpen(false)} fullWidth maxWidth={"sm"}>
        <DialogTitle>
          {editing ? t("shop.manage.products.editTitle") : t("shop.manage.products.createTitle")}
        </DialogTitle>
        <DialogContent>
          {!editing && (
            <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start", mb: 1 }}>
              <DenseFilledTextField
                fullWidth
                label={t("shop.manage.products.fields.uri")}
                placeholder={"storflow://my/folder"}
                value={form.uri}
                onChange={(e) => setForm((prev) => ({ ...prev, uri: e.target.value }))}
                helperText={t("shop.manage.products.uriHint")}
              />
              <Button
                variant={"outlined"}
                startIcon={<Folder sx={{ fontSize: 18 }} />}
                onClick={pickFolder}
                disabled={picking}
                sx={{ mt: 1, whiteSpace: "nowrap", height: 44 }}
              >
                {t("shop.manage.products.selectFolder")}
              </Button>
            </Box>
          )}
          <DenseFilledTextField
            fullWidth
            label={t("shop.manage.products.fields.name")}
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            inputProps={{ maxLength: 128 }}
            helperText={t("shop.manage.products.nameHint")}
            sx={{ mt: 1 }}
          />
          <Box sx={{ mt: 2 }}>
            <Stack direction={"row"} alignItems={"baseline"} spacing={1} sx={{ mb: 1, flexWrap: "wrap" }}>
              <Typography variant={"body2"} fontWeight={600}>
                {t("shop.manage.products.fields.description")}
              </Typography>
              <Typography variant={"caption"} color={"text.secondary"}>
                {t("shop.manage.products.descriptionHint")}
              </Typography>
            </Stack>
            {/* extraToolbar 里的 Tooltip 用 describeChild：提示只做补充说明，
                不覆盖按钮自己的可访问名。 */}
            <Suspense fallback={<Box sx={{ height: 320 }} />}>
              <MarkdownEditor
                ref={editorRef}
                value={form.description}
                onChange={(value) => setForm((prev) => ({ ...prev, description: value }))}
                minHeight={"320px"}
                extraToolbar={
                  <Tooltip title={t("shop.manage.products.assetTypeHint")} describeChild>
                    <Button size={"small"} startIcon={<Add />} onClick={insertAsset}>
                      {t("shop.manage.products.insertAsset")}
                    </Button>
                  </Tooltip>
                }
              />
            </Suspense>
            <DenseSelect
              size={"small"}
              fullWidth
              sx={{ mt: 1 }}
              value={form.description_visibility}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  description_visibility: e.target.value as ShopDescriptionVisibility,
                }))
              }
            >
              <SquareMenuItem value={"public"}>{t("shop.manage.products.visibilityPublic")}</SquareMenuItem>
              <SquareMenuItem value={"login"}>{t("shop.manage.products.visibilityLogin")}</SquareMenuItem>
              <SquareMenuItem value={"purchased"}>{t("shop.manage.products.visibilityPurchased")}</SquareMenuItem>
            </DenseSelect>
            <Typography variant={"caption"} color={"text.secondary"} sx={{ mt: 0.5, display: "block" }}>
              {t("shop.manage.products.descriptionVisibilityHint")}
            </Typography>
          </Box>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1, mt: 1 }}>
            <DenseFilledTextField
              label={t("shop.manage.products.fields.price")}
              value={form.price}
              onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
              inputProps={{ inputMode: "decimal" }}
              helperText={t("shop.manage.products.priceHint")}
              error={form.price !== "" && Number.isNaN(parseMoney(form.price))}
            />
            <DenseFilledTextField
              label={t("shop.manage.products.fields.discount")}
              value={form.discount}
              onChange={(e) => setForm((prev) => ({ ...prev, discount: e.target.value.replace(/[^\d]/g, "") }))}
              inputProps={{ inputMode: "numeric" }}
              helperText={t("shop.manage.products.discountHint")}
            />
          </Box>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1, mt: 1 }}>
            <DenseFilledTextField
              type={"datetime-local"}
              label={t("shop.manage.products.fields.discountEnd")}
              value={form.discount_end}
              onChange={(e) => setForm((prev) => ({ ...prev, discount_end: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              helperText={t("shop.manage.products.discountEndHint")}
            />
            <ShopImageField
              label={t("shop.manage.products.fields.cover")}
              shape={ShopImageShape.cover}
              value={form.cover}
              onChange={(value) => setForm((prev) => ({ ...prev, cover: value }))}
              helperText={t("shop.manage.products.coverHint")}
            />
          </Box>
          <DenseFilledTextField
            fullWidth
            label={t("shop.manage.products.fields.summary")}
            value={form.summary}
            onChange={(e) => setForm((prev) => ({ ...prev, summary: e.target.value }))}
            inputProps={{ maxLength: 500 }}
            sx={{ mt: 1 }}
          />
          <DenseFilledTextField
            fullWidth
            label={t("shop.manage.products.fields.tags")}
            value={form.tags}
            onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))}
            helperText={t("shop.manage.products.tagsHint")}
            sx={{ mt: 1 }}
          />
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" }, gap: 1, mt: 1 }}>
            <DenseFilledTextField
              label={t("shop.manage.products.fields.transferName")}
              value={form.transfer_name}
              onChange={(e) => setForm((prev) => ({ ...prev, transfer_name: e.target.value }))}
              helperText={t("shop.manage.products.transferNameHint")}
              inputProps={{ maxLength: 100 }}
            />
            <DenseFilledTextField
              label={t("shop.manage.products.fields.previewLimit")}
              value={form.preview_limit}
              onChange={(e) => setForm((prev) => ({ ...prev, preview_limit: e.target.value.replace(/[^\d]/g, "") }))}
              helperText={t("shop.manage.products.previewLimitHint")}
            />
            <DenseFilledTextField
              label={t("shop.manage.products.fields.sort")}
              value={form.sort}
              onChange={(e) => setForm((prev) => ({ ...prev, sort: e.target.value.replace(/[^\d]/g, "") }))}
            />
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 1, flexWrap: "wrap" }}>
            <FormControlLabel
              control={
                <Checkbox
                  size={"small"}
                  checked={form.allow_preview}
                  onChange={(e) => setForm((prev) => ({ ...prev, allow_preview: e.target.checked }))}
                />
              }
              label={<Typography variant={"body2"}>{t("shop.manage.products.fields.allowPreview")}</Typography>}
            />
            <DenseSelect
              size={"small"}
              value={form.status}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as string }))}
              disabled={editing && editing.status === ShopProductStatus.removed}
            >
              <SquareMenuItem value={ShopProductStatus.onsale}>{t("shop.product.status.onsale")}</SquareMenuItem>
              <SquareMenuItem value={ShopProductStatus.offsale}>{t("shop.product.status.offsale")}</SquareMenuItem>
              <SquareMenuItem value={ShopProductStatus.draft}>{t("shop.product.status.draft")}</SquareMenuItem>
            </DenseSelect>
          </Box>
          {formError && (
            <Alert severity={"error"} sx={{ mt: 2, borderRadius: 3 }}>
              {formError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={submitting}>
            {t("shop.checkout.cancel")}
          </Button>
          <Button variant={"contained"} onClick={submit} disabled={submitting}>
            {editing ? t("shop.manage.profile.save") : t("shop.manage.products.create")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ShopProductsTab;
