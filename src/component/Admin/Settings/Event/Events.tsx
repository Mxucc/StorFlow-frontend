import {
  Box,
  Checkbox,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import { useContext, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { AuditLogType } from "../../../../api/explorer";
import { NoMarginHelperText, SettingSection, SettingSectionContent } from "../Settings";
import { SettingContext } from "../SettingWrapper";

/**
 * 事件记录配置（Pro「事件」功能的设置页）。
 *
 * 配置项 `audit_event_enabled` 保存**已启用**的事件名 JSON 数组：
 * - 缺省（从未配置过）= 记录全部事件；
 * - 显式数组（含空数组）= 只记录数组里的事件，空数组表示全部关闭。
 *
 * 后端在 `pkg/setting/provider.go` 的 `AuditEventEnabled` 中读取该项，并在写入
 * 审计日志前判断（`service/explorer/audit.go`、`service/user/audit.go` 等）。
 */
export const auditEventSettingKey = "audit_event_enabled";

// Categorize audit events
export const eventCategories = {
  system: {
    title: "settings.systemEvents",
    description: "settings.systemEventsDes",
    events: [AuditLogType.server_start],
  },
  user: {
    title: "settings.userEvents",
    description: "settings.userEventsDes",
    events: [
      AuditLogType.user_signup,
      AuditLogType.user_activated,
      AuditLogType.user_login,
      AuditLogType.user_login_failed,
      AuditLogType.user_token_refresh,
      AuditLogType.user_changed,
      AuditLogType.user_exceed_quota_notified,
      AuditLogType.change_nick,
      AuditLogType.change_avatar,
      AuditLogType.change_password,
      AuditLogType.enable_2fa,
      AuditLogType.disable_2fa,
      AuditLogType.add_passkey,
      AuditLogType.remove_passkey,
      AuditLogType.link_account,
      AuditLogType.unlink_account,
      AuditLogType.report_abuse,
      AuditLogType.oauth_grant_create,
      AuditLogType.oauth_token_exchange,
      AuditLogType.oauth_grant_revoke,
    ],
  },
  file: {
    title: "settings.fileEvents",
    description: "settings.fileEventsDes",
    events: [
      AuditLogType.file_create,
      AuditLogType.file_imported,
      AuditLogType.file_rename,
      AuditLogType.set_file_permission,
      AuditLogType.entity_uploaded,
      AuditLogType.entity_downloaded,
      AuditLogType.copy_from,
      AuditLogType.copy_to,
      AuditLogType.move_to,
      AuditLogType.delete_file,
      AuditLogType.move_to_trash,
      AuditLogType.update_metadata,
      AuditLogType.get_direct_link,
      AuditLogType.delete_direct_link,
      AuditLogType.update_view,
    ],
  },
  share: {
    title: "settings.shareEvents",
    description: "settings.shareEventsDes",
    events: [AuditLogType.share, AuditLogType.share_link_viewed, AuditLogType.edit_share, AuditLogType.delete_share],
  },
  version: {
    title: "settings.versionEvents",
    description: "settings.versionEventsDes",
    events: [AuditLogType.set_current_version, AuditLogType.delete_version],
  },
  media: {
    title: "settings.mediaEvents",
    description: "settings.mediaEventsDes",
    events: [AuditLogType.thumb_generated, AuditLogType.live_photo_uploaded],
  },
  filesystem: {
    title: "settings.filesystemEvents",
    description: "settings.filesystemEventsDes",
    events: [AuditLogType.mount, AuditLogType.relocate, AuditLogType.create_archive, AuditLogType.extract_archive],
  },
  webdav: {
    title: "settings.webdavEvents",
    description: "settings.webdavEventsDes",
    events: [
      AuditLogType.webdav_login_failed,
      AuditLogType.webdav_account_create,
      AuditLogType.webdav_account_update,
      AuditLogType.webdav_account_delete,
    ],
  },
  payment: {
    title: "settings.paymentEvents",
    description: "settings.paymentEventsDes",
    events: [
      AuditLogType.payment_created,
      AuditLogType.points_change,
      AuditLogType.payment_paid,
      AuditLogType.payment_fulfilled,
      AuditLogType.payment_fulfill_failed,
      AuditLogType.storage_added,
      AuditLogType.group_changed,
      AuditLogType.membership_unsubscribe,
      AuditLogType.redeem_gift_code,
    ],
  },
  email: {
    title: "settings.emailEvents",
    description: "settings.emailEventsDes",
    events: [AuditLogType.email_sent],
  },
};

// Get event name from AuditLogType
export const getEventName = (eventType: number): string => {
  return Object.entries(AuditLogType).find(([_, value]) => value === eventType)?.[0] || `event_${eventType}`;
};

/** 全部事件名（把「全部启用」展开成显式清单时使用）。 */
const allEventNames = Object.values(AuditLogType).map((type) => getEventName(type));

const Events = () => {
  const { t } = useTranslation("dashboard");
  const { formRef, setSettings, values } = useContext(SettingContext);

  /**
   * 已启用的事件名集合；`null` 表示「从未配置过」= 全部启用。
   * 显式空数组在这里是空集合（全部关闭），与后端语义一致。
   */
  const enabledNames = useMemo<Set<string> | null>(() => {
    const raw = (values[auditEventSettingKey] ?? "").trim();
    if (raw === "") {
      return null;
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return null;
      }
      return new Set(parsed.filter((name): name is string => typeof name === "string"));
    } catch {
      return null;
    }
  }, [values]);

  const isEnabled = (eventType: number) => !enabledNames || enabledNames.has(getEventName(eventType));

  const persist = (names: Set<string>) => {
    // 归一化顺序，便于审阅；空集合表示「全部关闭」
    const ordered = allEventNames.filter((name) => names.has(name));
    setSettings({ [auditEventSettingKey]: JSON.stringify(ordered) });
  };

  const toggleEvent = (eventType: number, enabled: boolean) => {
    const next = new Set(enabledNames ?? allEventNames);
    const name = getEventName(eventType);
    if (enabled) {
      next.add(name);
    } else {
      next.delete(name);
    }
    persist(next);
  };

  const toggleCategory = (events: number[], enabled: boolean) => {
    const next = new Set(enabledNames ?? allEventNames);
    events.map(getEventName).forEach((name) => {
      if (enabled) {
        next.add(name);
      } else {
        next.delete(name);
      }
    });
    persist(next);
  };

  const categoryState = (events: number[]) => {
    const enabled = events.filter((eventType) => isEnabled(eventType)).length;
    return {
      checked: events.length > 0 && enabled === events.length,
      indeterminate: enabled > 0 && enabled < events.length,
    };
  };

  return (
    <Box component={"form"} ref={formRef} onSubmit={(e) => e.preventDefault()}>
      <Stack spacing={5}>
        <SettingSection>
          <Typography variant={"h6"}>{t("settings.auditLog")}</Typography>
          <Typography variant={"body2"} color={"text.secondary"} sx={{ mb: 1 }}>
            {t("settings.auditLogDes")}
          </Typography>
          <NoMarginHelperText>{t("settings.auditLogAllHint")}</NoMarginHelperText>

          {Object.entries(eventCategories).map(([categoryKey, category]) => {
            const state = categoryState(category.events);
            return (
              <SettingSection key={categoryKey}>
                <Box>
                  <Typography variant={"subtitle1"}>{t(category.title)}</Typography>
                  <Typography variant={"body2"} color={"text.secondary"}>
                    {t(category.description)}
                  </Typography>
                </Box>

                <SettingSectionContent>
                  <FormControl component={"fieldset"}>
                    <FormGroup>
                      <FormControlLabel
                        slotProps={{
                          typography: {
                            variant: "body2",
                          },
                        }}
                        control={
                          <Checkbox
                            size={"small"}
                            checked={state.checked}
                            indeterminate={state.indeterminate}
                            onChange={(e) => toggleCategory(category.events, e.target.checked)}
                          />
                        }
                        label={t("settings.toggleAll")}
                      />
                      <NoMarginHelperText>{t("settings.toggleAllDes")}</NoMarginHelperText>
                    </FormGroup>
                  </FormControl>
                  <Grid container spacing={1}>
                    {category.events.map((eventType) => (
                      <Grid item xs={12} sm={6} md={4} lg={3} key={eventType}>
                        <FormControlLabel
                          slotProps={{
                            typography: {
                              variant: "body2",
                            },
                          }}
                          control={
                            <Checkbox
                              size={"small"}
                              checked={isEnabled(eventType)}
                              onChange={(e) => toggleEvent(eventType, e.target.checked)}
                            />
                          }
                          label={t(`settings.event.${getEventName(eventType)}`, getEventName(eventType))}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </SettingSectionContent>
                <Divider sx={{ mt: 1 }} />
              </SettingSection>
            );
          })}
        </SettingSection>
      </Stack>
    </Box>
  );
};

export default Events;
