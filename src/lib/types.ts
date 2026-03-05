export type VideoOut = {
  id: number;
  filename: string;
  content_type: string | null;
  duration: number | null;
  width: number | null;
  height: number | null;
  status: string;
  error_message: string | null;
  processing_started_at: string | null;
  processing_finished_at: string | null;
  created_at: string;
  first_catalog_image_id?: number | null;
  catalog_image_id?: number | null;
};

export type VideoSearchResponse = {
  videos: VideoOut[];
  total: number;
  page: number;
  size: number;
  total_pages: number;
};

export type SearchResult = {
  catalog_image_id: number;
  video_id: number;
  caption_en: string | null;
  score: number;
  seconds?: number | null;
};

export type TextSearchRequest = {
  text: string;
  top_k?: number | null;
};

export type TextSearchResponse = {
  results: SearchResult[];
};

export type FaceSearchResponse = {
  results: SearchResult[];
};

export type FaceDetectResponse = {
  bboxes: number[][];
};
