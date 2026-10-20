import { OpenInNew } from "@mui/icons-material";
import {
  Box,
  Collapse,
  Divider,
  FormControl,
  Grid2 as Grid,
  Link,
  ListItemText,
  SelectChangeEvent,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useSnackbar } from "notistack";
import dayjs from "dayjs";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getGroupList, sendCalibrateUserStorage } from "../../../../api/api";
import { GroupEnt, UserStatus } from "../../../../api/dashboard";
import { useAppDispatch } from "../../../../redux/hooks";
import { DefaultCloseAction } from "../../../Common/Snackbar/snackbar";
import { DenseFilledTextField, DenseSelect, SecondaryButton } from "../../../Common/StyledComponents";
import UserAvatar from "../../../Common/User/UserAvatar";
import { SquareMenuItem } from "../../../FileManager/ContextMenu/ContextMenu";
import Delete from "../../../Icons/Delete";
import SettingForm from "../../../Pages/Setting/SettingForm";
import { CapacityBar } from "../../../Pages/Setting/StorageSetting";
import GroupSelectionInput from "../../Common/GroupSelectionInput";
import { NoMarginHelperText } from "../../Settings/Settings";
import { UserDialogContext } from "./UserDialog";

const UserForm = ({ reload, setLoading }: { reload: () => void; setLoading: (loading: boolean) => void }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { t } = useTranslation("dashboard");
  const { formRef, values, setUser } = useContext(UserDialogContext);

  // 原始用户组需要展示组名，这里加载一次用户组列表用于只读解析。
  const [groups, setGroups] = useState<GroupEnt[]>([]);
  useEffect(() => {
    dispatch(
      getGroupList({
        page: 1,
        page_size: 1000,
        order_by: "id",
        order_direction: "asc",
      }),
    )
      .then((res) => setGroups(res.groups))
      .catch(() => undefined);
  }, [dispatch]);

  const previousGroupName = useMemo(() => {
    const id = values.previous_group ?? 0;
    if (!id) {
      return "";
    }
    return groups.find((g) => g.id === id)?.name ?? `#${id}`;
  }, [groups, values.previous_group]);

  const removeAvatar = useCallback(() => {
    setUser((prev) => ({ ...prev, avatar: undefined }));
  }, [setUser]);

  const onEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setUser((prev) => ({ ...prev, email: e.target.value }));
    },
    [setUser],
  );

  const onNickChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setUser((prev) => ({ ...prev, nick: e.target.value }));
    },
    [setUser],
  );

  const onStatusChange = useCallback(
    (e: SelectChangeEvent<unknown>) => {
      setUser((prev) => ({ ...prev, status: e.target.value as UserStatus }));
    },
    [setUser],
  );

  const onGroupChange = useCallback(
    (value: string) => {
      setUser((prev) => ({ ...prev, group_users: parseInt(value) }));
    },
    [setUser],
  );

  const onPasswordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setUser((prev) => ({ ...prev, password: e.target.value ? e.target.value : undefined }));
    },
    [setUser],
  );

  const onReset2FA = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      setUser((prev) => ({ ...prev, two_fa_enabled: false }));
    },
    [setUser],
  );

  const onCalibrateStorage = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      setLoading(true);
      dispatch(sendCalibrateUserStorage(values.id))
        .then(() => {
          reload();
          enqueueSnackbar({
            message: t("user.calibrateStorageSuccess"),
            variant: "success",
            action: DefaultCloseAction,
          });
        })
        .finally(() => {
          setLoading(false);
        });
    },
    [dispatch, values.id],
  );

  return (
    <Box component={"form"} ref={formRef} onSubmit={(e) => e.preventDefault()}>
      <Stack spacing={isMobile ? 2 : 3} direction={isMobile ? "column" : "row"}>
        <Stack spacing={isMobile ? 2 : 3} direction={"column"} sx={{ minWidth: 200 }}>
          <SettingForm title={t("user.avatar")} noContainer lgWidth={12}>
            <UserAvatar
              square
              overwriteTextSize
              sx={{
                width: 150,
                height: 150,
              }}
              user={{
                created_at: values.created_at,
                nickname: values.nick ?? "",
                id: values.hash_id ?? "",
                // 未设置头像时留空，避免请求必定 404 的 /user/avatar/:id
                avatar: values.avatar,
              }}
            />
            <Collapse in={!!values.avatar} unmountOnExit>
              <SecondaryButton sx={{ mt: 1 }} onClick={removeAvatar} variant="contained" startIcon={<Delete />}>
                {t("user.removeAvatar")}
              </SecondaryButton>
            </Collapse>
          </SettingForm>
          <SettingForm title={t("user.id")} noContainer lgWidth={12}>
            <Typography variant="body2" color="text.secondary">
              {t("user.idValue", { id: values.id, hash_id: values.hash_id })}
            </Typography>
          </SettingForm>
          <SettingForm title={t("application:vas.quota")} noContainer lgWidth={12}>
            <Box sx={{ mt: 1, width: "100%" }}>
              <CapacityBar forceRow capacity={values.capacity} />
            </Box>
            <Typography variant="body2" sx={{ mt: 1 }}>
              <Link href="#/" onClick={onCalibrateStorage} underline="hover">
                {t("user.calibrateStorage")}
              </Link>
            </Typography>
          </SettingForm>
          <Box>
            <SecondaryButton
              sx={{ mt: 1 }}
              onClick={() => navigate(`/admin/file?owner=${values.hash_id}`)}
              variant="contained"
              startIcon={<OpenInNew />}
              disabled={!values.hash_id}
            >
              {t("user.openUserFiles")}
            </SecondaryButton>
          </Box>
        </Stack>
        <Divider orientation="vertical" flexItem />
        <Box sx={{ flexGrow: 1 }}>
          <Grid container spacing={isMobile ? 2 : 3}>
            <SettingForm title={t("user.email")} noContainer lgWidth={6}>
              <DenseFilledTextField fullWidth type="email" value={values.email} required onChange={onEmailChange} />
            </SettingForm>
            <SettingForm title={t("user.nick")} noContainer lgWidth={6}>
              <DenseFilledTextField fullWidth value={values.nick} required onChange={onNickChange} />
            </SettingForm>
            <SettingForm title={t("user.userStatus")} noContainer lgWidth={6}>
              <FormControl fullWidth>
                <DenseSelect value={values.status} onChange={onStatusChange}>
                  {Object.values(UserStatus).map((value) => (
                    <SquareMenuItem value={value} key={value}>
                      <ListItemText slotProps={{ primary: { variant: "body2" } }}>
                        {t(`user.status_${value}`)}
                      </ListItemText>
                    </SquareMenuItem>
                  ))}
                </DenseSelect>
              </FormControl>
            </SettingForm>
            <SettingForm title={t("user.group")} noContainer lgWidth={6}>
              <GroupSelectionInput value={values.group_users?.toString() ?? ""} onChange={onGroupChange} fullWidth />
            </SettingForm>
            <SettingForm title={t("application:vas.points")} noContainer lgWidth={6}>
              <DenseFilledTextField
                slotProps={{
                  htmlInput: {
                    type: "number",
                    min: 0,
                    readOnly: true,
                  },
                }}
                fullWidth
                value={values.points ?? 0}
              />
            </SettingForm>
            <SettingForm title={t("user.password")} noContainer lgWidth={6}>
              <DenseFilledTextField
                placeholder={t("user.passwordDes")}
                fullWidth
                value={values.password ?? ""}
                slotProps={{
                  htmlInput: {
                    minLength: 6,
                  },
                }}
                onChange={onPasswordChange}
                type={"password"}
              />
            </SettingForm>
            <SettingForm title={t("user.originUserGroup")} noContainer lgWidth={6}>
              <DenseFilledTextField
                fullWidth
                slotProps={{ htmlInput: { readOnly: true } }}
                value={previousGroupName || t("user.noOriginUserGroup")}
              />
              <NoMarginHelperText>{t("user.originUserGroupDes")}</NoMarginHelperText>
            </SettingForm>
            <SettingForm title={t("user.groupExpired")} noContainer lgWidth={6}>
              <DenseFilledTextField
                fullWidth
                slotProps={{ htmlInput: { readOnly: true } }}
                value={
                  values.group_expires && !values.group_expires.startsWith("0001")
                    ? dayjs(values.group_expires).format("YYYY-MM-DD HH:mm")
                    : ""
                }
              />
              <NoMarginHelperText>{t("user.groupExpiredDes")}</NoMarginHelperText>
            </SettingForm>
            <SettingForm title={t("user.createdAt")} noContainer lgWidth={6}>
              <DenseFilledTextField
                fullWidth
                value={values.created_at ?? ""}
                slotProps={{ htmlInput: { readOnly: true } }}
              />
            </SettingForm>
            <SettingForm title={t("user.2FA")} noContainer lgWidth={6}>
              <Typography variant="body2" color="text.secondary">
                {values.two_fa_enabled ? t("user.2FAEnabled") : t("user.notEnabled")}
                {values.two_fa_enabled && (
                  <Link href="#/" onClick={onReset2FA} sx={{ ml: 1 }} underline="hover">
                    {t("user.reset2Fa")}
                  </Link>
                )}
              </Typography>
            </SettingForm>
          </Grid>
        </Box>
      </Stack>
    </Box>
  );
};

export default UserForm;
