import {
  Box,
  Button,
  Checkbox,
  Container,
  DialogContent,
  Divider,
  Link,
  ListItemText,
  SelectChangeEvent,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { useQueryState } from "nuqs";
import { useCallback, useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { batchDeleteAbuseReports, getAbuseReportList, handleAbuseReport } from "../../../api/api";
import { AbuseReport, AdminListService } from "../../../api/dashboard";
import { useAppDispatch } from "../../../redux/hooks";
import { confirmOperation } from "../../../redux/thunks/dialog";
import { DefaultCloseAction } from "../../Common/Snackbar/snackbar";
import {
  DenseFilledTextField,
  DenseSelect,
  NoWrapBox,
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
import Delete from "../../Icons/Delete";
import PageContainer from "../../Pages/PageContainer";
import PageHeader from "../../Pages/PageHeader";
import SettingForm from "../../Pages/Setting/SettingForm";
import TablePagination from "../Common/TablePagination";
import { PageQuery, PageSizeQuery } from "../StoragePolicy/StoragePolicySetting";

export const AbuseStatusQuery = "status";

export type AbuseStatus = "pending" | "resolved" | "dismissed";

const abuseStatusOptions: AbuseStatus[] = ["pending", "resolved", "dismissed"];

const statusLabel = (status: string, t: (key: string) => string): string => {
  switch (status) {
    case "pending":
      return t("abuseReport.statusPending");
    case "resolved":
      return t("abuseReport.statusResolved");
    case "dismissed":
      return t("abuseReport.statusDismissed");
    default:
      return status;
  }
};

const AbuseStatusChip = ({ status }: { status: string }) => {
  const { t } = useTranslation("dashboard");
  const color = status === "pending" ? "warning" : status === "resolved" ? "success" : "default";
  return <SquareChip size="small" color={color} label={statusLabel(status, t)} />;
};

interface AbuseRowProps {
  report?: AbuseReport;
  loading?: boolean;
  deleting?: boolean;
  selected?: boolean;
  onDelete?: () => void;
  onSelect?: (id: number) => void;
  onHandle?: (report: AbuseReport) => void;
}

const AbuseRow = ({ report, loading, deleting, selected, onDelete, onSelect, onHandle }: AbuseRowProps) => {
  const { t } = useTranslation("dashboard");
  const dispatch = useAppDispatch();
  const [deleteLoading, setDeleteLoading] = useState(false);

  const onDeleteClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    dispatch(confirmOperation(t("abuseReport.confirmDelete")))
      .then(() => {
        if (!report?.id) {
          return;
        }
        setDeleteLoading(true);
        dispatch(batchDeleteAbuseReports({ ids: [report.id] }))
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
    onSelect?.(report?.id ?? 0);
  };

  const onHandleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    if (report) {
      onHandle?.(report);
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
          <Skeleton variant="text" width={140} />
        </NoWrapTableCell>
        <NoWrapTableCell>
          <Skeleton variant="text" width={100} />
        </NoWrapTableCell>
        <NoWrapTableCell>
          <Skeleton variant="text" width={180} />
        </NoWrapTableCell>
        <NoWrapTableCell>
          <Skeleton variant="text" width={60} />
        </NoWrapTableCell>
        <NoWrapTableCell>
          <Skeleton variant="text" width={100} />
        </NoWrapTableCell>
        <NoWrapTableCell>
          <Skeleton variant="text" width={110} />
        </NoWrapTableCell>
        <NoWrapTableCell>
          <Skeleton variant="circular" width={24} height={24} />
        </NoWrapTableCell>
      </TableRow>
    );
  }

  return (
    <TableRow hover selected={selected}>
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
        <NoWrapTypography variant="inherit">{report?.id}</NoWrapTypography>
      </NoWrapTableCell>
      <NoWrapTableCell>
        <NoWrapTypography variant="inherit">{report?.reporter_email || "-"}</NoWrapTypography>
      </NoWrapTableCell>
      <TableCell>
        <NoWrapBox>
          {report?.share_url ? (
            <Trans
              ns={"dashboard"}
              i18nKey={"abuseReport.shareLink"}
              values={{ id: report.share_hash }}
              components={[
                <Link
                  key={"share-link"}
                  href={report.share_url}
                  target={"_blank"}
                  rel={"noopener noreferrer"}
                  underline={"hover"}
                  onClick={(e: React.MouseEvent<HTMLElement>) => e.stopPropagation()}
                />,
              ]}
            />
          ) : (
            <NoWrapTypography variant="inherit">
              <em>{t("abuseReport.deletedShare")}</em>
            </NoWrapTypography>
          )}
        </NoWrapBox>
      </TableCell>
      <TableCell>
        <Tooltip title={report?.file_name ?? ""}>
          <NoWrapTypography variant={"inherit"}>{report?.file_name || "-"}</NoWrapTypography>
        </Tooltip>
      </TableCell>
      <TableCell>
        <Tooltip title={report?.reason ?? ""}>
          <NoWrapTypography variant="inherit">{report?.reason || "-"}</NoWrapTypography>
        </Tooltip>
      </TableCell>
      <NoWrapTableCell>
        <AbuseStatusChip status={report?.status ?? ""} />
      </NoWrapTableCell>
      <TableCell>
        <Tooltip title={report?.note ?? ""}>
          <NoWrapTypography variant="inherit">{report?.note || "-"}</NoWrapTypography>
        </Tooltip>
      </TableCell>
      <NoWrapTableCell>
        <TimeBadge datetime={report?.created_at ?? ""} variant="inherit" timeAgoThreshold={0} />
      </NoWrapTableCell>
      <NoWrapTableCell>
        <Button size="small" onClick={onHandleClick} disabled={deleteLoading || deleting}>
          {t("abuseReport.handleTitle")}
        </Button>
        <Button size="small" color="error" onClick={onDeleteClick} disabled={deleteLoading || deleting}>
          <Delete fontSize="small" />
        </Button>
      </NoWrapTableCell>
    </TableRow>
  );
};

interface AbuseHandleDialogProps {
  open: boolean;
  onClose: () => void;
  report?: AbuseReport;
  onHandled?: () => void;
}

const AbuseHandleDialog = ({ open, onClose, report, onHandled }: AbuseHandleDialogProps) => {
  const { t } = useTranslation("dashboard");
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const [status, setStatus] = useState<AbuseStatus>("resolved");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    const current = report?.status;
    setStatus(current === "resolved" || current === "dismissed" ? current : "resolved");
    setNote(report?.note ?? "");
  }, [open, report]);

  const handleSubmit = () => {
    if (!report) {
      return;
    }
    const trimmed = note.trim();
    setLoading(true);
    dispatch(handleAbuseReport(report.id, { status, note: trimmed === "" ? undefined : trimmed }))
      .then(() => {
        enqueueSnackbar({
          message: status === "dismissed" ? t("abuseReport.handledDismissed") : t("abuseReport.handledResolved"),
          variant: "success",
          action: DefaultCloseAction,
        });
        onHandled?.();
        onClose();
      })
      .catch(() => {
        enqueueSnackbar({
          message: t("abuseReport.handleFailed"),
          variant: "error",
          action: DefaultCloseAction,
        });
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <DraggableDialog
      title={t("abuseReport.handleTitle")}
      dialogProps={{
        open,
        onClose,
        maxWidth: "sm",
        fullWidth: true,
      }}
      showActions={true}
      showCancel={true}
      onAccept={handleSubmit}
      loading={loading}
    >
      <DialogContent>
        <Stack spacing={3}>
          <Typography variant="body2" color="text.secondary" sx={{ wordBreak: "break-all" }}>
            {report?.share_hash ? `#${report.share_hash}` : t("abuseReport.deletedShare")}
          </Typography>

          <SettingForm title={t("abuseReport.status")} noContainer lgWidth={12}>
            <DenseSelect
              fullWidth
              value={status}
              onChange={(e: SelectChangeEvent<unknown>) => setStatus(e.target.value as AbuseStatus)}
            >
              {abuseStatusOptions.map((value) => (
                <SquareMenuItem key={value} value={value}>
                  <ListItemText
                    primary={statusLabel(value, t)}
                    slotProps={{
                      primary: {
                        variant: "body2",
                      },
                    }}
                  />
                </SquareMenuItem>
              ))}
            </DenseSelect>
          </SettingForm>

          <SettingForm title={t("abuseReport.handleNote")} noContainer lgWidth={12}>
            <DenseFilledTextField
              fullWidth
              multiline
              minRows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </SettingForm>
        </Stack>
      </DialogContent>
    </DraggableDialog>
  );
};

const AbuseList = () => {
  const { t } = useTranslation("dashboard");
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reports, setReports] = useState<AbuseReport[]>([]);
  const [page, setPage] = useQueryState(PageQuery, { defaultValue: "1" });
  const [pageSize, setPageSize] = useQueryState(PageSizeQuery, {
    defaultValue: "10",
  });
  const [status, setStatus] = useQueryState(AbuseStatusQuery, { defaultValue: "" });

  const [count, setCount] = useState(0);
  const [selected, setSelected] = useState<readonly number[]>([]);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [handleDialogOpen, setHandleDialogOpen] = useState(false);
  const [handleReport, setHandleReport] = useState<AbuseReport | undefined>(undefined);

  // Backend requires page >= 1 and 10 <= page_size <= 100
  const pageInt = Math.max(1, parseInt(page) || 1);
  const pageSizeInt = Math.min(100, Math.max(10, parseInt(pageSize) || 10));

  useEffect(() => {
    fetchReports();
  }, [page, pageSize, status]);

  const fetchReports = () => {
    setLoading(true);
    setSelected([]);
    setLoadFailed(false);

    const conditions: Record<string, string> = {};
    if (status !== "") {
      conditions.status = status;
    }

    const params: AdminListService = {
      page: pageInt,
      page_size: pageSizeInt,
      order_by: "",
      order_direction: "desc",
      conditions: conditions,
    };

    dispatch(getAbuseReportList(params))
      .then((res) => {
        setReports(res.reports);
        setPageSize(res.pagination.page_size.toString());
        setCount(res.pagination.total_items ?? 0);
      })
      .catch(() => {
        setReports([]);
        setCount(0);
        setLoadFailed(true);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleDelete = () => {
    setDeleteLoading(true);
    dispatch(confirmOperation(t("abuseReport.confirmBatchDelete", { num: selected.length })))
      .then(() => {
        dispatch(batchDeleteAbuseReports({ ids: Array.from(selected) }))
          .then(() => {
            fetchReports();
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
      const newSelected = reports.map((n) => n.id);
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

  const handleOpenHandleDialog = (report: AbuseReport) => {
    setHandleReport(report);
    setHandleDialogOpen(true);
  };

  return (
    <PageContainer>
      <AbuseHandleDialog
        open={handleDialogOpen}
        onClose={() => setHandleDialogOpen(false)}
        report={handleReport}
        onHandled={fetchReports}
      />
      <Container maxWidth="xl">
        <PageHeader title={t("dashboard:nav.abuseReport")} />
        <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: "center" }}>
          <SecondaryButton onClick={fetchReports} disabled={loading} variant={"contained"} startIcon={<ArrowSync />}>
            {t("node.refresh")}
          </SecondaryButton>

          <DenseSelect
            displayEmpty
            value={status == "" ? " " : status}
            onChange={(e: SelectChangeEvent<unknown>) =>
              setStatus(e.target.value === " " ? "" : (e.target.value as string))
            }
            sx={{ minWidth: 160 }}
          >
            <SquareMenuItem value={" "}>
              <ListItemText
                primary={<em>{t("abuseReport.allStatus")}</em>}
                slotProps={{
                  primary: {
                    variant: "body2",
                  },
                }}
              />
            </SquareMenuItem>
            {abuseStatusOptions.map((value) => (
              <SquareMenuItem key={value} value={value}>
                <ListItemText
                  primary={statusLabel(value, t)}
                  slotProps={{
                    primary: {
                      variant: "body2",
                    },
                  }}
                />
              </SquareMenuItem>
            ))}
          </DenseSelect>

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
                {t("abuseReport.deleteXAbuseReports", { num: selected.length })}
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
              {t("abuseReport.deleteXAbuseReports", { num: selected.length })}
            </Button>
          </Stack>
        )}
        {loadFailed && (
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            {t("abuseReport.loadFailed")}
          </Typography>
        )}
        <TableContainer component={StyledTableContainerPaper} sx={{ mt: 2 }}>
          <Table size="small" stickyHeader sx={{ width: "100%", tableLayout: "fixed" }}>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" sx={{ width: "36px!important" }} width={50}>
                  <Checkbox
                    size="small"
                    indeterminate={selected.length > 0 && selected.length < reports.length}
                    checked={reports.length > 0 && selected.length === reports.length}
                    onChange={handleSelectAllClick}
                  />
                </TableCell>
                <NoWrapTableCell width={70}>{t("group.#")}</NoWrapTableCell>
                <NoWrapTableCell width={180}>{t("abuseReport.reporter")}</NoWrapTableCell>
                <NoWrapTableCell width={130}>{t("vas.shareLink")}</NoWrapTableCell>
                <NoWrapTableCell width={125}>{t("abuseReport.folderPath")}</NoWrapTableCell>
                <NoWrapTableCell width={115}>{t("abuseReport.reason")}</NoWrapTableCell>
                <NoWrapTableCell width={100}>{t("abuseReport.status")}</NoWrapTableCell>
                <NoWrapTableCell width={105}>{t("abuseReport.note")}</NoWrapTableCell>
                <NoWrapTableCell width={175}>{t("abuseReport.createdAt")}</NoWrapTableCell>
                <NoWrapTableCell width={150}></NoWrapTableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!loading &&
                reports.map((report) => (
                  <AbuseRow
                    deleting={deleteLoading}
                    key={report.id}
                    report={report}
                    onDelete={fetchReports}
                    selected={selected.indexOf(report.id) !== -1}
                    onSelect={handleSelect}
                    onHandle={handleOpenHandleDialog}
                  />
                ))}
              {loading &&
                reports.length > 0 &&
                reports.slice(0, 10).map((report) => <AbuseRow key={`loading-${report.id}`} loading={true} />)}
              {loading &&
                reports.length === 0 &&
                Array.from(Array(10)).map((_, index) => <AbuseRow key={`loading-${index}`} loading={true} />)}
              {!loading && !loadFailed && reports.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      {t("abuseReport.empty")}
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

export default AbuseList;
