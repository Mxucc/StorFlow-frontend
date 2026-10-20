import { LinearProgress, linearProgressClasses, Skeleton, styled, Typography } from "@mui/material";
import { memo, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { getMyPoints, VASPointsUpdatedEvent } from "../../../api/vas.ts";
import { useAppDispatch, useAppSelector } from "../../../redux/hooks.ts";
import { updateUserCapacity } from "../../../redux/thunks/filemanager.ts";
import SessionManager from "../../../session";
import { sfGradients } from "../../../theme/storflow.ts";
import { sizeToString } from "../../../util";
import CoinStack from "../../Icons/CoinStack.tsx";
import { RadiusFrame } from "../RadiusFrame.tsx";

const StyledBox = styled(RadiusFrame)(({ theme }) => ({
  padding: theme.spacing(1.5, 2, 1.75, 2),
}));

const StorageHeaderContainer = styled("div")(() => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8,
}));

const BorderLinearProgress = styled(LinearProgress)<{ warning: boolean }>(({ theme, warning }) => ({
  height: 8,
  borderRadius: 999,
  [`&.${linearProgressClasses.colorPrimary}`]: {
    backgroundColor: theme.palette.mode === "light" ? "rgba(11,18,32,0.08)" : "rgba(255,255,255,0.14)",
  },
  [`& .${linearProgressClasses.bar}`]: {
    borderRadius: 999,
    backgroundImage: warning ? "none" : sfGradients.accent,
    backgroundColor: warning ? theme.palette.warning.main : undefined,
  },
  marginTop: theme.spacing(1),
}));

const StorageSummary = memo(() => {
  const { t } = useTranslation("application");
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const capacity = useAppSelector((state) => state.fileManager[0].capacity);
  const [points, setPoints] = useState<number | undefined>();
  const refreshPoints = useCallback(() => {
    if (!SessionManager.currentLoginOrNull()) {
      setPoints(undefined);
      return;
    }
    dispatch(getMyPoints())
      .then((res) => setPoints(res?.balance ?? 0))
      .catch(() => undefined);
  }, [dispatch]);
  useEffect(() => {
    if (!capacity) {
      dispatch(updateUserCapacity(0));
      return;
    }
  }, [capacity]);
  // 积分余额随路由切换刷新；商店里购买 / 兑换成功后会广播事件，这里立即跟上。
  useEffect(() => {
    refreshPoints();
  }, [refreshPoints, location.pathname]);
  useEffect(() => {
    window.addEventListener(VASPointsUpdatedEvent, refreshPoints);
    return () => window.removeEventListener(VASPointsUpdatedEvent, refreshPoints);
  }, [refreshPoints]);

  const usedPercent = capacity ? Math.min(100, (capacity.used / capacity.total) * 100) : 0;

  return (
    <StyledBox withBorder>
      <StorageHeaderContainer>
        <Typography variant={"subtitle2"} color={"text.secondary"}>
          {t("application:navbar.storage")}
        </Typography>
        {points !== undefined && (
          <Typography
            variant={"caption"}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              cursor: "pointer",
              color: "primary.main",
              fontWeight: 600,
            }}
            onClick={() => navigate("/store")}
          >
            <CoinStack sx={{ fontSize: 14 }} />
            {`${t("application:vas.points")} ${points}`}
          </Typography>
        )}
      </StorageHeaderContainer>
      {capacity && (
        <BorderLinearProgress warning={capacity.used > capacity.total} variant="determinate" value={usedPercent} />
      )}
      {!capacity && <Skeleton sx={{ mt: 1, height: 8 }} variant="rounded" />}
      <Typography
        variant={"caption"}
        color={"text.secondary"}
        sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 0.25 }}
      >
        {capacity ? (
          <>
            <span>{`${sizeToString(capacity.used)} / ${sizeToString(capacity.total)}`}</span>
            <span>{`${usedPercent.toFixed(usedPercent < 10 ? 1 : 0)}%`}</span>
          </>
        ) : (
          <Skeleton sx={{ width: "50%" }} variant="text" />
        )}
      </Typography>
    </StyledBox>
  );
});

export default StorageSummary;
