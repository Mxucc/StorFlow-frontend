import { Box } from "@mui/material";
import { enqueueSnackbar } from "notistack";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { LoginResponse } from "../../../api/user.ts";
import { useAppDispatch } from "../../../redux/hooks.ts";
import { refreshUserSession } from "../../../redux/thunks/session.ts";
import CircularProgress from "../../Common/CircularProgress.tsx";
import { DefaultCloseAction } from "../../Common/Snackbar/snackbar.tsx";

/**
 * Decode a base64url encoded string (UTF-8 aware) into its plain text form.
 */
const base64UrlDecode = (input: string): string => {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = window.atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};
/**
 * 只接受站点内相对路径；登录页自身（/session、/login）不是有效的目的页，
 * 否则 SSO 登录成功后会再次落回登录页。缺省回首页。
 */
const sanitizeRedirect = (value: string | null): string => {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/home";
  }
  const path = value.split("?")[0];
  if (path === "/session" || path === "/login") {
    return "/home";
  }
  return value;
};

/**
 * OIDC (SSO) login callback page. The backend redirects here with a fragment of
 * the form `#session=<base64url(LoginResponse)>&redirect=<urlencoded path>`.
 */
const OIDCCallback = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
    const params = new URLSearchParams(hash);
    const session = params.get("session");
    const redirect = sanitizeRedirect(params.get("redirect"));

    const fail = () => {
      enqueueSnackbar({
        message: t("login.ssoSignInFailed"),
        variant: "error",
        action: DefaultCloseAction,
      });
      navigate("/login");
    };

    if (!session) {
      fail();
      return;
    }

    try {
      const loginResponse = JSON.parse(base64UrlDecode(session)) as LoginResponse;
      if (!loginResponse?.user || !loginResponse?.token) {
        throw new Error("invalid session payload");
      }
      dispatch(refreshUserSession(loginResponse, redirect));
    } catch (e) {
      console.error(e);
      fail();
    }
  }, [dispatch, navigate, t]);

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        pt: 7,
        pb: 9,
      }}
    >
      <CircularProgress />
    </Box>
  );
};

export default OIDCCallback;
