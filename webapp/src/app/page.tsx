'use client';
/* eslint-disable @next/next/no-img-element */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import Cropper, { Area } from "react-easy-crop";
import {
  A4_SIZE,
  PASSPORT_SIZE,
  canvasToDataUrl,
  downloadCanvas,
  renderA4Sheet,
  renderPassportCanvas,
} from "@/lib/image";

export default function Home() {
  const [imageSrc, setImageSrc] = useState<string>();
  const [imageName, setImageName] = useState<string>("photo");
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [passportPreview, setPassportPreview] = useState<string>();
  const [sheetPreview, setSheetPreview] = useState<string>();
  const [isBusy, setIsBusy] = useState(false);

  const passportCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sheetCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const aspectRatio = useMemo(
    () => PASSPORT_SIZE.width / PASSPORT_SIZE.height,
    [],
  );

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  useEffect(() => {
    if (!imageSrc || !croppedAreaPixels) {
      setPassportPreview(undefined);
      setSheetPreview(undefined);
      passportCanvasRef.current = null;
      sheetCanvasRef.current = null;
      return;
    }

    let cancelled = false;

    const generate = async () => {
      setIsBusy(true);
      try {
        const passportCanvas = await renderPassportCanvas(
          imageSrc,
          croppedAreaPixels,
          rotation,
        );

        if (cancelled) {
          return;
        }

        passportCanvasRef.current = passportCanvas;
        setPassportPreview(canvasToDataUrl(passportCanvas));

        const sheetCanvas = await renderA4Sheet(passportCanvas);

        if (cancelled) {
          return;
        }

        sheetCanvasRef.current = sheetCanvas;
        setSheetPreview(canvasToDataUrl(sheetCanvas));
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setPassportPreview(undefined);
          setSheetPreview(undefined);
        }
      } finally {
        if (!cancelled) {
          setIsBusy(false);
        }
      }
    };

    void generate();

    return () => {
      cancelled = true;
    };
  }, [croppedAreaPixels, imageSrc, rotation]);

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const [file] = event.target.files ?? [];
      if (!file) {
        return;
      }
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        const result = reader.result;
        if (typeof result === "string") {
          setImageSrc(result);
          setImageName(file.name.replace(/\.[^.]+$/, "") || "photo");
          setCrop({ x: 0, y: 0 });
          setZoom(1);
          setRotation(0);
        }
      });
      reader.readAsDataURL(file);
    },
    [],
  );

  const handleClear = useCallback(() => {
    setImageSrc(undefined);
    setPassportPreview(undefined);
    setSheetPreview(undefined);
    passportCanvasRef.current = null;
    sheetCanvasRef.current = null;
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  }, []);

  const handleDownloadPassport = useCallback(async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    try {
      const passportCanvas =
        passportCanvasRef.current ??
        (await renderPassportCanvas(imageSrc, croppedAreaPixels, rotation));
      passportCanvasRef.current = passportCanvas;
      downloadCanvas(passportCanvas, `${imageName}-passport.jpg`);
    } catch (error) {
      console.error(error);
    }
  }, [croppedAreaPixels, imageName, imageSrc, rotation]);

  const handleDownloadSheet = useCallback(async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    try {
      const passportCanvas =
        passportCanvasRef.current ??
        (await renderPassportCanvas(imageSrc, croppedAreaPixels, rotation));
      passportCanvasRef.current = passportCanvas;
      const sheetCanvas =
        sheetCanvasRef.current ?? (await renderA4Sheet(passportCanvas));
      sheetCanvasRef.current = sheetCanvas;
      downloadCanvas(sheetCanvas, `${imageName}-a4-sheet.jpg`);
    } catch (error) {
      console.error(error);
    }
  }, [croppedAreaPixels, imageName, imageSrc, rotation]);

  return (
    <div className="min-h-screen bg-slate-100">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-6">
          <h1 className="text-3xl font-semibold text-slate-900">
            Passport Studio
          </h1>
          <p className="max-w-3xl text-sm text-slate-600">
            Upload, crop, rotate, and align your portrait to official 35x45 mm
            proportions. Export a single optimized passport photo or a full A4
            print sheet ready for high-resolution printing.
          </p>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-4">
              <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                Upload Portrait
              </label>
              {imageSrc ? (
                <button
                  type="button"
                  onClick={handleClear}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:border-slate-300 hover:text-slate-700"
                >
                  Reset canvas
                </button>
              ) : null}
              <span className="ml-auto text-xs font-medium uppercase tracking-wide text-slate-400">
                Passport aspect 35 x 45 mm
              </span>
            </div>

            <div className="relative aspect-[35/45] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-950/90">
              {imageSrc ? (
                <>
                  <Cropper
                    image={imageSrc}
                    crop={crop}
                    zoom={zoom}
                    rotation={rotation}
                    aspect={aspectRatio}
                    cropShape="rect"
                    showGrid
                    objectFit="vertical-cover"
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onRotationChange={setRotation}
                    onCropComplete={onCropComplete}
                  />
                  <div className="pointer-events-none absolute inset-0">
                    <div className="absolute inset-x-6 top-1/3 h-px bg-white/50"></div>
                    <div className="absolute inset-x-6 bottom-1/3 h-px bg-white/50"></div>
                    <div className="absolute left-1/2 top-6 h-[calc(100%-3rem)] w-px -translate-x-1/2 bg-white/40"></div>
                    <div className="absolute inset-x-0 bottom-10 flex justify-center text-[10px] font-semibold tracking-[0.2em] text-white/60">
                      EYE LINE
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-200">
                  Upload a portrait to start editing
                </div>
              )}
            </div>

            {imageSrc ? (
              <div className="grid gap-5 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-slate-600">
                    Zoom ({zoom.toFixed(2)}x)
                  </span>
                  <input
                    type="range"
                    min={1}
                    max={4}
                    step={0.01}
                    value={zoom}
                    onChange={(event) => setZoom(Number(event.target.value))}
                    className="accent-slate-900"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-slate-600">
                    Rotation ({rotation.toFixed(0)}°)
                  </span>
                  <input
                    type="range"
                    min={-30}
                    max={30}
                    step={0.5}
                    value={rotation}
                    onChange={(event) =>
                      setRotation(Number(event.target.value))
                    }
                    className="accent-slate-900"
                  />
                </label>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleDownloadPassport}
                disabled={!passportPreview || isBusy}
                className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Download Passport Photo
              </button>
              <button
                type="button"
                onClick={handleDownloadSheet}
                disabled={!sheetPreview || isBusy}
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
              >
                Download A4 Sheet
              </button>
              {isBusy ? (
                <span className="inline-flex items-center text-xs font-medium uppercase tracking-wide text-slate-500">
                  Rendering...
                </span>
              ) : null}
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">
                Passport Photo Preview
              </h2>
              <p className="mt-2 text-xs text-slate-500">
                Output size: {PASSPORT_SIZE.width} x {PASSPORT_SIZE.height} px @ 300 DPI
              </p>
              <div className="mt-4 flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50">
                {passportPreview ? (
                  <img
                    src={passportPreview}
                    alt="Passport preview"
                    className="max-h-full max-w-full rounded-lg border border-white shadow-md"
                  />
                ) : (
                  <span className="text-xs text-slate-400">
                    Waiting for preview...
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">
                A4 Print Layout
              </h2>
              <p className="mt-2 text-xs text-slate-500">
                Sheet resolution: {A4_SIZE.width} x {A4_SIZE.height} px @ 300 DPI
              </p>
              <div className="mt-4 flex h-72 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50">
                {sheetPreview ? (
                  <img
                    src={sheetPreview}
                    alt="A4 sheet preview"
                    className="max-h-full max-w-full rounded-lg border border-white shadow"
                  />
                ) : (
                  <span className="text-xs text-slate-400">
                    Generate a passport preview to view the sheet
                  </span>
                )}
              </div>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
