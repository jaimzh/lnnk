"use client";

import React, { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Clipboard, FileImage, FileText, ImagePlus, X } from "lucide-react";
import { useHeroContext } from "@/context/HeroContext";
import LoadingModal from "@/components/features/shortener/loading-modal";
import { readFromClipboard, cn } from "@/lib/utils";
import { ShortenButton } from "@/components/ui/shorten-button";
import { uploadFiles } from "@/lib/uploadthing";
import {
  createCdnAssetOptionsSchema,
  createCdnTextAssetSchema,
} from "@/schemas/cdn-asset";
import { urlSchema } from "@/schemas/url";
import { AdvancedOptions } from "@/components/features/shortener/advanced-options";
import { ModeSwitcher } from "@/components/features/shortener/mode-switcher";
import {
  ALIAS_STRATEGIES,
  SHORTENER_MODES,
  AliasStrategy,
  RandomFlavor,
} from "@/components/features/shortener/advanced-options/constants";
import { generateRandomAlias } from "@/components/features/shortener/advanced-options/utils";
import { useShortenerTheme } from "@/components/features/shortener/shortener-theme-provider";

import { useRouter } from "next/navigation";

type AssetPreview = {
  name: string;
  size: number;
  previewUrl: string | null;
};

const DEFAULT_CDN_EXPIRES_IN_SECONDS = 7 * 24 * 60 * 60;
const DEFAULT_CDN_CACHE_TTL_SECONDS = 24 * 60 * 60;

type InputAreaProps = {
  url: string;
  error: string | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFocus: () => void;
  onPaste: () => void;
  onUrlChange: (value: string) => void;
};

type CdnAssetInputProps = InputAreaProps & {
  assetPreview: AssetPreview | null;
  onAssetSelect: (file: File) => void;
  onAssetClear: () => void;
  onPreviewOpen: () => void;
};

function getTextAssetFilename(alias: string) {
  return alias.toLowerCase().endsWith(".txt") ? alias : `${alias}.txt`;
}
function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getClipboardFile(dataTransfer: DataTransfer) {
  const directFile = dataTransfer.files?.[0];
  if (directFile) return directFile;

  for (const item of Array.from(dataTransfer.items || [])) {
    if (item.kind !== "file") continue;

    const file = item.getAsFile();
    if (file) return file;
  }

  return null;
}

function LinkUrlInput({
  url,
  error,
  inputRef,
  onFocus,
  onPaste,
  onUrlChange,
}: InputAreaProps) {
  return (
    <div className="flex items-center flex-1 pl-2 md:pl-3 pr-2 md:pr-4 gap-3 md:gap-4 min-w-0">
      <motion.button
        type="button"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onPaste}
        className="shrink-0 text-text-muted hover:text-[color:var(--shortener-accent)] transition-colors p-1 cursor-pointer"
        title="Paste from clipboard"
      >
        <Clipboard size={18} strokeWidth={1.5} className="md:w-5 md:h-5" />
      </motion.button>

      <input
        ref={inputRef}
        type="text"
        value={url}
        onFocus={onFocus}
        onChange={(event) => onUrlChange(event.target.value)}
        placeholder="Drop long link here..."
        className={cn(
          "w-full bg-transparent text-text-base placeholder:text-text-muted/20 outline-none text-sm md:text-base font-light tracking-wide py-1",
          "caret-[color:var(--shortener-accent)]",
        )}
        aria-invalid={Boolean(error)}
      />
    </div>
  );
}

function CdnAssetInput({
  url,
  error,
  inputRef,
  assetPreview,
  onAssetSelect,
  onAssetClear,
  onPreviewOpen,
  onFocus,
  onPaste,
  onUrlChange,
}: CdnAssetInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const displayValue = url.replace(/\r\n|\r|\n/g, " ");
  const hasPreview = Boolean(url.trim() || assetPreview);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    onAssetSelect(file);
  };

  const handleAssetButtonClick = () => {
    if (hasPreview) {
      onPreviewOpen();
      return;
    }

    fileInputRef.current?.click();
  };

  const handleAssetPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedFile = getClipboardFile(event.clipboardData);
    if (pastedFile) {
      event.preventDefault();
      handleFile(pastedFile);
      inputRef.current?.focus();
      return;
    }

    const pastedText = event.clipboardData.getData("text");
    if (!pastedText) return;

    event.preventDefault();
    onUrlChange(pastedText);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
      return;
    }

    const droppedText =
      event.dataTransfer.getData("text/uri-list") ||
      event.dataTransfer.getData("text/plain");

    if (droppedText) {
      onUrlChange(droppedText.trim());
      inputRef.current?.focus();
    }
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof Node && event.currentTarget.contains(relatedTarget)) {
      return;
    }

    setIsDragging(false);
  };

  return (
    <div
      onDragEnter={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "flex items-center flex-1 pl-2 md:pl-3 pr-2 md:pr-4 gap-3 md:gap-4 min-w-0 rounded-full transition-colors",
        isDragging &&
          "bg-[color:var(--shortener-accent-faint)] ring-1 ring-inset ring-[color:var(--shortener-accent-border)]",
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="sr-only"
        onChange={(event) => {
          handleFile(event.target.files?.[0]);
          event.currentTarget.value = "";
        }}
      />

      {assetPreview?.previewUrl ? (
        <button
          type="button"
          onClick={handleAssetButtonClick}
          className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-[color:var(--shortener-accent-border-soft)] bg-bg-base/70"
          title="Preview asset"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={assetPreview.previewUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        </button>
      ) : (
        <motion.button
          type="button"
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={handleAssetButtonClick}
          className="shrink-0 text-text-muted hover:text-[color:var(--shortener-accent)] transition-colors p-1 cursor-pointer"
          title={hasPreview ? "Preview content" : "Choose asset"}
        >
          {hasPreview ? (
            <FileText size={18} strokeWidth={1.5} className="md:w-5 md:h-5" />
          ) : (
            <ImagePlus size={18} strokeWidth={1.5} className="md:w-5 md:h-5" />
          )}
        </motion.button>
      )}

      <div className="grid flex-1 min-w-0 gap-0.5 text-left">
        {assetPreview ? (
          <div className="flex items-center  min-w-0 gap-2 text-sm text-text-base">
            <FileImage
              size={14}
              strokeWidth={1.7}
              className="shrink-0 text-[color:var(--shortener-accent)]"
            />
            <span className="truncate font-medium">{assetPreview.name}</span>
            <span className="shrink-0 text-xs text-text-muted/50 mt-1">
              {formatFileSize(assetPreview.size)}
            </span>
          </div>
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={displayValue}
            onFocus={onFocus}
            onPaste={handleAssetPaste}
            onChange={(event) => onUrlChange(event.target.value)}
            placeholder="Drop or paste an asset, image, or URL..."
            className={cn(
              "w-full bg-transparent text-text-base placeholder:text-text-muted/20 outline-none text-sm md:text-base font-light tracking-wide py-1",
              "caret-[color:var(--shortener-accent)]",
            )}
            aria-invalid={Boolean(error)}
          />
        )}
      </div>

      {assetPreview ? (
        <button
          type="button"
          onClick={onAssetClear}
          className="shrink-0 rounded-full p-1 text-text-muted/60 transition-colors hover:text-text-base"
          title="Remove asset"
        >
          <X size={16} strokeWidth={1.7} />
        </button>
      ) : (
        <button
          type="button"
          onClick={onPaste}
          className="shrink-0 rounded-full p-1 text-text-muted/50 transition-colors hover:text-[color:var(--shortener-accent)]"
          title="Paste asset URL"
        >
          <Clipboard size={16} strokeWidth={1.5} />
        </button>
      )}
    </div>
  );
}


type CdnPreviewModalProps = {
  isOpen: boolean;
  text: string;
  assetPreview: AssetPreview | null;
  onClose: () => void;
};

function CdnPreviewModal({
  isOpen,
  text,
  assetPreview,
  onClose,
}: CdnPreviewModalProps) {
  const previewText = text || "No text content to preview.";
  const lineCount = previewText.split(/\r\n|\r|\n/).length;

  React.useEffect(() => {
    if (!isOpen) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <motion.button
            type="button"
            aria-label="Close preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="absolute inset-0 bg-bg-base/85 backdrop-blur-md"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="CDN asset preview"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: "spring", bounce: 0.12, duration: 0.32 }}
            className="relative z-10 flex max-h-[82vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[color:var(--shortener-accent-border)] bg-bg-base shadow-2xl"
          >
            <div className="flex items-center justify-between gap-4 border-b border-[color:var(--shortener-accent-border-soft)] px-4 py-3 md:px-5">
              <div className="min-w-0 text-left">
                <p className="truncate text-sm font-semibold text-text-base">
                  {assetPreview?.name || "Text preview"}
                </p>
                <p className="text-xs text-text-muted/60">
                  {assetPreview
                    ? formatFileSize(assetPreview.size)
                    : `${lineCount} ${lineCount === 1 ? "line" : "lines"}`}
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-full p-2 text-text-muted/70 transition-colors hover:bg-[color:var(--shortener-accent-faint)] hover:text-text-base"
                title="Close preview"
              >
                <X size={18} strokeWidth={1.8} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-auto bg-black/20 p-4 text-left md:p-5">
              {assetPreview?.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={assetPreview.previewUrl}
                  alt={assetPreview.name}
                  className="mx-auto max-h-[62vh] max-w-full rounded-lg object-contain"
                />
              ) : (
                <pre className="min-w-full overflow-visible whitespace-pre font-mono text-xs leading-6 text-text-base md:text-sm">
                  {previewText}
                </pre>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
export default function UrlInput() {
  const router = useRouter();
  const { setIsHeroShortened } = useHeroContext();
  const { mode: shortenerMode, setMode: setShortenerMode } =
    useShortenerTheme();

  const [url, setUrl] = useState("");
  const [assetPreview, setAssetPreview] = useState<AssetPreview | null>(null);
  const [selectedAssetFile, setSelectedAssetFile] = useState<File | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    originalUrl: string;
    shortUrl: string;
  } | null>(null);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [aliasType, setAliasType] = useState<AliasStrategy>(
    ALIAS_STRATEGIES.RANDOM,
  );
  const [customAlias, setCustomAlias] = useState("");
  const [randomFlavor, setRandomFlavor] = useState<RandomFlavor>("text");
  const [randomPreview, setRandomPreview] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [cdnExpiresInSeconds, setCdnExpiresInSeconds] = useState<number | null>(
    DEFAULT_CDN_EXPIRES_IN_SECONDS,
  );
  const [cdnCacheTtlSeconds, setCdnCacheTtlSeconds] = useState(
    DEFAULT_CDN_CACHE_TTL_SECONDS,
  );

  // Branding part
  const [brandingTitle, setBrandingTitle] = useState("");
  const [brandingDescription, setBrandingDescription] = useState("");
  const [brandingImageUrl, setBrandingImageUrl] = useState("");

  const handleRegenerateRandom = useCallback(() => {
    const flavor = shortenerMode === SHORTENER_MODES.CDN ? "text" : randomFlavor;
    setRandomPreview(generateRandomAlias(flavor));
  }, [randomFlavor, shortenerMode]);

  React.useEffect(() => {
    if (aliasType === ALIAS_STRATEGIES.RANDOM) {
      handleRegenerateRandom();
    }
  }, [aliasType, handleRegenerateRandom]);
  const getAliasToSend = () => {
    if (aliasType === ALIAS_STRATEGIES.CUSTOM && customAlias.trim() !== "") {
      return customAlias.trim();
    }

    const flavor = shortenerMode === SHORTENER_MODES.CDN ? "text" : randomFlavor;
    return randomPreview || generateRandomAlias(flavor);
  };

  const inputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    return () => {
      if (assetPreview?.previewUrl) {
        URL.revokeObjectURL(assetPreview.previewUrl);
      }
    };
  }, [assetPreview]);

  const handleUrlChange = (value: string) => {
    setUrl(value);
    if (assetPreview) setAssetPreview(null);
    if (selectedAssetFile) setSelectedAssetFile(null);
    if (error) setError(null);
  };

  const handleAssetSelect = (file: File) => {
    if (assetPreview?.previewUrl) {
      URL.revokeObjectURL(assetPreview.previewUrl);
    }

    setUrl("");
    setSelectedAssetFile(file);
    setError(null);
    setAssetPreview({
      name: file.name,
      size: file.size,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
    });
  };

  const handleAssetClear = () => {
    if (assetPreview?.previewUrl) {
      URL.revokeObjectURL(assetPreview.previewUrl);
    }

    setAssetPreview(null);
    setSelectedAssetFile(null);
    inputRef.current?.focus();
  };

  const resetFormState = () => {
    setUrl("");
    setCustomAlias("");
    setRandomFlavor("text");
    setAliasType("random");
    setVisibility("public");
    setCdnExpiresInSeconds(DEFAULT_CDN_EXPIRES_IN_SECONDS);
    setCdnCacheTtlSeconds(DEFAULT_CDN_CACHE_TTL_SECONDS);
    setBrandingTitle("");
    setBrandingDescription("");
    setBrandingImageUrl("");
    setRandomPreview(generateRandomAlias("text"));
    setSelectedAssetFile(null);
    setAssetPreview(null);
  };

  const handleShorten = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const trimmed = url.trim();
    const alias = getAliasToSend();

    if (shortenerMode === SHORTENER_MODES.CDN) {
      const optionsValidation = createCdnAssetOptionsSchema.safeParse({
        alias,
        expiresInSeconds: cdnExpiresInSeconds,
        cacheTtlSeconds: cdnCacheTtlSeconds,
        visibility,
      });

      if (!optionsValidation.success) {
        setError(optionsValidation.error.issues[0].message);
        return;
      }

      let cdnFile = selectedAssetFile;

      if (!cdnFile) {
        const textValidation = createCdnTextAssetSchema.safeParse({
          content: trimmed,
          ...optionsValidation.data,
        });

        if (!textValidation.success) {
          setError(textValidation.error.issues[0].message);
          return;
        }

        cdnFile = new File(
          [textValidation.data.content],
          getTextAssetFilename(textValidation.data.alias || alias),
          { type: "text/plain;charset=utf-8" },
        );
      }

      setIsLoading(true);
      setResult(null);

      try {
        const uploadedFiles = await uploadFiles("cdnAssetUploader", {
          files: [cdnFile],
        });
        const uploadedFile = uploadedFiles[0];

        if (!uploadedFile) {
          throw new Error("Upload did not return a file");
        }

        const uploadedUrl = uploadedFile.ufsUrl || uploadedFile.url;
        const response = await fetch("/api/cdn-assets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: cdnFile.name,
            contentType: cdnFile.type || "application/octet-stream",
            size: cdnFile.size,
            uploadthingKey: uploadedFile.key,
            uploadthingUrl: uploadedUrl,
            alias: optionsValidation.data.alias,
            expiresInSeconds: optionsValidation.data.expiresInSeconds,
            cacheTtlSeconds: optionsValidation.data.cacheTtlSeconds,
            visibility: optionsValidation.data.visibility,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to create CDN asset");
        }

        const data = await response.json();

        await new Promise((resolve) => setTimeout(resolve, 600));

        setResult({
          originalUrl: data.alias,
          shortUrl: data.publicUrl,
        });
        router.refresh();
        setIsLoading(false);
        resetFormState();
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "An unexpected error occurred";
        console.error("Failed to create CDN asset:", error);
        setError(message);
        setIsLoading(false);
      }

      return;
    }

    const validation = urlSchema.safeParse({
      url: trimmed,
      alias,
      visibility,
      brandingTitle,
      brandingDescription,
      brandingImage: brandingImageUrl,
    });

    if (!validation.success) {
      setError(validation.error.issues[0].message);
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: validation.data.url,
          alias: validation.data.alias,
          visibility: validation.data.visibility,
          brandingTitle: validation.data.brandingTitle,
          brandingDescription: validation.data.brandingDescription,
          brandingImage: validation.data.brandingImage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to shorten URL");
      }

      const data = await response.json();
      console.log("Success:", data);

      await new Promise((resolve) => setTimeout(resolve, 600));

      setResult(data);
      router.refresh();
      setIsLoading(false);
      resetFormState();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "An unexpected error occurred";
      console.error("Failed to shorten URL:", error);
      setError(message);
      setIsLoading(false);
    }
  };
  const handleCloseModal = () => {
    setResult(null);
    setIsLoading(false);
  };

  const isSubmitDisabled =
    shortenerMode === SHORTENER_MODES.CDN
      ? (!url.trim() && !selectedAssetFile) || isLoading
      : !url.trim() || isLoading;

  const handlePaste = async () => {
    const copiedText = await readFromClipboard();
    if (copiedText) {
      handleUrlChange(copiedText);
      inputRef.current?.focus();
    }
  };

  return (
    <>
      <CdnPreviewModal
        isOpen={isPreviewOpen}
        text={url}
        assetPreview={assetPreview}
        onClose={() => setIsPreviewOpen(false)}
      />
      <LoadingModal
        isLoading={isLoading}
        mode={shortenerMode}
        result={result}
        onClose={handleCloseModal}
      />
      <div className={"relative w-full max-w-2xl mx-auto space-y-4"}>
        <div
          className={cn(
            "group relative flex items-center h-12 md:h-16 w-full rounded-full border bg-bg-base/80 backdrop-blur-xl transition-all duration-300 ease-in-out p-1 md:p-1.5 shadow-2xl",
            error
              ? "border-destructive/50 focus-within:border-destructive"
              : "border-[color:var(--shortener-accent-border)] focus-within:border-[color:var(--shortener-accent-focus)]",
          )}
        >
          <div
            className={cn(
              "absolute top-0 left-0 w-full h-1 opacity-80",
              error
                ? "bg-linear-to-r from-transparent via-destructive/50 to-transparent"
                : "bg-[linear-gradient(to_right,transparent,var(--shortener-accent-border),transparent)]",
            )}
          />

          <form
            onSubmit={handleShorten}
            className="flex items-center w-full h-full"
          >
            {shortenerMode === SHORTENER_MODES.CDN ? (
              <CdnAssetInput
                url={url}
                error={error}
                inputRef={inputRef}
                assetPreview={assetPreview}
                onFocus={() => setIsHeroShortened(true)}
                onPaste={handlePaste}
                onUrlChange={handleUrlChange}
                onAssetSelect={handleAssetSelect}
                onAssetClear={handleAssetClear}
                onPreviewOpen={() => setIsPreviewOpen(true)}
              />
            ) : (
              <LinkUrlInput
                url={url}
                error={error}
                inputRef={inputRef}
                onFocus={() => setIsHeroShortened(true)}
                onPaste={handlePaste}
                onUrlChange={handleUrlChange}
              />
            )}

            <ShortenButton
              type="submit"
              disabled={isSubmitDisabled}
              isLoading={isLoading}
              className="h-full px-2 md:px-4 min-w-[40px] md:min-w-[140px]"
            >
              {shortenerMode === SHORTENER_MODES.CDN ? "Create CDN" : "Shorten"}
            </ShortenButton>
          </form>
        </div>

        <ModeSwitcher mode={shortenerMode} onModeChange={setShortenerMode} />

        <AdvancedOptions
          mode={shortenerMode}
          showAdvanced={showAdvanced}
          setShowAdvanced={setShowAdvanced}
          aliasType={aliasType}
          setAliasType={setAliasType}
          customAlias={customAlias}
          setCustomAlias={setCustomAlias}
          randomFlavor={randomFlavor}
          setRandomFlavor={setRandomFlavor}
          randomPreview={randomPreview}
          onRegenerate={handleRegenerateRandom}
          visibility={visibility}
          setVisibility={setVisibility}
          brandingTitle={brandingTitle}
          setBrandingTitle={setBrandingTitle}
          brandingDescription={brandingDescription}
          setBrandingDescription={setBrandingDescription}
          brandingImageUrl={brandingImageUrl}
          setBrandingImageUrl={setBrandingImageUrl}
          cdnExpiresInSeconds={cdnExpiresInSeconds}
          setCdnExpiresInSeconds={setCdnExpiresInSeconds}
          cdnCacheTtlSeconds={cdnCacheTtlSeconds}
          setCdnCacheTtlSeconds={setCdnCacheTtlSeconds}
        />
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-destructive text-xs md:text-sm mt-3 ml-6 font-medium"
          >
            {error}
          </motion.p>
        )}
      </div>
    </>
  );
}

