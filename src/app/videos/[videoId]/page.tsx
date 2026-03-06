"use client";

import { getStreamUrl, getVideoDetail, updateFaceTrackAlias } from "@/lib/api";
import { FaceTrackItem, TextSegmentItem } from "@/lib/types";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

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

export default function VideoDetailPage() {
  const params = useParams<{ videoId: string }>();
  const searchParams = useSearchParams();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const videoId = params.videoId;
  const initialTime = searchParams.get("t") ? Number(searchParams.get("t")) : null;

  const detailQuery = useQuery({
    queryKey: ["video-detail", videoId],
    queryFn: () => getVideoDetail(videoId),
  });

  const video = detailQuery.data;
  const [faceTracks, setFaceTracks] = useState<FaceTrackItem[]>([]);
  const [editingTrackId, setEditingTrackId] = useState<number | null>(null);
  const [aliasDrafts, setAliasDrafts] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!detailQuery.data) return;
    setFaceTracks(detailQuery.data.face_tracks ?? []);
  }, [detailQuery.data]);

  useEffect(() => {
    if (initialTime !== null && Number.isFinite(initialTime) && videoRef.current) {
      videoRef.current.currentTime = initialTime;
    }
  }, [initialTime, detailQuery.data]);

  const streamUrl = useMemo(() => {
    if (video?.stream_url) return video.stream_url;
    return getStreamUrl(videoId);
  }, [video?.stream_url, videoId]);

  const handleSeek = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = seconds;
    videoRef.current.play().catch(() => undefined);
  };

  const updateAliasMutation = useMutation({
    mutationFn: ({ faceTrackId, alias }: { faceTrackId: number; alias: string }) =>
      updateFaceTrackAlias(videoId, faceTrackId, alias),
    onSuccess: (updated) => {
      setFaceTracks((prev) =>
        prev.map((track) => (track.id === updated.id ? { ...track, alias: updated.alias } : track)),
      );
      setEditingTrackId(null);
      setAliasDrafts((prev) => ({ ...prev, [updated.id]: updated.alias }));
    },
  });

  const beginEditAlias = (track: FaceTrackItem) => {
    setEditingTrackId(track.id);
    setAliasDrafts((prev) => ({
      ...prev,
      [track.id]: prev[track.id] ?? track.alias ?? "",
    }));
  };

  const cancelEditAlias = () => {
    setEditingTrackId(null);
  };

  const saveAlias = async (track: FaceTrackItem) => {
    const nextAlias = (aliasDrafts[track.id] ?? "").trim();
    if (!nextAlias) return;
    await updateAliasMutation.mutateAsync({ faceTrackId: track.id, alias: nextAlias });
  };

  const renderTrackCard = (track: FaceTrackItem) => {
    const isEditing = editingTrackId === track.id;
    const draftValue = aliasDrafts[track.id] ?? track.alias ?? "";
    const isSaving = updateAliasMutation.isPending && isEditing;
    return (
      <div
        key={`face-track-${track.id}`}
        className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left md:grid-cols-[120px_1fr]"
      >
        <button
          type="button"
          onClick={() => handleSeek(track.start_sec)}
          className="flex h-[90px] w-[120px] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white"
        >
          {track.image_url ? (
            <img src={track.image_url} alt="face-track" className="h-full w-full object-cover" />
          ) : (
            <span className="text-[11px] text-slate-400">이미지 없음</span>
          )}
        </button>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-800">별칭:</p>
            {isEditing ? (
              <input
                value={draftValue}
                onChange={(event) =>
                  setAliasDrafts((prev) => ({ ...prev, [track.id]: event.target.value }))
                }
                className="min-w-[160px] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-slate-400"
              />
            ) : (
              <p className="text-sm font-semibold text-slate-800">{track.alias || "-"}</p>
            )}
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => void saveAlias(track)}
                  disabled={isSaving || !draftValue.trim()}
                  className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  저장
                </button>
                <button
                  type="button"
                  onClick={cancelEditAlias}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
                >
                  취소
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => beginEditAlias(track)}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
              >
                수정
              </button>
            )}
          </div>
          {updateAliasMutation.isError && isEditing && (
            <p className="mt-2 text-xs text-rose-500">별칭 저장에 실패했습니다.</p>
          )}
          <p className="mt-2 text-xs text-slate-700">구간: {formatRange(track.start_sec, track.end_sec)}</p>
          <p className="mt-1 text-xs text-slate-500">등록일: {formatDateTime(track.created_at)}</p>
        </div>
      </div>
    );
  };

  const renderTextCard = (segment: TextSegmentItem) => {
    return (
      <button
        key={`text-segment-${segment.id}`}
        type="button"
        onClick={() => handleSeek(segment.start_sec)}
        className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-slate-400 hover:bg-white md:grid-cols-[120px_1fr]"
      >
        <div className="flex h-[90px] w-[120px] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
          {segment.image_url ? (
            <img src={segment.image_url} alt="text-segment" className="h-full w-full object-cover" />
          ) : (
            <span className="text-[11px] text-slate-400">이미지 없음</span>
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">{segment.text}</p>
          <p className="mt-2 text-xs text-slate-700">
            구간: {formatRange(segment.start_sec, segment.end_sec)}
          </p>
          <p className="mt-1 text-xs text-slate-500">등록일: {formatDateTime(segment.created_at)}</p>
        </div>
      </button>
    );
  };

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
              : detailQuery.isPending
                ? "영상 정보를 불러오는 중입니다."
                : "영상 정보를 불러오지 못했습니다."}
          </p>
        </header>

        <section className="rounded-3xl bg-white/70 p-6 shadow-xl shadow-slate-200/70">
          <video
            ref={videoRef}
            controls
            src={streamUrl}
            className="h-[100lvh] w-full rounded-2xl bg-black"
          />
          {initialTime !== null && (
            <p className="mt-3 text-xs text-slate-500">요청한 위치에서 재생합니다: {initialTime}s</p>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-3xl bg-white/70 p-6 shadow-xl shadow-slate-200/70">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">Face Tracks</h2>
              <p className="text-xs text-slate-500">{video?.face_track_count ?? 0}건</p>
            </div>
            <div className="mt-4 grid gap-4">
              {detailQuery.isPending && (
                <p className="text-xs text-slate-500">Face track 정보를 불러오는 중...</p>
              )}
              {!detailQuery.isPending && (video?.face_tracks.length ?? 0) === 0 && (
                <p className="text-xs text-slate-500">등록된 face track이 없습니다.</p>
              )}
              {faceTracks.map(renderTrackCard)}
            </div>
          </div>

          <div className="rounded-3xl bg-white/70 p-6 shadow-xl shadow-slate-200/70">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">Text Segments</h2>
              <p className="text-xs text-slate-500">{video?.text_segment_count ?? 0}건</p>
            </div>
            <div className="mt-4 grid gap-4">
              {detailQuery.isPending && (
                <p className="text-xs text-slate-500">Text segment 정보를 불러오는 중...</p>
              )}
              {!detailQuery.isPending && (video?.text_segments.length ?? 0) === 0 && (
                <p className="text-xs text-slate-500">등록된 text segment가 없습니다.</p>
              )}
              {video?.text_segments.map(renderTextCard)}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
