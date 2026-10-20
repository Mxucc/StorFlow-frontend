import * as React from "react";
import { Alert, Box, Button, CircularProgress, Container, Typography } from "@mui/material";
import { useQueryState } from "nuqs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppError } from "../../../api/request.ts";
import {
  getMyPoints,
  getVASShopProviders,
  getVASShopSKUs,
  VASPointsSummary,
  VASShopProvider,
  VASShopSKU,
} from "../../../api/vas.ts";
import { useAppDispatch } from "../../../redux/hooks.ts";
import { StyledTab, StyledTabs } from "../../Common/StyledComponents.tsx";
import PageContainer from "../PageContainer.tsx";
import PageHeader, { PageTabQuery } from "../PageHeader.tsx";
import StoreGiftCode from "./StoreGiftCode.tsx";
import StoreOrders from "./StoreOrders.tsx";
import StorePoints from "./StorePoints.tsx";
import StoreProducts from "./StoreProducts.tsx";

const StoreTab = {
  products: "products",
  points: "points",
  giftcode: "giftcode",
  orders: "orders",
} as const;

type StoreTabValue = (typeof StoreTab)[keyof typeof StoreTab];

const tabOrder: StoreTabValue[] = [StoreTab.products, StoreTab.points, StoreTab.giftcode, StoreTab.orders];

/**
 * 增值服务商店（用户侧）。
 *
 * 商品、支付渠道与积分由本页统一加载后下发给各 Tab，购买成功后统一刷新，
 * 保证「余额 / 积分 / 订单」在同一屏内始终一致。
 */
const Store = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [tab, setTab] = useQueryState(PageTabQuery);

  const [skus, setSkus] = useState<VASShopSKU[] | undefined>();
  const [providers, setProviders] = useState<VASShopProvider[] | undefined>();
  const [points, setPoints] = useState<VASPointsSummary | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const loadPoints = useCallback(() => {
    return dispatch(getMyPoints())
      .then((res) => setPoints(res ?? { balance: 0, history: [] }))
      .catch(() => undefined);
  }, [dispatch]);

  const load = useCallback(() => {
    setLoading(true);
    setError(undefined);
    Promise.all([
      dispatch(getVASShopSKUs())
        .then((res) => setSkus(res ?? []))
        .catch((e) => setError(e instanceof AppError ? e.message : t("store.loadFailed"))),
      dispatch(getVASShopProviders())
        .then((res) => setProviders(res ?? []))
        .catch(() => setProviders([])),
      loadPoints(),
    ]).finally(() => setLoading(false));
  }, [dispatch, loadPoints, t]);

  useEffect(() => {
    load();
  }, [load]);

  const activeTab = (tabOrder.includes(tab as StoreTabValue) ? tab : StoreTab.products) as StoreTabValue;

  const onPurchased = useCallback(() => {
    loadPoints();
    load();
  }, [load, loadPoints]);

  const onRedeemed = useCallback(() => {
    loadPoints();
  }, [loadPoints]);

  const pointsBalance = points?.balance ?? 0;

  const emptyStore = useMemo(() => {
    return !loading && !error && (skus?.length ?? 0) === 0;
  }, [error, loading, skus]);

  return (
    <PageContainer>
      <Container maxWidth="lg">
        <PageHeader title={t("store.title")} onRefresh={load} loading={loading} />

        <Box sx={{ mb: 3 }}>
          <StyledTabs
            value={activeTab}
            onChange={(_e, value) => setTab(value)}
            variant={"scrollable"}
            scrollButtons={"auto"}
          >
            <StyledTab value={StoreTab.products} label={t("store.tabs.products")} />
            <StyledTab value={StoreTab.points} label={t("store.tabs.points")} />
            <StyledTab value={StoreTab.giftcode} label={t("store.tabs.giftcode")} />
            <StyledTab value={StoreTab.orders} label={t("store.tabs.orders")} />
          </StyledTabs>
        </Box>

        {loading && !skus && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {error && !loading && (
          <Box>
            <Alert severity={"error"} sx={{ borderRadius: 3 }}>
              {error}
            </Alert>
            <Button sx={{ mt: 2 }} variant={"outlined"} onClick={load}>
              {t("store.retry")}
            </Button>
          </Box>
        )}

        {!error && !loading && emptyStore && activeTab === StoreTab.products && (
          <Box sx={{ textAlign: "center", py: 8 }}>
            <Typography variant={"h6"} sx={{ fontWeight: 600, mb: 1 }}>
              {t("store.empty")}
            </Typography>
            <Typography variant={"body2"} color={"text.secondary"}>
              {t("store.emptyHint")}
            </Typography>
          </Box>
        )}

        {!error && !loading && activeTab === StoreTab.products && !emptyStore && (
          <StoreProducts
            skus={skus ?? []}
            providers={providers ?? []}
            points={pointsBalance}
            onPurchased={onPurchased}
          />
        )}

        {!error && activeTab === StoreTab.points && (
          <StorePoints points={points} loading={loading} onRefresh={loadPoints} />
        )}

        {!error && activeTab === StoreTab.giftcode && <StoreGiftCode onRedeemed={onRedeemed} />}

        {!error && activeTab === StoreTab.orders && <StoreOrders />}
      </Container>
    </PageContainer>
  );
};

export default Store;
