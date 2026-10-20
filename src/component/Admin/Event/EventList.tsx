import {
  Badge,
  Box,
  Button,
  Checkbox,
  Container,
  DialogContent,
  Divider,
  FormHelperText,
  ListItemText,
  Popover,
  PopoverProps,
  SelectChangeEvent,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { bindPopover, bindTrigger, usePopupState } from "material-ui-popup-state/hooks";
import { useSnackbar } from "notistack";
import { useQueryState } from "nuqs";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { batchDeleteAuditLog, cleanupAuditLog, getAuditLogList } from "../../../api/api";
import { AdminListService, AuditLogItem } from "../../../api/dashboard";
import { AuditLogType } from "../../../api/explorer";
import { useAppDispatch } from "../../../redux/hooks";
import { confirmOperation } from "../../../redux/thunks/dialog";
import { DefaultCloseAction } from "../../Common/Snackbar/snackbar";
import {
  DenseFilledTextField,
  DenseSelect,
  NoWrapTableCell,
  NoWrapTypography,
  SecondaryButton,
  SquareChip,
  StyledTableContainerPaper,
} from "../../Common/StyledComponents";
import TimeBadge from "../../Common/TimeBadge";
import DraggableDialog from "../../Dialogs/DraggableDialog";
import { SquareMenuItem } from "../../FileManager/ContextMenu/ContextMenu";
import ArrowSync from "../../Icons/ArrowSync";
import Broom from "../../Icons/Broom";
import Delete from "../../Icons/Delete";
import Filter from "../../Icons/Filter";
import SlideText from "../../Icons/SlideText";
import PageContainer from "../../Pages/PageContainer";
import PageHeader from "../../Pages/PageHeader";
import SettingForm from "../../Pages/Setting/SettingForm";
import TablePagination from "../Common/TablePagination";
import { OrderByQuery, OrderDirectionQuery, PageQuery, PageSizeQuery } from "../StoragePolicy/StoragePolicySetting";

export const EventUserQuery = "user";
export const EventTypeQuery = "type";

/** All event names, in the order they are declared in `AuditLogType`. */
const eventTypeOptions = Object.keys(AuditLogType);

/** Reverse lookup: numeric event type -> event name. */
const getEventName = (type: number): string =>
  Object.entries(AuditLogType).find(([, value]) => value === type)?.[0] ?? String(type);

interface EventRowProps {
  log?: AuditLogItem;
  loading?: boolean;
  deleting?: boolean;
  selected?: boolean;
  onDelete?: () => void;
  onSelect?: (id: number) => void;
  onDetails?: (log: AuditLogItem) => void;
}

const EventRow = ({ log, loading, deleting, selected, onDelete, onSelect, onDetails }: EventRowProps) => {
  const { t } = useTranslation("dashboard");
  const dispatch = useAppDispatch();
  const [deleteLoading, setDeleteLoading] = useState(false);

  const onRowClick = () => {
    if (log) {
      onDetails?.(log);
    }
  };

  const onDeleteClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    dispatch(confirmOperation(t("event.confirmDelete")))
      .then(() => {
        if (!log?.id) {
          return;
        }
        setDeleteLoading(true);
        dispatch(batchDeleteAuditLog({ ids: [log.id] }))
          .then(() => {
            onDelete?.();
          })
          .catch(() => undefined)
          .finally(() => {
            setDeleteLoading(false);
          });
      })
      .catch(() => undefined);
  };

  const onSelectClick = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect?.(log?.id ?? 0);
  };

  const onDetailsClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    if (log) {
      onDetails?.(log);
    }
  };

  if (loading) {
    return (
      <TableRow sx={{ height: "43px" }}>
        <TableCell padding="checkbox">
          <Skeleton variant="circular" width={24} height={24} />
        </TableCell>
        <NoWrapTableCell>
          <Skeleton variant="text" width={30} />
        </NoWrapTableCell>
        <NoWrapTableCell>
          <Skeleton variant="text" width={120} />
        </NoWrapTableCell>
        <NoWrapTableCell>
          <Skeleton variant="text" width={160} />
        </NoWrapTableCell>
        <NoWrapTableCell>
          <Skeleton variant="text" width={80} />
        </NoWrapTableCell>
        <NoWrapTableCell>
          <Skeleton variant="text" width={120} />
        </NoWrapTableCell>
        <NoWrapTableCell>
          <Skeleton variant="circular" width={24} height={24} />
        </NoWrapTableCell>
      </TableRow>
    );
  }

  const eventName = getEventName(log?.type ?? 0);
  const initiator = log?.user_email || log?.edges?.user?.email;

  return (
    <TableRow hover sx={{ cursor: "pointer" }} onClick={onRowClick} selected={selected}>
      <TableCell padding="checkbox">
        <Checkbox
          disabled={deleting}
          size="small"
          disableRipple
          color="primary"
          onClick={onSelectClick}
          checked={selected}
        />
      </TableCell>
      <NoWrapTableCell>
        <NoWrapTypography variant="inherit">{log?.id}</NoWrapTypography>
      </NoWrapTableCell>
      <NoWrapTableCell>
        <NoWrapTypography variant="inherit">
          {t(`settings.event.${eventName}`, { defaultValue: log?.action ?? String(log?.type ?? 0) })}
        </NoWrapTypography>
      </NoWrapTableCell>
      <NoWrapTableCell>
        {initiator ? <NoWrapTypography variant="inherit">{initiator}</NoWrapTypography> : <em>{t("event.system")}</em>}
      </NoWrapTableCell>
      <NoWrapTableCell>
        <NoWrapTypography variant="inherit">{log?.ip || "-"}</NoWrapTypography>
      </NoWrapTableCell>
      <NoWrapTableCell>
        <TimeBadge datetime={log?.created_at ?? ""} variant="inherit" timeAgoThreshold={0} />
      </NoWrapTableCell>
      <NoWrapTableCell>
        <Tooltip title={t("event.eventDialogTitle")}>
          <span>
            <Button size="small" onClick={onDetailsClick} disabled={deleteLoading || deleting}>
              <SlideText fontSize="small" />
            </Button>
          </span>
        </Tooltip>
        <Button size="small" color="error" onClick={onDeleteClick} disabled={deleteLoading || deleting}>
          <Delete fontSize="small" />
        </Button>
      </NoWrapTableCell>
    </TableRow>
  );
};

interface EventFilterPopoverProps extends PopoverProps {
  user: string;
  setUser: (user: string) => void;
  type: string;
  setType: (type: string) => void;
  clearFilters: () => void;
}

const EventFilterPopover = ({
  user,
  setUser,
  type,
  setType,
  clearFilters,
  onClose,
  open,
  ...rest
}: EventFilterPopoverProps) => {
  const { t } = useTranslation("dashboard");
  const [localUser, setLocalUser] = useState(user);
  const [localType, setLocalType] = useState(type);

  // Initialize local state when popup opens
  useEffect(() => {
    if (open) {
      setLocalUser(user);
      setLocalType(type);
    }
  }, [open]);

  const handleApplyFilters = () => {
    setUser(localUser);
    setType(localType);
    onClose?.({}, "backdropClick");
  };

  const handleResetFilters = () => {
    setLocalUser("");
    setLocalType("");
    clearFilters();
    onClose?.({}, "backdropClick");
  };

  return (
    <Popover
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "left",
      }}
      transformOrigin={{
        vertical: "top",
        horizontal: "left",
      }}
      slotProps={{
        paper: {
          sx: {
            p: 2,
            width: 300,
            maxWidth: "100%",
          },
        },
      }}
      onClose={onClose}
      open={open}
      {...rest}
    >
      <Stack spacing={2}>
        <SettingForm title={t("event.userID")} noContainer lgWidth={12}>
          <DenseFilledTextField
            fullWidth
            value={localUser}
            onChange={(e) => setLocalUser(e.target.value)}
            placeholder={t("event.filterUserPlaceholder")}
            size="small"
          />
        </SettingForm>

        <SettingForm title={t("event.type")} noContainer lgWidth={12}>
          <DenseSelect
            fullWidth
            displayEmpty
            value={localType == "" ? " " : localType}
            onChange={(e: SelectChangeEvent<unknown>) =>
              setLocalType(e.target.value === " " ? "" : (e.target.value as string))
            }
          >
            {eventTypeOptions.map((name) => (
              <SquareMenuItem key={name} value={name}>
                <ListItemText
                  primary={t(`settings.event.${name}`)}
                  slotProps={{
                    primary: {
                      variant: "body2",
                    },
                  }}
                />
              </SquareMenuItem>
            ))}
            <SquareMenuItem value={" "}>
              <ListItemText
                primary={<em>{t("event.allEventTypes")}</em>}
                slotProps={{
                  primary: {
                    variant: "body2",
                  },
                }}
              />
            </SquareMenuItem>
          </DenseSelect>
        </SettingForm>

        <Box display="flex" justifyContent="space-between">
          <Button variant="outlined" size="small" onClick={handleResetFilters}>
            {t("user.reset")}
          </Button>
          <Button variant="contained" size="small" onClick={handleApplyFilters}>
            {t("user.apply")}
          </Button>
        </Box>
      </Stack>
    </Popover>
  );
};

interface EventCleanupDialogProps {
  open: boolean;
  onClose: () => void;
  onCleanupComplete?: () => void;
}

const EventCleanupDialog = ({ open, onClose, onCleanupComplete }: EventCleanupDialogProps) => {
  const { t } = useTranslation("dashboard");
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [days, setDays] = useState("1");
  const [loading, setLoading] = useState(false);

  const beforeDays = parseInt(days, 10);
  const valid = !Number.isNaN(beforeDays) && beforeDays >= 1;

  const handleCleanup = () => {
    if (!valid) {
      return;
    }
    setLoading(true);
    dispatch(
      cleanupAuditLog({
        types: selectedTypes.length > 0 ? selectedTypes : undefined,
        before_days: beforeDays,
      }),
    )
      .then(() => {
        enqueueSnackbar({
          message: t("event.cleaned"),
          variant: "success",
          action: DefaultCloseAction,
        });
        onCleanupComplete?.();
        onClose();
      })
      .catch(() => {
        enqueueSnackbar({
          message: t("event.cleanupFailed"),
          variant: "error",
          action: DefaultCloseAction,
        });
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleReset = () => {
    setSelectedTypes([]);
    setDays("1");
  };

  return (
    <DraggableDialog
      title={t("event.cleanupAuditLog")}
      dialogProps={{
        open,
        onClose,
        maxWidth: "sm",
        fullWidth: true,
      }}
      showActions={true}
      showCancel={true}
      onAccept={handleCleanup}
      loading={loading}
      disabled={!valid}
      okText={t("event.cleanup")}
      secondaryAction={
        <Button onClick={handleReset} disabled={loading}>
          {t("user.reset")}
        </Button>
      }
    >
      <DialogContent>
        <Stack spacing={3}>
          <Typography variant="body2" color="text.secondary">
            {t("event.cleanupAuditLogDescription")}
          </Typography>

          <SettingForm title={t("event.cleanupEventTypes")} noContainer lgWidth={12}>
            <DenseSelect
              fullWidth
              multiple
              displayEmpty
              value={selectedTypes}
              onChange={(e: SelectChangeEvent<unknown>) => setSelectedTypes(e.target.value as string[])}
              renderValue={(selected) => {
                const values = Array.isArray(selected) ? (selected as string[]) : [];
                if (values.length === 0) {
                  return <em>{t("event.allEventTypes")}</em>;
                }
                return (
                  <Box display="flex" flexWrap="wrap" gap={0.5}>
                    {values.map((value) => (
                      <SquareChip key={value} size="small" label={t(`settings.event.${value}`)} />
                    ))}
                  </Box>
                );
              }}
            >
              {eventTypeOptions.map((name) => (
                <SquareMenuItem key={name} value={name}>
                  <ListItemText
                    primary={t(`settings.event.${name}`)}
                    slotProps={{
                      primary: {
                        variant: "body2",
                      },
                    }}
                  />
                </SquareMenuItem>
              ))}
            </DenseSelect>
            <FormHelperText>{t("event.cleanupEventTypesDes")}</FormHelperText>
          </SettingForm>

          <SettingForm title={t("event.cleanupDaysHint", { days: valid ? beforeDays : 0 })} noContainer lgWidth={12}>
            <DenseFilledTextField
              fullWidth
              type="number"
              required
              value={days}
              onChange={(e) => setDays(e.target.value)}
              slotProps={{
                htmlInput: {
                  min: 1,
                },
              }}
            />
          </SettingForm>
        </Stack>
      </DialogContent>
    </DraggableDialog>
  );
};

interface EventDetailDialogProps {
  open: boolean;
  onClose: () => void;
  log?: AuditLogItem;
}

const EventDetailRow = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Box>
    <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
      {title}
    </Typography>
    {children}
  </Box>
);

const EventDetailDialog = ({ open, onClose, log }: EventDetailDialogProps) => {
  const { t } = useTranslation("dashboard");
  const eventName = getEventName(log?.type ?? 0);
  const initiator = log?.user_email || log?.edges?.user?.email;

  return (
    <DraggableDialog
      title={t("event.eventDialogTitle")}
      dialogProps={{
        open,
        onClose,
        maxWidth: "md",
        fullWidth: true,
      }}
    >
      <DialogContent>
        <Stack spacing={2}>
          <EventDetailRow title={t("event.event")}>
            <Typography variant="body2" color="text.secondary">
              {t(`settings.event.${eventName}`, { defaultValue: log?.action ?? String(log?.type ?? 0) })}
            </Typography>
          </EventDetailRow>

          <EventDetailRow title={t("event.initiator")}>
            <Typography variant="body2" color="text.secondary" sx={{ wordBreak: "break-all" }}>
              {initiator || t("event.system")}
            </Typography>
          </EventDetailRow>

          <EventDetailRow title={t("event.ip")}>
            <Typography variant="body2" color="text.secondary" sx={{ wordBreak: "break-all" }}>
              {log?.ip || "-"}
            </Typography>
          </EventDetailRow>

          <EventDetailRow title={t("event.datetime")}>
            <TimeBadge datetime={log?.created_at ?? ""} variant="body2" timeAgoThreshold={0} />
          </EventDetailRow>

          <EventDetailRow title={t("event.correlationId")}>
            <Typography variant="body2" color="text.secondary" sx={{ wordBreak: "break-all" }}>
              {log?.correlation_id || "-"}
            </Typography>
          </EventDetailRow>

          <EventDetailRow title={t("event.rawContent")}>
            <Box
              component="pre"
              sx={{
                m: 0,
                p: 1.5,
                maxHeight: 300,
                overflow: "auto",
                borderRadius: 1,
                bgcolor: "action.hover",
                fontFamily: "monospace",
                fontSize: "12px",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
            >
              {JSON.stringify(log?.content ?? {}, null, 2)}
            </Box>
          </EventDetailRow>
        </Stack>
      </DialogContent>
    </DraggableDialog>
  );
};

const EventList = () => {
  const { t } = useTranslation("dashboard");
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [page, setPage] = useQueryState(PageQuery, { defaultValue: "1" });
  const [pageSize, setPageSize] = useQueryState(PageSizeQuery, {
    defaultValue: "10",
  });
  const [orderBy, setOrderBy] = useQueryState(OrderByQuery, {
    defaultValue: "",
  });
  const [orderDirection, setOrderDirection] = useQueryState(OrderDirectionQuery, { defaultValue: "desc" });
  const [user, setUser] = useQueryState(EventUserQuery, { defaultValue: "" });
  const [type, setType] = useQueryState(EventTypeQuery, { defaultValue: "" });

  const [count, setCount] = useState(0);
  const [selected, setSelected] = useState<readonly number[]>([]);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailLog, setDetailLog] = useState<AuditLogItem | undefined>(undefined);
  const filterPopupState = usePopupState({
    variant: "popover",
    popupId: "eventFilterPopover",
  });

  // Backend requires page >= 1 and 10 <= page_size <= 100
  const pageInt = Math.max(1, parseInt(page) || 1);
  const pageSizeInt = Math.min(100, Math.max(10, parseInt(pageSize) || 10));

  const clearFilters = useCallback(() => {
    setUser("");
    setType("");
  }, [setUser, setType]);

  useEffect(() => {
    fetchEvents();
  }, [page, pageSize, orderBy, orderDirection, user, type]);

  const fetchEvents = () => {
    setLoading(true);
    setSelected([]);
    setLoadFailed(false);

    const conditions: Record<string, string> = {};
    if (user.trim() !== "") {
      conditions.audit_user = user.trim();
    }
    if (type !== "") {
      conditions.audit_action = type;
    }

    // The backend only accepts `created_at` / `type` as sort field (empty = default order)
    const orderByParam = orderBy === "created_at" || orderBy === "type" ? orderBy : "";

    const params: AdminListService = {
      page: pageInt,
      page_size: pageSizeInt,
      order_by: orderByParam,
      order_direction: orderDirection === "asc" ? "asc" : "desc",
      conditions: conditions,
    };

    dispatch(getAuditLogList(params))
      .then((res) => {
        setLogs(res.logs);
        setPageSize(res.pagination.page_size.toString());
        setCount(res.pagination.total_items ?? 0);
      })
      .catch(() => {
        setLogs([]);
        setCount(0);
        setLoadFailed(true);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleDelete = () => {
    setDeleteLoading(true);
    dispatch(confirmOperation(t("event.confirmBatchDelete", { num: selected.length })))
      .then(() => {
        dispatch(batchDeleteAuditLog({ ids: Array.from(selected) }))
          .then(() => {
            fetchEvents();
          })
          .catch(() => undefined)
          .finally(() => {
            setDeleteLoading(false);
          });
      })
      .catch(() => {
        setDeleteLoading(false);
      });
  };

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = logs.map((n) => n.id);
      setSelected(newSelected);
      return;
    }
    setSelected([]);
  };

  const handleSelect = useCallback(
    (id: number) => {
      const selectedIndex = selected.indexOf(id);
      let newSelected: readonly number[] = [];

      if (selectedIndex === -1) {
        newSelected = newSelected.concat(selected, id);
      } else if (selectedIndex === 0) {
        newSelected = newSelected.concat(selected.slice(1));
      } else if (selectedIndex === selected.length - 1) {
        newSelected = newSelected.concat(selected.slice(0, -1));
      } else if (selectedIndex > 0) {
        newSelected = newSelected.concat(selected.slice(0, selectedIndex), selected.slice(selectedIndex + 1));
      }
      setSelected(newSelected);
    },
    [selected],
  );

  const direction = orderDirection as "asc" | "desc";
  const isCreatedAtOrder = orderBy === "" || orderBy === "created_at";
  const onSortClick = (field: "created_at" | "type") => () => {
    if (field === "created_at") {
      setOrderBy("created_at");
      setOrderDirection(isCreatedAtOrder && direction === "desc" ? "asc" : "desc");
      return;
    }
    setOrderBy("type");
    setOrderDirection(orderBy === "type" && direction === "asc" ? "desc" : "asc");
  };

  const hasActiveFilters = user !== "" || type !== "";

  const handleOpenDetails = (log: AuditLogItem) => {
    setDetailLog(log);
    setDetailDialogOpen(true);
  };

  return (
    <PageContainer>
      <EventCleanupDialog
        open={cleanupDialogOpen}
        onClose={() => setCleanupDialogOpen(false)}
        onCleanupComplete={fetchEvents}
      />
      <EventDetailDialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} log={detailLog} />
      <Container maxWidth="xl">
        <PageHeader title={t("dashboard:nav.events")} />
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <EventFilterPopover
            {...bindPopover(filterPopupState)}
            user={user}
            setUser={setUser}
            type={type}
            setType={setType}
            clearFilters={clearFilters}
          />

          <SecondaryButton onClick={fetchEvents} disabled={loading} variant={"contained"} startIcon={<ArrowSync />}>
            {t("node.refresh")}
          </SecondaryButton>

          <Badge color="primary" variant="dot" invisible={!hasActiveFilters}>
            <SecondaryButton startIcon={<Filter />} variant="contained" {...bindTrigger(filterPopupState)}>
              {t("user.filter")}
            </SecondaryButton>
          </Badge>

          <SecondaryButton
            startIcon={<Broom />}
            variant="contained"
            onClick={() => setCleanupDialogOpen(true)}
            disabled={loading}
          >
            {t("event.cleanup")}
          </SecondaryButton>

          {selected.length > 0 && !isMobile && (
            <>
              <Divider orientation="vertical" flexItem />
              <Button
                startIcon={<Delete />}
                variant="contained"
                color="error"
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                {t("event.deleteXEvents", { num: selected.length })}
              </Button>
            </>
          )}
        </Stack>
        {isMobile && selected.length > 0 && (
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Button
              startIcon={<Delete />}
              variant="contained"
              color="error"
              onClick={handleDelete}
              disabled={deleteLoading}
            >
              {t("event.deleteXEvents", { num: selected.length })}
            </Button>
          </Stack>
        )}
        {loadFailed && (
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            {t("event.loadFailed")}
          </Typography>
        )}
        <TableContainer component={StyledTableContainerPaper} sx={{ mt: 2 }}>
          <Table size="small" stickyHeader sx={{ width: "100%", tableLayout: "fixed" }}>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" sx={{ width: "36px!important" }} width={50}>
                  <Checkbox
                    size="small"
                    indeterminate={selected.length > 0 && selected.length < logs.length}
                    checked={logs.length > 0 && selected.length === logs.length}
                    onChange={handleSelectAllClick}
                  />
                </TableCell>
                <NoWrapTableCell width={80}>{t("group.#")}</NoWrapTableCell>
                <NoWrapTableCell width={220}>
                  <TableSortLabel
                    active={orderBy === "type"}
                    direction={orderBy === "type" ? direction : "asc"}
                    onClick={onSortClick("type")}
                  >
                    {t("event.event")}
                  </TableSortLabel>
                </NoWrapTableCell>
                <NoWrapTableCell width={190}>{t("event.initiator")}</NoWrapTableCell>
                <NoWrapTableCell width={130}>{t("event.ip")}</NoWrapTableCell>
                <NoWrapTableCell width={180}>
                  <TableSortLabel
                    active={isCreatedAtOrder}
                    direction={isCreatedAtOrder ? direction : "desc"}
                    onClick={onSortClick("created_at")}
                  >
                    {t("event.datetime")}
                  </TableSortLabel>
                </NoWrapTableCell>
                <NoWrapTableCell width={120}></NoWrapTableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!loading &&
                logs.map((log) => (
                  <EventRow
                    deleting={deleteLoading}
                    key={log.id}
                    log={log}
                    onDelete={fetchEvents}
                    selected={selected.indexOf(log.id) !== -1}
                    onSelect={handleSelect}
                    onDetails={handleOpenDetails}
                  />
                ))}
              {loading &&
                logs.length > 0 &&
                logs.slice(0, 10).map((log) => <EventRow key={`loading-${log.id}`} loading={true} />)}
              {loading &&
                logs.length === 0 &&
                Array.from(Array(10)).map((_, index) => <EventRow key={`loading-${index}`} loading={true} />)}
              {!loading && !loadFailed && logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      {t("event.empty")}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {count > 0 && (
          <Box sx={{ mt: 1 }}>
            <TablePagination
              page={pageInt}
              totalItems={count}
              rowsPerPage={pageSizeInt}
              rowsPerPageOptions={[10, 25, 50, 100]}
              onRowsPerPageChange={(value) => setPageSize(value.toString())}
              onChange={(_, value) => setPage(value.toString())}
            />
          </Box>
        )}
      </Container>
    </PageContainer>
  );
};

export default EventList;
