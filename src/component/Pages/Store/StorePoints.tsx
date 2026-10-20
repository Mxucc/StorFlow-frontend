import * as React from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { VASPointsSummary } from "../../../api/vas.ts";

/** 积分账本时间由 ent 直接序列化（RFC3339Nano），这里统一成可读格式。 */
const formatLedgerTime = (value?: string): string => {
  if (!value) {
    return "—";
  }
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD HH:mm:ss") : value;
};

interface StorePointsProps {
  points?: VASPointsSummary;
  loading: boolean;
  onRefresh: () => void;
}

/** 积分账本原因码 → 文案。 */
const reasonLabel = (reason: string, t: (key: string) => string): string => {
  switch (reason) {
    case "recharge":
      return t("store.reason.recharge");
    case "purchase":
      return t("store.reason.purchase");
    case "redeem":
      return t("store.reason.redeem");
    case "admin":
      return t("store.reason.admin");
    default:
      return reason;
  }
};

const StorePoints = ({ points, loading, onRefresh }: StorePointsProps) => {
  const { t } = useTranslation();
  const history = points?.history ?? [];

  return (
    <Box>
      <Stack
        direction={"row"}
        spacing={2}
        alignItems={"center"}
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 3,
          bgcolor: "background.paper",
          p: 3,
          mb: 3,
          flexWrap: "wrap",
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant={"body2"} color={"text.secondary"}>
            {t("store.pointsBalance")}
          </Typography>
          <Typography variant={"h4"} sx={{ fontWeight: 600 }}>
            {points ? points.balance : "--"}
          </Typography>
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        <Button variant={"outlined"} onClick={onRefresh} disabled={loading}>
          {t("store.refresh")}
        </Button>
      </Stack>

      {loading && !points && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && history.length === 0 && (
        <Box sx={{ textAlign: "center", py: 6 }}>
          <Typography variant={"body2"} color={"text.secondary"}>
            {t("store.pointsEmpty")}
          </Typography>
        </Box>
      )}

      {history.length > 0 && (
        <Box
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 3,
            bgcolor: "background.paper",
            overflowX: "auto",
          }}
        >
          <Table size={"small"} sx={{ minWidth: 640 }}>
            <TableHead>
              <TableRow>
                <TableCell>{t("store.points.fields.time")}</TableCell>
                <TableCell width={120}>{t("store.points.fields.change")}</TableCell>
                <TableCell width={140}>{t("store.points.fields.balance")}</TableCell>
                <TableCell>{t("store.points.fields.note")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>
                    <Typography variant={"caption"} color={"text.secondary"}>
                      {formatLedgerTime(row.created_at)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size={"small"}
                      color={row.delta >= 0 ? "success" : "default"}
                      variant={"outlined"}
                      label={`${row.delta >= 0 ? "+" : ""}${row.delta}`}
                    />
                  </TableCell>
                  <TableCell>{row.balance_after}</TableCell>
                  <TableCell sx={{ maxWidth: 0 }}>
                    <Typography variant={"body2"}>{reasonLabel(row.reason, t)}</Typography>
                    {row.note && (
                      <Typography variant={"caption"} color={"text.secondary"} sx={{ overflowWrap: "anywhere" }}>
                        {row.note}
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </Box>
  );
};

export default StorePoints;
