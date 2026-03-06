"use client";

import { getStreamUrl, listVideos } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "next/navigation";
import { useMemo, useRef } from "react";

function formatDuration(seconds: number | null | undefined) {
  if (!seconds && seconds !== 0) return "-";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function VideoDetailPage() {
  const params = useParams<{ videoId: string }>();
  const searchParams = useSearchParams();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const videoId = params.videoId;
  const initialTime = searchParams.get("t") ? Number(searchParams.get("t")) : null;

  const videosQuery = useQuery({
    queryKey: ["videos"],
    queryFn: () => listVideos(1, 100),
  });

  const video = useMemo(() => {
    return videosQuery.data?.items.find((item) => item.id === videoId);
  }, [videosQuery.data?.items, videoId]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fafc,_#e2e8f0_55%,_#cbd5f5)] px-6 pb-20 pt-10 text-slate-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">VIDEO DETAIL</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            {video?.original_filename ?? `영상 #${videoId}`}
          </h1>
          <p className="text-sm text-slate-600">
            {video
              ? `${formatDuration(video.duration_seconds)} · 상태 ${video.status}`
              : "영상 정보를 불러오는 중입니다."}
          </p>
        </header>

        <section className="rounded-3xl bg-white/70 p-6 shadow-xl shadow-slate-200/70">
          <video
            ref={videoRef}
            controls
            src={getStreamUrl(videoId)}
            className="w-full rounded-2xl bg-black"
            onLoadedMetadata={() => {
              if (initialTime !== null && Number.isFinite(initialTime) && videoRef.current) {
                videoRef.current.currentTime = initialTime;
              }
            }}
          />
          {initialTime !== null && (
            <p className="mt-3 text-xs text-slate-500">요청한 위치에서 재생합니다: {initialTime}s</p>
          )}
        </section>
      </div>
    </div>
  );
}
