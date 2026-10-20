import {
  Box,
  Button,
  Checkbox,
  DialogContent,
  FormControl,
  ListItemText,
  SelectChangeEvent,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { createVASGiftCodes, deleteVASGiftCodes, getGroupList, getVASGiftCodes } from "../../../../api/api";
import { GiftCode, GroupEnt, VASProductType } from "../../../../api/dashboard";
import { useAppDispatch } from "../../../../redux/hooks";
import { confirmOperation } from "../../../../redux/thunks/dialog";
import { sizeToString } from "../../../../util";
import {
  DenseFilledTextField,
  DenseSelect,
  NoWrapCell,
  NoWrapTypography,
  SecondaryButton,
  StyledTableContainerPaper,
} from "../../../Common/StyledComponents";
import TimeBadge from "../../../Common/TimeBadge";
import DraggableDialog from "../../../Dialogs/DraggableDialog";
import { SquareMenuItem } from "../../../FileManager/ContextMenu/ContextMenu";
import Add from "../../../Icons/Add";
import Delete from "../../../Icons/Delete";
import SettingForm from "../../../Pages/Setting/SettingForm";
import TablePagination from "../../Common/TablePagination";
import { NoMarginHelperText } from "../Settings";
import { productTypes, sizeUnits, typeLabel } from "./utils";

const AnonymousGroupID = 3;

type UsedFilter = "all" | "used" | "unused";

export interface GenerateGiftCodeDialogProps {
  open: boolean;
  onClose: () => void;
  groups: GroupEnt[];
  onGenerated: () => void;
}

const GenerateGiftCodeDialog = ({ open, onClose, groups, onGenerated }: GenerateGiftCodeDialogProps) => {
  const { t } = useTranslation("dashboard");
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState("1");
  const [productType, setProductType] = useState<VASProductType>("points");
  const [numValue, setNumValue] = useState("0");
  const [sizeUnit, setSizeUnit] = useState(1024 ** 3);
  const [name, setName] = useState("");
  const [prefix, setPrefix] = useState("");

  const handleTypeChange = (next: VASProductType) => {
    setProductType(next);
    if (next === "storage") {
      setNumValue("0");
      setSizeUnit(1024 ** 3);
    } else if (next === "group") {
      setNumValue(groups.length > 0 ? String(groups[0].id) : "0");
    } else {
      setNumValue("0");
    }
  };

  const handleSubmit = () => {
    const countNum = Math.round(parseFloat(count) || 0);
    if (countNum < 1 || countNum > 100) {
      enqueueSnackbar(t("giftCodes.invalidCount"), { variant: "warning" });
      return;
    }
    const num =
      productType === "storage"
        ? Math.round((parseFloat(numValue) || 0) * sizeUnit)
        : Math.round(parseFloat(numValue) || 0);
    if (num <= 0 || (productType === "group" && !groups.some((g) => g.id === num))) {
      enqueueSnackbar(t("vas.invalidNum"), { variant: "warning" });
      return;
    }

    setLoading(true);
    dispatch(
      createVASGiftCodes({
        count: countNum,
        product_type: productType,
        num,
        name: name.trim(),
        prefix: prefix.trim(),
      }),
    )
      .then((res) => {
        enqueueSnackbar(t("giftCodes.giftCodesGenerated", { num: res.count }), { variant: "success" });
        onGenerated();
        onClose();
      })
      .catch(() => undefined)
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <DraggableDialog
      onAccept={handleSubmit}
      loading={loading}
      title={t("giftCodes.generate")}
      showActions
      showCancel
      dialogProps={{
        open,
        onClose,
        fullWidth: true,
        maxWidth: "sm",
      }}
    >
      <DialogContent>
        <Stack spacing={2}>
          <SettingForm title={t("giftCodes.giftCodeQuantity")} lgWidth={12}>
            <DenseFilledTextField
              fullWidth
              type="number"
              value={count}
              slotProps={{ htmlInput: { min: 1, max: 100, step: 1 } }}
              onChange={(e) => setCount(e.target.value)}
            />
            <NoMarginHelperText>{t("giftCodes.giftCodeQuantityHelp")}</NoMarginHelperText>
          </SettingForm>

          <SettingForm title={t("giftCodes.giftCodeProductType")} lgWidth={12}>
            <FormControl fullWidth>
              <DenseSelect value={productType} onChange={(e) => handleTypeChange(e.target.value as VASProductType)}>
                {productTypes.map((value) => (
                  <SquareMenuItem key={value} value={value}>
                    <ListItemText
                      primary={typeLabel(value, t)}
                      slotProps={{
                        primary: {
                          variant: "body2",
                        },
                      }}
                    />
                  </SquareMenuItem>
                ))}
              </DenseSelect>
            </FormControl>
          </SettingForm>

          {productType === "storage" && (
            <SettingForm title={t("settings.storageSize")} lgWidth={12}>
              <Stack direction={"row"} spacing={1}>
                <DenseFilledTextField
                  fullWidth
                  type="number"
                  value={numValue}
                  slotProps={{ htmlInput: { min: 0, step: 1 } }}
                  onChange={(e) => setNumValue(e.target.value)}
                />
                <FormControl sx={{ minWidth: 110 }}>
                  <DenseSelect value={String(sizeUnit)} onChange={(e) => setSizeUnit(Number(e.target.value))}>
                    {sizeUnits.map((unit) => (
                      <SquareMenuItem key={unit} value={String(unit)}>
                        <ListItemText
                          primary={sizeToString(unit)}
                          slotProps={{
                            primary: {
                              variant: "body2",
                            },
                          }}
                        />
                      </SquareMenuItem>
                    ))}
                  </DenseSelect>
                </FormControl>
              </Stack>
              <NoMarginHelperText>
                {t("vas.storageSizeHint", { size: sizeToString(Math.round((parseFloat(numValue) || 0) * sizeUnit)) })}
              </NoMarginHelperText>
            </SettingForm>
          )}

          {productType === "group" && (
            <SettingForm title={t("vas.group")} lgWidth={12}>
              <FormControl fullWidth>
                <DenseSelect
                  value={numValue}
                  onChange={(e) => setNumValue(e.target.value as string)}
                  required
                  disabled={groups.length === 0}
                >
                  {groups.map((group) => (
                    <SquareMenuItem key={group.id} value={String(group.id)}>
                      <ListItemText
                        primary={group.name}
                        slotProps={{
                          primary: {
                            variant: "body2",
                          },
                        }}
                      />
                    </SquareMenuItem>
                  ))}
                </DenseSelect>
              </FormControl>
              <NoMarginHelperText>{t("vas.groupDes")}</NoMarginHelperText>
            </SettingForm>
          )}

          {productType === "points" && (
            <SettingForm title={t("vas.pointsAmount")} lgWidth={12}>
              <DenseFilledTextField
                fullWidth
                type="number"
                value={numValue}
                slotProps={{ htmlInput: { min: 1, step: 1 } }}
                onChange={(e) => setNumValue(e.target.value)}
              />
              <NoMarginHelperText>{t("giftCodes.giftCodePointsAmountHelp")}</NoMarginHelperText>
            </SettingForm>
          )}

          <SettingForm title={t("vas.name")} lgWidth={12}>
            <DenseFilledTextField fullWidth value={name} onChange={(e) => setName(e.target.value)} />
            <NoMarginHelperText>{t("vas.giftCodeNameDes")}</NoMarginHelperText>
          </SettingForm>

          <SettingForm title={t("giftCodes.prefix")} lgWidth={12}>
            <DenseFilledTextField fullWidth value={prefix} onChange={(e) => setPrefix(e.target.value)} />
            <NoMarginHelperText>{t("giftCodes.prefixDes")}</NoMarginHelperText>
          </SettingForm>
        </Stack>
      </DialogContent>
    </DraggableDialog>
  );
};

const GiftCodes = () => {
  const { t } = useTranslation("dashboard");
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(true);
  const [codes, setCodes] = useState<GiftCode[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [usedFilter, setUsedFilter] = useState<UsedFilter>("all");
  const [selected, setSelected] = useState<readonly number[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [groups, setGroups] = useState<GroupEnt[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const usedParam = usedFilter === "all" ? undefined : usedFilter === "used";

  const fetchCodes = () => {
    setLoading(true);
    setSelected([]);
    dispatch(
      getVASGiftCodes(
        {
          page,
          page_size: pageSize,
          order_by: "",
          order_direction: "desc",
        },
        usedParam,
      ),
    )
      .then((res) => {
        setCodes(res.gift_codes ?? []);
        setTotal(res.pagination?.total_items ?? 0);
      })
      .catch(() => {
        setCodes([]);
        setTotal(0);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCodes();
  }, [page, pageSize, usedFilter]);

  useEffect(() => {
    dispatch(
      getGroupList({
        page: 1,
        page_size: 1000,
        order_by: "id",
        order_direction: "asc",
      }),
    )
      .then((res) => {
        setGroups(res.groups.filter((g) => g.id !== AnonymousGroupID));
      })
      .catch(() => {
        setGroups([]);
      });
  }, []);

  const renderNum = (code: GiftCode) => {
    switch (code.product_type) {
      case "storage":
        return sizeToString(code.num);
      case "group":
        return groups.find((g) => g.id === code.num)?.name ?? `#${code.num}`;
      default:
        return `${code.num} ${t("vas.credits")}`;
    }
  };

  const handleSelect = (id: number) => {
    setSelected((prev) => (prev.indexOf(id) === -1 ? [...prev, id] : prev.filter((v) => v !== id)));
  };

  const handleDelete = () => {
    setDeleting(true);
    dispatch(confirmOperation(t("giftCodes.confirmDeleteCodes", { num: selected.length })))
      .then(() => {
        dispatch(deleteVASGiftCodes({ ids: Array.from(selected) }))
          .then(() => {
            fetchCodes();
          })
          .catch(() => undefined)
          .finally(() => {
            setDeleting(false);
          });
      })
      .catch(() => {
        setDeleting(false);
      });
  };

  const handleUsedFilterChange = (e: SelectChangeEvent<unknown>) => {
    setUsedFilter(e.target.value as UsedFilter);
    setPage(1);
  };

  const filterLabel = (value: UsedFilter) => {
    switch (value) {
      case "used":
        return t("giftCodes.used");
      case "unused":
        return t("giftCodes.unused");
      default:
        return t("vas.all");
    }
  };

  const allSelected = codes.length > 0 && selected.length === codes.length;

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: "center", flexWrap: "wrap", gap: 1 }}>
        <SecondaryButton variant="contained" startIcon={<Add />} onClick={() => setDialogOpen(true)}>
          {t("giftCodes.generate")}
        </SecondaryButton>

        <DenseSelect value={usedFilter} onChange={handleUsedFilterChange} sx={{ minWidth: 140 }}>
          {(["all", "unused", "used"] as UsedFilter[]).map((value) => (
            <SquareMenuItem key={value} value={value}>
              <ListItemText
                primary={filterLabel(value)}
                slotProps={{
                  primary: {
                    variant: "body2",
                  },
                }}
              />
            </SquareMenuItem>
          ))}
        </DenseSelect>

        {selected.length > 0 && (
          <Button startIcon={<Delete />} variant="contained" color="error" onClick={handleDelete} disabled={deleting}>
            {t("giftCodes.deleteSelected", { num: selected.length })}
          </Button>
        )}
      </Stack>

      <TableContainer component={StyledTableContainerPaper}>
        <Table size="small" sx={{ width: "100%" }}>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  size="small"
                  indeterminate={selected.length > 0 && !allSelected}
                  checked={allSelected}
                  onChange={(e) => setSelected(e.target.checked ? codes.map((c) => c.id) : [])}
                />
              </TableCell>
              <NoWrapCell>{t("giftCodes.code")}</NoWrapCell>
              <NoWrapCell>{t("giftCodes.giftCodeType")}</NoWrapCell>
              <NoWrapCell>{t("giftCodes.giftCodeAmount")}</NoWrapCell>
              <NoWrapCell>{t("giftCodes.giftCodeStatus")}</NoWrapCell>
              <NoWrapCell>{t("giftCodes.usedBy")}</NoWrapCell>
              <NoWrapCell>{t("giftCodes.createdBy")}</NoWrapCell>
              <NoWrapCell>{t("giftCodes.createdAt")}</NoWrapCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {codes.map((code) => (
              <TableRow key={code.id} hover selected={selected.indexOf(code.id) !== -1}>
                <TableCell padding="checkbox">
                  <Checkbox
                    size="small"
                    disableRipple
                    checked={selected.indexOf(code.id) !== -1}
                    onClick={() => handleSelect(code.id)}
                  />
                </TableCell>
                <NoWrapCell>
                  <NoWrapTypography variant="inherit" sx={{ fontFamily: "monospace" }}>
                    {code.code}
                  </NoWrapTypography>
                </NoWrapCell>
                <NoWrapCell>{typeLabel(code.product_type, t)}</NoWrapCell>
                <NoWrapCell>{renderNum(code)}</NoWrapCell>
                <NoWrapCell>
                  <Typography variant="inherit" color={code.used ? "text.secondary" : "success.main"}>
                    {code.used ? t("giftCodes.used") : t("giftCodes.unused")}
                  </Typography>
                </NoWrapCell>
                <NoWrapCell>{code.used_by_email || "-"}</NoWrapCell>
                <NoWrapCell>{code.created_by_email || "-"}</NoWrapCell>
                <NoWrapCell>
                  {code.created_at ? (
                    <TimeBadge datetime={code.created_at} variant="inherit" timeAgoThreshold={0} />
                  ) : (
                    "-"
                  )}
                </NoWrapCell>
              </TableRow>
            ))}
            {!loading && codes.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography variant="caption" color="text.secondary">
                    {t("giftCodes.noGiftCodes")}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {loading && codes.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography variant="caption" color="text.secondary">
                    {t("application:setting.listEmpty")}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {total > 0 && (
        <Box sx={{ mt: 1 }}>
          <TablePagination
            page={page}
            totalItems={total}
            rowsPerPage={pageSize}
            rowsPerPageOptions={[10, 25, 50, 100]}
            onRowsPerPageChange={(value) => {
              setPageSize(value);
              setPage(1);
            }}
            onChange={(_, value) => setPage(value)}
          />
        </Box>
      )}

      {dialogOpen && (
        <GenerateGiftCodeDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          groups={groups}
          onGenerated={() => {
            setPage(1);
            fetchCodes();
          }}
        />
      )}
    </Box>
  );
};

export default GiftCodes;
