import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  Link as MuiLink,
  Radio,
  RadioGroup,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { AppError, Code } from "../../../api/request.ts";
import {
  createShopOrder,
  getProductPreview,
  getStorefrontProduct,
  isRateLimitedError,
  ShopPayChannel,
  ShopPayChannels,
  ShopPreviewEntry,
  ShopProductDetail as ShopProductDetailModel,
} from "../../../api/shop.ts";
import { useAppDispatch } from "../../../redux/hooks.ts";
import { renderMarkdown } from "../../../util/markdown.ts";
import PageTitle from "../../../router/PageTitle.tsx";
import SessionManager from "../../../session";
import { useQuery } from "../../../util";
import { useShopOutlet } from "../../Frame/ShopFrame.tsx";
import { DenseFilledTextField } from "../../Common/StyledComponents.tsx";
import ArrowLeft from "../../Icons/ArrowLeft.tsx";
import Cart from "../../Icons/Cart.tsx";
import FileExclBox from "../../Icons/FileExclBox.tsx";
import Folder from "../../Icons/Folder.tsx";
import { FileSizeText, Money, PriceRow, ProductCover, ShopEmpty, TagRow, useUnixTime } from "./ShopShared.tsx";

interface BreadcrumbEntry {
  name: string;
  token?: string;
}

/** 文件夹预览：只读，逐层进入，面包屑返回上级。不提供任何下载入口。 */
/**
 * 商品介绍的排版。内容是卖家写的 Markdown（教程、表格、截图、演示视频），
 * 由 util/markdown.ts 渲染成已经过滤过链接与原始 HTML 的 HTML。
 */
const markdownSx = {
  overflowWrap: "anywhere",
  fontSize: 14,
  lineHeight: 1.75,
  "& > :first-of-type": { mt: 0 },
  "& h1, & h2, & h3": { fontWeight: 650, mt: 3, mb: 1, lineHeight: 1.35 },
  "& h1": { fontSize: 22 },
  "& h2": { fontSize: 19 },
  "& h3": { fontSize: 17 },
  "& p": { my: 1.5 },
  "& ul, & ol": { my: 1.5, pl: 3 },
  "& li": { my: 0.5 },
  "& blockquote": {
    my: 2,
    py: 1,
    px: 2,
    borderLeft: "3px solid",
    borderColor: "primary.main",
    borderRadius: 1,
    bgcolor: "action.hover",
    color: "text.secondary",
  },
  "& code": { px: 0.75, py: 0.25, borderRadius: 1, bgcolor: "action.hover", fontSize: "0.9em" },
  "& pre": { my: 2, p: 2, borderRadius: 1.5, bgcolor: "#0f172a", color: "#e2e8f0", overflowX: "auto" },
  "& pre code": { p: 0, bgcolor: "transparent", color: "inherit" },
  "& img, & video": { maxWidth: "100%", borderRadius: 1.5 },
  "& video": { display: "block", my: 2, bgcolor: "#000" },
  "& audio": { width: "100%", my: 2 },
  "& table": { width: "100%", my: 2, borderCollapse: "collapse", fontSize: 13 },
  "& th, & td": { p: 1, border: "1px solid", borderColor: "divider", textAlign: "left" },
  "& th": { bgcolor: "action.hover", fontWeight: 650 },
  "& a": { color: "primary.main" },
  "& hr": { my: 2.5, border: "none", borderTop: "1px solid", borderColor: "divider" },
};

const PreviewPanel = ({ slug, productId }: { slug: string; productId: string }) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const formatTime = useUnixTime();
  const [crumbs, setCrumbs] = useState<BreadcrumbEntry[]>([{ name: "" }]);
  const [entries, setEntries] = useState<ShopPreviewEntry[] | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const current = crumbs[crumbs.length - 1];

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(undefined);
    dispatch(getProductPreview(slug, productId, current.token))
      .then((res) => {
        if (!cancelled) {
          setEntries(res ?? []);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setEntries(undefined);
          setError(e instanceof AppError ? e.message : t("shop.product.previewFailed"));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [current.token, dispatch, productId, slug, t]);

  const enterFolder = (entry: ShopPreviewEntry) => {
    if (!entry.path) {
      return;
    }
    setCrumbs((prev) => [...prev, { name: entry.name, token: entry.path }]);
  };

  const goTo = (index: number) => {
    setCrumbs((prev) => prev.slice(0, index + 1));
  };

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mb: 2 }}>
        <Breadcrumbs sx={{ fontSize: "0.875rem" }} separator={"/"} aria-label={t("shop.product.previewPath")}>
          {crumbs.map((crumb, index) => {
            const last = index === crumbs.length - 1;
            return last ? (
              <Typography key={`${crumb.name}-${index}`} variant={"body2"} color={"text.primary"}>
                {index === 0 ? t("shop.product.previewRoot") : crumb.name}
              </Typography>
            ) : (
              <MuiLink
                key={`${crumb.name}-${index}`}
                component={"button"}
                type={"button"}
                underline={"hover"}
                onClick={() => goTo(index)}
                sx={{
                  background: "none",
                  border: "none",
                  p: 0,
                  font: "inherit",
                  cursor: "pointer",
                  "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 2 },
                }}
              >
                {index === 0 ? t("shop.product.previewRoot") : crumb.name}
              </MuiLink>
            );
          })}
        </Breadcrumbs>
        <Box sx={{ flexGrow: 1 }} />
        {crumbs.length > 1 && (
          <Button
            size={"small"}
            startIcon={<ArrowLeft sx={{ fontSize: 16 }} />}
            onClick={() => goTo(crumbs.length - 2)}
          >
            {t("shop.product.previewUp")}
          </Button>
        )}
      </Box>
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      )}
      {!loading && error && (
        <Alert severity={"warning"} sx={{ borderRadius: 3 }}>
          {error}
        </Alert>
      )}
      {!loading && !error && entries && entries.length === 0 && <ShopEmpty title={t("shop.product.previewEmpty")} />}
      {!loading && !error && entries && entries.length > 0 && (
        <Box
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 3,
            overflowX: "auto",
            bgcolor: "background.paper",
          }}
        >
          <Table size={"small"} sx={{ minWidth: 480 }}>
            <TableHead>
              <TableRow>
                <TableCell>{t("shop.product.previewName")}</TableCell>
                <TableCell width={120}>{t("shop.product.previewSize")}</TableCell>
                <TableCell width={190}>{t("shop.product.previewUpdated")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {entries.map((entry) => {
                const isFolder = entry.type === "folder";
                return (
                  <TableRow
                    key={`${entry.name}-${entry.path ?? "file"}`}
                    hover={isFolder}
                    sx={{ cursor: isFolder ? "pointer" : "default" }}
                    onClick={isFolder ? () => enterFolder(entry) : undefined}
                  >
                    <TableCell sx={{ maxWidth: 0 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                        {isFolder ? (
                          <Folder sx={{ fontSize: 20, color: "primary.main", flexShrink: 0 }} />
                        ) : (
                          <FileExclBox sx={{ fontSize: 20, color: "text.disabled", flexShrink: 0 }} />
                        )}
                        {isFolder ? (
                          <MuiLink
                            component={"button"}
                            type={"button"}
                            underline={"hover"}
                            onClick={(e) => {
                              e.stopPropagation();
                              enterFolder(entry);
                            }}
                            sx={{
                              background: "none",
                              border: "none",
                              p: 0,
                              font: "inherit",
                              cursor: "pointer",
                              textAlign: "left",
                              overflowWrap: "anywhere",
                              "&:focus-visible": {
                                outline: "2px solid",
                                outlineColor: "primary.main",
                                outlineOffset: 2,
                              },
                            }}
                          >
                            {entry.name}
                          </MuiLink>
                        ) : (
                          <Typography variant={"body2"} sx={{ overflowWrap: "anywhere" }}>
                            {entry.name}
                          </Typography>
                        )}
                        {isFolder && entry.children !== undefined && (
                          <Typography variant={"caption"} color={"text.secondary"} sx={{ flexShrink: 0 }}>
                            {t("shop.product.previewChildren", { count: entry.children })}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{isFolder ? "—" : <FileSizeText size={entry.size} />}</TableCell>
                    <TableCell>
                      <Typography variant={"caption"} color={"text.secondary"}>
                        {formatTime(entry.updated_at)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      )}
      <Typography variant={"caption"} color={"text.secondary"} sx={{ display: "block", mt: 1 }}>
        {t("shop.product.previewReadOnly")}
      </Typography>
    </Box>
  );
};

const ShopProductDetail = () => {
  const { slug = "", id = "" } = useParams();
  const { primary, shop } = useShopOutlet();
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const query = useQuery();
  const ref = query.get("ref") ?? undefined;

  const [product, setProduct] = useState<ShopProductDetailModel | undefined>();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [channel, setChannel] = useState<ShopPayChannel>("alipay");
  const [coupon, setCoupon] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | undefined>();

  const loggedIn = !!SessionManager.currentLoginOrNull();
  const redirectPath = useMemo(() => {
    const search = window.location.search;
    return `/shop/${slug}/product/${id}${search}`;
  }, [slug, id]);

  const load = useCallback(() => {
    setLoading(true);
    setNotFound(false);
    setRateLimited(false);
    dispatch(getStorefrontProduct(slug, id))
      .then((res) => setProduct(res))
      .catch((e) => {
        setProduct(undefined);
        if (e instanceof AppError && e.code === Code.NodeFound) {
          setNotFound(true);
        } else if (isRateLimitedError(e)) {
          setRateLimited(true);
        }
      })
      .finally(() => setLoading(false));
  }, [dispatch, id, slug]);

  useEffect(() => {
    load();
  }, [load]);

  const onBuy = () => {
    if (!product) {
      return;
    }
    if (!loggedIn) {
      const params = new URLSearchParams();
      if (ref) {
        params.set("ref", ref);
      }
      params.set("redirect", redirectPath);
      navigate(`/session/signup?${params.toString()}`);
      return;
    }
    setCheckoutError(undefined);
    setCheckoutOpen(true);
  };

  const submitOrder = () => {
    if (!product) {
      return;
    }
    setSubmitting(true);
    setCheckoutError(undefined);
    dispatch(
      createShopOrder({
        kind: "product",
        object_id: product.id,
        channel,
        coupon: coupon.trim() || undefined,
        ref,
      }),
    )
      .then((order) => {
        setCheckoutOpen(false);
        navigate(`/shop/order/${encodeURIComponent(order.order_no)}`);
      })
      .catch((e) => {
        setCheckoutError(e instanceof AppError ? e.message : t("shop.checkout.failed"));
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  if (loading && !product) {
    return (
      <Container maxWidth={"lg"} sx={{ py: 8, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Container>
    );
  }

  if (rateLimited) {
    return (
      <Container maxWidth={"lg"} sx={{ py: 6 }}>
        <ShopEmpty title={t("shop.store.rateLimited")} description={t("shop.store.rateLimitedHint")} />
        <Stack direction={"row"} spacing={1} justifyContent={"center"} sx={{ mt: 2 }}>
          <Button variant={"contained"} onClick={load}>
            {t("shop.store.retry")}
          </Button>
          <Button variant={"outlined"} onClick={() => navigate(`/shop/${slug}`)}>
            {t("shop.product.backToStore")}
          </Button>
        </Stack>
      </Container>
    );
  }

  if (notFound || !product) {
    return (
      <Container maxWidth={"lg"} sx={{ py: 6 }}>
        <ShopEmpty title={t("shop.product.notFound")} description={t("shop.product.notFoundHint")} />
        <Stack direction={"row"} spacing={1} justifyContent={"center"} sx={{ mt: 2 }}>
          <Button variant={"contained"} onClick={() => navigate(`/shop/${slug}`)}>
            {t("shop.product.backToStore")}
          </Button>
          <Button variant={"outlined"} onClick={load}>
            {t("shop.store.retry")}
          </Button>
        </Stack>
      </Container>
    );
  }

  const owned = product.owned;

  return (
    <Container maxWidth={"lg"} sx={{ py: 4 }}>
      <PageTitle title={product.name} />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "minmax(0, 2fr) minmax(280px, 1fr)" },
          gap: 4,
          alignItems: "start",
        }}
      >
        <Box sx={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
          {/* 商品封面：卖家没设置时用内置默认商品图，避免详情页顶部只有文字。 */}
          <Box sx={{ borderRadius: 3, overflow: "hidden", border: "1px solid", borderColor: "divider" }}>
            <ProductCover src={product.cover} primary={primary} ratio={"16 / 9"} />
          </Box>
          <Box>
            <Breadcrumbs separator={"/"} sx={{ mb: 1 }}>
              <MuiLink
                component={"button"}
                type={"button"}
                underline={"hover"}
                onClick={() => navigate(`/shop/${slug}`)}
                sx={{
                  background: "none",
                  border: "none",
                  p: 0,
                  font: "inherit",
                  cursor: "pointer",
                  "&:focus-visible": { outline: "2px solid", outlineColor: primary, outlineOffset: 2 },
                }}
              >
                {shop.name}
              </MuiLink>
              <Typography variant={"body2"} color={"text.primary"}>
                {product.name}
              </Typography>
            </Breadcrumbs>
            <Typography variant={"h5"} sx={{ fontWeight: 700, overflowWrap: "anywhere" }}>
              {product.name}
            </Typography>
            <Box sx={{ mt: 1 }}>
              <TagRow tags={product.tags} />
            </Box>
            {product.summary && (
              <Typography variant={"body2"} color={"text.secondary"} sx={{ mt: 1.5, overflowWrap: "anywhere" }}>
                {product.summary}
              </Typography>
            )}
          </Box>

          <Box>
            <Typography variant={"h6"} sx={{ fontWeight: 600, mb: 1 }}>
              {t("shop.product.description")}
            </Typography>
            {product.description ? (
              <Box>
                <Box sx={markdownSx} dangerouslySetInnerHTML={{ __html: renderMarkdown(product.description) }} />
                {product.description_visibility !== "public" && /\/asset\//.test(product.description) && (
                  <Typography variant={"caption"} color={"text.secondary"}>
                    {product.description_visibility === "login"
                      ? t("shop.product.assetsLoginOnly")
                      : t("shop.product.assetsPurchasedOnly")}
                  </Typography>
                )}
              </Box>
            ) : (
              <Typography variant={"body2"} color={"text.secondary"}>
                {t("shop.product.noDescription")}
              </Typography>
            )}
          </Box>

          <Divider />

          <Box>
            <Typography variant={"h6"} sx={{ fontWeight: 600, mb: 1 }}>
              {t("shop.product.preview")}
            </Typography>
            {product.can_preview ? (
              <PreviewPanel slug={slug} productId={product.id} />
            ) : (
              <Alert severity={"info"} variant={"outlined"} sx={{ borderRadius: 3 }}>
                {t("shop.product.previewDisabled")}
              </Alert>
            )}
          </Box>
        </Box>

        <Box
          sx={{
            position: { xs: "static", md: "sticky" },
            top: 88,
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 3,
            p: 3,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <PriceRow
            price={product.price}
            finalPrice={product.final_price}
            discount={product.discount}
            primary={primary}
            size={"h5"}
          />
          <Stack direction={"row"} spacing={2} sx={{ flexWrap: "wrap" }}>
            <Typography variant={"caption"} color={"text.secondary"}>
              {t("shop.product.sales", { count: product.sales })}
            </Typography>
            <Typography variant={"caption"} color={"text.secondary"}>
              {t("shop.product.views", { count: product.views })}
            </Typography>
          </Stack>
          {product.discount_end ? (
            <Typography variant={"caption"} color={"error.main"}>
              {t("shop.product.discountEnd", { time: new Date(product.discount_end * 1000).toLocaleString() })}
            </Typography>
          ) : null}
          {owned ? (
            <>
              <Alert severity={"success"} variant={"outlined"} sx={{ borderRadius: 3 }}>
                {t("shop.product.alreadyOwned")}
              </Alert>
              <Button
                variant={"contained"}
                startIcon={<Folder sx={{ fontSize: 18 }} />}
                onClick={() => navigate(`/home?path=${encodeURIComponent(`storflow://my/${product.name}`)}`)}
              >
                {t("shop.product.openFolder")}
              </Button>
            </>
          ) : (
            <Button
              variant={"contained"}
              size={"large"}
              startIcon={<Cart sx={{ fontSize: 18 }} />}
              disabled={product.status !== "onsale"}
              onClick={onBuy}
              sx={{ bgcolor: primary, "&:hover": { bgcolor: primary, filter: "brightness(0.92)" } }}
            >
              {product.status !== "onsale"
                ? t(`shop.product.status.${product.status}`, { defaultValue: product.status })
                : loggedIn
                  ? t("shop.product.buyNow")
                  : t("shop.product.signUpToBuy")}
            </Button>
          )}
          {!loggedIn && (
            <Typography variant={"caption"} color={"text.secondary"}>
              {t("shop.product.signInHint")}{" "}
              <MuiLink
                component={"button"}
                type={"button"}
                underline={"hover"}
                onClick={() => {
                  const params = new URLSearchParams();
                  if (ref) {
                    params.set("ref", ref);
                  }
                  params.set("redirect", redirectPath);
                  navigate(`/session?${params.toString()}`);
                }}
                sx={{ background: "none", border: "none", p: 0, font: "inherit", cursor: "pointer" }}
              >
                {t("shop.product.signIn")}
              </MuiLink>
            </Typography>
          )}
        </Box>
      </Box>

      <Dialog open={checkoutOpen} onClose={() => !submitting && setCheckoutOpen(false)} fullWidth maxWidth={"xs"}>
        <DialogTitle>{t("shop.checkout.title")}</DialogTitle>
        <DialogContent>
          <Typography variant={"body2"} color={"text.secondary"} sx={{ mb: 2, overflowWrap: "anywhere" }}>
            {product.name}
          </Typography>
          <Box
            sx={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 2,
              mb: 2,
              p: 1.5,
              borderRadius: 2,
              bgcolor: "action.hover",
            }}
          >
            <Typography variant={"body2"}>{t("shop.checkout.amount")}</Typography>
            <Money cents={product.final_price} bold variant={"h6"} color={primary} />
          </Box>
          <FormControl component={"fieldset"} sx={{ width: "100%" }}>
            <Typography component={"legend"} variant={"body2"} color={"text.secondary"} sx={{ mb: 0.5 }}>
              {t("shop.checkout.channel")}
            </Typography>
            <RadioGroup
              row
              value={channel}
              onChange={(e) => setChannel(e.target.value as ShopPayChannel)}
              aria-label={t("shop.checkout.channel")}
            >
              {ShopPayChannels.map((item) => (
                <FormControlLabel
                  key={item}
                  value={item}
                  control={<Radio size={"small"} />}
                  label={<Typography variant={"body2"}>{t(`shop.channel.${item}`)}</Typography>}
                />
              ))}
            </RadioGroup>
          </FormControl>
          <DenseFilledTextField
            fullWidth
            label={t("shop.checkout.coupon")}
            placeholder={t("shop.checkout.couponPlaceholder")}
            value={coupon}
            onChange={(e) => setCoupon(e.target.value.toUpperCase())}
            inputProps={{ maxLength: 64 }}
            helperText={t("shop.checkout.couponHint")}
            sx={{ mt: 1 }}
          />
          {checkoutError && (
            <Alert severity={"error"} sx={{ mt: 2, borderRadius: 3 }}>
              {checkoutError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCheckoutOpen(false)} disabled={submitting}>
            {t("shop.checkout.cancel")}
          </Button>
          <Button variant={"contained"} onClick={submitOrder} disabled={submitting}>
            {t("shop.checkout.submit")}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ShopProductDetail;
