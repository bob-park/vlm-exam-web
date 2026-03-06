"use client";

import { detectFaces, listVideos, searchByFace, searchByText, uploadVideo } from "@/lib/api";
import {
  FaceBox,
  FaceSearchItem,
  TextSearchItem,
  VideoItem,
  VideoSummary,
} from "@/lib/types";
import { useMutation, useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChangeEvent, DragEvent, useEffect, useMemo, useState } from "react";

type ImageSize = { width: number; height: number };

function formatDuration(seconds: number | null | undefined) {
  if (!seconds && seconds !== 0) return "-";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "-";
  return date.toLocaleString("ko-KR");
}

function formatRange(startSeconds: number, endSeconds: number) {
  return `${startSeconds.toFixed(1)}s ~ ${endSeconds.toFixed(1)}s`;
}

async function cropToBlob(file: File, face: FaceBox) {
  const image = await createImageBitmap(file);
  const { x1, y1, x2, y2 } = face;
  const scale = 2.0;
  const rawWidth = Math.max(1, x2 - x1);
  const rawHeight = Math.max(1, y2 - y1);
  const centerX = x1 + rawWidth / 2;
  const centerY = y1 + rawHeight / 2;
  const scaledWidth = rawWidth * scale;
  const scaledHeight = rawHeight * scale;
  const scaledX1 = Math.max(0, centerX - scaledWidth / 2);
  const scaledY1 = Math.max(0, centerY - scaledHeight / 2);
  const scaledX2 = Math.min(image.width, centerX + scaledWidth / 2);
  const scaledY2 = Math.min(image.height, centerY + scaledHeight / 2);
  const width = Math.max(1, scaledX2 - scaledX1);
  const height = Math.max(1, scaledY2 - scaledY1);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas not supported");
  }
  ctx.drawImage(image, scaledX1, scaledY1, width, height, 0, 0, width, height);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Unable to crop image"));
        return;
      }
      resolve(blob);
    }, "image/jpeg");
  });
}

async function previewFromBlob(blob: Blob) {
  return await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

export default function Home() {
  const router = useRouter();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"image" | "text" | "videos">("image");

  const [textQuery, setTextQuery] = useState("");

  const [videoPage, setVideoPage] = useState(1);
  const [videoSize, setVideoSize] = useState(20);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<ImageSize | null>(null);
  const [faces, setFaces] = useState<FaceBox[]>([]);
  const [facePreviews, setFacePreviews] = useState<string[]>([]);
  const [selectedFaceIndex, setSelectedFaceIndex] = useState<number | null>(null);

  const [textResults, setTextResults] = useState<TextSearchItem[] | null>(null);
  const [faceResults, setFaceResults] = useState<FaceSearchItem[] | null>(null);

  const videosQuery = useQuery({
    queryKey: ["videos"],
    queryFn: () => listVideos(1, 100),
  });

  const videoListQuery = useQuery({
    queryKey: ["video-list", videoPage, videoSize],
    queryFn: () => listVideos(videoPage, videoSize),
    placeholderData: (previousData) => previousData,
  });

  const videoMap = useMemo(() => {
    const map = new Map<string, VideoItem>();
    for (const video of videosQuery.data?.items ?? []) {
      map.set(video.id, video);
    }
    return map;
  }, [videosQuery.data?.items]);

  const uploadMutation = useMutation({
    mutationFn: uploadVideo,
    onSuccess: () => {
      setIsUploadOpen(false);
      void videosQuery.refetch();
      void videoListQuery.refetch();
    },
  });

  const detectMutation = useMutation({
    mutationFn: detectFaces,
    onSuccess: (data) => {
      setFaces(data.faces ?? []);
      setSelectedFaceIndex(null);
      setFacePreviews([]);
      setFaceResults(null);
      setTextResults(null);
    },
  });

  const faceSearchMutation = useMutation({
    mutationFn: (file: File) => searchByFace(file, 0.7, 20),
    onSuccess: (data) => {
      setFaceResults(data.items ?? []);
      setTextResults(null);
    },
  });

  const textSearchMutation = useMutation({
    mutationFn: (text: string) => searchByText(text, 0.7, 50),
    onSuccess: (data) => {
      setTextResults(data.items ?? []);
      setFaceResults(null);
    },
  });

  useEffect(() => {
    if (!imageFile || faces.length === 0) return;

    let cancelled = false;
    const run = async () => {
      const previews: string[] = [];
      for (const face of faces) {
        const blob = await cropToBlob(imageFile, face);
        previews.push(await previewFromBlob(blob));
      }
      if (!cancelled) {
        setFacePreviews(previews);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [faces, imageFile]);

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  const handleImageFile = async (file: File) => {
    setImageFile(file);
    setImageUrl(URL.createObjectURL(file));
    setImageSize(null);
    setFaces([]);
    setFacePreviews([]);
    setSelectedFaceIndex(null);
    setTextResults(null);
    setFaceResults(null);
    await detectMutation.mutateAsync(file);
  };

  const handleFileInput = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await handleImageFile(file);
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    await handleImageFile(file);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const goVideo = (videoId: string, time?: number | null) => {
    const params = new URLSearchParams();
    if (typeof time === "number") {
      params.set("t", String(time));
    }
    const query = params.toString();
    router.push(query ? `/videos/${videoId}?${query}` : `/videos/${videoId}`);
  };

  const handleSelectFace = async (index: number) => {
    if (!imageFile || !faces[index]) return;
    setSelectedFaceIndex(index);
    const blob = await cropToBlob(imageFile, faces[index]);
    const faceFile = new File([blob], "face.jpg", { type: "image/jpeg" });
    await faceSearchMutation.mutateAsync(faceFile);
  };

  const handleTextSearch = async () => {
    if (!textQuery.trim()) return;
    await textSearchMutation.mutateAsync(textQuery.trim());
  };

  const handleVideoPageChange = (nextPage: number) => {
    const total = videoListQuery.data?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / videoSize));
    const page = Math.min(Math.max(1, nextPage), totalPages);
    setVideoPage(page);
  };

  const renderVideoMeta = (videoId: string, fallback?: VideoItem | VideoSummary) => {
    const video = videoMap.get(videoId) ?? fallback;
    if (!video) return `영상 #${videoId}`;
    return `${video.original_filename} · ${formatDuration(video.duration_seconds)}`;
  };

  const totalPages = Math.max(1, Math.ceil((videoListQuery.data?.total ?? 0) / videoSize));

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fafc,_#e2e8f0_55%,_#cbd5f5)] px-6 pb-20 pt-10 text-slate-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <header className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">VLM EXAM</p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                영상 카탈로깅 검색
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                얼굴/자연어 검색 결과를 영상 구간 단위로 확인하고 바로 재생 위치로 이동하세요.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsUploadOpen(true)}
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-slate-800"
            >
              영상 업로드
            </button>
          </div>
        </header>

        <section className="grid gap-6">
          <div className="rounded-3xl bg-white/70 p-6 shadow-xl shadow-slate-200/70 backdrop-blur">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveTab("image")}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeTab === "image"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                얼굴 이미지 검색
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("text")}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeTab === "text"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                자연어 검색
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("videos")}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeTab === "videos"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                영상 목록
              </button>
            </div>

            {activeTab === "image" ? (
              <div className="mt-6 grid gap-6">
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center"
                >
                  <p className="text-sm font-semibold text-slate-700">
                    이미지를 드래그 앤 드롭하거나 파일을 선택하세요.
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    얼굴 박스를 선택하면 유사 얼굴이 포함된 영상 구간을 검색합니다.
                  </p>
                  <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white">
                    파일 선택
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileInput}
                    />
                  </label>
                  {detectMutation.isPending && (
                    <p className="mt-3 text-xs text-slate-500">얼굴 좌표 분석 중...</p>
                  )}
                </div>

                {imageUrl && (
                  <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white">
                      <Image
                        src={imageUrl}
                        alt="uploaded"
                        width={960}
                        height={540}
                        unoptimized
                        className="h-auto w-full object-contain"
                        onLoad={(event) => {
                          const target = event.target as HTMLImageElement;
                          setImageSize({
                            width: target.naturalWidth,
                            height: target.naturalHeight,
                          });
                        }}
                      />
                      {imageSize &&
                        faces.map((face, index) => {
                          const left = (face.x1 / imageSize.width) * 100;
                          const top = (face.y1 / imageSize.height) * 100;
                          const width = ((face.x2 - face.x1) / imageSize.width) * 100;
                          const height = ((face.y2 - face.y1) / imageSize.height) * 100;
                          const isSelected = index === selectedFaceIndex;
                          return (
                            <button
                              key={`${face.x1}-${face.y1}-${index}`}
                              type="button"
                              onClick={() => void handleSelectFace(index)}
                              className={`absolute border-2 transition ${
                                isSelected
                                  ? "border-emerald-400 shadow-lg shadow-emerald-400/40"
                                  : "border-amber-400/80"
                              }`}
                              style={{
                                left: `${left}%`,
                                top: `${top}%`,
                                width: `${width}%`,
                                height: `${height}%`,
                              }}
                            />
                          );
                        })}
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <h3 className="text-sm font-semibold text-slate-800">얼굴 목록</h3>
                      <div className="mt-4 grid gap-3">
                        {facePreviews.length === 0 && (
                          <p className="text-xs text-slate-500">얼굴을 인식하면 목록이 표시됩니다.</p>
                        )}
                        {facePreviews.map((preview, index) => (
                          <button
                            key={preview}
                            type="button"
                            onClick={() => void handleSelectFace(index)}
                            className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-left text-xs transition ${
                              selectedFaceIndex === index
                                ? "border-emerald-400 bg-emerald-50"
                                : "border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <Image
                              src={preview}
                              alt={`face-${index}`}
                              width={48}
                              height={48}
                              unoptimized
                              className="h-12 w-12 rounded-lg object-cover"
                            />
                            <div>
                              <p className="font-semibold text-slate-700">얼굴 {index + 1}</p>
                              <p className="text-[11px] text-slate-500">선택하여 검색</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : activeTab === "text" ? (
              <div className="mt-6 grid gap-4">
                <label className="text-xs font-semibold text-slate-600">자연어 입력</label>
                <div className="flex flex-wrap gap-3">
                  <input
                    value={textQuery}
                    onChange={(event) => setTextQuery(event.target.value)}
                    placeholder="예) 공원에서 인형을 들고 있는 사람"
                    className="min-w-[240px] flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => void handleTextSearch()}
                    className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
                  >
                    검색
                  </button>
                </div>
                {textSearchMutation.isPending && (
                  <p className="text-xs text-slate-500">텍스트 검색 중...</p>
                )}
              </div>
            ) : (
              <div className="mt-6 grid gap-4">
                <div className="flex flex-wrap items-end gap-3">
                  <label className="flex flex-col gap-2 text-xs font-semibold text-slate-600">
                    페이지 크기
                    <select
                      value={videoSize}
                      onChange={(event) => {
                        setVideoSize(Number(event.target.value));
                        setVideoPage(1);
                      }}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none focus:border-slate-400"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </label>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-800">영상 목록</h3>
                    <p className="text-xs text-slate-500">
                      총 {videoListQuery.data?.total ?? 0}건 · {videoPage}/{totalPages} 페이지
                    </p>
                  </div>

                  <div className="mt-4 grid gap-3">
                    {videoListQuery.isPending && (
                      <p className="text-xs text-slate-500">영상 목록을 불러오는 중...</p>
                    )}
                    {!videoListQuery.isPending && (videoListQuery.data?.items.length ?? 0) === 0 && (
                      <p className="text-xs text-slate-500">조회된 영상이 없습니다.</p>
                    )}
                    {videoListQuery.data?.items.map((video) => (
                      <button
                        key={video.id}
                        type="button"
                        onClick={() => goVideo(video.id)}
                        className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-slate-400 hover:bg-white"
                      >
                        <div className="min-w-0 grid gap-2 text-xs text-slate-700 md:grid-cols-2">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {video.original_filename}
                          </p>
                          <p>상태: {video.status}</p>
                          <p>영상 길이: {formatDuration(video.duration_seconds)}</p>
                          <p>등록일: {formatDateTime(video.created_at)}</p>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="mt-5 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleVideoPageChange(videoPage - 1)}
                      disabled={videoPage <= 1}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      이전
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVideoPageChange(videoPage + 1)}
                      disabled={videoPage >= totalPages}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      다음
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab !== "videos" && (
              <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-800">검색 결과</h3>
                  <p className="text-xs text-slate-500">
                    {activeTab === "text" ? textResults?.length ?? 0 : faceResults?.length ?? 0}건
                  </p>
                </div>

                <div className="mt-4 grid gap-4">
                  {activeTab === "text" && !textResults && (
                    <p className="text-xs text-slate-500">검색을 수행하면 결과가 여기에 표시됩니다.</p>
                  )}

                  {activeTab === "text" &&
                    textResults?.map((item, index) => (
                      <button
                        key={`text-${item.video_id}-${index}`}
                        type="button"
                        onClick={() => goVideo(item.video_id, item.start_sec)}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-slate-400 hover:bg-white"
                      >
                        <p className="text-sm font-semibold text-slate-800">
                          {renderVideoMeta(item.video_id, item.video)}
                        </p>
                        <p className="mt-2 text-xs text-slate-700">구간: {formatRange(item.start_sec, item.end_sec)}</p>
                        <p className="mt-1 text-xs text-slate-700">텍스트: {item.text}</p>
                        <p className="mt-1 text-xs text-slate-500">유사도: {item.similarity.toFixed(3)}</p>
                      </button>
                    ))}

                  {activeTab === "image" && !faceResults && (
                    <p className="text-xs text-slate-500">검색을 수행하면 결과가 여기에 표시됩니다.</p>
                  )}

                  {activeTab === "image" &&
                    faceResults?.map((item, index) => (
                      <button
                        key={`face-${item.video_id}-${index}`}
                        type="button"
                        onClick={() => goVideo(item.video_id, item.start_sec)}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-slate-400 hover:bg-white"
                      >
                        <p className="text-sm font-semibold text-slate-800">
                          {renderVideoMeta(item.video_id, item.video)}
                        </p>
                        <p className="mt-2 text-xs text-slate-700">구간: {formatRange(item.start_sec, item.end_sec)}</p>
                        <p className="mt-1 text-xs text-slate-700">별칭: {item.alias || "-"}</p>
                        <p className="mt-1 text-xs text-slate-500">유사도: {item.similarity.toFixed(3)}</p>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-6">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">영상 업로드</h3>
              <button
                type="button"
                onClick={() => setIsUploadOpen(false)}
                className="text-xs font-semibold text-slate-500"
              >
                닫기
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">영상을 선택하면 시스템에 등록됩니다.</p>
            <label className="mt-5 flex cursor-pointer flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-xs text-slate-600">
              <span className="font-semibold text-slate-700">파일을 선택하세요.</span>
              <input
                type="file"
                accept="video/*"
                className="hidden"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  await uploadMutation.mutateAsync(file);
                }}
              />
            </label>
            {uploadMutation.isPending && <p className="mt-3 text-xs text-slate-500">업로드 중...</p>}
          </div>
        </div>
      )}
    </div>
  );
}
