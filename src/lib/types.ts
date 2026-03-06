export type VideoSummary = {
  id: string;
  original_filename: string;
  duration_seconds: number | null;
  status: string;
  created_at: string;
};

export type VideoItem = {
  id: string;
  original_filename: string;
  duration_seconds: number | null;
  status: string;
  processing_started_at: string | null;
  processing_finished_at: string | null;
  created_at: string;
};

export type VideoListResponse = {
  page: number;
  size: number;
  total: number;
  items: VideoItem[];
};

export type VideoIngestResponse = {
  id: string;
  original_filename: string;
  status: string;
  created_at: string;
};

export type FaceBox = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type FaceMatchInfo = {
  id: number;
  alias: string;
  similarity: number;
};

export type FaceDetectItem = {
  box: FaceBox;
  match: FaceMatchInfo | null;
};

export type FaceDetectResponse = {
  faces: FaceDetectItem[];
};

export type TextSearchRequest = {
  query: string;
  threshold?: number;
  limit?: number;
};

export type TextSearchItem = {
  video_id: string;
  video: VideoSummary;
  start_sec: number;
  end_sec: number;
  text: string;
  similarity: number;
};

export type TextSearchResponse = {
  items: TextSearchItem[];
};

export type CatalogImageItem = {
  id: number;
  timestamp_sec: number;
  created_at: string;
  image_url: string;
};

export type CatalogImageListResponse = {
  page: number;
  size: number;
  total: number;
  items: CatalogImageItem[];
};

export type FaceSearchItem = {
  video_id: string;
  video: VideoSummary;
  alias: string;
  start_sec: number;
  end_sec: number;
  similarity: number;
};

export type FaceSearchResponse = {
  items: FaceSearchItem[];
};

export type FaceTrackItem = {
  id: number;
  face_id: number;
  alias: string;
  start_sec: number;
  end_sec: number;
  created_at: string;
  image_url: string | null;
};

export type TextSegmentItem = {
  id: number;
  start_sec: number;
  end_sec: number;
  text: string;
  created_at: string;
  image_url: string | null;
};

export type VideoDetailResponse = {
  id: string;
  original_filename: string;
  duration_seconds: number | null;
  status: string;
  processing_started_at: string | null;
  processing_finished_at: string | null;
  created_at: string;
  stream_url: string;
  catalog_image_count: number;
  text_segment_count: number;
  face_track_count: number;
  face_tracks: FaceTrackItem[];
  text_segments: TextSegmentItem[];
};

export type FaceTrackUpdateRequest = {
  alias: string;
};
