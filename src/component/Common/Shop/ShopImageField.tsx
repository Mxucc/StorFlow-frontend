import {
  Alert,
  Box,
  Button,
  CircularProgress,
  DialogContent,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useSnackbar } from "notistack";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getFileList, getFileThumb } from "../../../api/api.ts";
import { FileResponse, FileType } from "../../../api/explorer.ts";
import { AppError } from "../../../api/request.ts";
import { adoptShopAsset, listShopAssets, ShopAsset, ShopAssetMaxSize, uploadShopAsset } from "../../../api/shop.ts";
import { useAppDispatch } from "../../../redux/hooks.ts";
import { getFileLinkedUri, sizeToString } from "../../../util";
import DraggableDialog from "../../Dialogs/DraggableDialog.tsx";
import Delete from "../../Icons/Delete.tsx";
import FolderOutlined from "../../Icons/FolderOutlined.tsx";
import ImageOutlined from "../../Icons/ImageOutlined.tsx";
import Upload from "../../Icons/Upload.tsx";
import { DefaultCloseAction } from "../Snackbar/snackbar.tsx";
import { DenseFilledTextField, FilledTextField } from "../StyledComponents.tsx";

/** 允许的图片扩展名：与后端素材白名单保持一致。 */
const imageExtPattern = /\.(png|jpe?g|gif|webp|bmp)$/i;
/** 网盘浏览时最多为多少个文件取缩略图（避免一次请求过多）。 */
const thumbLimit = 36;

const isImageName = (name?: string): boolean => !!name && imageExtPattern.test(name);

export const ShopImageShape = {
  /** 头像：正方形小图 */
  square: "square",
  /** 商品封面：4 / 3 */
  cover: "cover",
  /** 店铺横幅 / 背景：16 / 9 */
  banner: "banner",
} as const;

export type ShopImageShapeValue = (typeof ShopImageShape)[keyof typeof ShopImageShape];

const previewSize = (shape: ShopImageShapeValue) => {
  switch (shape) {
    case ShopImageShape.square:
      return { width: 64, height: 64, radius: "999px" };
    case ShopImageShape.banner:
      return { width: 160, height: 90, radius: "10px" };
    default:
      return { width: 120, height: 90, radius: "10px" };
  }
};

const driveRoot = "storflow://my";

/** 把 storflow:// URI 拆成面包屑（根目录除外）。 */
const crumbsOf = (path: string): string[] =>
  path
    .replace(driveRoot, "")
    .split("/")
    .filter((segment) => segment.length > 0);

/**
 * 网盘图片浏览器。
 *
 * 复用文件列表接口（`GET /file`），只把图片显示为可选，文件夹可以继续下钻；
 * 非图片文件置灰，避免把整个网盘变成不可用的列表。
 */
const DriveImageBrowser = ({
  selected,
  onSelect,
}: {
  selected?: FileResponse;
  onSelect: (file?: FileResponse) => void;
}) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const [path, setPath] = useState(driveRoot);
  const [files, setFiles] = useState<FileResponse[] | undefined>();
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(undefined);
    dispatch(getFileList({ uri: path, page_size: 200, order_by: "name", order_direction: "asc" }))
      .then((res) => {
        if (cancelled) {
          return;
        }
        const list = (res.files ?? []).filter((file) => file.type === FileType.folder || isImageName(file.name));
        list.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : b.type - a.type));
        setFiles(list);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof AppError ? e.message : t("shop.manage.fields.imageBrowserFailed"));
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
  }, [dispatch, path, t]);

  useEffect(() => {
    const images = (files ?? [])
      .filter((file) => file.type === FileType.file && isImageName(file.name))
      .slice(0, thumbLimit);
    if (images.length === 0) {
      return;
    }
    let cancelled = false;
    images.forEach((file) => {
      dispatch(getFileThumb(file.path))
        .then((thumb) => {
          if (!cancelled && thumb?.url) {
            setThumbs((prev) => ({ ...prev, [file.path]: thumb.url }));
          }
        })
        .catch(() => undefined);
    });
    return () => {
      cancelled = true;
    };
  }, [dispatch, files]);

  const crumbs = crumbsOf(path);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: 0, height: "100%", width: "100%" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          flexWrap: "wrap",
          px: 3,
          py: 1,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Button size={"small"} disabled={path === driveRoot} onClick={() => setPath(driveRoot)}>
          {t("shop.manage.fields.imageBrowserRoot")}
        </Button>
        {crumbs.map((crumb, index) => (
          <React.Fragment key={`${crumb}-${index}`}>
            <Typography variant={"caption"} color={"text.disabled"}>
              /
            </Typography>
            <Button
              size={"small"}
              disabled={index === crumbs.length - 1}
              onClick={() => setPath(`${driveRoot}/${crumbs.slice(0, index + 1).join("/")}`)}
            >
              {crumb}
            </Button>
          </React.Fragment>
        ))}
      </Box>
      <Box sx={{ overflowY: "auto", px: 3, py: 2, flexGrow: 1, minHeight: 0 }}>
        {error && (
          <Alert severity={"error"} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        )}
        {!loading && (files ?? []).length === 0 && (
          <Typography variant={"body2"} color={"text.secondary"} sx={{ py: 6, textAlign: "center" }}>
            {t("shop.manage.fields.imageBrowserEmpty")}
          </Typography>
        )}
        {!loading && (files ?? []).length > 0 && (
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(132px, 1fr))", gap: 1.5 }}>
            {(files ?? []).map((file) => {
              const isFolder = file.type === FileType.folder;
              const isImage = isImageName(file.name);
              const active = selected?.path === file.path;
              return (
                <Box
                  key={file.path}
                  component={"button"}
                  type={"button"}
                  disabled={!isFolder && !isImage}
                  onClick={() => (isFolder ? setPath(file.path) : onSelect(active ? undefined : file))}
                  sx={{
                    p: 0,
                    textAlign: "left",
                    border: "1px solid",
                    borderColor: active ? "primary.main" : "divider",
                    borderRadius: 2,
                    overflow: "hidden",
                    cursor: isFolder || isImage ? "pointer" : "not-allowed",
                    opacity: !isFolder && !isImage ? 0.45 : 1,
                    bgcolor: active ? "action.selected" : "transparent",
                    "&:hover": { borderColor: isFolder || isImage ? "primary.main" : "divider" },
                    "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main" },
                  }}
                >
                  <Box
                    sx={{
                      aspectRatio: "4 / 3",
                      bgcolor: "action.hover",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                    }}
                  >
                    {isFolder ? (
                      <FolderOutlined sx={{ fontSize: 30, color: "text.disabled" }} />
                    ) : thumbs[file.path] ? (
                      <Box
                        component={"img"}
                        src={thumbs[file.path]}
                        alt={file.name}
                        loading={"lazy"}
                        sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    ) : (
                      <ImageOutlined sx={{ fontSize: 28, color: "text.disabled" }} />
                    )}
                  </Box>
                  <Box sx={{ px: 1, py: 0.75 }}>
                    <Typography variant={"caption"} noWrap sx={{ display: "block" }}>
                      {file.name}
                    </Typography>
                    <Typography variant={"caption"} color={"text.secondary"} noWrap sx={{ display: "block" }}>
                      {isFolder ? t("shop.manage.fields.imageBrowserFolder") : sizeToString(file.size)}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    </Box>
  );
};

interface ShopImagePickerProps {
  open: boolean;
  onClose: () => void;
  /** 选中一张图片后回调其素材 URL。 */
  onPick: (url: string) => void;
  /** 打开时默认展示的页签。 */
  initialTab?: "library" | "drive";
}

/**
 * 图片选择器：两个来源合在一个对话框里。
 *
 * - 「我的素材」：之前上传 / 挑选过的图片，可以直接复用；
 * - 「从网盘选择」：浏览自己的网盘，挑一张图片。
 *
 * 两种来源都由后端快照成素材（`/api/v4/shop/asset*`），所以店铺前台是公开的，
 * 同时又不会把网盘里的私有文件暴露出去。
 */
export const ShopImagePicker = ({ open, onClose, onPick, initialTab = "library" }: ShopImagePickerProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const [tab, setTab] = useState<"library" | "drive">(initialTab);
  const [assets, setAssets] = useState<ShopAsset[] | undefined>();
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [driveFile, setDriveFile] = useState<FileResponse | undefined>();
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!open) {
      return;
    }
    setError(undefined);
    setLoading(true);
    dispatch(listShopAssets())
      .then((res) => setAssets(res ?? []))
      .catch(() => setAssets([]))
      .finally(() => setLoading(false));
  }, [dispatch, open]);

  const useDriveFile = useCallback(() => {
    if (!driveFile) {
      return;
    }
    setBusy(true);
    setError(undefined);
    dispatch(adoptShopAsset(getFileLinkedUri(driveFile)))
      .then((asset) => {
        setAssets((prev) => (prev ? [asset, ...prev] : [asset]));
        onPick(asset.url);
        onClose();
      })
      .catch((e) => setError(e instanceof AppError ? e.message : t("shop.manage.fields.imageLoadFailed")))
      .finally(() => setBusy(false));
  }, [dispatch, driveFile, onClose, onPick, t]);

  return (
    <DraggableDialog
      title={t("shop.manage.fields.imagePickerTitle")}
      showActions={tab === "drive"}
      loading={busy}
      disabled={!driveFile}
      okText={t("shop.manage.fields.imagePickerUseFile")}
      onAccept={useDriveFile}
      secondaryAction={
        <Typography variant={"body2"} color={"text.secondary"} noWrap>
          {driveFile
            ? t("shop.manage.fields.imagePickerSelected", { name: driveFile.name })
            : t("shop.manage.fields.imagePickerPickImage")}
        </Typography>
      }
      dialogProps={{
        open,
        onClose,
        fullWidth: true,
        maxWidth: "lg",
        PaperProps: { sx: { height: "80vh" } },
      }}
    >
      <Box sx={{ px: 3, borderBottom: "1px solid", borderColor: "divider" }}>
        <Tabs value={tab} onChange={(_e, value) => setTab(value)}>
          <Tab value={"library"} label={t("shop.manage.fields.imagePickerLibrary")} />
          <Tab value={"drive"} label={t("shop.manage.fields.imagePickerDrive")} />
        </Tabs>
      </Box>
      {tab === "library" && (
        <DialogContent>
          {error && (
            <Alert severity={"error"} sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {loading && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress size={28} />
            </Box>
          )}
          {!loading && (assets ?? []).length === 0 && (
            <Box sx={{ py: 6, textAlign: "center" }}>
              <Typography variant={"body2"} color={"text.secondary"}>
                {t("shop.manage.fields.imagePickerEmpty")}
              </Typography>
              <Button sx={{ mt: 1 }} size={"small"} onClick={() => setTab("drive")}>
                {t("shop.manage.fields.imagePickerDrive")}
              </Button>
            </Box>
          )}
          {!loading && (assets ?? []).length > 0 && (
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 1.5 }}>
              {(assets ?? []).map((asset) => (
                <Box
                  key={asset.id}
                  component={"button"}
                  type={"button"}
                  onClick={() => {
                    onPick(asset.url);
                    onClose();
                  }}
                  sx={{
                    p: 0,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                    overflow: "hidden",
                    cursor: "pointer",
                    bgcolor: "transparent",
                    "&:hover": { borderColor: "primary.main" },
                    "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main" },
                  }}
                >
                  <Box
                    component={"img"}
                    src={asset.url}
                    alt={asset.name ?? ""}
                    loading={"lazy"}
                    sx={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", display: "block" }}
                  />
                  <Typography
                    variant={"caption"}
                    color={"text.secondary"}
                    noWrap
                    sx={{ display: "block", px: 1, py: 0.5 }}
                  >
                    {asset.name || asset.id}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
      )}
      {tab === "drive" && (
        <DialogContent sx={{ display: "flex", p: 0, minHeight: 0 }}>
          <DriveImageBrowser selected={driveFile} onSelect={setDriveFile} />
        </DialogContent>
      )}
    </DraggableDialog>
  );
};

export interface ShopImageFieldProps {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  helperText?: string;
  shape?: ShopImageShapeValue;
  dense?: boolean;
  disabled?: boolean;
}

/**
 * 图片字段：预览 + 地址 +「上传」「从网盘选择」「清除」。
 *
 * 字段最终仍然是一个 URL 字符串，所以既可以直接粘贴外链，也可以走素材库；
 * 表单提交逻辑不需要为图片做任何特殊处理。
 */
const ShopImageField = ({
  label,
  value,
  onChange,
  helperText,
  shape = ShopImageShape.cover,
  dense,
  disabled,
}: ShopImageFieldProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const inputRef = useRef<HTMLInputElement>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [broken, setBroken] = useState(false);

  const url = (value ?? "").trim();
  const size = useMemo(() => previewSize(shape), [shape]);

  useEffect(() => {
    setBroken(false);
  }, [url]);

  const upload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // 允许连续选择同一个文件
    event.target.value = "";
    if (!file) {
      return;
    }
    if (file.size > ShopAssetMaxSize) {
      enqueueSnackbar({
        message: t("shop.manage.fields.imageTooLarge"),
        variant: "warning",
        action: DefaultCloseAction,
      });
      return;
    }
    setUploading(true);
    dispatch(uploadShopAsset(file))
      .then((asset) => onChange(asset.url))
      .catch((e) =>
        enqueueSnackbar({
          message: e instanceof AppError ? e.message : t("shop.manage.fields.imageUploadFailed"),
          variant: "error",
          action: DefaultCloseAction,
        }),
      )
      .finally(() => setUploading(false));
  };

  const TextFieldComponent = dense ? DenseFilledTextField : TextField;

  return (
    <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
      <Box
        sx={{
          width: size.width,
          height: size.height,
          flexShrink: 0,
          borderRadius: size.radius,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "action.hover",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {url && !broken ? (
          <Box
            component={"img"}
            src={url}
            alt={label}
            onError={() => setBroken(true)}
            sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <ImageOutlined sx={{ fontSize: shape === ShopImageShape.square ? 22 : 26, color: "text.disabled" }} />
        )}
      </Box>
      <Box sx={{ flexGrow: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
        <TextFieldComponent
          fullWidth
          size={"small"}
          variant={"outlined"}
          label={label}
          value={value ?? ""}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          helperText={broken && url ? t("shop.manage.fields.imageBroken") : helperText}
          FormHelperTextProps={{ sx: { mx: 0 } }}
        />
        <Stack direction={"row"} spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
          <Button
            size={"small"}
            variant={"outlined"}
            disabled={disabled || uploading}
            startIcon={uploading ? <CircularProgress size={14} /> : <Upload sx={{ fontSize: 16 }} />}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? t("shop.manage.fields.imageUploading") : t("shop.manage.fields.imageUpload")}
          </Button>
          <Button
            size={"small"}
            variant={"outlined"}
            disabled={disabled}
            startIcon={<FolderOutlined sx={{ fontSize: 16 }} />}
            onClick={() => setPickerOpen(true)}
          >
            {t("shop.manage.fields.imagePickNetdisk")}
          </Button>
          <Button
            size={"small"}
            color={"inherit"}
            disabled={disabled || !url}
            startIcon={<Delete sx={{ fontSize: 16 }} />}
            onClick={() => onChange("")}
          >
            {t("shop.manage.fields.imageClear")}
          </Button>
        </Stack>
        <input
          ref={inputRef}
          type={"file"}
          accept={"image/png,image/jpeg,image/gif,image/webp,image/bmp"}
          hidden
          onChange={upload}
        />
      </Box>
      <ShopImagePicker open={pickerOpen} onClose={() => setPickerOpen(false)} onPick={(picked) => onChange(picked)} />
    </Box>
  );
};

export default ShopImageField;
